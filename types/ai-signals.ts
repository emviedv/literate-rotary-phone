export type AiRole =
  // Visual hierarchy
  | "logo"              // Brand mark, <10% area, corner positioned
  | "hero_image"        // Primary visual, >40% area, largest IMAGE
  | "hero_bleed"        // Product/device shot that intentionally extends beyond frame bounds
  | "secondary_image"   // Supporting visual
  | "background"        // Full-bleed background layer, >90% coverage

  // Typography hierarchy
  | "title"             // Primary headline, largest fontSize
  | "subtitle"          // Secondary headline, near title
  | "body"              // Paragraph text, fontSize 14-18px
  | "caption"           // Small text near images, <14px

  // Interactive/Action
  | "cta"               // Primary call-to-action button
  | "cta_secondary"     // Secondary action button (outline style)

  // Content elements
  | "badge"             // Overlay chip/tag
  | "icon"              // Small symbolic image, <64px
  | "list"              // Repeated similar elements
  | "feature_item"      // Single feature in a list
  | "testimonial"       // Quote/review block
  | "price"             // Pricing information (contains $)
  | "rating"            // Star ratings, scores

  // Structural
  | "divider"           // Visual separator
  | "container"         // Grouping frame
  | "decorative"        // Non-semantic shapes/gradients
  | "unknown";

export interface AiRoleEvidence {
  readonly nodeId: string;
  readonly role: AiRole;
  readonly confidence: number;
}

export interface AiFocalPoint {
  readonly nodeId: string;
  readonly x: number;
  readonly y: number;
  readonly confidence: number;
}

export type AiQaCode =
  // Existing signals
  | "LOW_CONTRAST"          // Text color too similar to background
  | "LOGO_TOO_SMALL"        // Logo <3% of frame area
  | "TEXT_OVERLAP"          // Text nodes with intersecting bounds
  | "UNCERTAIN_ROLES"       // Ambiguous element classification
  | "SALIENCE_MISALIGNED"   // Focal point near edges
  | "SAFE_AREA_RISK"        // Important content within 5% of edges
  | "GENERIC"               // Generic/fallback signal
  | "EXCESSIVE_TEXT"        // Body text >200 chars
  | "MISSING_CTA"           // No clear call-to-action
  | "ASPECT_MISMATCH"       // Source poorly suited for target

  // Target-specific signals
  | "TEXT_TOO_SMALL_FOR_TARGET"   // fontSize below minimum for target after scaling
  | "CONTENT_DENSITY_MISMATCH"    // Too much/little content for target
  | "THUMBNAIL_LEGIBILITY"        // Text won't be readable at thumbnail size
  | "OVERLAY_CONFLICT"            // Content conflicts with platform UI (TikTok/YouTube)
  | "CTA_PLACEMENT_RISK"          // CTA in platform-obscured zone
  | "HIERARCHY_UNCLEAR"           // No clear visual hierarchy
  | "VERTICAL_OVERFLOW_RISK"      // Content may clip on vertical targets
  | "HORIZONTAL_OVERFLOW_RISK"    // Content may clip on wide targets
  | "PATTERN_MISMATCH"            // Suggested pattern doesn't fit content

  // Accessibility signals (8 new)
  | "COLOR_CONTRAST_INSUFFICIENT"  // Below WCAG AA contrast ratio (4.5:1 normal, 3:1 large)
  | "TEXT_TOO_SMALL_ACCESSIBLE"    // Below 12px accessibility threshold
  | "INSUFFICIENT_TOUCH_TARGETS"   // Interactive elements <44px (mobile accessibility)
  | "HEADING_HIERARCHY_BROKEN"     // H1→H3 skips or improper nesting order
  | "POOR_FOCUS_INDICATORS"        // Buttons/links lack visible focus states
  | "MOTION_SENSITIVITY_RISK"      // Rapid animations that may trigger vestibular disorders
  | "MISSING_ALT_EQUIVALENT"       // Images without descriptive text nearby
  | "POOR_READING_ORDER"           // Elements don't follow logical reading sequence

  // Design quality signals (6 new)
  | "TYPOGRAPHY_INCONSISTENCY"     // Mixed font families, weights, or conflicting scales
  | "COLOR_HARMONY_POOR"           // Clashing color combinations, poor palette coherence
  | "SPACING_INCONSISTENCY"        // Irregular padding, margins, or grid alignment
  | "VISUAL_WEIGHT_IMBALANCED"     // Poor focal hierarchy, competing visual elements
  | "BRAND_CONSISTENCY_WEAK"       // Inconsistent brand colors, logo usage, or style
  | "CONTENT_HIERARCHY_FLAT";      // No clear information hierarchy or visual flow

