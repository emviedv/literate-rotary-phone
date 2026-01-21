/**
 * Layout Alignment
 *
 * Determines alignment strategies for adapted layouts based on
 * target profile, AI advice, and content characteristics.
 *
 * FREESTYLE POSITIONING MODE:
 * Pattern-based alignments have been removed. Alignment is determined by:
 * 1. Preserving original alignments when layout mode is unchanged
 * 2. AI's suggestedLayoutMode implies alignment intent
 * 3. Target-specific sensible defaults
 */

import { debugAutoLayoutLog } from "./debug.js";
import { resolveVerticalAlignItems } from "./layout-profile.js";
import type { LayoutContext } from "./layout-mode-resolver.js";

/**
 * Determines alignment strategies for the adapted layout.
 *
 * FREESTYLE MODE Priority:
 * 1. Preserve original alignments when layout mode is preserved (critical for nested frames)
 * 2. Target-specific heuristics (vertical targets center, horizontal use SPACE_BETWEEN)
 * 3. Default centered approach
 */
export function determineAlignments(
  layoutMode: "HORIZONTAL" | "VERTICAL" | "NONE",
  context: LayoutContext
): { primary: FrameNode["primaryAxisAlignItems"]; counter: FrameNode["counterAxisAlignItems"] } {
  const { sourceLayout } = context;

  if (layoutMode === "NONE") {
    return { primary: "MIN", counter: "MIN" };
  }

  // CRITICAL: Preserve original alignments when layout mode doesn't change
  // This prevents destroying alignment-dependent layouts like bar charts (items-end),
  // bottom-aligned content (justify-end), and other intentional positioning
  if (
    sourceLayout.alignments &&
    sourceLayout.mode === layoutMode &&
    sourceLayout.alignments.primaryAxisAlignItems !== undefined &&
    sourceLayout.alignments.counterAxisAlignItems !== undefined
  ) {
    debugAutoLayoutLog("preserving original alignments (mode unchanged)", {
      layoutMode,
      originalPrimary: sourceLayout.alignments.primaryAxisAlignItems,
      originalCounter: sourceLayout.alignments.counterAxisAlignItems
    });
    return {
      primary: sourceLayout.alignments.primaryAxisAlignItems,
      counter: sourceLayout.alignments.counterAxisAlignItems
    };
  }

  // For vertical layouts in tall targets
  if (layoutMode === "VERTICAL" && context.targetProfile.type === "vertical") {
    const interiorEstimate = Math.max(context.targetProfile.height - context.sourceLayout.height * context.scale, 0);

    // Default to CENTER for vertical layouts (common for marketing content)
    const primaryAlign: FrameNode["primaryAxisAlignItems"] = "CENTER";

    // Preserve counter-axis alignment when it was explicitly set (e.g., items-end for bar charts)
    const counterAlign = sourceLayout.alignments?.counterAxisAlignItems ?? "CENTER";

    debugAutoLayoutLog("using vertical target alignment (FREESTYLE)", {
      primaryAlign,
      counterAlign,
      interiorEstimate
    });

    return {
      primary: resolveVerticalAlignItems(primaryAlign, { interior: interiorEstimate }),
      counter: counterAlign
    };
  }

  // For horizontal layouts in wide targets
  if (layoutMode === "HORIZONTAL" && context.targetProfile.type === "horizontal") {
    // Preserve counter-axis alignment when it was explicitly set
    const counterAlign = sourceLayout.alignments?.counterAxisAlignItems ?? "CENTER";

    debugAutoLayoutLog("using horizontal target alignment (FREESTYLE)", {
      primaryAlign: context.sourceLayout.childCount <= 3 ? "SPACE_BETWEEN" : "MIN",
      counterAlign
    });

    return {
      primary: context.sourceLayout.childCount <= 3 ? "SPACE_BETWEEN" : "MIN",
      counter: counterAlign
    };
  }

  // Default: try to preserve counter-axis alignment at minimum
  // This is important for nested frames that might have specific alignment needs
  const counterAlign = sourceLayout.alignments?.counterAxisAlignItems ?? "CENTER";
  const primaryAlign = sourceLayout.alignments?.primaryAxisAlignItems ?? "CENTER";

  debugAutoLayoutLog("using default alignment (FREESTYLE)", {
    primaryAlign,
    counterAlign
  });

  return {
    primary: primaryAlign,
    counter: counterAlign
  };
}
