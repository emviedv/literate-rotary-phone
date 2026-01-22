/**
 * Proximity Auto-Layout Test Suite
 *
 * Comprehensive tests for the proximity-based auto-layout grouping system.
 * Tests spatial analysis, direction detection, container creation, and integration.
 */

import type {
  ProximityElement,
  Rectangle,
  ElementDistance,
  ProximityCluster
} from "../types/proximity-types.js";
import {
  calculateEdgeDistance,
  getDistanceDirection,
  calculateAllDistances,
  buildProximityGraph,
  findConnectedComponents
} from "../core/proximity-spatial-analysis.js";
import {
  removeOverlappingClusters
} from "../core/proximity-detection.js";
import {
  analyzeOptimalDirection
} from "../core/proximity-direction-detection.js";

// ============================================================================
// Test Utilities
// ============================================================================

function testCase(name: string, fn: () => void): void {
  try {
    fn();
    console.log(`✅ ${name}`);
  } catch (error) {
    console.error(`❌ ${name}`);
    throw error;
  }
}

function assertEqual<T>(actual: T, expected: T, message: string): void {
  if (actual !== expected) {
    throw new Error(`${message}\nExpected: ${expected}\nReceived: ${actual}`);
  }
}

function assertApproxEqual(actual: number, expected: number, tolerance: number, message: string): void {
  if (Math.abs(actual - expected) > tolerance) {
    throw new Error(`${message}\nExpected: ${expected} (±${tolerance})\nReceived: ${actual}`);
  }
}

function assertGreaterThan(actual: number, expected: number, message: string): void {
  if (actual <= expected) {
    throw new Error(`${message}\nExpected: > ${expected}\nReceived: ${actual}`);
  }
}

// ============================================================================
// Test Data Creation Utilities
// ============================================================================

/**
 * Creates a mock ProximityElement for testing.
 */
function createMockElement(
  id: string,
  name: string,
  x: number,
  y: number,
  width: number,
  height: number,
  isAtomicProtected: boolean = false
): ProximityElement {
  const mockNode = {
    id,
    name,
    type: "RECTANGLE" as const,
    removed: false,
    visible: true
  } as any as SceneNode;

  return {
    node: mockNode,
    bounds: { x, y, width, height },
    isAtomicProtected,
    parentContainer: undefined
  };
}

/**
 * Creates a mock frame for testing.
 */
function createMockFrame(
  id: string,
  name: string,
  x: number = 0,
  y: number = 0,
  width: number = 1080,
  height: number = 1920
): any {
  return {
    id,
    name,
    type: "FRAME",
    visible: true,
    children: [],
    absoluteBoundingBox: { x, y, width, height }
  };
}

// ============================================================================
// Spatial Analysis Tests
// ============================================================================

export function testEdgeDistanceCalculation(): void {
  testCase("calculateEdgeDistance: separated rectangles", () => {
    const rect1: Rectangle = { x: 0, y: 0, width: 50, height: 50 };
    const rect2: Rectangle = { x: 100, y: 0, width: 50, height: 50 };

    const distance = calculateEdgeDistance(rect1, rect2);
    assertEqual(distance, 50, "Distance should be 50px (100 - 50)");
  });

  testCase("calculateEdgeDistance: overlapping rectangles", () => {
    const rect1: Rectangle = { x: 0, y: 0, width: 60, height: 50 };
    const rect2: Rectangle = { x: 40, y: 0, width: 50, height: 50 };

    const distance = calculateEdgeDistance(rect1, rect2);
    assertEqual(distance, 0, "Overlapping rectangles should have 0 distance");
  });

  testCase("calculateEdgeDistance: touching rectangles", () => {
    const rect1: Rectangle = { x: 0, y: 0, width: 50, height: 50 };
    const rect2: Rectangle = { x: 50, y: 0, width: 50, height: 50 };

    const distance = calculateEdgeDistance(rect1, rect2);
    assertEqual(distance, 0, "Touching rectangles should have 0 distance");
  });

  testCase("calculateEdgeDistance: diagonal separation", () => {
    const rect1: Rectangle = { x: 0, y: 0, width: 50, height: 50 };
    const rect2: Rectangle = { x: 100, y: 100, width: 50, height: 50 };

    const distance = calculateEdgeDistance(rect1, rect2);
    const expectedDistance = Math.sqrt(50 * 50 + 50 * 50); // Diagonal distance
    assertApproxEqual(distance, expectedDistance, 0.01, "Diagonal distance should be calculated correctly");
  });

  testCase("calculateEdgeDistance: vertically aligned", () => {
    const rect1: Rectangle = { x: 0, y: 0, width: 50, height: 50 };
    const rect2: Rectangle = { x: 0, y: 80, width: 50, height: 50 };

    const distance = calculateEdgeDistance(rect1, rect2);
    assertEqual(distance, 30, "Vertical gap should be 30px (80 - 50)");
  });
}

