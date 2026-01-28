/**
 * Proximity-Based Auto-Layout Orchestration
 *
 * Main orchestration module for proximity-based auto-layout grouping.
 * Detects visually related elements and automatically wraps them in
 * auto-layout containers to prevent collisions during TikTok transformation.
 */

import { debugFixLog } from "./debug.js";
import { detectProximityGroups, removeOverlappingClusters } from "./proximity-detection.js";
import { analyzeOptimalDirection } from "./proximity-direction-detection.js";
import type {
  ProximityProcessingResult,
  ProximityGroupingOptions,
  GroupingResult,
  ProximityCluster,
  ContainerConfig
} from "../types/proximity-types.js";
import { DEFAULT_PROXIMITY_OPTIONS } from "../types/proximity-types.js";

declare const figma: PluginAPI;

// ============================================================================
// Main Public API
// ============================================================================

/**
 * Applies proximity-based auto-layout grouping to a frame.
 * This is the main entry point called from the design executor pipeline.
 *
 * @param frame - Figma frame to process
 * @param options - Optional configuration for proximity processing
 * @returns Result with created groups and processing statistics
 */
export async function applyProximityAutoLayout(
  frame: FrameNode,
  options: Partial<ProximityGroupingOptions> = {}
): Promise<ProximityProcessingResult> {
  const config = { ...DEFAULT_PROXIMITY_OPTIONS, ...options };
  const startTime = Date.now();

  debugFixLog("Starting proximity-based auto-layout processing", {
    frameId: frame.id,
    frameName: frame.name,
    config: {
      proximityThreshold: config.proximityThreshold,
      minGroupSize: config.minGroupSize,
      respectContainerBoundaries: config.respectContainerBoundaries,
      respectAtomicProtection: config.respectAtomicProtection
    }
  });

  const errors: string[] = [];
  const warnings: string[] = [];
  const groupingResults: GroupingResult[] = [];

  try {
    // Detect proximity groups
    const detectedClusters = detectProximityGroups(frame, config);

    if (detectedClusters.length === 0) {
      debugFixLog("No proximity groups detected", {
        frameId: frame.id,
        reason: "No elements within proximity threshold found"
      });

      return createSuccessResult([], startTime, warnings);
    }

    // Remove overlapping clusters (prefer larger groups)
    const filteredClusters = removeOverlappingClusters(detectedClusters);

    debugFixLog("Filtered overlapping clusters", {
      originalClusters: detectedClusters.length,
      filteredClusters: filteredClusters.length
    });

    // Process each cluster with timeout protection
    for (let i = 0; i < filteredClusters.length; i++) {
      const cluster = filteredClusters[i];

      try {
        // Check timeout
        const elapsed = Date.now() - startTime;
        if (elapsed > config.timeoutMs) {
          const timeoutWarning = `Processing timeout reached after ${elapsed}ms`;
          warnings.push(timeoutWarning);
          debugFixLog("Proximity processing timeout", {
            elapsedMs: elapsed,
            timeoutMs: config.timeoutMs,
            processedClusters: i,
            totalClusters: filteredClusters.length
          });
          break;
        }

        // Process individual cluster
        const result = await processProximityCluster(cluster, config);
        groupingResults.push(result);

        if (result.success) {
          debugFixLog("Successfully created proximity group", {
            clusterIndex: i,
            elementsGrouped: result.groupedElements.length,
            direction: result.direction,
            containerId: result.container?.id,
            containerName: result.container?.name
          });
        } else {
          const errorMsg = `Failed to create group ${i}: ${result.error}`;
          errors.push(errorMsg);
          debugFixLog("Failed to create proximity group", {
            clusterIndex: i,
            error: result.error,
            elementsCount: result.groupedElements.length
          });
        }

      } catch (error) {
        const errorMsg = `Cluster processing error: ${error instanceof Error ? error.message : String(error)}`;
        errors.push(errorMsg);
        debugFixLog("Cluster processing exception", {
          clusterIndex: i,
          error: errorMsg
        });
      }
    }

    const processingTime = Date.now() - startTime;
    const successfulGroups = groupingResults.filter(r => r.success);

    const result: ProximityProcessingResult = {
      success: errors.length === 0,
      groupsCreated: successfulGroups.length,
      elementsGrouped: successfulGroups.reduce((sum, r) => sum + r.groupedElements.length, 0),
      elementsSkipped: calculateElementsSkipped(detectedClusters, groupingResults),
      groupingResults,
      processingTimeMs: processingTime,
      errors,
      warnings
    };

    debugFixLog("Proximity processing complete", {
      success: result.success,
      groupsCreated: result.groupsCreated,
      elementsGrouped: result.elementsGrouped,
      elementsSkipped: result.elementsSkipped,
      processingTimeMs: result.processingTimeMs,
      errorCount: errors.length,
      warningCount: warnings.length
    });

    return result;

  } catch (error) {
    const processingTime = Date.now() - startTime;
    const errorMsg = error instanceof Error ? error.message : String(error);

    debugFixLog("Proximity processing failed with exception", {
      error: errorMsg,
      processingTimeMs: processingTime
    });

    return {
      success: false,
      groupsCreated: 0,
      elementsGrouped: 0,
      elementsSkipped: 0,
      groupingResults,
      processingTimeMs: processingTime,
      errors: [errorMsg],
      warnings
    };
  }
}

