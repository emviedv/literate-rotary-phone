import { scaleCenterToRange } from "../core/absolute-geometry.js";

function assertAlmostEqual(value: number, expected: number, message: string): void {
  const epsilon = 0.0001;
  if (Math.abs(value - expected) > epsilon) {
    throw new Error(`${message}\nExpected: ${expected}\nReceived: ${value}`);
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

testCase("scales a point outward to fill the destination range", () => {
  const source = { start: 200, size: 400 };
  const destination = { start: 80, size: 960 };

  const leftEdgeCenter = 250; // 200 + 100/2
  const rightEdgeCenter = 550; // 200 + 400 - 100/2

  const mappedLeft = scaleCenterToRange(leftEdgeCenter, source, destination);
  const mappedRight = scaleCenterToRange(rightEdgeCenter, source, destination);

  assertAlmostEqual(mappedLeft, 200, "left-most point should move toward the destination start edge");
  assertAlmostEqual(mappedRight, 920, "right-most point should shift toward the opposite edge");
});

testCase("keeps the point centered when source collapses", () => {
  const center = scaleCenterToRange(420, { start: 420, size: 0 }, { start: 0, size: 600 });
  assertAlmostEqual(center, 300, "collapsed ranges map to destination midpoint");
});
