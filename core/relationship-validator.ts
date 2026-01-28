/**
 * Relationship Preservation Validator
 *
 * Validates that AI-generated positioning specifications properly preserve
 * detected design relationships. Provides feedback and suggests adjustments
 * when relationship constraints are violated.
 */

import { debugFixLog } from "./debug.js";
import type {
  RelationshipConstraints,
  RelationshipConstraint,
  NormalizedPoint
} from "../types/design-relationships.js";
import type { DesignSpecs, NodeSpec } from "../types/design-types.js";

// ============================================================================
// Types
// ============================================================================

interface ValidationResult {
  readonly passed: boolean;
  readonly score: number; // 0-1, overall relationship preservation score
  readonly violations: readonly ConstraintViolation[];
  readonly summary: string;
  readonly adjustmentRecommendations: readonly AdjustmentRecommendation[];
}

interface ConstraintViolation {
  readonly constraintId: string;
  readonly constraintDescription: string;
  readonly violationType: 'missing_elements' | 'positioning_error' | 'relationship_broken' | 'severe_deviation';
  readonly severity: 'critical' | 'major' | 'minor';
  readonly details: string;
  readonly affectedElements: readonly string[];
}

interface AdjustmentRecommendation {
  readonly type: 'reposition' | 'resize' | 'reorder' | 'regenerate';
  readonly description: string;
  readonly affectedNodes: readonly string[];
  readonly expectedOutcome: string;
}

// ============================================================================
// Main Validation Function
// ============================================================================

/**
 * Validates AI-generated design specifications against relationship constraints
 */
export function validateRelationshipPreservation(
  designSpecs: DesignSpecs,
  relationshipConstraints: RelationshipConstraints
): ValidationResult {
  const startTime = Date.now();

  debugFixLog("Starting relationship preservation validation", {
    nodeSpecs: designSpecs.nodes.length,
    constraints: relationshipConstraints.constraints.length,
    criticalConstraints: relationshipConstraints.adaptationGuidance.criticalConstraintCount
  });

  try {
    const violations: ConstraintViolation[] = [];
    let totalScore = 0;
    let totalWeight = 0;

    // Validate each constraint
    for (const constraint of relationshipConstraints.constraints) {
      const constraintValidation = validateSingleConstraint(constraint, designSpecs);

      if (!constraintValidation.passed) {
        violations.push(...constraintValidation.violations);
      }

      // Weight by priority
      const weight = getConstraintWeight(constraint.priority);
      totalScore += constraintValidation.score * weight;
      totalWeight += weight;
    }

    const overallScore = totalWeight > 0 ? totalScore / totalWeight : 0;
    const passed = overallScore >= 0.7 && violations.filter(v => v.severity === 'critical').length === 0;

    // Generate adjustment recommendations
    const adjustmentRecommendations = generateAdjustmentRecommendations(violations, designSpecs);

    const summary = generateValidationSummary(passed, overallScore, violations);

    const processingTime = Date.now() - startTime;

    debugFixLog("Relationship preservation validation complete", {
      passed,
      score: overallScore,
      violations: violations.length,
      criticalViolations: violations.filter(v => v.severity === 'critical').length,
      recommendations: adjustmentRecommendations.length,
      processingTimeMs: processingTime
    });

    return {
      passed,
      score: overallScore,
      violations,
      summary,
      adjustmentRecommendations
    };

  } catch (error) {
    debugFixLog("Error in relationship validation", { error: String(error) });

    return {
      passed: false,
      score: 0,
      violations: [{
        constraintId: 'validation-error',
        constraintDescription: 'Validation system error',
        violationType: 'severe_deviation',
        severity: 'critical',
        details: `Validation failed: ${error}`,
        affectedElements: []
      }],
      summary: 'Relationship validation failed due to system error',
      adjustmentRecommendations: [{
        type: 'regenerate',
        description: 'Regenerate specifications without relationship constraints',
        affectedNodes: [],
        expectedOutcome: 'Fallback to basic layout without relationship preservation'
      }]
    };
  }
}

// ============================================================================
// Single Constraint Validation
// ============================================================================

/**
 * Validates a single relationship constraint
 */
