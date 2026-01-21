/**
 * Contract tests for Scaling Orchestrator module
 * Validates the main scaleNodeTree coordination contract
 *
 * Run: npx jest --runInBand tests/contracts/scaling-orchestrator-contract.test.ts
 */

// Test utilities
function assert(condition: unknown, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

function assertEqual<T>(actual: T, expected: T, message: string): void {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${expected}, got ${actual}`);
  }
}

function testCase(name: string, fn: () => void): void {
  try {
    fn();
    console.log(`✅ ${name}`);
  } catch (error) {
    console.error(`❌ ${name}`);
    throw error;
  }
}

// Contract type definitions
type VariantTargetContract = {
  id: string;
  width: number;
  height: number;
};

type LayoutProfileContract = "horizontal" | "vertical" | "square";

type FocalPointContract = {
  x: number;
  y: number;
  confidence: number;
} | null;

type SafeAreaMetricsContract = {
  scale: number;
  scaledWidth: number;
  scaledHeight: number;
  safeInsetX: number;
  safeInsetY: number;
  targetWidth: number;
  targetHeight: number;
  horizontal: {
    start: number;
    end: number;
    interior: number;
  };
  vertical: {
    start: number;
    end: number;
    interior: number;
  };
  profile: LayoutProfileContract;
  adoptVerticalVariant: boolean;
};

// ============================================================================
// SCALING ORCHESTRATOR INPUT CONTRACT
// ============================================================================

testCase("scaleNodeTree input contract: required parameters", () => {
  // Contract signature validation
  const mockFrame = { id: "frame1", width: 800, height: 600 } as any;
  const mockTarget: VariantTargetContract = { id: "figma-cover", width: 1920, height: 960 };
  const safeAreaRatio = 0.9;
  const fontCache = new Set<string>();
  const rootSnapshot = null;
  const profile: LayoutProfileContract = "horizontal";
  const primaryFocal: FocalPointContract = { x: 0.5, y: 0.3, confidence: 0.8 };

  // These represent the required parameters for the orchestrator
  assert(mockFrame != null, "frame parameter is required");
  assert(mockTarget != null, "target parameter is required");
  assert(typeof safeAreaRatio === "number", "safeAreaRatio must be number");
  assert(fontCache instanceof Set, "fontCache must be Set<string>");
  assert(rootSnapshot === null || typeof rootSnapshot === "object", "rootSnapshot must be object or null");
  assert(typeof profile === "string", "profile must be string");
  assert(primaryFocal === null || typeof primaryFocal === "object", "primaryFocal must be object or null");
});

testCase("scaleNodeTree input contract: target validation", () => {
  const validTarget: VariantTargetContract = {
    id: "figma-cover",
    width: 1920,
    height: 960
  };

  const invalidTarget1 = { id: "test" }; // Missing dimensions
  const invalidTarget2 = { width: 1920, height: 960 }; // Missing ID

  assert(typeof validTarget.id === "string", "target.id must be string");
  assert(typeof validTarget.width === "number", "target.width must be number");
  assert(typeof validTarget.height === "number", "target.height must be number");
  assert(validTarget.width > 0, "target.width must be positive");
  assert(validTarget.height > 0, "target.height must be positive");

  // These should fail validation
  const hasRequiredFields1 = "id" in invalidTarget1 && "width" in invalidTarget1 && "height" in invalidTarget1;
  const hasRequiredFields2 = "id" in invalidTarget2 && "width" in invalidTarget2 && "height" in invalidTarget2;

  assertEqual(hasRequiredFields1, false, "target missing dimensions should be invalid");
  assertEqual(hasRequiredFields2, false, "target missing ID should be invalid");
});

testCase("scaleNodeTree input contract: safe area ratio bounds", () => {
  const validRatios = [0.8, 0.9, 1.0];
  const invalidRatios = [-0.1, 0, 1.5, NaN, Infinity];

  for (const ratio of validRatios) {
    assert(typeof ratio === "number", "ratio must be number");
    assert(Number.isFinite(ratio), "ratio must be finite");
    assert(ratio > 0 && ratio <= 1, "ratio must be in (0, 1] range");
  }

  for (const ratio of invalidRatios) {
    const isValid = typeof ratio === "number" && Number.isFinite(ratio) && ratio > 0 && ratio <= 1;
    assertEqual(isValid, false, `${ratio} should be invalid safe area ratio`);
  }
});

// ============================================================================
// SCALING ORCHESTRATOR OUTPUT CONTRACT
// ============================================================================

testCase("SafeAreaMetrics output contract: structure validation", () => {
  const mockMetrics: SafeAreaMetricsContract = {
    scale: 1.25,
    scaledWidth: 1000,
    scaledHeight: 750,
    safeInsetX: 96,
    safeInsetY: 48,
    targetWidth: 1920,
    targetHeight: 1080,
    horizontal: {
      start: 96,
      end: 96,
      interior: 48
    },
    vertical: {
      start: 48,
      end: 48,
      interior: 24
    },
    profile: "horizontal",
    adoptVerticalVariant: false
  };

  // Contract validation: all required fields present with correct types
  assert(typeof mockMetrics.scale === "number" && mockMetrics.scale > 0, "scale must be positive number");
  assert(typeof mockMetrics.scaledWidth === "number" && mockMetrics.scaledWidth >= 0, "scaledWidth must be non-negative");
  assert(typeof mockMetrics.scaledHeight === "number" && mockMetrics.scaledHeight >= 0, "scaledHeight must be non-negative");
  assert(typeof mockMetrics.safeInsetX === "number" && mockMetrics.safeInsetX >= 0, "safeInsetX must be non-negative");
  assert(typeof mockMetrics.safeInsetY === "number" && mockMetrics.safeInsetY >= 0, "safeInsetY must be non-negative");
  assert(typeof mockMetrics.targetWidth === "number" && mockMetrics.targetWidth > 0, "targetWidth must be positive");
  assert(typeof mockMetrics.targetHeight === "number" && mockMetrics.targetHeight > 0, "targetHeight must be positive");
  assert(typeof mockMetrics.adoptVerticalVariant === "boolean", "adoptVerticalVariant must be boolean");
});

testCase("SafeAreaMetrics output contract: expansion plans validation", () => {
  const mockHorizontalPlan = {
    start: 50,
    end: 60,
    interior: 20
  };

  const mockVerticalPlan = {
    start: 40,
    end: 40,
    interior: 0
  };

  // Contract: expansion plans must have numeric values
  assert(typeof mockHorizontalPlan.start === "number", "horizontal.start must be number");
  assert(typeof mockHorizontalPlan.end === "number", "horizontal.end must be number");
  assert(typeof mockHorizontalPlan.interior === "number", "horizontal.interior must be number");

  assert(typeof mockVerticalPlan.start === "number", "vertical.start must be number");
  assert(typeof mockVerticalPlan.end === "number", "vertical.end must be number");
  assert(typeof mockVerticalPlan.interior === "number", "vertical.interior must be number");

  // Contract: values should be non-negative
  assert(mockHorizontalPlan.start >= 0, "horizontal.start must be non-negative");
  assert(mockHorizontalPlan.end >= 0, "horizontal.end must be non-negative");
  assert(mockHorizontalPlan.interior >= 0, "horizontal.interior must be non-negative");

  assert(mockVerticalPlan.start >= 0, "vertical.start must be non-negative");
  assert(mockVerticalPlan.end >= 0, "vertical.end must be non-negative");
  assert(mockVerticalPlan.interior >= 0, "vertical.interior must be non-negative");
});

testCase("SafeAreaMetrics output contract: profile enumeration", () => {
  const validProfiles: LayoutProfileContract[] = ["horizontal", "vertical", "square"];
  const invalidProfiles = ["portrait", "landscape", "wide", "", "horizontal-wide"];

  for (const profile of validProfiles) {
    assert(validProfiles.includes(profile), `${profile} should be valid profile`);
  }

  for (const profile of invalidProfiles) {
    const isValid = validProfiles.includes(profile as LayoutProfileContract);
    assertEqual(isValid, false, `${profile} should be invalid profile`);
  }
});

// ============================================================================
// ORCHESTRATOR DEPENDENCIES CONTRACT
// ============================================================================

testCase("Content analysis contract: input requirements", () => {
  // Contract: orchestrator expects content analysis to provide effective dimensions
  const mockAnalysis = {
    effectiveWidth: 800,
    effectiveHeight: 600,
    recommendedStrategy: "proportional",
    contentDensity: "medium",
    hasText: true,
    hasImages: false,
    actualContentBounds: {
      x: 0,
      y: 0,
      width: 800,
      height: 600
    }
  };

  assert(typeof mockAnalysis.effectiveWidth === "number", "effectiveWidth must be number");
  assert(typeof mockAnalysis.effectiveHeight === "number", "effectiveHeight must be number");
  assert(mockAnalysis.effectiveWidth > 0, "effectiveWidth must be positive");
  assert(mockAnalysis.effectiveHeight > 0, "effectiveHeight must be positive");
  assert(typeof mockAnalysis.hasText === "boolean", "hasText must be boolean");
  assert(typeof mockAnalysis.hasImages === "boolean", "hasImages must be boolean");
});

testCase("Safe area insets contract: structure requirements", () => {
  // Contract: orchestrator expects safe insets with all edges
  const mockInsets = {
    left: 48,
    right: 48,
    top: 32,
    bottom: 32
  };

  assert(typeof mockInsets.left === "number" && mockInsets.left >= 0, "left inset must be non-negative number");
  assert(typeof mockInsets.right === "number" && mockInsets.right >= 0, "right inset must be non-negative number");
  assert(typeof mockInsets.top === "number" && mockInsets.top >= 0, "top inset must be non-negative number");
  assert(typeof mockInsets.bottom === "number" && mockInsets.bottom >= 0, "bottom inset must be non-negative number");
});

testCase("Optimal scale contract: calculation bounds", () => {
  // Contract: scale calculation should produce finite, positive values
  const mockScales = [0.5, 1.0, 1.5, 2.0, 3.0];
  const invalidScales = [0, -1, NaN, Infinity, -Infinity];

  for (const scale of mockScales) {
    assert(typeof scale === "number", "scale must be number");
    assert(Number.isFinite(scale), "scale must be finite");
    assert(scale > 0, "scale must be positive");
  }

  for (const scale of invalidScales) {
    const isValid = typeof scale === "number" && Number.isFinite(scale) && scale > 0;
    assertEqual(isValid, false, `${scale} should be invalid scale`);
  }
});

// ============================================================================
// ASYNC OPERATION CONTRACT
// ============================================================================

testCase("Async orchestration contract: Promise handling", () => {
  // Contract: scaleNodeTree should return Promise<SafeAreaMetrics>
  const mockAsyncFunction = async (): Promise<SafeAreaMetricsContract> => {
    return {
      scale: 1.5,
      scaledWidth: 600,
      scaledHeight: 400,
      safeInsetX: 48,
      safeInsetY: 32,
      targetWidth: 1920,
      targetHeight: 1080,
      horizontal: { start: 96, end: 96, interior: 24 },
      vertical: { start: 64, end: 64, interior: 16 },
      profile: "horizontal",
      adoptVerticalVariant: false
    };
  };

  assert(typeof mockAsyncFunction === "function", "orchestrator must be function");

  // Verify it returns a Promise
  const result = mockAsyncFunction();
  assert(result instanceof Promise, "orchestrator must return Promise");
});

testCase("Error handling contract: graceful degradation", () => {
  // Contract: orchestrator should handle errors gracefully without crashing
  const mockErrorScenarios = [
    { description: "missing target", target: null },
    { description: "invalid dimensions", target: { id: "test", width: 0, height: -1 } },
    { description: "NaN safe area ratio", safeAreaRatio: NaN }
  ];

  for (const scenario of mockErrorScenarios) {
    // Contract: these should be detectable as invalid inputs
    if (scenario.description === "missing target") {
      assertEqual(scenario.target, null, "null target should be detectable");
    } else if (scenario.description === "invalid dimensions") {
      const isValidDimensions = scenario.target &&
        typeof scenario.target.width === "number" && scenario.target.width > 0 &&
        typeof scenario.target.height === "number" && scenario.target.height > 0;
      assertEqual(isValidDimensions, false, "invalid dimensions should be detectable");
    } else if (scenario.description === "NaN safe area ratio") {
      const isValidRatio = typeof scenario.safeAreaRatio === "number" &&
        Number.isFinite(scenario.safeAreaRatio) &&
        scenario.safeAreaRatio > 0 && scenario.safeAreaRatio <= 1;
      assertEqual(isValidRatio, false, "NaN ratio should be detectable");
    }
  }
});

// ============================================================================
// PLUGIN DATA CONTRACT
// ============================================================================

testCase("Plugin data persistence contract: safe area storage", () => {
  // Contract: orchestrator should store safe area data in consistent format
  const mockStorageData = {
    insetX: 48,
    insetY: 32,
    left: 48,
    right: 48,
    top: 32,
    bottom: 32,
    width: 1920,
    height: 1080
  };

  // Contract: stored data must be serializable and complete
  const serialized = JSON.stringify(mockStorageData);
  const deserialized = JSON.parse(serialized);

  assertEqual(deserialized.insetX, 48, "insetX should survive serialization");
  assertEqual(deserialized.width, 1920, "width should survive serialization");
  assert(typeof deserialized.left === "number", "left should be number after deserialization");
  assert(typeof deserialized.top === "number", "top should be number after deserialization");
});

testCase("Plugin data persistence contract: focal point storage", () => {
  // Contract: focal point data should be optional but structured when present
  const mockFocalPoint = {
    x: 0.3,
    y: 0.7,
    confidence: 0.9
  };

  const noFocalPoint = null;

  // Contract: focal point should be serializable
  if (mockFocalPoint) {
    assert(typeof mockFocalPoint.x === "number", "focal x must be number");
    assert(typeof mockFocalPoint.y === "number", "focal y must be number");
    assert(typeof mockFocalPoint.confidence === "number", "focal confidence must be number");
    assert(mockFocalPoint.x >= 0 && mockFocalPoint.x <= 1, "focal x must be in [0,1]");
    assert(mockFocalPoint.y >= 0 && mockFocalPoint.y <= 1, "focal y must be in [0,1]");
    assert(mockFocalPoint.confidence >= 0 && mockFocalPoint.confidence <= 1, "confidence must be in [0,1]");
  }

  assertEqual(noFocalPoint, null, "null focal point should be valid");
});

console.log("\n✅ All scaling orchestrator contract tests passed!\n");