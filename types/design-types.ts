/**
 * Types for the "Design for TikTok" AI-driven design feature.
 *
 * This feature uses a three-stage iterative AI process:
 * 1. Vision Analysis & Planning - AI sees the frame and creates a design plan
 * 2. Detailed Specification - AI outputs node-by-node positioning specs
 * 3. Execution & Evaluation - Apply changes and optionally verify visually
 */

// ============================================================================
// Stage 1: Design Plan (Vision Analysis Output)
// ============================================================================

/**
 * Layout zones define vertical regions within the TikTok frame.
 * Values are percentages (0-100) from the top of the frame.
 */
export interface LayoutZone {
  readonly top: number;
  readonly bottom: number;
}

/**
 * Deep design analysis capturing the AI's understanding of the source design.
 * This must be populated BEFORE making any transformation decisions.
 */
export interface DesignAnalysis {
  /** Primary focal point description */
  readonly visualFocal: string;
  /** How eye moves through design */
  readonly compositionalFlow: string;
  /** Grid, stack, hierarchy explanation */
  readonly layoutLogic: string;
  /** Type system analysis */
  readonly typographyHierarchy: string;
  /** What each image/visual serves */
  readonly imageRoles: string;
  /** Color relationships */
  readonly colorHarmony: string;
  /** Message/purpose of the design */
  readonly designIntent: string;
  /** Must-preserve dependencies (e.g., "team grid members must stay together") */
  readonly criticalRelationships: readonly string[];
  /** Elements that form semantic units that can't be split */
  readonly completeThoughts: readonly string[];
}

/**
 * Design plan output from Stage 1 vision analysis.
 * High-level strategy for transforming the source frame to TikTok format.
 */
export interface DesignPlan {
  /** High-level strategy description (e.g., "Stack vertically with hero at top") */
  readonly designStrategy: string;
  /** Reasoning behind the strategy choice */
  readonly reasoning: string;
  /** Deep understanding of the source design - REQUIRED before transformation */
  readonly designAnalysis?: DesignAnalysis;
  /** Element categorization for the transformation */
  readonly elements: {
    /** Node names/IDs to keep visible and position prominently */
    readonly keep: readonly string[];
    /** Node names/IDs to hide (won't fit or not suitable for vertical) */
    readonly hide: readonly string[];
    /** Node names/IDs to emphasize (scale up, better positioning) */
    readonly emphasize: readonly string[];
  };
  /** Semantic layout zones for content placement */
  readonly layoutZones: {
    /** Hero/attention zone - upper portion for thumb-stopping content */
    readonly hero?: LayoutZone;
    /** Main content zone - middle area for core message */
    readonly content?: LayoutZone;
    /** Branding zone - typically lower-middle area for logos/CTAs */
    readonly branding?: LayoutZone;
    /** Safe zone boundaries - avoiding TikTok UI overlays */
    readonly safeArea?: LayoutZone;
  };
  /** Detected faces or subjects that need protection */
  readonly focalPoints?: readonly {
    readonly nodeId: string;
    readonly nodeName: string;
    /** Normalized position within source frame (0-1) */
    readonly position: { readonly x: number; readonly y: number };
    /** Importance level for positioning priority */
    readonly importance: "critical" | "high" | "medium" | "low";
  }[];
}

// ============================================================================
// Stage 2: Node Specifications (Detailed Positioning Output)
// ============================================================================

/**
 * Positioning specification for a single node.
 * AI outputs one of these for each node in the design.
 */
export interface NodeSpec {
  /** Figma node ID for matching */
  readonly nodeId: string;
  /** Human-readable node name for debugging */
  readonly nodeName: string;
  /** Whether this node should be visible in the output */
  readonly visible: boolean;
  /** Explicit position in the target frame (if visible) */
  readonly position?: {
    readonly x: number;
    readonly y: number;
  };
  /** Explicit size override (if visible) */
  readonly size?: {
    readonly width: number;
    readonly height: number;
  };
  /** Stack order (higher = in front) */
  readonly zIndex?: number;
  /** For text nodes: whether to truncate content */
  readonly textTruncate?: boolean;
  /** For text nodes: maximum lines */
  readonly maxLines?: number;
  /** Scaling factor relative to proportional scaling (1.0 = normal) */
  readonly scaleFactor?: number;
  /** Brief rationale for this node's treatment */
  readonly rationale?: string;
}

