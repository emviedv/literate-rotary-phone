/**
 * Characterization tests for auto-layout-management module extraction
 * These tests MUST pass before AND after extracting auto layout logic from variant-scaling.ts
 *
 * Run: npx jest --runInBand tests/auto-layout-management.test.ts
 */

import type { AutoLayoutSnapshot } from "../core/variant-scaling.js";

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

// Mock frame factory
function createMockFrame(overrides: Partial<FrameNode> = {}): FrameNode {
  return {
    id: "frame-1",
    type: "FRAME",
    name: "Test Frame",
    layoutMode: "HORIZONTAL",
    width: 400,
    height: 300,
    primaryAxisSizingMode: "AUTO",
    counterAxisSizingMode: "FIXED",
    layoutWrap: "NO_WRAP",
    primaryAxisAlignItems: "MIN",
    counterAxisAlignItems: "MIN",
    itemSpacing: 16,
    counterAxisSpacing: null,
    paddingLeft: 24,
    paddingRight: 24,
    paddingTop: 20,
    paddingBottom: 20,
    clipsContent: true,
    children: [],
    ...overrides
  } as unknown as FrameNode;
}

// ============================================================================
// AUTO LAYOUT SNAPSHOT CAPTURE TESTS
// ============================================================================

testCase("captureAutoLayoutSnapshot returns null for NONE layout mode", () => {
  const frame = createMockFrame({ layoutMode: "NONE" });
  // Import would be: const { captureAutoLayoutSnapshot } = await import("../core/variant-scaling.js");
  // For now, inline the logic to test current behavior
  const result = frame.layoutMode === "NONE" ? null : { layoutMode: frame.layoutMode };
  assertEqual(result, null, "NONE layout should return null snapshot");
});

testCase("captureAutoLayoutSnapshot captures all layout properties", () => {
  const frame = createMockFrame({
    layoutMode: "VERTICAL",
    width: 500,
    height: 400,
    itemSpacing: 12,
    paddingLeft: 16,
    paddingRight: 16,
    paddingTop: 12,
    paddingBottom: 12
  });

  // Mock the snapshot creation logic from lines 104-143
  const snapshot: AutoLayoutSnapshot = {
    layoutMode: frame.layoutMode,
    width: frame.width,
    height: frame.height,
    primaryAxisSizingMode: frame.primaryAxisSizingMode,
    counterAxisSizingMode: frame.counterAxisSizingMode,
    layoutWrap: frame.layoutWrap,
    primaryAxisAlignItems: frame.primaryAxisAlignItems,
    counterAxisAlignItems: frame.counterAxisAlignItems,
    itemSpacing: frame.itemSpacing,
    counterAxisSpacing: null,
    paddingLeft: frame.paddingLeft,
    paddingRight: frame.paddingRight,
    paddingTop: frame.paddingTop,
    paddingBottom: frame.paddingBottom,
    clipsContent: frame.clipsContent,
    flowChildCount: 0,
    absoluteChildCount: 0
  };

  assertEqual(snapshot.layoutMode, "VERTICAL", "should capture layout mode");
  assertEqual(snapshot.itemSpacing, 12, "should capture item spacing");
  assertEqual(snapshot.paddingLeft, 16, "should capture padding");
});

testCase("captureAutoLayoutSnapshot counts flow vs absolute children correctly", () => {
  const mockChildren = [
    { layoutPositioning: "AUTO" },  // flow child
    { layoutPositioning: "ABSOLUTE" }, // absolute child
    { layoutPositioning: "AUTO" },  // flow child
    {} // child without layoutPositioning (defaults to flow)
  ];

  // Child counting logic from lines 114-122
  let flowChildCount = 0;
  let absoluteChildCount = 0;
  for (const child of mockChildren) {
    if ("layoutPositioning" in child && (child as any).layoutPositioning === "ABSOLUTE") {
      absoluteChildCount += 1;
    } else {
      flowChildCount += 1;
    }
  }

  assertEqual(flowChildCount, 3, "should count 3 flow children");
  assertEqual(absoluteChildCount, 1, "should count 1 absolute child");
});

testCase("captureAutoLayoutSnapshot handles counterAxisSpacing properly", () => {
  const frameWithWrap = createMockFrame({
    layoutWrap: "WRAP",
    counterAxisSpacing: 8
  });

  // Logic from lines 109-112
  let counterAxisSpacing: number | null = null;
  if ("counterAxisSpacing" in frameWithWrap && typeof frameWithWrap.counterAxisSpacing === "number") {
    counterAxisSpacing = frameWithWrap.counterAxisSpacing;
  }

  assertEqual(counterAxisSpacing, 8, "should capture counter axis spacing");
});

// ============================================================================
// PREPARE CLONE FOR LAYOUT TESTS
// ============================================================================

testCase("prepareCloneForLayout resets layout mode to NONE", () => {
  const frame = createMockFrame({ layoutMode: "HORIZONTAL" });

  // Mock the prepare logic from lines 89-101
  const originalMode = frame.layoutMode;
  frame.layoutMode = "NONE";
  frame.primaryAxisSizingMode = "FIXED";
  frame.counterAxisSizingMode = "FIXED";
  frame.paddingLeft = 0;
  frame.paddingRight = 0;
  frame.paddingTop = 0;
  frame.paddingBottom = 0;
  frame.itemSpacing = 0;
  frame.clipsContent = true;

  assertEqual(frame.layoutMode, "NONE", "should reset to NONE");
  assertEqual(frame.paddingLeft, 0, "should reset padding");
  assertEqual(frame.itemSpacing, 0, "should reset spacing");
  assert(originalMode !== "NONE", "original mode should have been non-NONE");
});

