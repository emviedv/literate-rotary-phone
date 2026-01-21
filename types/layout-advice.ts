export interface LayoutPatternOption {
  readonly id: string;
  readonly label: string;
  readonly description: string;
  readonly score?: number;
}

/**
 * Feasibility analysis for a transformation.
 * AI calculates whether the source can reasonably transform to the target.
 */
export interface TransformationFeasibility {
  /** Whether the transformation can be achieved with acceptable results */
  readonly achievable: boolean;
  /** Whether the transformation requires restructuring (hiding elements, changing arrangement) */
  readonly requiresRestructure: boolean;
  /** Predicted percentage of safe area that content will fill (0-1) */
  readonly predictedFill: number;
  /** Human-readable explanation of what uniform scaling would produce */
  readonly uniformScaleResult?: string;
}

/**
 * Restructuring plan when transformation requires modifying content.
 * Specifies what to keep, drop, and how to arrange remaining elements.
 */
export interface RestructurePlan {
  /** Node IDs/names in order of importance (highest first) */
  readonly contentPriority: readonly string[];
  /** Node IDs/names to hide (won't fit in target dimensions) */
  readonly drop?: readonly string[];
  /** Node IDs/names that must always be kept */
  readonly keepRequired: readonly string[];
  /** How to arrange the remaining elements */
  readonly arrangement?: "horizontal" | "vertical" | "stacked";
  /** Text treatment for extreme horizontal targets */
  readonly textTreatment?: "single-line" | "wrap" | "truncate";
}

// ============================================================================
// Per-Node Positioning Schema
// ============================================================================

/**
 * Anchor point within the target frame.
 * Specifies where the node should be positioned.
 */
export type AnchorRegion =
  | "top-left" | "top-center" | "top-right"
  | "center-left" | "center" | "center-right"
  | "bottom-left" | "bottom-center" | "bottom-right"
  | "fill";

/**
 * How the node should respond to frame/container resizing.
 */
export interface ConstraintBehavior {
  /** Horizontal constraint */
  readonly horizontal: "left" | "right" | "center" | "stretch" | "scale";
  /** Vertical constraint */
  readonly vertical: "top" | "bottom" | "center" | "stretch" | "scale";
}

/**
 * Offset from frame edges or safe area boundaries.
 * Values are in pixels relative to the target frame dimensions.
 */
export interface EdgeOffset {
  /** Offset from left edge (or safe area left if useSafeArea) */
  readonly left?: number;
  /** Offset from right edge (or safe area right if useSafeArea) */
  readonly right?: number;
  /** Offset from top edge (or safe area top if useSafeArea) */
  readonly top?: number;
  /** Offset from bottom edge (or safe area bottom if useSafeArea) */
  readonly bottom?: number;
  /** If true, offsets are relative to safe area, not frame edge */
  readonly fromSafeArea?: boolean;
}

/**
 * Sizing specification for a node.
 */
export interface SizeSpec {
  /** Sizing behavior */
  readonly mode: "auto" | "fixed" | "fill" | "hug" | "scale-proportional";
  /** Explicit width in pixels (when mode is "fixed") */
  readonly width?: number;
  /** Explicit height in pixels (when mode is "fixed") */
  readonly height?: number;
  /** Minimum width constraint */
  readonly minWidth?: number;
  /** Maximum width constraint */
  readonly maxWidth?: number;
  /** Minimum height constraint */
  readonly minHeight?: number;
  /** Maximum height constraint */
  readonly maxHeight?: number;
  /** Scale factor relative to source (0-1, where 1 = same size as source) */
  readonly scaleFactor?: number;
}

/**
 * Text-specific positioning and treatment options.
 */
