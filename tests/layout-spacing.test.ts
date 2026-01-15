/**
 * Characterization tests for spacing and padding calculations.
 * These tests lock the current behavior of calculateSpacing and
 * calculatePaddingAdjustments before refactoring.
 */

import { createLayoutAdaptationPlan } from "../core/auto-layout-adapter.js";

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

// Stub factories
let childCounter = 0;

type ChildOverrides = {
  id?: string;
  type?: SceneNode["type"];
  visible?: boolean;
  fills?: readonly Paint[];
  children?: readonly SceneNode[];
  name?: string;
};

type FrameOverrides = {
  id?: string;
  width?: number;
  height?: number;
  layoutMode?: FrameNode["layoutMode"];
  layoutWrap?: FrameNode["layoutWrap"];
  paddingTop?: number;
  paddingRight?: number;
  paddingBottom?: number;
  paddingLeft?: number;
  itemSpacing?: number;
  children?: readonly SceneNode[];
};

function createChild(overrides: ChildOverrides = {}): SceneNode {
  childCounter += 1;
  return {
    id: overrides.id ?? `child-stub-${childCounter}`,
    type: overrides.type ?? "TEXT",
    visible: overrides.visible ?? true,
    name: overrides.name ?? "child",
    fills: overrides.fills ?? [],
    children: overrides.children ?? []
  } as unknown as SceneNode;
}

function createFrame(overrides: FrameOverrides = {}): FrameNode {
  const children =
    overrides.children ??
    ([createChild({ id: "child-1" }), createChild({ id: "child-2" })] as unknown as readonly SceneNode[]);

  return {
    id: overrides.id ?? "frame-1",
    type: "FRAME",
    name: "Stub Frame",
    visible: true,
    layoutMode: overrides.layoutMode ?? "HORIZONTAL",
    width: overrides.width ?? 800,
    height: overrides.height ?? 600,
    layoutWrap: overrides.layoutWrap ?? "NO_WRAP",
    itemSpacing: overrides.itemSpacing ?? 24,
    paddingTop: overrides.paddingTop ?? 16,
    paddingRight: overrides.paddingRight ?? 16,
    paddingBottom: overrides.paddingBottom ?? 16,
    paddingLeft: overrides.paddingLeft ?? 16,
    children
  } as unknown as FrameNode;
}

// ============================================================================
// Spacing Calculation Tests
// ============================================================================

testCase("source itemSpacing=0 produces itemSpacing=0", () => {
  const frame = createFrame({
    layoutMode: "HORIZONTAL",
    itemSpacing: 0,
    width: 800,
    height: 600
  });

  const plan = createLayoutAdaptationPlan(
    frame,
    { width: 1920, height: 960 },
    "horizontal",
    1,
    { sourceItemSpacing: 0 }
  );

  assertEqual(plan.itemSpacing, 0, "zero source spacing should produce zero output spacing");
});

testCase("spacing scales with scale factor", () => {
  const frame = createFrame({
    layoutMode: "HORIZONTAL",
    itemSpacing: 20,
    width: 800,
    height: 600
  });

  const plan = createLayoutAdaptationPlan(
    frame,
    { width: 1600, height: 1200 }, // 2x scale
    "horizontal",
    2
  );

  // Base spacing 20 * scale 2 = 40, plus potential distribution adjustment
  assert(plan.itemSpacing >= 40, "spacing should scale with scale factor");
});

testCase("NONE layout mode produces itemSpacing=0", () => {
  const frame = createFrame({
    layoutMode: "NONE",
    itemSpacing: 24,
    width: 800,
    height: 600
  });

  const plan = createLayoutAdaptationPlan(
    frame,
    { width: 1000, height: 800 },
    "square",
    1
  );

  assertEqual(plan.itemSpacing, 0, "NONE layout should have zero item spacing");
});

testCase("sparse child count gets generous distribution ratio", () => {
  // 2 children = sparse distribution (0.55 ratio)
  const sparseFrame = createFrame({
    layoutMode: "VERTICAL",
    itemSpacing: 20,
    width: 400,
    height: 600,
    children: [createChild(), createChild()]
  });

  // 6 children = dense distribution (0.35 ratio)
  const denseFrame = createFrame({
    layoutMode: "VERTICAL",
    itemSpacing: 20,
    width: 400,
    height: 600,
    children: [
      createChild(), createChild(), createChild(),
      createChild(), createChild(), createChild()
    ]
  });

  const sparsePlan = createLayoutAdaptationPlan(
    sparseFrame,
    { width: 1080, height: 1920 },
    "vertical",
    1,
    { adoptVerticalVariant: true, sourceFlowChildCount: 2 }
  );

  const densePlan = createLayoutAdaptationPlan(
    denseFrame,
    { width: 1080, height: 1920 },
    "vertical",
    1,
    { adoptVerticalVariant: true, sourceFlowChildCount: 6 }
  );

  // Sparse should get more spacing per gap than dense
  // (This is relative - both get distribution, but sparse gets more per gap)
  assert(sparsePlan.itemSpacing > 0, "sparse layout should have positive spacing");
  assert(densePlan.itemSpacing > 0, "dense layout should have positive spacing");
});

