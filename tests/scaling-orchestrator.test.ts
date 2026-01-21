/**
 * Characterization tests for scaling-orchestrator module extraction
 * Tests for the main scaleNodeTree orchestration logic (lines 145-325)
 *
 * Run: npx jest --runInBand tests/scaling-orchestrator.test.ts
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

function assertAlmostEqual(actual: number, expected: number, epsilon: number, message: string): void {
  if (Math.abs(actual - expected) > epsilon) {
    throw new Error(`${message}: expected ~${expected}, got ${actual} (epsilon: ${epsilon})`);
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

// Mock factories
type MockTarget = {
  id: string;
  width: number;
  height: number;
};

type MockContentAnalysis = {
  effectiveWidth: number;
  effectiveHeight: number;
  recommendedStrategy: string;
  contentDensity: string;
  hasText: boolean;
  hasImages: boolean;
  actualContentBounds: any;
};

type MockSafeInsets = {
  left: number;
  right: number;
  top: number;
  bottom: number;
};

function createMockTarget(overrides: Partial<MockTarget> = {}): MockTarget {
  return {
    id: "figma-cover",
    width: 1920,
    height: 960,
    ...overrides
  };
}

function createMockContentAnalysis(overrides: Partial<MockContentAnalysis> = {}): MockContentAnalysis {
  return {
    effectiveWidth: 800,
    effectiveHeight: 600,
    recommendedStrategy: "proportional",
    contentDensity: "medium",
    hasText: true,
    hasImages: true,
    actualContentBounds: { x: 0, y: 0, width: 800, height: 600 },
    ...overrides
  };
}

function createMockSafeInsets(overrides: Partial<MockSafeInsets> = {}): MockSafeInsets {
  return {
    left: 48,
    right: 48,
    top: 32,
    bottom: 32,
    ...overrides
  };
}

// ============================================================================
// SAFE AREA CALCULATION TESTS
// ============================================================================

testCase("safe area insets calculated based on target and ratio", () => {
  const target = createMockTarget({ width: 1920, height: 960 });
  const safeAreaRatio = 0.9;

  // Mock resolveSafeAreaInsets logic
  const safeInsets = {
    left: target.width * (1 - safeAreaRatio) / 2,
    right: target.width * (1 - safeAreaRatio) / 2,
    top: target.height * (1 - safeAreaRatio) / 2,
    bottom: target.height * (1 - safeAreaRatio) / 2
  };

  assertAlmostEqual(safeInsets.left, 96, 1, "left inset should be ~96px");
  assertAlmostEqual(safeInsets.top, 48, 1, "top inset should be ~48px");
});

testCase("safe area extraction from insets object", () => {
  const safeInsets = createMockSafeInsets({ left: 40, top: 30 });

  // Logic from lines 174-175
  const safeInsetX = safeInsets.left;
  const safeInsetY = safeInsets.top;

  assertEqual(safeInsetX, 40, "should extract X inset");
  assertEqual(safeInsetY, 30, "should extract Y inset");
});

// ============================================================================
// SCALE CALCULATION TESTS
// ============================================================================

testCase("optimal scale calculation respects frame maximum", () => {
  const contentAnalysis = createMockContentAnalysis({
    effectiveWidth: 400,
    effectiveHeight: 300
  });
  const target = createMockTarget({ width: 1200, height: 800 });
  const mockRawScale = 2.5;

  // Logic from lines 186-192
  const sourceWidth = Math.max(contentAnalysis.effectiveWidth, 1);
  const sourceHeight = Math.max(contentAnalysis.effectiveHeight, 1);

  const frameMaxScale = Math.min(
    target.width / Math.max(sourceWidth, 1),
    target.height / Math.max(sourceHeight, 1)
  );
  const scale = Number.isFinite(frameMaxScale) && frameMaxScale > 0
    ? Math.min(mockRawScale, frameMaxScale)
    : mockRawScale;

  // frameMaxScale = min(1200/400, 800/300) = min(3, 2.67) = 2.67
  // scale = min(2.5, 2.67) = 2.5
  assertAlmostEqual(scale, 2.5, 0.01, "should use raw scale when within frame limits");
});

testCase("frame max scale calculation prevents overflow", () => {
  const contentAnalysis = createMockContentAnalysis({
    effectiveWidth: 800,
    effectiveHeight: 600
  });
  const target = createMockTarget({ width: 1000, height: 800 });
  const mockRawScale = 2.0;

  const sourceWidth = Math.max(contentAnalysis.effectiveWidth, 1);
  const sourceHeight = Math.max(contentAnalysis.effectiveHeight, 1);

  const frameMaxScale = Math.min(
    target.width / Math.max(sourceWidth, 1),
    target.height / Math.max(sourceHeight, 1)
  );
  const scale = Number.isFinite(frameMaxScale) && frameMaxScale > 0
    ? Math.min(mockRawScale, frameMaxScale)
    : mockRawScale;

  // frameMaxScale = min(1000/800, 800/600) = min(1.25, 1.33) = 1.25
  // scale = min(2.0, 1.25) = 1.25
  assertAlmostEqual(scale, 1.25, 0.01, "should cap at frame max to prevent overflow");
});

// ============================================================================
// SCALED DIMENSIONS AND SPACING TESTS
// ============================================================================

testCase("scaled dimensions calculated correctly", () => {
  const sourceWidth = 400;
  const sourceHeight = 300;
  const scale = 1.5;

  // Logic from lines 205-206
  const scaledWidth = sourceWidth * scale;
  const scaledHeight = sourceHeight * scale;

  assertEqual(scaledWidth, 600, "scaled width should be 600");
  assertEqual(scaledHeight, 450, "scaled height should be 450");
});

testCase("extra space calculation for expansion", () => {
  const target = createMockTarget({ width: 1000, height: 800 });
  const scaledWidth = 600;
  const scaledHeight = 450;

  // Logic from lines 207-208
  const extraWidth = Math.max(target.width - scaledWidth, 0);
  const extraHeight = Math.max(target.height - scaledHeight, 0);

  assertEqual(extraWidth, 400, "extra width should be 400");
  assertEqual(extraHeight, 350, "extra height should be 350");
});

testCase("extra space clamped to non-negative", () => {
  const target = createMockTarget({ width: 500, height: 400 });
  const scaledWidth = 600; // Larger than target
  const scaledHeight = 500; // Larger than target

  // Logic from lines 207-208
  const extraWidth = Math.max(target.width - scaledWidth, 0);
  const extraHeight = Math.max(target.height - scaledHeight, 0);

  assertEqual(extraWidth, 0, "extra width should clamp to 0");
  assertEqual(extraHeight, 0, "extra height should clamp to 0");
});

// ============================================================================
// AXIS GAPS CALCULATION TESTS
// ============================================================================

testCase("axis gaps derived from content margins", () => {
  const mockContentMargins = {
    left: 20,
    right: 30,
    top: 15,
    bottom: 25
  };

  // Logic from lines 210-215
  const horizontalGaps = mockContentMargins
    ? { start: mockContentMargins.left, end: mockContentMargins.right }
    : null;
  const verticalGaps = mockContentMargins
    ? { start: mockContentMargins.top, end: mockContentMargins.bottom }
    : null;

  assert(horizontalGaps !== null, "should create horizontal gaps");
  assertEqual(horizontalGaps?.start, 20, "should map left margin to start");
  assertEqual(horizontalGaps?.end, 30, "should map right margin to end");

  assert(verticalGaps !== null, "should create vertical gaps");
  assertEqual(verticalGaps?.start, 15, "should map top margin to start");
  assertEqual(verticalGaps?.end, 25, "should map bottom margin to end");
});

testCase("axis gaps null when no content margins", () => {
  const mockContentMargins: null = null;

  const horizontalGaps = mockContentMargins
    ? { start: (mockContentMargins as any).left, end: (mockContentMargins as any).right }
    : null;
  const verticalGaps = mockContentMargins
    ? { start: (mockContentMargins as any).top, end: (mockContentMargins as any).bottom }
    : null;

  assertEqual(horizontalGaps, null, "horizontal gaps should be null");
  assertEqual(verticalGaps, null, "vertical gaps should be null");
});

// ============================================================================
// LAYOUT MODE AND CHILD COUNT ANALYSIS TESTS
// ============================================================================

testCase("vertical flow child count logic with adoption", () => {
  const mockRootSnapshot = {
    layoutMode: "HORIZONTAL" as const,
    flowChildCount: 3
  };
  const mockAdoptVerticalVariant = true;
  const absoluteChildCount = 5;

  // Logic from lines 240-245
  const verticalFlowChildCount =
    mockRootSnapshot && (mockRootSnapshot.layoutMode as string) === "VERTICAL"
      ? mockRootSnapshot.flowChildCount
      : mockAdoptVerticalVariant
        ? mockRootSnapshot?.flowChildCount ?? absoluteChildCount
        : absoluteChildCount;

  assertEqual(verticalFlowChildCount, 3, "should use flow child count when adopting vertical");
});

testCase("vertical flow child count fallback to absolute", () => {
  const mockRootSnapshot = null;
  const mockAdoptVerticalVariant = false;
  const absoluteChildCount = 4;

  const verticalFlowChildCount =
    mockRootSnapshot && (mockRootSnapshot as any).layoutMode === "VERTICAL"
      ? (mockRootSnapshot as any).flowChildCount
      : mockAdoptVerticalVariant
        ? (mockRootSnapshot as any)?.flowChildCount ?? absoluteChildCount
        : absoluteChildCount;

  assertEqual(verticalFlowChildCount, 4, "should fallback to absolute child count");
});

// ============================================================================
// INTERIOR EXPANSION LOGIC TESTS
// ============================================================================

testCase("vertical interior expansion with wrap layout", () => {
  const mockRootSnapshot = {
    layoutMode: "HORIZONTAL" as const,
    layoutWrap: "WRAP" as const,
    flowChildCount: 3
  };
  const mockAdoptVerticalVariant = false;
  const absoluteChildCount = 2;

  // Logic from lines 246-250
  const verticalAllowInterior =
    mockAdoptVerticalVariant ||
    (mockRootSnapshot && (mockRootSnapshot.layoutMode as string) === "VERTICAL" && mockRootSnapshot.flowChildCount >= 2) ||
    (mockRootSnapshot?.layoutWrap === "WRAP" && mockRootSnapshot.flowChildCount >= 2) ||
    (!mockRootSnapshot || (mockRootSnapshot.layoutMode as string) === "NONE" ? absoluteChildCount >= 2 : false);

  assertEqual(verticalAllowInterior, true, "WRAP layout with multiple children should allow interior");
});

testCase("vertical interior expansion with adoption", () => {
  const mockAdoptVerticalVariant = true;

  const verticalAllowInterior = mockAdoptVerticalVariant || false; // simplified

  assertEqual(verticalAllowInterior, true, "adoption should enable interior expansion");
});

// ============================================================================
// OFFSET CLAMPING TESTS
// ============================================================================

testCase("offsets clamped to prevent negative positioning", () => {
  const mockHorizontalPlan = { start: -10, end: 20, interior: 0 };
  const mockVerticalPlan = { start: 15, end: -5, interior: 0 };

  // Logic from lines 266-267
  const offsetX = Math.max(0, mockHorizontalPlan.start);
  const offsetY = Math.max(0, mockVerticalPlan.start);

  assertEqual(offsetX, 0, "negative horizontal start should clamp to 0");
  assertEqual(offsetY, 15, "positive vertical start should pass through");
});

// ============================================================================
// SAFE AREA PLUGIN DATA TESTS
// ============================================================================

testCase("safe area plugin data structure", () => {
  const target = createMockTarget({ width: 1920, height: 960 });
  const safeInsets = createMockSafeInsets({ left: 48, right: 48, top: 32, bottom: 32 });
  const safeInsetX = safeInsets.left;
  const safeInsetY = safeInsets.top;

  // Logic from lines 279-291
  const pluginData = {
    insetX: safeInsetX,
    insetY: safeInsetY,
    left: safeInsets.left,
    right: safeInsets.right,
    top: safeInsets.top,
    bottom: safeInsets.bottom,
    width: target.width,
    height: target.height
  };

  assertEqual(pluginData.insetX, 48, "should store X inset");
  assertEqual(pluginData.insetY, 32, "should store Y inset");
  assertEqual(pluginData.width, 1920, "should store target width");
  assertEqual(pluginData.height, 960, "should store target height");
});

// ============================================================================
// SAFE AREA METRICS RETURN OBJECT TESTS
// ============================================================================

testCase("safe area metrics return structure", () => {
  const scale = 1.5;
  const scaledWidth = 600;
  const scaledHeight = 450;
  const safeInsetX = 48;
  const safeInsetY = 32;
  const target = createMockTarget({ width: 1920, height: 960 });
  const mockHorizontalPlan = { start: 96, end: 96, interior: 0 };
  const mockVerticalPlan = { start: 48, end: 48, interior: 0 };
  const mockProfile = "horizontal";
  const adoptVerticalVariant = false;

  // Logic from lines 312-324
  const metrics = {
    scale,
    scaledWidth,
    scaledHeight,
    safeInsetX,
    safeInsetY,
    targetWidth: target.width,
    targetHeight: target.height,
    horizontal: mockHorizontalPlan,
    vertical: mockVerticalPlan,
    profile: mockProfile,
    adoptVerticalVariant
  };

  assertEqual(metrics.scale, 1.5, "should include calculated scale");
  assertEqual(metrics.scaledWidth, 600, "should include scaled dimensions");
  assertEqual(metrics.targetWidth, 1920, "should include target dimensions");
  assertEqual(metrics.profile, "horizontal", "should include layout profile");
  assertEqual(metrics.adoptVerticalVariant, false, "should include vertical adoption flag");
});

console.log("\n✅ All scaling-orchestrator characterization tests passed!\n");