/**
 * Complete design specifications for applying to the variant.
 * Output from Stage 2, combines plan with node-level details.
 */
export interface DesignSpecs {
  /** The high-level plan from Stage 1 */
  readonly plan: DesignPlan;
  /** Node-by-node positioning specifications */
  readonly nodes: readonly NodeSpec[];
  /** Overall confidence in the design (0-1) */
  readonly confidence?: number;
  /** Any warnings about the transformation */
  readonly warnings?: readonly string[];
}

// ============================================================================
// Stage 3: Evaluation Result (Optional Verification Output)
// ============================================================================

/**
 * Result from Stage 3 visual evaluation.
 * AI re-analyzes the generated variant to catch issues.
 */
export interface DesignEvaluation {
  /** Whether the design passes quality checks */
  readonly passed: boolean;
  /** Issues detected that need correction */
  readonly issues?: readonly {
    readonly type: "overlap" | "overflow" | "visibility" | "safe-area" | "composition";
    readonly description: string;
    readonly affectedNodes?: readonly string[];
    readonly suggestedFix?: string;
  }[];
  /** Adjustments to apply if issues found */
  readonly adjustments?: readonly NodeSpec[];
  /** Confidence in the evaluation (0-1) */
  readonly confidence?: number;
}

// ============================================================================
// TikTok-Specific Constants
// ============================================================================

/**
 * TikTok platform constraints.
 * These define safe areas and dimensions for optimal content display.
 */
export const TIKTOK_CONSTRAINTS = {
  /** Target dimensions */
  WIDTH: 1080,
  HEIGHT: 1920,
  /** Bottom danger zone - TikTok UI overlays (percentage from bottom) */
  BOTTOM_DANGER_ZONE: 0.35,
  /** Top caution zone - status bar, close button (percentage from top) */
  TOP_CAUTION_ZONE: 0.15,
  /** Safe content area after accounting for UI overlays */
  SAFE_AREA: {
    TOP: 0.15,      // Content should generally be below 15%
    BOTTOM: 0.65,   // Content should generally be above 35% from bottom
  },
  /** Minimum text size for legibility at TikTok resolution */
  MIN_TEXT_SIZE: 24,
  /** Recommended hero zone for thumb-stopping content */
  HERO_ZONE: {
    TOP: 0.15,
    BOTTOM: 0.45,
  },
} as const;

// ============================================================================
// Orchestration Types
// ============================================================================

/**
 * Result from a single stage of the design process.
 */
export interface StageResult<T> {
  readonly success: boolean;
  readonly data?: T;
  readonly error?: string;
  readonly durationMs?: number;
}

/**
 * Overall result from the design orchestration.
 */
export interface DesignResult {
  readonly success: boolean;
  /** The generated TikTok variant frame */
  readonly variant?: FrameNode;
  /** The page where the variant was placed */
  readonly page?: PageNode;
  /** Design specs used for generation */
  readonly specs?: DesignSpecs;
  /** Evaluation result if Stage 3 was run */
  readonly evaluation?: DesignEvaluation;
  /** Error message if failed */
  readonly error?: string;
  /** Total duration in milliseconds */
  readonly totalDurationMs?: number;
  /** Per-stage timing breakdown */
  readonly stageDurations?: {
    readonly stage1?: number;
    readonly stage2?: number;
    readonly stage3?: number;
    readonly execution?: number;
  };
}

/**
 * Status updates during the design process.
 */
export type DesignStatus =
  | { readonly stage: "analyzing"; readonly message: string }
  | { readonly stage: "planning"; readonly message: string }
  | { readonly stage: "specifying"; readonly message: string }
  | { readonly stage: "executing"; readonly message: string }
  | { readonly stage: "evaluating"; readonly message: string }
  | { readonly stage: "complete"; readonly message: string }
  | { readonly stage: "error"; readonly message: string };
