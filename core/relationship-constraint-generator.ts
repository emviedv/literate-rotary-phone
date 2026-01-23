/**
 * Relationship Constraint Generation
 *
 * Converts detected relationships into AI-readable constraints for TikTok transformation.
 * This is the critical bridge between relationship detection and AI layout generation,
 * translating sophisticated design patterns into structured preservation rules.
 */

import { debugFixLog } from "./debug.js";
import type {
  RelationshipAnalysis,
  RelationshipConstraints,
  RelationshipConstraint,
  ConstraintPriority,
  SpatialRelationship,
  VisualRelationship,
  CompositionalRelationship,
  AnchorPattern,
  FlowPattern,
  AlignmentGrid,
  LayeringHierarchy,
  VisualWeightDistribution,
  BalanceAnalysis,
  TensionPoints
} from "../types/design-relationships.js";

// ============================================================================
// Configuration
// ============================================================================

interface ConstraintGenerationConfig {
  readonly priorityThresholds: {
    readonly critical: number; // Min confidence for critical constraints
    readonly high: number;     // Min confidence for high priority
    readonly medium: number;   // Min confidence for medium priority
    readonly low: number;      // Min confidence for low priority
  };
  readonly maxConstraintsPerType: number; // Max constraints per relationship type
  readonly adaptationMode: 'preserve' | 'adapt' | 'simplify'; // How aggressively to preserve
  readonly tiktokAspectRatio: number; // Target aspect ratio (9:16)
}

const DEFAULT_CONSTRAINT_CONFIG: ConstraintGenerationConfig = {
  priorityThresholds: {
    critical: 0.8,
    high: 0.6,
    medium: 0.4,
    low: 0.2
  },
  maxConstraintsPerType: 5,
  adaptationMode: 'adapt',
  tiktokAspectRatio: 9 / 16
};

// ============================================================================
// Main Constraint Generation Function
// ============================================================================

/**
 * Generates comprehensive constraints from relationship analysis
 */
export function generateRelationshipConstraints(
  analysis: RelationshipAnalysis,
  config: Partial<ConstraintGenerationConfig> = {}
): RelationshipConstraints {
  const fullConfig = { ...DEFAULT_CONSTRAINT_CONFIG, ...config };
  const startTime = Date.now();

  debugFixLog("Starting constraint generation", {
    frameId: analysis.frameId,
    spatialRelationships: analysis.spatialRelationships.length,
    visualRelationships: analysis.visualRelationships.length,
    compositionalRelationships: analysis.compositionalRelationships.length
  });

  try {
    const constraints: RelationshipConstraint[] = [];

    // Generate spatial constraints
    const spatialConstraints = generateSpatialConstraints(
      analysis.spatialRelationships,
      fullConfig
    );
    constraints.push(...spatialConstraints);

    // Generate visual constraints
    const visualConstraints = generateVisualConstraints(
      analysis.visualRelationships,
      fullConfig
    );
    constraints.push(...visualConstraints);

    // Generate compositional constraints
    const compositionalConstraints = generateCompositionalConstraints(
      analysis.compositionalRelationships,
      fullConfig
    );
    constraints.push(...compositionalConstraints);

    // Sort by priority and confidence
    const sortedConstraints = prioritizeConstraints(constraints, fullConfig);

    // Group related constraints
    const constraintGroups = groupConstraints(sortedConstraints);

    // Generate adaptation guidance
    const adaptationGuidance = generateAdaptationGuidance(sortedConstraints, fullConfig);

    const result: RelationshipConstraints = {
      sourceFrameId: analysis.frameId,
      constraints: sortedConstraints,
      constraintGroups,
      adaptationGuidance
    };

    const processingTime = Date.now() - startTime;

    debugFixLog("Constraint generation complete", {
      totalConstraints: constraints.length,
      criticalConstraints: adaptationGuidance.criticalConstraintCount,
      constraintGroups: constraintGroups.length,
      processingTimeMs: processingTime
    });

    return result;

  } catch (error) {
    debugFixLog("Error in constraint generation", { error: String(error) });
    return {
      sourceFrameId: analysis.frameId,
      constraints: [],
      constraintGroups: [],
      adaptationGuidance: {
        primaryStrategy: 'simplify',
        fallbackStrategy: 'skip',
        criticalConstraintCount: 0
      }
    };
  }
}

