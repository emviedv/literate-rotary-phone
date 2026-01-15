/**
 * Characterization tests for layout mode resolution logic.
 * These tests lock the current behavior of determineOptimalLayoutMode
 * and related functions before refactoring.
 */

import { createLayoutAdaptationPlan } from "../core/auto-layout-adapter.js";
import type { LayoutAdviceEntry } from "../types/layout-advice.js";

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
// Layout Mode Resolution Tests
// ============================================================================

testCase("AI suggestedLayoutMode overrides all heuristics", () => {
  const frame = createFrame({
    layoutMode: "HORIZONTAL",
    width: 1200,
    height: 800
  });

  const layoutAdvice: LayoutAdviceEntry = {
    targetId: "tiktok-vertical",
    selectedId: "vertical-stack",
    suggestedLayoutMode: "VERTICAL",
    options: []
  };

  const plan = createLayoutAdaptationPlan(
    frame,
    { width: 1080, height: 1920 },
    "vertical",
    1,
    { layoutAdvice }
  );

  assert(plan.layoutMode === "VERTICAL", "AI suggestedLayoutMode should override heuristics");
});

testCase("AI pattern selection derives layout mode when no explicit suggestedLayoutMode", () => {
  const frame = createFrame({
    layoutMode: "NONE",
    width: 1200,
    height: 800
  });

  const layoutAdvice: LayoutAdviceEntry = {
    targetId: "youtube-cover",
    selectedId: "banner-spread", // HORIZONTAL pattern
    options: []
  };

  const plan = createLayoutAdaptationPlan(
    frame,
    { width: 2560, height: 1440 },
    "horizontal",
    1,
    { layoutAdvice }
  );

  assert(plan.layoutMode === "HORIZONTAL", "should derive HORIZONTAL from banner-spread pattern");
});

testCase("adoptVerticalVariant forces VERTICAL for vertical targets", () => {
  const frame = createFrame({
    layoutMode: "HORIZONTAL",
    width: 1200,
    height: 400
  });

  const plan = createLayoutAdaptationPlan(
    frame,
    { width: 1080, height: 1920 },
    "vertical",
    1,
    { adoptVerticalVariant: true }
  );

  assert(plan.layoutMode === "VERTICAL", "adoptVerticalVariant should force VERTICAL layout");
});

testCase("extreme vertical target converts text-heavy horizontal to vertical", () => {
  // Create text-heavy frame (3+ text children)
  const frame = createFrame({
    layoutMode: "HORIZONTAL",
    width: 1200,
    height: 400,
    children: [
      createChild({ id: "text-1", type: "TEXT" }),
      createChild({ id: "text-2", type: "TEXT" }),
      createChild({ id: "text-3", type: "TEXT" })
    ]
  });

  const plan = createLayoutAdaptationPlan(
    frame,
    { width: 1080, height: 1920 }, // 9:16 ratio = 0.5625 (extreme vertical)
    "vertical",
    1
  );

  assert(plan.layoutMode === "VERTICAL", "extreme vertical should convert text-heavy horizontal to vertical");
});

testCase("extreme horizontal target converts vertical to horizontal", () => {
  const frame = createFrame({
    layoutMode: "VERTICAL",
    width: 400,
    height: 800,
    children: [
      createChild({ id: "child-1" }),
      createChild({ id: "child-2" })
    ]
  });

  const plan = createLayoutAdaptationPlan(
    frame,
    { width: 2560, height: 600 }, // ~4.27 ratio (extreme horizontal)
    "horizontal",
    1
  );

  assert(plan.layoutMode === "HORIZONTAL", "extreme horizontal should convert vertical to horizontal");
});

testCase("source NONE layout preserves positioning for moderate aspect changes", () => {
  const frame = createFrame({
    layoutMode: "NONE",
    width: 800,
    height: 600
  });

  const plan = createLayoutAdaptationPlan(
    frame,
    { width: 1000, height: 800 }, // moderate change, aspect delta < 1.0
    "square",
    1
  );

  assert(plan.layoutMode === "NONE", "moderate aspect change should preserve NONE layout");
});

testCase("source NONE with major reorientation to vertical adopts VERTICAL", () => {
  const frame = createFrame({
    layoutMode: "NONE",
    width: 1600, // 16:9 landscape
    height: 900
  });

  const plan = createLayoutAdaptationPlan(
    frame,
    { width: 1080, height: 1920 }, // 9:16 portrait (aspect delta > 1.0)
    "vertical",
    1
  );

  assert(plan.layoutMode === "VERTICAL", "major reorientation should adopt VERTICAL for extreme vertical target");
});

testCase("square targets preserve source layout mode", () => {
  const frame = createFrame({
    layoutMode: "HORIZONTAL",
    width: 1200,
    height: 800
  });

  const plan = createLayoutAdaptationPlan(
    frame,
    { width: 1080, height: 1080 }, // 1:1 square
    "square",
    1
  );

  assert(plan.layoutMode === "HORIZONTAL", "square target should preserve source HORIZONTAL mode");
});

// ============================================================================
// Sizing Mode Tests
// ============================================================================

testCase("sizing modes are FIXED for variant frames", () => {
  const frame = createFrame({
    layoutMode: "HORIZONTAL"
  });

  const plan = createLayoutAdaptationPlan(
    frame,
    { width: 1920, height: 960 },
    "horizontal",
    1
  );

  assert(plan.primaryAxisSizingMode === "FIXED", "primary axis should be FIXED");
  assert(plan.counterAxisSizingMode === "FIXED", "counter axis should be FIXED");
});

testCase("NONE layout mode returns FIXED sizing", () => {
  const frame = createFrame({
    layoutMode: "NONE"
  });

  const plan = createLayoutAdaptationPlan(
    frame,
    { width: 1000, height: 800 },
    "square",
    1
  );

  assert(plan.primaryAxisSizingMode === "FIXED", "NONE layout should use FIXED primary sizing");
  assert(plan.counterAxisSizingMode === "FIXED", "NONE layout should use FIXED counter sizing");
});

// ============================================================================
// Wrap Behavior Tests
// ============================================================================

testCase("vertical layout in vertical target never wraps", () => {
  const frame = createFrame({
    layoutMode: "VERTICAL",
    children: [
      createChild(), createChild(), createChild(),
      createChild(), createChild(), createChild()
    ]
  });

  const plan = createLayoutAdaptationPlan(
    frame,
    { width: 1080, height: 1920 },
    "vertical",
    1
  );

  assert(plan.layoutWrap === "NO_WRAP", "vertical layout in vertical target should not wrap");
});

testCase("horizontal layout with many children on wide target wraps", () => {
  const frame = createFrame({
    layoutMode: "HORIZONTAL",
    width: 1600,
    children: [
      createChild(), createChild(), createChild(),
      createChild(), createChild() // 5 children
    ]
  });

  const plan = createLayoutAdaptationPlan(
    frame,
    { width: 2560, height: 1440 }, // wide target > 1200px
    "horizontal",
    1
  );

  assert(plan.layoutWrap === "WRAP", "horizontal with 5+ children on wide target should wrap");
});

testCase("horizontal layout with few children does not wrap", () => {
  const frame = createFrame({
    layoutMode: "HORIZONTAL",
    children: [
      createChild(), createChild(), createChild()
    ]
  });

  const plan = createLayoutAdaptationPlan(
    frame,
    { width: 2560, height: 1440 },
    "horizontal",
    1
  );

  assert(plan.layoutWrap === "NO_WRAP", "horizontal with 3 children should not wrap");
});

console.log("\n✅ All layout mode resolver tests passed\n");