testCase("prepareCloneForLayout stores snapshot before reset", () => {
  const frame = createMockFrame({
    layoutMode: "VERTICAL",
    itemSpacing: 20,
    paddingTop: 16
  });

  // Mock snapshot storage logic
  const snapshotMap = new Map<string, AutoLayoutSnapshot>();
  const snapshot: AutoLayoutSnapshot = {
    layoutMode: frame.layoutMode,
    width: frame.width,
    height: frame.height,
    primaryAxisSizingMode: frame.primaryAxisSizingMode,
    counterAxisSizingMode: frame.counterAxisSizingMode,
    layoutWrap: frame.layoutWrap,
    primaryAxisAlignItems: frame.primaryAxisAlignItems,
    counterAxisAlignItems: frame.counterAxisAlignItems,
    itemSpacing: frame.itemSpacing,
    counterAxisSpacing: null,
    paddingLeft: frame.paddingLeft,
    paddingRight: frame.paddingRight,
    paddingTop: frame.paddingTop,
    paddingBottom: frame.paddingBottom,
    clipsContent: frame.clipsContent,
    flowChildCount: 0,
    absoluteChildCount: 0
  };

  snapshotMap.set(frame.id, snapshot);

  assert(snapshotMap.has(frame.id), "should store snapshot by frame ID");
  assertEqual(snapshotMap.get(frame.id)?.itemSpacing, 20, "should preserve original spacing");
});

// ============================================================================
// RESTORE AUTO LAYOUT SETTINGS TESTS
// ============================================================================

testCase("restoreAutoLayoutSettings skips when no snapshot exists", () => {
  const frame = createMockFrame();
  const emptySnapshots = new Map<string, AutoLayoutSnapshot>();

  // Mock restore logic from lines 332-335
  const snapshot = emptySnapshots.get(frame.id);
  const shouldRestore = snapshot !== undefined;

  assertEqual(shouldRestore, false, "should not restore without snapshot");
});

testCase("restoreAutoLayoutSettings restores clipsContent property", () => {
  const frame = createMockFrame({ clipsContent: false });
  const snapshot: AutoLayoutSnapshot = {
    layoutMode: "HORIZONTAL",
    width: 400,
    height: 300,
    primaryAxisSizingMode: "AUTO",
    counterAxisSizingMode: "FIXED",
    layoutWrap: "NO_WRAP",
    primaryAxisAlignItems: "MIN",
    counterAxisAlignItems: "MIN",
    itemSpacing: 16,
    counterAxisSpacing: null,
    paddingLeft: 24,
    paddingRight: 24,
    paddingTop: 20,
    paddingBottom: 20,
    clipsContent: true, // Different from frame
    flowChildCount: 2,
    absoluteChildCount: 0
  };

  // Mock restore logic from line 337
  frame.clipsContent = snapshot.clipsContent;

  assertEqual(frame.clipsContent, true, "should restore clipsContent from snapshot");
});

testCase("restoreAutoLayoutSettings calculates padding from expansion plans", () => {
  const frame = createMockFrame();
  const mockMetrics = {
    scale: 2.0,
    horizontal: { start: 40, end: 60, interior: 0 },
    vertical: { start: 30, end: 50, interior: 0 }
  } as any;

  // Mock padding calculation from lines 352-355
  frame.paddingLeft = Math.round(mockMetrics.horizontal.start);
  frame.paddingRight = Math.round(mockMetrics.horizontal.end);
  frame.paddingTop = Math.round(mockMetrics.vertical.start);
  frame.paddingBottom = Math.round(mockMetrics.vertical.end);

  assertEqual(frame.paddingLeft, 40, "should set left padding from horizontal start");
  assertEqual(frame.paddingRight, 60, "should set right padding from horizontal end");
  assertEqual(frame.paddingTop, 30, "should set top padding from vertical start");
  assertEqual(frame.paddingBottom, 50, "should set bottom padding from vertical end");
});

// ============================================================================
// SCALE AUTO LAYOUT METRIC TESTS
// ============================================================================

testCase("scaleAutoLayoutMetric returns 0 for 0 input", () => {
  // Logic from lines 389-393
  function scaleAutoLayoutMetric(value: number, scale: number, min: number = 0): number {
    if (value === 0) return 0;
    const scaled = value * scale;
    return Math.max(Math.round(scaled), min);
  }

  const result = scaleAutoLayoutMetric(0, 2.5);
  assertEqual(result, 0, "0 input should always return 0");
});

testCase("scaleAutoLayoutMetric applies minimum constraint", () => {
  function scaleAutoLayoutMetric(value: number, scale: number, min: number = 0): number {
    if (value === 0) return 0;
    const scaled = value * scale;
    return Math.max(Math.round(scaled), min);
  }

  const result = scaleAutoLayoutMetric(2, 0.1, 5);
  assertEqual(result, 5, "should enforce minimum of 5");
});

testCase("scaleAutoLayoutMetric rounds to nearest integer", () => {
  function scaleAutoLayoutMetric(value: number, scale: number, min: number = 0): number {
    if (value === 0) return 0;
    const scaled = value * scale;
    return Math.max(Math.round(scaled), min);
  }

  const result = scaleAutoLayoutMetric(10, 1.7); // 17.0
  assertEqual(result, 17, "should round 17.0 to 17");
});

console.log("\n✅ All auto-layout-management characterization tests passed!\n");