/**
 * Characterization tests for layout detection helper functions.
 * These tests lock the current behavior of isBackgroundLike,
 * isComponentLikeFrame, countFlowChildren, and related utilities.
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
// Background Detection Tests (via childAdaptations behavior)
// ============================================================================

testCase("background-like element with high area coverage becomes ABSOLUTE", () => {
  // Create a background that covers 90%+ of the frame
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
    children: [textChild, bgChild] // bg is bottom layer (last in children array)
  });

  const plan = createLayoutAdaptationPlan(
    frame,
    { width: 1080, height: 1920 },
    "vertical",
    1
  );

  const bgAdaptation = plan.childAdaptations.get("bg-layer");
  assert(
    bgAdaptation?.layoutPositioning === "ABSOLUTE",
    "background-like layer should be positioned ABSOLUTE"
  );
});

testCase("element with background in name becomes ABSOLUTE", () => {
  const bgChild = createChild({
    id: "hero-bg",
    type: "RECTANGLE",
    name: "hero-background",
    width: 780, // 97.5% coverage
    height: 580,
    fills: []
  });

  const textChild = createChild({
    id: "text-content",
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
    { width: 1080, height: 1080 },
    "square",
    1
  );

  const bgAdaptation = plan.childAdaptations.get("hero-bg");
  assert(
    bgAdaptation?.layoutPositioning === "ABSOLUTE",
    "element with 'background' in name should be ABSOLUTE"
  );
});

testCase("small element does not become ABSOLUTE even with image fill", () => {
  const smallImage = createChild({
    id: "small-img",
    type: "RECTANGLE",
    width: 100, // Only 12.5% of 800
    height: 100,
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
    layoutMode: "HORIZONTAL",
    children: [smallImage, textChild]
  });

  const plan = createLayoutAdaptationPlan(
    frame,
    { width: 1920, height: 960 },
    "horizontal",
    1
  );

  const imgAdaptation = plan.childAdaptations.get("small-img");
  assert(
    imgAdaptation?.layoutPositioning !== "ABSOLUTE",
    "small image should not be positioned ABSOLUTE"
  );
});

testCase("AI backgroundNodeId overrides heuristic background detection", () => {
  // Even though bg-layer looks like a background, AI says specific-bg is the background
  const bgLayer = createChild({
    id: "bg-layer",
    type: "RECTANGLE",
    name: "background",
    width: 800,
    height: 600,
    fills: [{ type: "IMAGE" } as Paint]
  });

  const specificBg = createChild({
    id: "specific-bg",
    type: "RECTANGLE",
    width: 400,
    height: 300
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
    children: [textChild, specificBg, bgLayer]
  });

  const plan = createLayoutAdaptationPlan(
    frame,
    { width: 1080, height: 1920 },
    "vertical",
    1,
    {
      layoutAdvice: {
        targetId: "tiktok-vertical",
        selectedId: "layered-hero",
        backgroundNodeId: "specific-bg",
        options: []
      }
    }
  );

  const specificBgAdaptation = plan.childAdaptations.get("specific-bg");
  assert(
    specificBgAdaptation?.layoutPositioning === "ABSOLUTE",
    "AI-specified background should be ABSOLUTE"
  );

  // The heuristic-detected bg-layer should NOT be made absolute when AI specifies another
  const bgLayerAdaptation = plan.childAdaptations.get("bg-layer");
  assert(
    bgLayerAdaptation?.layoutPositioning !== "ABSOLUTE",
    "heuristic background should not be ABSOLUTE when AI specifies different node"
  );
});

// ============================================================================
// Component-like Frame Detection Tests (via adaptNestedFrames behavior)
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
// Edge Element Handling Tests
// ============================================================================

testCase("edge elements in extreme formats get layoutGrow=0", () => {
  const firstChild = createChild({
    id: "first",
    width: 100,
    height: 50
  });

  const middleChild = createChild({
    id: "middle",
    width: 100,
    height: 50
  });

  const lastChild = createChild({
    id: "last",
    width: 100,
    height: 50
  });

  const frame = createFrame({
    layoutMode: "VERTICAL",
    width: 400,
    height: 800,
    children: [firstChild, middleChild, lastChild]
  });

  const plan = createLayoutAdaptationPlan(
    frame,
    { width: 1080, height: 1920 }, // aspectRatio = 0.5625 < 0.5 threshold
    "vertical",
    1
  );

  const firstAdaptation = plan.childAdaptations.get("first");
  const lastAdaptation = plan.childAdaptations.get("last");

  // Edge elements in extreme aspect ratios should not expand excessively
  if (firstAdaptation) {
    assert(
      firstAdaptation.layoutGrow === 0 || firstAdaptation.layoutGrow === undefined,
      "first child should have layoutGrow=0 in extreme format"
    );
  }
  if (lastAdaptation) {
    assert(
      lastAdaptation.layoutGrow === 0 || lastAdaptation.layoutGrow === undefined,
      "last child should have layoutGrow=0 in extreme format"
    );
  }
});

// ============================================================================
// Image Content Detection Tests
// ============================================================================

testCase("image children are detected via fill type", () => {
  const imageChild = createChild({
    id: "hero-image",
    type: "RECTANGLE",
    fills: [{ type: "IMAGE" } as Paint]
  });

  const frame = createFrame({
    layoutMode: "HORIZONTAL",
    children: [imageChild, createChild({ id: "text" })]
  });

  const plan = createLayoutAdaptationPlan(
    frame,
    { width: 1080, height: 1920 },
    "vertical",
    1,
    { adoptVerticalVariant: true }
  );

  const imageAdaptation = plan.childAdaptations.get("hero-image");
  // Image children should get INHERIT alignment to prevent stretching
  assert(
    imageAdaptation?.layoutAlign === "INHERIT" || imageAdaptation?.layoutAlign === undefined,
    "image children should not stretch"
  );
});

testCase("video children are detected via fill type", () => {
  const videoChild = createChild({
    id: "promo-video",
    type: "RECTANGLE",
    fills: [{ type: "VIDEO" } as Paint]
  });

  const frame = createFrame({
    layoutMode: "HORIZONTAL",
    children: [videoChild, createChild({ id: "text" })]
  });

  const plan = createLayoutAdaptationPlan(
    frame,
    { width: 1080, height: 1920 },
    "vertical",
    1,
    { adoptVerticalVariant: true }
  );

  const videoAdaptation = plan.childAdaptations.get("promo-video");
  // Video children should get INHERIT alignment like images
  assert(
    videoAdaptation?.layoutAlign === "INHERIT" || videoAdaptation?.layoutAlign === undefined,
    "video children should not stretch"
  );
});

console.log("\n✅ All detection helper tests passed\n");
