import type { VariantTarget } from "../types/targets.js";
import { analyzeContent, calculateOptimalScale } from "./content-analyzer.js";
import { planAutoLayoutExpansion, type AxisExpansionPlan } from "./layout-expansion.js";
import { scaleStrokeWeight, scaleCornerRadius } from "./scaling-utils.js";
import type { AxisGaps } from "./padding-distribution.js";
import { MIN_ELEMENT_SIZES } from "./layout-constants.js";
import { planAbsoluteChildPositions } from "./absolute-layout.js";
import {
  shouldAdoptVerticalFlow,
  shouldExpandAbsoluteChildren,
  resolveLayoutProfile,
  type AutoLayoutSummary,
  type LayoutProfile
} from "./layout-profile.js";
import { resolveSafeAreaInsets } from "./safe-area.js";
import { normalizeContentMargins } from "./margin-normalization.js";
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
  ensureFillModeForImages,
  isAtomicGroup
} from "./element-classification.js";
import { scaleTextNode } from "./text-scaling.js";
import { validateTextFaceCollisions } from "./collision-validator.js";
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
import {
  type AutoLayoutSnapshot,
  type SafeAreaMetrics,
  adjustAutoLayoutProperties,
  scaleAutoLayoutMetric
} from "./auto-layout-management.js";

// Types are now imported from auto-layout-management module
export type { AutoLayoutSnapshot, SafeAreaMetrics } from "./auto-layout-management.js";

declare const figma: PluginAPI;

