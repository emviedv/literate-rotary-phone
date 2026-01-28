/**
 * Spec Applicator
 *
 * Applies AI-generated design specifications to Figma nodes.
 * Handles positioning, sizing, visibility, and z-index reordering.
 */

import { debugFixLog } from "./debug.js";
import type { NodeSpec } from "../types/design-types.js";
import { TIKTOK_CONSTRAINTS as CONSTRAINTS } from "../types/design-types.js";
import { MIN_EDGE_PADDING, hasImageFill } from "./edge-enforcement.js";
import type { NodeMap } from "./node-map-builder.js";

// ============================================================================
// Constants
// ============================================================================

/**
 * Threshold for position changes that warrant breaking auto-layout.
 */
export const POSITION_CHANGE_THRESHOLD = 10;

// ============================================================================
// Position Utilities
// ============================================================================

/**
 * Determines if a position change is significant enough to break auto-layout.
 */
export function shouldBreakAutoLayout(
  node: SceneNode,
  targetPos: { x: number; y: number }
): boolean {
  const dx = Math.abs(node.x - targetPos.x);
  const dy = Math.abs(node.y - targetPos.y);
  return dx > POSITION_CHANGE_THRESHOLD || dy > POSITION_CHANGE_THRESHOLD;
}

// ============================================================================
// Spec Application
// ============================================================================

/**
 * Applies a single node specification to a Figma node.
 *
 * @param node - The Figma node to modify
 * @param spec - The specification from AI
 * @param isAtomicChild - If true, skip ALL modifications
 * @param isAtomicInstance - If true, skip size/scale but allow position
 */