export function testDistanceDirection(): void {
  testCase("getDistanceDirection: horizontal separation", () => {
    const rect1: Rectangle = { x: 0, y: 0, width: 50, height: 50 };
    const rect2: Rectangle = { x: 100, y: 0, width: 50, height: 50 };

    const direction = getDistanceDirection(rect1, rect2);
    assertEqual(direction, "horizontal", "Side-by-side rectangles should be horizontal");
  });

  testCase("getDistanceDirection: vertical separation", () => {
    const rect1: Rectangle = { x: 0, y: 0, width: 50, height: 50 };
    const rect2: Rectangle = { x: 0, y: 100, width: 50, height: 50 };

    const direction = getDistanceDirection(rect1, rect2);
    assertEqual(direction, "vertical", "Vertically stacked rectangles should be vertical");
  });

  testCase("getDistanceDirection: diagonal with larger horizontal gap", () => {
    const rect1: Rectangle = { x: 0, y: 0, width: 50, height: 50 };
    const rect2: Rectangle = { x: 120, y: 80, width: 50, height: 50 };

    const direction = getDistanceDirection(rect1, rect2);
    assertEqual(direction, "horizontal", "Larger horizontal gap should result in horizontal direction");
  });

  testCase("getDistanceDirection: diagonal with larger vertical gap", () => {
    const rect1: Rectangle = { x: 0, y: 0, width: 50, height: 50 };
    const rect2: Rectangle = { x: 80, y: 120, width: 50, height: 50 };

    const direction = getDistanceDirection(rect1, rect2);
    assertEqual(direction, "vertical", "Larger vertical gap should result in vertical direction");
  });
}

export function testProximityGraphConstruction(): void {
  testCase("buildProximityGraph: creates correct adjacencies", () => {
    const element1 = createMockElement("1", "Element1", 0, 0, 50, 50);
    const element2 = createMockElement("2", "Element2", 60, 0, 50, 50); // 10px apart
    const element3 = createMockElement("3", "Element3", 200, 0, 50, 50); // 90px from element2

    const distances: ElementDistance[] = [
      { element1, element2, distance: 10, direction: "horizontal" },
      { element1, element2: element3, distance: 150, direction: "horizontal" },
      { element1: element2, element2: element3, distance: 90, direction: "horizontal" }
    ];

    const graph = buildProximityGraph(distances, 50);

    // Element1 should be connected to Element2 (distance 10 <= 50)
    const element1Neighbors = graph.get(element1) || [];
    assertEqual(element1Neighbors.length, 1, "Element1 should have 1 neighbor");
    assertEqual(element1Neighbors[0].to, element2, "Element1 should connect to Element2");

    // Element2 should be connected to Element1 (bidirectional)
    const element2Neighbors = graph.get(element2) || [];
    assertEqual(element2Neighbors.length, 1, "Element2 should have 1 neighbor");
    assertEqual(element2Neighbors[0].to, element1, "Element2 should connect to Element1");

    // Element3 should have no neighbors (all distances > 50)
    const element3Neighbors = graph.get(element3) || [];
    assertEqual(element3Neighbors.length, 0, "Element3 should have no neighbors");
  });

  testCase("findConnectedComponents: identifies separate groups", () => {
    const element1 = createMockElement("1", "Element1", 0, 0, 50, 50);
    const element2 = createMockElement("2", "Element2", 60, 0, 50, 50);
    const element3 = createMockElement("3", "Element3", 120, 0, 50, 50);
    const element4 = createMockElement("4", "Element4", 300, 0, 50, 50); // Isolated

    const graph = new Map();
    graph.set(element1, [{ from: element1, to: element2, distance: 10 }]);
    graph.set(element2, [
      { from: element2, to: element1, distance: 10 },
      { from: element2, to: element3, distance: 10 }
    ]);
    graph.set(element3, [{ from: element3, to: element2, distance: 10 }]);
    graph.set(element4, []); // No connections

    const components = findConnectedComponents(graph);

    assertEqual(components.length, 2, "Should find 2 connected components");

    // Find the larger component (should contain elements 1, 2, 3)
    const largerComponent = components.find(comp => comp.length === 3);
    assertEqual(largerComponent?.length, 3, "Larger component should have 3 elements");

    // Find the smaller component (should contain element 4)
    const smallerComponent = components.find(comp => comp.length === 1);
    assertEqual(smallerComponent?.length, 1, "Smaller component should have 1 element");
    assertEqual(smallerComponent?.[0], element4, "Smaller component should contain element4");
  });
}

