/**
 * Auto Layout Management Module
 *
 * Handles snapshot capture, preparation, and restoration of auto layout settings
 * during the scaling process. This module encapsulates all auto layout state
 * management to ensure clean separation of concerns.
 *
 * Key responsibilities:
 * - Capturing current auto layout state before scaling
 * - Preparing frames for scaling by resetting layout properties
 * - Restoring auto layout settings with scaled values
 * - Managing layout property scaling calculations
 */

import { debugFixLog } from "./debug.js";
import type { AxisExpansionPlan } from "./layout-expansion.js";
import {
  computeVerticalSpacing,
  resolveVerticalAlignItems,
  resolveVerticalLayoutWrap
} from "./layout-profile.js";

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
  profile: "horizontal" | "vertical" | "square";
  adoptVerticalVariant: boolean;
};

/**
 * Captures the current auto layout state of a frame for later restoration.
 * Returns null if the frame doesn't use auto layout (layoutMode === "NONE").
 *
 * @param frame - The frame to capture auto layout state from
 * @returns AutoLayoutSnapshot or null if no auto layout
 */
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

/**
 * Prepares a frame for layout scaling by capturing its current state and
 * resetting auto layout properties to their neutral values.
 *
 * @param frame - The frame to prepare for scaling
 * @param autoLayoutSnapshots - Map to store the captured snapshot
 */
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

/**
 * Restores auto layout settings from a snapshot with scaled values applied.
 *
 * @param frame - The frame to restore auto layout settings to
 * @param autoLayoutSnapshots - Map containing captured snapshots
 * @param metrics - Scaling metrics containing expansion plans and scale factor
 */
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

  if (snapshot.layoutWrap === "WRAP" && typeof snapshot.counterAxisSpacing === "number" && "counterAxisSpacing" in frame) {
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

/**
 * Scales an auto layout metric value with optional minimum constraint.
 * Ensures clean integers for pixel-snapped Figma layout output.
 *
 * @param value - The value to scale
 * @param scale - The scale factor
 * @param min - Minimum value to enforce (default: 0)
 * @returns Scaled and rounded value, respecting minimum
 */
export function scaleAutoLayoutMetric(value: number, scale: number, min: number = 0): number {
  if (value === 0) return 0;
  const scaled = Math.round(value * scale);
  return Math.max(scaled, min);
}

/**
 * Adjusts auto layout properties on a scaled node.
 *
 * @param node - The node to adjust auto layout properties for
 * @param scale - The scale factor to apply
 */
export function adjustAutoLayoutProperties(node: SceneNode, scale: number): void {
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

// Functions are now imported from their respective modules