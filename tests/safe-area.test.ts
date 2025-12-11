import { resolveSafeAreaInsets } from "../core/safe-area.js";
import { VARIANT_TARGETS } from "../types/targets.js";

function testCase(name: string, fn: () => void): void {
  try {
    fn();
    console.log(`✅ ${name}`);
  } catch (error) {
    console.error(`❌ ${name}`);
    throw error;
  }
}

function assertEqual(actual: number, expected: number, message: string): void {
  if (actual !== expected) {
    throw new Error(`${message}\nExpected: ${expected}\nReceived: ${actual}`);
  }
}

function getTarget(id: string) {
  const target = VARIANT_TARGETS.find(t => t.id === id);
  if (!target) {
    throw new Error(`Target ${id} not found`);
  }
  return target;
}

testCase("resolveSafeAreaInsets returns TikTok-specific chrome insets", () => {
  const target = getTarget("tiktok-vertical");
  const insets = resolveSafeAreaInsets(target, 0.08);
  assertEqual(insets.left, 44, "TikTok left inset should match chrome allowance");
  assertEqual(insets.right, 120, "TikTok right inset should match chrome allowance");
  assertEqual(insets.top, 108, "TikTok top inset should match chrome allowance");
  assertEqual(insets.bottom, 320, "TikTok bottom inset should match chrome allowance");
});

testCase("resolveSafeAreaInsets falls back to ratio for generic targets", () => {
  const target = getTarget("web-hero");
  const insets = resolveSafeAreaInsets(target, 0.1);
  assertEqual(insets.left, target.width * 0.1, "Left inset should use ratio");
  assertEqual(insets.right, target.width * 0.1, "Right inset should use ratio");
  assertEqual(insets.top, target.height * 0.1, "Top inset should use ratio");
  assertEqual(insets.bottom, target.height * 0.1, "Bottom inset should use ratio");
});
