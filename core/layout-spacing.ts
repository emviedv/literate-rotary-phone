/**
 * Layout Spacing
 *
 * Calculates spacing and padding adjustments for adapted layouts
 * based on target dimensions, scale factor, and content characteristics.
 */

import { debugAutoLayoutLog } from "./debug.js";
import { ASPECT_RATIOS, SPACING_CONSTANTS } from "./layout-constants.js";
import type { LayoutContext } from "./layout-mode-resolver.js";

/**
 * Calculates spacing for the adapted layout.
 * Uses content-aware distribution based on child count.
 *
 * Distribution ratios:
 * - Sparse (1-2 children): 55% of extra space to gaps
 * - Moderate (3-5 children): 45% to gaps
 * - Dense (6+ children): 35% to gaps
 */
export function calculateSpacing(
  frame: FrameNode,
  newLayoutMode: "HORIZONTAL" | "VERTICAL" | "NONE",
  context: LayoutContext
): { item: number; counter?: number } {
  if (newLayoutMode === "NONE") {
    return { item: 0 };
  }

  const baseSpacingRaw =
    context.sourceLayout.itemSpacing ??
    (frame.layoutMode !== "NONE" ? frame.itemSpacing : 16);
  const scaledSpacing = baseSpacingRaw === 0 ? 0 : Math.max(baseSpacingRaw * context.scale, 1);

  // Content-aware distribution ratio based on child count
  const childCount = context.sourceLayout.childCount;
  let distributionRatio: number;
  if (childCount <= 2) {
    // Few children: more generous spacing
    distributionRatio = SPACING_CONSTANTS.DISTRIBUTION_SPARSE;
  } else if (childCount <= 5) {
    // Moderate: standard spacing
    distributionRatio = SPACING_CONSTANTS.DISTRIBUTION_MODERATE;
  } else {
    // Dense: tighter spacing to fit content
    distributionRatio = SPACING_CONSTANTS.DISTRIBUTION_DENSE;
  }

  // Boost distribution for extreme aspect ratios
  const aspectRatio = context.targetProfile.aspectRatio;
  if (aspectRatio < ASPECT_RATIOS.EDGE_SIZING_VERTICAL || aspectRatio > ASPECT_RATIOS.EXTREME_HORIZONTAL) {
    distributionRatio = Math.min(distributionRatio * 1.3, 0.5);
  }

  // Cap maximum spacing to prevent awkward layouts
  const maxSpacing = scaledSpacing * 8;

  debugAutoLayoutLog("spacing input resolved", {
    targetType: context.targetProfile.type,
    targetWidth: context.targetProfile.width,
    targetHeight: context.targetProfile.height,
    newLayoutMode,
    sourceLayoutMode: context.sourceLayout.mode,
    sourceChildCount: childCount,
    baseSpacing: baseSpacingRaw,
    scaledSpacing,
    distributionRatio,
    scale: context.scale
  });

  // Adjust spacing based on target format
  // Use safe area dimensions to prevent content from extending outside safe area
  if (context.targetProfile.type === "vertical" && newLayoutMode === "VERTICAL") {
    const extraSpace = context.targetProfile.safeHeight - (context.sourceLayout.height * context.scale);
    const gaps = Math.max(childCount - 1, 1);
    const additionalSpacing = Math.max(0, extraSpace / gaps * distributionRatio);
    const finalSpacing = Math.min(scaledSpacing + additionalSpacing, maxSpacing);
    const result = {
      item: Math.round(finalSpacing),
      counter: frame.layoutWrap === "WRAP" ? Math.round(scaledSpacing) : undefined
    };
    debugAutoLayoutLog("spacing calculated for vertical target", {
      extraSpace,
      gaps,
      additionalSpacing,
      finalSpacing,
      itemSpacing: result.item,
      counterAxisSpacing: result.counter
    });
    return result;
  }

  if (context.targetProfile.type === "horizontal" && newLayoutMode === "HORIZONTAL") {
    const extraSpace = context.targetProfile.safeWidth - (context.sourceLayout.width * context.scale);
    const gaps = Math.max(childCount - 1, 1);
    const additionalSpacing = Math.max(0, extraSpace / gaps * distributionRatio);
    const finalSpacing = Math.min(scaledSpacing + additionalSpacing, maxSpacing);
    const result = {
      item: Math.round(finalSpacing),
      counter: frame.layoutWrap === "WRAP" ? Math.round(scaledSpacing) : undefined
    };
    debugAutoLayoutLog("spacing calculated for horizontal target", {
      extraSpace,
      gaps,
      additionalSpacing,
      finalSpacing,
      itemSpacing: result.item,
      counterAxisSpacing: result.counter
    });
    return result;
  }

  const result: { item: number; counter?: number } = { item: Math.round(scaledSpacing) };
  debugAutoLayoutLog("spacing calculated for mixed target", {
    itemSpacing: result.item,
    counterAxisSpacing: result.counter
  });
  return result;
}

/**
 * Calculates padding adjustments for the adapted layout.
 * Scales padding proportionally and clamps negative values to zero.
 *
 * IMPORTANT: Uses context.sourceLayout.padding (from snapshot) rather than
 * reading frame padding directly. This is because prepareCloneForLayout
 * zeros frame padding before this function is called.
 */
export function calculatePaddingAdjustments(
  frame: FrameNode,
  newLayoutMode: "HORIZONTAL" | "VERTICAL" | "NONE",
  context: LayoutContext
): { top: number; right: number; bottom: number; left: number } {
  // Use padding from context (sourced from snapshot) rather than frame
  // Frame padding may have been zeroed by prepareCloneForLayout
  const basePadding = context.sourceLayout.padding ?? {
    top: frame.paddingTop || 0,
    right: frame.paddingRight || 0,
    bottom: frame.paddingBottom || 0,
    left: frame.paddingLeft || 0
  };

  // Scale base padding
  const scaledPadding = {
    top: basePadding.top * context.scale,
    right: basePadding.right * context.scale,
    bottom: basePadding.bottom * context.scale,
    left: basePadding.left * context.scale
  };

  const clampPadding = (side: "top" | "right" | "bottom" | "left", value: number): number => {
    if (value >= 0) {
      return value;
    }

    debugAutoLayoutLog("padding clamped to zero", {
      side,
      requested: value,
      targetType: context.targetProfile.type,
      targetWidth: context.targetProfile.width,
      targetHeight: context.targetProfile.height,
      sourceWidth: context.sourceLayout.width,
      sourceHeight: context.sourceLayout.height,
      scale: context.scale
    });

    return 0;
  };

  return {
    top: Math.round(clampPadding("top", scaledPadding.top)),
    right: Math.round(clampPadding("right", scaledPadding.right)),
    bottom: Math.round(clampPadding("bottom", scaledPadding.bottom)),
    left: Math.round(clampPadding("left", scaledPadding.left))
  };
}
