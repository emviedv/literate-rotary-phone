import { planAutoLayoutExpansion } from "../core/layout-expansion.js";

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

function assertGreaterThan(actual: number, threshold: number, message: string): void {
  if (!(actual > threshold)) {
    throw new Error(`${message}\nExpected greater than: ${threshold}\nReceived: ${actual}`);
  }
}

function assertLessThan(actual: number, threshold: number, message: string): void {
  if (!(actual < threshold)) {
    throw new Error(`${message}\nExpected less than: ${threshold}\nReceived: ${actual}`);
  }
}

testCase("pushes majority of extra width into interior spacing when layout can reflow", () => {
  const plan = planAutoLayoutExpansion({
    totalExtra: 600,
    safeInset: 80,
    gaps: { start: 120, end: 120 },
    flowChildCount: 3
  });

  assertLessThan(plan.start, 200, "left edge should not hoard the full safe gap");
  assertLessThan(plan.end, 200, "right edge should stay symmetric for balanced margins");
  assertGreaterThan(plan.interior, 280, "most of the surplus should flow into interior spacing");
  assertGreaterThan(plan.interior, plan.start, "interior spacing should exceed either edge");
});

testCase("falls back to edge padding when auto layout lacks reflow capacity", () => {
  const plan = planAutoLayoutExpansion({
    totalExtra: 400,
    safeInset: 60,
    gaps: { start: 160, end: 80 },
    flowChildCount: 1
  });

  assertAlmostEqual(plan.interior, 0, "without flow children there is no spacing to inflate");
  // Single-child layouts use minimum edge padding (safe area only) to allow child to grow
  // With safeInset=60 and gaps exceeding it, edges get the safe area minimum (60 each = 120)
  assertAlmostEqual(plan.start + plan.end, 120, "edges get safe area minimum for single-child layouts");
});

testCase("respects asymmetric safe insets while keeping interior expansion", () => {
  const plan = planAutoLayoutExpansion({
    totalExtra: 700,
    safeInset: { start: 108, end: 320 },
    gaps: { start: 40, end: 120 },
    flowChildCount: 3,
    baseItemSpacing: 24
  });

  assertGreaterThan(plan.end, plan.start, "end inset should remain larger when requested");
  assertGreaterThan(plan.interior, 0, "interior spacing should still receive slack");
});
