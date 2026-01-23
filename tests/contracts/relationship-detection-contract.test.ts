/**
 * Relationship Detection Contract Tests
 *
 * Tests that ensure the relationship detection system maintains its
 * interface contracts and behavioral guarantees across refactoring.
 */

import type {
  RelationshipAnalysis,
  RelationshipConstraints,
  RelationshipDetectionConfig,
  RelationshipDetectionResult,
  SpatialRelationship,
  VisualRelationship,
  CompositionalRelationship
} from "../../types/design-relationships.js";

// ============================================================================
// Test Utilities
// ============================================================================

function testCase(name: string, fn: () => void | Promise<void>): void {
  try {
    const result = fn();
    if (result instanceof Promise) {
      result.then(() => {
        console.log(`✅ CONTRACT: ${name}`);
      }).catch((error) => {
        console.error(`❌ CONTRACT: ${name}`);
        throw error;
      });
    } else {
      console.log(`✅ CONTRACT: ${name}`);
    }
  } catch (error) {
    console.error(`❌ CONTRACT: ${name}`);
    throw error;
  }
}

function assertTrue(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`Contract violation: ${message}`);
  }
}

function assertType(value: unknown, expectedType: string, message: string): void {
  const actualType = typeof value;
  if (actualType !== expectedType) {
    throw new Error(`Type contract violation: ${message}\nExpected: ${expectedType}\nReceived: ${actualType}`);
  }
}

function assertArrayType<T>(array: unknown, itemTypeCheck: (item: T) => boolean, message: string): void {
  if (!Array.isArray(array)) {
    throw new Error(`Contract violation: ${message} - Expected array`);
  }

  for (const item of array) {
    if (!itemTypeCheck(item)) {
      throw new Error(`Contract violation: ${message} - Invalid array item type`);
    }
  }
}

// ============================================================================
// Mock Frame Factory
// ============================================================================

function createValidMockFrame(id: string = "contract-test-frame"): FrameNode {
  return {
    id,
    name: "Contract Test Frame",
    type: "FRAME",
    visible: true,
    absoluteBoundingBox: {
      x: 0,
      y: 0,
      width: 800,
      height: 600
    },
    children: [
      {
        id: "child1",
        name: "Child 1",
        type: "RECTANGLE",
        visible: true,
        absoluteBoundingBox: { x: 100, y: 100, width: 150, height: 100 }
      },
      {
        id: "child2",
        name: "Child 2",
        type: "TEXT",
        visible: true,
        absoluteBoundingBox: { x: 300, y: 200, width: 200, height: 50 }
      }
    ]
  } as FrameNode;
}

// ============================================================================
// Interface Contract Tests
// ============================================================================

testCase("RelationshipAnalysis interface contract", () => {
  // Test that a valid RelationshipAnalysis object has all required properties
  const mockAnalysis: RelationshipAnalysis = {
    frameId: "test-frame",
    analysisTimestamp: Date.now(),
    spatialRelationships: [],
    visualRelationships: [],
    compositionalRelationships: [],
    elementProperties: [],
    analysisMetrics: {
      processingTimeMs: 100,
      elementCount: 5,
      relationshipCount: 2,
      averageConfidence: 0.75
    }
  };

  // Verify required properties exist and have correct types
  assertType(mockAnalysis.frameId, "string", "frameId must be string");
  assertType(mockAnalysis.analysisTimestamp, "number", "analysisTimestamp must be number");
  assertTrue(Array.isArray(mockAnalysis.spatialRelationships), "spatialRelationships must be array");
  assertTrue(Array.isArray(mockAnalysis.visualRelationships), "visualRelationships must be array");
  assertTrue(Array.isArray(mockAnalysis.compositionalRelationships), "compositionalRelationships must be array");
  assertTrue(Array.isArray(mockAnalysis.elementProperties), "elementProperties must be array");

  // Verify metrics structure
  assertType(mockAnalysis.analysisMetrics.processingTimeMs, "number", "processingTimeMs must be number");
  assertType(mockAnalysis.analysisMetrics.elementCount, "number", "elementCount must be number");
  assertType(mockAnalysis.analysisMetrics.relationshipCount, "number", "relationshipCount must be number");
  assertType(mockAnalysis.analysisMetrics.averageConfidence, "number", "averageConfidence must be number");

  // Verify confidence bounds
  assertTrue(
    mockAnalysis.analysisMetrics.averageConfidence >= 0 && mockAnalysis.analysisMetrics.averageConfidence <= 1,
    "averageConfidence must be between 0 and 1"
  );
});

