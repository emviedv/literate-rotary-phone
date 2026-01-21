/**
 * Characterization tests for layout mode resolution logic.
 *
 * FREESTYLE POSITIONING MODE:
 * Pattern-based layout mode derivation has been removed.
 * In FREESTYLE mode:
 * 1. AI's `suggestedLayoutMode` is used directly if present
 * 2. If AI advice exists without suggestedLayoutMode, source layout is preserved
 * 3. Deterministic fallbacks only apply when no AI advice is available
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
// Layout Mode Resolution Tests (FREESTYLE MODE)
// ============================================================================

testCase("AI suggestedLayoutMode overrides all heuristics", () => {
  const frame = createFrame({
    layoutMode: "HORIZONTAL",
    width: 1200,
    height: 800
  });

  const layoutAdvice: LayoutAdviceEntry = {
    targetId: "tiktok-vertical",
    suggestedLayoutMode: "VERTICAL",
    options: [],
    positioning: {
      "child-1": { anchor: "center", visible: true }
    }
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

testCase("FREESTYLE: AI advice without suggestedLayoutMode preserves source layout", () => {
  const frame = createFrame({
    layoutMode: "NONE",
    width: 1200,
    height: 800
  });

  // AI advice exists but without explicit suggestedLayoutMode
  // In FREESTYLE mode, source layout is preserved
  const layoutAdvice: LayoutAdviceEntry = {
    targetId: "youtube-cover",
    options: [],
    positioning: {
      "child-1": { anchor: "center-left", visible: true }
    }
  };

  const plan = createLayoutAdaptationPlan(
    frame,
    { width: 2560, height: 1440 },
    "horizontal",
    1,
    { layoutAdvice }
  );

  // In FREESTYLE mode, source layout is preserved when no suggestedLayoutMode
  assert(plan.layoutMode === "NONE", "FREESTYLE: source layout should be preserved when AI advice lacks suggestedLayoutMode");
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

// ============================================================================
// FREESTYLE MODE: AI Layout Mode Tests
// ============================================================================

testCase("FREESTYLE: AI advice with positioning preserves source when no suggestedLayoutMode", () => {
  // Source frame has HORIZONTAL auto-layout
  const frame = createFrame({
    layoutMode: "HORIZONTAL",
    width: 800,
    height: 600
  });

  // AI advice with positioning but no suggestedLayoutMode
  const layoutAdvice: LayoutAdviceEntry = {
    targetId: "figma-cover",
    options: [],
    positioning: {
      "child-1": { anchor: "center-left", visible: true },
      "child-2": { anchor: "center-right", visible: true }
    }
  };

  const plan = createLayoutAdaptationPlan(
    frame,
    { width: 1920, height: 960 },
    "horizontal",
    1,
    {
      sourceLayoutMode: "HORIZONTAL",
      layoutAdvice
    }
  );

  // In FREESTYLE mode, source layout is preserved when AI advice exists but lacks suggestedLayoutMode
  assert(
    plan.layoutMode === "HORIZONTAL",
    `FREESTYLE: Source layout should be preserved when AI advice lacks suggestedLayoutMode, got ${plan.layoutMode}`
  );
});

testCase("FREESTYLE: AI VERTICAL suggestedLayoutMode is applied", () => {
  // Source frame has HORIZONTAL auto-layout
  const frame = createFrame({
    layoutMode: "HORIZONTAL",
    width: 800,
    height: 600
  });

  const layoutAdvice: LayoutAdviceEntry = {
    targetId: "tiktok-vertical",
    suggestedLayoutMode: "VERTICAL",
    options: [],
    positioning: {
      "child-1": { anchor: "center", visible: true }
    }
  };

  const plan = createLayoutAdaptationPlan(
    frame,
    { width: 1080, height: 1920 },
    "vertical",
    1,
    {
      sourceLayoutMode: "HORIZONTAL",
      layoutAdvice
    }
  );

  assert(
    plan.layoutMode === "VERTICAL",
    `FREESTYLE: AI VERTICAL suggestedLayoutMode should be applied, got ${plan.layoutMode}`
  );
});

// ============================================================================
// Alignment Preservation Tests (fixes overlapping nested frames)
// ============================================================================

testCase("sourceAlignments preserves items-end for horizontal layouts", () => {
  // Bar chart row with items-end (bottom alignment)
  const frame = createFrame({
    layoutMode: "HORIZONTAL",
    width: 1040,
    height: 503
  });

  // Simulate a nested frame that has items-end alignment
  const plan = createLayoutAdaptationPlan(
    frame,
    { width: 1920, height: 960 },
    "horizontal",
    1,
    {
      sourceLayoutMode: "HORIZONTAL",
      sourceAlignments: {
        primaryAxisAlignItems: "MIN",
        counterAxisAlignItems: "MAX"  // items-end in Tailwind
      }
    }
  );

  // Layout mode stays HORIZONTAL, so alignments should be preserved
  assert(
    plan.counterAxisAlignItems === "MAX",
    `Should preserve counterAxisAlignItems=MAX (items-end), got ${plan.counterAxisAlignItems}`
  );
});

testCase("sourceAlignments preserves justify-end for vertical layouts", () => {
  // Column with justify-end (push content to bottom)
  const frame = createFrame({
    layoutMode: "VERTICAL",
    width: 248,
    height: 327
  });

  const plan = createLayoutAdaptationPlan(
    frame,
    { width: 248, height: 400 },
    "vertical",
    1,
    {
      sourceLayoutMode: "VERTICAL",
      sourceAlignments: {
        primaryAxisAlignItems: "MAX",  // justify-end in Tailwind
        counterAxisAlignItems: "MIN"
      }
    }
  );

  // Layout mode stays VERTICAL, so alignments should be preserved
  assert(
    plan.primaryAxisAlignItems === "MAX",
    `Should preserve primaryAxisAlignItems=MAX (justify-end), got ${plan.primaryAxisAlignItems}`
  );
});

testCase("sourceAlignments preserved when nested frame layout mode unchanged", () => {
  // Simulate the bar chart row scenario: HORIZONTAL with items-end
  const frame = createFrame({
    layoutMode: "HORIZONTAL",
    width: 1040,
    height: 503,
    children: [
      createChild({ id: "q1-col" }),
      createChild({ id: "q2-col" }),
      createChild({ id: "q3-col" }),
      createChild({ id: "q4-col" })
    ]
  });

  // For a horizontal target, HORIZONTAL layout should be preserved
  const plan = createLayoutAdaptationPlan(
    frame,
    { width: 2560, height: 1440 },
    "horizontal",
    1,
    {
      sourceLayoutMode: "HORIZONTAL",
      sourceAlignments: {
        primaryAxisAlignItems: "MIN",
        counterAxisAlignItems: "MAX"  // Critical: items-end for bar chart
      }
    }
  );

  // Both mode and alignment should be preserved
  assert(
    plan.layoutMode === "HORIZONTAL",
    `Layout mode should stay HORIZONTAL, got ${plan.layoutMode}`
  );
  assert(
    plan.counterAxisAlignItems === "MAX",
    `counterAxisAlignItems should be preserved as MAX (items-end), got ${plan.counterAxisAlignItems}`
  );
});

console.log("\n✅ All layout mode resolver tests passed\n");
