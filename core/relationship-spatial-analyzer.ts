/**
 * Spatial Relationship Analysis
 *
 * Detects sophisticated spatial relationships in design compositions:
 * - Anchor patterns (foundational elements with relative positioning)
 * - Flow vectors (directional movement and visual paths)
 * - Alignment grids (invisible structural systems)
 * - Enhanced proximity clusters (beyond basic distance grouping)
 */

import { debugFixLog } from "./debug.js";
import { getFrameRelativeBounds } from "./proximity-spatial-analysis.js";
// import { calculateBoundingBox } from "./proximity-spatial-analysis.js"; // For future use
import type {
  SpatialRelationship,
  AnchorPattern,
  FlowPattern,
  AlignmentGrid,
  // ProximityCluster, // For future cluster integration
  ElementVisualProperties,
  NormalizedPoint,
  NormalizedBounds,
  FlowVector
} from "../types/design-relationships.js";
import type { Rectangle } from "../types/proximity-types.js";

// ============================================================================
// Configuration
// ============================================================================

interface SpatialAnalysisConfig {
  readonly anchorDetectionThreshold: number; // Min influence to be considered anchor
  readonly flowAngleThreshold: number; // Degrees - sensitivity for flow detection
  readonly alignmentTolerance: number; // Pixels - tolerance for alignment detection
  readonly minimumFlowDistance: number; // Min distance for flow vectors
  readonly confidenceThreshold: number; // Min confidence to include relationship
}

const DEFAULT_SPATIAL_CONFIG: SpatialAnalysisConfig = {
  anchorDetectionThreshold: 0.3,
  flowAngleThreshold: 15,
  alignmentTolerance: 8,
  minimumFlowDistance: 50,
  confidenceThreshold: 0.5
};

// ============================================================================
// Coordinate Conversion Utilities
// ============================================================================

/**
 * Converts frame-relative rectangle to normalized coordinates (0-1)
 */
function rectangleToNormalized(rect: Rectangle, frameWidth: number, frameHeight: number): NormalizedBounds {
  return {
    left: rect.x / frameWidth,
    top: rect.y / frameHeight,
    right: (rect.x + rect.width) / frameWidth,
    bottom: (rect.y + rect.height) / frameHeight
  };
}

/**
 * Gets center point of normalized bounds
 */
function getCenterPoint(bounds: NormalizedBounds): NormalizedPoint {
  return {
    x: (bounds.left + bounds.right) / 2,
    y: (bounds.top + bounds.bottom) / 2
  };
}

/**
 * Calculates normalized distance between two points
 */
function calculateNormalizedDistance(p1: NormalizedPoint, p2: NormalizedPoint): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Calculates angle between two points (in degrees)
 */
function calculateAngle(from: NormalizedPoint, to: NormalizedPoint): number {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  return (Math.atan2(dy, dx) * 180 / Math.PI + 360) % 360;
}

// ============================================================================
// Element Analysis
// ============================================================================

/**
 * Builds element properties for spatial analysis
 */
function buildElementProperties(
  frame: FrameNode,
  config: SpatialAnalysisConfig = DEFAULT_SPATIAL_CONFIG
): ElementVisualProperties[] {
  const frameAbsoluteBounds = frame.absoluteBoundingBox;
  if (!frameAbsoluteBounds) {
    debugFixLog("Frame missing absolute bounds for spatial analysis");
    return [];
  }

  const frameRect = {
    x: 0, y: 0,
    width: frameAbsoluteBounds.width,
    height: frameAbsoluteBounds.height
  };

  const elements: ElementVisualProperties[] = [];

  function processNode(node: SceneNode): void {
    if (node.visible === false) return;

    const bounds = getFrameRelativeBounds(node, frameAbsoluteBounds!);
    if (!bounds || bounds.width < 1 || bounds.height < 1) return;

    const normalizedBounds = rectangleToNormalized(bounds, frameRect.width, frameRect.height);
    const area = (normalizedBounds.right - normalizedBounds.left) *
                 (normalizedBounds.bottom - normalizedBounds.top);

    let fontSize: number | undefined;
    let fontWeight: string | undefined;

    // Extract text properties if applicable
    if (node.type === "TEXT") {
      fontSize = typeof node.fontSize === "number" ? node.fontSize : undefined;
      fontWeight = typeof node.fontWeight === "string" ? node.fontWeight : undefined;
    }

    elements.push({
      elementId: node.id,
      bounds: normalizedBounds,
      area,
      fontSize,
      fontWeight
    });

    // Process children
    if ("children" in node) {
      for (const child of node.children) {
        processNode(child);
      }
    }
  }

  processNode(frame);
  return elements;
}

