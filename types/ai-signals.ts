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
  | "PATTERN_MISMATCH";           // Suggested pattern doesn't fit content

export interface AiQaSignal {
  readonly code: AiQaCode;
  readonly severity: "info" | "warn" | "error";
  readonly message?: string;
  readonly confidence?: number;
}

export interface AiSignals {
  readonly roles: readonly AiRoleEvidence[];
  readonly focalPoints: readonly AiFocalPoint[];
  readonly qa: readonly AiQaSignal[];
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
