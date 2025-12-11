import { planAbsoluteChildPositions } from "../core/absolute-layout.js";

type Child = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
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

testCase("stacks horizontally arranged absolute children for vertical targets", () => {
  const children: Child[] = [
    { id: "text", x: 40, y: 220, width: 420, height: 420 },
    { id: "hero", x: 520, y: 260, width: 420, height: 420 }
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
    { id: "logo", x: 120, y: 180, width: 360, height: 360 },
    { id: "title", x: 540, y: 180, width: 360, height: 360 }
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
    { id: "left", x: 120, y: 100, width: 400, height: 360 },
    { id: "right", x: 560, y: 120, width: 400, height: 360 }
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
    { id: "item1", x: 0, y: 0, width: 100, height: 300 },
    { id: "item2", x: 200, y: 0, width: 100, height: 300 }
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
