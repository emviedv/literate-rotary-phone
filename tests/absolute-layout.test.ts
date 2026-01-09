import { planAbsoluteChildPositions } from "../core/absolute-layout.js";

type Child = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  nodeType: string;
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
};

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

function createTestChild(id: string, x: number, y: number, width: number, height: number, nodeType: string = "TEXT"): Child {
  return {
    id,
    x,
    y,
    width,
    height,
    nodeType,
    bounds: { x, y, width, height }
  };
}

testCase("stacks horizontally arranged absolute children for vertical targets", () => {
  const children: Child[] = [
    createTestChild("text", 40, 220, 420, 420),
    createTestChild("hero", 520, 260, 420, 420, "INSTANCE")
  ];

  const plan = planAbsoluteChildPositions({
    profile: "vertical",
    safeBounds: { x: 80, y: 80, width: 920, height: 1760 },
    children
  });

  const [top, bottom] = plan;

  assert(plan.length === 2, "should return the same number of children");
  assert(top.y < bottom.y, "top child should sit above the second child");
  assert(
    top.y <= 200,
    `top child should be nudged toward the safe-area start but was placed at ${top.y}`
  );
  assert(
    bottom.y + children[1].height >= 1760 + 80 - 40,
    "bottom child should lean toward the safe-area foot"
  );
  assert(
    Math.abs(top.x + children[0].width / 2 - (80 + 920 / 2)) < 5,
    "children should be centered horizontally inside the safe area"
  );
});

testCase("stacks horizontal siblings for TikTok safe bounds even after cropping", () => {
  const children: Child[] = [
    createTestChild("logo", 120, 180, 360, 360, "INSTANCE"),
    createTestChild("title", 540, 180, 360, 360, "TEXT")
  ];

  const plan = planAbsoluteChildPositions({
    profile: "vertical",
    safeBounds: { x: 44, y: 108, width: 916, height: 1492 },
    targetAspectRatio: 1080 / 1920,
    children
  });

  const [first, second] = plan;

  assert(plan.length === children.length, "should plan all children");
  assert(first.y < second.y, "extreme vertical targets should reflow side-by-side items into a stack");
  assert(
    Math.abs(first.x + children[0].width / 2 - (44 + 916 / 2)) < 5,
    "first child should be centered in the safe area"
  );
});

testCase("preserves layout when target profile is horizontal", () => {
  const children: Child[] = [
    createTestChild("left", 120, 100, 400, 360, "TEXT"),
    createTestChild("right", 560, 120, 400, 360, "TEXT")
  ];

  const plan = planAbsoluteChildPositions({
    profile: "horizontal",
    safeBounds: { x: 80, y: 80, width: 960, height: 720 },
    children
  });

  assert(plan[0].x === children[0].x, "horizontal profile should keep x positions untouched");
  assert(plan[1].y === children[1].y, "horizontal profile should keep y positions untouched");
});

testCase("always stacks for extreme vertical targets even if not wide", () => {
  const children: Child[] = [
    createTestChild("item1", 0, 0, 100, 300, "FRAME"),
    createTestChild("item2", 200, 0, 100, 300, "FRAME")
  ];

  const plan = planAbsoluteChildPositions({
    profile: "vertical",
    safeBounds: { x: 0, y: 0, width: 1080, height: 1920 },
    targetAspectRatio: 1080 / 1920,
    children
  });

  const [first, second] = plan;

  assert(first.y < second.y, "should stack children vertically for extreme vertical targets regardless of original layout width");
});
