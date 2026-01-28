/**
 * Compositional Relationship Analysis
 *
 * Detects sophisticated compositional relationships in design:
 * - Balance analysis (symmetrical, asymmetrical, radial, dynamic)
 * - Tension points (areas of visual energy and conflict)
 * - Breathing room patterns (negative space distribution)
 * - Edge relationships (interaction with frame boundaries)
 */

import { debugFixLog } from "./debug.js";
import { getFrameRelativeBounds } from "./proximity-spatial-analysis.js";
import type {
  CompositionalRelationship,
  BalanceAnalysis,
  TensionPoints,
  BreathingRoomPattern,
  ElementVisualProperties,
  NormalizedPoint,
  NormalizedBounds
} from "../types/design-relationships.js";

// ============================================================================
// Configuration
// ============================================================================

interface CompositionalAnalysisConfig {
  readonly balanceThreshold: number; // Sensitivity for balance detection
  readonly tensionDetectionRadius: number; // Search radius for tension areas
  readonly breathingRoomMinSize: number; // Min size for significant negative space
  readonly edgeProximityThreshold: number; // Distance threshold for edge relationships
  readonly confidenceThreshold: number; // Min confidence to include relationship
  readonly maxTensionPoints: number; // Max tension points to detect
}

const DEFAULT_COMPOSITIONAL_CONFIG: CompositionalAnalysisConfig = {
  balanceThreshold: 0.15,
  tensionDetectionRadius: 0.2,
  breathingRoomMinSize: 0.08,
  edgeProximityThreshold: 0.1,
  confidenceThreshold: 0.4,
  maxTensionPoints: 5
};

// ============================================================================
// Element Property Extraction
// ============================================================================

/**
 * Builds element properties for compositional analysis
 */
function buildCompositionalElements(frame: FrameNode): ElementVisualProperties[] {
  const frameAbsoluteBounds = frame.absoluteBoundingBox;
  if (!frameAbsoluteBounds) {
    debugFixLog("Frame missing absolute bounds for compositional analysis");
    return [];
  }

  const elements: ElementVisualProperties[] = [];

  function processNode(node: SceneNode, depth: number = 0): void {
    if (node.visible === false || depth > 4) return;

    const bounds = getFrameRelativeBounds(node, frameAbsoluteBounds!);
    if (!bounds || bounds.width < 2 || bounds.height < 2) return;

    const normalizedBounds: NormalizedBounds = {
      left: bounds.x / frameAbsoluteBounds!.width,
      top: bounds.y / frameAbsoluteBounds!.height,
      right: (bounds.x + bounds.width) / frameAbsoluteBounds!.width,
      bottom: (bounds.y + bounds.height) / frameAbsoluteBounds!.height
    };

    const area = (normalizedBounds.right - normalizedBounds.left) *
                 (normalizedBounds.bottom - normalizedBounds.top);

    elements.push({
      elementId: node.id,
      bounds: normalizedBounds,
      area
    });

    if ("children" in node) {
      for (const child of node.children) {
        processNode(child, depth + 1);
      }
    }
  }

  processNode(frame);
  return elements;
}

// ============================================================================
// Balance Analysis
// ============================================================================

/**
 * Analyzes compositional balance of the design
 */
function analyzeCompositionBalance(
  elements: ElementVisualProperties[],
  config: CompositionalAnalysisConfig = DEFAULT_COMPOSITIONAL_CONFIG
): BalanceAnalysis | null {
  if (elements.length < 2) return null;

  const balanceAnalysis = calculateBalanceMetrics(elements);
  const balanceType = classifyBalanceType(balanceAnalysis, config);
  const balanceElements = calculateElementBalanceContributions(elements, balanceAnalysis.centerOfMass);

  const confidence = calculateBalanceConfidence(balanceAnalysis, balanceElements, elements.length);

  if (confidence >= config.confidenceThreshold) {
    return {
      type: 'balance',
      balanceType,
      balancePoint: balanceAnalysis.centerOfMass,
      balanceElements,
      confidence
    };
  }

  return null;
}

/**
 * Calculates balance metrics for composition
 */