// ============================================================================
// Anchor Pattern Detection
// ============================================================================

/**
 * Detects anchor patterns - elements that serve as compositional foundations
 * with other elements positioned relative to them.
 */
function detectAnchorPatterns(
  elements: ElementVisualProperties[],
  config: SpatialAnalysisConfig = DEFAULT_SPATIAL_CONFIG
): AnchorPattern[] {
  if (elements.length < 3) return []; // Need at least 3 elements for anchor detection

  const patterns: AnchorPattern[] = [];

  // Analyze each element as potential anchor
  for (const candidateAnchor of elements) {
    const anchorCenter = getCenterPoint(candidateAnchor.bounds);
    const anchoredElements: AnchorPattern['anchoredElements'][0][] = [];

    // Find elements that appear anchored to this candidate
    for (const element of elements) {
      if (element.elementId === candidateAnchor.elementId) continue;

      const elementCenter = getCenterPoint(element.bounds);
      const distance = calculateNormalizedDistance(anchorCenter, elementCenter);

      // Check if element appears anchored (consistent distance and direction)
      if (distance > 0.05 && distance < 0.8) { // Reasonable anchoring distance
        const anchorStrength = calculateAnchorStrength(candidateAnchor, element, elements);

        if (anchorStrength > config.anchorDetectionThreshold) {
          anchoredElements.push({
            elementId: element.elementId,
            relativePosition: {
              x: elementCenter.x - anchorCenter.x,
              y: elementCenter.y - anchorCenter.y
            },
            anchorStrength
          });
        }
      }
    }

    // Only create pattern if multiple elements are anchored
    if (anchoredElements.length >= 2) {
      const confidence = calculateAnchorConfidence(candidateAnchor, anchoredElements, elements);

      if (confidence >= config.confidenceThreshold) {
        patterns.push({
          type: 'anchor',
          anchorElementId: candidateAnchor.elementId,
          anchoredElements,
          confidence
        });
      }
    }
  }

  return patterns.sort((a, b) => b.confidence - a.confidence).slice(0, 3); // Top 3 anchors
}

/**
 * Calculates how strongly an element appears anchored to another
 */
function calculateAnchorStrength(
  anchor: ElementVisualProperties,
  element: ElementVisualProperties,
  allElements: ElementVisualProperties[]
): number {
  const anchorCenter = getCenterPoint(anchor.bounds);
  const elementCenter = getCenterPoint(element.bounds);

  // Factor 1: Anchor's visual weight (size)
  const anchorWeight = anchor.area;

  // Factor 2: Consistent positioning relative to anchor
  const consistencyScore = calculatePositionalConsistency(anchor, element, allElements);

  // Factor 3: Distance factor (closer = stronger anchor)
  const distance = calculateNormalizedDistance(anchorCenter, elementCenter);
  const distanceScore = Math.max(0, 1 - distance * 2);

  return (anchorWeight * 0.4 + consistencyScore * 0.4 + distanceScore * 0.2);
}

/**
 * Calculates how consistently an element is positioned relative to an anchor
 */
