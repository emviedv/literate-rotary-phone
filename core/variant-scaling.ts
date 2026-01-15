import type { VariantTarget } from "../types/targets.js";
import { analyzeContent, calculateOptimalScale } from "./content-analyzer.js";
import { planAutoLayoutExpansion, type AxisExpansionPlan } from "./layout-expansion.js";
import { scaleStrokeWeight, scaleCornerRadius } from "./scaling-utils.js";
import type { AxisGaps } from "./padding-distribution.js";
import { MIN_ELEMENT_SIZES } from "./layout-constants.js";
import { planAbsoluteChildPositions } from "./absolute-layout.js";
import {
  computeVerticalSpacing,
  resolveVerticalAlignItems,
  resolveVerticalLayoutWrap,
  shouldAdoptVerticalFlow,
  shouldExpandAbsoluteChildren,
  type AutoLayoutSummary,
  type LayoutProfile
} from "./layout-profile.js";
import { resolveSafeAreaInsets } from "./safe-area.js";
import { debugFixLog } from "./debug.js";
import { measureContentMargins } from "./warnings.js";
import { resolvePrimaryFocalPoint, readAiSignals, isHeroBleedNode } from "./ai-signals.js";
import { SAFE_AREA_KEY, FOCAL_POINT_KEY } from "./plugin-constants.js";
import { hasHeroBleedRole } from "./node-roles.js";
import type { AiFaceRegion } from "../types/ai-signals.js";
import { calculatePlacementScores } from "./placement-scoring.js";
import { scaleEffect, scalePaint } from "./effect-scaling.js";
import {
  getElementRole,
  isBackgroundLike,
  isDecorativePointer,
  ensureFillModeForImages
} from "./element-classification.js";
import { scaleTextNode } from "./text-scaling.js";
import {
  adjustNodePosition,
  positionHeroBleedChild,
  repositionChildren,
  validateChildrenBounds,
  countAbsoluteChildren
} from "./child-positioning.js";
import {
  collectAndScaleConstraints,
  validateConstraints,
  applyConstraints
} from "./constraint-scaling.js";

export type AutoLayoutSnapshot = {
  layoutMode: FrameNode["layoutMode"];
  width: number;
  height: number;
  primaryAxisSizingMode: FrameNode["primaryAxisSizingMode"];
  counterAxisSizingMode: FrameNode["counterAxisSizingMode"];
  layoutWrap: FrameNode["layoutWrap"];
  primaryAxisAlignItems: FrameNode["primaryAxisAlignItems"];
  counterAxisAlignItems: FrameNode["counterAxisAlignItems"];
  itemSpacing: number;
  counterAxisSpacing: number | null;
  paddingLeft: number;
  paddingRight: number;
  paddingTop: number;
  paddingBottom: number;
  clipsContent: boolean;
  flowChildCount: number;
  absoluteChildCount: number;
};

export type SafeAreaMetrics = {
  scale: number;
  scaledWidth: number;
  scaledHeight: number;
  safeInsetX: number;
  safeInsetY: number;
  targetWidth: number;
  targetHeight: number;
  horizontal: AxisExpansionPlan;
  vertical: AxisExpansionPlan;
  profile: LayoutProfile;
  adoptVerticalVariant: boolean;
};

declare const figma: PluginAPI;

export async function prepareCloneForLayout(
  frame: FrameNode,
  autoLayoutSnapshots: Map<string, AutoLayoutSnapshot>
): Promise<void> {
  const snapshot = captureAutoLayoutSnapshot(frame);
  if (snapshot) {
    autoLayoutSnapshots.set(frame.id, snapshot);
    frame.layoutMode = "NONE";
  }
  frame.primaryAxisSizingMode = "FIXED";
  frame.counterAxisSizingMode = "FIXED";
  frame.paddingLeft = 0;
  frame.paddingRight = 0;
  frame.paddingTop = 0;
  frame.paddingBottom = 0;
  frame.itemSpacing = 0;
  if ("counterAxisSpacing" in frame && typeof frame.counterAxisSpacing === "number") {
    frame.counterAxisSpacing = 0;
  }
  frame.clipsContent = true;
}