testCase("RelationshipConstraints interface contract", () => {
  const mockConstraints: RelationshipConstraints = {
    sourceFrameId: "test-frame",
    constraints: [{
      id: "test-constraint",
      type: 'spatial',
      subtype: 'anchor-pattern',
      priority: 'high',
      involvedElements: ["element1", "element2"],
      description: "Test constraint",
      confidence: 0.85,
      preservationRule: "Maintain anchor relationship"
    }],
    constraintGroups: [{
      groupId: "spatial-group",
      groupType: 'dependent',
      constraintIds: ["test-constraint"]
    }],
    adaptationGuidance: {
      primaryStrategy: 'preserve',
      fallbackStrategy: 'adaptive',
      criticalConstraintCount: 1
    }
  };

  // Verify structure
  assertType(mockConstraints.sourceFrameId, "string", "sourceFrameId must be string");
  assertTrue(Array.isArray(mockConstraints.constraints), "constraints must be array");
  assertTrue(Array.isArray(mockConstraints.constraintGroups), "constraintGroups must be array");

  // Verify constraint properties
  if (mockConstraints.constraints.length > 0) {
    const constraint = mockConstraints.constraints[0];
    assertType(constraint.id, "string", "constraint.id must be string");
    assertType(constraint.description, "string", "constraint.description must be string");
    assertType(constraint.confidence, "number", "constraint.confidence must be number");

    assertTrue(
      constraint.confidence >= 0 && constraint.confidence <= 1,
      "constraint.confidence must be between 0 and 1"
    );

    assertTrue(
      ['critical', 'high', 'medium', 'low'].includes(constraint.priority),
      "constraint.priority must be valid priority level"
    );
  }
});

testCase("RelationshipDetectionResult interface contract", () => {
  const mockResult: RelationshipDetectionResult = {
    success: true,
    analysis: {
      frameId: "test",
      analysisTimestamp: Date.now(),
      spatialRelationships: [],
      visualRelationships: [],
      compositionalRelationships: [],
      elementProperties: [],
      analysisMetrics: {
        processingTimeMs: 50,
        elementCount: 3,
        relationshipCount: 1,
        averageConfidence: 0.6
      }
    },
    constraints: {
      sourceFrameId: "test",
      constraints: [],
      constraintGroups: [],
      adaptationGuidance: {
        primaryStrategy: 'adaptive',
        fallbackStrategy: 'simplified',
        criticalConstraintCount: 0
      }
    },
    fallbackMode: 'none',
    processingTimeMs: 100
  };

  // Verify required properties
  assertType(mockResult.success, "boolean", "success must be boolean");
  assertType(mockResult.fallbackMode, "string", "fallbackMode must be string");
  assertType(mockResult.processingTimeMs, "number", "processingTimeMs must be number");

  // Verify valid fallback modes
  assertTrue(
    ['none', 'spatial_only', 'proximity_only', 'disabled'].includes(mockResult.fallbackMode),
    "fallbackMode must be valid fallback mode"
  );

  // If successful, should have analysis and constraints (optional)
  if (mockResult.success && mockResult.analysis) {
    assertTrue(typeof mockResult.analysis === 'object', "analysis must be object when present");
  }
});

testCase("SpatialRelationship union type contract", () => {
  // Test anchor pattern
  const anchorPattern: SpatialRelationship = {
    type: 'anchor',
    anchorElementId: "anchor-element",
    anchoredElements: [{
      elementId: "anchored-1",
      relativePosition: { x: 0.5, y: 0.3 },
      anchorStrength: 0.8
    }],
    confidence: 0.9
  };

  assertType(anchorPattern.type, "string", "type must be string");
  assertTrue(anchorPattern.type === 'anchor', "anchor pattern must have type 'anchor'");
  assertType(anchorPattern.confidence, "number", "confidence must be number");

  // Test flow pattern
  const flowPattern: SpatialRelationship = {
    type: 'flow',
    flowType: 'diagonal',
    vectors: [{
      direction: 45,
      magnitude: 0.7,
      from: { x: 0.2, y: 0.2 },
      to: { x: 0.8, y: 0.8 }
    }],
    involvedElements: ["elem1", "elem2"],
    confidence: 0.85
  };

  assertTrue(flowPattern.type === 'flow', "flow pattern must have type 'flow'");
  assertTrue(
    ['diagonal', 'circular', 'linear', 'spiral'].includes(flowPattern.flowType),
    "flowType must be valid flow type"
  );
});

// ============================================================================
// Behavioral Contract Tests
// ============================================================================

testCase("Detection function always returns valid result structure", async () => {
  const { detectRelationshipsOptimized } = await import("../../core/relationship-performance.js");

  const frame = createValidMockFrame();
  const result = await detectRelationshipsOptimized(frame);

  // Must always return valid result structure
  assertTrue(typeof result === 'object', "Must return object result");
  assertType(result.success, "boolean", "Must have success property");
  assertType(result.fallbackMode, "string", "Must have fallbackMode property");
  assertType(result.processingTimeMs, "number", "Must have processingTimeMs property");

  // processingTimeMs must be non-negative
  assertTrue(result.processingTimeMs >= 0, "processingTimeMs must be non-negative");

  // If successful and has analysis, analysis must be valid
  if (result.success && result.analysis) {
    assertType(result.analysis.frameId, "string", "analysis.frameId must be string");
    assertTrue(Array.isArray(result.analysis.spatialRelationships), "must have valid spatialRelationships array");
  }

  // If has error, must be string
  if (result.error) {
    assertType(result.error, "string", "error must be string when present");
  }
});