function calculatePositionalConsistency(
  anchor: ElementVisualProperties,
  element: ElementVisualProperties,
  allElements: ElementVisualProperties[]
): number {
  const anchorCenter = getCenterPoint(anchor.bounds);
  const elementCenter = getCenterPoint(element.bounds);
  const targetAngle = calculateAngle(anchorCenter, elementCenter);

  let consistentElements = 0;
  let totalElements = 0;

  for (const other of allElements) {
    if (other.elementId === anchor.elementId || other.elementId === element.elementId) continue;

    const otherCenter = getCenterPoint(other.bounds);
    const otherAngle = calculateAngle(anchorCenter, otherCenter);
    const angleDiff = Math.min(
      Math.abs(targetAngle - otherAngle),
      360 - Math.abs(targetAngle - otherAngle)
    );

    if (angleDiff < 45) { // Similar angle = consistent positioning
      consistentElements++;
    }
    totalElements++;
  }

  return totalElements > 0 ? consistentElements / totalElements : 0;
}

/**
 * Calculates confidence score for anchor pattern
 */
function calculateAnchorConfidence(
  anchor: ElementVisualProperties,
  anchoredElements: AnchorPattern['anchoredElements'],
  allElements: ElementVisualProperties[]
): number {
  // More anchored elements = higher confidence
  const countScore = Math.min(1, anchoredElements.length / 4);

  // Average anchor strength
  const avgStrength = anchoredElements.reduce((sum, el) => sum + el.anchorStrength, 0) / anchoredElements.length;

  // Anchor size relative to frame
  const sizeScore = Math.min(1, anchor.area * 3); // Larger anchors more confident

  return (countScore * 0.4 + avgStrength * 0.4 + sizeScore * 0.2);
}

// ============================================================================
// Flow Pattern Detection
// ============================================================================

/**
 * Detects flow patterns - directional movement in the composition
 */
function detectFlowPatterns(
  elements: ElementVisualProperties[],
  config: SpatialAnalysisConfig = DEFAULT_SPATIAL_CONFIG
): FlowPattern[] {
  if (elements.length < 3) return [];

  const flowVectors: FlowVector[] = [];
  const patterns: FlowPattern[] = [];

  // Calculate all potential flow vectors between elements
  for (let i = 0; i < elements.length; i++) {
    for (let j = i + 1; j < elements.length; j++) {
      const elem1 = elements[i];
      const elem2 = elements[j];

      const center1 = getCenterPoint(elem1.bounds);
      const center2 = getCenterPoint(elem2.bounds);
      const distance = calculateNormalizedDistance(center1, center2);

      if (distance >= config.minimumFlowDistance / 1000) { // Convert to normalized
        const direction = calculateAngle(center1, center2);

        flowVectors.push({
          direction,
          magnitude: Math.min(1, distance * 2), // Normalize magnitude
          from: center1,
          to: center2
        });
      }
    }
  }

  // Group vectors by similar direction to find flow patterns
  const flowGroups = groupVectorsByDirection(flowVectors, config.flowAngleThreshold);

  for (const group of flowGroups) {
    if (group.vectors.length >= 2) { // Need multiple vectors for pattern
      const flowType = classifyFlowType(group.vectors);
      const confidence = calculateFlowConfidence(group.vectors, elements);

      if (confidence >= config.confidenceThreshold) {
        patterns.push({
          type: 'flow',
          flowType,
          vectors: group.vectors,
          involvedElements: extractInvolvedElements(group.vectors, elements),
          confidence
        });
      }
    }
  }

  return patterns;
}

/**
 * Groups flow vectors by similar direction
 */
function groupVectorsByDirection(
  vectors: FlowVector[],
  angleThreshold: number
): { vectors: FlowVector[]; avgDirection: number }[] {
  const groups: { vectors: FlowVector[]; avgDirection: number }[] = [];

  for (const vector of vectors) {
    let foundGroup = false;

    for (const group of groups) {
      const angleDiff = Math.min(
        Math.abs(vector.direction - group.avgDirection),
        360 - Math.abs(vector.direction - group.avgDirection)
      );

      if (angleDiff <= angleThreshold) {
        group.vectors.push(vector);
        // Recalculate average direction
        const totalDirection = group.vectors.reduce((sum, v) => sum + v.direction, 0);
        group.avgDirection = totalDirection / group.vectors.length;
        foundGroup = true;
        break;
      }
    }

    if (!foundGroup) {
      groups.push({
        vectors: [vector],
        avgDirection: vector.direction
      });
    }
  }

  return groups;
}

/**
 * Classifies the type of flow pattern
 */