export function captureAutoLayoutSnapshot(frame: FrameNode): AutoLayoutSnapshot | null {
  if (frame.layoutMode === "NONE") {
    return null;
  }

  let counterAxisSpacing: number | null = null;
  if ("counterAxisSpacing" in frame && typeof frame.counterAxisSpacing === "number") {
    counterAxisSpacing = frame.counterAxisSpacing;
  }

  let flowChildCount = 0;
  let absoluteChildCount = 0;
  for (const child of frame.children) {
    if ("layoutPositioning" in child && child.layoutPositioning === "ABSOLUTE") {
      absoluteChildCount += 1;
    } else {
      flowChildCount += 1;
    }
  }

  return {
    layoutMode: frame.layoutMode,
    width: frame.width,
    height: frame.height,
    primaryAxisSizingMode: frame.primaryAxisSizingMode,
    counterAxisSizingMode: frame.counterAxisSizingMode,
    layoutWrap: frame.layoutWrap,
    primaryAxisAlignItems: frame.primaryAxisAlignItems,
    counterAxisAlignItems: frame.counterAxisAlignItems,
    itemSpacing: frame.itemSpacing,
    counterAxisSpacing,
    paddingLeft: frame.paddingLeft,
    paddingRight: frame.paddingRight,
    paddingTop: frame.paddingTop,
    paddingBottom: frame.paddingBottom,
    clipsContent: frame.clipsContent,
    flowChildCount,
    absoluteChildCount
  };
}

