/**
 * Proximity Direction Detection
 *
 * Multi-heuristic analysis system for determining optimal auto-layout direction
 * for proximity-based groups. Combines spatial arrangement, content flow analysis,
 * and aspect ratio considerations with weighted confidence scoring.
 */

import { debugFixLog } from "./debug.js";
import type {
  ProximityElement,
  AutoLayoutDirection,
  DirectionAnalysis,
  DirectionFactors,
  DirectionHeuristic
} from "../types/proximity-types.js";

// ============================================================================
// Direction Analysis Weights
// ============================================================================

/**
 * Weights for combining different direction analysis heuristics.
 * These values are based on the reliability and importance of each factor.
 */
const DIRECTION_WEIGHTS = {
  /** Linear spatial arrangement - most reliable indicator */
  ARRANGEMENT: 0.4,
  /** Content flow and semantic relationships */
  FLOW: 0.3,
  /** Overall aspect ratio and visual proportions */
  ASPECT: 0.3
} as const;

/**
 * Minimum confidence threshold for direction decisions.
 * Below this threshold, the system defaults to horizontal layout.
 */
const MIN_CONFIDENCE_THRESHOLD = 0.6;

// ============================================================================
// Main Direction Analysis Function
// ============================================================================

/**
 * Analyzes the optimal auto-layout direction for a group of elements
 * using multiple heuristics and weighted confidence scoring.
 *
 * @param elements - Elements in the proximity group
 * @returns Direction analysis with recommendation and confidence
 */
export function analyzeOptimalDirection(elements: readonly ProximityElement[]): DirectionAnalysis {
  debugFixLog("Starting direction analysis", {
    elementCount: elements.length,
    elementNames: elements.map(e => e.node.name)
  });

  if (elements.length === 0) {
    return {
      direction: 'horizontal',
      confidence: 0,
      factors: createEmptyFactors()
    };
  }

  if (elements.length === 1) {
    return {
      direction: 'horizontal',
      confidence: 1.0,
      factors: createSingleElementFactors()
    };
  }

  // Perform individual heuristic analyses
  const arrangementAnalysis = analyzeLinearArrangement(elements);
  const flowAnalysis = analyzeContentFlow(elements);
  const aspectAnalysis = analyzeAspectRatio(elements);

  // Combine heuristics with weights
  const heuristics: DirectionHeuristic[] = [
    { analysis: arrangementAnalysis, weight: DIRECTION_WEIGHTS.ARRANGEMENT },
    { analysis: flowAnalysis, weight: DIRECTION_WEIGHTS.FLOW },
    { analysis: aspectAnalysis, weight: DIRECTION_WEIGHTS.ASPECT }
  ];

  const combinedResult = combineHeuristics(heuristics);

  const factors: DirectionFactors = {
    arrangement: arrangementAnalysis,
    flow: flowAnalysis,
    aspect: aspectAnalysis
  };

  debugFixLog("Direction analysis complete", {
    recommendedDirection: combinedResult.direction,
    confidence: combinedResult.confidence,
    factors: {
      arrangement: `${arrangementAnalysis.direction} (${arrangementAnalysis.score.toFixed(2)})`,
      flow: `${flowAnalysis.direction} (${flowAnalysis.score.toFixed(2)})`,
      aspect: `${aspectAnalysis.direction} (${aspectAnalysis.score.toFixed(2)})`
    }
  });

  return {
    direction: combinedResult.direction,
    confidence: combinedResult.confidence,
    factors
  };
}

// ============================================================================
// Heuristic 1: Linear Arrangement Analysis
// ============================================================================

/**
 * Analyzes the linear spatial arrangement of elements to determine
 * if they follow a horizontal or vertical pattern.
 *
 * @param elements - Elements to analyze
 * @returns Analysis of linear arrangement with confidence score
 */