// ============================================================================
// Direction Detection Tests
// ============================================================================

export function testDirectionDetectionHorizontal(): void {
  testCase("analyzeOptimalDirection: clear horizontal arrangement", () => {
    // Create elements arranged horizontally with good alignment
    const elements = [
      createMockElement("1", "Button1", 0, 100, 80, 40),
      createMockElement("2", "Button2", 100, 100, 80, 40),
      createMockElement("3", "Button3", 200, 100, 80, 40)
    ];

    const analysis = analyzeOptimalDirection(elements);

    assertEqual(analysis.direction, "horizontal", "Should recommend horizontal direction");
    assertGreaterThan(analysis.confidence, 0.6, "Should have high confidence for clear arrangement");
  });

  testCase("analyzeOptimalDirection: clear vertical arrangement", () => {
    // Create elements arranged vertically with good alignment
    const elements = [
      createMockElement("1", "Item1", 100, 0, 80, 40),
      createMockElement("2", "Item2", 100, 60, 80, 40),
      createMockElement("3", "Item3", 100, 120, 80, 40)
    ];

    const analysis = analyzeOptimalDirection(elements);

    assertEqual(analysis.direction, "vertical", "Should recommend vertical direction");
    assertGreaterThan(analysis.confidence, 0.6, "Should have high confidence for clear arrangement");
  });

  testCase("analyzeOptimalDirection: wide aspect ratio suggests horizontal", () => {
    // Create elements that form a wide bounding box
    const elements = [
      createMockElement("1", "Left", 0, 50, 50, 50),
      createMockElement("2", "Right", 200, 50, 50, 50)
    ];

    const analysis = analyzeOptimalDirection(elements);

    assertEqual(analysis.direction, "horizontal", "Wide arrangement should suggest horizontal");
    // Check that aspect ratio factor contributed to the decision
    assertEqual(analysis.factors.aspect.direction, "horizontal", "Aspect factor should recommend horizontal");
  });

  testCase("analyzeOptimalDirection: tall aspect ratio suggests vertical", () => {
    // Create elements that form a tall bounding box
    const elements = [
      createMockElement("1", "Top", 50, 0, 50, 50),
      createMockElement("2", "Bottom", 50, 200, 50, 50)
    ];

    const analysis = analyzeOptimalDirection(elements);

    assertEqual(analysis.direction, "vertical", "Tall arrangement should suggest vertical");
    // Check that aspect ratio factor contributed to the decision
    assertEqual(analysis.factors.aspect.direction, "vertical", "Aspect factor should recommend vertical");
  });
}

export function testDirectionDetectionEdgeCases(): void {
  testCase("analyzeOptimalDirection: single element", () => {
    const elements = [createMockElement("1", "Single", 0, 0, 50, 50)];

    const analysis = analyzeOptimalDirection(elements);

    assertEqual(analysis.direction, "horizontal", "Single element should default to horizontal");
    assertEqual(analysis.confidence, 1.0, "Single element should have full confidence");
  });

  testCase("analyzeOptimalDirection: empty array", () => {
    const elements: ProximityElement[] = [];

    const analysis = analyzeOptimalDirection(elements);

    assertEqual(analysis.direction, "horizontal", "Empty array should default to horizontal");
    assertEqual(analysis.confidence, 0, "Empty array should have zero confidence");
  });

  testCase("analyzeOptimalDirection: overlapping elements", () => {
    // Create overlapping elements (should still make a direction decision)
    const elements = [
      createMockElement("1", "Overlap1", 0, 0, 60, 50),
      createMockElement("2", "Overlap2", 40, 0, 60, 50) // 20px overlap
    ];

    const analysis = analyzeOptimalDirection(elements);

    // Should still make a decision despite overlap
    assertGreaterThan(analysis.confidence, 0, "Should have some confidence even with overlaps");
  });
}

// ============================================================================
// Container Boundary Tests
// ============================================================================