function validateSingleConstraint(
  constraint: RelationshipConstraint,
  designSpecs: DesignSpecs
): { passed: boolean; score: number; violations: ConstraintViolation[] } {

  debugFixLog("Validating constraint", {
    id: constraint.id,
    type: constraint.type,
    subtype: constraint.subtype,
    priority: constraint.priority,
    involvedElements: constraint.involvedElements.length
  });

  // Check if involved elements exist in specs
  const missingElements = findMissingElements(constraint.involvedElements, designSpecs);
  if (missingElements.length > 0) {
    return {
      passed: false,
      score: 0,
      violations: [{
        constraintId: constraint.id,
        constraintDescription: constraint.description,
        violationType: 'missing_elements',
        severity: constraint.priority === 'critical' ? 'critical' : 'major',
        details: `Missing elements in specifications: ${missingElements.join(', ')}`,
        affectedElements: missingElements
      }]
    };
  }

  // Validate specific constraint types
  switch (constraint.type) {
    case 'spatial':
      return validateSpatialConstraint(constraint, designSpecs);
    case 'visual':
      return validateVisualConstraint(constraint, designSpecs);
    case 'compositional':
      return validateCompositionalConstraint(constraint, designSpecs);
    default:
      return { passed: true, score: 1, violations: [] };
  }
}

/**
 * Finds elements that are missing from design specifications
 */
function findMissingElements(elementIds: readonly string[], designSpecs: DesignSpecs): string[] {
  const specNodeIds = new Set(designSpecs.nodes.map(node => node.nodeId));
  return elementIds.filter(id => !specNodeIds.has(id));
}

// ============================================================================
// Spatial Constraint Validation
// ============================================================================

/**
 * Validates spatial relationship constraints
 */
function validateSpatialConstraint(
  constraint: RelationshipConstraint,
  designSpecs: DesignSpecs
): { passed: boolean; score: number; violations: ConstraintViolation[] } {

  switch (constraint.subtype) {
    case 'anchor-pattern':
      return validateAnchorPattern(constraint, designSpecs);
    case 'flow-pattern':
      return validateFlowPattern(constraint, designSpecs);
    case 'alignment-grid':
      return validateAlignmentGrid(constraint, designSpecs);
    default:
      return { passed: true, score: 1, violations: [] };
  }
}

/**
 * Validates anchor pattern preservation
 */
function validateAnchorPattern(
  constraint: RelationshipConstraint,
  designSpecs: DesignSpecs
): { passed: boolean; score: number; violations: ConstraintViolation[] } {

  const violations: ConstraintViolation[] = [];
  let score = 1;

  // Find anchor element (first in involved elements)
  const anchorId = constraint.involvedElements[0];
  const anchorSpec = designSpecs.nodes.find(node => node.nodeId === anchorId);

  if (!anchorSpec) {
    return {
      passed: false,
      score: 0,
      violations: [{
        constraintId: constraint.id,
        constraintDescription: constraint.description,
        violationType: 'missing_elements',
        severity: 'critical',
        details: `Anchor element ${anchorId} not found in specifications`,
        affectedElements: [anchorId]
      }]
    };
  }

  // Check relative positioning if geometric constraints exist
  if (constraint.geometric?.relativePositions) {
    const positionViolations = validateRelativePositioning(
      constraint.geometric.relativePositions as { elementId: string; position: NormalizedPoint }[],
      anchorSpec,
      designSpecs,
      constraint
    );
    violations.push(...positionViolations);

    if (positionViolations.length > 0) {
      score = Math.max(0.3, score - positionViolations.length * 0.2);
    }
  }

  return {
    passed: violations.filter(v => v.severity === 'critical').length === 0,
    score,
    violations
  };
}

/**
 * Validates flow pattern preservation
 */
function validateFlowPattern(
  constraint: RelationshipConstraint,
  designSpecs: DesignSpecs
): { passed: boolean; score: number; violations: ConstraintViolation[] } {

  const violations: ConstraintViolation[] = [];
  let score = 1;

  // Check if flow direction is maintained
  if (constraint.geometric?.flowDirection !== undefined) {
    const expectedDirection = constraint.geometric.flowDirection;
    const actualDirection = calculateFlowDirection(constraint.involvedElements, designSpecs);

    if (actualDirection !== null) {
      const directionDiff = Math.abs(expectedDirection - actualDirection);
      const normalizedDiff = Math.min(directionDiff, 360 - directionDiff);

      if (normalizedDiff > 45) { // More than 45 degrees off
        violations.push({
          constraintId: constraint.id,
          constraintDescription: constraint.description,
          violationType: 'relationship_broken',
          severity: normalizedDiff > 90 ? 'critical' : 'major',
          details: `Flow direction changed by ${normalizedDiff.toFixed(1)}° (expected: ${expectedDirection}°, actual: ${actualDirection.toFixed(1)}°)`,
          affectedElements: constraint.involvedElements
        });

        score = Math.max(0.2, 1 - normalizedDiff / 180);
      }
    }
  }

  return {
    passed: violations.filter(v => v.severity === 'critical').length === 0,
    score,
    violations
  };
}

/**
 * Validates alignment grid preservation
 */
