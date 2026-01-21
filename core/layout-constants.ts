/**
 * UNIFIED ASPECT RATIO THRESHOLDS
 * Single source of truth for all aspect ratio comparisons.
 *
 * Comparison Guide:
 * - EXTREME_VERTICAL: Use `<` or `<=` depending on whether you want to include the boundary
 * - EXTREME_HORIZONTAL: Use `>` or `>=` depending on whether you want to include the boundary
 * - SQUARE range: Use `>= SQUARE_MIN && <= SQUARE_MAX`
 *
 * Aspect Ratio = width / height
 * - < 1.0 = portrait/vertical
 * - = 1.0 = square
 * - > 1.0 = landscape/horizontal
 */
export const ASPECT_RATIOS = {
  // === Vertical Tiers (portrait) ===
  // Use: aspectRatio < EXTREME_VERTICAL for TikTok-like ultra-tall formats
  EXTREME_VERTICAL: 0.57,      // ~9:16 (0.5625) - TikTok, Reels, Shorts

  // Use: aspectRatio < MODERATE_VERTICAL for standard portrait
  MODERATE_VERTICAL: 0.75,     // ~3:4 - Standard portrait, some thumbnails

  // === Square Zone ===
  // Use: aspectRatio >= SQUARE_MIN && aspectRatio <= SQUARE_MAX
  SQUARE_MIN: 0.8,             // Lower bound of "square-ish"
  SQUARE_MAX: 1.2,             // Upper bound of "square-ish"

  // === Horizontal Tiers (landscape) ===
  // Use: aspectRatio > MODERATE_HORIZONTAL for standard landscape
  MODERATE_HORIZONTAL: 1.6,    // ~16:10 - Standard widescreen

  // Use: aspectRatio > EXTREME_HORIZONTAL for ultra-wide banners
  EXTREME_HORIZONTAL: 2.5,     // ~5:2 - Wide banners, YouTube covers

  // === Edge Element Sizing Trigger ===
  // These determine when edge children need special handling (grow constraints)
  // Use: aspectRatio < EDGE_SIZING_VERTICAL || aspectRatio > EDGE_SIZING_HORIZONTAL
  EDGE_SIZING_VERTICAL: 0.5,   // Ultra-tall: first/last children need grow=0
  EDGE_SIZING_HORIZONTAL: 2.0, // Ultra-wide: first/last children need grow=0
} as const;

/**
 * UNIFIED DETECTION THRESHOLDS
 * Single source of truth for all area-based detection (background, etc.)
 */
export const DETECTION_THRESHOLDS = {
  // Background detection: node covers this percentage of frame area
  BACKGROUND_AREA_COVERAGE: 0.90,  // 90% - used by isBackgroundLike()
} as const;

export const MIN_LEGIBLE_SIZES = {
  THUMBNAIL: 9,
  STANDARD: 11,
  LARGE_DISPLAY: 14,
};

export const RESOLUTION_THRESHOLDS = {
  THUMBNAIL_DIMENSION: 600,
  LARGE_DISPLAY_DIMENSION: 2000,
};

export const SPACING_CONSTANTS = {
  // Interior gap distribution ratios (how much extra space goes to gaps vs edges)
  DISTRIBUTION_SPARSE: 0.55,    // 1-2 children: 55% to gaps (was 40%)
  DISTRIBUTION_MODERATE: 0.45,  // 3-5 children: 45% to gaps (was 30%)
  DISTRIBUTION_DENSE: 0.35,     // 6+ children: 35% to gaps (was 20%)

  // Vertical gap caps (multiplier of base spacing)
  VERTICAL_GAP_SOFT_CAP: 5,     // Allow up to 5x base spacing (was 3)
  VERTICAL_GAP_HARD_CAP: 15,    // Allow up to 15x for extreme cases (was 12)
};

export const MIN_ELEMENT_SIZES = {
  LOGO: { width: 24, height: 24 },      // Minimum readable logo
  ICON: { width: 16, height: 16 },      // Minimum recognizable icon
  BADGE: { width: 20, height: 16 },     // Minimum readable badge
  BUTTON: { width: 40, height: 24 },    // Minimum tappable button
} as const;

export const ELEMENT_ROLE_PATTERNS = {
  LOGO: /logo|brand|mark/i,
  ICON: /icon|symbol/i,
  BADGE: /badge|chip|tag|pill/i,
  BUTTON: /button|btn|cta/i,
} as const;
