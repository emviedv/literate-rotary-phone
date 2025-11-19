export type LayoutProfile = "horizontal" | "square" | "vertical";

export type AutoLayoutSummary = {
  readonly layoutMode: "NONE" | "HORIZONTAL" | "VERTICAL";
  readonly flowChildCount: number;
};

type PrimaryAxisAlign = FrameNode["primaryAxisAlignItems"];
type LayoutWrap = FrameNode["layoutWrap"];

/**
 * Classifies a target's aspect ratio so layout heuristics can adapt to wide,
 * square, or tall canvases without bespoke templates.
 * Enhanced with better handling for extreme aspect ratios and edge cases.
 */
export function resolveLayoutProfile(dimensions: { readonly width: number; readonly height: number }): LayoutProfile {
  const safeWidth = Math.max(dimensions.width, 1);
  const safeHeight = Math.max(dimensions.height, 1);
  const aspectRatio = safeHeight / safeWidth;

  // Handle extreme aspect ratios with more granular thresholds
  // Ultra-vertical (like TikTok 9:16, stories)
  if (aspectRatio >= 1.6) {
    return "vertical";
  }

  // Standard vertical (like portraits, some social media)
  if (aspectRatio >= 1.2) {
    return "vertical";
  }

  // Ultra-horizontal (like web banners, hero sections)
  if (aspectRatio <= 0.5) {
    return "horizontal";
  }

  // Standard horizontal (like YouTube, landscape photos)
  if (aspectRatio <= 0.8) {
    return "horizontal";
  }

  // Square-ish formats (Instagram posts, profile pictures)
  // Anything between 0.8 and 1.2 aspect ratio
  return "square";
}

/**
 * Determines whether a horizontal auto-layout container should reflow into a
 * vertical stack when generating a tall variant, or whether an already vertical
 * layout should maintain its vertical orientation.
 */
export function shouldAdoptVerticalFlow(
  profile: LayoutProfile,
  snapshot: AutoLayoutSummary | null | undefined
): boolean {
  if (profile !== "vertical" || !snapshot) {
    return false;
  }
  // If the source is already vertical and target is vertical, maintain vertical flow
  if (snapshot.layoutMode === "VERTICAL") {
    return true;
  }
  // Convert horizontal to vertical when appropriate
  if (snapshot.layoutMode !== "HORIZONTAL") {
    return false;
  }
  // Even single-child horizontal layouts should rotate for tall targets to avoid horizontal bias
  return snapshot.flowChildCount >= 1;
}

/**
 * Computes the next item spacing for a vertical stack by sharing the available
 * interior budget across gaps between flow children.
 * Enhanced with better distribution for extreme vertical layouts.
 */
export function computeVerticalSpacing(input: {
  readonly baseSpacing: number;
  readonly interior: number;
  readonly flowChildCount: number;
}): number {
  if (input.flowChildCount < 2) {
    return roundSpacing(input.baseSpacing);
  }

  const gaps = Math.max(input.flowChildCount - 1, 1);
  const interiorPerGap = Math.max(input.interior, 0) / gaps;

  // For layouts with lots of children, limit individual gap expansion
  // to prevent excessive spacing
  const maxGapExpansion = input.baseSpacing * 3; // Don't expand gaps more than 3x original
  const clampedAddition = Math.min(interiorPerGap, maxGapExpansion);

  // For layouts with very few children and lots of space,
  // distribute more conservatively to avoid awkward spacing
  if (input.flowChildCount <= 3 && interiorPerGap > input.baseSpacing * 2) {
    // Use only 60% of available interior space for very sparse layouts
    return roundSpacing(input.baseSpacing + clampedAddition * 0.6);
  }

  return roundSpacing(input.baseSpacing + clampedAddition);
}

/**
 * When rotating a horizontal auto layout into a vertical stack we default to
 * anchoring content to the top safe area unless the designer explicitly asked
 * for space-between distribution. Centered stacks otherwise leave large
 * gutters in tall canvases.
 */
export function resolveVerticalAlignItems(
  current: PrimaryAxisAlign,
  options: { readonly interior: number }
): PrimaryAxisAlign {
  if (current === "MIN") {
    return current;
  }
  const interior = Math.max(0, options.interior);
  if (interior > 0) {
    return "MIN";
  }
  if (current === "SPACE_BETWEEN") {
    return "SPACE_BETWEEN";
  }
  return "MIN";
}

/**
 * Tall variants should not wrap rows into multiple columns; disable wrapping
 * to preserve a single column stack.
 */
export function resolveVerticalLayoutWrap(current: LayoutWrap): LayoutWrap {
  if (current === "NO_WRAP") {
    return current;
  }
  return "NO_WRAP";
}

/**
 * Expands absolute-positioned children when the source frame lacks auto layout
 * or when we adopt a vertical variant so center-aligned artwork follows the
 * safe area.
 */
export function shouldExpandAbsoluteChildren(
  rootLayoutMode: FrameNode["layoutMode"] | null | undefined,
  adoptVerticalVariant: boolean
): boolean {
  if (adoptVerticalVariant) {
    return true;
  }
  if (!rootLayoutMode || rootLayoutMode === "NONE") {
    return true;
  }
  return false;
}

function roundSpacing(value: number): number {
  return Math.round(value * 100) / 100;
}