export function applyNodeSpec(
  node: SceneNode,
  spec: NodeSpec,
  isAtomicChild: boolean = false,
  isAtomicInstance: boolean = false
): void {
  // Skip ALL modifications for atomic group children
  if (isAtomicChild) {
    debugFixLog("Skipping ALL spec application for atomic group child", {
      nodeId: spec.nodeId,
      nodeName: spec.nodeName,
      reason: "Child of atomic group - preserving complete state",
    });
    return;
  }

  // Handle visibility
  if (!spec.visible) {
    node.visible = false;
    return;
  }

  node.visible = true;

  // Apply position
  if (spec.position) {
    const parentIsAutoLayout =
      node.parent &&
      "layoutMode" in node.parent &&
      (node.parent as FrameNode).layoutMode !== "NONE";

    if (parentIsAutoLayout) {
      debugFixLog("Skipping position for auto-layout child", {
        nodeId: spec.nodeId,
        nodeName: spec.nodeName,
        parentLayoutMode: (node.parent as FrameNode).layoutMode,
        reason: "Child of auto-layout container - position would break flow",
      });
    } else {
      const needsRepositioning = shouldBreakAutoLayout(node, spec.position);

      if (needsRepositioning) {
        if ("layoutPositioning" in node && node.layoutPositioning === "AUTO") {
          try {
            (node as FrameNode).layoutPositioning = "ABSOLUTE";
            debugFixLog("Breaking auto-layout for significant repositioning", {
              nodeId: spec.nodeId,
              nodeName: spec.nodeName,
              currentPos: { x: node.x, y: node.y },
              targetPos: spec.position,
            });
          } catch {
            // Some nodes don't support this
          }
        }

        try {
          let targetX = spec.position.x;
          const targetY = spec.position.y;

          // Edge padding enforcement for text
          if (node.type === "TEXT" && "width" in node) {
            const textWidth = (node as TextNode).width;
            const maxX = CONSTRAINTS.WIDTH - MIN_EDGE_PADDING - textWidth;

            if (targetX < MIN_EDGE_PADDING) {
              debugFixLog("Edge padding enforcement: shifting text from left edge", {
                nodeId: spec.nodeId,
                nodeName: spec.nodeName,
                originalX: targetX,
                correctedX: MIN_EDGE_PADDING,
              });
              targetX = MIN_EDGE_PADDING;
            } else if (targetX > maxX && maxX > MIN_EDGE_PADDING) {
              debugFixLog("Edge padding enforcement: shifting text from right edge", {
                nodeId: spec.nodeId,
                nodeName: spec.nodeName,
                originalX: targetX,
                correctedX: maxX,
              });
              targetX = maxX;
            }
          }

          node.x = targetX;
          node.y = targetY;
        } catch (error) {
          debugFixLog("Failed to set position", {
            nodeId: spec.nodeId,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      } else {
        debugFixLog("Skipping repositioning to preserve auto-layout", {
          nodeId: spec.nodeId,
          nodeName: spec.nodeName,
          currentPos: { x: node.x, y: node.y },
          targetPos: spec.position,
          deltaX: Math.abs(node.x - spec.position.x),
          deltaY: Math.abs(node.y - spec.position.y),
        });
      }
    }
  }

  // Apply size - skip for atomic instances
  if (spec.size && "resize" in node) {
    if (isAtomicInstance) {
      debugFixLog("Skipping size change for atomic instance", {
        nodeId: spec.nodeId,
        nodeName: spec.nodeName,
        requestedSize: spec.size,
        reason: "Resizing component instance breaks internal structure",
      });
    } else {
      const isImage = hasImageFill(node);

      let targetWidth = spec.size.width;
      let targetHeight = spec.size.height;

      if (isImage && "width" in node && "height" in node) {
        const frameNode = node as FrameNode;
        const originalAspect = frameNode.width / frameNode.height;

        const scaleByWidth = spec.size.width / frameNode.width;
        const scaleByHeight = spec.size.height / frameNode.height;
        const scale = Math.max(scaleByWidth, scaleByHeight);

        targetWidth = frameNode.width * scale;
        targetHeight = frameNode.height * scale;

        debugFixLog("Preserving image aspect ratio", {
          nodeId: spec.nodeId,
          nodeName: spec.nodeName,
          original: { w: frameNode.width, h: frameNode.height, aspect: originalAspect },
          specSize: spec.size,
          scale,
          adjusted: { w: targetWidth, h: targetHeight },
        });
      }

      try {
        (node as FrameNode).resize(targetWidth, targetHeight);
      } catch {
        try {
          if ("resizeWithoutConstraints" in node) {
            (node as FrameNode).resizeWithoutConstraints(targetWidth, targetHeight);
          }
        } catch (error) {
          debugFixLog("Failed to resize node", {
            nodeId: spec.nodeId,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }
    }
  }

  // Apply scale factor - skip for atomic instances
  if (spec.scaleFactor && spec.scaleFactor !== 1.0 && !spec.size) {
    if (isAtomicInstance) {
      debugFixLog("Skipping scale factor for atomic instance", {
        nodeId: spec.nodeId,
        nodeName: spec.nodeName,
        requestedScale: spec.scaleFactor,
        reason: "Scaling component instance breaks internal structure",
      });
    } else {
      try {
        if ("width" in node && "height" in node && "resize" in node) {
          const frameNode = node as FrameNode;
          const newWidth = frameNode.width * spec.scaleFactor;
          const newHeight = frameNode.height * spec.scaleFactor;
          frameNode.resize(newWidth, newHeight);
        }
      } catch (error) {
        debugFixLog("Failed to apply scale factor", {
          nodeId: spec.nodeId,
          scaleFactor: spec.scaleFactor,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  // Handle text-specific specs
  if (node.type === "TEXT" && spec.textTruncate) {
    applyTextTruncation(node as TextNode, spec.maxLines ?? 1);
  }
}

/**
 * Truncates text to fit within line limits.
 */
function applyTextTruncation(textNode: TextNode, maxLines: number): void {
  try {
    textNode.textTruncation = "ENDING";
    textNode.maxLines = maxLines;
  } catch {
    debugFixLog("Text truncation not supported", { nodeId: textNode.id });
  }
}

// ============================================================================
// Z-Index Reordering
// ============================================================================

/**
 * Reorders children of the variant frame based on zIndex values.
 */
export function reorderChildrenByZIndex(
  variant: FrameNode,
  nodeMap: NodeMap,
  specs: readonly NodeSpec[],
  atomicGroupChildIds: Set<string>
): void {
  const specsWithZIndex = specs
    .filter((s) => s.visible !== false && s.zIndex !== undefined)
    .filter((s) => {
      const node = nodeMap[s.nodeId];
      if (node && atomicGroupChildIds.has(node.id)) {
        debugFixLog("Skipping z-index reorder for atomic group child", {
          nodeId: s.nodeId,
          nodeName: s.nodeName,
          reason: "Child of atomic group - preserving layer order",
        });
        return false;
      }
      return true;
    })
    .sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0));

  if (specsWithZIndex.length === 0) return;

  let reorderedCount = 0;

  for (let i = 0; i < specsWithZIndex.length; i++) {
    const spec = specsWithZIndex[i];
    const node = nodeMap[spec.nodeId];

    if (node && node.parent === variant && !node.removed) {
      try {
        variant.insertChild(i, node);
        reorderedCount++;
      } catch (error) {
        debugFixLog("Failed to reorder node", {
          nodeId: spec.nodeId,
          nodeName: spec.nodeName,
          targetIndex: i,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  if (reorderedCount > 0) {
    debugFixLog("Children reordered by zIndex", {
      reorderedCount,
      totalWithZIndex: specsWithZIndex.length,
    });
  }
}