// ============================================================================
// Spatial Constraint Generation
// ============================================================================

/**
 * Generates constraints from spatial relationships
 */
function generateSpatialConstraints(
  relationships: readonly SpatialRelationship[],
  config: ConstraintGenerationConfig
): RelationshipConstraint[] {
  const constraints: RelationshipConstraint[] = [];

  for (const relationship of relationships.slice(0, config.maxConstraintsPerType)) {
    switch (relationship.type) {
      case 'anchor':
        constraints.push(...generateAnchorConstraints(relationship, config));
        break;
      case 'flow':
        constraints.push(...generateFlowConstraints(relationship, config));
        break;
      case 'alignment':
        constraints.push(...generateAlignmentConstraints(relationship, config));
        break;
      case 'proximity':
        constraints.push(...generateProximityConstraints(relationship, config));
        break;
    }
  }

  return constraints;
}

/**
 * Generates constraints for anchor patterns
 */
function generateAnchorConstraints(
  pattern: AnchorPattern,
  config: ConstraintGenerationConfig
): RelationshipConstraint[] {
  const priority = determinePriority(pattern.confidence, config);
  const involvedElements = [pattern.anchorElementId, ...pattern.anchoredElements.map(el => el.elementId)];

  const constraint: RelationshipConstraint = {
    id: `anchor-${pattern.anchorElementId}`,
    type: 'spatial',
    subtype: 'anchor-pattern',
    priority,
    involvedElements,
    confidence: pattern.confidence,
    description: `Maintain anchor relationship with ${pattern.anchorElementId} as compositional foundation`,
    preservationRule: generateAnchorPreservationRule(pattern, config),
    geometric: {
      relativePositions: pattern.anchoredElements.map(el => ({
        elementId: el.elementId,
        position: {
          x: el.relativePosition.x,
          y: el.relativePosition.y
        }
      }))
    }
  };

  return [constraint];
}

/**
 * Generates preservation rule for anchor patterns
 */
function generateAnchorPreservationRule(
  pattern: AnchorPattern,
  config: ConstraintGenerationConfig
): string {
  const anchorElementName = `element "${pattern.anchorElementId}"`;
  const anchoredCount = pattern.anchoredElements.length;

  if (config.adaptationMode === 'preserve') {
    return `PRESERVE: Keep ${anchorElementName} as the compositional anchor with ${anchoredCount} elements positioned relative to it. Maintain relative positioning angles while adapting for 9:16 aspect ratio.`;
  } else if (config.adaptationMode === 'adapt') {
    return `ADAPT: Use ${anchorElementName} as primary anchor point. Adjust relative positions of ${anchoredCount} anchored elements to work in vertical format while maintaining the anchor relationship.`;
  } else {
    return `SIMPLIFY: Keep ${anchorElementName} as main reference point for ${anchoredCount} related elements.`;
  }
}

/**
 * Generates constraints for flow patterns
 */
function generateFlowConstraints(
  pattern: FlowPattern,
  config: ConstraintGenerationConfig
): RelationshipConstraint[] {
  const priority = determinePriority(pattern.confidence, config);

  const constraint: RelationshipConstraint = {
    id: `flow-${pattern.flowType}`,
    type: 'spatial',
    subtype: 'flow-pattern',
    priority,
    involvedElements: pattern.involvedElements,
    confidence: pattern.confidence,
    description: `Preserve ${pattern.flowType} flow pattern across ${pattern.involvedElements.length} elements`,
    preservationRule: generateFlowPreservationRule(pattern, config),
    geometric: {
      flowDirection: pattern.vectors.length > 0 ? pattern.vectors[0].direction : undefined
    }
  };

  return [constraint];
}

/**
 * Generates preservation rule for flow patterns
 */
