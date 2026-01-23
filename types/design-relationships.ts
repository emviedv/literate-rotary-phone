/**
 * Universal Design Relationship Types
 *
 * Type definitions for the Relationship-Aware Layout System.
 * Supports detection and preservation of sophisticated design relationships
 * during TikTok transformation: spatial, visual, and compositional.
 */

// ============================================================================
// Core Geometric & Spatial Primitives
// ============================================================================

/** Frame-relative coordinate (0-1 normalized) */
export interface NormalizedPoint {
  readonly x: number; // 0 = left edge, 1 = right edge
  readonly y: number; // 0 = top edge, 1 = bottom edge
}

/** Bounding box in normalized coordinates */
export interface NormalizedBounds {
  readonly left: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
}

/** Vector direction with magnitude */
export interface FlowVector {
  readonly direction: number; // Angle in degrees (0 = east, 90 = south)
  readonly magnitude: number; // Relative strength (0-1)
  readonly from: NormalizedPoint;
  readonly to: NormalizedPoint;
}

// ============================================================================
// Spatial Relationships
// ============================================================================

/** Anchor pattern - element serves as compositional foundation */
export interface AnchorPattern {
  readonly type: 'anchor';
  readonly anchorElementId: string;
  readonly anchoredElements: readonly {
    readonly elementId: string;
    readonly relativePosition: NormalizedPoint; // Position relative to anchor
    readonly anchorStrength: number; // How strongly anchored (0-1)
  }[];
  readonly confidence: number;
}

/** Flow vectors - directional movement in composition */
export interface FlowPattern {
  readonly type: 'flow';
  readonly flowType: 'diagonal' | 'circular' | 'linear' | 'spiral';
  readonly vectors: readonly FlowVector[];
  readonly involvedElements: readonly string[];
  readonly confidence: number;
}

/** Proximity clusters - spatially connected groups */
export interface ProximityCluster {
  readonly type: 'proximity';
  readonly clusterId: string;
  readonly elementIds: readonly string[];
  readonly clusterBounds: NormalizedBounds;
  readonly clusterCohesion: number; // How tightly clustered (0-1)
  readonly confidence: number;
}

/** Alignment grids - invisible structural systems */
export interface AlignmentGrid {
  readonly type: 'alignment';
  readonly gridType: 'horizontal' | 'vertical' | 'radial' | 'grid';
  readonly alignmentLines: readonly {
    readonly position: number; // 0-1 normalized position
    readonly strength: number; // How many elements align (0-1)
    readonly elementIds: readonly string[];
  }[];
  readonly confidence: number;
}

/** Union of all spatial relationship patterns */
export type SpatialRelationship =
  | AnchorPattern
  | FlowPattern
  | ProximityCluster
  | AlignmentGrid;

// ============================================================================
// Visual Relationships
// ============================================================================

/** Element visual properties for analysis */
export interface ElementVisualProperties {
  readonly elementId: string;
  readonly bounds: NormalizedBounds;
  readonly area: number; // Relative area (0-1)
  readonly contrastRatio?: number; // Contrast with background
  readonly colorHue?: number; // HSL hue (0-360)
  readonly colorSaturation?: number; // HSL saturation (0-1)
  readonly colorLightness?: number; // HSL lightness (0-1)
  readonly fontSize?: number; // For text elements
  readonly fontWeight?: string; // For text elements
}

/** Layering hierarchy through depth analysis */
export interface LayeringHierarchy {
  readonly type: 'layering';
  readonly layers: readonly {
    readonly depth: number; // 0 = background, higher = foreground
    readonly elementIds: readonly string[];
  }[];
  readonly confidence: number;
}

/** Visual weight distribution analysis */
export interface VisualWeightDistribution {
  readonly type: 'weight';
  readonly weightMap: readonly {
    readonly elementId: string;
    readonly weight: number; // Relative visual importance (0-1)
    readonly weightFactors: readonly ('size' | 'contrast' | 'color' | 'position')[];
  }[];
  readonly totalBalance: NormalizedPoint; // Center of visual weight
  readonly confidence: number;
}

/** Contrast relationships between elements */
export interface ContrastRelationship {
  readonly type: 'contrast';
  readonly contrastPairs: readonly {
    readonly elementId1: string;
    readonly elementId2: string;
    readonly contrastType: 'color' | 'size' | 'weight' | 'texture';
    readonly contrastStrength: number; // How much they contrast (0-1)
  }[];
  readonly confidence: number;
}

/** Scale relationships - proportional sizing */
export interface ScaleRelationship {
  readonly type: 'scale';
  readonly scaleGroups: readonly {
    readonly elementIds: readonly string[];
    readonly scaleRatio: number; // Size ratio between largest and smallest
    readonly scaleType: 'golden' | 'fibonacci' | 'modular' | 'proportional';
  }[];
  readonly confidence: number;
}

/** Union of all visual relationship patterns */
export type VisualRelationship =
  | LayeringHierarchy
  | VisualWeightDistribution
  | ContrastRelationship
  | ScaleRelationship;

// ============================================================================
// Compositional Relationships
// ============================================================================

/** Balance analysis of the composition */
export interface BalanceAnalysis {
  readonly type: 'balance';
  readonly balanceType: 'symmetrical' | 'asymmetrical' | 'radial' | 'dynamic';
  readonly balancePoint: NormalizedPoint; // Fulcrum of composition
  readonly balanceElements: readonly {
    readonly elementId: string;
    readonly balanceContribution: number; // How much it affects balance (-1 to 1)
  }[];
  readonly confidence: number;
}