function validateAlignmentGrid(
  constraint: RelationshipConstraint,
  designSpecs: DesignSpecs
): { passed: boolean; score: number; violations: ConstraintViolation[] } {

  const violations: ConstraintViolation[] = [];
  let score = 1;

  const alignmentAxis = constraint.geometric?.alignmentAxis;
  if (!alignmentAxis) {
    return { passed: true, score: 1, violations: [] };
  }

  // Check alignment preservation
  const alignmentScore = alignmentAxis === 'diagonal' ? 0.8 : // Assume good for diagonal
    calculateAlignmentScore(constraint.involvedElements, designSpecs, alignmentAxis);

  if (alignmentScore < 0.6) {
    violations.push({
      constraintId: constraint.id,
      constraintDescription: constraint.description,
      violationType: 'relationship_broken',
      severity: alignmentScore < 0.3 ? 'critical' : 'major',
      details: `${alignmentAxis} alignment significantly degraded (score: ${alignmentScore.toFixed(2)})`,
      affectedElements: constraint.involvedElements
    });

    score = Math.max(0.2, alignmentScore);
  }

  return {
    passed: violations.filter(v => v.severity === 'critical').length === 0,
    score,
    violations
  };
}

// ============================================================================
// Visual & Compositional Constraint Validation (Simplified)
// ============================================================================

/**
 * Validates visual relationship constraints
 */
function validateVisualConstraint(
  constraint: RelationshipConstraint,
  designSpecs: DesignSpecs
): { passed: boolean; score: number; violations: ConstraintViolation[] } {

  // For now, assume visual constraints are preserved if elements exist
  // Could be enhanced with more sophisticated visual analysis

  const missingElements = findMissingElements(constraint.involvedElements, designSpecs);
  if (missingElements.length > 0) {
    return {
      passed: false,
      score: 0.5,
      violations: [{
        constraintId: constraint.id,
        constraintDescription: constraint.description,
        violationType: 'missing_elements',
        severity: 'major',
        details: `Some elements missing from visual hierarchy: ${missingElements.join(', ')}`,
        affectedElements: missingElements
      }]
    };
  }

  return { passed: true, score: 0.9, violations: [] }; // Conservative score
}

/**
 * Validates compositional relationship constraints
 */
