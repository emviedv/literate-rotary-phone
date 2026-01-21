/**
 * Contract tests for auto-layout-adapter module boundaries.
 * These tests validate the interfaces between modules remain stable.
 *
 * FREESTYLE POSITIONING MODE:
 * Child adaptations have been removed in favor of AI positioning maps.
 * Tests now validate the simplified LayoutAdaptationPlan interface.
 */

import { createLayoutAdaptationPlan } from "../core/auto-layout-adapter.js";

// Test utilities
function assert(condition: unknown, message: string): void {
  if (!condition) {
    throw new Error(message);
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

// Stub factories
let childCounter = 0;

function createChild(): SceneNode {
  childCounter += 1;
  return {
    id: `child-${childCounter}`,
    type: "TEXT",
    visible: true,
    name: "child",
    fills: [],
    children: []
  } as unknown as SceneNode;
}

function createFrame(): FrameNode {
  return {
    id: "frame-1",
    type: "FRAME",
    name: "Stub Frame",
    visible: true,
    layoutMode: "HORIZONTAL",
    width: 800,
    height: 600,
    layoutWrap: "NO_WRAP",
    itemSpacing: 24,
    paddingTop: 16,
    paddingRight: 16,
    paddingBottom: 16,
    paddingLeft: 16,
    children: [createChild(), createChild()]
  } as unknown as FrameNode;
}

// ============================================================================
// LayoutAdaptationPlan Contract Tests
// ============================================================================

testCase("LayoutAdaptationPlan contract: has required layoutMode field", () => {
  const plan = createLayoutAdaptationPlan(
    createFrame(),
    { width: 1920, height: 960 },
    "horizontal",
    1
  );

  assert(
    plan.layoutMode === "HORIZONTAL" || plan.layoutMode === "VERTICAL" || plan.layoutMode === "NONE",
    "layoutMode must be HORIZONTAL, VERTICAL, or NONE"
  );
});

testCase("LayoutAdaptationPlan contract: has valid sizing modes", () => {
  const plan = createLayoutAdaptationPlan(
    createFrame(),
    { width: 1920, height: 960 },
    "horizontal",
    1
  );

  assert(
    plan.primaryAxisSizingMode === "FIXED" || plan.primaryAxisSizingMode === "AUTO",
    "primaryAxisSizingMode must be FIXED or AUTO"
  );
  assert(
    plan.counterAxisSizingMode === "FIXED" || plan.counterAxisSizingMode === "AUTO",
    "counterAxisSizingMode must be FIXED or AUTO"
  );
});

testCase("LayoutAdaptationPlan contract: has valid alignment modes", () => {
  const plan = createLayoutAdaptationPlan(
    createFrame(),
    { width: 1920, height: 960 },
    "horizontal",
    1
  );

  const validPrimary = ["MIN", "CENTER", "MAX", "SPACE_BETWEEN"];
  const validCounter = ["MIN", "CENTER", "MAX", "BASELINE"];

  assert(
    validPrimary.includes(plan.primaryAxisAlignItems),
    `primaryAxisAlignItems must be one of ${validPrimary.join(", ")}`
  );
  assert(
    validCounter.includes(plan.counterAxisAlignItems),
    `counterAxisAlignItems must be one of ${validCounter.join(", ")}`
  );
});

testCase("LayoutAdaptationPlan contract: layoutWrap is valid", () => {
  const plan = createLayoutAdaptationPlan(
    createFrame(),
    { width: 1920, height: 960 },
    "horizontal",
    1
  );

  assert(
    plan.layoutWrap === "WRAP" || plan.layoutWrap === "NO_WRAP",
    "layoutWrap must be WRAP or NO_WRAP"
  );
});

testCase("LayoutAdaptationPlan contract: itemSpacing is non-negative integer", () => {
  const plan = createLayoutAdaptationPlan(
    createFrame(),
    { width: 1920, height: 960 },
    "horizontal",
    1
  );

  assert(typeof plan.itemSpacing === "number", "itemSpacing must be a number");
  assert(plan.itemSpacing >= 0, "itemSpacing must be non-negative");
  assert(Number.isInteger(plan.itemSpacing), "itemSpacing must be an integer");
});

testCase("LayoutAdaptationPlan contract: padding values are non-negative integers", () => {
  const plan = createLayoutAdaptationPlan(
    createFrame(),
    { width: 1920, height: 960 },
    "horizontal",
    1
  );

  const { top, right, bottom, left } = plan.paddingAdjustments;

  assert(top >= 0 && Number.isInteger(top), "paddingTop must be non-negative integer");
  assert(right >= 0 && Number.isInteger(right), "paddingRight must be non-negative integer");
  assert(bottom >= 0 && Number.isInteger(bottom), "paddingBottom must be non-negative integer");
  assert(left >= 0 && Number.isInteger(left), "paddingLeft must be non-negative integer");
});

// ============================================================================
// FREESTYLE MODE: childAdaptations removed
// AI positioning maps now handle per-node decisions via layoutAdvice.positioning
// ============================================================================

// ============================================================================
// Module Integration Contract Tests
// ============================================================================

testCase("Module contract: createLayoutAdaptationPlan accepts all required parameters", () => {
  // Test that the function signature is stable
  const plan = createLayoutAdaptationPlan(
    createFrame(),
    { width: 1920, height: 960 },
    "horizontal",
    1.5,
    {
      sourceLayoutMode: "VERTICAL",
      sourceSize: { width: 800, height: 600 },
      sourceFlowChildCount: 3,
      adoptVerticalVariant: false,
      sourceItemSpacing: 24,
      safeAreaRatio: 0.05
    }
  );

  assert(plan !== null && plan !== undefined, "createLayoutAdaptationPlan must return a plan object");
});

testCase("Module contract: plan is deterministic for same inputs", () => {
  const frame = createFrame();
  const target = { width: 1920, height: 960 };

  const plan1 = createLayoutAdaptationPlan(frame, target, "horizontal", 1);
  const plan2 = createLayoutAdaptationPlan(frame, target, "horizontal", 1);

  assert(plan1.layoutMode === plan2.layoutMode, "layoutMode must be deterministic");
  assert(plan1.itemSpacing === plan2.itemSpacing, "itemSpacing must be deterministic");
  assert(plan1.layoutWrap === plan2.layoutWrap, "layoutWrap must be deterministic");
});

testCase("Module contract: FREESTYLE mode - no childAdaptations field", () => {
  const plan = createLayoutAdaptationPlan(
    createFrame(),
    { width: 1920, height: 960 },
    "horizontal",
    1
  );

  // In FREESTYLE mode, childAdaptations has been removed
  // Per-node positioning is handled by AI via layoutAdvice.positioning
  assert(
    !("childAdaptations" in plan),
    "childAdaptations should not exist in FREESTYLE mode"
  );
});

console.log("\n✅ All layout adapter contract tests passed\n");