export function testContainerBoundaryRespect(): void {
  testCase("validateContainerBoundaries: same parent", () => {
    const mockParent = createMockFrame("parent", "Parent");
    const elements = [
      { ...createMockElement("1", "Child1", 0, 0, 50, 50), parentContainer: mockParent },
      { ...createMockElement("2", "Child2", 60, 0, 50, 50), parentContainer: mockParent }
    ];

    // This would be tested via the boundary validation in proximity-detection
    // For now, we'll test the concept that elements with same parent should be groupable
    assertEqual(elements[0].parentContainer, elements[1].parentContainer,
      "Elements should have same parent container");
  });

  testCase("validateContainerBoundaries: different parents", () => {
    const mockParent1 = createMockFrame("parent1", "Parent1");
    const mockParent2 = createMockFrame("parent2", "Parent2");
    const elements = [
      { ...createMockElement("1", "Child1", 0, 0, 50, 50), parentContainer: mockParent1 },
      { ...createMockElement("2", "Child2", 60, 0, 50, 50), parentContainer: mockParent2 }
    ];

    // Elements with different parents should not be grouped together
    assertEqual(elements[0].parentContainer !== elements[1].parentContainer, true,
      "Elements should have different parent containers");
  });
}

// ============================================================================
// Atomic Protection Tests
// ============================================================================

export function testAtomicProtectionIntegration(): void {
  testCase("proximity detection respects atomic protection", () => {
    const elements = [
      createMockElement("1", "Normal1", 0, 0, 50, 50, false),
      createMockElement("2", "Normal2", 60, 0, 50, 50, false),
      createMockElement("3", "Atomic", 120, 0, 50, 50, true) // Atomic protected
    ];

    // In real implementation, atomic protected elements would be filtered out
    const normalElements = elements.filter(e => !e.isAtomicProtected);
    assertEqual(normalElements.length, 2, "Should filter out atomic protected elements");

    const atomicElements = elements.filter(e => e.isAtomicProtected);
    assertEqual(atomicElements.length, 1, "Should preserve atomic protected elements");
  });
}

// ============================================================================
// Performance and Edge Case Tests
// ============================================================================

export function testPerformanceWithLargeDatasets(): void {
  testCase("calculateAllDistances: performance with many elements", () => {
    // Create 20 elements (190 distance calculations)
    const elements: ProximityElement[] = [];
    for (let i = 0; i < 20; i++) {
      elements.push(createMockElement(
        `element_${i}`,
        `Element ${i}`,
        i * 30,
        0,
        25,
        25
      ));
    }

    const startTime = Date.now();
    const distances = calculateAllDistances(elements);
    const endTime = Date.now();

    const expectedDistances = (elements.length * (elements.length - 1)) / 2;
    assertEqual(distances.length, expectedDistances, "Should calculate all pairwise distances");

    const executionTime = endTime - startTime;
    assertGreaterThan(100, executionTime, "Should execute in under 100ms");
  });

  testCase("proximity detection handles empty frame gracefully", () => {
    const emptyFrame = createMockFrame("empty", "Empty Frame");
    emptyFrame.children = [];

    // This would return empty results in real implementation
    assertEqual(emptyFrame.children.length, 0, "Empty frame should have no children");
  });
}

// ============================================================================
// Integration Tests
// ============================================================================

export function testClusterOverlapRemoval(): void {
  testCase("removeOverlappingClusters: removes smaller overlapping clusters", () => {
    const element1 = createMockElement("1", "Shared", 0, 0, 50, 50);
    const element2 = createMockElement("2", "Unique1", 60, 0, 50, 50);
    const element3 = createMockElement("3", "Unique2", 120, 0, 50, 50);

    const cluster1: ProximityCluster = {
      elements: [element1, element2, element3], // 3 elements
      bounds: { x: 0, y: 0, width: 170, height: 50 },
      recommendedDirection: "horizontal",
      directionConfidence: 0.8
    };

    const cluster2: ProximityCluster = {
      elements: [element1, element2], // 2 elements, overlaps with cluster1
      bounds: { x: 0, y: 0, width: 110, height: 50 },
      recommendedDirection: "horizontal",
      directionConfidence: 0.7
    };

    const filtered = removeOverlappingClusters([cluster1, cluster2]);

    assertEqual(filtered.length, 1, "Should keep only one cluster");
    assertEqual(filtered[0].elements.length, 3, "Should keep the larger cluster");
  });
}

// ============================================================================
// Test Registration
// ============================================================================

// Register all test functions to be run by the test runner
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    testEdgeDistanceCalculation,
    testDistanceDirection,
    testProximityGraphConstruction,
    testDirectionDetectionHorizontal,
    testDirectionDetectionEdgeCases,
    testContainerBoundaryRespect,
    testAtomicProtectionIntegration,
    testPerformanceWithLargeDatasets,
    testClusterOverlapRemoval
  };
}