function analyzeLinearArrangement(elements: readonly ProximityElement[]): {
  readonly direction: AutoLayoutDirection;
  readonly score: number;
  readonly reasoning: string;
} {
  if (elements.length < 2) {
    return {
      direction: 'horizontal',
      score: 0.5,
      reasoning: "Insufficient elements for arrangement analysis"
    };
  }

  // Analyze horizontal arrangement (side-by-side)
  const horizontalScore = calculateHorizontalArrangementScore(elements);

  // Analyze vertical arrangement (stacked)
  const verticalScore = calculateVerticalArrangementScore(elements);

  // Determine winner and confidence
  const direction: AutoLayoutDirection = horizontalScore > verticalScore ? 'horizontal' : 'vertical';
  const score = Math.max(horizontalScore, verticalScore);

  const reasoning = `Linear arrangement: horizontal=${horizontalScore.toFixed(2)}, vertical=${verticalScore.toFixed(2)}`;

  return { direction, score, reasoning };
}

/**
 * Calculates how well elements align in a horizontal (side-by-side) arrangement.
 */
function calculateHorizontalArrangementScore(elements: readonly ProximityElement[]): number {
  // Sort elements by x position (left to right)
  const sortedByX = [...elements].sort((a, b) => a.bounds.x - b.bounds.x);

  // Check vertical alignment consistency
  const centerYs = sortedByX.map(el => el.bounds.y + el.bounds.height / 2);
  const alignmentScore = calculateAlignmentScore(centerYs);

  // Check horizontal spacing consistency
  const xPositions = sortedByX.map(el => el.bounds.x);
  const spacingScore = calculateSpacingConsistency(xPositions, sortedByX.map(el => el.bounds.width));

  // Check for overlaps (bad for horizontal)
  const overlapPenalty = calculateHorizontalOverlapPenalty(sortedByX);

  // Combine factors
  return alignmentScore * spacingScore * overlapPenalty;
}

/**
 * Calculates how well elements align in a vertical (stacked) arrangement.
 */
function calculateVerticalArrangementScore(elements: readonly ProximityElement[]): number {
  // Sort elements by y position (top to bottom)
  const sortedByY = [...elements].sort((a, b) => a.bounds.y - b.bounds.y);

  // Check horizontal alignment consistency
  const centerXs = sortedByY.map(el => el.bounds.x + el.bounds.width / 2);
  const alignmentScore = calculateAlignmentScore(centerXs);

  // Check vertical spacing consistency
  const yPositions = sortedByY.map(el => el.bounds.y);
  const spacingScore = calculateSpacingConsistency(yPositions, sortedByY.map(el => el.bounds.height));

  // Check for overlaps (bad for vertical)
  const overlapPenalty = calculateVerticalOverlapPenalty(sortedByY);

  // Combine factors
  return alignmentScore * spacingScore * overlapPenalty;
}

/**
 * Calculates alignment score based on variance of center positions.
 */
function calculateAlignmentScore(positions: readonly number[]): number {
  if (positions.length < 2) return 1;

  const mean = positions.reduce((sum, pos) => sum + pos, 0) / positions.length;
  const variance = positions.reduce((sum, pos) => sum + Math.pow(pos - mean, 2), 0) / positions.length;
  const standardDeviation = Math.sqrt(variance);

  // Lower standard deviation = better alignment
  // Normalize by maximum reasonable deviation (200px)
  return Math.max(0, 1 - (standardDeviation / 200));
}

/**
 * Calculates spacing consistency score.
 */
function calculateSpacingConsistency(positions: readonly number[], sizes: readonly number[]): number {
  if (positions.length < 2) return 1;

  const gaps: number[] = [];
  for (let i = 0; i < positions.length - 1; i++) {
    const gap = positions[i + 1] - (positions[i] + sizes[i]);
    gaps.push(Math.max(0, gap)); // Negative gaps indicate overlap
  }

  if (gaps.length === 0) return 1;

  // Calculate variance in gap sizes
  const meanGap = gaps.reduce((sum, gap) => sum + gap, 0) / gaps.length;
  const gapVariance = gaps.reduce((sum, gap) => sum + Math.pow(gap - meanGap, 2), 0) / gaps.length;
  const gapStdDev = Math.sqrt(gapVariance);

  // Lower variance in gaps = more consistent spacing = better score
  // Normalize by reasonable maximum deviation (50px)
  return Math.max(0, 1 - (gapStdDev / 50));
}