export async function scaleNodeTree(
  frame: FrameNode,
  target: VariantTarget,
  safeAreaRatio: number,
  fontCache: Set<string>,
  rootSnapshot: AutoLayoutSnapshot | null,
  profile: LayoutProfile,
  primaryFocal: ReturnType<typeof resolvePrimaryFocalPoint> = null,
  faceRegions?: readonly AiFaceRegion[]
): Promise<SafeAreaMetrics> {
  const contentAnalysis = analyzeContent(frame);

  debugFixLog("Content analysis complete", {
    frameId: frame.id,
    frameName: frame.name,
    effectiveDimensions: `${contentAnalysis.effectiveWidth}×${contentAnalysis.effectiveHeight}`,
    strategy: contentAnalysis.recommendedStrategy,
    contentDensity: contentAnalysis.contentDensity,
    hasText: contentAnalysis.hasText,
    hasImages: contentAnalysis.hasImages,
    actualBounds: contentAnalysis.actualContentBounds
  });

  const contentMargins = measureContentMargins(frame);

  const sourceWidth = Math.max(contentAnalysis.effectiveWidth, 1);
  const sourceHeight = Math.max(contentAnalysis.effectiveHeight, 1);

  const safeInsets = resolveSafeAreaInsets(target, safeAreaRatio);
  const safeInsetX = safeInsets.left;
  const safeInsetY = safeInsets.top;

  debugFixLog("safe area insets resolved", {
    targetId: target.id,
    ratio: safeAreaRatio,
    insets: safeInsets
  });

  // Pass full safeInsets to support asymmetric safe areas
  const rawScale = calculateOptimalScale(contentAnalysis, target, safeInsets, profile);

  const frameMaxScale = Math.min(
    target.width / Math.max(sourceWidth, 1),
    target.height / Math.max(sourceHeight, 1)
  );
  const scale =
    Number.isFinite(frameMaxScale) && frameMaxScale > 0 ? Math.min(rawScale, frameMaxScale) : rawScale;

  debugFixLog("Optimal scale calculated", {
    scale,
    rawScale,
    frameMaxScale,
    sourceEffective: `${sourceWidth}×${sourceHeight}`,
    target: `${target.width}×${target.height}`,
    profile,
    strategy: contentAnalysis.recommendedStrategy
  });

  await scaleNodeRecursive(frame, scale, fontCache, target, rootSnapshot);

  const scaledWidth = sourceWidth * scale;
  const scaledHeight = sourceHeight * scale;
  const extraWidth = Math.max(target.width - scaledWidth, 0);
  const extraHeight = Math.max(target.height - scaledHeight, 0);

  const horizontalGaps: AxisGaps | null =
    contentMargins != null ? { start: contentMargins.left, end: contentMargins.right } : null;
  const verticalGaps: AxisGaps | null =
    contentMargins != null ? { start: contentMargins.top, end: contentMargins.bottom } : null;

  const absoluteChildCount = countAbsoluteChildren(frame);
  const verticalSummary: AutoLayoutSummary | null = rootSnapshot
    ? {
        layoutMode: rootSnapshot.layoutMode as AutoLayoutSummary["layoutMode"],
        flowChildCount: rootSnapshot.flowChildCount
      }
    : null;
  const adoptVerticalVariant = shouldAdoptVerticalFlow(profile, verticalSummary);
  const horizontalPlan = planAutoLayoutExpansion({
    totalExtra: extraWidth,
    safeInset: { start: safeInsets.left, end: safeInsets.right },
    gaps: horizontalGaps,
    flowChildCount:
      rootSnapshot && rootSnapshot.layoutMode === "HORIZONTAL" ? rootSnapshot.flowChildCount : absoluteChildCount,
    baseItemSpacing:
      rootSnapshot && rootSnapshot.layoutMode === "HORIZONTAL"
        ? scaleAutoLayoutMetric(rootSnapshot.itemSpacing, scale)
        : 0,
    allowInteriorExpansion:
      (rootSnapshot && rootSnapshot.layoutMode === "HORIZONTAL" && rootSnapshot.flowChildCount >= 2) ||
      (!rootSnapshot || rootSnapshot.layoutMode === "NONE" ? absoluteChildCount >= 2 : false),
    focalRatio: primaryFocal?.x ?? null
  });
  const verticalFlowChildCount =
    rootSnapshot && rootSnapshot.layoutMode === "VERTICAL"
      ? rootSnapshot.flowChildCount
      : adoptVerticalVariant
        ? rootSnapshot?.flowChildCount ?? absoluteChildCount
        : absoluteChildCount;
  const verticalAllowInterior =
    adoptVerticalVariant ||
    (rootSnapshot && rootSnapshot.layoutMode === "VERTICAL" && rootSnapshot.flowChildCount >= 2) ||
    (rootSnapshot?.layoutWrap === "WRAP" && rootSnapshot.flowChildCount >= 2) ||
    (!rootSnapshot || rootSnapshot.layoutMode === "NONE" ? absoluteChildCount >= 2 : false);
  const verticalPlan = planAutoLayoutExpansion({
    totalExtra: extraHeight,
    safeInset: { start: safeInsets.top, end: safeInsets.bottom },
    gaps: verticalGaps,
    flowChildCount: verticalFlowChildCount,
    baseItemSpacing:
      rootSnapshot && rootSnapshot.layoutMode === "VERTICAL"
        ? scaleAutoLayoutMetric(rootSnapshot.itemSpacing, scale)
        : 0,
    allowInteriorExpansion: verticalAllowInterior,
    focalRatio: primaryFocal?.y ?? null
  });

  // Clamp offsets to non-negative values to prevent content from starting outside frame
  // Negative offsets occur when scaled content exceeds target dimensions
  const offsetX = Math.max(0, horizontalPlan.start);
  const offsetY = Math.max(0, verticalPlan.start);

  frame.resizeWithoutConstraints(target.width, target.height);
  repositionChildren(frame, offsetX, offsetY, rootSnapshot);

  // Final validation: ensure all children are within bounds (belt-and-suspenders approach)
  validateChildrenBounds(frame);

  if (shouldExpandAbsoluteChildren(rootSnapshot?.layoutMode, adoptVerticalVariant, profile)) {
    expandAbsoluteChildren(frame, horizontalPlan, verticalPlan, profile, primaryFocal, faceRegions);
  }

  frame.setPluginData(
    SAFE_AREA_KEY,
    JSON.stringify({
      insetX: safeInsetX,
      insetY: safeInsetY,
      left: safeInsets.left,
      right: safeInsets.right,
      top: safeInsets.top,
      bottom: safeInsets.bottom,
      width: target.width,
      height: target.height
    })
  );
  if (primaryFocal) {
    frame.setPluginData(FOCAL_POINT_KEY, JSON.stringify(primaryFocal));
  }

  debugFixLog("axis expansion planned", {
    nodeId: frame.id,
    layoutMode: rootSnapshot?.layoutMode ?? "NONE",
    flowChildCount: rootSnapshot?.flowChildCount ?? 0,
    absoluteChildCount,
    verticalFlowChildCount,
    verticalAllowInterior,
    extraWidth,
    extraHeight,
    horizontalPlan,
    verticalPlan,
    profile,
    adoptVerticalVariant,
    focal: primaryFocal ? { x: primaryFocal.x, y: primaryFocal.y, confidence: primaryFocal.confidence } : null
  });

  return {
    scale,
    scaledWidth,
    scaledHeight,
    safeInsetX,
    safeInsetY,
    targetWidth: target.width,
    targetHeight: target.height,
    horizontal: horizontalPlan,
    vertical: verticalPlan,
    profile,
    adoptVerticalVariant
  };
}

