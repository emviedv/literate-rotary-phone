/**
 * Proximity Spatial Analysis
 *
 * Core algorithms for spatial analysis and distance calculation in proximity-based grouping.
 * Handles edge-to-edge distance calculation, bounding box operations, and geometric utilities.
 */

import type {
  ProximityElement,
  Rectangle,
  ElementDistance,
  ProximityEdge
} from "../types/proximity-types.js";

// ============================================================================
// Bounding Box Utilities
// ============================================================================

/**
 * Converts Figma's absoluteBoundingBox to frame-relative coordinates.
 *
 * @param node - Figma node with absoluteBoundingBox
 * @param frameAbsoluteBounds - The frame's absolute bounds for reference
 * @returns Frame-relative rectangle or null if bounds not available
 */
export function getFrameRelativeBounds(
  node: SceneNode,
  frameAbsoluteBounds: Rectangle
): Rectangle | null {
  if (!("absoluteBoundingBox" in node) || !node.absoluteBoundingBox) {
    return null;
  }

  const absoluteBounds = node.absoluteBoundingBox;

  return {
    x: absoluteBounds.x - frameAbsoluteBounds.x,
    y: absoluteBounds.y - frameAbsoluteBounds.y,
    width: absoluteBounds.width,
    height: absoluteBounds.height
  };
}

/**
 * Calculates the bounding box that encompasses multiple rectangles.
 *
 * @param rectangles - Array of rectangles to encompass
 * @returns Combined bounding box or null if no rectangles
 */
export function calculateBoundingBox(rectangles: readonly Rectangle[]): Rectangle | null {
  if (rectangles.length === 0) return null;

  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  for (const rect of rectangles) {
    minX = Math.min(minX, rect.x);
    minY = Math.min(minY, rect.y);
    maxX = Math.max(maxX, rect.x + rect.width);
    maxY = Math.max(maxY, rect.y + rect.height);
  }

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY
  };
}

/**
 * Checks if two rectangles overlap.
 *
 * @param rect1 - First rectangle
 * @param rect2 - Second rectangle
 * @returns True if rectangles overlap
 */
export function rectanglesOverlap(rect1: Rectangle, rect2: Rectangle): boolean {
  return !(
    rect1.x + rect1.width <= rect2.x ||
    rect2.x + rect2.width <= rect1.x ||
    rect1.y + rect1.height <= rect2.y ||
    rect2.y + rect2.height <= rect1.y
  );
}

/**
 * Checks if rectangle1 is entirely contained within rectangle2.
 *
 * @param inner - Rectangle to check if contained
 * @param outer - Container rectangle
 * @returns True if inner is entirely within outer
 */
export function rectangleContains(inner: Rectangle, outer: Rectangle): boolean {
  return (
    inner.x >= outer.x &&
    inner.y >= outer.y &&
    inner.x + inner.width <= outer.x + outer.width &&
    inner.y + inner.height <= outer.y + outer.height
  );
}

// ============================================================================
// Distance Calculation
// ============================================================================

/**
 * Calculates the minimum edge-to-edge distance between two rectangles.
 * Returns 0 if rectangles overlap, positive distance if separated.
 *
 * @param rect1 - First rectangle
 * @param rect2 - Second rectangle
 * @returns Edge-to-edge distance in pixels
 */
export function calculateEdgeDistance(rect1: Rectangle, rect2: Rectangle): number {
  // Check for overlap first
  if (rectanglesOverlap(rect1, rect2)) {
    return 0;
  }

  // Calculate horizontal and vertical gaps
  const horizontalGap = Math.max(
    0,
    Math.max(rect1.x - (rect2.x + rect2.width), rect2.x - (rect1.x + rect1.width))
  );

  const verticalGap = Math.max(
    0,
    Math.max(rect1.y - (rect2.y + rect2.height), rect2.y - (rect1.y + rect1.height))
  );

  // If rectangles are aligned on one axis, distance is the gap on the other axis
  if (horizontalGap === 0) return verticalGap;
  if (verticalGap === 0) return horizontalGap;

  // If separated on both axes, distance is the diagonal
  return Math.sqrt(horizontalGap * horizontalGap + verticalGap * verticalGap);
}

/**
 * Determines the primary direction of separation between two rectangles.
 *
 * @param rect1 - First rectangle
 * @param rect2 - Second rectangle
 * @returns 'horizontal' if primarily side-by-side, 'vertical' if primarily stacked
 */
export function getDistanceDirection(rect1: Rectangle, rect2: Rectangle): 'horizontal' | 'vertical' {
  const horizontalGap = Math.max(
    0,
    Math.max(rect1.x - (rect2.x + rect2.width), rect2.x - (rect1.x + rect1.width))
  );

  const verticalGap = Math.max(
    0,
    Math.max(rect1.y - (rect2.y + rect2.height), rect2.y - (rect1.y + rect1.height))
  );

  // If aligned on one axis, that's the direction
  if (horizontalGap === 0) return 'vertical';
  if (verticalGap === 0) return 'horizontal';

  // If separated on both, use the larger gap as primary direction
  return horizontalGap > verticalGap ? 'horizontal' : 'vertical';
}