/**
 * Calculates penalty for horizontal overlaps.
 */
function calculateHorizontalOverlapPenalty(elements: readonly ProximityElement[]): number {
  let penalty = 1.0;

  for (let i = 0; i < elements.length - 1; i++) {
    const current = elements[i];
    const next = elements[i + 1];

    // Check if current element's right edge overlaps with next element's left edge
    const overlap = (current.bounds.x + current.bounds.width) - next.bounds.x;
    if (overlap > 0) {
      // Penalize overlaps (bad for horizontal arrangement)
      penalty *= Math.max(0, 1 - (overlap / 50)); // Normalize by 50px max overlap
    }
  }

  return penalty;
}

/**
 * Calculates penalty for vertical overlaps.
 */
function calculateVerticalOverlapPenalty(elements: readonly ProximityElement[]): number {
  let penalty = 1.0;

  for (let i = 0; i < elements.length - 1; i++) {
    const current = elements[i];
    const next = elements[i + 1];

    // Check if current element's bottom edge overlaps with next element's top edge
    const overlap = (current.bounds.y + current.bounds.height) - next.bounds.y;
    if (overlap > 0) {
      // Penalize overlaps (bad for vertical arrangement)
      penalty *= Math.max(0, 1 - (overlap / 50)); // Normalize by 50px max overlap
    }
  }

  return penalty;
}

// ============================================================================
// Heuristic 2: Content Flow Analysis
// ============================================================================

/**
 * Analyzes the content and semantic flow of elements to determine
 * the natural reading/interaction direction.
 *
 * @param elements - Elements to analyze
 * @returns Analysis of content flow with confidence score
 */
function analyzeContentFlow(elements: readonly ProximityElement[]): {
  readonly direction: AutoLayoutDirection;
  readonly score: number;
  readonly reasoning: string;
} {
  // Analyze text content patterns
  const textFlowScore = analyzeTextFlow(elements);

  // Analyze UI component patterns
  const uiFlowScore = analyzeUIComponentFlow(elements);

  // Analyze size relationships
  const sizeFlowScore = analyzeSizeFlow(elements);

  // Combine flow analyses
  const horizontalFlow = (textFlowScore.horizontal + uiFlowScore.horizontal + sizeFlowScore.horizontal) / 3;
  const verticalFlow = (textFlowScore.vertical + uiFlowScore.vertical + sizeFlowScore.vertical) / 3;

  const direction: AutoLayoutDirection = horizontalFlow > verticalFlow ? 'horizontal' : 'vertical';
  const score = Math.max(horizontalFlow, verticalFlow);

  const reasoning = `Content flow: text=${JSON.stringify(textFlowScore)}, ui=${JSON.stringify(uiFlowScore)}, size=${JSON.stringify(sizeFlowScore)}`;

  return { direction, score, reasoning };
}

/**
 * Analyzes text content to determine reading flow.
 */
function analyzeTextFlow(elements: readonly ProximityElement[]): {
  readonly horizontal: number;
  readonly vertical: number;
} {
  const textElements = elements.filter(e => e.node.type === 'TEXT');

  if (textElements.length === 0) {
    return { horizontal: 0.5, vertical: 0.5 }; // Neutral if no text
  }

  if (textElements.length === 1) {
    return { horizontal: 0.6, vertical: 0.4 }; // Slight preference for horizontal
  }

  // Analyze text content patterns
  let horizontalIndicators = 0;
  let verticalIndicators = 0;

  for (const element of textElements) {
    if (element.node.type === 'TEXT') {
      const textNode = element.node as TextNode;
      const text = textNode.characters.toLowerCase();

      // Check for navigation-like patterns (horizontal)
      if (
        text.includes('•') ||
        text.includes('|') ||
        text.includes('home') ||
        text.includes('about') ||
        text.includes('contact') ||
        text.includes('menu')
      ) {
        horizontalIndicators++;
      }

      // Check for list-like patterns (vertical)
      if (
        text.match(/^\d+\./) ||
        text.match(/^[•▪▫-]/) ||
        text.includes('\n') ||
        text.length < 20 // Short text often stacks vertically
      ) {
        verticalIndicators++;
      }
    }
  }

  const total = horizontalIndicators + verticalIndicators;
  if (total === 0) {
    return { horizontal: 0.5, vertical: 0.5 };
  }

  return {
    horizontal: horizontalIndicators / total,
    vertical: verticalIndicators / total
  };
}