function generateFlowPreservationRule(
  pattern: FlowPattern,
  config: ConstraintGenerationConfig
): string {
  const directionDesc = getFlowDirectionDescription(pattern.flowType, pattern.vectors);

  if (config.adaptationMode === 'preserve') {
    return `PRESERVE: Maintain ${pattern.flowType} flow ${directionDesc}. Keep visual movement pattern intact while adapting element positions for vertical format.`;
  } else if (config.adaptationMode === 'adapt') {
    return `ADAPT: Preserve the ${pattern.flowType} visual flow but adjust direction for vertical layout. Maintain the sense of movement ${directionDesc}.`;
  } else {
    return `SIMPLIFY: Keep elements flowing in a ${pattern.flowType} pattern suitable for vertical format.`;
  }
}

/**
 * Gets description of flow direction
 */
function getFlowDirectionDescription(
  flowType: FlowPattern['flowType'],
  vectors: FlowPattern['vectors']
): string {
  if (vectors.length === 0) return '';

  const avgDirection = vectors.reduce((sum, v) => sum + v.direction, 0) / vectors.length;

  switch (flowType) {
    case 'diagonal':
      return avgDirection > 315 || avgDirection <= 45 ? 'from left to right' :
             avgDirection <= 135 ? 'from top to bottom' :
             avgDirection <= 225 ? 'from right to left' :
             'from bottom to top';
    case 'linear':
      return 'in a straight line';
    case 'circular':
      return 'in a circular motion';
    case 'spiral':
      return 'in a spiral pattern';
    default:
      return '';
  }
}

/**
 * Generates constraints for alignment grids
 */
function generateAlignmentConstraints(
  grid: AlignmentGrid,
  config: ConstraintGenerationConfig
): RelationshipConstraint[] {
  const priority = determinePriority(grid.confidence, config);
  const allInvolvedElements = grid.alignmentLines.flatMap(line => line.elementIds);

  const constraint: RelationshipConstraint = {
    id: `alignment-${grid.gridType}`,
    type: 'spatial',
    subtype: 'alignment-grid',
    priority,
    involvedElements: [...new Set(allInvolvedElements)],
    confidence: grid.confidence,
    description: `Maintain ${grid.gridType} alignment grid with ${grid.alignmentLines.length} alignment lines`,
    preservationRule: generateAlignmentPreservationRule(grid, config),
    geometric: {
      alignmentAxis: grid.gridType === 'horizontal' ? 'horizontal' : 'vertical'
    }
  };

  return [constraint];
}

/**
 * Generates preservation rule for alignment grids
 */
function generateAlignmentPreservationRule(
  grid: AlignmentGrid,
  config: ConstraintGenerationConfig
): string {
  const lineCount = grid.alignmentLines.length;
  const axis = grid.gridType;

  if (config.adaptationMode === 'preserve') {
    return `PRESERVE: Maintain ${axis} alignment grid with ${lineCount} alignment lines. Keep elements aligned along their structural axes while adapting for vertical format.`;
  } else if (config.adaptationMode === 'adapt') {
    return `ADAPT: Preserve the ${axis} alignment structure but adjust for 9:16 format. Keep most important alignments while allowing flexibility for vertical layout.`;
  } else {
    return `SIMPLIFY: Keep key ${axis} alignments between related elements.`;
  }
}

/**
 * Generates constraints for proximity clusters (placeholder for existing system integration)
 */
function generateProximityConstraints(
  cluster: any, // ProximityCluster from existing system
  config: ConstraintGenerationConfig
): RelationshipConstraint[] {
  // This would integrate with the existing proximity system
  // For now, return empty array as this is handled by existing atomic protection
  return [];
}

// ============================================================================
// Visual Constraint Generation
// ============================================================================

/**
 * Generates constraints from visual relationships
 */