export interface AiQaSignal {
  readonly code: AiQaCode;
  readonly severity: "info" | "warn" | "error";
  readonly message?: string;
  readonly confidence?: number;
}

/**
 * Represents a detected face region in normalized 0-1 coordinates.
 * Used to create text exclusion zones during positioning.
 */
export interface AiFaceRegion {
  readonly nodeId: string;
  readonly x: number;        // Face center X (0-1 from frame left)
  readonly y: number;        // Face center Y (0-1 from frame top)
  readonly width: number;    // Face width as ratio of frame (0-1)
  readonly height: number;   // Face height as ratio of frame (0-1)
  readonly confidence: number;
}

export interface AiSignals {
  readonly roles: readonly AiRoleEvidence[];
  readonly focalPoints: readonly AiFocalPoint[];
  readonly qa: readonly AiQaSignal[];
  readonly faceRegions?: readonly AiFaceRegion[];
}

/**
 * Platform overlay zone where UI elements obscure content.
 */
export interface OverlayZone {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly description?: string;
}

/**
 * Target-specific thresholds for QA validation.
 */
export interface TargetQaThresholds {
  readonly targetId: string;
  readonly minFontSize: number;           // Minimum legible fontSize after scaling
  readonly maxTextLength: number;         // Maximum body text chars
  readonly minCtaSize: { readonly width: number; readonly height: number };
  readonly safeAreaCritical: boolean;     // Whether safe area is platform-enforced
  readonly overlayZones?: readonly OverlayZone[];
}

/**
 * Score for a single region in the placement grid.
 * Higher scores indicate better text placement viability.
 */
export interface RegionScore {
  readonly regionId: string;        // e.g., "top-left", "bottom-center"
  readonly baseScore: number;       // Aspect-ratio heuristic score (0-1)
  readonly faceAvoidance: number;   // Penalty from face overlap (0-1, subtracted)
  readonly focalAvoidance: number;  // Penalty from focal point proximity (0-1)
  readonly finalScore: number;      // Combined score after all factors
}

/**
 * Grid-based placement scoring for face-aware text positioning.
 */
export interface PlacementScoring {
  readonly gridDimensions: { readonly rows: number; readonly cols: number };
  readonly regions: readonly RegionScore[];
  readonly recommendedRegion: string;
}

/**
 * Enhanced layout structure analysis for improved frame understanding.
 */
export interface LayoutStructureAnalysis {
  // Grid & Layout Detection
  readonly gridSystem?: {
    readonly type: "12-column" | "flex" | "css-grid" | "manual";
    readonly columnCount?: number;
    readonly gutterWidth?: number;
    readonly alignment: "left" | "center" | "right" | "justified";
  };

  // Content Sectioning
  readonly sections: Array<{
    readonly nodeId: string;
    readonly role: "header" | "hero" | "features" | "testimonials" | "cta" | "footer" | "sidebar";
    readonly bounds: { readonly x: number; readonly y: number; readonly width: number; readonly height: number };
    readonly childCount: number;
    readonly visualWeight: number; // 0-1 based on size, position, contrast
  }>;

  // Typography Hierarchy
  readonly typographyScale: Array<{
    readonly fontSize: number;
    readonly fontWeight: number;
    readonly role: "display" | "h1" | "h2" | "h3" | "h4" | "body" | "caption" | "label";
    readonly instances: number;
    readonly consistency: number; // 0-1 how consistent usage is
  }>;

