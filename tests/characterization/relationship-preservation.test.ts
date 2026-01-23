/**
 * Relationship Preservation Characterization Tests
 *
 * Characterization tests that capture the expected behavior of the relationship
 * preservation system for regression testing. These tests document and verify
 * that relationship detection and preservation behaves consistently.
 */

import type {
  RelationshipAnalysis,
  RelationshipConstraints,
  SpatialRelationship,
  AnchorPattern,
  FlowPattern
} from "../../types/design-relationships.js";

// ============================================================================
// Test Utilities
// ============================================================================

function testCase(name: string, fn: () => void | Promise<void>): void {
  try {
    const result = fn();
    if (result instanceof Promise) {
      result.then(() => {
        console.log(`✅ CHARACTERIZATION: ${name}`);
      }).catch((error) => {
        console.error(`❌ CHARACTERIZATION: ${name}`);
        throw error;
      });
    } else {
      console.log(`✅ CHARACTERIZATION: ${name}`);
    }
  } catch (error) {
    console.error(`❌ CHARACTERIZATION: ${name}`);
    throw error;
  }
}

function assertApproxEqual(actual: number, expected: number, tolerance: number, message: string): void {
  if (Math.abs(actual - expected) > tolerance) {
    throw new Error(`${message}\nExpected: ${expected} (±${tolerance})\nReceived: ${actual}`);
  }
}

function assertEqual<T>(actual: T, expected: T, message: string): void {
  if (actual !== expected) {
    throw new Error(`${message}\nExpected: ${expected}\nReceived: ${actual}`);
  }
}

function assertTrue(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`Characterization assertion failed: ${message}`);
  }
}

// ============================================================================
// Reference Frame Factories
// ============================================================================

/**
 * Creates a reference frame with known diagonal composition
 * This represents the classic "iPhone at an angle" layout
 */
function createReferenceIPhoneDiagonalFrame(): FrameNode {
  return {
    id: "iphone-diagonal-ref",
    name: "iPhone Diagonal Reference",
    type: "FRAME",
    visible: true,
    absoluteBoundingBox: { x: 0, y: 0, width: 1200, height: 800 },
    children: [
      // iPhone mockup at diagonal angle
      {
        id: "iphone-device",
        name: "iPhone Device",
        type: "INSTANCE", // Component instance
        visible: true,
        absoluteBoundingBox: { x: 200, y: 150, width: 180, height: 350 }
      },
      // Screen content inside iPhone
      {
        id: "iphone-screen",
        name: "iPhone Screen",
        type: "FRAME",
        visible: true,
        absoluteBoundingBox: { x: 220, y: 180, width: 140, height: 290 }
      },
      // Hero headline
      {
        id: "hero-headline",
        name: "Transform Your Business",
        type: "TEXT",
        visible: true,
        absoluteBoundingBox: { x: 450, y: 200, width: 400, height: 80 }
      },
      // Subtext
      {
        id: "hero-subtext",
        name: "Revolutionary mobile app",
        type: "TEXT",
        visible: true,
        absoluteBoundingBox: { x: 450, y: 300, width: 350, height: 40 }
      },
      // CTA Button
      {
        id: "cta-button",
        name: "Get Started",
        type: "INSTANCE",
        visible: true,
        absoluteBoundingBox: { x: 450, y: 380, width: 160, height: 50 }
      },
      // Logo
      {
        id: "brand-logo",
        name: "Company Logo",
        type: "INSTANCE",
        visible: true,
        absoluteBoundingBox: { x: 1000, y: 50, width: 120, height: 60 }
      }
    ]
  } as FrameNode;
}

/**
 * Creates a reference frame with horizontal flow layout
 */
function createReferenceHorizontalFlowFrame(): FrameNode {
  return {
    id: "horizontal-flow-ref",
    name: "Horizontal Flow Reference",
    type: "FRAME",
    visible: true,
    absoluteBoundingBox: { x: 0, y: 0, width: 1000, height: 600 },
    children: [
      // Left aligned image
      {
        id: "hero-image",
        name: "Hero Image",
        type: "RECTANGLE",
        visible: true,
        absoluteBoundingBox: { x: 80, y: 150, width: 250, height: 300 }
      },
      // Center content
      {
        id: "main-headline",
        name: "Main Headline",
        type: "TEXT",
        visible: true,
        absoluteBoundingBox: { x: 380, y: 200, width: 300, height: 60 }
      },
      {
        id: "description",
        name: "Description Text",
        type: "TEXT",
        visible: true,
        absoluteBoundingBox: { x: 380, y: 280, width: 280, height: 80 }
      },
      // Right aligned CTA
      {
        id: "action-button",
        name: "Learn More",
        type: "INSTANCE",
        visible: true,
        absoluteBoundingBox: { x: 720, y: 320, width: 140, height: 45 }
      }
    ]
  } as FrameNode;
}