function validateCompositionalConstraint(
  constraint: RelationshipConstraint,
  designSpecs: DesignSpecs
): { passed: boolean; score: number; violations: ConstraintViolation[] } {

  // For now, assume compositional constraints are preserved if elements exist
  // Could be enhanced with balance and tension analysis

  const missingElements = findMissingElements(constraint.involvedElements, designSpecs);
  if (missingElements.length > 0) {
    return {
      passed: false,
      score: 0.5,
      violations: [{
        constraintId: constraint.id,
        constraintDescription: constraint.description,
        violationType: 'missing_elements',
        severity: 'major',
        details: `Some elements missing from composition: ${missingElements.join(', ')}`,
        affectedElements: missingElements
      }]
    };
  }

  return { passed: true, score: 0.9, violations: [] }; // Conservative score
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Gets constraint weight based on priority
 */
function getConstraintWeight(priority: RelationshipConstraint['priority']): number {
  switch (priority) {
    case 'critical': return 4;
    case 'high': return 3;
    case 'medium': return 2;
    case 'low': return 1;
    default: return 1;
  }
}

/**
 * Validates relative positioning between elements
 */
function validateRelativePositioning(
  expectedPositions: { elementId: string; position: NormalizedPoint }[],
  anchorSpec: NodeSpec,
  designSpecs: DesignSpecs,
  constraint: RelationshipConstraint
): ConstraintViolation[] {

  const violations: ConstraintViolation[] = [];

  for (const expectedPos of expectedPositions) {
    const elementSpec = designSpecs.nodes.find(node => node.nodeId === expectedPos.elementId);
    if (!elementSpec) continue;

    // Calculate actual relative position
    const anchorCenter = getNodeCenter(anchorSpec);
    const elementCenter = getNodeCenter(elementSpec);

    if (!elementCenter || !anchorCenter) {
      continue; // Skip if position data not available
    }

    const actualRelativePos = {
      x: (elementCenter.x - anchorCenter.x) / 1080, // Normalize to frame width
      y: (elementCenter.y - anchorCenter.y) / 1920  // Normalize to frame height
    };

    // Check if position is significantly different
    const positionDiff = Math.sqrt(
      Math.pow(actualRelativePos.x - expectedPos.position.x, 2) +
      Math.pow(actualRelativePos.y - expectedPos.position.y, 2)
    );

    if (positionDiff > 0.2) { // 20% of frame size tolerance
      violations.push({
        constraintId: constraint.id,
        constraintDescription: constraint.description,
        violationType: 'positioning_error',
        severity: positionDiff > 0.4 ? 'critical' : 'major',
        details: `Element ${expectedPos.elementId} position deviated by ${(positionDiff * 100).toFixed(1)}% from anchor`,
        affectedElements: [expectedPos.elementId]
      });
    }
  }

  return violations;
}

/**
 * Calculates flow direction between elements
 */
function calculateFlowDirection(elementIds: readonly string[], designSpecs: DesignSpecs): number | null {
  if (elementIds.length < 2) return null;

  const elements = elementIds
    .map(id => designSpecs.nodes.find(node => node.nodeId === id))
    .filter(spec => spec !== undefined);

  if (elements.length < 2) return null;

  // Calculate average flow direction between consecutive elements
  let totalDirection = 0;
  let directionCount = 0;

  for (let i = 0; i < elements.length - 1; i++) {
    const center1 = getNodeCenter(elements[i]!);
    const center2 = getNodeCenter(elements[i + 1]!);

    if (!center1 || !center2) continue;

    const dx = center2.x - center1.x;
    const dy = center2.y - center1.y;
    const direction = (Math.atan2(dy, dx) * 180 / Math.PI + 360) % 360;

    totalDirection += direction;
    directionCount++;
  }

  return directionCount > 0 ? totalDirection / directionCount : null;
}

/**
 * Calculates alignment score for elements
 */
function calculateAlignmentScore(
  elementIds: readonly string[],
  designSpecs: DesignSpecs,
  axis: 'horizontal' | 'vertical'
): number {

  const elements = elementIds
    .map(id => designSpecs.nodes.find(node => node.nodeId === id))
    .filter(spec => spec !== undefined);

  if (elements.length < 2) return 1;

  // Get positions along alignment axis
  const positions = elements.map(spec => {
    const center = getNodeCenter(spec!);
    return center ? (axis === 'horizontal' ? center.y : center.x) : 0;
  }).filter(pos => pos !== 0); // Filter out null centers

  // Calculate variance in positions (lower = better alignment)
  const mean = positions.reduce((sum, pos) => sum + pos, 0) / positions.length;
  const variance = positions.reduce((sum, pos) => sum + Math.pow(pos - mean, 2), 0) / positions.length;
  const stdDev = Math.sqrt(variance);

  // Convert to score (0-1, where 1 = perfect alignment)
  // 40px standard deviation = score of 0.5, 80px = score of 0
  return Math.max(0, 1 - stdDev / 80);
}

/**
 * Gets center point of a node specification
 */
function getNodeCenter(nodeSpec: NodeSpec): { x: number; y: number } | null {
  if (!nodeSpec.position || !nodeSpec.size) {
    return null;
  }
  return {
    x: nodeSpec.position.x + nodeSpec.size.width / 2,
    y: nodeSpec.position.y + nodeSpec.size.height / 2
  };
}

/**
 * Generates adjustment recommendations based on violations
 */
function generateAdjustmentRecommendations(
  violations: readonly ConstraintViolation[],
  designSpecs: DesignSpecs
): AdjustmentRecommendation[] {

  const recommendations: AdjustmentRecommendation[] = [];

  const criticalViolations = violations.filter(v => v.severity === 'critical');
  const majorViolations = violations.filter(v => v.severity === 'major');

  if (criticalViolations.length > 0) {
    recommendations.push({
      type: 'regenerate',
      description: `${criticalViolations.length} critical relationship violations detected`,
      affectedNodes: Array.from(new Set(criticalViolations.flatMap(v => v.affectedElements))),
      expectedOutcome: 'Regenerate with stronger relationship preservation constraints'
    });
  } else if (majorViolations.length > 0) {
    recommendations.push({
      type: 'reposition',
      description: `${majorViolations.length} major positioning issues detected`,
      affectedNodes: Array.from(new Set(majorViolations.flatMap(v => v.affectedElements))),
      expectedOutcome: 'Adjust positions to better preserve detected relationships'
    });
  }

  return recommendations;
}

/**
 * Generates validation summary
 */
function generateValidationSummary(
  passed: boolean,
  score: number,
  violations: readonly ConstraintViolation[]
): string {

  if (passed) {
    return `Relationship preservation successful (score: ${(score * 100).toFixed(1)}%)`;
  }

  const criticalCount = violations.filter(v => v.severity === 'critical').length;
  const majorCount = violations.filter(v => v.severity === 'major').length;
  const minorCount = violations.filter(v => v.severity === 'minor').length;

  let summary = `Relationship preservation issues detected (score: ${(score * 100).toFixed(1)}%)`;

  if (criticalCount > 0) {
    summary += ` - ${criticalCount} critical violation${criticalCount > 1 ? 's' : ''}`;
  }
  if (majorCount > 0) {
    summary += ` - ${majorCount} major issue${majorCount > 1 ? 's' : ''}`;
  }
  if (minorCount > 0) {
    summary += ` - ${minorCount} minor issue${minorCount > 1 ? 's' : ''}`;
  }

  return summary;
}