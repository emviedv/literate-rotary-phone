/**
 * Proximity-Based Auto-Layout Grouping Types
 *
 * Type definitions for the proximity grouping system that automatically
 * detects visually related elements and wraps them in auto-layout containers.
 */

// ============================================================================
// Core Element Types
// ============================================================================

/**
 * Element in the proximity analysis with spatial information.
 */
export interface ProximityElement {
  /** Figma node reference */
  readonly node: SceneNode;
  /** Frame-relative bounding box for distance calculations */
  readonly bounds: Rectangle;
  /** Element's semantic role (from existing classification) */
  readonly role?: string;
  /** Whether this element is part of an atomic group */
  readonly isAtomicProtected: boolean;
  /** Parent container for boundary enforcement */
  readonly parentContainer?: SceneNode;
}

/**
 * Rectangle with position and size information.
 */
export interface Rectangle {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

// ============================================================================
// Distance and Clustering Types
// ============================================================================

/**
 * Edge-to-edge distance between two elements.
 */
export interface ElementDistance {
  /** First element */
  readonly element1: ProximityElement;
  /** Second element */
  readonly element2: ProximityElement;
  /** Minimum edge-to-edge distance in pixels */
  readonly distance: number;
  /** Direction of closest approach (horizontal/vertical) */
  readonly direction: 'horizontal' | 'vertical';
}

/**
 * Graph edge representing proximity relationship.
 */
export interface ProximityEdge {
  /** Source element */
  readonly from: ProximityElement;
  /** Target element */
  readonly to: ProximityElement;
  /** Distance in pixels (≤ threshold) */
  readonly distance: number;
}

/**
 * Connected component (proximity cluster) of elements.
 */
export interface ProximityCluster {
  /** Elements in this cluster */
  readonly elements: readonly ProximityElement[];
  /** Bounding box encompassing all elements */
  readonly bounds: Rectangle;
  /** Estimated optimal container direction */
  readonly recommendedDirection: AutoLayoutDirection;
  /** Confidence score for direction (0-1) */
  readonly directionConfidence: number;
}

// ============================================================================
// Direction Detection Types
// ============================================================================

/**
 * Auto-layout direction options.
 */
export type AutoLayoutDirection = 'horizontal' | 'vertical';

/**
 * Result of direction analysis for a cluster.
 */
export interface DirectionAnalysis {
  /** Recommended direction */
  readonly direction: AutoLayoutDirection;
  /** Confidence score (0-1) */
  readonly confidence: number;
  /** Breakdown of contributing factors */
  readonly factors: DirectionFactors;
}

/**
 * Factors contributing to direction decision.
 */
export interface DirectionFactors {
  /** Linear arrangement analysis result */
  readonly arrangement: {
    readonly direction: AutoLayoutDirection;
    readonly score: number;
    readonly reasoning: string;
  };
  /** Content flow analysis result */
  readonly flow: {
    readonly direction: AutoLayoutDirection;
    readonly score: number;
    readonly reasoning: string;
  };
  /** Aspect ratio analysis result */
  readonly aspect: {
    readonly direction: AutoLayoutDirection;
    readonly score: number;
    readonly reasoning: string;
  };
}

/**
 * Weighted heuristic for direction analysis.
 */
export interface DirectionHeuristic {
  /** The analysis result */
  readonly analysis: {
    readonly direction: AutoLayoutDirection;
    readonly score: number;
    readonly reasoning: string;
  };
  /** Weight of this heuristic (0-1) */
  readonly weight: number;
}

// ============================================================================
// Container Creation Types
// ============================================================================

/**
 * Configuration for creating an auto-layout container.
 */
export interface ContainerConfig {
  /** Direction for auto-layout */
  readonly direction: AutoLayoutDirection;
  /** Spacing between elements (default: 8) */
  readonly spacing?: number;
  /** Padding inside container (default: 0) */
  readonly padding?: number;
  /** Container name prefix */
  readonly namePrefix?: string;
}

/**
 * Result of creating a proximity group container.
 */
export interface GroupingResult {
  /** Whether grouping succeeded */
  readonly success: boolean;
  /** Created container node (if successful) */
  readonly container?: FrameNode;
  /** Elements that were grouped */
  readonly groupedElements: readonly ProximityElement[];
  /** Applied auto-layout direction */
  readonly direction?: AutoLayoutDirection;
  /** Error message if failed */
  readonly error?: string;
}

// ============================================================================
// Configuration and Options
// ============================================================================

/**
 * Configuration for proximity-based grouping.
 */
export interface ProximityGroupingOptions {
  /** Distance threshold for proximity (default: 50px) */
  readonly proximityThreshold: number;
  /** Minimum elements required for grouping (default: 2) */
  readonly minGroupSize: number;
  /** Maximum processing time before timeout (default: 5000ms) */
  readonly timeoutMs: number;
  /** Whether to respect container boundaries (default: true) */
  readonly respectContainerBoundaries: boolean;
  /** Whether to skip atomic-protected elements (default: true) */
  readonly respectAtomicProtection: boolean;
  /** Default spacing for created auto-layout containers (default: 8px) */
  readonly defaultSpacing: number;
  /** Whether to enable debug logging (default: false) */
  readonly enableDebugLogging: boolean;
}

/**
 * Default configuration values.
 */
export const DEFAULT_PROXIMITY_OPTIONS: ProximityGroupingOptions = {
  proximityThreshold: 50,
  minGroupSize: 2,
  timeoutMs: 5000,
  respectContainerBoundaries: true,
  respectAtomicProtection: true,
  defaultSpacing: 8,
  enableDebugLogging: false,
};

// ============================================================================
// Processing Result Types
// ============================================================================

/**
 * Overall result of proximity-based auto-layout processing.
 */
export interface ProximityProcessingResult {
  /** Whether the operation completed successfully */
  readonly success: boolean;
  /** Number of groups created */
  readonly groupsCreated: number;
  /** Total number of elements that were grouped */
  readonly elementsGrouped: number;
  /** Number of elements that were skipped (atomic, errors, etc.) */
  readonly elementsSkipped: number;
  /** Individual grouping results */
  readonly groupingResults: readonly GroupingResult[];
  /** Processing time in milliseconds */
  readonly processingTimeMs: number;
  /** Any errors encountered */
  readonly errors: readonly string[];
  /** Warnings (non-fatal issues) */
  readonly warnings: readonly string[];
}

// ============================================================================
// Validation and Error Types
// ============================================================================

/**
 * Error types that can occur during proximity processing.
 */
export type ProximityError =
  | 'TIMEOUT_EXCEEDED'
  | 'INVALID_FRAME'
  | 'NO_ELIGIBLE_ELEMENTS'
  | 'CONTAINER_CREATION_FAILED'
  | 'ATOMIC_CONFLICT'
  | 'BOUNDARY_VIOLATION'
  | 'UNKNOWN_ERROR';

/**
 * Validation result for proximity processing.
 */
export interface ValidationResult {
  /** Whether validation passed */
  readonly isValid: boolean;
  /** Error type if invalid */
  readonly error?: ProximityError;
  /** Detailed error message */
  readonly message?: string;
  /** Number of eligible elements found */
  readonly eligibleElements?: number;
}

// ============================================================================
// Debug and Analysis Types
// ============================================================================

/**
 * Debug information for proximity analysis.
 */
export interface ProximityDebugInfo {
  /** Total elements analyzed */
  readonly totalElements: number;
  /** Elements within proximity threshold */
  readonly proximityPairs: number;
  /** Clusters identified */
  readonly clustersFound: number;
  /** Elements in atomic groups (skipped) */
  readonly atomicElements: number;
  /** Container boundary violations */
  readonly boundaryViolations: number;
  /** Processing time breakdown */
  readonly timingMs: {
    readonly analysis: number;
    readonly clustering: number;
    readonly directionDetection: number;
    readonly containerCreation: number;
  };
}