/**
 * Tests for auto-layout-adapter module.
 *
 * FREESTYLE POSITIONING MODE:
 * Child adaptations have been removed - AI positioning maps handle per-node decisions.
 * Tests now focus on frame-level layout properties (layoutMode, alignment, spacing).
 */

import { createLayoutAdaptationPlan } from "../core/auto-layout-adapter.js";

let childCounter = 0;

type ChildOverrides = {
  id?: string;
  type?: SceneNode["type"];
  visible?: boolean;
  fills?: readonly Paint[];
  children?: readonly SceneNode[];
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
  const child = {
    id: overrides.id ?? `child-stub-${childCounter}`,
    type: overrides.type ?? "TEXT",
    visible: overrides.visible ?? true,
    name: "child",
    fills: overrides.fills ?? [],
    children: overrides.children ?? []
  };
  return child as unknown as SceneNode;
}

function createFrame(overrides: FrameOverrides = {}): FrameNode {
  const children =
    overrides.children ??
    ([createChild({ id: "child-1" }), createChild({ id: "child-2" })] as unknown as readonly SceneNode[]);

  const frame = {
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
  };

  return frame as unknown as FrameNode;
}

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

// ============================================================================
// FREESTYLE MODE: Frame-level layout tests (childAdaptations removed)
// ============================================================================

testCase("FREESTYLE: plan has no childAdaptations field", () => {
  const frame = createFrame({
    layoutMode: "VERTICAL"
  });

  const plan = createLayoutAdaptationPlan(
    frame,
    { width: 2400, height: 600 },
    "horizontal",
    1
  );

  assert(!("childAdaptations" in plan), "FREESTYLE mode should not have childAdaptations");
});

testCase("padding adjustments stay non-negative when width shrinks", () => {
  const frame = createFrame({
    layoutMode: "HORIZONTAL",
    width: 1200,
    paddingLeft: 8,
    paddingRight: 8
  });

  const plan = createLayoutAdaptationPlan(
    frame,
    { width: 400, height: 800 },
    "horizontal",
    1
  );

  assert(plan.paddingAdjustments.right >= 0, "paddingRight must clamp to >= 0");
  assert(plan.paddingAdjustments.left >= 0, "paddingLeft must clamp to >= 0");
});

testCase("adopts vertical flow using source snapshot hints and centers stack", () => {
  const frame = createFrame({
    layoutMode: "NONE",
    width: 1200,
    height: 800
  });

  const plan = createLayoutAdaptationPlan(
    frame,
    { width: 1080, height: 1920 },
    "vertical",
    1,
    { sourceLayoutMode: "HORIZONTAL", sourceSize: { width: 1200, height: 800 }, adoptVerticalVariant: true }
  );

  assert(plan.layoutMode === "VERTICAL", "layout mode should switch to VERTICAL for tall targets");
  assert(plan.primaryAxisAlignItems === "CENTER", "vertical stacks should center for better visual balance");
});

testCase("converts horizontal moderate vertical targets when adoptVerticalVariant is true", () => {
  const frame = createFrame({
    layoutMode: "HORIZONTAL",
    width: 1000,
    height: 200,
    children: [createChild(), createChild()]
  });

  const plan = createLayoutAdaptationPlan(
    frame,
    { width: 1080, height: 1350 }, // Moderate vertical
    "vertical",
    1,
    { sourceLayoutMode: "HORIZONTAL", adoptVerticalVariant: true }
  );

  assert(plan.layoutMode === "VERTICAL", "should respect adoptVerticalVariant flag even for moderate vertical targets");
});

testCase("FREESTYLE: frame-level properties still apply", () => {
  const frame = createFrame({
    layoutMode: "HORIZONTAL",
    width: 1000,
    height: 500
  });

  const plan = createLayoutAdaptationPlan(
    frame,
    { width: 1920, height: 960 },
    "horizontal",
    1
  );

  // Frame-level properties should still be determined
  assert(
    plan.layoutMode === "HORIZONTAL" || plan.layoutMode === "VERTICAL" || plan.layoutMode === "NONE",
    "layoutMode should be a valid value"
  );
  assert(typeof plan.itemSpacing === "number", "itemSpacing should be set");
  assert(plan.paddingAdjustments !== undefined, "paddingAdjustments should be set");
});

console.log("\n✅ All auto-layout-adapter tests passed\n");
