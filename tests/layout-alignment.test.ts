/**
 * Characterization tests for alignment strategy logic.
 * These tests lock the current behavior of determineAlignments
 * before refactoring.
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
// Alignment Strategy Tests
// ============================================================================

testCase("pattern-specific alignments from AI advice are honored (centered-stack)", () => {
  const frame = createFrame({
    layoutMode: "HORIZONTAL",
    width: 1200,
    height: 800
  });

  const layoutAdvice: LayoutAdviceEntry = {
    targetId: "tiktok-vertical",
    selectedId: "centered-stack", // CENTER primary, CENTER counter
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

  assert(plan.primaryAxisAlignItems === "CENTER", "centered-stack should use CENTER primary alignment");
  assert(plan.counterAxisAlignItems === "CENTER", "centered-stack should use CENTER counter alignment");
});

testCase("pattern-specific alignments from AI advice are honored (banner-spread)", () => {
  const frame = createFrame({
    layoutMode: "VERTICAL",
    width: 800,
    height: 600
  });

  const layoutAdvice: LayoutAdviceEntry = {
    targetId: "web-hero",
    selectedId: "banner-spread", // SPACE_BETWEEN primary, CENTER counter
    suggestedLayoutMode: "HORIZONTAL",
    options: []
  };

  const plan = createLayoutAdaptationPlan(
    frame,
    { width: 1440, height: 600 },
    "horizontal",
    1,
    { layoutAdvice }
  );

  assert(plan.primaryAxisAlignItems === "SPACE_BETWEEN", "banner-spread should use SPACE_BETWEEN primary");
  assert(plan.counterAxisAlignItems === "CENTER", "banner-spread should use CENTER counter");
});

testCase("vertical layout in vertical target centers content", () => {
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
    { width: 1080, height: 1920 },
    "vertical",
    1,
    { adoptVerticalVariant: true }
  );

  assert(plan.counterAxisAlignItems === "CENTER", "vertical layout should center content on counter axis");
});

testCase("horizontal layout with 3 or fewer children uses SPACE_BETWEEN", () => {
  const frame = createFrame({
    layoutMode: "HORIZONTAL",
    width: 1200,
    height: 400,
    children: [
      createChild({ id: "child-1" }),
      createChild({ id: "child-2" }),
      createChild({ id: "child-3" })
    ]
  });

  const plan = createLayoutAdaptationPlan(
    frame,
    { width: 2560, height: 1440 },
    "horizontal",
    1
  );

  assert(plan.primaryAxisAlignItems === "SPACE_BETWEEN", "horizontal with ≤3 children should use SPACE_BETWEEN");
});

testCase("horizontal layout with more than 3 children uses MIN", () => {
  const frame = createFrame({
    layoutMode: "HORIZONTAL",
    width: 1600,
    height: 400,
    children: [
      createChild(), createChild(), createChild(), createChild()
    ]
  });

  const plan = createLayoutAdaptationPlan(
    frame,
    { width: 2560, height: 1440 },
    "horizontal",
    1
  );

  assert(plan.primaryAxisAlignItems === "MIN", "horizontal with >3 children should use MIN");
});

testCase("NONE layout returns MIN/MIN alignments", () => {
  const frame = createFrame({
    layoutMode: "NONE",
    width: 800,
    height: 600
  });

  const plan = createLayoutAdaptationPlan(
    frame,
    { width: 1000, height: 800 },
    "square",
    1
  );

  assert(plan.primaryAxisAlignItems === "MIN", "NONE layout should use MIN primary alignment");
  assert(plan.counterAxisAlignItems === "MIN", "NONE layout should use MIN counter alignment");
});

testCase("mixed scenario defaults to CENTER/CENTER", () => {
  // Horizontal source targeting square (neither extreme horizontal nor vertical)
  const frame = createFrame({
    layoutMode: "HORIZONTAL",
    width: 800,
    height: 600,
    children: [
      createChild(), createChild() // 2 children
    ]
  });

  const plan = createLayoutAdaptationPlan(
    frame,
    { width: 1080, height: 1080 }, // square target
    "square",
    1
  );

  // For square targets with horizontal layout but not extreme, we get default centered
  assert(plan.counterAxisAlignItems === "CENTER", "mixed scenario should center on counter axis");
});

testCase("hero-first pattern uses MIN primary alignment", () => {
  const frame = createFrame({
    layoutMode: "HORIZONTAL",
    width: 1200,
    height: 800
  });

  const layoutAdvice: LayoutAdviceEntry = {
    targetId: "tiktok-vertical",
    selectedId: "hero-first", // MIN primary
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

  // hero-first uses MIN for primary alignment (content at top)
  assert(plan.primaryAxisAlignItems === "MIN", "hero-first should use MIN primary alignment");
});

console.log("\n✅ All alignment strategy tests passed\n");