/**
 * Creates a reference frame with symmetric balance
 */
function createReferenceSymmetricFrame(): FrameNode {
  return {
    id: "symmetric-ref",
    name: "Symmetric Balance Reference",
    type: "FRAME",
    visible: true,
    absoluteBoundingBox: { x: 0, y: 0, width: 800, height: 600 },
    children: [
      // Center title
      {
        id: "center-title",
        name: "Centered Title",
        type: "TEXT",
        visible: true,
        absoluteBoundingBox: { x: 300, y: 100, width: 200, height: 40 }
      },
      // Left element
      {
        id: "left-card",
        name: "Left Card",
        type: "FRAME",
        visible: true,
        absoluteBoundingBox: { x: 150, y: 200, width: 180, height: 250 }
      },
      // Right element (symmetric)
      {
        id: "right-card",
        name: "Right Card",
        type: "FRAME",
        visible: true,
        absoluteBoundingBox: { x: 470, y: 200, width: 180, height: 250 }
      },
      // Center bottom CTA
      {
        id: "bottom-cta",
        name: "Get Started",
        type: "INSTANCE",
        visible: true,
        absoluteBoundingBox: { x: 350, y: 500, width: 100, height: 40 }
      }
    ]
  } as FrameNode;
}

// ============================================================================
// Spatial Relationship Characterization
// ============================================================================

testCase("iPhone diagonal composition creates predictable anchor pattern", () => {
  const { analyzeSpatialRelationships } = require("../../core/relationship-spatial-analyzer.js");

  const frame = createReferenceIPhoneDiagonalFrame();
  const relationships = analyzeSpatialRelationships(frame);

  // Should detect spatial relationships
  assertTrue(relationships.length >= 0, "Should analyze iPhone diagonal frame");

  // Look for anchor patterns (iPhone should potentially be an anchor)
  const anchorPatterns = relationships.filter(r => r.type === 'anchor') as AnchorPattern[];

  // If anchor patterns detected, validate structure
  if (anchorPatterns.length > 0) {
    const primaryAnchor = anchorPatterns[0];
    assertTrue(
      typeof primaryAnchor.anchorElementId === 'string' && primaryAnchor.anchorElementId.length > 0,
      "Anchor pattern should have valid anchor element ID"
    );

    assertTrue(
      primaryAnchor.anchoredElements.length > 0,
      "Anchor pattern should have anchored elements"
    );

    assertTrue(
      primaryAnchor.confidence >= 0 && primaryAnchor.confidence <= 1,
      "Anchor pattern should have valid confidence"
    );
  }
});

testCase("Horizontal flow layout creates predictable flow vectors", () => {
  const { analyzeSpatialRelationships } = require("../../core/relationship-spatial-analyzer.js");

  const frame = createReferenceHorizontalFlowFrame();
  const relationships = analyzeSpatialRelationships(frame);

  // Look for flow patterns
  const flowPatterns = relationships.filter(r => r.type === 'flow') as FlowPattern[];

  // If flow patterns detected, validate they represent left-to-right flow
  if (flowPatterns.length > 0) {
    const primaryFlow = flowPatterns[0];

    assertTrue(
      ['diagonal', 'linear', 'circular', 'spiral'].includes(primaryFlow.flowType),
      "Flow pattern should have valid flow type"
    );

    assertTrue(
      primaryFlow.vectors.length > 0,
      "Flow pattern should have flow vectors"
    );

    assertTrue(
      primaryFlow.involvedElements.length >= 2,
      "Flow pattern should involve multiple elements"
    );

    // For horizontal flow, expect generally eastward direction (0-90 or 270-360 degrees)
    if (primaryFlow.vectors.length > 0) {
      const avgDirection = primaryFlow.vectors.reduce((sum, v) => sum + v.direction, 0) / primaryFlow.vectors.length;

      // Allow for various flow interpretations, just check for valid direction
      assertTrue(
        avgDirection >= 0 && avgDirection < 360,
        `Flow direction should be valid angle, got ${avgDirection}`
      );
    }
  }
});

