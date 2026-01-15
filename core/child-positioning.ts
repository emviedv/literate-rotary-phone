/**
 * Child Positioning Module
 *
 * Functions for repositioning, validating, and counting child nodes during
 * frame scaling operations. Handles absolute positioning, bounds clamping,
 * and hero bleed element placement.
 *
 * Extracted from variant-scaling.ts for modularity and testability.
 */

import { isBackgroundLike } from "./element-classification.js";
import { hasOverlayRole } from "./node-roles.js";
import type { AutoLayoutSnapshot } from "./variant-scaling.js";

// ============================================================================
// Position Adjustment
// ============================================================================

/**
 * Adjusts a node's position by the given scale factor.
 * Only affects absolute-positioned nodes or nodes without layout positioning.
 *
 * @param node - The node to adjust
 * @param scale - The scaling factor
 */
export function adjustNodePosition(node: SceneNode, scale: number): void {
  if ("layoutPositioning" in node) {
    if (node.layoutPositioning === "ABSOLUTE") {
      node.x = Math.round(node.x * scale);
      node.y = Math.round(node.y * scale);
    }
    return;
  }

  if ("x" in node && typeof node.x === "number" && "y" in node && typeof node.y === "number") {
    node.x = Math.round(node.x * scale);
    node.y = Math.round(node.y * scale);
  }
}

// ============================================================================
// Hero Bleed Positioning
// ============================================================================

/**
 * Position a hero_bleed element by preserving its proportional edge relationship.
 *
 * Hero bleed elements intentionally extend beyond frame bounds, so we maintain
 * their position relative to the nearest edge instead of constraining to safe area.
 *
 * Algorithm:
 * 1. Calculate element center
 * 2. Determine which edge is closest on each axis
 * 3. Calculate proportional distance ratio from that edge
 * 4. Apply same ratio to position in target frame
 *
 * @param child - The child's current position and dimensions
 * @param frameWidth - Target frame width
 * @param frameHeight - Target frame height
 * @returns New x/y coordinates preserving edge-relative positioning
 */
export function positionHeroBleedChild(
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
    x: Math.round(newX),
    y: Math.round(newY)
  };
}

// ============================================================================
// Children Repositioning
// ============================================================================

/**
 * Repositions absolute children by applying offset and clamping to bounds.
 *
 * Behavior:
 * - Skips non-absolute children (they flow with auto-layout)
 * - Resets background-like elements to origin (0, 0)
 * - Applies offset and clamps to prevent overflow
 *
 * @param parent - The parent frame
 * @param offsetX - Horizontal offset to apply
 * @param offsetY - Vertical offset to apply
 * @param rootSnapshot - Original frame snapshot for background detection
 */
export function repositionChildren(
  parent: FrameNode,
  offsetX: number,
  offsetY: number,
  rootSnapshot: AutoLayoutSnapshot | null
): void {
  if (!("children" in parent)) {
    return;
  }

  const parentWidth = parent.width;
  const parentHeight = parent.height;

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

    // Get child dimensions for bounds clamping
    const childWidth = "width" in child ? (child as { width: number }).width : 0;
    const childHeight = "height" in child ? (child as { height: number }).height : 0;

    if ("x" in child && typeof child.x === "number") {
      const newX = Math.round(child.x + offsetX);
      // Clamp to frame bounds: ensure x >= 0 and x + width <= parentWidth
      child.x = Math.max(0, Math.min(newX, parentWidth - childWidth));
    }
    if ("y" in child && typeof child.y === "number") {
      const newY = Math.round(child.y + offsetY);
      // Clamp to frame bounds: ensure y >= 0 and y + height <= parentHeight
      child.y = Math.max(0, Math.min(newY, parentHeight - childHeight));
    }
  }
}

// ============================================================================
// Bounds Validation
// ============================================================================

/**
 * Final validation to ensure all children are within parent bounds.
 * This is a belt-and-suspenders approach - even if earlier calculations
 * produce bad values, this catches any overflow.
 *
 * Also handles oversized children by scaling them down to fit.
 *
 * @param parent - The parent frame to validate
 */
export function validateChildrenBounds(parent: FrameNode): void {
  if (!("children" in parent)) {
    return;
  }

  const parentWidth = parent.width;
  const parentHeight = parent.height;

  for (const child of parent.children) {
    if (!("x" in child) || !("y" in child)) continue;

    const childWidth = "width" in child ? (child as { width: number }).width : 0;
    const childHeight = "height" in child ? (child as { height: number }).height : 0;

    // Clamp position to prevent overflow
    if ((child as { x: number }).x < 0) {
      (child as { x: number }).x = 0;
    }
    if ((child as { y: number }).y < 0) {
      (child as { y: number }).y = 0;
    }

    // Clamp to prevent extending past bounds
    if ((child as { x: number }).x + childWidth > parentWidth) {
      (child as { x: number }).x = Math.max(0, parentWidth - childWidth);
    }
    if ((child as { y: number }).y + childHeight > parentHeight) {
      (child as { y: number }).y = Math.max(0, parentHeight - childHeight);
    }

    // If element is still larger than frame, scale it down
    if (childWidth > parentWidth || childHeight > parentHeight) {
      const fitScale = Math.min(
        parentWidth / Math.max(childWidth, 1),
        parentHeight / Math.max(childHeight, 1)
      );
      if ("resize" in child && typeof (child as { resize: unknown }).resize === "function") {
        (child as { resize: (w: number, h: number) => void }).resize(
          childWidth * fitScale,
          childHeight * fitScale
        );
      }
    }
  }
}

// ============================================================================
// Child Counting
// ============================================================================

/**
 * Counts absolute-positioned children, excluding overlay nodes.
 * Used to determine how many children need repositioning during scaling.
 *
 * @param frame - The frame to count children in
 * @returns Number of absolute children (excluding overlays)
 */
export function countAbsoluteChildren(frame: FrameNode): number {
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