/**
 * Analyzes UI component patterns.
 */
function analyzeUIComponentFlow(elements: readonly ProximityElement[]): {
  readonly horizontal: number;
  readonly vertical: number;
} {
  let horizontalScore = 0.5;
  let verticalScore = 0.5;

  // Check for button-like elements (often horizontal)
  const buttonLikeCount = elements.filter(e =>
    e.node.name.toLowerCase().includes('button') ||
    e.node.name.toLowerCase().includes('cta') ||
    e.node.name.toLowerCase().includes('link')
  ).length;

  // Check for card-like elements (often vertical)
  const cardLikeCount = elements.filter(e =>
    e.node.name.toLowerCase().includes('card') ||
    e.node.name.toLowerCase().includes('item') ||
    e.node.name.toLowerCase().includes('tile')
  ).length;

  if (buttonLikeCount > 0) {
    horizontalScore += 0.2;
  }

  if (cardLikeCount > 0) {
    verticalScore += 0.2;
  }

  // Normalize scores
  const total = horizontalScore + verticalScore;
  return {
    horizontal: horizontalScore / total,
    vertical: verticalScore / total
  };
}

/**
 * Analyzes size relationships for flow direction.
 */
function analyzeSizeFlow(elements: readonly ProximityElement[]): {
  readonly horizontal: number;
  readonly vertical: number;
} {
  if (elements.length < 2) {
    return { horizontal: 0.5, vertical: 0.5 };
  }

  // Check if elements have similar widths (suggests vertical stacking)
  const widths = elements.map(e => e.bounds.width);
  const widthVariance = calculateVariance(widths);
  const avgWidth = widths.reduce((sum, w) => sum + w, 0) / widths.length;
  const widthConsistency = 1 - Math.min(1, widthVariance / (avgWidth * avgWidth));

  // Check if elements have similar heights (suggests horizontal arrangement)
  const heights = elements.map(e => e.bounds.height);
  const heightVariance = calculateVariance(heights);
  const avgHeight = heights.reduce((sum, h) => sum + h, 0) / heights.length;
  const heightConsistency = 1 - Math.min(1, heightVariance / (avgHeight * avgHeight));

  return {
    horizontal: heightConsistency,
    vertical: widthConsistency
  };
}

/**
 * Calculates variance of a numeric array.
 */
function calculateVariance(values: readonly number[]): number {
  const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
  return values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
}

// ============================================================================
// Heuristic 3: Aspect Ratio Analysis
// ============================================================================

/**
 * Analyzes the overall aspect ratio of the element group to determine
 * the most natural layout direction.
 *
 * @param elements - Elements to analyze
 * @returns Analysis of aspect ratio implications
 */