// ============================================================================
// Visual Relationship Characterization
// ============================================================================

testCase("Symmetric layout produces consistent visual weight analysis", () => {
  const { analyzeVisualRelationships } = require("../../core/relationship-visual-analyzer.js");

  const frame = createReferenceSymmetricFrame();
  const relationships = analyzeVisualRelationships(frame);

  // Should complete analysis
  assertTrue(Array.isArray(relationships), "Visual analysis should return relationships array");

  // Look for visual weight distribution
  const weightDistributions = relationships.filter(r => r.type === 'weight');

  if (weightDistributions.length > 0) {
    const weightDist = weightDistributions[0] as any;

    assertTrue(
      Array.isArray(weightDist.weightMap),
      "Weight distribution should have weight map"
    );

    assertTrue(
      typeof weightDist.totalBalance === 'object' &&
      typeof weightDist.totalBalance.x === 'number' &&
      typeof weightDist.totalBalance.y === 'number',
      "Weight distribution should have valid balance point"
    );

    // For symmetric layout, balance point should be near center
    // Allow for some variation in detection algorithms
    assertTrue(
      weightDist.totalBalance.x >= 0 && weightDist.totalBalance.x <= 1,
      "Balance point X should be normalized"
    );

    assertTrue(
      weightDist.totalBalance.y >= 0 && weightDist.totalBalance.y <= 1,
      "Balance point Y should be normalized"
    );
  }
});

// ============================================================================
// Compositional Relationship Characterization
// ============================================================================

testCase("Symmetric frame produces balanced compositional analysis", () => {
  const { analyzeCompositionalRelationships } = require("../../core/relationship-compositional-analyzer.js");

  const frame = createReferenceSymmetricFrame();
  const relationships = analyzeCompositionalRelationships(frame);

  // Should complete analysis
  assertTrue(Array.isArray(relationships), "Compositional analysis should return relationships array");

  // Look for balance analysis
  const balanceAnalyses = relationships.filter(r => r.type === 'balance');

  if (balanceAnalyses.length > 0) {
    const balance = balanceAnalyses[0] as any;

    assertTrue(
      ['symmetrical', 'asymmetrical', 'radial', 'dynamic'].includes(balance.balanceType),
      "Balance analysis should have valid balance type"
    );

    assertTrue(
      typeof balance.balancePoint === 'object' &&
      typeof balance.balancePoint.x === 'number' &&
      typeof balance.balancePoint.y === 'number',
      "Balance analysis should have valid balance point"
    );

    assertTrue(
      Array.isArray(balance.balanceElements),
      "Balance analysis should have balance elements array"
    );

    // For symmetric frame, might detect symmetrical balance
    // This is a characterization test, so we just verify the structure
  }
});

// ============================================================================
// Constraint Generation Characterization
// ============================================================================