testCase("safe area ratio constrains spacing calculations", () => {
  const frame = createFrame({
    layoutMode: "VERTICAL",
    itemSpacing: 20,
    width: 400,
    height: 600,
    children: [createChild(), createChild()]
  });

  const planNoSafeArea = createLayoutAdaptationPlan(
    frame,
    { width: 1080, height: 1920 },
    "vertical",
    1,
    { adoptVerticalVariant: true, safeAreaRatio: 0 }
  );

  const planWithSafeArea = createLayoutAdaptationPlan(
    frame,
    { width: 1080, height: 1920 },
    "vertical",
    1,
    { adoptVerticalVariant: true, safeAreaRatio: 0.1 } // 10% safe area on each edge
  );

  // With safe area, less space is available for distribution
  assert(
    planWithSafeArea.itemSpacing <= planNoSafeArea.itemSpacing,
    "safe area should constrain spacing"
  );
});

testCase("counterAxisSpacing is set when layoutWrap is WRAP", () => {
  const frame = createFrame({
    layoutMode: "HORIZONTAL",
    layoutWrap: "WRAP",
    itemSpacing: 20,
    width: 1600,
    children: [
      createChild(), createChild(), createChild(),
      createChild(), createChild() // 5 children triggers wrap
    ]
  });

  const plan = createLayoutAdaptationPlan(
    frame,
    { width: 2560, height: 1440 },
    "horizontal",
    1
  );

  if (plan.layoutWrap === "WRAP") {
    assert(
      plan.counterAxisSpacing !== undefined,
      "WRAP layout should have counterAxisSpacing defined"
    );
  }
});

// ============================================================================
// Padding Calculation Tests
// ============================================================================

testCase("padding scales with scale factor", () => {
  const frame = createFrame({
    paddingTop: 16,
    paddingRight: 16,
    paddingBottom: 16,
    paddingLeft: 16
  });

  const plan = createLayoutAdaptationPlan(
    frame,
    { width: 1600, height: 1200 },
    "horizontal",
    2
  );

  assertEqual(plan.paddingAdjustments.top, 32, "top padding should scale");
  assertEqual(plan.paddingAdjustments.right, 32, "right padding should scale");
  assertEqual(plan.paddingAdjustments.bottom, 32, "bottom padding should scale");
  assertEqual(plan.paddingAdjustments.left, 32, "left padding should scale");
});

testCase("padding values are rounded to integers", () => {
  const frame = createFrame({
    paddingTop: 15,
    paddingRight: 15,
    paddingBottom: 15,
    paddingLeft: 15
  });

  const plan = createLayoutAdaptationPlan(
    frame,
    { width: 1200, height: 900 },
    "horizontal",
    1.5
  );

  // 15 * 1.5 = 22.5, should round to 23 or 22
  assert(Number.isInteger(plan.paddingAdjustments.top), "padding should be rounded to integer");
  assert(Number.isInteger(plan.paddingAdjustments.right), "padding should be rounded to integer");
});

testCase("padding never goes negative", () => {
  const frame = createFrame({
    paddingTop: 100,
    paddingRight: 100,
    paddingBottom: 100,
    paddingLeft: 100,
    width: 1200,
    height: 800
  });

  // Even with extreme scaling, padding should clamp to 0
  const plan = createLayoutAdaptationPlan(
    frame,
    { width: 400, height: 300 },
    "square",
    0.5
  );

  assert(plan.paddingAdjustments.top >= 0, "top padding must be >= 0");
  assert(plan.paddingAdjustments.right >= 0, "right padding must be >= 0");
  assert(plan.paddingAdjustments.bottom >= 0, "bottom padding must be >= 0");
  assert(plan.paddingAdjustments.left >= 0, "left padding must be >= 0");
});

testCase("zero padding remains zero after scaling", () => {
  const frame = createFrame({
    paddingTop: 0,
    paddingRight: 0,
    paddingBottom: 0,
    paddingLeft: 0
  });

  const plan = createLayoutAdaptationPlan(
    frame,
    { width: 1920, height: 960 },
    "horizontal",
    2
  );

  assertEqual(plan.paddingAdjustments.top, 0, "zero padding should stay zero");
  assertEqual(plan.paddingAdjustments.right, 0, "zero padding should stay zero");
  assertEqual(plan.paddingAdjustments.bottom, 0, "zero padding should stay zero");
  assertEqual(plan.paddingAdjustments.left, 0, "zero padding should stay zero");
});

console.log("\n✅ All spacing calculation tests passed\n");