// These functions are now imported from auto-layout-management module
// Re-export them to maintain backward compatibility
export {
  prepareCloneForLayout,
  captureAutoLayoutSnapshot,
  restoreAutoLayoutSettings
} from "./auto-layout-management.js";

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

  // Normalize content margins for extreme aspect ratio changes to improve layout adaptation.
  // This prevents original asymmetric margins from pushing content to edges in new formats.
  const sourceProfile = resolveLayoutProfile({ width: sourceWidth, height: sourceHeight });
  const normalizedMargins = normalizeContentMargins(
    contentMargins,
    sourceProfile,
    profile,
    sourceWidth / sourceHeight,
    target.width / target.height
  );

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

  const horizontalGaps: AxisGaps | null = normalizedMargins
    ? { start: normalizedMargins.left, end: normalizedMargins.right }
    : null;
  const verticalGaps: AxisGaps | null = normalizedMargins
    ? { start: normalizedMargins.top, end: normalizedMargins.bottom }
    : null;

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
  repositionChildren(frame, offsetX, offsetY, rootSnapshot, safeInsets);

  // Final validation: ensure all children are within bounds (belt-and-suspenders approach)
  validateChildrenBounds(frame);

  if (shouldExpandAbsoluteChildren(rootSnapshot?.layoutMode, adoptVerticalVariant, profile)) {
    expandAbsoluteChildren(frame, horizontalPlan, verticalPlan, profile, primaryFocal, faceRegions);
  }

  // Post-AI collision validation: ensure text doesn't overlap detected faces
  // This runs AFTER layout positioning to guarantee no text/face overlap
  if (faceRegions && faceRegions.length > 0) {
    const collisionSafeBounds = {
      x: horizontalPlan.start,
      y: verticalPlan.start,
      width: frame.width - horizontalPlan.start - horizontalPlan.end,
      height: frame.height - verticalPlan.start - verticalPlan.end
    };

    const collisionResult = validateTextFaceCollisions({
      frame,
      faceRegions,
      safeBounds: collisionSafeBounds
    });

    if (collisionResult.corrected) {
      debugFixLog("collision validation applied corrections", {
        frameId: frame.id,
        correctionsCount: collisionResult.corrections.length,
        faceCount: collisionResult.faceCount,
        textNodeCount: collisionResult.textNodeCount
      });
    }
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

// restoreAutoLayoutSettings and scaleAutoLayoutMetric are now imported from auto-layout-management module

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

/**
 * Recursively tags all nodes in the cloned tree with their corresponding source node IDs.
 * This enables AI positioning logic to map source-based instructions to the cloned variant.
 *
 * @param source The original node (e.g. selectionFrame)
 * @param clone The cloned node (e.g. variantNode)
 */
export function tagNodeTreeWithSourceIds(source: SceneNode, clone: SceneNode): void {
  // Set the source ID on the current clone node
  // Cast to BaseNodeMixin since we know all SceneNodes have setPluginData
  (clone as BaseNodeMixin).setPluginData("_sourceId", source.id);

  debugFixLog("Tagged node with source ID", {
    cloneId: clone.id,
    sourceId: source.id,
    nodeName: clone.name
  });

  // Recurse to children if both nodes have children
  if ("children" in source && "children" in clone) {
    const sourceChildren = (source as ChildrenMixin).children;
    const cloneChildren = (clone as ChildrenMixin).children;

    // Iterate children in parallel. Cloning preserves order, so index matching is safe
    // as long as no structural changes have occurred yet.
    const count = Math.min(sourceChildren.length, cloneChildren.length);
    for (let i = 0; i < count; i++) {
      tagNodeTreeWithSourceIds(sourceChildren[i], cloneChildren[i]);
    }
  }
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

  // Determine if this node is an auto-layout frame (children should not have positions scaled)
  const isAutoLayoutFrame = node.type === "FRAME" && "layoutMode" in node && node.layoutMode !== "NONE";

  // DIAGNOSTIC: Log nested auto-layout frame info before scaling children
  if (isAutoLayoutFrame) {
    debugFixLog("DIAGNOSTIC: Processing nested auto-layout frame", {
      nodeId: node.id,
      nodeName: node.name,
      layoutMode: (node as FrameNode).layoutMode,
      primaryAxisAlignItems: (node as FrameNode).primaryAxisAlignItems,
      counterAxisAlignItems: (node as FrameNode).counterAxisAlignItems,
      itemSpacing: (node as FrameNode).itemSpacing,
      childCount: "children" in node ? node.children.length : 0,
      childrenInfo: "children" in node ? node.children.slice(0, 4).map(c => ({
        id: c.id,
        name: c.name,
        type: c.type,
        hasLayoutPositioning: "layoutPositioning" in c,
        layoutPositioning: "layoutPositioning" in c ? (c as { layoutPositioning: string }).layoutPositioning : "N/A",
        x: "x" in c ? (c as { x: number }).x : "N/A",
        y: "y" in c ? (c as { y: number }).y : "N/A"
      })) : []
    });
  }

  // Detect atomic groups (illustrations, mockups, device frames) that should preserve internal layout
  const isAtomicGroupNode = node.type === "GROUP" && isAtomicGroup(node);

  if ("children" in node) {
    for (const child of node.children) {
      // FIX: Atomic groups preserve internal relative positions
      // Only scale child sizes, not positions - the group itself is repositioned at parent level
      if (isAtomicGroupNode) {
        debugFixLog("atomic group child - skipping position adjustment", {
          groupId: node.id,
          groupName: node.name,
          childId: child.id,
          childName: child.name
        });
        await scaleNodeRecursive(child as SceneNode, scale, fontCache, target, rootSnapshot);
        continue;
      }

      // FIX: Only adjust positions for children of NONE-layout frames
      // Children in auto-layout frames have their positions managed by Figma
      // Scaling their positions causes overlapping when auto-layout reflows
      if (!isAutoLayoutFrame) {
        adjustNodePosition(child as SceneNode, scale);
      } else {
        // For auto-layout children, only scale ABSOLUTE positioned ones
        if ("layoutPositioning" in child && child.layoutPositioning === "ABSOLUTE") {
          adjustNodePosition(child as SceneNode, scale);
        }
        // Flow children (AUTO) - DON'T scale positions, auto-layout manages them
      }
      await scaleNodeRecursive(child as SceneNode, scale, fontCache, target, rootSnapshot);
    }
  }

  if (node.type === "TEXT") {
    await scaleTextNode(node, scale, fontCache, target);
    return;
  }

  if ("width" in node && "height" in node && typeof node.width === "number" && typeof node.height === "number") {
    // CRITICAL FIX: Ensure all dimensions are rounded to clean integers
    // Fractional pixels cause brittle code generation in MCP tools
    let newWidth = Math.round(node.width * scale);
    let newHeight = Math.round(node.height * scale);

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
    if (!isBackground) {
      const elementRole = getElementRole(node);
      if (elementRole && MIN_ELEMENT_SIZES[elementRole]) {
        const minSize = MIN_ELEMENT_SIZES[elementRole];

        if (newWidth < minSize.width || newHeight < minSize.height) {
          const minScaleW = minSize.width / node.width;
          const minScaleH = minSize.height / node.height;
          const preserveScale = Math.max(minScaleW, minScaleH, scale);

          newWidth = Math.round(node.width * preserveScale);
          newHeight = Math.round(node.height * preserveScale);
        }
      }
    }

    const safeWidth = Math.max(1, newWidth);
    const safeHeight = Math.max(1, newHeight);

    // Validate and apply constraints using dedicated module
    const validatedConstraints = validateConstraints(scaledConstraints, safeWidth, safeHeight);
    applyConstraints(node, validatedConstraints, scale);

    if ("resizeWithoutConstraints" in node && typeof node.resizeWithoutConstraints === "function") {
      node.resizeWithoutConstraints(safeWidth, safeHeight);

      // FIX: Force auto-layout reflow for nested auto-layout frames
      // resizeWithoutConstraints doesn't trigger auto-layout, so children stay at old positions
      // Toggling layoutMode off and on forces Figma to recalculate child positions
      if (node.type === "FRAME" && "layoutMode" in node && node.layoutMode !== "NONE") {
        const originalMode = node.layoutMode;
        const originalPrimary = node.primaryAxisAlignItems;
        const originalCounter = node.counterAxisAlignItems;
        const originalPrimarySizing = node.primaryAxisSizingMode;
        const originalCounterSizing = node.counterAxisSizingMode;
        const originalWrap = node.layoutWrap;

        // Toggle to NONE and back to force reflow
        node.layoutMode = "NONE";
        node.layoutMode = originalMode;

        // Restore all alignment and sizing properties (they get reset when mode changes)
        node.primaryAxisAlignItems = originalPrimary;
        node.counterAxisAlignItems = originalCounter;
        node.primaryAxisSizingMode = originalPrimarySizing;
        node.counterAxisSizingMode = originalCounterSizing;
        node.layoutWrap = originalWrap;

        debugFixLog("DIAGNOSTIC: Forced auto-layout reflow on nested frame", {
          nodeId: node.id,
          nodeName: node.name,
          layoutMode: originalMode,
          alignments: { primary: originalPrimary, counter: originalCounter },
          newSize: { width: safeWidth, height: safeHeight },
          childPositions: "children" in node ? node.children.slice(0, 4).map(c => ({
            id: c.id,
            name: c.name,
            x: "x" in c ? (c as { x: number }).x : "N/A",
            y: "y" in c ? (c as { y: number }).y : "N/A"
          })) : []
        });
      }
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

// adjustAutoLayoutProperties is now imported from auto-layout-management module

// cloneValue moved to effect-scaling.ts
