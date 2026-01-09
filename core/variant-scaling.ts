import type { VariantTarget } from "../types/targets.js";
import { analyzeContent, calculateOptimalScale } from "./content-analyzer.js";
import { planAutoLayoutExpansion, type AxisExpansionPlan } from "./layout-expansion.js";
import { scaleStrokeWeight, scaleCornerRadius } from "./scaling-utils.js";
import type { AxisGaps } from "./padding-distribution.js";
import { MIN_LEGIBLE_SIZES, RESOLUTION_THRESHOLDS } from "./layout-constants.js";
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
import { hasOverlayRole, hasHeroBleedRole } from "./node-roles.js";

type Mutable<T> = T extends ReadonlyArray<infer U>
  ? Mutable<U>[]
  : T extends object
    ? { -readonly [K in keyof T]: Mutable<T[K]> }
    : T;

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
  primaryFocal: ReturnType<typeof resolvePrimaryFocalPoint> = null
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

  const offsetX = horizontalPlan.start;
  const offsetY = verticalPlan.start;

  frame.resizeWithoutConstraints(target.width, target.height);
  repositionChildren(frame, offsetX, offsetY, rootSnapshot);

  if (shouldExpandAbsoluteChildren(rootSnapshot?.layoutMode, adoptVerticalVariant, profile)) {
    expandAbsoluteChildren(frame, horizontalPlan, verticalPlan, profile);
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

  const round = (value: number): number => Math.round(value * 100) / 100;

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
  return Math.max(Math.round(scaled * 100) / 100, min);
}

function expandAbsoluteChildren(
  frame: FrameNode,
  horizontal: AxisExpansionPlan,
  vertical: AxisExpansionPlan,
  profile: LayoutProfile
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
      children: regularSnapshots
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
    profile
  });
}

/**
 * Position a hero_bleed element by preserving its proportional edge relationship.
 * Hero bleed elements intentionally extend beyond frame bounds, so we maintain
 * their position relative to the nearest edge instead of constraining to safe area.
 */
function positionHeroBleedChild(
  child: { x: number; y: number; width: number; height: number },
  frameWidth: number,
  frameHeight: number
): { x: number; y: number } {
  const centerX = child.x + child.width / 2;
  const centerY = child.y + child.height / 2;

  // Determine which edge the element is closest to (for each axis)
  const distToLeft = centerX;
  const distToRight = frameWidth - centerX;
  const distToTop = centerY;
  const distToBottom = frameHeight - centerY;

  let newX = child.x;
  let newY = child.y;

  // For X axis: maintain proportional distance from nearest edge
  if (distToLeft <= distToRight) {
    // Element is closer to left edge - preserve proportional left distance
    const leftRatio = child.x / Math.max(frameWidth, 1);
    newX = frameWidth * leftRatio;
  } else {
    // Element is closer to right edge - preserve proportional right distance
    const rightEdgeOfChild = child.x + child.width;
    const rightRatio = (frameWidth - rightEdgeOfChild) / Math.max(frameWidth, 1);
    newX = frameWidth - (frameWidth * rightRatio) - child.width;
  }

  // For Y axis: maintain proportional distance from nearest edge
  if (distToTop <= distToBottom) {
    // Element is closer to top edge - preserve proportional top distance
    const topRatio = child.y / Math.max(frameHeight, 1);
    newY = frameHeight * topRatio;
  } else {
    // Element is closer to bottom edge - preserve proportional bottom distance
    const bottomEdgeOfChild = child.y + child.height;
    const bottomRatio = (frameHeight - bottomEdgeOfChild) / Math.max(frameHeight, 1);
    newY = frameHeight - (frameHeight * bottomRatio) - child.height;
  }

  return {
    x: Math.round(newX * 100) / 100,
    y: Math.round(newY * 100) / 100
  };
}