/**
 * Calculates distance between all pairs of elements.
 *
 * @param elements - Array of proximity elements
 * @returns Array of element distances
 */
export function calculateAllDistances(elements: readonly ProximityElement[]): ElementDistance[] {
  const distances: ElementDistance[] = [];

  for (let i = 0; i < elements.length; i++) {
    for (let j = i + 1; j < elements.length; j++) {
      const element1 = elements[i];
      const element2 = elements[j];

      const distance = calculateEdgeDistance(element1.bounds, element2.bounds);
      const direction = getDistanceDirection(element1.bounds, element2.bounds);

      distances.push({
        element1,
        element2,
        distance,
        direction
      });
    }
  }

  return distances;
}

// ============================================================================
// Proximity Graph Construction
// ============================================================================

/**
 * Builds a proximity graph from element distances within threshold.
 *
 * @param distances - Array of calculated element distances
 * @param proximityThreshold - Maximum distance for proximity (in pixels)
 * @returns Map of element to its proximity neighbors
 */
export function buildProximityGraph(
  distances: readonly ElementDistance[],
  proximityThreshold: number
): Map<ProximityElement, ProximityEdge[]> {
  const graph = new Map<ProximityElement, ProximityEdge[]>();

  // Initialize empty adjacency lists for all elements
  const allElements = new Set<ProximityElement>();
  for (const distance of distances) {
    allElements.add(distance.element1);
    allElements.add(distance.element2);
  }
  for (const element of allElements) {
    graph.set(element, []);
  }

  // Add edges for distances within threshold
  for (const distance of distances) {
    if (distance.distance <= proximityThreshold) {
      const edge1: ProximityEdge = {
        from: distance.element1,
        to: distance.element2,
        distance: distance.distance
      };

      const edge2: ProximityEdge = {
        from: distance.element2,
        to: distance.element1,
        distance: distance.distance
      };

      graph.get(distance.element1)?.push(edge1);
      graph.get(distance.element2)?.push(edge2);
    }
  }

  return graph;
}

/**
 * Finds connected components in the proximity graph using depth-first search.
 *
 * @param graph - Proximity graph (element -> neighbors)
 * @returns Array of connected component clusters
 */
export function findConnectedComponents(
  graph: Map<ProximityElement, ProximityEdge[]>
): ProximityElement[][] {
  const visited = new Set<ProximityElement>();
  const components: ProximityElement[][] = [];

  function dfs(element: ProximityElement, component: ProximityElement[]): void {
    if (visited.has(element)) return;

    visited.add(element);
    component.push(element);

    const neighbors = graph.get(element) || [];
    for (const edge of neighbors) {
      dfs(edge.to, component);
    }
  }

  // Find all connected components
  for (const element of graph.keys()) {
    if (!visited.has(element)) {
      const component: ProximityElement[] = [];
      dfs(element, component);
      if (component.length > 0) {
        components.push(component);
      }
    }
  }

  return components;
}

// ============================================================================
// Container Boundary Validation
// ============================================================================

/**
 * Checks if all elements in a group share the same container parent.
 * This prevents grouping elements that span across different logical containers.
 *
 * @param elements - Elements to check
 * @returns True if all elements have the same immediate parent container
 */
export function validateContainerBoundaries(elements: readonly ProximityElement[]): boolean {
  if (elements.length === 0) return true;

  // Get the parent container of the first element
  const firstParent = elements[0].parentContainer;

  // All elements must have the same parent container
  return elements.every(element => element.parentContainer === firstParent);
}

/**
 * Filters proximity clusters to only include those that respect container boundaries.
 *
 * @param clusters - Array of element clusters
 * @param respectBoundaries - Whether to enforce boundary validation
 * @returns Filtered clusters that respect container boundaries
 */
export function filterByContainerBoundaries(
  clusters: readonly (readonly ProximityElement[])[],
  respectBoundaries: boolean
): ProximityElement[][] {
  if (!respectBoundaries) {
    return clusters.map(cluster => [...cluster]);
  }

  return clusters
    .filter(cluster => validateContainerBoundaries(cluster))
    .map(cluster => [...cluster]);
}

// ============================================================================
// Cluster Analysis
// ============================================================================

/**
 * Analyzes the spatial arrangement of elements in a cluster.
 *
 * @param elements - Elements in the cluster
 * @returns Analysis of the cluster's spatial characteristics
 */
