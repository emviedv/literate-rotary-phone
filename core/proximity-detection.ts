/**
 * Proximity Detection Algorithm
 *
 * Main algorithm for detecting proximity-based groups of elements that should
 * be wrapped in auto-layout containers. Orchestrates spatial analysis, clustering,
 * and validation to identify cohesive visual groups.
 */

import { debugFixLog } from "./debug.js";
import { isAtomicGroup } from "./element-classification.js";
import type {
  ProximityElement,
  Rectangle,
  ProximityCluster,
  ProximityGroupingOptions,
  ValidationResult
} from "../types/proximity-types.js";
import { DEFAULT_PROXIMITY_OPTIONS } from "../types/proximity-types.js";
import {
  getFrameRelativeBounds,
  calculateAllDistances,
  buildProximityGraph,
  findConnectedComponents,
  filterByContainerBoundaries,
  analyzeClusterArrangement,
  calculateBoundingBox
} from "./proximity-spatial-analysis.js";

// ============================================================================
// Main Proximity Detection
// ============================================================================

/**
 * Detects proximity-based groups within a frame.
 * Analyzes all visible elements and finds clusters that should be grouped together.
 *
 * @param frame - Figma frame to analyze
 * @param options - Configuration options for proximity detection
 * @returns Array of detected proximity clusters
 */
export function detectProximityGroups(
  frame: FrameNode,
  options: Partial<ProximityGroupingOptions> = {}
): ProximityCluster[] {
  const config = { ...DEFAULT_PROXIMITY_OPTIONS, ...options };
  const startTime = Date.now();

  debugFixLog("Starting proximity detection", {
    frameId: frame.id,
    frameName: frame.name,
    proximityThreshold: config.proximityThreshold,
    minGroupSize: config.minGroupSize
  });

  try {
    // Validate input frame
    const validation = validateFrameForProximityAnalysis(frame);
    if (!validation.isValid) {
      debugFixLog("Frame validation failed", {
        error: validation.error,
        message: validation.message
      });
      return [];
    }

    // Convert frame children to proximity elements
    const elements = collectProximityElements(frame, config);
    if (elements.length < config.minGroupSize) {
      debugFixLog("Insufficient elements for grouping", {
        elementCount: elements.length,
        minRequired: config.minGroupSize
      });
      return [];
    }

    // Calculate distances between all element pairs
    const distances = calculateAllDistances(elements);
    debugFixLog("Calculated distances", {
      elementCount: elements.length,
      distancePairs: distances.length,
      proximityPairs: distances.filter(d => d.distance <= config.proximityThreshold).length
    });

    // Build proximity graph and find connected components
    const graph = buildProximityGraph(distances, config.proximityThreshold);
    const rawClusters = findConnectedComponents(graph);

    // Filter clusters by size and container boundaries
    const sizedClusters = rawClusters.filter(cluster => cluster.length >= config.minGroupSize);
    const validClusters = filterByContainerBoundaries(sizedClusters, config.respectContainerBoundaries);

    // Convert to proximity clusters with direction analysis
    const proximityClusters = validClusters.map(elements => createProximityCluster(elements));

    const processingTime = Date.now() - startTime;
    debugFixLog("Proximity detection complete", {
      processingTimeMs: processingTime,
      clustersFound: proximityClusters.length,
      totalElementsGrouped: proximityClusters.reduce((sum, c) => sum + c.elements.length, 0)
    });

    return proximityClusters;

  } catch (error) {
    debugFixLog("Proximity detection failed", {
      error: error instanceof Error ? error.message : String(error),
      processingTimeMs: Date.now() - startTime
    });
    return [];
  }
}

// ============================================================================
// Element Collection
// ============================================================================

/**
 * Collects all eligible elements from a frame for proximity analysis.
 * Filters out invisible, atomic-protected, and invalid elements.
 *
 * @param frame - Frame to collect elements from
 * @param config - Proximity grouping configuration
 * @returns Array of proximity elements ready for analysis
 */