function calculateBalanceMetrics(elements: ElementVisualProperties[]) {
  let totalWeight = 0;
  let weightedX = 0;
  let weightedY = 0;
  let momentOfInertiaX = 0;
  let momentOfInertiaY = 0;

  for (const element of elements) {
    // Calculate visual weight (combination of size and position)
    const weight = calculateElementVisualWeight(element);
    const centerX = (element.bounds.left + element.bounds.right) / 2;
    const centerY = (element.bounds.top + element.bounds.bottom) / 2;

    totalWeight += weight;
    weightedX += centerX * weight;
    weightedY += centerY * weight;
    momentOfInertiaX += weight * centerX * centerX;
    momentOfInertiaY += weight * centerY * centerY;
  }

  const centerOfMass: NormalizedPoint = {
    x: weightedX / totalWeight,
    y: weightedY / totalWeight
  };

  return {
    centerOfMass,
    totalWeight,
    momentOfInertiaX: momentOfInertiaX / totalWeight,
    momentOfInertiaY: momentOfInertiaY / totalWeight,
    weightDistribution: calculateWeightDistribution(elements, centerOfMass)
  };
}

/**
 * Calculates visual weight for balance analysis
 */
function calculateElementVisualWeight(element: ElementVisualProperties): number {
  let weight = element.area; // Base weight from size

  // Position weight (elements farther from center carry more weight)
  const centerX = (element.bounds.left + element.bounds.right) / 2;
  const centerY = (element.bounds.top + element.bounds.bottom) / 2;
  const distanceFromCenter = Math.sqrt(
    Math.pow(centerX - 0.5, 2) + Math.pow(centerY - 0.5, 2)
  );
  weight *= (1 + distanceFromCenter * 0.5); // Increase weight for elements farther from center

  return weight;
}

/**
 * Calculates weight distribution around center of mass
 */
function calculateWeightDistribution(
  elements: ElementVisualProperties[],
  centerOfMass: NormalizedPoint
) {
  const quadrants = { topLeft: 0, topRight: 0, bottomLeft: 0, bottomRight: 0 };

  for (const element of elements) {
    const weight = calculateElementVisualWeight(element);
    const centerX = (element.bounds.left + element.bounds.right) / 2;
    const centerY = (element.bounds.top + element.bounds.bottom) / 2;

    if (centerX <= centerOfMass.x && centerY <= centerOfMass.y) {
      quadrants.topLeft += weight;
    } else if (centerX > centerOfMass.x && centerY <= centerOfMass.y) {
      quadrants.topRight += weight;
    } else if (centerX <= centerOfMass.x && centerY > centerOfMass.y) {
      quadrants.bottomLeft += weight;
    } else {
      quadrants.bottomRight += weight;
    }
  }

  return quadrants;
}

/**
 * Classifies the type of compositional balance
 */
function classifyBalanceType(
  balanceMetrics: ReturnType<typeof calculateBalanceMetrics>,
  config: CompositionalAnalysisConfig
): BalanceAnalysis['balanceType'] {
  const { centerOfMass, weightDistribution } = balanceMetrics;

  // Check for central balance
  const centerDeviation = Math.sqrt(
    Math.pow(centerOfMass.x - 0.5, 2) + Math.pow(centerOfMass.y - 0.5, 2)
  );

  if (centerDeviation < config.balanceThreshold) {
    // Check if weight is evenly distributed
    const weights = Object.values(weightDistribution);
    const avgWeight = weights.reduce((sum, w) => sum + w, 0) / weights.length;
    const weightVariance = weights.reduce((sum, w) => sum + Math.abs(w - avgWeight), 0) / weights.length;

    if (weightVariance / avgWeight < 0.3) {
      return 'symmetrical';
    } else {
      return 'radial';
    }
  } else {
    // Asymmetrical balance - check if it feels intentional
    const totalWeight = Object.values(weightDistribution).reduce((sum, w) => sum + w, 0);
    const maxQuadrantWeight = Math.max(...Object.values(weightDistribution));

    if (maxQuadrantWeight / totalWeight > 0.6) {
      return 'dynamic'; // Strong asymmetry
    } else {
      return 'asymmetrical';
    }
  }
}

/**
 * Calculates how each element contributes to overall balance
 */
function calculateElementBalanceContributions(
  elements: ElementVisualProperties[],
  balancePoint: NormalizedPoint
): BalanceAnalysis['balanceElements'] {
  return elements.map(element => {
    const weight = calculateElementVisualWeight(element);
    const centerX = (element.bounds.left + element.bounds.right) / 2;
    const centerY = (element.bounds.top + element.bounds.bottom) / 2;

    // Calculate lever arm and direction
    const leverX = centerX - balancePoint.x;
    const leverY = centerY - balancePoint.y;
    const leverArm = Math.sqrt(leverX * leverX + leverY * leverY);

    // Balance contribution is weight times lever arm
    const contribution = weight * leverArm;

    // Normalize and add direction
    const direction = leverX >= 0 ? 1 : -1; // Simplified directional influence
    const normalizedContribution = Math.min(1, contribution * direction * 2);

    return {
      elementId: element.elementId,
      balanceContribution: normalizedContribution
    };
  });
}

