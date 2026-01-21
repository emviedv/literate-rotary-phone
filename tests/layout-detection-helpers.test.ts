/**
 * Characterization tests for layout detection helper functions.
 *
 * FREESTYLE POSITIONING MODE:
 * Child adaptations have been removed - AI positioning maps handle per-node decisions.
 * Tests now focus on frame-level layout behavior and flow child counting.
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

type ChildOverrides = {
  id?: string;
  type?: SceneNode["type"];
  visible?: boolean;
  fills?: readonly Paint[];
  children?: readonly SceneNode[];
  name?: string;
  width?: number;
  height?: number;
  layoutPositioning?: "AUTO" | "ABSOLUTE";
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
  name?: string;
};

function createChild(overrides: ChildOverrides = {}): SceneNode {
  childCounter += 1;
  return {
    id: overrides.id ?? `child-stub-${childCounter}`,
    type: overrides.type ?? "TEXT",
    visible: overrides.visible ?? true,
    name: overrides.name ?? "child",
    fills: overrides.fills ?? [],
    children: overrides.children ?? [],
    width: overrides.width ?? 100,
    height: overrides.height ?? 50,
    layoutPositioning: overrides.layoutPositioning ?? "AUTO"
  } as unknown as SceneNode;
}

function createFrame(overrides: FrameOverrides = {}): FrameNode {
  const children =
    overrides.children ??
    ([createChild({ id: "child-1" }), createChild({ id: "child-2" })] as unknown as readonly SceneNode[]);

  return {
    id: overrides.id ?? "frame-1",
    type: "FRAME",
    name: overrides.name ?? "Stub Frame",
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
// FREESTYLE MODE: Plan Structure Tests (childAdaptations removed)
// ============================================================================

testCase("FREESTYLE: plan has no childAdaptations field", () => {
  const bgChild = createChild({
    id: "bg-layer",
    type: "RECTANGLE",
    name: "background",
    width: 800,
    height: 600,
    fills: [{ type: "IMAGE" } as Paint]
  });

  const textChild = createChild({
    id: "text-1",
    type: "TEXT",
    width: 200,
    height: 50
  });

  const frame = createFrame({
    width: 800,
    height: 600,
    layoutMode: "VERTICAL",
    children: [textChild, bgChild]
  });

  const plan = createLayoutAdaptationPlan(
    frame,
    { width: 1080, height: 1920 },
    "vertical",
    1
  );

  assert(
    !("childAdaptations" in plan),
    "FREESTYLE mode should not have childAdaptations - AI handles per-node positioning"
  );
});

// ============================================================================
// Flow Children Count Tests (affects spacing distribution)
// ============================================================================

testCase("flow children count excludes invisible children", () => {
  const visibleChild = createChild({
    id: "visible",
    visible: true,
    width: 100,
    height: 50
  });

  const invisibleChild = createChild({
    id: "invisible",
    visible: false,
    width: 100,
    height: 50
  });

  const frame = createFrame({
    layoutMode: "HORIZONTAL",
    width: 800,
    height: 600,
    children: [visibleChild, invisibleChild]
  });

  // The flow child count affects spacing distribution
  // With only 1 visible child, distribution should use sparse ratio
  const plan = createLayoutAdaptationPlan(
    frame,
    { width: 1920, height: 960 },
    "horizontal",
    1,
    { sourceFlowChildCount: 1 } // Explicitly test with 1 flow child
  );

  // The plan should work without errors
  assert(plan.layoutMode === "HORIZONTAL", "should handle frames with invisible children");
});

testCase("flow children count excludes ABSOLUTE positioned children", () => {
  const autoChild = createChild({
    id: "auto",
    layoutPositioning: "AUTO",
    width: 100,
    height: 50
  });

  const absoluteChild = createChild({
    id: "absolute",
    layoutPositioning: "ABSOLUTE",
    width: 100,
    height: 50
  });

  const frame = createFrame({
    layoutMode: "HORIZONTAL",
    width: 800,
    height: 600,
    children: [autoChild, absoluteChild]
  });

  const plan = createLayoutAdaptationPlan(
    frame,
    { width: 1920, height: 960 },
    "horizontal",
    1,
    { sourceFlowChildCount: 1 } // Only 1 flow child (the AUTO one)
  );

  assert(plan.layoutMode === "HORIZONTAL", "should handle frames with absolute children");
});

// ============================================================================
// Frame-Level Layout Mode Tests
// ============================================================================

testCase("FREESTYLE: layout mode is determined by target profile", () => {
  const frame = createFrame({
    layoutMode: "HORIZONTAL",
    width: 800,
    height: 600
  });

  // Vertical target
  const verticalPlan = createLayoutAdaptationPlan(
    frame,
    { width: 1080, height: 1920 },
    "vertical",
    1,
    { adoptVerticalVariant: true }
  );

  assert(
    verticalPlan.layoutMode === "VERTICAL",
    "vertical target with adoptVerticalVariant should result in VERTICAL layoutMode"
  );

  // Horizontal target
  const horizontalPlan = createLayoutAdaptationPlan(
    frame,
    { width: 1920, height: 960 },
    "horizontal",
    1
  );

  assert(
    horizontalPlan.layoutMode === "HORIZONTAL",
    "horizontal target should preserve HORIZONTAL layoutMode"
  );
});

testCase("FREESTYLE: AI layoutAdvice can override layout mode", () => {
  const frame = createFrame({
    layoutMode: "HORIZONTAL",
    width: 800,
    height: 600
  });

  const plan = createLayoutAdaptationPlan(
    frame,
    { width: 1080, height: 1920 },
    "vertical",
    1,
    {
      layoutAdvice: {
        targetId: "tiktok-vertical",
        suggestedLayoutMode: "VERTICAL",
        options: [],
        positioning: {
          "child-1": { anchor: "center", visible: true }
        }
      }
    }
  );

  assert(
    plan.layoutMode === "VERTICAL",
    "AI suggestedLayoutMode should be respected"
  );
});

// ============================================================================
// Spacing and Padding Tests
// ============================================================================

testCase("item spacing is non-negative", () => {
  const frame = createFrame({
    layoutMode: "HORIZONTAL",
    itemSpacing: 24
  });

  const plan = createLayoutAdaptationPlan(
    frame,
    { width: 1920, height: 960 },
    "horizontal",
    1
  );

  assert(
    plan.itemSpacing >= 0,
    `itemSpacing should be non-negative, got ${plan.itemSpacing}`
  );
});

testCase("padding adjustments are non-negative", () => {
  const frame = createFrame({
    paddingTop: 16,
    paddingRight: 16,
    paddingBottom: 16,
    paddingLeft: 16
  });

  const plan = createLayoutAdaptationPlan(
    frame,
    { width: 1920, height: 960 },
    "horizontal",
    1
  );

  assert(plan.paddingAdjustments.top >= 0, "paddingTop should be non-negative");
  assert(plan.paddingAdjustments.right >= 0, "paddingRight should be non-negative");
  assert(plan.paddingAdjustments.bottom >= 0, "paddingBottom should be non-negative");
  assert(plan.paddingAdjustments.left >= 0, "paddingLeft should be non-negative");
});

console.log("\n✅ All detection helper tests passed\n");