export interface TextDirective {
  /** Maximum number of lines before truncation */
  readonly maxLines?: number;
  /** Maximum character count before truncation */
  readonly maxChars?: number;
  /** How to truncate if content exceeds limits */
  readonly truncation?: "ellipsis" | "clip" | "fade";
  /** Minimum font size in pixels (will not scale below this) */
  readonly minFontSize?: number;
  /** Target font size in pixels for this target format */
  readonly targetFontSize?: number;
  /** Line height multiplier */
  readonly lineHeight?: number;
  /** Text alignment override */
  readonly textAlign?: "left" | "center" | "right" | "justify";
  /** Suggested shorter text if original won't fit */
  readonly alternateText?: string;
}

/**
 * Image-specific positioning and cropping options.
 */
export interface ImageDirective {
  /** Focal point for cropping (0-1 normalized coordinates within the image) */
  readonly cropFocus?: { readonly x: number; readonly y: number };
  /** How to handle aspect ratio mismatch */
  readonly fit: "cover" | "contain" | "fill" | "none";
  /** Whether to allow bleeding beyond frame bounds */
  readonly allowBleed?: boolean;
  /** Edge to anchor bleed images to */
  readonly bleedAnchor?: "left" | "right" | "top" | "bottom";
}

/**
 * Alignment within auto-layout container.
 */
export interface ContainerAlignment {
  /** Alignment along primary axis */
  readonly primary?: "start" | "center" | "end" | "space-between" | "space-around";
  /** Alignment along counter axis */
  readonly counter?: "start" | "center" | "end" | "stretch" | "baseline";
  /** Layout grow factor (0 = don't grow, 1 = grow to fill) */
  readonly grow?: number;
}

/**
 * Spacing from adjacent elements.
 */
export interface SpacingSpec {
  /** Gap before this element (in direction of layout flow) */
  readonly before?: number;
  /** Gap after this element */
  readonly after?: number;
  /** Padding inside this element (if it's a container) */
  readonly padding?: {
    readonly top?: number;
    readonly right?: number;
    readonly bottom?: number;
    readonly left?: number;
  };
}

/**
 * Node-specific warning for this target transformation.
 */
export interface NodeWarning {
  readonly code: string;
  readonly message: string;
  readonly severity: "info" | "warn" | "error";
}

/**
 * Comprehensive positioning guidance for a specific element.
 * This is the enhanced schema that provides SPECIFIC direction for EACH node.
 */
export interface ElementPositioning {
  // === VISIBILITY & PRIORITY ===

  /** Whether this node should be visible for this target (default: true) */
  readonly visible?: boolean;
  /** Priority for space allocation (1 = highest, lower numbers get space first) */
  readonly priority?: number;

  // === POSITION & ANCHOR ===

  /** Target region/anchor point within the frame */
  readonly anchor: AnchorRegion;
  /** Constraint behavior for responsive resizing */
  readonly constraints?: ConstraintBehavior;
  /** Explicit offset from edges or safe area */
  readonly offset?: EdgeOffset;

  // === SIZING ===

  /** Sizing specification */
  readonly size?: SizeSpec;

  // === CONTAINER BEHAVIOR ===

  /** Alignment within parent auto-layout container */
  readonly containerAlignment?: ContainerAlignment;
  /** Spacing relative to adjacent elements */
  readonly spacing?: SpacingSpec;

  // === TYPE-SPECIFIC DIRECTIVES ===

  /** Text-specific options (only for TEXT nodes) */
  readonly text?: TextDirective;
  /** Image-specific options (only for nodes with IMAGE fills) */
  readonly image?: ImageDirective;

  // === NODE-SPECIFIC WARNINGS ===

  /** Warnings specific to this node for this target */
  readonly warnings?: readonly NodeWarning[];

  // === RATIONALE ===

  /** Brief explanation of why this positioning was chosen */
  readonly rationale?: string;
}

/**
 * Legacy positioning interface for backwards compatibility.
 * @deprecated Use ElementPositioning with full anchor/size/text/image fields
 */
export interface LegacyElementPositioning {
  /** Target region within the frame */
  readonly region: "left" | "center" | "right" | "top" | "bottom" | "fill";
  /** Sizing behavior */
  readonly size?: "auto" | "fixed" | "fill";
  /** Maximum lines for text elements */
  readonly maxLines?: number;
}

