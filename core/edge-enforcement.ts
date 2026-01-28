/**
 * Edge Enforcement
 *
 * Enforces safe areas and edge padding for TikTok content.
 * Ensures text and important content stays within visible bounds.
 */

import { debugFixLog } from "./debug.js";
import { TIKTOK_CONSTRAINTS as CONSTRAINTS } from "../types/design-types.js";

// ============================================================================
// Constants
// ============================================================================

/**
 * Minimum padding from frame edges for text and important content.
 */
export const MIN_EDGE_PADDING = 40;

// ============================================================================
// Edge Padding Enforcement
// ============================================================================

/**
 * Enforces minimum edge padding for all text nodes in the frame.
 * Uses absolute bounding box to detect actual position on canvas.
 */
export function enforceEdgePadding(frame: FrameNode): void {
  const frameBounds = frame.absoluteBoundingBox;
  if (!frameBounds) return;

  let correctionCount = 0;

  function checkAndCorrectNode(node: SceneNode): void {
    if (!node.visible) return;

    if (node.type === "TEXT" && node.absoluteBoundingBox) {
      const bounds = node.absoluteBoundingBox;
      const relX = bounds.x - frameBounds!.x;
      const relRight = relX + bounds.width;
      const maxRight = CONSTRAINTS.WIDTH - MIN_EDGE_PADDING;

      // Check left edge
      if (relX < MIN_EDGE_PADDING) {
        const correction = MIN_EDGE_PADDING - relX;
        try {
          node.x = node.x + correction;
          correctionCount++;
          debugFixLog("Edge padding enforcement (post-process): shifted from left", {
            nodeId: node.id,
            nodeName: node.name,
            originalRelX: relX,
            correction,
          });
        } catch (error) {
          debugFixLog("Failed to enforce left edge padding", {
            nodeId: node.id,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }
      // Check right edge
      else if (relRight > maxRight) {
        const correction = relRight - maxRight;
        try {
          node.x = node.x - correction;
          correctionCount++;
          debugFixLog("Edge padding enforcement (post-process): shifted from right", {
            nodeId: node.id,
            nodeName: node.name,
            originalRelRight: relRight,
            correction,
          });
        } catch (error) {
          debugFixLog("Failed to enforce right edge padding", {
            nodeId: node.id,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }
    }

    // Recurse into children
    if ("children" in node) {
      for (const child of (node as FrameNode | GroupNode).children) {
        checkAndCorrectNode(child);
      }
    }
  }

  for (const child of frame.children) {
    checkAndCorrectNode(child);
  }

  if (correctionCount > 0) {
    debugFixLog("Edge padding enforcement complete", {
      textNodesCorrected: correctionCount,
    });
  }
}

// ============================================================================
// Safe Area Enforcement
// ============================================================================

/**
 * Enforces TikTok safe areas by checking node positions.
 * Logs warnings for violations.
 */
export function enforceSafeAreas(frame: FrameNode): void {
  const bottomDangerY = CONSTRAINTS.HEIGHT * (1 - CONSTRAINTS.BOTTOM_DANGER_ZONE);
  const topCautionY = CONSTRAINTS.HEIGHT * CONSTRAINTS.TOP_CAUTION_ZONE;

  const violations: string[] = [];

  function checkNode(node: SceneNode): void {
    if (!node.visible) return;

    if ("absoluteBoundingBox" in node && node.absoluteBoundingBox) {
      const bounds = node.absoluteBoundingBox;
      const frameBounds = frame.absoluteBoundingBox;

      if (!frameBounds) return;

      const relY = bounds.y - frameBounds.y;
      const relBottom = relY + bounds.height;

      if (relBottom > bottomDangerY && node.type !== "FRAME") {
        violations.push(`${node.name} extends into bottom danger zone (y=${Math.round(relY)})`);
      }

      if (relY < topCautionY && isImportantContent(node)) {
        violations.push(`${node.name} is in top caution zone (y=${Math.round(relY)})`);
      }
    }

    if ("children" in node) {
      for (const child of node.children) {
        checkNode(child);
      }
    }
  }

  for (const child of frame.children) {
    checkNode(child);
  }

  if (violations.length > 0) {
    debugFixLog("Safe area violations detected", {
      count: violations.length,
      violations: violations.slice(0, 5),
    });
  }
}

/**
 * Determines if a node contains important content (text, images).
 */
export function isImportantContent(node: SceneNode): boolean {
  if (node.type === "TEXT") return true;
  if ("fills" in node) {
    const fills = node.fills as readonly Paint[] | undefined;
    if (fills?.some((f) => f.type === "IMAGE")) return true;
  }
  return false;
}

/**
 * Checks if a node contains an image fill.
 */
export function hasImageFill(node: SceneNode): boolean {
  if (!("fills" in node)) return false;
  const fills = node.fills as readonly Paint[] | undefined;
  return fills?.some((f) => f.type === "IMAGE") ?? false;
}
