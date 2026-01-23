/**
 * Design Spec Applier Module
 *
 * Applies AI-generated design specifications to individual Figma nodes.
 * Handles visibility, positioning, sizing, and text truncation with awareness
 * of atomic groups and auto-layout constraints.
 */

import { debugFixLog } from "./debug.js";
import type { NodeSpec } from "../types/design-types.js";
import { TIKTOK_CONSTRAINTS as CONSTRAINTS } from "../types/design-types.js";

// ============================================================================
// Constants
// ============================================================================

/**
 * Minimum padding from frame edges for text and important content.
 * Programmatic enforcement ensures AI positioning errors don't result in
 * content flush against edges.
 */
export const MIN_EDGE_PADDING = 40;

/**
 * Threshold for position changes that warrant breaking auto-layout.
 * If the AI-specified position is within this threshold of the node's current
 * position, we skip repositioning entirely to preserve auto-layout flow.
 */
export const POSITION_CHANGE_THRESHOLD = 10; // pixels

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Determines if a position change is significant enough to break auto-layout.
 * Returns true if the target position differs from current by more than threshold.
 */
function shouldBreakAutoLayout(
  node: SceneNode,
  targetPos: { x: number; y: number }
): boolean {
  const dx = Math.abs(node.x - targetPos.x);
  const dy = Math.abs(node.y - targetPos.y);
  return dx > POSITION_CHANGE_THRESHOLD || dy > POSITION_CHANGE_THRESHOLD;
}

/**
 * Checks if a node contains an image fill that should preserve aspect ratio.
 * Image nodes should not be arbitrarily stretched - they need proportional scaling.
 */
export function hasImageFill(node: SceneNode): boolean {
  if (!("fills" in node)) return false;
  const fills = node.fills as readonly Paint[] | undefined;
  return fills?.some((f) => f.type === "IMAGE") ?? false;
}


// ============================================================================
// Text Truncation
// ============================================================================

/**
 * Truncates text to fit within line limits.
 * Sets textTruncation to "ENDING" and applies maxLines constraint.
 *
 * @param textNode - The text node to truncate
 * @param maxLines - Maximum number of lines to display
 */
export function applyTextTruncation(textNode: TextNode, maxLines: number): void {
  try {
    textNode.textTruncation = "ENDING";
    textNode.maxLines = maxLines;
  } catch {
    // Not all Figma versions support these properties
    debugFixLog("Text truncation not supported", { nodeId: textNode.id });
  }
}

// ============================================================================
// Main Spec Application
// ============================================================================

/**
 * Applies a single node specification to a Figma node.
 *
 * Handles:
 * - Visibility changes
 * - Position changes with auto-layout awareness
 * - Size changes with image aspect ratio preservation
 * - Scale factor application
 * - Text truncation
 *
 * @param node - The Figma node to modify
 * @param spec - The specification from AI
 * @param isAtomicChild - If true, skip ALL modifications (child of atomic group like iPhone mockup)
 * @param isAtomicInstance - If true, skip size/scale changes but allow position (the instance itself)
 */
