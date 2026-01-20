import { normalizeContentMargins, resolveLayoutProfile } from "../core/margin-normalization.js";

/**
 * Mocking global debugFixLog for tests
 */
(globalThis as any).debugFixLog = () => {};

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

const standardMargins = { left: 40, right: 40, top: 20, bottom: 20 };
const asymmetricMargins = { left: 100, right: 10, top: 20, bottom: 20 };

testCase("resolveLayoutProfile classifies correctly", () => {
  assert(resolveLayoutProfile({ width: 1920, height: 1080 }) === "horizontal", "1920x1080 should be horizontal");
  assert(resolveLayoutProfile({ width: 1080, height: 1920 }) === "vertical", "1080x1920 should be vertical");
  assert(resolveLayoutProfile({ width: 1000, height: 1000 }) === "square", "1000x1000 should be square");
});

testCase("preserves margins for minor aspect ratio changes", () => {
  const margins = { ...standardMargins };
  const normalized = normalizeContentMargins(
    margins,
    "horizontal",
    "horizontal",
    1.77, // 16:9
    1.6   // 16:10
  );
  assert(normalized?.left === margins.left, "left margin should be preserved");
  assert(normalized?.right === margins.right, "right margin should be preserved");
});

testCase("normalizes asymmetric horizontal margins for vertical targets", () => {
  const margins = { ...asymmetricMargins };
  const normalized = normalizeContentMargins(
    margins,
    "horizontal",
    "vertical",
    1.77, // 16:9
    0.56  // 9:16
  );

  assert(normalized !== null, "normalized margins should not be null");
  if (normalized) {
    assert(normalized.left < margins.left, "left margin should be reduced");
    assert(normalized.right > margins.right, "right margin should be increased");
    // Expected blend: 100 * 0.25 + 55 * 0.75 = 66.25
    assert(Math.abs(normalized.left - 66.25) < 0.1, `left margin should be around 66.25, got ${normalized.left}`);
  }
});

testCase("normalizes vertical margins with bottom bias for vertical targets", () => {
  const margins = { left: 20, right: 20, top: 100, bottom: 10 }; // High top margin
  const normalized = normalizeContentMargins(
    margins,
    "horizontal",
    "vertical",
    1.77, // 16:9
    0.56  // 9:16
  );

  assert(normalized !== null, "normalized margins should not be null");
  if (normalized) {
    assert(normalized.top < margins.top, "top margin should be reduced");
    assert(normalized.bottom > margins.bottom, "bottom margin should be increased");
    assert(normalized.bottom > normalized.top, "bottom margin should be larger than top margin for vertical targets");
  }
});

testCase("handles null margins gracefully", () => {
  const normalized = normalizeContentMargins(null, "horizontal", "vertical", 1.77, 0.56);
  assert(normalized === null, "should return null for null input");
});