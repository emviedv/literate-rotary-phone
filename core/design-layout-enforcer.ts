/**
 * Design Layout Enforcer Module
 *
 * Post-processing functions that enforce layout constraints after spec application.
 * Handles z-index reordering, edge padding enforcement, and safe area validation.
 */

import { debugFixLog } from "./debug.js";
import { TIKTOK_CONSTRAINTS as CONSTRAINTS } from "../types/design-types.js";
import { MIN_EDGE_PADDING } from "./design-spec-applier.js";
import type { NodeMap } from "./design-node-mapper.js";
import type { NodeSpec } from "../types/design-types.js";

// ============================================================================
// Z-Index Reordering
// ============================================================================

/**
 * Reorders children of the variant frame based on zIndex values from specs.
 * Figma z-order: index 0 = backmost, last index = frontmost.
 *
 * This function collects all visible nodes that have zIndex values,
 * sorts them by zIndex (ascending), then uses insertChild to reorder
 * them within the parent frame.
 *
 * @param variant - The variant frame whose children will be reordered
 * @param nodeMap - Map from source node IDs to cloned nodes in variant
 * @param specs - Array of node specifications with optional zIndex values
 * @param atomicGroupChildIds - Set of node IDs that are children of atomic groups (skip reordering)
 */
export function reorderChildrenByZIndex(
  variant: FrameNode,
  nodeMap: NodeMap,
  specs: readonly NodeSpec[],
  atomicGroupChildIds: Set<string>
): void {
  // Get specs with zIndex, filter to visible nodes only, and skip atomic group children
  // Atomic children must not be reordered - they must maintain their z-order within
  // the atomic group (e.g., phone bezel must stay in front of screen content)
  const specsWithZIndex = specs
    .filter((s) => s.visible !== false && s.zIndex !== undefined)
    .filter((s) => {
      const node = nodeMap[s.nodeId];
      if (node && atomicGroupChildIds.has(node.id)) {
        debugFixLog("Skipping z-index reorder for atomic group child", {
          nodeId: s.nodeId,
          nodeName: s.nodeName,
          reason: "Child of atomic group - preserving layer order"
        });
        return false;
      }
      return true;
    })
    .sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0));

  if (specsWithZIndex.length === 0) return;

  // Track successfully reordered nodes
  let reorderedCount = 0;

  // Reorder: lower zIndex = earlier in children array = behind
  for (let i = 0; i < specsWithZIndex.length; i++) {
    const spec = specsWithZIndex[i];
    const node = nodeMap[spec.nodeId];

    if (node && node.parent === variant && !node.removed) {
      try {
        // insertChild moves node to specified index
        variant.insertChild(i, node);
        reorderedCount++;
      } catch (error) {
        debugFixLog("Failed to reorder node", {
          nodeId: spec.nodeId,
          nodeName: spec.nodeName,
          targetIndex: i,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }
  }

  if (reorderedCount > 0) {
    debugFixLog("Children reordered by zIndex", {
      reorderedCount,
      totalWithZIndex: specsWithZIndex.length
    });
  }
}

// ============================================================================
// Edge Padding Enforcement
// ============================================================================

/**
 * Enforces minimum edge padding for all text nodes in the frame.
 * This is a post-processing safeguard that catches text positioned at edges
 * regardless of how it got there (direct positioning or inherited from container).
 *
 * Uses absolute bounding box to detect actual position on canvas, then
 * adjusts relative position to shift text away from edges.
 */
export function enforceEdgePadding(frame: FrameNode): void {
  const frameBounds = frame.absoluteBoundingBox;
  if (!frameBounds) return;

  let correctionCount = 0;

  function checkAndCorrectNode(node: SceneNode): void {
    if (!node.visible) return;

    // Only enforce on text nodes
    if (node.type === "TEXT" && node.absoluteBoundingBox) {
      const bounds = node.absoluteBoundingBox;

      // Convert to frame-relative coordinates
      // Note: frameBounds is guaranteed non-null due to early return above
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
            correction
          });
        } catch (error) {
          debugFixLog("Failed to enforce left edge padding", {
            nodeId: node.id,
            error: error instanceof Error ? error.message : String(error)
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
            correction
          });
        } catch (error) {
          debugFixLog("Failed to enforce right edge padding", {
            nodeId: node.id,
            error: error instanceof Error ? error.message : String(error)
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
      textNodesCorrected: correctionCount
    });
  }
}

// ============================================================================
// Safe Area Enforcement
// ============================================================================

/**
 * Enforces TikTok safe areas by checking node positions.
 * Logs warnings but doesn't move nodes (AI should handle positioning).
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

      // Convert to frame-relative coordinates
      const relY = bounds.y - frameBounds.y;
      const relBottom = relY + bounds.height;

      // Check bottom danger zone
      if (relBottom > bottomDangerY && node.type !== "FRAME") {
        violations.push(`${node.name} extends into bottom danger zone (y=${Math.round(relY)})`);
      }

      // Check top caution zone (only warn for important content)
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
      violations: violations.slice(0, 5) // Log first 5
    });
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Determines if a node contains important content (text, images).
 */
function isImportantContent(node: SceneNode): boolean {
  if (node.type === "TEXT") return true;
  if ("fills" in node) {
    const fills = node.fills as readonly Paint[] | undefined;
    if (fills?.some((f) => f.type === "IMAGE")) return true;
  }
  return false;
}
