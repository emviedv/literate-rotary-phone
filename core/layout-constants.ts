
export const ASPECT_RATIOS = {
  // Layout Profile Classifications
  VERTICAL_VIDEO: 0.6,    // ~9:16 (0.5625)
  EXTREME_VERTICAL: 0.57, 
  MODERATE_VERTICAL: 0.75, // ~3:4
  SQUARE_MIN: 0.8,
  SQUARE_MAX: 1.2,
  MODERATE_HORIZONTAL: 1.6, // ~16:10
  EXTREME_HORIZONTAL: 2.5, // ~21:9
  
  // Edge Case Trigger Thresholds
  STRETCH_VERTICAL: 0.5, // Ultra tall, triggers edge element resizing
  STRETCH_HORIZONTAL: 2.0, // Ultra wide, triggers edge element resizing
  STRETCH_HORIZONTAL_EXTREME: 2.5,
};

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