export function applyNodeSpec(
  node: SceneNode,
  spec: NodeSpec,
  isAtomicChild: boolean = false,
  isAtomicInstance: boolean = false
): void {
  // CRITICAL: Skip ALL modifications for atomic group children
  // They must maintain their exact state relative to parent - including visibility,
  // size, scale, and position. Modifying any of these breaks component integrity
  // (e.g., separating phone bezel from screen, changing z-order of mockup parts)
  if (isAtomicChild) {
    debugFixLog("Skipping ALL spec application for atomic group child", {
      nodeId: spec.nodeId,
      nodeName: spec.nodeName,
      reason: "Child of atomic group - preserving complete state"
    });
    return; // Early exit - no changes at all
  }

  // Handle visibility (only for non-atomic children now)
  if (!spec.visible) {
    node.visible = false;
    return;
  }

  node.visible = true;

  // Apply position - only break auto-layout if position change is significant
  // Position is safe for atomic instances (moves the whole component)
  if (spec.position) {
    // SAFEGUARD: Check if parent is auto-layout - if so, skip position to preserve flow
    // This catches cases where the AI mistakenly provides positions for auto-layout children
    const parentIsAutoLayout = node.parent &&
      "layoutMode" in node.parent &&
      (node.parent as FrameNode).layoutMode !== "NONE";

    if (parentIsAutoLayout) {
      debugFixLog("Skipping position for auto-layout child", {
        nodeId: spec.nodeId,
        nodeName: spec.nodeName,
        parentLayoutMode: (node.parent as FrameNode).layoutMode,
        reason: "Child of auto-layout container - position would break flow"
      });
      // Don't apply position - let it flow with parent
    } else {
      const needsRepositioning = shouldBreakAutoLayout(node, spec.position);

      if (needsRepositioning) {
        // Break out of auto-layout for repositioning
        if ("layoutPositioning" in node && node.layoutPositioning === "AUTO") {
          try {
            (node as FrameNode).layoutPositioning = "ABSOLUTE";
            debugFixLog("Breaking auto-layout for significant repositioning", {
              nodeId: spec.nodeId,
              nodeName: spec.nodeName,
              currentPos: { x: node.x, y: node.y },
              targetPos: spec.position
            });
          } catch {
            // Some nodes don't support this
          }
        }

        try {
          let targetX = spec.position.x;
          const targetY = spec.position.y;

          // EDGE PADDING ENFORCEMENT: Clamp text nodes away from edges
          // This is a programmatic safeguard when AI returns positions too close to edges
          if (node.type === "TEXT" && "width" in node) {
            const textWidth = (node as TextNode).width;
            const maxX = CONSTRAINTS.WIDTH - MIN_EDGE_PADDING - textWidth;

            if (targetX < MIN_EDGE_PADDING) {
              debugFixLog("Edge padding enforcement: shifting text from left edge", {
                nodeId: spec.nodeId,
                nodeName: spec.nodeName,
                originalX: targetX,
                correctedX: MIN_EDGE_PADDING
              });
              targetX = MIN_EDGE_PADDING;
            } else if (targetX > maxX && maxX > MIN_EDGE_PADDING) {
              debugFixLog("Edge padding enforcement: shifting text from right edge", {
                nodeId: spec.nodeId,
                nodeName: spec.nodeName,
                originalX: targetX,
                correctedX: maxX
              });
              targetX = maxX;
            }
          }

          node.x = targetX;
          node.y = targetY;
        } catch (error) {
          debugFixLog("Failed to set position", {
            nodeId: spec.nodeId,
            error: error instanceof Error ? error.message : String(error)
          });
        }
      } else {
        // Position change is minimal - preserve auto-layout flow
        debugFixLog("Skipping repositioning to preserve auto-layout", {
          nodeId: spec.nodeId,
          nodeName: spec.nodeName,
          currentPos: { x: node.x, y: node.y },
          targetPos: spec.position,
          deltaX: Math.abs(node.x - spec.position.x),
          deltaY: Math.abs(node.y - spec.position.y)
        });
      }
    }
  }

  // Apply size - SKIP for atomic instances, PRESERVE ASPECT RATIO for images
  if (spec.size && "resize" in node) {
    if (isAtomicInstance) {
      debugFixLog("Skipping size change for atomic instance", {
        nodeId: spec.nodeId,
        nodeName: spec.nodeName,
        requestedSize: spec.size,
        reason: "Resizing component instance breaks internal structure"
      });
    } else {
      // Check if this node has image fills that need aspect ratio preservation
      const needsAspectPreservation = hasImageFill(node);

      let targetWidth = spec.size.width;
      let targetHeight = spec.size.height;

      if (needsAspectPreservation && "width" in node && "height" in node) {
        // Preserve aspect ratio for images - calculate proportional size
        const frameNode = node as FrameNode;
        const originalAspect = frameNode.width / frameNode.height;

        // Use the larger scale factor to determine final size
        // This ensures the image fits approximately where AI wanted it (cover behavior)
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
          adjusted: { w: targetWidth, h: targetHeight }
        });
      }

      try {
        (node as FrameNode).resize(targetWidth, targetHeight);
      } catch {
        // Try resizeWithoutConstraints
        try {
          if ("resizeWithoutConstraints" in node) {
            (node as FrameNode).resizeWithoutConstraints(targetWidth, targetHeight);
          }
        } catch (error) {
          debugFixLog("Failed to resize node", {
            nodeId: spec.nodeId,
            error: error instanceof Error ? error.message : String(error)
          });
        }
      }
    }
  }

  // Apply scale factor (if size not explicitly set) - SKIP for atomic instances
  if (spec.scaleFactor && spec.scaleFactor !== 1.0 && !spec.size) {
    if (isAtomicInstance) {
      debugFixLog("Skipping scale factor for atomic instance", {
        nodeId: spec.nodeId,
        nodeName: spec.nodeName,
        requestedScale: spec.scaleFactor,
        reason: "Scaling component instance breaks internal structure"
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
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }
  }

  // Handle text-specific specs
  if (node.type === "TEXT" && spec.textTruncate) {
    applyTextTruncation(node as TextNode, spec.maxLines ?? 1);
  }
}
