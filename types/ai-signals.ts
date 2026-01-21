/**
 * Universal 7-role taxonomy for compositional layout analysis.
 * Designed to handle diverse content: people, mockups, charts, lists, and mixed media.
 */
export type AiRole =
  // Primary focal element
  | "subject"           // The primary focal point: person, device mockup, chart/graph, large product image

  // Branding
  | "branding"          // Logos and brand marks

  // Typography
  | "typography"        // Headings, body text, captions - all text content

  // Interactive
  | "action"            // Buttons (CTAs) and interactive elements

  // Structural
  | "container"         // Background boxes, cards, shapes that group other elements
  | "component"         // Complex groups: testimonial stars, avatar grids, chart legends

  // Background
  | "environment"       // Background colors, gradients, full-bleed imagery

  // Catch-all
  | "unknown";          // Genuinely unclassifiable nodes

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

/**
 * Consolidated QA codes for downstream processing.
 * Maps 28 granular AI-generated codes to 15 distinct actionable signals.
 *
 * Consolidation Map:
 * - CONTRAST_ISSUE ← LOW_CONTRAST, COLOR_CONTRAST_INSUFFICIENT, COLOR_HARMONY_POOR
 * - TEXT_SIZE_ISSUE ← TEXT_TOO_SMALL_FOR_TARGET, TEXT_TOO_SMALL_ACCESSIBLE, THUMBNAIL_LEGIBILITY
 * - HIERARCHY_ISSUE ← HIERARCHY_UNCLEAR, CONTENT_HIERARCHY_FLAT, HEADING_HIERARCHY_BROKEN, POOR_READING_ORDER
 * - OVERFLOW_RISK ← VERTICAL_OVERFLOW_RISK, HORIZONTAL_OVERFLOW_RISK
 */
export type ConsolidatedQaCode =
  // Consolidated signals (4 new)
  | "CONTRAST_ISSUE"      // All contrast and color harmony issues
  | "TEXT_SIZE_ISSUE"     // All text sizing and legibility issues
  | "HIERARCHY_ISSUE"     // All hierarchy and reading order issues
  | "OVERFLOW_RISK"       // Both vertical and horizontal overflow

  // Preserved distinct signals (11)
  | "LOGO_TOO_SMALL"
  | "TEXT_OVERLAP"
  | "UNCERTAIN_ROLES"
  | "SALIENCE_MISALIGNED"
  | "SAFE_AREA_RISK"
  | "GENERIC"
  | "EXCESSIVE_TEXT"
  | "MISSING_CTA"
  | "ASPECT_MISMATCH"
  | "CONTENT_DENSITY_MISMATCH"
  | "OVERLAY_CONFLICT"
  | "CTA_PLACEMENT_RISK"
  | "PATTERN_MISMATCH"
  | "INSUFFICIENT_TOUCH_TARGETS"
  | "POOR_FOCUS_INDICATORS"
  | "MOTION_SENSITIVITY_RISK"
  | "MISSING_ALT_EQUIVALENT"
  | "TYPOGRAPHY_INCONSISTENCY"
  | "SPACING_INCONSISTENCY"
  | "VISUAL_WEIGHT_IMBALANCED"
  | "BRAND_CONSISTENCY_WEAK";

export interface AiQaSignal {
  // After sanitization, code may be the original AiQaCode or a ConsolidatedQaCode
  readonly code: AiQaCode | ConsolidatedQaCode;
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

/**
 * Collision zone representing a rectangular area where typography should not be placed.
 * Used by the Binary Rule spatial geometry system (VERSION 8).
 */
export interface AiCollisionZone {
  readonly x: number;        // Left edge (0-1 normalized)
  readonly y: number;        // Top edge (0-1 normalized)
  readonly w: number;        // Width (0-1 normalized)
  readonly h: number;        // Height (0-1 normalized)
}

/**
 * Subject occupancy zone for the Repulsion Law (VERSION 9+).
 * Indicates which horizontal zone the subject occupies.
 */
export type AiSubjectOccupancy = "left" | "right" | "center";

/**
 * Compositional intent classification for the frame.
 */
export type AiIntent = "Subject-Dominant" | "Information-Dominant" | "Grid-Repeat";

export interface AiSignals {
  /** Per-node role classifications with confidence scores */
  readonly roles: readonly AiRoleEvidence[];
  /** Primary focal points for cropping/composition (optional in VERSION 8+) */
  readonly focalPoints?: readonly AiFocalPoint[];
  /** Quality assurance warnings (optional in VERSION 8+) */
  readonly qa?: readonly AiQaSignal[];
  /** Detected face regions for text exclusion zones */
  readonly faceRegions?: readonly AiFaceRegion[];
  /** Compositional intent classification (VERSION 8+) */
  readonly intent?: AiIntent;
  /** Collision zones where typography is forbidden (VERSION 8) */
  readonly collisionZones?: readonly AiCollisionZone[];
  /** Subject occupancy zone for Repulsion Law (VERSION 9+) */
  readonly subjectOccupancy?: AiSubjectOccupancy;
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
 *
 * NOTE: Several fields are generated but never consumed in the pipeline.
 * These are marked @deprecated and may be removed in future versions.
 */
export interface EnhancedAiSignals extends AiSignals {
  /**
   * @deprecated Generated but never consumed in the layout pipeline.
   * Retained for potential future use. May be removed to reduce AI token usage.
   */
  readonly layoutStructure?: LayoutStructureAnalysis;

  /**
   * @deprecated Generated but never consumed in the layout pipeline.
   * Retained for potential future use. May be removed to reduce AI token usage.
   */
  readonly contentRelationships?: readonly ContentRelationship[];

  /**
   * @deprecated Generated but never consumed in the layout pipeline.
   * Retained for potential future use. May be removed to reduce AI token usage.
   */
  readonly colorTheme?: ColorThemeAnalysis;

  readonly enhancedPatterns?: EnhancedPatternDetection;
  readonly analysisDepth?: AnalysisDepth;
}