function generateVisualConstraints(
  relationships: readonly VisualRelationship[],
  config: ConstraintGenerationConfig
): RelationshipConstraint[] {
  const constraints: RelationshipConstraint[] = [];

  for (const relationship of relationships.slice(0, config.maxConstraintsPerType)) {
    switch (relationship.type) {
      case 'layering':
        constraints.push(...generateLayeringConstraints(relationship, config));
        break;
      case 'weight':
        constraints.push(...generateWeightConstraints(relationship, config));
        break;
      case 'contrast':
        constraints.push(...generateContrastConstraints(relationship, config));
        break;
      case 'scale':
        constraints.push(...generateScaleConstraints(relationship, config));
        break;
    }
  }

  return constraints;
}

/**
 * Generates constraints for layering hierarchy
 */
function generateLayeringConstraints(
  hierarchy: LayeringHierarchy,
  config: ConstraintGenerationConfig
): RelationshipConstraint[] {
  const priority = determinePriority(hierarchy.confidence, config);
  const allElements = hierarchy.layers.flatMap(layer => layer.elementIds);

  const constraint: RelationshipConstraint = {
    id: `layering-hierarchy`,
    type: 'visual',
    subtype: 'layering-hierarchy',
    priority,
    involvedElements: allElements,
    confidence: hierarchy.confidence,
    description: `Preserve ${hierarchy.layers.length}-layer depth hierarchy`,
    preservationRule: generateLayeringPreservationRule(hierarchy, config)
  };

  return [constraint];
}

/**
 * Generates preservation rule for layering hierarchy
 */
function generateLayeringPreservationRule(
  hierarchy: LayeringHierarchy,
  config: ConstraintGenerationConfig
): string {
  const layerCount = hierarchy.layers.length;

  if (config.adaptationMode === 'preserve') {
    return `PRESERVE: Maintain ${layerCount}-layer depth hierarchy. Ensure foreground elements stay in front and background elements stay behind during repositioning.`;
  } else {
    return `ADAPT: Keep depth relationships between key foreground and background elements while repositioning for vertical format.`;
  }
}

/**
 * Generates constraints for visual weight distribution
 */
function generateWeightConstraints(
  distribution: VisualWeightDistribution,
  config: ConstraintGenerationConfig
): RelationshipConstraint[] {
  const priority = determinePriority(distribution.confidence, config);
  const heaviestElements = distribution.weightMap
    .filter(w => w.weight > 0.6)
    .map(w => w.elementId);

  const constraint: RelationshipConstraint = {
    id: `visual-weight`,
    type: 'visual',
    subtype: 'visual-weight',
    priority,
    involvedElements: heaviestElements,
    confidence: distribution.confidence,
    description: `Preserve visual weight distribution with balance point at (${distribution.totalBalance.x.toFixed(2)}, ${distribution.totalBalance.y.toFixed(2)})`,
    preservationRule: generateWeightPreservationRule(distribution, config)
  };

  return [constraint];
}

/**
 * Generates preservation rule for visual weight distribution
 */
function generateWeightPreservationRule(
  distribution: VisualWeightDistribution,
  config: ConstraintGenerationConfig
): string {
  const heavyElements = distribution.weightMap.filter(w => w.weight > 0.6).length;

  if (config.adaptationMode === 'preserve') {
    return `PRESERVE: Maintain visual weight distribution. Keep ${heavyElements} high-weight elements balanced. Adapt positions while preserving weight relationships.`;
  } else {
    return `ADAPT: Keep most important visual elements prominent while adjusting layout for vertical format.`;
  }
}

/**
 * Generates constraints for contrast relationships
 */
function generateContrastConstraints(
  contrast: VisualRelationship,
  config: ConstraintGenerationConfig
): RelationshipConstraint[] {
  // Simplified for now - could be more sophisticated
  return [];
}

/**
 * Generates constraints for scale relationships
 */
function generateScaleConstraints(
  scale: VisualRelationship,
  config: ConstraintGenerationConfig
): RelationshipConstraint[] {
  // Simplified for now - could be more sophisticated
  return [];
}

// ============================================================================
// Compositional Constraint Generation
// ============================================================================

/**
 * Generates constraints from compositional relationships
 */