function isBackgroundLike(node: SceneNode, rootWidth: number, rootHeight: number): boolean {
  if (!("width" in node) || !("height" in node)) return false;
  if (typeof node.width !== "number" || typeof node.height !== "number") return false;
  const nodeArea = node.width * node.height;
  const rootArea = rootWidth * rootHeight;
  // 95% threshold, same as warning logic
  return rootArea > 0 && nodeArea >= rootArea * 0.95;
}

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

    // Safe constraint scaling with validation
    const scaledConstraints = {
      minWidth: null as number | null,
      maxWidth: null as number | null,
      minHeight: null as number | null,
      maxHeight: null as number | null
    };

    // Collect and scale all constraints
    if ("minWidth" in node && typeof (node as any).minWidth === "number") {
      scaledConstraints.minWidth = (node as any).minWidth * scale;
    }
    if ("maxWidth" in node && typeof (node as any).maxWidth === "number") {
      scaledConstraints.maxWidth = (node as any).maxWidth * scale;
    }
    if ("minHeight" in node && typeof (node as any).minHeight === "number") {
      scaledConstraints.minHeight = (node as any).minHeight * scale;
    }
    if ("maxHeight" in node && typeof (node as any).maxHeight === "number") {
      scaledConstraints.maxHeight = (node as any).maxHeight * scale;
    }

    // Validate and resolve conflicts: min > max
    if (scaledConstraints.minWidth !== null && scaledConstraints.maxWidth !== null) {
      if (scaledConstraints.minWidth > scaledConstraints.maxWidth) {
        const avgWidth = (scaledConstraints.minWidth + scaledConstraints.maxWidth) / 2;
        scaledConstraints.minWidth = Math.min(avgWidth, newWidth);
        scaledConstraints.maxWidth = Math.max(avgWidth, newWidth);
      }
    }
    if (scaledConstraints.minHeight !== null && scaledConstraints.maxHeight !== null) {
      if (scaledConstraints.minHeight > scaledConstraints.maxHeight) {
        const avgHeight = (scaledConstraints.minHeight + scaledConstraints.maxHeight) / 2;
        scaledConstraints.minHeight = Math.min(avgHeight, newHeight);
        scaledConstraints.maxHeight = Math.max(avgHeight, newHeight);
      }
    }

    // Ensure constraints don't prevent intended sizing
    if (scaledConstraints.minWidth !== null && scaledConstraints.minWidth > newWidth) {
      scaledConstraints.minWidth = newWidth;
    }
    if (scaledConstraints.maxWidth !== null && scaledConstraints.maxWidth < newWidth) {
      scaledConstraints.maxWidth = newWidth;
    }
    if (scaledConstraints.minHeight !== null && scaledConstraints.minHeight > newHeight) {
      scaledConstraints.minHeight = newHeight;
    }
    if (scaledConstraints.maxHeight !== null && scaledConstraints.maxHeight < newHeight) {
      scaledConstraints.maxHeight = newHeight;
    }

    // Apply constraints in safe order (depends on scale direction)
    if (scale < 1) {
      if (scaledConstraints.minWidth !== null) (node as any).minWidth = scaledConstraints.minWidth;
      if (scaledConstraints.minHeight !== null) (node as any).minHeight = scaledConstraints.minHeight;
      if (scaledConstraints.maxWidth !== null) (node as any).maxWidth = scaledConstraints.maxWidth;
      if (scaledConstraints.maxHeight !== null) (node as any).maxHeight = scaledConstraints.maxHeight;
    } else {
      if (scaledConstraints.maxWidth !== null) (node as any).maxWidth = scaledConstraints.maxWidth;
      if (scaledConstraints.maxHeight !== null) (node as any).maxHeight = scaledConstraints.maxHeight;
      if (scaledConstraints.minWidth !== null) (node as any).minWidth = scaledConstraints.minWidth;
      if (scaledConstraints.minHeight !== null) (node as any).minHeight = scaledConstraints.minHeight;
    }

    if (isBackground) {
      // Backgrounds should fill the target frame completely
      newWidth = target.width;
      newHeight = target.height;
    }

    if ("resizeWithoutConstraints" in node && typeof node.resizeWithoutConstraints === "function") {
      node.resizeWithoutConstraints(newWidth, newHeight);
    } else if ("resize" in node && typeof node.resize === "function") {
      node.resize(newWidth, newHeight);
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
  }

  adjustAutoLayoutProperties(node, scale);
}

function adjustNodePosition(node: SceneNode, scale: number): void {
  if ("layoutPositioning" in node) {
    if (node.layoutPositioning === "ABSOLUTE") {
      node.x *= scale;
      node.y *= scale;
    }
    return;
  }

  if ("x" in node && typeof node.x === "number" && "y" in node && typeof node.y === "number") {
    node.x *= scale;
    node.y *= scale;
  }
}