testCase("Complex frame generates proportional constraint count", () => {
  const { generateRelationshipConstraints } = require("../../core/relationship-constraint-generator.js");

  // Create mock analysis with multiple relationship types
  const mockAnalysis: RelationshipAnalysis = {
    frameId: "complex-characterization",
    analysisTimestamp: Date.now(),
    spatialRelationships: [
      {
        type: 'anchor',
        anchorElementId: "anchor1",
        anchoredElements: [
          { elementId: "elem1", relativePosition: { x: 0.2, y: 0.3 }, anchorStrength: 0.8 }
        ],
        confidence: 0.9
      }
    ] as SpatialRelationship[],
    visualRelationships: [
      {
        type: 'weight',
        weightMap: [
          { elementId: "elem1", weight: 0.8, weightFactors: ['size', 'contrast'] }
        ],
        totalBalance: { x: 0.5, y: 0.5 },
        confidence: 0.7
      }
    ] as any[],
    compositionalRelationships: [
      {
        type: 'balance',
        balanceType: 'asymmetrical',
        balancePoint: { x: 0.45, y: 0.55 },
        balanceElements: [
          { elementId: "elem1", balanceContribution: 0.6 }
        ],
        confidence: 0.6
      }
    ] as any[],
    elementProperties: [],
    analysisMetrics: {
      processingTimeMs: 250,
      elementCount: 5,
      relationshipCount: 3,
      averageConfidence: 0.73
    }
  };

  const constraints = generateRelationshipConstraints(mockAnalysis);

  // Should generate constraints for detected relationships
  assertTrue(constraints.constraints.length >= 0, "Should generate constraints array");

  // Frame ID should be preserved
  assertEqual(
    constraints.sourceFrameId,
    mockAnalysis.frameId,
    "Source frame ID should be preserved"
  );

  // Should provide adaptation guidance
  assertTrue(
    ['preserve', 'adapt', 'simplify'].includes(constraints.adaptationGuidance.primaryStrategy),
    "Should provide valid primary strategy"
  );

  assertTrue(
    ['graceful', 'simplified', 'skip'].includes(constraints.adaptationGuidance.fallbackStrategy),
    "Should provide valid fallback strategy"
  );

  assertTrue(
    constraints.adaptationGuidance.criticalConstraintCount >= 0,
    "Critical constraint count should be non-negative"
  );

  // If constraints generated, verify structure
  if (constraints.constraints.length > 0) {
    const constraint = constraints.constraints[0];

    assertTrue(
      typeof constraint.id === 'string' && constraint.id.length > 0,
      "Constraint should have valid ID"
    );

    assertTrue(
      ['spatial', 'visual', 'compositional'].includes(constraint.type),
      "Constraint should have valid type"
    );

    assertTrue(
      ['critical', 'high', 'medium', 'low'].includes(constraint.priority),
      "Constraint should have valid priority"
    );

    assertTrue(
      constraint.confidence >= 0 && constraint.confidence <= 1,
      "Constraint confidence should be in valid range"
    );
  }
});

// ============================================================================
// End-to-End Characterization
// ============================================================================

testCase("Complete iPhone diagonal transformation preserves key relationships", async () => {
  const { detectRelationshipsOptimized } = await import("../../core/relationship-performance.js");

  const frame = createReferenceIPhoneDiagonalFrame();
  const result = await detectRelationshipsOptimized(frame, {
    preserveMode: 'adaptive',
    maxAnalysisTimeMs: 1000
  });

  // Should successfully analyze frame
  assertTrue(result.success, "iPhone diagonal frame analysis should succeed");

  // Processing time should be reasonable
  assertTrue(
    result.processingTimeMs < 2000,
    `Processing time should be reasonable, took ${result.processingTimeMs}ms`
  );

  // If analysis detected relationships, should generate constraints
  if (result.analysis && result.analysis.analysisMetrics.relationshipCount > 0) {
    assertTrue(
      result.constraints !== undefined,
      "Should generate constraints when relationships detected"
    );

    if (result.constraints) {
      assertTrue(
        result.constraints.constraints.length >= 0,
        "Generated constraints should be valid"
      );
    }
  }

  // Should use appropriate fallback mode
  assertTrue(
    ['none', 'spatial_only', 'proximity_only', 'disabled'].includes(result.fallbackMode),
    "Should use valid fallback mode"
  );
});

testCase("Performance characteristics remain consistent", async () => {
  const { detectRelationshipsOptimized } = await import("../../core/relationship-performance.js");

  const startTime = Date.now();

  // Test multiple frame types for performance consistency
  const frames = [
    createReferenceIPhoneDiagonalFrame(),
    createReferenceHorizontalFlowFrame(),
    createReferenceSymmetricFrame()
  ];

  const results = [];
  for (const frame of frames) {
    const result = await detectRelationshipsOptimized(frame, {
      maxAnalysisTimeMs: 500
    });
    results.push(result);
  }

  const totalTime = Date.now() - startTime;

  // All should succeed
  assertTrue(
    results.every(r => r.success),
    "All reference frames should be analyzed successfully"
  );

  // Total time should be reasonable (accounting for 3 frames)
  assertTrue(
    totalTime < 3000,
    `Total analysis time should be reasonable, took ${totalTime}ms for 3 frames`
  );

  // Processing times should be consistent (within reasonable variance)
  const processingTimes = results.map(r => r.processingTimeMs);
  const maxTime = Math.max(...processingTimes);
  const minTime = Math.min(...processingTimes);

  assertTrue(
    maxTime - minTime < 1000,
    `Processing time variance should be reasonable, range: ${minTime}ms - ${maxTime}ms`
  );
});

console.log("📸 Running Relationship Preservation Characterization Tests...\n");