function classifyFlowType(vectors: FlowVector[]): FlowPattern['flowType'] {
  if (vectors.length < 2) return 'linear';

  const directions = vectors.map(v => v.direction);
  const directionVariance = calculateDirectionVariance(directions);

  if (directionVariance < 15) return 'linear';
  if (directionVariance < 45) return 'diagonal';
  if (directionVariance < 90) return 'spiral';
  return 'circular';
}

/**
 * Calculates variance in direction angles
 */
function calculateDirectionVariance(directions: number[]): number {
  if (directions.length < 2) return 0;

  const mean = directions.reduce((sum, dir) => sum + dir, 0) / directions.length;
  const variance = directions.reduce((sum, dir) => {
    const diff = Math.min(Math.abs(dir - mean), 360 - Math.abs(dir - mean));
    return sum + diff * diff;
  }, 0) / directions.length;

  return Math.sqrt(variance);
}

/**
 * Calculates confidence for flow pattern
 */
function calculateFlowConfidence(vectors: FlowVector[], elements: ElementVisualProperties[]): number {
  const avgMagnitude = vectors.reduce((sum, v) => sum + v.magnitude, 0) / vectors.length;
  const vectorCount = Math.min(1, vectors.length / 3); // More vectors = higher confidence
  const strengthScore = Math.min(1, avgMagnitude * 1.5);

  return (vectorCount * 0.6 + strengthScore * 0.4);
}

/**
 * Extracts element IDs involved in flow vectors
 */
function extractInvolvedElements(vectors: FlowVector[], elements: ElementVisualProperties[]): string[] {
  const involvedIds = new Set<string>();

  for (const vector of vectors) {
    // Find elements at vector start and end points
    for (const element of elements) {
      const center = getCenterPoint(element.bounds);

      if (calculateNormalizedDistance(center, vector.from) < 0.05 ||
          calculateNormalizedDistance(center, vector.to) < 0.05) {
        involvedIds.add(element.elementId);
      }
    }
  }

  return Array.from(involvedIds);
}

// ============================================================================
// Alignment Grid Detection
// ============================================================================

/**
 * Detects alignment grids - invisible structural systems organizing elements
 */
function detectAlignmentGrids(
  elements: ElementVisualProperties[],
  config: SpatialAnalysisConfig = DEFAULT_SPATIAL_CONFIG
): AlignmentGrid[] {
  if (elements.length < 3) return [];

  const grids: AlignmentGrid[] = [];

  // Detect horizontal alignments
  const horizontalGrid = detectHorizontalAlignments(elements, config);
  if (horizontalGrid) grids.push(horizontalGrid);

  // Detect vertical alignments
  const verticalGrid = detectVerticalAlignments(elements, config);
  if (verticalGrid) grids.push(verticalGrid);

  return grids;
}

/**
 * Detects horizontal alignment patterns
 */
function detectHorizontalAlignments(
  elements: ElementVisualProperties[],
  config: SpatialAnalysisConfig
): AlignmentGrid | null {
  const tolerance = config.alignmentTolerance / 1000; // Convert to normalized
  const alignmentLines: {
    position: number;
    elementIds: string[];
    strength: number;
  }[] = [];

  // Group elements by similar Y positions (top, center, bottom)
  for (const element of elements) {
    const topY = element.bounds.top;
    const centerY = (element.bounds.top + element.bounds.bottom) / 2;
    const bottomY = element.bounds.bottom;

    [topY, centerY, bottomY].forEach(yPosition => {
      let foundLine = false;

      for (const line of alignmentLines) {
        if (Math.abs(line.position - yPosition) <= tolerance) {
          line.elementIds.push(element.elementId);
          line.strength = Math.min(1, line.elementIds.length / elements.length);
          foundLine = true;
          break;
        }
      }

      if (!foundLine) {
        alignmentLines.push({
          position: yPosition,
          strength: 1 / elements.length,
          elementIds: [element.elementId]
        });
      }
    });
  }

  // Filter to significant alignment lines (2+ elements)
  const significantLines = alignmentLines.filter(line => line.elementIds.length >= 2);

  if (significantLines.length >= 2) {
    const confidence = calculateAlignmentConfidence(significantLines, elements.length);

    if (confidence >= config.confidenceThreshold) {
      return {
        type: 'alignment',
        gridType: 'horizontal',
        alignmentLines: significantLines,
        confidence
      };
    }
  }

  return null;
}