/**
 * Get minimum legible font size based on target resolution
 * Thumbnails can use smaller text, large displays need larger text
 */
function getMinLegibleSize(target: VariantTarget): number {
  const minDimension = Math.min(target.width, target.height);
  if (minDimension < RESOLUTION_THRESHOLDS.THUMBNAIL_DIMENSION) {
    // Thumbnails: smaller text is acceptable (viewed at small size)
    return MIN_LEGIBLE_SIZES.THUMBNAIL;
  }
  if (target.width >= RESOLUTION_THRESHOLDS.LARGE_DISPLAY_DIMENSION || target.height >= RESOLUTION_THRESHOLDS.LARGE_DISPLAY_DIMENSION) {
    // Large displays (YouTube 2560px): need larger text
    return MIN_LEGIBLE_SIZES.LARGE_DISPLAY;
  }
  // Social/standard: baseline minimum
  return MIN_LEGIBLE_SIZES.STANDARD;
}

async function scaleTextNode(node: TextNode, scale: number, fontCache: Set<string>, target: VariantTarget): Promise<void> {
  const minLegibleSize = getMinLegibleSize(target);
  const characters = node.characters;

  // STEP 1: Store original auto-resize mode to preserve text box width
  const originalAutoResize = node.textAutoResize;

  // STEP 2: Set to NONE to prevent auto-shrinking during scaling
  // This prevents Figma from immediately resizing the box after font changes
  node.textAutoResize = "NONE";

  // STEP 3: Scale text box dimensions FIRST (before font scaling)
  // This ensures the text box is large enough to accommodate scaled text
  const scaledWidth = node.width * scale;
  const scaledHeight = node.height * scale;
  node.resize(scaledWidth, scaledHeight);

  if (characters.length === 0) {
    if (node.fontSize !== figma.mixed && typeof node.fontSize === "number") {
      node.fontSize = Math.max(node.fontSize * scale, minLegibleSize);
    }
    // Restore auto-resize for empty text nodes
    restoreTextAutoResize(node, originalAutoResize);
    return;
  }

  // STEP 4: Load fonts and scale text properties
  const fontNames = await node.getRangeAllFontNames(0, characters.length);
  for (const font of fontNames) {
    const cacheKey = `${font.family}__${font.style}`;
    if (!fontCache.has(cacheKey)) {
      await figma.loadFontAsync(font);
      fontCache.add(cacheKey);
    }
  }

  for (let i = 0; i < characters.length; i += 1) {
    const nextIndex = i + 1;

    const fontSize = node.getRangeFontSize(i, nextIndex);
    if (fontSize !== figma.mixed && typeof fontSize === "number") {
      const newFontSize = Math.max(fontSize * scale, minLegibleSize);
      node.setRangeFontSize(i, nextIndex, newFontSize);
    }

    const lineHeight = node.getRangeLineHeight(i, nextIndex);
    if (lineHeight !== figma.mixed && lineHeight.unit === "PIXELS") {
      node.setRangeLineHeight(i, nextIndex, {
        unit: "PIXELS",
        value: lineHeight.value * scale
      });
    }

    const letterSpacing = node.getRangeLetterSpacing(i, nextIndex);
    if (letterSpacing !== figma.mixed && letterSpacing.unit === "PIXELS") {
      node.setRangeLetterSpacing(i, nextIndex, {
        unit: "PIXELS",
        value: letterSpacing.value * scale
      });
    }
  }

  // STEP 5: Restore auto-resize mode with appropriate adjustments
  restoreTextAutoResize(node, originalAutoResize);
}

/**
 * Restores text auto-resize mode after scaling, with adjustments to prevent awkward line breaks.
 * - WIDTH_AND_HEIGHT boxes are converted to HEIGHT to preserve the scaled width
 * - This prevents text from shrinking back and causing mid-word line breaks
 */
