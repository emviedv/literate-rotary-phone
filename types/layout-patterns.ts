/**
 * Expanded layout pattern vocabulary for AI-driven layout adaptation.
 * These patterns go beyond simple HORIZONTAL/VERTICAL to capture
 * semantic layout structures commonly used in marketing materials.
 */

export type LayoutPatternId =
  // Stack patterns
  | "horizontal-stack"    // Elements flow left-to-right
  | "vertical-stack"      // Elements flow top-to-bottom
  | "centered-stack"      // Centered vertical: logo → title → subtitle → cta

  // Split patterns
  | "split-left"          // Image left, text content right
  | "split-right"         // Text content left, image right

  // Layered patterns
  | "layered-hero"        // Text overlaid on hero image
  | "layered-gradient"    // Text over gradient overlay on image

  // Content ordering patterns
  | "hero-first"          // Large hero image top, content below
  | "text-first"          // Title/text top, supporting image below

  // Compact patterns
  | "compact-vertical"    // Tight vertical for small thumbnails
  | "banner-spread"       // Wide horizontal distribution for banners

  // Preservation pattern
  | "preserve-layout";    // Maintain original positioning (scale only)

export interface LayoutPattern {
  readonly id: LayoutPatternId;
  readonly label: string;
  readonly description: string;
  readonly layoutMode: "HORIZONTAL" | "VERTICAL" | "NONE";
  readonly primaryAlignment: "MIN" | "CENTER" | "MAX" | "SPACE_BETWEEN";
  readonly counterAlignment: "MIN" | "CENTER" | "STRETCH";
  readonly spacingStrategy: "tight" | "balanced" | "generous";
}

/**
 * Full pattern definitions with layout properties.
 */
export const LAYOUT_PATTERNS: Record<LayoutPatternId, LayoutPattern> = {
  "horizontal-stack": {
    id: "horizontal-stack",
    label: "Horizontal Stack",
    description: "Elements arranged left-to-right in a row",
    layoutMode: "HORIZONTAL",
    primaryAlignment: "SPACE_BETWEEN",
    counterAlignment: "CENTER",
    spacingStrategy: "balanced"
  },
  "vertical-stack": {
    id: "vertical-stack",
    label: "Vertical Stack",
    description: "Elements arranged top-to-bottom in a column",
    layoutMode: "VERTICAL",
    primaryAlignment: "MIN",
    counterAlignment: "CENTER",
    spacingStrategy: "balanced"
  },
  "centered-stack": {
    id: "centered-stack",
    label: "Centered Stack",
    description: "Centered vertical arrangement: logo → title → subtitle → cta",
    layoutMode: "VERTICAL",
    primaryAlignment: "CENTER",
    counterAlignment: "CENTER",
    spacingStrategy: "balanced"
  },
  "split-left": {
    id: "split-left",
    label: "Split Left",
    description: "Image on left, text content on right",
    layoutMode: "HORIZONTAL",
    primaryAlignment: "SPACE_BETWEEN",
    counterAlignment: "CENTER",
    spacingStrategy: "generous"
  },
  "split-right": {
    id: "split-right",
    label: "Split Right",
    description: "Text content on left, image on right",
    layoutMode: "HORIZONTAL",
    primaryAlignment: "SPACE_BETWEEN",
    counterAlignment: "CENTER",
    spacingStrategy: "generous"
  },
  "layered-hero": {
    id: "layered-hero",
    label: "Layered Hero",
    description: "Text overlaid directly on hero image",
    layoutMode: "NONE",
    primaryAlignment: "CENTER",
    counterAlignment: "CENTER",
    spacingStrategy: "tight"
  },
  "layered-gradient": {
    id: "layered-gradient",
    label: "Layered Gradient",
    description: "Text over gradient overlay on image",
    layoutMode: "NONE",
    primaryAlignment: "MIN",
    counterAlignment: "CENTER",
    spacingStrategy: "balanced"
  },
  "hero-first": {
    id: "hero-first",
    label: "Hero First",
    description: "Large hero image at top, content below",
    layoutMode: "VERTICAL",
    primaryAlignment: "MIN",
    counterAlignment: "CENTER",
    spacingStrategy: "balanced"
  },
  "text-first": {
    id: "text-first",
    label: "Text First",
    description: "Title and text at top, supporting image below",
    layoutMode: "VERTICAL",
    primaryAlignment: "MIN",
    counterAlignment: "CENTER",
    spacingStrategy: "balanced"
  },
  "compact-vertical": {
    id: "compact-vertical",
    label: "Compact Vertical",
    description: "Tight vertical layout optimized for small thumbnails",
    layoutMode: "VERTICAL",
    primaryAlignment: "CENTER",
    counterAlignment: "CENTER",
    spacingStrategy: "tight"
  },
  "banner-spread": {
    id: "banner-spread",
    label: "Banner Spread",
    description: "Wide horizontal distribution for banner formats",
    layoutMode: "HORIZONTAL",
    primaryAlignment: "SPACE_BETWEEN",
    counterAlignment: "CENTER",
    spacingStrategy: "generous"
  },
  "preserve-layout": {
    id: "preserve-layout",
    label: "Preserve Layout",
    description: "Maintain original positioning, apply scaling only",
    layoutMode: "NONE",
    primaryAlignment: "MIN",
    counterAlignment: "MIN",
    spacingStrategy: "balanced"
  }
};

/**
 * Pattern affinity matrix: preferred patterns for each target format.
 * Listed in order of preference (first = most preferred).
 */
export const PATTERN_AFFINITY: Record<string, readonly LayoutPatternId[]> = {
  "figma-cover": ["layered-hero", "split-left", "horizontal-stack", "banner-spread"],
  "figma-gallery": ["layered-hero", "split-left", "horizontal-stack", "centered-stack"],
  "figma-thumbnail": ["compact-vertical", "centered-stack", "preserve-layout", "layered-hero"],
  "web-hero": ["banner-spread", "split-left", "split-right", "layered-gradient"],
  "social-carousel": ["centered-stack", "layered-hero", "text-first", "hero-first"],
  "youtube-cover": ["layered-hero", "banner-spread", "centered-stack", "split-left"],
  "tiktok-vertical": ["centered-stack", "vertical-stack", "hero-first", "text-first"],
  "gumroad-cover": ["split-left", "layered-hero", "horizontal-stack", "banner-spread"],
  "gumroad-thumbnail": ["centered-stack", "compact-vertical", "hero-first", "layered-hero"]
};

/**
 * Get the layout mode for a given pattern ID.
 */
export function getPatternLayoutMode(patternId: LayoutPatternId): "HORIZONTAL" | "VERTICAL" | "NONE" {
  return LAYOUT_PATTERNS[patternId]?.layoutMode ?? "NONE";
}

/**
 * Check if a pattern is in the preferred list for a target.
 */
export function isPatternPreferredForTarget(patternId: LayoutPatternId, targetId: string): boolean {
  const preferred = PATTERN_AFFINITY[targetId];
  return preferred?.includes(patternId) ?? false;
}

/**
 * Get the preference rank (0 = most preferred) for a pattern on a target.
 * Returns -1 if pattern is not in the preferred list.
 */
export function getPatternPreferenceRank(patternId: LayoutPatternId, targetId: string): number {
  const preferred = PATTERN_AFFINITY[targetId];
  if (!preferred) return -1;
  return preferred.indexOf(patternId);
}