/**
 * Warning emitted by AI when transformation has issues.
 */
export interface LayoutWarning {
  readonly code: string;
  readonly message: string;
  readonly severity: "info" | "warn" | "error";
}

/**
 * Map of node IDs to their positioning directives.
 * EVERY visible node in the source frame should have an entry.
 */
export type PositioningMap = Readonly<Record<string, ElementPositioning>>;

export interface LayoutAdviceEntry {
  readonly targetId: string;
  readonly selectedId?: string;
  readonly suggestedLayoutMode?: "HORIZONTAL" | "VERTICAL" | "NONE";
  readonly backgroundNodeId?: string;
  readonly options: readonly LayoutPatternOption[];
  /** Human-readable rationale for the recommendation */
  readonly description?: string;

  // === TRANSFORMATION INTELLIGENCE ===

  /** Feasibility analysis: can this transformation succeed? */
  readonly feasibility?: TransformationFeasibility;
  /** Restructuring plan: what to drop/keep/arrange */
  readonly restructure?: RestructurePlan;

  // === PER-NODE POSITIONING ===

  /**
   * Per-element positioning guidance.
   * AI responses SHOULD include an entry for EVERY node from the source frame.
   * Each entry specifies exactly how that node should be positioned,
   * sized, and treated for this specific target format.
   *
   * Note: Optional for backwards compatibility, but AI prompt requires it.
   */
  readonly positioning?: PositioningMap;

  /** Explicit warnings about this transformation */
  readonly warnings?: readonly LayoutWarning[];

  /**
   * Overrides for the container's layout properties.
   * Allows the AI to explicitly control alignment and spacing of the root frame.
   */
  readonly containerOverrides?: {
    readonly itemSpacing?: number;
    readonly padding?: {
      readonly top?: number;
      readonly right?: number;
      readonly bottom?: number;
      readonly left?: number;
    };
    readonly primaryAxisAlignItems?: "MIN" | "CENTER" | "MAX" | "SPACE_BETWEEN";
    readonly counterAxisAlignItems?: "MIN" | "CENTER" | "MAX" | "BASELINE";
  };
}

export interface LayoutAdvice {
  readonly entries: readonly LayoutAdviceEntry[];
}

// ============================================================================
// Utility Types & Helpers
// ============================================================================

/**
 * Type guard to check if positioning uses the legacy schema.
 */
export function isLegacyPositioning(
  pos: ElementPositioning | LegacyElementPositioning
): pos is LegacyElementPositioning {
  return "region" in pos && !("anchor" in pos);
}

/**
 * Convert legacy positioning to new schema.
 */
export function convertLegacyPositioning(
  legacy: LegacyElementPositioning
): ElementPositioning {
  const regionToAnchor: Record<string, AnchorRegion> = {
    "left": "center-left",
    "center": "center",
    "right": "center-right",
    "top": "top-center",
    "bottom": "bottom-center",
    "fill": "fill"
  };

  return {
    anchor: regionToAnchor[legacy.region] ?? "center",
    size: legacy.size ? {
      mode: legacy.size === "fill" ? "fill" : legacy.size === "fixed" ? "fixed" : "auto"
    } : undefined,
    text: legacy.maxLines ? { maxLines: legacy.maxLines } : undefined
  };
}

/**
 * Validate that positioning map covers all expected nodes.
 */
export function validatePositioningCoverage(
  positioning: PositioningMap,
  expectedNodeIds: readonly string[]
): { valid: boolean; missing: string[]; extra: string[] } {
  const positionedIds = new Set(Object.keys(positioning));
  const expectedIds = new Set(expectedNodeIds);

  const missing = expectedNodeIds.filter(id => !positionedIds.has(id));
  const extra = Object.keys(positioning).filter(id => !expectedIds.has(id));

  return {
    valid: missing.length === 0,
    missing,
    extra
  };
}
