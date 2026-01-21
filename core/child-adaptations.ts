/**
 * Child Adaptations
 *
 * Creates per-child layout adaptations based on content type,
 * background detection, and target format requirements.
 *
 * PROPERTY ASSIGNMENT PRIORITY (highest to lowest):
 * 1. Background detection - ABSOLUTE positioning trumps all
 * 2. Edge element constraints - first/last children in extreme formats
 * 3. Layout mode conversion - VERTICAL/HORIZONTAL specific properties
 * 4. Content-type defaults - text alignment, image preservation
 *
 * CRITICAL: When edge element handling applies (extreme aspect ratios),
 * use INHERIT instead of STRETCH to avoid conflicting layout signals.
 */

import { debugAutoLayoutLog } from "./debug.js";
import { isBackgroundLike } from "./layout-detection-helpers.js";
import type { LayoutContext } from "./layout-mode-resolver.js";
import { ASPECT_RATIOS } from "./layout-constants.js";

/**
 * Configuration for a single child's layout adaptation.
 */
export interface ChildAdaptation {
  layoutGrow?: number;
  layoutAlign?: "INHERIT" | "STRETCH";
  layoutPositioning?: "AUTO" | "ABSOLUTE";
  textAlignHorizontal?: "LEFT" | "CENTER" | "RIGHT" | "JUSTIFIED";
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
    const isText = child.type === "TEXT";

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

    // Determine if this is an edge element in an extreme format FIRST
    // Edge elements get special handling that takes precedence over generic layout rules
    const isExtremeFormat = context.targetProfile.aspectRatio < ASPECT_RATIOS.EDGE_SIZING_VERTICAL ||
                            context.targetProfile.aspectRatio > ASPECT_RATIOS.EDGE_SIZING_HORIZONTAL;
    const isEdgeElement = index === 0 || index === frame.children.length - 1;
    const needsEdgeConstraints = isExtremeFormat && isEdgeElement;

    // For converted layouts, adjust child properties
    if (frame.layoutMode !== newLayoutMode && newLayoutMode !== "NONE") {
      // When converting to vertical, use INHERIT alignment for all children
      // CRITICAL: Setting STRETCH + layoutGrow=0 is contradictory (see Phase 2 fix)
      // INHERIT allows children to maintain their intrinsic sizing while reflow occurs
      if (newLayoutMode === "VERTICAL") {
        adaptation.layoutAlign = "INHERIT";
        adaptation.layoutGrow = 0;

        // Auto-center text when stacking vertically, unless specific alignment is requested
        if (isText) {
          // If the target profile is vertical/square, we generally want centered text
          if (context.targetProfile.type === "vertical" || context.targetProfile.type === "square") {
             adaptation.textAlignHorizontal = "CENTER";
          }
        }
      }
      // When converting to horizontal, control heights
      if (newLayoutMode === "HORIZONTAL") {
        adaptation.layoutAlign = "INHERIT";
        // PRIORITY CHECK: Edge elements in extreme formats don't grow
        if (needsEdgeConstraints) {
          adaptation.layoutGrow = 0;
        } else {
          // Allow image containers to grow in horizontal layouts (banners)
          adaptation.layoutGrow = 1;
        }
        adaptation.maxHeight = context.targetProfile.height * 0.8; // Prevent vertical overflow

        const previousAlign = (child as { layoutAlign?: string }).layoutAlign ?? "unknown";
        debugAutoLayoutLog("child layout align normalized", {
          childId: child.id,
          childType: child.type,
          previousAlign,
          assignedAlign: adaptation.layoutAlign,
          sourceLayoutMode: frame.layoutMode,
          targetLayoutMode: newLayoutMode,
          isEdgeElement,
          needsEdgeConstraints
        });
      }
    }

    if (Object.keys(adaptation).length > 0) {
      adaptations.set(child.id, adaptation);
    }
  });

  return adaptations;
}
