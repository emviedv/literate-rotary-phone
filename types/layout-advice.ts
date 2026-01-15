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

/**
 * Positioning guidance for a specific element.
 */
export interface ElementPositioning {
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

export interface LayoutAdviceEntry {
  readonly targetId: string;
  readonly selectedId?: string;
  readonly suggestedLayoutMode?: "HORIZONTAL" | "VERTICAL" | "NONE";
  readonly backgroundNodeId?: string;
  readonly options: readonly LayoutPatternOption[];
  /** Human-readable rationale for the recommendation */
  readonly description?: string;

  // === NEW FIELDS FOR TRANSFORMATION INTELLIGENCE ===

  /** Feasibility analysis: can this transformation succeed? */
  readonly feasibility?: TransformationFeasibility;
  /** Restructuring plan: what to drop/keep/arrange */
  readonly restructure?: RestructurePlan;
  /** Per-element positioning guidance */
  readonly positioning?: Readonly<Record<string, ElementPositioning>>;
  /** Explicit warnings about this transformation */
  readonly warnings?: readonly LayoutWarning[];
}

export interface LayoutAdvice {
  readonly entries: readonly LayoutAdviceEntry[];
}