/** Tension points - areas of visual energy */
export interface TensionPoints {
  readonly type: 'tension';
  readonly tensionAreas: readonly {
    readonly center: NormalizedPoint;
    readonly radius: number; // Area of influence
    readonly tensionType: 'conflict' | 'energy' | 'focus' | 'stress';
    readonly involvedElements: readonly string[];
    readonly intensity: number; // Tension strength (0-1)
  }[];
  readonly confidence: number;
}

/** Breathing room patterns - negative space analysis */
export interface BreathingRoomPattern {
  readonly type: 'breathing';
  readonly spaceDistribution: readonly {
    readonly region: NormalizedBounds;
    readonly spaceType: 'buffer' | 'separator' | 'focus' | 'flow';
    readonly importance: number; // How critical this space is (0-1)
    readonly adjacentElements: readonly string[];
  }[];
  readonly confidence: number;
}

/** Edge relationships - interaction with frame boundaries */
export interface EdgeRelationships {
  readonly type: 'edge';
  readonly edgeInteractions: readonly {
    readonly elementId: string;
    readonly edges: readonly ('top' | 'right' | 'bottom' | 'left')[];
    readonly interactionType: 'bleed' | 'tension' | 'anchor' | 'bounce';
    readonly distance: number; // Normalized distance from edge (0-1)
  }[];
  readonly confidence: number;
}

/** Union of all compositional relationship patterns */
export type CompositionalRelationship =
  | BalanceAnalysis
  | TensionPoints
  | BreathingRoomPattern
  | EdgeRelationships;

// ============================================================================
// Complete Relationship Analysis
// ============================================================================

/** Complete relationship analysis for a frame */
export interface RelationshipAnalysis {
  readonly frameId: string;
  readonly analysisTimestamp: number;
  readonly spatialRelationships: readonly SpatialRelationship[];
  readonly visualRelationships: readonly VisualRelationship[];
  readonly compositionalRelationships: readonly CompositionalRelationship[];
  readonly elementProperties: readonly ElementVisualProperties[];
  readonly analysisMetrics: {
    readonly processingTimeMs: number;
    readonly elementCount: number;
    readonly relationshipCount: number;
    readonly averageConfidence: number;
  };
}

// ============================================================================
// AI Constraint Generation
// ============================================================================

/** Priority levels for relationship constraints */
export type ConstraintPriority = 'critical' | 'high' | 'medium' | 'low';

/** Geometric constraint for AI positioning */
export interface GeometricConstraint {
  readonly alignmentAxis?: 'horizontal' | 'vertical' | 'diagonal';
  readonly relativePositions?: readonly {
    readonly elementId: string;
    readonly position: NormalizedPoint;
  }[];
  readonly spacingRatios?: readonly number[];
  readonly flowDirection?: number; // Angle in degrees
  readonly scaleRatios?: readonly {
    readonly elementId: string;
    readonly scale: number;
  }[];
}

/** Single constraint derived from relationship analysis */
export interface RelationshipConstraint {
  readonly id: string;
  readonly type: 'spatial' | 'visual' | 'compositional';
  readonly subtype: string; // e.g., 'diagonal-flow', 'anchor-pattern', 'visual-weight'
  readonly priority: ConstraintPriority;
  readonly involvedElements: readonly string[]; // Element IDs affected
  readonly description: string; // Natural language rule for AI
  readonly geometric?: GeometricConstraint;
  readonly confidence: number;
  readonly preservationRule: string; // Specific instruction for TikTok adaptation
}

/** Collection of constraints for AI consumption */
export interface RelationshipConstraints {
  readonly sourceFrameId: string;
  readonly constraints: readonly RelationshipConstraint[];
  readonly constraintGroups: readonly {
    readonly groupId: string;
    readonly groupType: 'mutually_exclusive' | 'dependent' | 'prioritized';
    readonly constraintIds: readonly string[];
  }[];
  readonly adaptationGuidance: {
    readonly primaryStrategy: 'preserve' | 'adapt' | 'simplify';
    readonly fallbackStrategy: 'graceful' | 'simplified' | 'skip';
    readonly criticalConstraintCount: number;
  };
}

// ============================================================================
// Analysis Configuration & Control
// ============================================================================

/** Configuration for relationship detection */
export interface RelationshipDetectionConfig {
  readonly enableSpatialAnalysis: boolean;
  readonly enableVisualAnalysis: boolean;
  readonly enableCompositionalAnalysis: boolean;
  readonly confidenceThreshold: number; // Minimum confidence to include (0-1)
  readonly maxAnalysisTimeMs: number; // Processing timeout
  readonly maxElementCount: number; // Skip analysis if too complex
  readonly preserveMode: 'strict' | 'adaptive' | 'creative'; // How rigidly to preserve
}

/** Analysis result with error handling */
export interface RelationshipDetectionResult {
  readonly success: boolean;
  readonly analysis?: RelationshipAnalysis;
  readonly constraints?: RelationshipConstraints;
  readonly error?: string;
  readonly fallbackMode: 'none' | 'spatial_only' | 'proximity_only' | 'disabled';
  readonly processingTimeMs: number;
}