function analyzeAspectRatio(elements: readonly ProximityElement[]): {
  readonly direction: AutoLayoutDirection;
  readonly score: number;
  readonly reasoning: string;
} {
  if (elements.length === 0) {
    return {
      direction: 'horizontal',
      score: 0.5,
      reasoning: "No elements to analyze"
    };
  }

  // Calculate bounding box of all elements
  const bounds = calculateGroupBounds(elements);
  const aspectRatio = bounds.width / bounds.height;

  // Analyze aspect ratio implications
  let horizontalScore: number;
  let verticalScore: number;
  let reasoning: string;

  if (aspectRatio > 2.0) {
    // Very wide - strongly suggests horizontal layout
    horizontalScore = 0.9;
    verticalScore = 0.1;
    reasoning = `Very wide aspect ratio (${aspectRatio.toFixed(2)}) strongly suggests horizontal layout`;
  } else if (aspectRatio > 1.5) {
    // Wide - moderately suggests horizontal layout
    horizontalScore = 0.7;
    verticalScore = 0.3;
    reasoning = `Wide aspect ratio (${aspectRatio.toFixed(2)}) suggests horizontal layout`;
  } else if (aspectRatio < 0.5) {
    // Very tall - strongly suggests vertical layout
    horizontalScore = 0.1;
    verticalScore = 0.9;
    reasoning = `Very tall aspect ratio (${aspectRatio.toFixed(2)}) strongly suggests vertical layout`;
  } else if (aspectRatio < 0.67) {
    // Tall - moderately suggests vertical layout
    horizontalScore = 0.3;
    verticalScore = 0.7;
    reasoning = `Tall aspect ratio (${aspectRatio.toFixed(2)}) suggests vertical layout`;
  } else {
    // Nearly square - slight preference based on subtle ratio
    if (aspectRatio > 1.0) {
      horizontalScore = 0.6;
      verticalScore = 0.4;
      reasoning = `Slightly wide aspect ratio (${aspectRatio.toFixed(2)}) weakly suggests horizontal layout`;
    } else {
      horizontalScore = 0.4;
      verticalScore = 0.6;
      reasoning = `Slightly tall aspect ratio (${aspectRatio.toFixed(2)}) weakly suggests vertical layout`;
    }
  }

  const direction: AutoLayoutDirection = horizontalScore > verticalScore ? 'horizontal' : 'vertical';
  const score = Math.max(horizontalScore, verticalScore);

  return { direction, score, reasoning };
}

/**
 * Calculates the bounding box that encompasses all elements in a group.
 */
function calculateGroupBounds(elements: readonly ProximityElement[]): {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
} {
  if (elements.length === 0) {
    return { x: 0, y: 0, width: 0, height: 0 };
  }

  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  for (const element of elements) {
    const bounds = element.bounds;
    minX = Math.min(minX, bounds.x);
    minY = Math.min(minY, bounds.y);
    maxX = Math.max(maxX, bounds.x + bounds.width);
    maxY = Math.max(maxY, bounds.y + bounds.height);
  }

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY
  };
}

// ============================================================================
// Heuristic Combination
// ============================================================================

/**
 * Combines multiple direction heuristics using weighted scoring.
 *
 * @param heuristics - Array of heuristics with weights
 * @returns Combined direction decision with confidence
 */
function combineHeuristics(heuristics: readonly DirectionHeuristic[]): {
  readonly direction: AutoLayoutDirection;
  readonly confidence: number;
} {
  let horizontalScore = 0;
  let verticalScore = 0;
  let totalWeight = 0;

  for (const heuristic of heuristics) {
    const weight = heuristic.weight;
    const score = heuristic.analysis.score;

    if (heuristic.analysis.direction === 'horizontal') {
      horizontalScore += weight * score;
      verticalScore += weight * (1 - score); // Inverse for the other direction
    } else {
      verticalScore += weight * score;
      horizontalScore += weight * (1 - score); // Inverse for the other direction
    }

    totalWeight += weight;
  }

  // Normalize scores
  if (totalWeight > 0) {
    horizontalScore /= totalWeight;
    verticalScore /= totalWeight;
  }

  // Determine winner and confidence
  const direction: AutoLayoutDirection = horizontalScore > verticalScore ? 'horizontal' : 'vertical';
  const confidence = Math.max(horizontalScore, verticalScore);

  // Apply minimum confidence threshold
  const finalConfidence = confidence >= MIN_CONFIDENCE_THRESHOLD ? confidence : 0.5;

  return { direction, confidence: finalConfidence };
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Creates empty direction factors for error cases.
 */
function createEmptyFactors(): DirectionFactors {
  const emptyFactor = {
    direction: 'horizontal' as AutoLayoutDirection,
    score: 0,
    reasoning: "No analysis performed"
  };

  return {
    arrangement: emptyFactor,
    flow: emptyFactor,
    aspect: emptyFactor
  };
}

/**
 * Creates direction factors for single element cases.
 */
function createSingleElementFactors(): DirectionFactors {
  const singleFactor = {
    direction: 'horizontal' as AutoLayoutDirection,
    score: 1.0,
    reasoning: "Single element - default to horizontal"
  };

  return {
    arrangement: singleFactor,
    flow: singleFactor,
    aspect: singleFactor
  };
}