export async function restoreAutoLayoutSettings(
  frame: FrameNode,
  autoLayoutSnapshots: Map<string, AutoLayoutSnapshot>,
  metrics: SafeAreaMetrics
): Promise<void> {
  const snapshot = autoLayoutSnapshots.get(frame.id);
  if (!snapshot) {
    return;
  }

  frame.clipsContent = snapshot.clipsContent;

  if (frame.layoutMode === "NONE") {
    return;
  }

  const baseItemSpacing = scaleAutoLayoutMetric(snapshot.itemSpacing, metrics.scale);
  const horizontalPlan = metrics.horizontal;
  const verticalPlan = metrics.vertical;

  const round = (value: number): number => Math.round(value);

  // The expansion plan's start/end values represent the TOTAL padding needed,
  // not additional padding. extraWidth = target - scaledContent already accounts
  // for all available space. Adding basePadding would double-count.
  frame.paddingLeft = round(horizontalPlan.start);
  frame.paddingRight = round(horizontalPlan.end);
  frame.paddingTop = round(verticalPlan.start);
  frame.paddingBottom = round(verticalPlan.end);

  let nextItemSpacing = baseItemSpacing;
  if (frame.layoutMode === "HORIZONTAL" && snapshot.flowChildCount >= 2) {
    const gaps = Math.max(snapshot.flowChildCount - 1, 1);
    const perGap = horizontalPlan.interior / gaps;
    nextItemSpacing = round(baseItemSpacing + perGap);
  } else if (frame.layoutMode === "VERTICAL" && snapshot.flowChildCount >= 2) {
    nextItemSpacing = computeVerticalSpacing({
      baseSpacing: baseItemSpacing,
      interior: verticalPlan.interior,
      flowChildCount: snapshot.flowChildCount
    });
  }
  frame.itemSpacing = nextItemSpacing;

  if (snapshot.layoutWrap === "WRAP" && snapshot.counterAxisSpacing != null && "counterAxisSpacing" in frame) {
    const baseCounterSpacing = scaleAutoLayoutMetric(snapshot.counterAxisSpacing, metrics.scale);
    frame.counterAxisSpacing = round(baseCounterSpacing);
  }

  if (metrics.profile === "vertical" && frame.layoutMode === "VERTICAL") {
    frame.primaryAxisAlignItems = resolveVerticalAlignItems(snapshot.primaryAxisAlignItems, {
      interior: metrics.vertical.interior
    });
    frame.layoutWrap = resolveVerticalLayoutWrap(frame.layoutWrap);
  }

  debugFixLog("auto layout fine-tuned", {
    nodeId: frame.id,
    layoutMode: frame.layoutMode
  });
}

function scaleAutoLayoutMetric(value: number, scale: number, min: number = 0): number {
  if (value === 0) return 0;
  const scaled = value * scale;
  return Math.max(Math.round(scaled), min);
}