testCase("Constraint generation preserves input frame ID", () => {
  const { generateRelationshipConstraints } = require("../../core/relationship-constraint-generator.js");

  const mockAnalysis: RelationshipAnalysis = {
    frameId: "specific-frame-id-12345",
    analysisTimestamp: Date.now(),
    spatialRelationships: [],
    visualRelationships: [],
    compositionalRelationships: [],
    elementProperties: [],
    analysisMetrics: {
      processingTimeMs: 10,
      elementCount: 0,
      relationshipCount: 0,
      averageConfidence: 0
    }
  };

  const constraints = generateRelationshipConstraints(mockAnalysis);

  // Must preserve the frame ID
  assertTrue(
    constraints.sourceFrameId === mockAnalysis.frameId,
    "Generated constraints must preserve source frame ID"
  );
});

testCase("Validation function handles empty constraints gracefully", () => {
  const { validateRelationshipPreservation } = require("../../core/relationship-validator.js");

  const emptySpecs = {
    plan: {
      designStrategy: "test",
      layoutZones: { hook: { top: 0, bottom: 100 }, main: { top: 0, bottom: 100 }, safe: { top: 0, bottom: 100 } },
      designAnalysis: {
        visualFocal: "", compositionalFlow: "", layoutLogic: "", typographyHierarchy: "",
        imageRoles: "", colorHarmony: "", designIntent: "", criticalRelationships: [], completeThoughts: []
      },
      adaptationNotes: ""
    },
    nodes: [],
    confidence: 0.5,
    warnings: []
  };

  const emptyConstraints: RelationshipConstraints = {
    sourceFrameId: "test",
    constraints: [],
    constraintGroups: [],
    adaptationGuidance: {
      primaryStrategy: 'simplify',
      fallbackStrategy: 'skip',
      criticalConstraintCount: 0
    }
  };

  const result = validateRelationshipPreservation(emptySpecs, emptyConstraints);

  // Must return valid validation result structure
  assertType(result.passed, "boolean", "validation result must have passed property");
  assertType(result.score, "number", "validation result must have score property");
  assertTrue(Array.isArray(result.violations), "validation result must have violations array");
  assertType(result.summary, "string", "validation result must have summary string");

  // Score must be in valid range
  assertTrue(result.score >= 0 && result.score <= 1, "validation score must be between 0 and 1");
});

// ============================================================================
// Performance Contract Tests
// ============================================================================

testCase("Detection function respects timeout configuration", async () => {
  const { detectRelationshipsOptimized } = await import("../../core/relationship-performance.js");

  const frame = createValidMockFrame();
  const startTime = Date.now();

  const result = await detectRelationshipsOptimized(frame, {
    maxAnalysisTimeMs: 100 // Very short timeout
  });

  const actualDuration = Date.now() - startTime;

  // Should not take significantly longer than timeout (allow some overhead)
  assertTrue(
    actualDuration < 1000, // 1 second max regardless of timeout
    `Detection should respect timeout bounds, took ${actualDuration}ms`
  );

  // Must still return valid result even with tight timeout
  assertTrue(typeof result === 'object', "Must return valid result even with timeout");
  assertType(result.success, "boolean", "Must have success property even with timeout");
});

testCase("Memory management prevents infinite element analysis", async () => {
  const { detectRelationshipsOptimized } = await import("../../core/relationship-performance.js");

  // Create frame with many children to test complexity limits
  const complexFrame = createValidMockFrame();
  complexFrame.children = Array(200).fill(null).map((_, i) => ({
    id: `child-${i}`,
    name: `Child ${i}`,
    type: "RECTANGLE",
    visible: true,
    absoluteBoundingBox: { x: i * 10, y: i * 10, width: 50, height: 50 }
  })) as SceneNode[];

  const result = await detectRelationshipsOptimized(complexFrame, {
    maxElementCount: 100 // Limit complexity
  });

  // Should handle complex frames gracefully
  assertTrue(result.success, "Should handle complex frames without crashing");

  // Should use appropriate fallback for complex frames
  assertTrue(
    result.fallbackMode === 'spatial_only' ||
    result.fallbackMode === 'proximity_only' ||
    result.fallbackMode === 'disabled',
    "Should use fallback mode for complex frames"
  );
});

console.log("🔗 Running Relationship Detection Contract Tests...\n");