export function analyzeClusterArrangement(elements: readonly ProximityElement[]): {
  readonly bounds: Rectangle;
  readonly aspectRatio: number;
  readonly averageSpacing: number;
  readonly primaryDirection: 'horizontal' | 'vertical';
  readonly confidence: number;
} {
  if (elements.length === 0) {
    return {
      bounds: { x: 0, y: 0, width: 0, height: 0 },
      aspectRatio: 1,
      averageSpacing: 0,
      primaryDirection: 'horizontal',
      confidence: 0
    };
  }

  // Calculate overall bounds
  const elementBounds = elements.map(el => el.bounds);
  const bounds = calculateBoundingBox(elementBounds)!;

  // Calculate aspect ratio
  const aspectRatio = bounds.width / bounds.height;

  // Analyze spacing between elements
  const distances = calculateAllDistances(elements);
  const averageSpacing = distances.length > 0
    ? distances.reduce((sum, d) => sum + d.distance, 0) / distances.length
    : 0;

  // Determine primary direction based on arrangement
  const horizontalArrangement = analyzeHorizontalArrangement(elements);
  const verticalArrangement = analyzeVerticalArrangement(elements);

  const primaryDirection = horizontalArrangement.score > verticalArrangement.score
    ? 'horizontal'
    : 'vertical';

  const confidence = Math.max(horizontalArrangement.score, verticalArrangement.score);

  return {
    bounds,
    aspectRatio,
    averageSpacing,
    primaryDirection,
    confidence
  };
}

/**
 * Analyzes how well elements align horizontally (side-by-side arrangement).
 *
 * @param elements - Elements to analyze
 * @returns Score (0-1) and analysis of horizontal arrangement
 */
function analyzeHorizontalArrangement(elements: readonly ProximityElement[]): {
  readonly score: number;
  readonly reasoning: string;
} {
  if (elements.length < 2) {
    return { score: 0.5, reasoning: "Single element" };
  }

  // Sort elements by x position
  const sortedByX = [...elements].sort((a, b) => a.bounds.x - b.bounds.x);

  // Calculate vertical alignment variance
  const centerYs = sortedByX.map(el => el.bounds.y + el.bounds.height / 2);
  const avgCenterY = centerYs.reduce((sum, y) => sum + y, 0) / centerYs.length;
  const yVariance = centerYs.reduce((sum, y) => sum + Math.pow(y - avgCenterY, 2), 0) / centerYs.length;

  // Lower variance = better horizontal alignment
  const alignmentScore = Math.max(0, 1 - (yVariance / 1000)); // Normalize by 1000px variance

  // Check for gaps between elements (should be minimal for good horizontal flow)
  let gapScore = 1;
  for (let i = 0; i < sortedByX.length - 1; i++) {
    const current = sortedByX[i];
    const next = sortedByX[i + 1];
    const gap = next.bounds.x - (current.bounds.x + current.bounds.width);

    // Penalize large gaps (suggests not a cohesive horizontal group)
    if (gap > 100) {
      gapScore *= 0.5;
    }
  }

  const score = alignmentScore * gapScore;
  const reasoning = `Horizontal: alignment=${alignmentScore.toFixed(2)}, gaps=${gapScore.toFixed(2)}`;

  return { score, reasoning };
}

/**
 * Analyzes how well elements align vertically (stacked arrangement).
 *
 * @param elements - Elements to analyze
 * @returns Score (0-1) and analysis of vertical arrangement
 */
function analyzeVerticalArrangement(elements: readonly ProximityElement[]): {
  readonly score: number;
  readonly reasoning: string;
} {
  if (elements.length < 2) {
    return { score: 0.5, reasoning: "Single element" };
  }

  // Sort elements by y position
  const sortedByY = [...elements].sort((a, b) => a.bounds.y - b.bounds.y);

  // Calculate horizontal alignment variance
  const centerXs = sortedByY.map(el => el.bounds.x + el.bounds.width / 2);
  const avgCenterX = centerXs.reduce((sum, x) => sum + x, 0) / centerXs.length;
  const xVariance = centerXs.reduce((sum, x) => sum + Math.pow(x - avgCenterX, 2), 0) / centerXs.length;

  // Lower variance = better vertical alignment
  const alignmentScore = Math.max(0, 1 - (xVariance / 1000)); // Normalize by 1000px variance

  // Check for gaps between elements (should be minimal for good vertical flow)
  let gapScore = 1;
  for (let i = 0; i < sortedByY.length - 1; i++) {
    const current = sortedByY[i];
    const next = sortedByY[i + 1];
    const gap = next.bounds.y - (current.bounds.y + current.bounds.height);

    // Penalize large gaps (suggests not a cohesive vertical group)
    if (gap > 100) {
      gapScore *= 0.5;
    }
  }

  const score = alignmentScore * gapScore;
  const reasoning = `Vertical: alignment=${alignmentScore.toFixed(2)}, gaps=${gapScore.toFixed(2)}`;

  return { score, reasoning };
}