function expandAbsoluteChildren(
  frame: FrameNode,
  horizontal: AxisExpansionPlan,
  vertical: AxisExpansionPlan,
  profile: LayoutProfile,
  primaryFocal?: ReturnType<typeof resolvePrimaryFocalPoint> | null,
  faceRegions?: readonly AiFaceRegion[]
): void {
  const safeWidth = frame.width - horizontal.start - horizontal.end;
  const safeHeight = frame.height - vertical.start - vertical.end;
  if (safeWidth <= 0 || safeHeight <= 0) {
    return;
  }

  const safeBounds = {
    x: horizontal.start,
    y: vertical.start,
    width: safeWidth,
    height: safeHeight
  };

  // Calculate placement scoring only when faces are detected or there's a focal point
  // This prevents aggressive repositioning for designs without portraits
  const shouldCalculateScoring = (faceRegions?.length ?? 0) > 0 || primaryFocal;
  const placementScoring = shouldCalculateScoring
    ? calculatePlacementScores({
        profile,
        safeBounds,
        frameBounds: { width: frame.width, height: frame.height },
        faceRegions,
        focalPoint: primaryFocal ?? undefined
      })
    : undefined;

  const absoluteChildren = frame.children.filter((child) => {
    if ("layoutPositioning" in child && child.layoutPositioning !== "ABSOLUTE" && frame.layoutMode !== "NONE") {
      return false;
    }
    return true;
  });

  if (absoluteChildren.length === 0) {
    return;
  }

  // Read AI signals for hero_bleed detection
  const aiSignals = readAiSignals(frame);

  // Separate hero_bleed children from regular children
  const heroBleedChildren: SceneNode[] = [];
  const regularChildren: SceneNode[] = [];

  for (const child of absoluteChildren) {
    const isHeroBleed = hasHeroBleedRole(child) || isHeroBleedNode(aiSignals, child.id);
    if (isHeroBleed) {
      heroBleedChildren.push(child);
    } else {
      regularChildren.push(child);
    }
  }

  // Handle regular children with standard safe area positioning
  const regularSnapshots = regularChildren
    .filter((child): child is SceneNode & { x: number; y: number; width: number; height: number } => {
      return (
        typeof (child as SceneNode & { x: unknown }).x === "number" &&
        typeof (child as SceneNode & { y: unknown }).y === "number" &&
        typeof (child as SceneNode & { width: unknown }).width === "number" &&
        typeof (child as SceneNode & { height: unknown }).height === "number"
      );
    })
    .map((child) => ({
      id: child.id,
      x: child.x,
      y: child.y,
      width: child.width,
      height: child.height,
      nodeType: child.type,
      bounds: {
        x: child.x,
        y: child.y,
        width: child.width,
        height: child.height
      }
    }));

  if (regularSnapshots.length > 0) {
    const planned = planAbsoluteChildPositions({
      profile,
      safeBounds,
      targetAspectRatio: frame.height > 0 ? frame.width / frame.height : safeBounds.width / Math.max(safeBounds.height, 1),
      children: regularSnapshots,
      placementScoring
    });

    const lookup = new Map(planned.map((plan) => [plan.id, plan] as const));

    for (const child of regularChildren) {
      const plan = lookup.get(child.id);
      if (!plan) {
        continue;
      }
      if (Number.isFinite(plan.x)) {
        child.x = plan.x;
      }
      if (Number.isFinite(plan.y)) {
        child.y = plan.y;
      }
    }
  }

  // Handle hero_bleed children with edge-relative positioning
  // Preserve their proportional distance from the nearest edge
  for (const child of heroBleedChildren) {
    if (!("x" in child) || !("y" in child) || !("width" in child) || !("height" in child)) {
      continue;
    }
    const nodeWithDims = child as SceneNode & { x: number; y: number; width: number; height: number };
    const edgePosition = positionHeroBleedChild(nodeWithDims, frame.width, frame.height);
    if (Number.isFinite(edgePosition.x)) {
      nodeWithDims.x = edgePosition.x;
    }
    if (Number.isFinite(edgePosition.y)) {
      nodeWithDims.y = edgePosition.y;
    }
  }

  debugFixLog("absolute children expanded", {
    nodeId: frame.id,
    safeBounds,
    regularCount: regularChildren.length,
    heroBleedCount: heroBleedChildren.length,
    profile,
    faceRegionCount: faceRegions?.length ?? 0,
    hasPlacementScoring: Boolean(placementScoring),
    recommendedRegion: placementScoring?.recommendedRegion
  });
}

