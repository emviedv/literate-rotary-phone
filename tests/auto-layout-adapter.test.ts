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

testCase("child adaptations avoid deprecated layoutAlign values", () => {
  const frame = createFrame({
    layoutMode: "VERTICAL"
  });

  const plan = createLayoutAdaptationPlan(
    frame,
    { width: 2400, height: 600 },
    "horizontal",
    1
  );

  const adaptation = plan.childAdaptations.get("child-1");

  assert(adaptation, "expected adaptation to exist for child-1");
  assert(adaptation?.layoutAlign === "INHERIT", "layoutAlign should normalize to INHERIT");
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

testCase("image children stay inheriting alignment to avoid stretch in tall targets", () => {
  const imageChild = createChild({
    id: "image-hero",
    type: "RECTANGLE",
    fills: [{ type: "IMAGE" } as Paint]
  });

  const frame = createFrame({
    layoutMode: "HORIZONTAL",
    children: [imageChild, createChild({ id: "text-1" })]
  });

  const plan = createLayoutAdaptationPlan(
    frame,
    { width: 1080, height: 1920 },
    "vertical",
    1
  );

  const imageAdaptation = plan.childAdaptations.get("image-hero");
  assert(imageAdaptation, "expected an adaptation record for the image child");
  assert(
    imageAdaptation?.layoutAlign === "INHERIT" || imageAdaptation?.layoutAlign === undefined,
    "image children should not be stretched in vertical targets"
  );
});

testCase("image children do not grow to fill width in ultra-wide targets", () => {
  const imageChild = createChild({
    id: "image-banner",
    type: "RECTANGLE",
    fills: [{ type: "IMAGE" } as Paint]
  });

  const frame = createFrame({
    layoutMode: "VERTICAL",
    children: [imageChild, createChild({ id: "text-1" })]
  });

  const plan = createLayoutAdaptationPlan(
    frame,
    { width: 2400, height: 600 },
    "horizontal",
    1
  );

  const imageAdaptation = plan.childAdaptations.get("image-banner");
  assert(imageAdaptation, "expected an adaptation record for the image child");
  assert(
    imageAdaptation?.layoutGrow === 0 || imageAdaptation?.layoutGrow === undefined,
    "image children should not grow across the main axis when preserving aspect ratio"
  );
});

testCase("adopts vertical flow using source snapshot hints and top-aligns stack", () => {
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
  assert(plan.primaryAxisAlignItems === "MIN", "vertical stacks should top-align to hug the safe area");
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

testCase("should not stretch non-image children in vertical layouts", () => {
  const shapeChild = createChild({
    id: "shape",
    type: "RECTANGLE",
  });

  const frame = createFrame({
    layoutMode: "HORIZONTAL",
    children: [shapeChild]
  });

  const plan = createLayoutAdaptationPlan(
    frame,
    { width: 1080, height: 1920 },
    "vertical",
    1,
    { adoptVerticalVariant: true }
  );
  
  const shapeAdaptation = plan.childAdaptations.get("shape");
  assert(shapeAdaptation?.layoutAlign === "INHERIT", "non-image children should not be stretched by default");
});
