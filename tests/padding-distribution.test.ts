import { distributePadding } from "../core/padding-distribution.js";

function assertDeepEqual(actual: unknown, expected: unknown, message: string): void {
  const actualJson = JSON.stringify(actual);
  const expectedJson = JSON.stringify(expected);
  if (actualJson !== expectedJson) {
    throw new Error(`${message}\nExpected: ${expectedJson}\nReceived: ${actualJson}`);
  }
}

function assertAlmostEqual(actual: number, expected: number, message: string): void {
  const epsilon = 0.0001;
  if (Math.abs(actual - expected) > epsilon) {
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

testCase("splits space evenly when gaps are balanced", () => {
  const result = distributePadding({
    totalExtra: 400,
    safeInset: 80,
    gaps: { start: 120, end: 120 }
  });

  assertAlmostEqual(result.start, 200, "start padding should contain safe inset plus half remaining room");
  assertAlmostEqual(result.end, 200, "end padding should mirror start padding when layout is balanced");
});

testCase("biases distribution toward larger original gap", () => {
  const result = distributePadding({
    totalExtra: 600,
    safeInset: 60,
    gaps: { start: 180, end: 60 }
  });

  assertAlmostEqual(result.start, 420, "start padding prefers the side with greater breathing room");
  assertAlmostEqual(result.end, 180, "end padding receives the smaller portion when original gap is tighter");
});

testCase("gracefully handles missing gap data by centering", () => {
  const result = distributePadding({
    totalExtra: 300,
    safeInset: 50,
    gaps: null
  });

  assertAlmostEqual(result.start, 150, "start padding should halve the extra space without gap guidance");
  assertAlmostEqual(result.end, 150, "end padding should mirror start padding when gaps are unknown");
});

testCase("clamps safe inset when available room is limited", () => {
  const result = distributePadding({
    totalExtra: 50,
    safeInset: 80,
    gaps: { start: 30, end: 70 }
  });

  assertDeepEqual(result, { start: 25, end: 25 }, "safe inset should not exceed available extra space");
});
