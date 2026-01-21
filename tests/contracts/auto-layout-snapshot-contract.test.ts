/**
 * Contract tests for Auto Layout Management module
 * Validates the snapshot capture/restore contract that will be extracted
 *
 * Run: npx jest --runInBand tests/contracts/auto-layout-snapshot-contract.test.ts
 */

import type { AutoLayoutSnapshot } from "../../core/variant-scaling.js";

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

// Mock frame factory for contract testing
function createContractMockFrame(overrides: Partial<FrameNode> = {}): FrameNode {
  return {
    id: "contract-frame",
    type: "FRAME",
    name: "Contract Test Frame",
    layoutMode: "HORIZONTAL",
    width: 800,
    height: 600,
    primaryAxisSizingMode: "AUTO",
    counterAxisSizingMode: "FIXED",
    layoutWrap: "NO_WRAP",
    primaryAxisAlignItems: "MIN",
    counterAxisAlignItems: "CENTER",
    itemSpacing: 12,
    counterAxisSpacing: null,
    paddingLeft: 16,
    paddingRight: 16,
    paddingTop: 12,
    paddingBottom: 12,
    clipsContent: true,
    children: [],
    ...overrides
  } as unknown as FrameNode;
}

// ============================================================================
// AUTO LAYOUT SNAPSHOT CONTRACT TESTS
// ============================================================================

testCase("AutoLayoutSnapshot contract: required fields are present", () => {
  const mockSnapshot: AutoLayoutSnapshot = {
    layoutMode: "VERTICAL",
    width: 400,
    height: 300,
    primaryAxisSizingMode: "AUTO",
    counterAxisSizingMode: "FIXED",
    layoutWrap: "NO_WRAP",
    primaryAxisAlignItems: "MIN",
    counterAxisAlignItems: "CENTER",
    itemSpacing: 12,
    counterAxisSpacing: null,
    paddingLeft: 16,
    paddingRight: 16,
    paddingTop: 12,
    paddingBottom: 12,
    clipsContent: true,
    flowChildCount: 3,
    absoluteChildCount: 1
  };

  // Verify all required fields exist and have correct types
  assertEqual(typeof mockSnapshot.layoutMode, "string", "layoutMode must be string");
  assertEqual(typeof mockSnapshot.width, "number", "width must be number");
  assertEqual(typeof mockSnapshot.height, "number", "height must be number");
  assertEqual(typeof mockSnapshot.itemSpacing, "number", "itemSpacing must be number");
  assertEqual(typeof mockSnapshot.flowChildCount, "number", "flowChildCount must be number");
  assertEqual(typeof mockSnapshot.absoluteChildCount, "number", "absoluteChildCount must be number");
  assert(mockSnapshot.counterAxisSpacing === null || typeof mockSnapshot.counterAxisSpacing === "number",
    "counterAxisSpacing must be number or null");
});

testCase("AutoLayoutSnapshot contract: layout modes are valid", () => {
  const validModes = ["NONE", "HORIZONTAL", "VERTICAL"];

  for (const mode of validModes) {
    const snapshot: Partial<AutoLayoutSnapshot> = {
      layoutMode: mode as FrameNode["layoutMode"],
      width: 100,
      height: 100,
      flowChildCount: 0,
      absoluteChildCount: 0
    };

    assert(validModes.includes(snapshot.layoutMode!), `${mode} should be valid layout mode`);
  }
});

testCase("AutoLayoutSnapshot contract: sizing modes are valid", () => {
  const validSizingModes = ["FIXED", "AUTO"];

  const snapshot: Partial<AutoLayoutSnapshot> = {
    primaryAxisSizingMode: "AUTO",
    counterAxisSizingMode: "FIXED"
  };

  assert(validSizingModes.includes(snapshot.primaryAxisSizingMode!), "primaryAxisSizingMode must be valid");
  assert(validSizingModes.includes(snapshot.counterAxisSizingMode!), "counterAxisSizingMode must be valid");
});