// positionHeroBleedChild moved to child-positioning.ts
// isBackgroundLike, getElementRole, isDecorativePointer moved to element-classification.ts

export async function scaleNodeRecursive(
  node: SceneNode,
  scale: number,
  fontCache: Set<string>,
  target: VariantTarget,
  rootSnapshot: AutoLayoutSnapshot | null
): Promise<void> {
  const isBackground = rootSnapshot ? isBackgroundLike(node, rootSnapshot.width, rootSnapshot.height) : false;
  
  // For backgrounds, we might want to scale differently?
  // But let's keep it simple: apply scale to children/properties, but override size at end.

  if ("children" in node) {
    for (const child of node.children) {
      adjustNodePosition(child as SceneNode, scale);
      await scaleNodeRecursive(child as SceneNode, scale, fontCache, target, rootSnapshot);
    }
  }

  if (node.type === "TEXT") {
    await scaleTextNode(node, scale, fontCache, target);
    return;
  }

  if ("width" in node && "height" in node && typeof node.width === "number" && typeof node.height === "number") {
    let newWidth = node.width * scale;
    let newHeight = node.height * scale;

    // Collect and scale constraints using dedicated module
    const scaledConstraints = collectAndScaleConstraints(node, scale);

    if (isBackground) {
      // Backgrounds should fill the target frame completely
      newWidth = target.width;
      newHeight = target.height;
      // Ensure image fills use FILL mode to maintain aspect ratio (crop, don't stretch)
      ensureFillModeForImages(node, true);
    }

    // Enforce minimum sizes for logos, icons, badges, and buttons
    // This prevents small UI elements from becoming microscopic on extreme aspect ratio targets
    if (!isBackground) {
      const elementRole = getElementRole(node);
      if (elementRole && MIN_ELEMENT_SIZES[elementRole]) {
        const minSize = MIN_ELEMENT_SIZES[elementRole];

        if (newWidth < minSize.width || newHeight < minSize.height) {
          // Calculate the scale needed to meet minimum size while preserving aspect ratio
          const minScaleW = minSize.width / node.width;
          const minScaleH = minSize.height / node.height;
          const preserveScale = Math.max(minScaleW, minScaleH, scale);

          newWidth = Math.max(newWidth, node.width * preserveScale);
          newHeight = Math.max(newHeight, node.height * preserveScale);

          debugFixLog("enforced minimum size for element", {
            nodeId: node.id,
            nodeName: node.name,
            role: elementRole,
            originalScale: scale,
            preservedScale: preserveScale,
            originalSize: { width: node.width, height: node.height },
            newSize: { width: newWidth, height: newHeight }
          });
        }
      }

      // Handle decorative pointers - preserve aspect ratio to prevent stretching
      if (isDecorativePointer(node)) {
        const originalAspect = node.width / node.height;
        const currentAspect = newWidth / newHeight;

        // If aspect ratio has changed significantly, restore it
        if (Math.abs(originalAspect - currentAspect) > 0.1) {
          // Scale to fit within current bounds while preserving aspect ratio
          const fitWidth = Math.min(newWidth, newHeight * originalAspect);
          const fitHeight = fitWidth / originalAspect;
          newWidth = fitWidth;
          newHeight = fitHeight;

          debugFixLog("preserved decorative pointer aspect ratio", {
            nodeId: node.id,
            nodeName: node.name,
            originalAspect,
            preservedSize: { width: newWidth, height: newHeight }
          });
        }
      }
    }

    const safeWidth = Math.max(1, Math.round(newWidth));
    const safeHeight = Math.max(1, Math.round(newHeight));

    // Validate and apply constraints using dedicated module
    const validatedConstraints = validateConstraints(scaledConstraints, safeWidth, safeHeight);
    applyConstraints(node, validatedConstraints, scale);

    if ("resizeWithoutConstraints" in node && typeof node.resizeWithoutConstraints === "function") {
      node.resizeWithoutConstraints(safeWidth, safeHeight);
    } else if ("resize" in node && typeof node.resize === "function") {
      node.resize(safeWidth, safeHeight);
    }
  }

  if ("strokeWeight" in node && typeof node.strokeWeight === "number") {
    if (node.strokeWeight > 0) {
      node.strokeWeight = scaleStrokeWeight(node.strokeWeight, scale);
    }
  }

  const nodeWidth = "width" in node && typeof node.width === "number" ? node.width * scale : 100;
  const nodeHeight = "height" in node && typeof node.height === "number" ? node.height * scale : 100;

  if ("cornerRadius" in node) {
    const withCornerRadius = node as SceneNode & { cornerRadius?: number | typeof figma.mixed };
    if (withCornerRadius.cornerRadius !== figma.mixed && typeof withCornerRadius.cornerRadius === "number") {
      withCornerRadius.cornerRadius = scaleCornerRadius(withCornerRadius.cornerRadius, scale, nodeWidth, nodeHeight);
    }
  }
  const rectangleCorners = node as SceneNode & {
    topLeftRadius?: number;
    topRightRadius?: number;
    bottomLeftRadius?: number;
    bottomRightRadius?: number;
  };
  if (typeof rectangleCorners.topLeftRadius === "number") {
    rectangleCorners.topLeftRadius = scaleCornerRadius(rectangleCorners.topLeftRadius, scale, nodeWidth, nodeHeight);
  }
  if (typeof rectangleCorners.topRightRadius === "number") {
    rectangleCorners.topRightRadius = scaleCornerRadius(rectangleCorners.topRightRadius, scale, nodeWidth, nodeHeight);
  }
  if (typeof rectangleCorners.bottomLeftRadius === "number") {
    rectangleCorners.bottomLeftRadius = scaleCornerRadius(rectangleCorners.bottomLeftRadius, scale, nodeWidth, nodeHeight);
  }
  if (typeof rectangleCorners.bottomRightRadius === "number") {
    rectangleCorners.bottomRightRadius = scaleCornerRadius(rectangleCorners.bottomRightRadius, scale, nodeWidth, nodeHeight);
  }

  if ("effects" in node && Array.isArray(node.effects)) {
    node.effects = (node.effects as readonly Effect[]).map((effect) => scaleEffect(effect, scale));
  }

  if ("fills" in node && Array.isArray(node.fills)) {
    node.fills = (node.fills as readonly Paint[]).map((paint) => scalePaint(paint, scale));
    // Ensure image fills maintain aspect ratio (crop-to-fill, not stretch) - only for backgrounds
    ensureFillModeForImages(node, false);
  }

  adjustAutoLayoutProperties(node, scale);
}