// ============================================================================
// Cluster Processing
// ============================================================================

/**
 * Processes a single proximity cluster to create an auto-layout container.
 *
 * @param cluster - Proximity cluster to process
 * @param config - Processing configuration
 * @returns Result of grouping operation
 */
async function processProximityCluster(
  cluster: ProximityCluster,
  config: ProximityGroupingOptions
): Promise<GroupingResult> {
  debugFixLog("Processing proximity cluster", {
    elementsCount: cluster.elements.length,
    recommendedDirection: cluster.recommendedDirection,
    directionConfidence: cluster.directionConfidence
  });

  try {
    // Validate cluster before processing
    const validation = validateClusterForGrouping(cluster);
    if (!validation.isValid) {
      return {
        success: false,
        groupedElements: cluster.elements,
        error: validation.error
      };
    }

    // Analyze optimal direction (may override cluster recommendation)
    const directionAnalysis = analyzeOptimalDirection(cluster.elements);

    // Use the most confident direction
    const finalDirection = directionAnalysis.confidence > cluster.directionConfidence
      ? directionAnalysis.direction
      : cluster.recommendedDirection;

    debugFixLog("Direction analysis complete", {
      clusterRecommendation: cluster.recommendedDirection,
      clusterConfidence: cluster.directionConfidence,
      analysisRecommendation: directionAnalysis.direction,
      analysisConfidence: directionAnalysis.confidence,
      finalDirection
    });

    // Create container configuration
    const containerConfig: ContainerConfig = {
      direction: finalDirection,
      spacing: config.defaultSpacing,
      namePrefix: "ProximityGroup",
      fillVerticalSpace: config.fillVerticalSpace
    };

    // Create auto-layout container
    const container = await createAutoLayoutContainer(cluster.elements, containerConfig);

    if (!container) {
      return {
        success: false,
        groupedElements: cluster.elements,
        error: "Failed to create auto-layout container"
      };
    }

    return {
      success: true,
      container,
      groupedElements: cluster.elements,
      direction: finalDirection
    };

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    debugFixLog("Cluster processing failed", {
      elementsCount: cluster.elements.length,
      error: errorMsg
    });

    return {
      success: false,
      groupedElements: cluster.elements,
      error: errorMsg
    };
  }
}

/**
 * Validates that a cluster is suitable for grouping.
 */
function validateClusterForGrouping(cluster: ProximityCluster): {
  readonly isValid: boolean;
  readonly error?: string;
} {
  // Check minimum elements
  if (cluster.elements.length < 2) {
    return {
      isValid: false,
      error: "Cluster has insufficient elements (minimum 2 required)"
    };
  }

  // Check that all elements have valid nodes
  for (const element of cluster.elements) {
    if (!element.node || element.node.removed) {
      return {
        isValid: false,
        error: "Cluster contains removed or invalid nodes"
      };
    }
  }

  // Check that all elements share the same parent
  const firstParent = cluster.elements[0].parentContainer;
  for (const element of cluster.elements) {
    if (element.parentContainer !== firstParent) {
      return {
        isValid: false,
        error: "Cluster elements span multiple containers"
      };
    }
  }

  return { isValid: true };
}

// ============================================================================
// Container Creation
// ============================================================================

/**
 * Creates an auto-layout container and moves elements into it.
 *
 * @param elements - Elements to group
 * @param config - Container configuration
 * @returns Created container frame or null if failed
 */