function generateCompositionalConstraints(
  relationships: readonly CompositionalRelationship[],
  config: ConstraintGenerationConfig
): RelationshipConstraint[] {
  const constraints: RelationshipConstraint[] = [];

  for (const relationship of relationships.slice(0, config.maxConstraintsPerType)) {
    switch (relationship.type) {
      case 'balance':
        constraints.push(...generateBalanceConstraints(relationship, config));
        break;
      case 'tension':
        constraints.push(...generateTensionConstraints(relationship, config));
        break;
      case 'breathing':
        constraints.push(...generateBreathingConstraints(relationship, config));
        break;
      case 'edge':
        constraints.push(...generateEdgeConstraints(relationship, config));
        break;
    }
  }

  return constraints;
}

/**
 * Generates constraints for balance analysis
 */
function generateBalanceConstraints(
  balance: BalanceAnalysis,
  config: ConstraintGenerationConfig
): RelationshipConstraint[] {
  const priority = determinePriority(balance.confidence, config);
  const significantElements = balance.balanceElements
    .filter(el => Math.abs(el.balanceContribution) > 0.2)
    .map(el => el.elementId);

  const constraint: RelationshipConstraint = {
    id: `balance-${balance.balanceType}`,
    type: 'compositional',
    subtype: 'balance-analysis',
    priority,
    involvedElements: significantElements,
    confidence: balance.confidence,
    description: `Preserve ${balance.balanceType} compositional balance`,
    preservationRule: generateBalancePreservationRule(balance, config)
  };

  return [constraint];
}

/**
 * Generates preservation rule for balance analysis
 */
function generateBalancePreservationRule(
  balance: BalanceAnalysis,
  config: ConstraintGenerationConfig
): string {
  const balanceType = balance.balanceType;

  if (config.adaptationMode === 'preserve') {
    return `PRESERVE: Maintain ${balanceType} balance. Keep compositional weight distribution balanced while adapting for 9:16 format.`;
  } else if (config.adaptationMode === 'adapt') {
    return `ADAPT: Preserve the sense of ${balanceType} balance but allow adjustments for vertical layout. Maintain visual stability.`;
  } else {
    return `SIMPLIFY: Keep the design feeling balanced and stable in vertical format.`;
  }
}

/**
 * Generates constraints for tension points
 */
function generateTensionConstraints(
  tension: TensionPoints,
  config: ConstraintGenerationConfig
): RelationshipConstraint[] {
  const priority = determinePriority(tension.confidence, config);
  const allInvolvedElements = tension.tensionAreas.flatMap(area => area.involvedElements);

  const constraint: RelationshipConstraint = {
    id: `tension-points`,
    type: 'compositional',
    subtype: 'tension-points',
    priority,
    involvedElements: [...new Set(allInvolvedElements)],
    confidence: tension.confidence,
    description: `Preserve ${tension.tensionAreas.length} areas of visual tension and energy`,
    preservationRule: generateTensionPreservationRule(tension, config)
  };

  return [constraint];
}

/**
 * Generates preservation rule for tension points
 */
function generateTensionPreservationRule(
  tension: TensionPoints,
  config: ConstraintGenerationConfig
): string {
  const highIntensityAreas = tension.tensionAreas.filter(area => area.intensity > 0.7).length;

  if (config.adaptationMode === 'preserve') {
    return `PRESERVE: Maintain ${highIntensityAreas} high-intensity tension areas. Keep visual energy and conflict relationships while adapting positions.`;
  } else {
    return `ADAPT: Preserve key areas of visual interest and energy while adjusting for vertical format.`;
  }
}

/**
 * Generates constraints for breathing room patterns
 */
function generateBreathingConstraints(
  breathing: CompositionalRelationship,
  config: ConstraintGenerationConfig
): RelationshipConstraint[] {
  if (breathing.type !== 'breathing') return [];

  const priority = determinePriority(breathing.confidence, config);
  const importantSpaces = breathing.spaceDistribution.filter((space: any) => space.importance > 0.5);

  const constraint: RelationshipConstraint = {
    id: `breathing-room`,
    type: 'compositional',
    subtype: 'breathing-room',
    priority,
    involvedElements: [], // Negative space doesn't have element IDs
    confidence: breathing.confidence,
    description: `Preserve ${importantSpaces.length} important negative space regions`,
    preservationRule: generateBreathingPreservationRule(breathing, config)
  };

  return [constraint];
}

