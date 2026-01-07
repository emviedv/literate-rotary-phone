
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
  DISTRIBUTION_SPARSE: 0.40,
  DISTRIBUTION_MODERATE: 0.30,
  DISTRIBUTION_DENSE: 0.20,
  
  VERTICAL_GAP_SOFT_CAP: 3, // Multiplier of base spacing
  VERTICAL_GAP_HARD_CAP: 12,
};