/**
 * Calculates confidence for balance analysis
 */
function calculateBalanceConfidence(
  balanceMetrics: ReturnType<typeof calculateBalanceMetrics>,
  balanceElements: BalanceAnalysis['balanceElements'],
  totalElements: number
): number {
  // Factor 1: How many elements contribute meaningfully to balance
  const significantContributors = balanceElements.filter(el => Math.abs(el.balanceContribution) > 0.1).length;
  const contributorRatio = significantContributors / totalElements;

  // Factor 2: Distribution quality
  const weights = Object.values(balanceMetrics.weightDistribution);
  const totalWeight = weights.reduce((sum, w) => sum + w, 0);
  const distributionEntropy = calculateEntropy(weights.map(w => w / totalWeight));

  return contributorRatio * 0.6 + distributionEntropy * 0.4;
}

/**
 * Calculates entropy for distribution analysis
 */
function calculateEntropy(probabilities: number[]): number {
  return -probabilities.reduce((entropy, p) => {
    return p > 0 ? entropy + p * Math.log2(p) : entropy;
  }, 0) / Math.log2(probabilities.length);
}

// ============================================================================
// Tension Point Detection
// ============================================================================

/**
 * Detects areas of visual tension and energy in the composition
 */
function detectTensionPoints(
  elements: ElementVisualProperties[],
  config: CompositionalAnalysisConfig = DEFAULT_COMPOSITIONAL_CONFIG
): TensionPoints | null {
  if (elements.length < 3) return null;

  const tensionAreas = findTensionAreas(elements, config);

  if (tensionAreas.length === 0) return null;

  const confidence = calculateTensionConfidence(tensionAreas, elements);

  if (confidence >= config.confidenceThreshold) {
    return {
      type: 'tension',
      tensionAreas: tensionAreas.slice(0, config.maxTensionPoints),
      confidence
    };
  }

  return null;
}

/**
 * Finds areas of visual tension in the composition
 */
function findTensionAreas(
  elements: ElementVisualProperties[],
  config: CompositionalAnalysisConfig
): TensionPoints['tensionAreas'] {
  const tensionAreas: {
    center: NormalizedPoint;
    radius: number;
    tensionType: 'conflict' | 'energy' | 'focus' | 'stress';
    involvedElements: string[];
    intensity: number;
  }[] = [];

  // Check for tension between nearby elements
  for (let i = 0; i < elements.length; i++) {
    for (let j = i + 1; j < elements.length; j++) {
      const elem1 = elements[i];
      const elem2 = elements[j];

      const center1 = getCenterPoint(elem1.bounds);
      const center2 = getCenterPoint(elem2.bounds);
      const distance = calculateDistance(center1, center2);

      if (distance < config.tensionDetectionRadius) {
        const tensionType = classifyTensionType(elem1, elem2, elements);
        const intensity = calculateTensionIntensity(elem1, elem2, distance);

        if (intensity > 0.3) {
          const tensionCenter: NormalizedPoint = {
            x: (center1.x + center2.x) / 2,
            y: (center1.y + center2.y) / 2
          };

          tensionAreas.push({
            center: tensionCenter,
            radius: distance / 2,
            tensionType,
            involvedElements: [elem1.elementId, elem2.elementId] as string[],
            intensity
          });
        }
      }
    }
  }

  // Check for edge tension
  const edgeTensions = detectEdgeTensions(elements, config);
  tensionAreas.push(...(edgeTensions as typeof tensionAreas));

  // Sort by intensity and remove overlaps
  return deduplicateTensionAreas(
    tensionAreas.sort((a, b) => b.intensity - a.intensity)
  );
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
 * Calculates distance between two points
 */
function calculateDistance(p1: NormalizedPoint, p2: NormalizedPoint): number {
  return Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2);
}

/**
 * Classifies the type of tension between elements
 */