  // Spatial Relationships
  readonly proximityGroups: Array<{
    readonly nodeIds: readonly string[];
    readonly relationship: "text-image-pair" | "feature-trio" | "testimonial-block" | "cta-group" | "list-item";
    readonly confidence: number;
  }>;

  // Reading Flow Analysis
  readonly readingFlow?: {
    readonly primaryDirection: "left-to-right" | "top-to-bottom" | "center-out" | "z-pattern" | "f-pattern";
    readonly secondaryDirection?: "left-to-right" | "top-to-bottom";
    readonly visualAnchors: readonly string[]; // Node IDs of elements that anchor attention
  };
}

/**
 * Content relationship detected through spatial proximity analysis.
 */
export interface ContentRelationship {
  readonly type: "text-image-pair" | "feature-trio" | "testimonial-block" | "cta-group" | "list-item";
  readonly nodeIds: readonly string[];
  readonly primaryNode: string; // Most important node in the group
  readonly bounds: { readonly x: number; readonly y: number; readonly width: number; readonly height: number };
  readonly confidence: number;
  readonly visualWeight: number;
  readonly readingOrder: number; // 0-based order in natural reading flow
}

/**
 * Enhanced color palette and theme analysis.
 */
export interface ColorThemeAnalysis {
  readonly palette: Array<{
    readonly hex: string;
    readonly usage: "primary" | "secondary" | "accent" | "neutral" | "background";
    readonly frequency: number; // How often this color appears
    readonly nodeIds: string[]; // Where it's used
  }>;

  readonly harmony: {
    readonly type: "monochromatic" | "analogous" | "triadic" | "complementary" | "split-complementary" | "custom";
    readonly score: number; // 0-1, how harmonious the colors are
  };

  readonly contrast: {
    readonly textBackgroundPairs: Array<{
      readonly textNodeId: string;
      readonly textColor: string;
      readonly backgroundColor: string;
      readonly contrastRatio: number;
      readonly wcagLevel: "AAA" | "AA" | "fail";
    }>;
    readonly averageContrast: number;
  };

  readonly brand: {
    readonly hasConsistentBranding: boolean;
    readonly primaryBrandColor?: string;
    readonly secondaryBrandColor?: string;
    readonly brandColorUsage: "logo-only" | "accents" | "dominant" | "backgrounds";
  };
}

/**
 * Enhanced pattern detection with structural understanding.
 */
export interface EnhancedPatternDetection {
  // Current pattern system enhanced with structural understanding
  readonly detectedPatterns: Array<{
    readonly patternId: string; // LayoutPatternId
    readonly confidence: number;
    readonly evidence: {
      readonly structuralEvidence: string[]; // Grid alignment, spacing patterns
      readonly contentEvidence: string[]; // Text hierarchy, image placement
      readonly visualEvidence: string[]; // Color usage, visual weight distribution
    };
    readonly targetSuitability: Record<string, number>; // Per-target fit score
  }>;

  // New structural insights
  readonly layoutStructure: {
    readonly hasHeader: boolean;
    readonly hasFooter: boolean;
    readonly hasSidebar: boolean;
    readonly contentSections: number;
    readonly navigationElements: number;
    readonly interactiveElements: number;
  };
}

/**
 * Analysis depth metadata for enhanced frame summaries.
 */
export interface AnalysisDepth {
  readonly nodesCaptured: number;
  readonly totalNodes: number;
  readonly depthReached: number;
  readonly priorityScore: number;
}

/**
 * Enhanced AI signals with structural analysis capabilities.
 */
export interface EnhancedAiSignals extends AiSignals {
  readonly layoutStructure?: LayoutStructureAnalysis;
  readonly contentRelationships?: readonly ContentRelationship[];
  readonly colorTheme?: ColorThemeAnalysis;
  readonly enhancedPatterns?: EnhancedPatternDetection;
  readonly analysisDepth?: AnalysisDepth;
}