/**
 * Generates preservation rule for breathing room patterns
 */
function generateBreathingPreservationRule(
  breathing: CompositionalRelationship,
  config: ConstraintGenerationConfig
): string {
  if (breathing.type !== 'breathing') return 'Preserve composition';

  const spaceCount = breathing.spaceDistribution.length;

  if (config.adaptationMode === 'preserve') {
    return `PRESERVE: Maintain ${spaceCount} negative space regions. Keep breathing room and visual separation while adapting layout.`;
  } else {
    return `ADAPT: Preserve important negative space for visual comfort while adjusting for vertical format.`;
  }
}

/**
 * Generates constraints for edge relationships (placeholder)
 */
function generateEdgeConstraints(
  edge: CompositionalRelationship,
  config: ConstraintGenerationConfig
): RelationshipConstraint[] {
  // Would be implemented based on edge relationship analysis
  return [];
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Determines constraint priority based on confidence and thresholds
 */
function determinePriority(
  confidence: number,
  config: ConstraintGenerationConfig
): ConstraintPriority {
  if (confidence >= config.priorityThresholds.critical) return 'critical';
  if (confidence >= config.priorityThresholds.high) return 'high';
  if (confidence >= config.priorityThresholds.medium) return 'medium';
  return 'low';
}

/**
 * Prioritizes and filters constraints
 */
function prioritizeConstraints(
  constraints: RelationshipConstraint[],
  config: ConstraintGenerationConfig
): RelationshipConstraint[] {
  return constraints
    .filter(constraint => constraint.confidence >= config.priorityThresholds.low)
    .sort((a, b) => {
      // Sort by priority first, then confidence
      const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return b.confidence - a.confidence;
    });
}

/**
 * Groups related constraints
 */
function groupConstraints(
  constraints: RelationshipConstraint[]
): RelationshipConstraints['constraintGroups'] {
  const groups: {
    groupId: string;
    groupType: 'mutually_exclusive' | 'dependent' | 'prioritized';
    constraintIds: string[];
  }[] = [];

  // Group by constraint type
  const spatialConstraints = constraints.filter(c => c.type === 'spatial').map(c => c.id);
  const visualConstraints = constraints.filter(c => c.type === 'visual').map(c => c.id);
  const compositionalConstraints = constraints.filter(c => c.type === 'compositional').map(c => c.id);

  if (spatialConstraints.length > 0) {
    groups.push({
      groupId: 'spatial-relationships',
      groupType: 'dependent',
      constraintIds: spatialConstraints
    });
  }

  if (visualConstraints.length > 0) {
    groups.push({
      groupId: 'visual-relationships',
      groupType: 'dependent',
      constraintIds: visualConstraints
    });
  }

  if (compositionalConstraints.length > 0) {
    groups.push({
      groupId: 'compositional-relationships',
      groupType: 'dependent',
      constraintIds: compositionalConstraints
    });
  }

  return groups;
}

/**
 * Generates adaptation guidance for the AI
 */
function generateAdaptationGuidance(
  constraints: RelationshipConstraint[],
  config: ConstraintGenerationConfig
): RelationshipConstraints['adaptationGuidance'] {
  const criticalConstraints = constraints.filter(c => c.priority === 'critical');
  const highConstraints = constraints.filter(c => c.priority === 'high');

  const primaryStrategy = criticalConstraints.length > 0 ? 'preserve' :
                         highConstraints.length > 0 ? 'adapt' : 'simplify';

  const fallbackStrategy = config.adaptationMode === 'preserve' ? 'graceful' :
                          config.adaptationMode === 'adapt' ? 'simplified' : 'skip';

  return {
    primaryStrategy,
    fallbackStrategy,
    criticalConstraintCount: criticalConstraints.length
  };
}