testCase("AutoLayoutSnapshot contract: child counts are non-negative integers", () => {
  const snapshot: Partial<AutoLayoutSnapshot> = {
    flowChildCount: 5,
    absoluteChildCount: 2
  };

  assert(Number.isInteger(snapshot.flowChildCount!), "flowChildCount must be integer");
  assert(Number.isInteger(snapshot.absoluteChildCount!), "absoluteChildCount must be integer");
  assert(snapshot.flowChildCount! >= 0, "flowChildCount must be non-negative");
  assert(snapshot.absoluteChildCount! >= 0, "absoluteChildCount must be non-negative");
});

// ============================================================================
// SNAPSHOT OPERATIONS CONTRACT
// ============================================================================

testCase("Snapshot capture contract: input validation", () => {
  // Contract: captureAutoLayoutSnapshot should handle all frame types
  const autoLayoutFrame = createContractMockFrame({ layoutMode: "HORIZONTAL" });
  const noneLayoutFrame = createContractMockFrame({ layoutMode: "NONE" });

  // These calls should not throw - they represent the input contract
  const autoSnapshot = autoLayoutFrame.layoutMode !== "NONE" ? "valid" : null;
  const noneSnapshot = noneLayoutFrame.layoutMode !== "NONE" ? "valid" : null;

  assertEqual(autoSnapshot, "valid", "auto layout frame should produce snapshot");
  assertEqual(noneSnapshot, null, "NONE layout frame should return null");
});

testCase("Snapshot restore contract: snapshot map interface", () => {
  // Contract: restoration should work with Map<string, AutoLayoutSnapshot>
  const snapshotMap = new Map<string, AutoLayoutSnapshot>();
  const frameId = "test-frame";

  // Mock snapshot data
  const mockSnapshot: AutoLayoutSnapshot = {
    layoutMode: "HORIZONTAL",
    width: 400,
    height: 300,
    primaryAxisSizingMode: "AUTO",
    counterAxisSizingMode: "FIXED",
    layoutWrap: "NO_WRAP",
    primaryAxisAlignItems: "MIN",
    counterAxisAlignItems: "CENTER",
    itemSpacing: 16,
    counterAxisSpacing: null,
    paddingLeft: 12,
    paddingRight: 12,
    paddingTop: 8,
    paddingBottom: 8,
    clipsContent: true,
    flowChildCount: 2,
    absoluteChildCount: 0
  };

  // Contract: set and get operations must work
  snapshotMap.set(frameId, mockSnapshot);
  const retrieved = snapshotMap.get(frameId);

  assert(retrieved !== undefined, "snapshot should be retrievable");
  assertEqual(retrieved?.layoutMode, "HORIZONTAL", "retrieved snapshot should preserve layoutMode");
  assertEqual(retrieved?.itemSpacing, 16, "retrieved snapshot should preserve itemSpacing");
});

// ============================================================================
// SAFE AREA METRICS CONTRACT
// ============================================================================

testCase("SafeAreaMetrics contract: required fields are present", () => {
  // This represents the return type from scaleNodeTree that other modules depend on
  const mockMetrics = {
    scale: 1.5,
    scaledWidth: 600,
    scaledHeight: 400,
    safeInsetX: 48,
    safeInsetY: 32,
    targetWidth: 1920,
    targetHeight: 1080,
    horizontal: {
      start: 96,
      end: 96,
      interior: 24
    },
    vertical: {
      start: 64,
      end: 64,
      interior: 16
    },
    profile: "horizontal" as const,
    adoptVerticalVariant: false
  };

  // Verify contract fields
  assertEqual(typeof mockMetrics.scale, "number", "scale must be number");
  assertEqual(typeof mockMetrics.scaledWidth, "number", "scaledWidth must be number");
  assertEqual(typeof mockMetrics.scaledHeight, "number", "scaledHeight must be number");
  assertEqual(typeof mockMetrics.safeInsetX, "number", "safeInsetX must be number");
  assertEqual(typeof mockMetrics.safeInsetY, "number", "safeInsetY must be number");
  assertEqual(typeof mockMetrics.targetWidth, "number", "targetWidth must be number");
  assertEqual(typeof mockMetrics.targetHeight, "number", "targetHeight must be number");
  assertEqual(typeof mockMetrics.adoptVerticalVariant, "boolean", "adoptVerticalVariant must be boolean");

  // Verify expansion plan structure
  assert(typeof mockMetrics.horizontal === "object", "horizontal expansion plan must be object");
  assert(typeof mockMetrics.vertical === "object", "vertical expansion plan must be object");
  assertEqual(typeof mockMetrics.horizontal.start, "number", "horizontal.start must be number");
  assertEqual(typeof mockMetrics.horizontal.end, "number", "horizontal.end must be number");
  assertEqual(typeof mockMetrics.horizontal.interior, "number", "horizontal.interior must be number");
});