function collectProximityElements(
  frame: FrameNode,
  config: ProximityGroupingOptions
): ProximityElement[] {
  const elements: ProximityElement[] = [];
  const frameAbsoluteBounds = frame.absoluteBoundingBox;

  if (!frameAbsoluteBounds) {
    debugFixLog("Frame has no absolute bounding box", { frameId: frame.id });
    return [];
  }

  const frameBounds: Rectangle = {
    x: frameAbsoluteBounds.x,
    y: frameAbsoluteBounds.y,
    width: frameAbsoluteBounds.width,
    height: frameAbsoluteBounds.height
  };

  // Collect atomic group information for protection
  const atomicGroupChildIds = collectAtomicGroupChildren(frame);

  function collectFromNode(node: SceneNode, parentContainer?: SceneNode): void {
    // Skip invisible nodes
    if (!node.visible) return;

    // Skip atomic group children if protection is enabled
    if (config.respectAtomicProtection && atomicGroupChildIds.has(node.id)) {
      debugFixLog("Skipping atomic group child", {
        nodeId: node.id,
        nodeName: node.name
      });
      return;
    }

    // Get frame-relative bounds
    const bounds = getFrameRelativeBounds(node, frameBounds);
    if (!bounds) return;

    // Skip very small elements (likely decorative)
    if (bounds.width < 5 || bounds.height < 5) return;

    // Check if this node itself is an atomic group (don't decompose further)
    if (isAtomicGroup(node)) {
      // Treat the entire atomic group as a single element
      elements.push({
        node,
        bounds,
        isAtomicProtected: true,
        parentContainer: parentContainer || frame
      });
      return; // Don't recurse into atomic groups
    }

    // For regular containers, collect the container and its children
    if ("children" in node && node.children.length > 0) {
      // Add the container itself if it has visual properties (fills, strokes)
      if (hasVisualProperties(node)) {
        elements.push({
          node,
          bounds,
          isAtomicProtected: false,
          parentContainer: parentContainer || frame
        });
      }

      // Recurse into children with this node as the parent container
      for (const child of node.children) {
        collectFromNode(child, node);
      }
    } else {
      // Leaf node - add to elements
      elements.push({
        node,
        bounds,
        isAtomicProtected: false,
        parentContainer: parentContainer || frame
      });
    }
  }

  // Collect from all frame children
  for (const child of frame.children) {
    collectFromNode(child);
  }

  debugFixLog("Collected proximity elements", {
    totalElements: elements.length,
    atomicProtectedElements: elements.filter(e => e.isAtomicProtected).length
  });

  return elements;
}

/**
 * Checks if a node has visual properties that make it a grouping candidate.
 *
 * @param node - Node to check
 * @returns True if node has fills, strokes, or other visual properties
 */
function hasVisualProperties(node: SceneNode): boolean {
  // Text nodes are always visual
  if (node.type === "TEXT") return true;

  // Check for fills
  if ("fills" in node && Array.isArray(node.fills)) {
    const fills = node.fills as readonly Paint[];
    if (fills.length > 0 && fills.some(f => f.visible !== false)) {
      return true;
    }
  }

  // Check for strokes
  if ("strokes" in node && Array.isArray(node.strokes)) {
    const strokes = node.strokes as readonly Paint[];
    if (strokes.length > 0 && strokes.some(s => s.visible !== false)) {
      return true;
    }
  }

  // Vector and shape nodes are visual
  if (
    node.type === "VECTOR" ||
    node.type === "ELLIPSE" ||
    node.type === "RECTANGLE" ||
    node.type === "POLYGON" ||
    node.type === "STAR" ||
    node.type === "LINE" ||
    node.type === "BOOLEAN_OPERATION"
  ) {
    return true;
  }

  return false;
}

// ============================================================================
// Atomic Group Protection
// ============================================================================

/**
 * Collects IDs of all nodes that are children of atomic groups.
 * Replicates the logic from design-executor.ts for consistency.
 *
 * @param frame - Frame to scan for atomic groups
 * @returns Set of node IDs that are children of atomic groups
 */
