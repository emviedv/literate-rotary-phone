/**
 * Child Adaptations
 *
 * Creates per-child layout adaptations based on content type,
 * background detection, and target format requirements.
 */

import { debugAutoLayoutLog } from "./debug.js";
import { hasImageContent, isBackgroundLike } from "./layout-detection-helpers.js";
import type { LayoutContext } from "./layout-mode-resolver.js";

/**
 * Configuration for a single child's layout adaptation.
 */
export interface ChildAdaptation {
  layoutGrow?: number;
  layoutAlign?: "INHERIT" | "STRETCH";
  layoutPositioning?: "AUTO" | "ABSOLUTE";
  minWidth?: number;
  maxWidth?: number;
  minHeight?: number;
  maxHeight?: number;
}

/**
 * Creates child-specific adaptations for layout conversion.
 *
 * Handles:
 * - Background layer detection (AI override or heuristic)
 * - Image/media preservation (prevents stretching)
 * - Text box alignment
 * - Edge element constraints in extreme formats
 */
export function createChildAdaptations(
  frame: FrameNode,
  newLayoutMode: "HORIZONTAL" | "VERTICAL" | "NONE",
  context: LayoutContext
): Map<string, ChildAdaptation> {
  const adaptations = new Map<string, ChildAdaptation>();

  frame.children.forEach((child, index) => {
    if (!child.visible) return;

    const adaptation: ChildAdaptation = {};
    const containsImage = hasImageContent(child as SceneNode);

    // AI Background Override
    if (context.layoutAdvice?.backgroundNodeId) {
      if (child.id === context.layoutAdvice.backgroundNodeId) {
        adaptation.layoutPositioning = "ABSOLUTE";
        adaptations.set(child.id, adaptation);
        return;
      }
      // If AI specified a background, do NOT apply heuristics to others
    } else {
      // Identify background layers using multi-signal detection
      const isBottomLayer = index === frame.children.length - 1;
      if (
        isBackgroundLike(child as SceneNode, context.sourceLayout.width, context.sourceLayout.height, isBottomLayer)
      ) {
        adaptation.layoutPositioning = "ABSOLUTE";
        adaptations.set(child.id, adaptation);
        return;
      }
    }

    // For converted layouts, adjust child properties
    if (frame.layoutMode !== newLayoutMode && newLayoutMode !== "NONE") {
      // When converting to vertical, make children stretch horizontally
      if (newLayoutMode === "VERTICAL") {
        // Only stretch text boxes by default; other elements should maintain their intrinsic size.
        adaptation.layoutAlign = (containsImage || child.type !== 'TEXT') ? "INHERIT" : "STRETCH";
        adaptation.layoutGrow = 0;
      }
      // When converting to horizontal, control heights
      if (newLayoutMode === "HORIZONTAL") {
        adaptation.layoutAlign = "INHERIT";
        adaptation.layoutGrow = containsImage ? 0 : 1; // Distribute space evenly
        adaptation.maxHeight = context.targetProfile.height * 0.8; // Prevent vertical overflow

        const previousAlign = (child as { layoutAlign?: string }).layoutAlign ?? "unknown";
        debugAutoLayoutLog("child layout align normalized", {
          childId: child.id,
          childType: child.type,
          previousAlign,
          assignedAlign: adaptation.layoutAlign,
          sourceLayoutMode: frame.layoutMode,
          targetLayoutMode: newLayoutMode
        });

        if (containsImage && adaptation.layoutGrow === 0) {
          debugAutoLayoutLog("preventing media stretch in horizontal flow", {
            childId: child.id,
            childType: child.type,
            targetWidth: context.targetProfile.width,
            targetHeight: context.targetProfile.height
          });
        }
      }
    }

    // Special handling for first/last children in extreme formats
    if (context.targetProfile.aspectRatio < 0.5 || context.targetProfile.aspectRatio > 2) {
      if (index === 0 || index === frame.children.length - 1) {
        adaptation.layoutGrow = 0; // Don't expand edge elements too much
      }
    }

    if (Object.keys(adaptation).length > 0) {
      adaptations.set(child.id, adaptation);
    }
  });

  return adaptations;
}