function classifyTensionType(
  elem1: ElementVisualProperties,
  elem2: ElementVisualProperties,
  allElements: ElementVisualProperties[]
): TensionPoints['tensionAreas'][0]['tensionType'] {
  const size1 = elem1.area;
  const size2 = elem2.area;
  const sizeRatio = Math.max(size1, size2) / Math.min(size1, size2);

  if (sizeRatio > 3) return 'conflict'; // Very different sizes create conflict
  if (sizeRatio < 1.5 && size1 > 0.1 && size2 > 0.1) return 'stress'; // Similar large elements compete

  // Check positioning for focus vs energy
  const center1 = getCenterPoint(elem1.bounds);
  const center2 = getCenterPoint(elem2.bounds);

  if (Math.abs(center1.x - 0.5) < 0.2 && Math.abs(center1.y - 0.5) < 0.2) return 'focus';
  if (Math.abs(center2.x - 0.5) < 0.2 && Math.abs(center2.y - 0.5) < 0.2) return 'focus';

  return 'energy';
}

/**
 * Calculates intensity of tension between elements
 */
function calculateTensionIntensity(
  elem1: ElementVisualProperties,
  elem2: ElementVisualProperties,
  distance: number
): number {
  // Base intensity from proximity (closer = more tension)
  const proximityIntensity = Math.max(0, 1 - distance * 3);

  // Size relationship factor
  const size1 = elem1.area;
  const size2 = elem2.area;
  const sizeRatio = Math.max(size1, size2) / Math.min(size1, size2);
  const sizeIntensity = Math.min(1, sizeRatio / 3);

  // Combined intensity
  return (proximityIntensity * 0.6 + sizeIntensity * 0.4);
}

/**
 * Detects tension created by elements near frame edges
 */
function detectEdgeTensions(
  elements: ElementVisualProperties[],
  config: CompositionalAnalysisConfig
): TensionPoints['tensionAreas'] {
  const edgeTensions: {
    center: NormalizedPoint;
    radius: number;
    tensionType: 'conflict' | 'energy' | 'focus' | 'stress';
    involvedElements: string[];
    intensity: number;
  }[] = [];

  for (const element of elements) {
    const center = getCenterPoint(element.bounds);

    // Check distance to each edge
    const edgeDistances = {
      top: element.bounds.top,
      right: 1 - element.bounds.right,
      bottom: 1 - element.bounds.bottom,
      left: element.bounds.left
    };

    for (const [, distance] of Object.entries(edgeDistances)) {
      if (distance < config.edgeProximityThreshold) {
        const intensity = Math.max(0, 1 - distance / config.edgeProximityThreshold);

        if (intensity > 0.4) {
          edgeTensions.push({
            center,
            radius: config.edgeProximityThreshold,
            tensionType: distance < 0.02 ? 'stress' : 'energy',
            involvedElements: [element.elementId],
            intensity
          });
        }
      }
    }
  }

  return edgeTensions;
}

/**
 * Removes overlapping tension areas, keeping the strongest
 */
function deduplicateTensionAreas(
  tensionAreas: TensionPoints['tensionAreas']
): TensionPoints['tensionAreas'] {
  const deduplicated: { readonly center: NormalizedPoint; readonly radius: number; readonly tensionType: 'conflict' | 'energy' | 'focus' | 'stress'; readonly involvedElements: readonly string[]; readonly intensity: number; }[] = [];

  for (const area of tensionAreas) {
    let isOverlapping = false;

    for (const existing of deduplicated) {
      const distance = calculateDistance(area.center, existing.center);
      const combinedRadius = area.radius + existing.radius;

      if (distance < combinedRadius * 0.7) {
        isOverlapping = true;
        break;
      }
    }

    if (!isOverlapping) {
      deduplicated.push(area);
    }
  }

  return deduplicated;
}

/**
 * Calculates confidence for tension detection
 */
function calculateTensionConfidence(
  tensionAreas: TensionPoints['tensionAreas'],
  elements: ElementVisualProperties[]
): number {
  const avgIntensity = tensionAreas.reduce((sum, area) => sum + area.intensity, 0) / tensionAreas.length;
  const tensionCoverage = Math.min(1, tensionAreas.length / 3); // Optimal around 3 tension points

  return avgIntensity * 0.7 + tensionCoverage * 0.3;
}

// ============================================================================
// Breathing Room Analysis
// ============================================================================

/**
 * Analyzes negative space distribution and breathing room
 */