function restoreTextAutoResize(node: TextNode, originalAutoResize: TextNode["textAutoResize"]): void {
  if (originalAutoResize === "WIDTH_AND_HEIGHT") {
    // For fully auto text, lock width but allow height to grow
    // This prevents the text box from shrinking back to minimal width
    node.textAutoResize = "HEIGHT";
  } else {
    // Restore original mode (NONE or HEIGHT)
    node.textAutoResize = originalAutoResize;
  }
}

function scaleEffect(effect: Effect, scale: number): Effect {
  const clone = cloneValue(effect);

  if (clone.type === "DROP_SHADOW" || clone.type === "INNER_SHADOW") {
    if (typeof clone.radius === "number") {
      // Dampen shadow radius for large scales to prevent extreme blurs
      if (scale > 2) {
        clone.radius = clone.radius * Math.pow(scale, 0.65);
      } else {
        clone.radius *= scale;
      }
      // Cap shadow radius to prevent extreme effects
      clone.radius = Math.min(clone.radius, 100);
    }

    if (clone.offset) {
      // Dampen offset for large scales
      const offsetScale = scale > 2 ? Math.pow(scale, 0.7) : scale;
      clone.offset = {
        x: clone.offset.x * offsetScale,
        y: clone.offset.y * offsetScale
      };
    }

    // Scale spread if present
    if (typeof clone.spread === "number") {
      clone.spread = clone.spread * Math.pow(scale, 0.6);
    }
  }

  if (clone.type === "LAYER_BLUR" || clone.type === "BACKGROUND_BLUR") {
    if (typeof clone.radius === "number") {
      // Dampen blur radius for large scales
      if (scale > 2) {
        clone.radius = clone.radius * Math.pow(scale, 0.6);
      } else {
        clone.radius *= scale;
      }
      // Cap blur radius to prevent extreme effects
      clone.radius = Math.min(clone.radius, 50);
    }
  }

  return clone as Effect;
}

function scalePaint(paint: Paint, scale: number): Paint {
  const clone = cloneValue(paint);
  if ((clone.type === "IMAGE" || clone.type === "VIDEO") && clone.scaleMode === "TILE") {
    clone.scalingFactor = (clone.scalingFactor ?? 1) * scale;
  }

  if (
    clone.type === "GRADIENT_LINEAR" ||
    clone.type === "GRADIENT_RADIAL" ||
    clone.type === "GRADIENT_ANGULAR" ||
    clone.type === "GRADIENT_DIAMOND"
  ) {
    const gradientClone = clone as typeof clone & { gradientHandlePositions?: Vector[] };
    if (Array.isArray(gradientClone.gradientHandlePositions)) {
      gradientClone.gradientHandlePositions = gradientClone.gradientHandlePositions.map((position) => ({
        x: position.x * scale,
        y: position.y * scale
      }));
    }

    gradientClone.gradientTransform = gradientClone.gradientTransform.map((row: readonly number[]) =>
      row.map((value: number, index: number) => (index === 2 ? value : value * scale))
    ) as Transform;
  }

  return clone as Paint;
}

function repositionChildren(
  parent: FrameNode,
  offsetX: number,
  offsetY: number,
  rootSnapshot: AutoLayoutSnapshot | null
): void {
  if (!("children" in parent)) {
    return;
  }
  for (const child of parent.children) {
    if ("layoutPositioning" in child && child.layoutPositioning !== "ABSOLUTE") {
      continue;
    }
    
    // Check if background to reset position
    if (rootSnapshot && isBackgroundLike(child, rootSnapshot.width, rootSnapshot.height)) {
      if ("x" in child) child.x = 0;
      if ("y" in child) child.y = 0;
      continue;
    }

    if ("x" in child && typeof child.x === "number") {
      child.x += offsetX;
    }
    if ("y" in child && typeof child.y === "number") {
      child.y += offsetY;
    }
  }
}

function countAbsoluteChildren(frame: FrameNode): number {
  if (!("children" in frame)) {
    return 0;
  }
  let count = 0;
  for (const child of frame.children) {
    if (hasOverlayRole(child)) {
      continue;
    }
    if ("layoutPositioning" in child && child.layoutPositioning !== "ABSOLUTE" && frame.layoutMode !== "NONE") {
      continue;
    }
    count += 1;
  }
  return count;
}

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

function cloneValue<T>(value: T): Mutable<T> {
  return JSON.parse(JSON.stringify(value)) as Mutable<T>;
}