/**
 * Detects vertical alignment patterns
 */
function detectVerticalAlignments(
  elements: ElementVisualProperties[],
  config: SpatialAnalysisConfig
): AlignmentGrid | null {
  const tolerance = config.alignmentTolerance / 1000; // Convert to normalized
  const alignmentLines: {
    position: number;
    elementIds: string[];
    strength: number;
  }[] = [];

  // Group elements by similar X positions (left, center, right)
  for (const element of elements) {
    const leftX = element.bounds.left;
    const centerX = (element.bounds.left + element.bounds.right) / 2;
    const rightX = element.bounds.right;

    [leftX, centerX, rightX].forEach(xPosition => {
      let foundLine = false;

      for (const line of alignmentLines) {
        if (Math.abs(line.position - xPosition) <= tolerance) {
          line.elementIds.push(element.elementId);
          line.strength = Math.min(1, line.elementIds.length / elements.length);
          foundLine = true;
          break;
        }
      }

      if (!foundLine) {
        alignmentLines.push({
          position: xPosition,
          strength: 1 / elements.length,
          elementIds: [element.elementId]
        });
      }
    });
  }

  // Filter to significant alignment lines (2+ elements)
  const significantLines = alignmentLines.filter(line => line.elementIds.length >= 2);

  if (significantLines.length >= 2) {
    const confidence = calculateAlignmentConfidence(significantLines, elements.length);

    if (confidence >= config.confidenceThreshold) {
      return {
        type: 'alignment',
        gridType: 'vertical',
        alignmentLines: significantLines,
        confidence
      };
    }
  }

  return null;
}

/**
 * Calculates confidence for alignment grid
 */
function calculateAlignmentConfidence(
  alignmentLines: AlignmentGrid['alignmentLines'],
  totalElements: number
): number {
  const avgStrength = alignmentLines.reduce((sum, line) => sum + line.strength, 0) / alignmentLines.length;
  const lineCount = Math.min(1, alignmentLines.length / 3);

  return (avgStrength * 0.7 + lineCount * 0.3);
}

// ============================================================================
// Main Spatial Analysis Function
// ============================================================================

/**
 * Performs complete spatial relationship analysis on a frame
 */
export function analyzeSpatialRelationships(
  frame: FrameNode,
  config: Partial<SpatialAnalysisConfig> = {}
): SpatialRelationship[] {
  const fullConfig = { ...DEFAULT_SPATIAL_CONFIG, ...config };
  const startTime = Date.now();

  debugFixLog("Starting spatial relationship analysis", {
    frameId: frame.id,
    frameName: frame.name
  });

  try {
    // Build element properties for analysis
    const elements = buildElementProperties(frame, fullConfig);

    if (elements.length < 2) {
      debugFixLog("Insufficient elements for spatial analysis", { elementCount: elements.length });
      return [];
    }

    const relationships: SpatialRelationship[] = [];

    // Detect anchor patterns
    const anchorPatterns = detectAnchorPatterns(elements, fullConfig);
    relationships.push(...anchorPatterns);

    // Detect flow patterns
    const flowPatterns = detectFlowPatterns(elements, fullConfig);
    relationships.push(...flowPatterns);

    // Detect alignment grids
    const alignmentGrids = detectAlignmentGrids(elements, fullConfig);
    relationships.push(...alignmentGrids);

    const processingTime = Date.now() - startTime;

    debugFixLog("Spatial relationship analysis complete", {
      relationships: relationships.length,
      anchors: anchorPatterns.length,
      flows: flowPatterns.length,
      alignments: alignmentGrids.length,
      processingTimeMs: processingTime
    });

    return relationships;

  } catch (error) {
    debugFixLog("Error in spatial relationship analysis", { error: String(error) });
    return [];
  }
}