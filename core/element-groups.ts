import type { AbsoluteChildSnapshot } from "./absolute-layout.js";

export interface ElementGroup {
  readonly elements: ReadonlyArray<AbsoluteChildSnapshot>;
  readonly groupType: 'text-logo' | 'text-cluster' | 'isolated';
  readonly bounds: {
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
  };
  readonly centroid: {
    readonly x: number;
    readonly y: number;
  };
}

export interface Bounds {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/**
 * Proximity threshold for grouping elements together (in pixels).
 * Elements within this distance are considered part of the same group.
 */
const GROUPING_PROXIMITY_THRESHOLD = 50;

/**
 * Minimum elements required to form a text cluster group.
 */
const MIN_TEXT_CLUSTER_SIZE = 2;

/**
 * Calculates the bounding box that contains all elements in a group.
 */
function calculateGroupBounds(elements: ReadonlyArray<AbsoluteChildSnapshot>): Bounds {
  if (elements.length === 0) {
    return { x: 0, y: 0, width: 0, height: 0 };
  }

  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  for (const element of elements) {
    const { x, y, width, height } = element.bounds;
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x + width);
    maxY = Math.max(maxY, y + height);
  }

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY
  };
}

/**
 * Calculates the centroid (center point) of a group of elements.
 */
function calculateGroupCentroid(elements: ReadonlyArray<AbsoluteChildSnapshot>): { x: number; y: number } {
  if (elements.length === 0) {
    return { x: 0, y: 0 };
  }

  let totalX = 0;
  let totalY = 0;

  for (const element of elements) {
    const centerX = element.bounds.x + element.bounds.width / 2;
    const centerY = element.bounds.y + element.bounds.height / 2;
    totalX += centerX;
    totalY += centerY;
  }

  return {
    x: totalX / elements.length,
    y: totalY / elements.length
  };
}

/**
 * Calculates the distance between two points.
 */
function calculateDistance(point1: { x: number; y: number }, point2: { x: number; y: number }): number {
  const dx = point1.x - point2.x;
  const dy = point1.y - point2.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Checks if an element is likely a logo based on its node type and dimensions.
 */
function isLikelyLogo(element: AbsoluteChildSnapshot): boolean {
  // Instance nodes are often logos (components)
  if (element.nodeType === "INSTANCE") {
    return true;
  }

  // Small images/rectangles might be logos
  if ((element.nodeType === "RECTANGLE" || element.nodeType === "FRAME") &&
      element.bounds.width <= 120 && element.bounds.height <= 120) {
    return true;
  }

  return false;
}

/**
 * Checks if an element is text-based.
 */
function isTextElement(element: AbsoluteChildSnapshot): boolean {
  return element.nodeType === "TEXT";
}

/**
 * Groups elements by proximity and type. Text elements near logos form text-logo groups,
 * multiple text elements near each other form text clusters, and isolated elements remain separate.
 */
export function detectElementGroups(children: ReadonlyArray<AbsoluteChildSnapshot>): ReadonlyArray<ElementGroup> {
  if (children.length === 0) {
    return [];
  }

  if (children.length === 1) {
    // Single element is always isolated
    const element = children[0];
    return [{
      elements: [element],
      groupType: 'isolated',
      bounds: element.bounds,
      centroid: {
        x: element.bounds.x + element.bounds.width / 2,
        y: element.bounds.y + element.bounds.height / 2
      }
    }];
  }

  const groups: ElementGroup[] = [];
  const processed = new Set<number>();

  for (let i = 0; i < children.length; i++) {
    if (processed.has(i)) continue;

    const currentElement = children[i];
    const currentCenter = {
      x: currentElement.bounds.x + currentElement.bounds.width / 2,
      y: currentElement.bounds.y + currentElement.bounds.height / 2
    };

    // Find all elements within proximity threshold
    const nearbyElements: AbsoluteChildSnapshot[] = [currentElement];
    const nearbyIndices: number[] = [i];

    for (let j = i + 1; j < children.length; j++) {
      if (processed.has(j)) continue;

      const otherElement = children[j];
      const otherCenter = {
        x: otherElement.bounds.x + otherElement.bounds.width / 2,
        y: otherElement.bounds.y + otherElement.bounds.height / 2
      };

      const distance = calculateDistance(currentCenter, otherCenter);
      if (distance <= GROUPING_PROXIMITY_THRESHOLD) {
        nearbyElements.push(otherElement);
        nearbyIndices.push(j);
      }
    }

    // Mark all nearby elements as processed
    for (const index of nearbyIndices) {
      processed.add(index);
    }

    // Determine group type based on element composition
    const textElements = nearbyElements.filter(isTextElement);
    const logoElements = nearbyElements.filter(isLikelyLogo);

    let groupType: ElementGroup['groupType'];

    if (textElements.length > 0 && logoElements.length > 0) {
      // Mixed text and logo elements
      groupType = 'text-logo';
    } else if (textElements.length >= MIN_TEXT_CLUSTER_SIZE) {
      // Multiple text elements together
      groupType = 'text-cluster';
    } else {
      // Single element or unrelated elements
      groupType = 'isolated';
    }

    groups.push({
      elements: nearbyElements,
      groupType,
      bounds: calculateGroupBounds(nearbyElements),
      centroid: calculateGroupCentroid(nearbyElements)
    });
  }

  return groups;
}

/**
 * Splits a large group into smaller, more manageable groups if it contains too many elements.
 */
export function optimizeGroupSizes(groups: ReadonlyArray<ElementGroup>): ReadonlyArray<ElementGroup> {
  const MAX_GROUP_SIZE = 4; // Maximum elements per group for manageable positioning

  const optimizedGroups: ElementGroup[] = [];

  for (const group of groups) {
    if (group.elements.length <= MAX_GROUP_SIZE) {
      optimizedGroups.push(group);
      continue;
    }

    // Split large groups by spatial proximity within the group
    const subGroups = splitGroupBySpatialClustering(group.elements);
    for (const subGroup of subGroups) {
      optimizedGroups.push({
        elements: subGroup,
        groupType: group.groupType === 'text-logo' ? 'text-cluster' : group.groupType, // Demote mixed groups
        bounds: calculateGroupBounds(subGroup),
        centroid: calculateGroupCentroid(subGroup)
      });
    }
  }

  return optimizedGroups;
}

/**
 * Splits a group of elements into smaller spatial clusters.
 */
function splitGroupBySpatialClustering(elements: ReadonlyArray<AbsoluteChildSnapshot>): ReadonlyArray<ReadonlyArray<AbsoluteChildSnapshot>> {
  if (elements.length <= 2) {
    return [elements];
  }

  // Simple spatial clustering: sort by Y position and split into chunks
  const sortedElements = [...elements].sort((a, b) => a.bounds.y - b.bounds.y);
  const clusters: AbsoluteChildSnapshot[][] = [];
  let currentCluster: AbsoluteChildSnapshot[] = [sortedElements[0]];

  for (let i = 1; i < sortedElements.length; i++) {
    const current = sortedElements[i];
    const previous = sortedElements[i - 1];

    const verticalGap = current.bounds.y - (previous.bounds.y + previous.bounds.height);

    if (verticalGap <= GROUPING_PROXIMITY_THRESHOLD / 2 && currentCluster.length < 3) {
      currentCluster.push(current);
    } else {
      clusters.push(currentCluster);
      currentCluster = [current];
    }
  }

  if (currentCluster.length > 0) {
    clusters.push(currentCluster);
  }

  return clusters;
}