function analyzeBreathingRoom(
  elements: ElementVisualProperties[],
  config: CompositionalAnalysisConfig = DEFAULT_COMPOSITIONAL_CONFIG
): BreathingRoomPattern | null {
  if (elements.length === 0) return null;

  const spaceRegions = findSignificantSpaces(elements, config);

  if (spaceRegions.length < 2) return null;

  const confidence = calculateBreathingRoomConfidence(spaceRegions, elements);

  if (confidence >= config.confidenceThreshold) {
    return {
      type: 'breathing',
      spaceDistribution: spaceRegions,
      confidence
    };
  }

  return null;
}

/**
 * Finds significant negative space regions
 */
function findSignificantSpaces(
  elements: ElementVisualProperties[],
  config: CompositionalAnalysisConfig
): BreathingRoomPattern['spaceDistribution'] {
  // Create a grid to analyze negative space
  const gridResolution = 10;
  // Grid cell size for space detection
  // const cellSize = 1 / gridResolution;
  const spaceGrid: boolean[][] = Array(gridResolution).fill(null).map(() => Array(gridResolution).fill(true));

  // Mark occupied areas
  for (const element of elements) {
    const startX = Math.floor(element.bounds.left * gridResolution);
    const endX = Math.ceil(element.bounds.right * gridResolution);
    const startY = Math.floor(element.bounds.top * gridResolution);
    const endY = Math.ceil(element.bounds.bottom * gridResolution);

    for (let x = Math.max(0, startX); x < Math.min(gridResolution, endX); x++) {
      for (let y = Math.max(0, startY); y < Math.min(gridResolution, endY); y++) {
        spaceGrid[y][x] = false;
      }
    }
  }

  // Find connected regions of negative space
  const spaceRegions: {
    region: NormalizedBounds;
    spaceType: 'buffer' | 'separator' | 'focus' | 'flow';
    importance: number;
    adjacentElements: string[];
  }[] = [];
  const visited: boolean[][] = Array(gridResolution).fill(null).map(() => Array(gridResolution).fill(false));

  for (let y = 0; y < gridResolution; y++) {
    for (let x = 0; x < gridResolution; x++) {
      if (spaceGrid[y][x] && !visited[y][x]) {
        const region = floodFillSpace(spaceGrid, visited, x, y, gridResolution);

        if (region.size >= config.breathingRoomMinSize * gridResolution * gridResolution) {
          const spaceType = classifySpaceType(region, elements);
          const importance = calculateSpaceImportance(region, elements);

          spaceRegions.push({
            region: {
              left: region.bounds.minX / gridResolution,
              top: region.bounds.minY / gridResolution,
              right: region.bounds.maxX / gridResolution,
              bottom: region.bounds.maxY / gridResolution
            },
            spaceType,
            importance,
            adjacentElements: findAdjacentElements(region, elements)
          });
        }
      }
    }
  }

  return spaceRegions;
}

/**
 * Flood fill algorithm to find connected space regions
 */
function floodFillSpace(
  grid: boolean[][],
  visited: boolean[][],
  startX: number,
  startY: number,
  gridSize: number
) {
  const region = {
    cells: [] as { x: number; y: number }[],
    bounds: { minX: startX, maxX: startX, minY: startY, maxY: startY },
    size: 0
  };

  const stack = [{ x: startX, y: startY }];

  while (stack.length > 0) {
    const { x, y } = stack.pop()!;

    if (x < 0 || x >= gridSize || y < 0 || y >= gridSize) continue;
    if (!grid[y][x] || visited[y][x]) continue;

    visited[y][x] = true;
    region.cells.push({ x, y });
    region.size++;

    region.bounds.minX = Math.min(region.bounds.minX, x);
    region.bounds.maxX = Math.max(region.bounds.maxX, x);
    region.bounds.minY = Math.min(region.bounds.minY, y);
    region.bounds.maxY = Math.max(region.bounds.maxY, y);

    // Add adjacent cells
    stack.push({ x: x + 1, y }, { x: x - 1, y }, { x, y: y + 1 }, { x, y: y - 1 });
  }

  return region;
}

/**
 * Classifies the type of negative space
 */