// adjustNodePosition, repositionChildren, validateChildrenBounds, countAbsoluteChildren moved to child-positioning.ts
// getMinLegibleSize, scaleTextNode, restoreTextAutoResize moved to text-scaling.ts
// scaleEffect and scalePaint moved to effect-scaling.ts
// ensureFillModeForImages moved to element-classification.ts

function adjustAutoLayoutProperties(node: SceneNode, scale: number): void {
  if (node.type !== "FRAME" && node.type !== "COMPONENT") {
    return;
  }
  if (node.layoutMode === "NONE") {
    return;
  }

  node.paddingLeft = scaleAutoLayoutMetric(node.paddingLeft, scale);
  node.paddingRight = scaleAutoLayoutMetric(node.paddingRight, scale);
  node.paddingTop = scaleAutoLayoutMetric(node.paddingTop, scale);
  node.paddingBottom = scaleAutoLayoutMetric(node.paddingBottom, scale);
  node.itemSpacing = scaleAutoLayoutMetric(node.itemSpacing, scale, 1);

  if (node.layoutWrap === "WRAP" && typeof node.counterAxisSpacing === "number") {
    node.counterAxisSpacing = scaleAutoLayoutMetric(node.counterAxisSpacing, scale, 1);
  }
}

// cloneValue moved to effect-scaling.ts