async function createAutoLayoutContainer(
  elements: readonly import("../types/proximity-types.js").ProximityElement[],
  config: ContainerConfig
): Promise<FrameNode | null> {
  try {
    if (elements.length === 0) {
      debugFixLog("Cannot create container for empty element list");
      return null;
    }

    // Get the parent container (all elements should have the same parent)
    const parentNode = elements[0].parentContainer;
    if (!parentNode || !("children" in parentNode)) {
      debugFixLog("Invalid parent container for grouping");
      return null;
    }

    const parent = parentNode as FrameNode;

    // Create new frame for the auto-layout container
    const container = figma.createFrame();
    container.name = `${config.namePrefix || "ProximityGroup"} (${elements.length} items)`;

    // Calculate initial container bounds to encompass all elements
    const containerBounds = calculateContainerBounds(elements);
    container.x = containerBounds.x;
    container.y = containerBounds.y;
    container.resizeWithoutConstraints(containerBounds.width, containerBounds.height);

    // Configure auto-layout
    container.layoutMode = config.direction === 'horizontal' ? 'HORIZONTAL' : 'VERTICAL';

    // For vertical containers in TikTok layouts, fill available height
    if (config.direction === 'vertical' && config.fillVerticalSpace) {
      container.primaryAxisSizingMode = 'AUTO';
      debugFixLog("Setting vertical container to fill available height", {
        containerId: container.id,
        containerName: container.name,
        fillVerticalSpace: true
      });
    } else {
      container.primaryAxisSizingMode = 'AUTO';
    }

    container.counterAxisSizingMode = 'AUTO';
    container.itemSpacing = config.spacing || 8;

    // Set padding if specified
    if (config.padding) {
      container.paddingTop = config.padding;
      container.paddingRight = config.padding;
      container.paddingBottom = config.padding;
      container.paddingLeft = config.padding;
    }

    // Make container transparent (just a layout container)
    container.fills = [];
    container.strokes = [];

    // Add container to parent
    parent.appendChild(container);

    // Move elements into the container
    // Sort elements by their position in the chosen direction to maintain order
    const sortedElements = [...elements].sort((a, b) => {
      return config.direction === 'horizontal'
        ? a.bounds.x - b.bounds.x
        : a.bounds.y - b.bounds.y;
    });

    for (const element of sortedElements) {
      try {
        // Move node into container
        container.appendChild(element.node);

        debugFixLog("Moved element into proximity container", {
          elementId: element.node.id,
          elementName: element.node.name,
          containerId: container.id
        });

      } catch (error) {
        debugFixLog("Failed to move element into container", {
          elementId: element.node.id,
          elementName: element.node.name,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    debugFixLog("Created auto-layout container", {
      containerId: container.id,
      containerName: container.name,
      direction: config.direction,
      spacing: container.itemSpacing,
      elementsCount: container.children.length
    });

    return container;

  } catch (error) {
    debugFixLog("Failed to create auto-layout container", {
      error: error instanceof Error ? error.message : String(error),
      elementsCount: elements.length
    });
    return null;
  }
}

/**
 * Calculates the bounds needed to encompass all elements in a group.
 */
function calculateContainerBounds(elements: readonly import("../types/proximity-types.js").ProximityElement[]): {
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

  // Add some padding around the elements
  const padding = 0; // Let auto-layout handle spacing

  return {
    x: minX - padding,
    y: minY - padding,
    width: (maxX - minX) + (2 * padding),
    height: (maxY - minY) + (2 * padding)
  };
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Creates a successful result for cases with no groups created.
 */
function createSuccessResult(
  groupingResults: GroupingResult[],
  startTime: number,
  warnings: string[]
): ProximityProcessingResult {
  return {
    success: true,
    groupsCreated: 0,
    elementsGrouped: 0,
    elementsSkipped: 0,
    groupingResults,
    processingTimeMs: Date.now() - startTime,
    errors: [],
    warnings
  };
}

/**
 * Calculates the number of elements that were skipped during processing.
 */
function calculateElementsSkipped(
  detectedClusters: readonly ProximityCluster[],
  groupingResults: readonly GroupingResult[]
): number {
  const totalDetectedElements = detectedClusters.reduce(
    (sum, cluster) => sum + cluster.elements.length,
    0
  );

  const successfullyGroupedElements = groupingResults
    .filter(result => result.success)
    .reduce((sum, result) => sum + result.groupedElements.length, 0);

  return totalDetectedElements - successfullyGroupedElements;
}