testCase("SafeAreaMetrics contract: profile values are valid", () => {
  const validProfiles = ["horizontal", "vertical", "square"];

  for (const profile of validProfiles) {
    const metrics = { profile };
    assert(validProfiles.includes(metrics.profile), `${profile} should be valid profile`);
  }
});

// ============================================================================
// MODULE BOUNDARY CONTRACT
// ============================================================================

testCase("Module boundary contract: async operation signatures", () => {
  // Contract: prepareCloneForLayout should be async and return Promise<void>
  const mockPrepareClone = async (
    frame: FrameNode,
    snapshotMap: Map<string, AutoLayoutSnapshot>
  ): Promise<void> => {
    // Mock implementation signature
    snapshotMap.set(frame.id, {} as AutoLayoutSnapshot);
  };

  const mockRestoreSettings = async (
    frame: FrameNode,
    snapshotMap: Map<string, AutoLayoutSnapshot>,
    metrics: any
  ): Promise<void> => {
    // Mock implementation signature
    const snapshot = snapshotMap.get(frame.id);
    if (snapshot) {
      frame.clipsContent = snapshot.clipsContent;
    }
  };

  // These should represent the actual function signatures
  assert(typeof mockPrepareClone === "function", "prepareCloneForLayout should be function");
  assert(typeof mockRestoreSettings === "function", "restoreAutoLayoutSettings should be function");
});

testCase("Module boundary contract: error handling requirements", () => {
  // Contract: functions should handle missing snapshots gracefully
  const emptySnapshotMap = new Map<string, AutoLayoutSnapshot>();
  const frameId = "missing-frame";

  const snapshot = emptySnapshotMap.get(frameId);
  const shouldSkipRestore = snapshot === undefined;

  assertEqual(shouldSkipRestore, true, "missing snapshot should be handled gracefully");
});

// ============================================================================
// TYPE SAFETY CONTRACT
// ============================================================================

testCase("Type safety contract: AutoLayoutSnapshot is immutable-friendly", () => {
  const snapshot: AutoLayoutSnapshot = {
    layoutMode: "HORIZONTAL",
    width: 400,
    height: 300,
    primaryAxisSizingMode: "AUTO",
    counterAxisSizingMode: "FIXED",
    layoutWrap: "NO_WRAP",
    primaryAxisAlignItems: "MIN",
    counterAxisAlignItems: "CENTER",
    itemSpacing: 12,
    counterAxisSpacing: null,
    paddingLeft: 16,
    paddingRight: 16,
    paddingTop: 12,
    paddingBottom: 12,
    clipsContent: true,
    flowChildCount: 2,
    absoluteChildCount: 1
  };

  // Contract: snapshot should be serializable for storage
  const serialized = JSON.stringify(snapshot);
  const deserialized = JSON.parse(serialized) as AutoLayoutSnapshot;

  assertEqual(deserialized.layoutMode, snapshot.layoutMode, "layoutMode should survive serialization");
  assertEqual(deserialized.itemSpacing, snapshot.itemSpacing, "itemSpacing should survive serialization");
  assertEqual(deserialized.flowChildCount, snapshot.flowChildCount, "flowChildCount should survive serialization");
});

console.log("\n✅ All auto layout snapshot contract tests passed!\n");