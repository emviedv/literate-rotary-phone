/**
 * Layout Alignment
 *
 * Determines alignment strategies for adapted layouts based on
 * target profile, AI advice, and content characteristics.
 */

import { debugAutoLayoutLog } from "./debug.js";
import { resolveVerticalAlignItems } from "./layout-profile.js";
import type { LayoutPatternId } from "../types/layout-patterns.js";
import { LAYOUT_PATTERNS } from "../types/layout-patterns.js";
import type { LayoutContext } from "./layout-mode-resolver.js";

/**
 * Determines alignment strategies for the adapted layout.
 * Uses pattern-specific alignments when available from AI advice.
 *
 * Priority:
 * 1. Preserve original alignments when layout mode is preserved (critical for nested frames)
 * 2. AI pattern alignments (when pattern matches resolved layout mode)
 * 3. Target-specific heuristics (vertical targets center, horizontal use SPACE_BETWEEN)
 * 4. Default centered approach
 */
export function determineAlignments(
  layoutMode: "HORIZONTAL" | "VERTICAL" | "NONE",
  context: LayoutContext
): { primary: FrameNode["primaryAxisAlignItems"]; counter: FrameNode["counterAxisAlignItems"] } {
  const { layoutAdvice, sourceLayout } = context;

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

  // Try to use pattern-specific alignments from AI advice
  if (layoutAdvice?.selectedId) {
    const patternId = layoutAdvice.selectedId as LayoutPatternId;
    const pattern = LAYOUT_PATTERNS[patternId];
    if (pattern && pattern.layoutMode === layoutMode) {
      debugAutoLayoutLog("using pattern-specific alignment", {
        patternId,
        primaryAlignment: pattern.primaryAlignment,
        counterAlignment: pattern.counterAlignment
      });

      // Map pattern alignment to Figma alignment types
      const mapPrimaryAlignment = (
        align: "MIN" | "CENTER" | "MAX" | "SPACE_BETWEEN"
      ): FrameNode["primaryAxisAlignItems"] => {
        return align;
      };

      const mapCounterAlignment = (
        align: "MIN" | "CENTER" | "STRETCH"
      ): FrameNode["counterAxisAlignItems"] => {
        // Figma counterAxisAlignItems doesn't support STRETCH directly;
        // STRETCH is achieved via child layoutAlign property. Map to CENTER.
        if (align === "STRETCH") {
          return "CENTER";
        }
        return align;
      };

      return {
        primary: mapPrimaryAlignment(pattern.primaryAlignment),
        counter: mapCounterAlignment(pattern.counterAlignment)
      };
    }
  }

  // For vertical layouts in tall targets
  if (layoutMode === "VERTICAL" && context.targetProfile.type === "vertical") {
    const interiorEstimate = Math.max(context.targetProfile.height - context.sourceLayout.height * context.scale, 0);

    // Use AI-selected pattern's alignment when available
    // Patterns like "centered-stack" use CENTER, "hero-first" uses MIN
    let primaryAlign: FrameNode["primaryAxisAlignItems"] = "CENTER";
    if (layoutAdvice?.selectedId) {
      const patternId = layoutAdvice.selectedId as LayoutPatternId;
      const pattern = LAYOUT_PATTERNS[patternId];
      if (pattern?.layoutMode === "VERTICAL") {
        primaryAlign = pattern.primaryAlignment;
      }
    }

    // Preserve counter-axis alignment when it was explicitly set (e.g., items-end for bar charts)
    const counterAlign = sourceLayout.alignments?.counterAxisAlignItems ?? "CENTER";

    return {
      primary: resolveVerticalAlignItems(primaryAlign, { interior: interiorEstimate }),
      counter: counterAlign
    };
  }

  // For horizontal layouts in wide targets
  if (layoutMode === "HORIZONTAL" && context.targetProfile.type === "horizontal") {
    // Preserve counter-axis alignment when it was explicitly set
    const counterAlign = sourceLayout.alignments?.counterAxisAlignItems ?? "CENTER";

    return {
      primary: context.sourceLayout.childCount <= 3 ? "SPACE_BETWEEN" : "MIN",
      counter: counterAlign
    };
  }

  // Default: try to preserve counter-axis alignment at minimum
  // This is important for nested frames that might have specific alignment needs
  const counterAlign = sourceLayout.alignments?.counterAxisAlignItems ?? "CENTER";
  const primaryAlign = sourceLayout.alignments?.primaryAxisAlignItems ?? "CENTER";

  return {
    primary: primaryAlign,
    counter: counterAlign
  };
}