function classifySpaceType(
  region: ReturnType<typeof floodFillSpace>,
  elements: ElementVisualProperties[]
): BreathingRoomPattern['spaceDistribution'][0]['spaceType'] {
  const { bounds } = region;
  const centerX = (bounds.minX + bounds.maxX) / 2;
  const centerY = (bounds.minY + bounds.maxY) / 2;

  // Check if space is at edges
  if (bounds.minX === 0 || bounds.maxX === 9 || bounds.minY === 0 || bounds.maxY === 9) {
    return 'buffer';
  }

  // Check if space separates elements
  const nearbyElements = elements.filter(el => {
    const elementCenter = getCenterPoint(el.bounds);
    const distance = calculateDistance(
      { x: centerX / 10, y: centerY / 10 },
      elementCenter
    );
    return distance < 0.3;
  });

  if (nearbyElements.length >= 2) {
    return 'separator';
  }

  // Check if space creates focus
  if (centerX > 3 && centerX < 7 && centerY > 3 && centerY < 7) {
    return 'focus';
  }

  return 'flow';
}

/**
 * Calculates importance of negative space
 */
function calculateSpaceImportance(
  region: ReturnType<typeof floodFillSpace>,
  elements: ElementVisualProperties[]
): number {
  let importance = Math.min(1, region.size / 20); // Base importance from size

  // Central spaces are more important
  const { bounds } = region;
  const centerX = (bounds.minX + bounds.maxX) / 2;
  const centerY = (bounds.minY + bounds.maxY) / 2;
  const centralityBonus = 1 - Math.sqrt((centerX - 5) ** 2 + (centerY - 5) ** 2) / 7;

  importance += centralityBonus * 0.3;

  return Math.min(1, importance);
}

/**
 * Finds elements adjacent to a space region
 */
function findAdjacentElements(
  region: ReturnType<typeof floodFillSpace>,
  elements: ElementVisualProperties[]
): string[] {
  const adjacentIds: string[] = [];
  const regionBounds = {
    left: region.bounds.minX / 10,
    top: region.bounds.minY / 10,
    right: region.bounds.maxX / 10,
    bottom: region.bounds.maxY / 10
  };

  for (const element of elements) {
    // Check if element is adjacent to the space region
    const isAdjacent = (
      (element.bounds.right >= regionBounds.left - 0.05 && element.bounds.left <= regionBounds.right + 0.05) &&
      (element.bounds.bottom >= regionBounds.top - 0.05 && element.bounds.top <= regionBounds.bottom + 0.05)
    );

    if (isAdjacent) {
      adjacentIds.push(element.elementId);
    }
  }

  return adjacentIds;
}

/**
 * Calculates confidence for breathing room analysis
 */
function calculateBreathingRoomConfidence(
  spaceRegions: BreathingRoomPattern['spaceDistribution'],
  elements: ElementVisualProperties[]
): number {
  const avgImportance = spaceRegions.reduce((sum, region) => sum + region.importance, 0) / spaceRegions.length;
  const spaceCoverage = Math.min(1, spaceRegions.length / 4);

  return avgImportance * 0.7 + spaceCoverage * 0.3;
}

// ============================================================================
// Main Compositional Analysis Function
// ============================================================================

/**
 * Performs complete compositional relationship analysis on a frame
 */
export function analyzeCompositionalRelationships(
  frame: FrameNode,
  config: Partial<CompositionalAnalysisConfig> = {}
): CompositionalRelationship[] {
  const fullConfig = { ...DEFAULT_COMPOSITIONAL_CONFIG, ...config };
  const startTime = Date.now();

  debugFixLog("Starting compositional relationship analysis", {
    frameId: frame.id,
    frameName: frame.name
  });

  try {
    // Build elements for compositional analysis
    const elements = buildCompositionalElements(frame);

    if (elements.length < 2) {
      debugFixLog("Insufficient elements for compositional analysis", { elementCount: elements.length });
      return [];
    }

    const relationships: CompositionalRelationship[] = [];

    // Analyze compositional balance
    const balance = analyzeCompositionBalance(elements, fullConfig);
    if (balance) relationships.push(balance);

    // Detect tension points
    const tension = detectTensionPoints(elements, fullConfig);
    if (tension) relationships.push(tension);

    // Analyze breathing room
    const breathing = analyzeBreathingRoom(elements, fullConfig);
    if (breathing) relationships.push(breathing);

    // Note: Edge relationships would be added here if needed

    const processingTime = Date.now() - startTime;

    debugFixLog("Compositional relationship analysis complete", {
      relationships: relationships.length,
      balance: balance ? 1 : 0,
      tension: tension ? 1 : 0,
      breathing: breathing ? 1 : 0,
      processingTimeMs: processingTime
    });

    return relationships;

  } catch (error) {
    debugFixLog("Error in compositional relationship analysis", { error: String(error) });
    return [];
  }
}