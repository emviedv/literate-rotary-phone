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