function collectAtomicGroupChildren(frame: FrameNode): Set<string> {
  const atomicChildIds = new Set<string>();

  function collectChildIds(parent: SceneNode): void {
    if (!("children" in parent)) return;

    for (const child of parent.children) {
      atomicChildIds.add(child.id);
      // Recursively collect nested children
      if ("children" in child) {
        collectChildIds(child);
      }
    }
  }

  function scanForAtomicGroups(node: SceneNode): void {
    // Check if this node is an atomic group
    if (isAtomicGroup(node)) {
      debugFixLog("Found atomic group during proximity analysis", {
        nodeId: node.id,
        nodeName: node.name,
        type: node.type
      });
      // Collect all children of this atomic group
      collectChildIds(node);
      // Don't recurse into atomic groups - we've already collected their children
      return;
    }

    // Recurse into non-atomic containers
    if ("children" in node) {
      for (const child of node.children) {
        scanForAtomicGroups(child);
      }
    }
  }

  // Scan all children of the root frame
  for (const child of frame.children) {
    scanForAtomicGroups(child);
  }

  return atomicChildIds;
}

// ============================================================================
// Cluster Creation
// ============================================================================

/**
 * Creates a proximity cluster from a group of elements with direction analysis.
 *
 * @param elements - Elements in the cluster
 * @returns Proximity cluster with direction recommendation
 */
function createProximityCluster(elements: readonly ProximityElement[]): ProximityCluster {
  // Analyze spatial arrangement
  const arrangement = analyzeClusterArrangement(elements);

  // Calculate cluster bounds
  const elementBounds = elements.map(e => e.bounds);
  const bounds = calculateBoundingBox(elementBounds) || { x: 0, y: 0, width: 0, height: 0 };

  return {
    elements,
    bounds,
    recommendedDirection: arrangement.primaryDirection,
    directionConfidence: arrangement.confidence
  };
}

// ============================================================================
// Validation
// ============================================================================

/**
 * Validates that a frame is suitable for proximity analysis.
 *
 * @param frame - Frame to validate
 * @returns Validation result with error details if invalid
 */
function validateFrameForProximityAnalysis(frame: FrameNode): ValidationResult {
  // Check if frame exists and has bounds
  if (!frame) {
    return {
      isValid: false,
      error: 'INVALID_FRAME',
      message: 'Frame is null or undefined'
    };
  }

  if (!frame.absoluteBoundingBox) {
    return {
      isValid: false,
      error: 'INVALID_FRAME',
      message: 'Frame has no absolute bounding box'
    };
  }

  // Check if frame has children
  if (!("children" in frame) || frame.children.length === 0) {
    return {
      isValid: false,
      error: 'NO_ELIGIBLE_ELEMENTS',
      message: 'Frame has no children to analyze'
    };
  }

  // Count visible children
  const visibleChildren = frame.children.filter(child => child.visible);
  if (visibleChildren.length === 0) {
    return {
      isValid: false,
      error: 'NO_ELIGIBLE_ELEMENTS',
      message: 'Frame has no visible children'
    };
  }

  return {
    isValid: true,
    eligibleElements: visibleChildren.length
  };
}

// ============================================================================
// Utilities
// ============================================================================

/**
 * Checks if two proximity clusters overlap spatially.
 * Used to avoid creating conflicting groups.
 *
 * @param cluster1 - First cluster
 * @param cluster2 - Second cluster
 * @returns True if clusters have overlapping elements
 */
export function clustersOverlap(cluster1: ProximityCluster, cluster2: ProximityCluster): boolean {
  const ids1 = new Set(cluster1.elements.map(e => e.node.id));
  const ids2 = new Set(cluster2.elements.map(e => e.node.id));

  // Check if any element IDs overlap
  for (const id of ids1) {
    if (ids2.has(id)) {
      return true;
    }
  }

  return false;
}

/**
 * Filters out overlapping clusters, keeping the larger one in each conflict.
 *
 * @param clusters - Array of proximity clusters
 * @returns Filtered array with no overlapping clusters
 */
export function removeOverlappingClusters(clusters: ProximityCluster[]): ProximityCluster[] {
  if (clusters.length === 0) return [];

  // Sort by element count (descending) to prefer larger clusters
  const sortedClusters = [...clusters].sort((a, b) => b.elements.length - a.elements.length);
  const filteredClusters: ProximityCluster[] = [];

  for (const cluster of sortedClusters) {
    // Check if this cluster overlaps with any already accepted cluster
    const hasOverlap = filteredClusters.some(accepted => clustersOverlap(cluster, accepted));

    if (!hasOverlap) {
      filteredClusters.push(cluster);
    } else {
      debugFixLog("Removing overlapping cluster", {
        elementsCount: cluster.elements.length,
        reason: "Conflicts with larger cluster"
      });
    }
  }

  return filteredClusters;
}