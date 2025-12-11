import { computeVariantLayout } from "../core/layout-positions.js";

const defaultOptions = {
  margin: 48,
  gap: 160,
  maxRowWidth: 3200
} as const;

type Position = { x: number; y: number };

function assertDeepEqual(actual: unknown, expected: unknown, message: string): void {
  const actualJson = JSON.stringify(actual);
  const expectedJson = JSON.stringify(expected);
  if (actualJson !== expectedJson) {
    throw new Error(`${message}\nExpected: ${expectedJson}\nReceived: ${actualJson}`);
  }
}

function assertEqual(actual: unknown, expected: unknown, message: string): void {
  if (actual !== expected) {
    throw new Error(`${message}\nExpected: ${expected}\nReceived: ${actual}`);
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

testCase("places variants on a single row when width budget allows", () => {
  const sizes = [
    { width: 1000, height: 800 },
    { width: 900, height: 700 }
  ];

  const result = computeVariantLayout(sizes, defaultOptions);

  const expectedPositions: Position[] = [
    { x: 48, y: 48 },
    { x: 1208, y: 48 }
  ];

  assertDeepEqual(result.positions, expectedPositions, "variants should stay on first row with consistent margin");

  assertEqual(result.bounds.width, 2156, "total width accounts for trailing margin");
  assertEqual(result.bounds.height, 896, "total height reflects tallest row plus margin");
});

testCase("wraps to a new row when the max row width would be exceeded", () => {
  const sizes = [
    { width: 2000, height: 900 },
    { width: 1400, height: 600 },
    { width: 1800, height: 720 }
  ];

  const result = computeVariantLayout(sizes, defaultOptions);

  const expectedPositions: Position[] = [
    { x: 48, y: 48 },
    { x: 48, y: 1108 },
    { x: 48, y: 1868 }
  ];

  assertDeepEqual(
    result.positions,
    expectedPositions,
    "variants exceeding row width should start a new row with vertical gap"
  );

  assertEqual(result.bounds.width, 2096, "width tracks widest row");
  assertEqual(result.bounds.height, 2636, "height accumulates per-row height and margin");
});

testCase("handles single variant with width wider than row budget by placing alone", () => {
  const sizes = [{ width: 3600, height: 400 }];

  const result = computeVariantLayout(sizes, defaultOptions);

  assertDeepEqual(result.positions, [{ x: 48, y: 48 }], "single variant should keep base margin");
  assertEqual(result.bounds.width, 3696, "width uses variant width even if larger than budget");
  assertEqual(result.bounds.height, 496, "height accounts for margin on both axes");
});

testCase("stacks variants vertically when direction is vertical", () => {
  const sizes = [
    { width: 800, height: 600 },
    { width: 700, height: 500 }
  ];

  const result = computeVariantLayout(sizes, { ...defaultOptions, direction: 'vertical' });

  const expectedPositions: Position[] = [
    { x: 48, y: 48 },
    { x: 48, y: 808 } // 48 (margin) + 600 (height1) + 160 (gap)
  ];

  assertDeepEqual(result.positions, expectedPositions, "variants should stack top-to-bottom");

  assertEqual(result.bounds.width, 896, "total width is max variant width plus margin");
  assertEqual(result.bounds.height, 1356, "total height is sum of heights, gaps, and margins");
});
