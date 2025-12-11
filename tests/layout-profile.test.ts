import {
  resolveLayoutProfile,
  shouldAdoptVerticalFlow,
  computeVerticalSpacing,
  resolveVerticalAlignItems,
  resolveVerticalLayoutWrap,
  shouldExpandAbsoluteChildren
} from "../core/layout-profile.js";

type LayoutMode = "NONE" | "HORIZONTAL" | "VERTICAL";

type SnapshotStub = {
  readonly layoutMode: LayoutMode;
  readonly flowChildCount: number;
};

function testCase(name: string, fn: () => void): void {
  try {
    fn();
    console.log(`✅ ${name}`);
  } catch (error) {
    console.error(`❌ ${name}`);
    throw error;
  }
}

function assertEqual<T>(actual: T, expected: T, message: string): void {
  if (actual !== expected) {
    throw new Error(`${message}\nExpected: ${expected}\nReceived: ${actual}`);
  }
}

function makeSnapshot(layoutMode: LayoutMode, flowChildCount: number): SnapshotStub {
  return { layoutMode, flowChildCount };
}

testCase("resolveLayoutProfile detects vertical targets", () => {
  const profile = resolveLayoutProfile({ width: 1080, height: 1920 });
  assertEqual(profile, "vertical", "1080×1920 should classify as vertical.");
});

testCase("resolveLayoutProfile treats near-square targets as square", () => {
  const profile = resolveLayoutProfile({ width: 1080, height: 1150 });
  assertEqual(profile, "square", "Targets with similar width/height should classify as square.");
});

testCase("shouldAdoptVerticalFlow switches horizontal auto layout for tall targets", () => {
  const adopt = shouldAdoptVerticalFlow("vertical", makeSnapshot("HORIZONTAL", 3));
  assertEqual(adopt, true, "Horizontal layout with 3 flow children should switch in vertical profile.");
});

testCase("shouldAdoptVerticalFlow also rotates single-child horizontal stacks to vertical", () => {
  const adopt = shouldAdoptVerticalFlow("vertical", makeSnapshot("HORIZONTAL", 1));
  assertEqual(adopt, true, "Single child should still rotate to vertical for tall targets.");
});

testCase("shouldAdoptVerticalFlow maintains vertical layout for vertical targets", () => {
  const adopt = shouldAdoptVerticalFlow("vertical", makeSnapshot("VERTICAL", 3));
  assertEqual(adopt, true, "Vertical layout should be maintained when target is vertical.");
});

testCase("shouldAdoptVerticalFlow maintains vertical layout even with single child", () => {
  const adopt = shouldAdoptVerticalFlow("vertical", makeSnapshot("VERTICAL", 1));
  assertEqual(adopt, true, "Vertical layout should be maintained regardless of child count.");
});

testCase("computeVerticalSpacing distributes interior space across gaps", () => {
  const spacing = computeVerticalSpacing({
    baseSpacing: 24,
    interior: 180,
    flowChildCount: 4
  });
  assertEqual(spacing, 84, "Interior space should add evenly across three gaps.");
});

testCase("resolveVerticalAlignItems anchors stacks to the top when previously centered", () => {
  const align = resolveVerticalAlignItems("CENTER", { interior: 120 });
  assertEqual(align, "MIN", "Centered horizontal stacks should top-align when switching to vertical.");
});

testCase("resolveVerticalAlignItems collapses space-between when extra interior remains", () => {
  const align = resolveVerticalAlignItems("SPACE_BETWEEN", { interior: 180 });
  assertEqual(align, "MIN", "Space-between should collapse to top alignment for tall variants.");
});

testCase("resolveVerticalAlignItems keeps space-between when no extra interior exists", () => {
  const align = resolveVerticalAlignItems("SPACE_BETWEEN", { interior: 0 });
  assertEqual(align, "SPACE_BETWEEN", "Without interior slack designer intent should remain.");
});

testCase("resolveVerticalLayoutWrap disables wrapping by default", () => {
  const wrap = resolveVerticalLayoutWrap("WRAP");
  assertEqual(wrap, "NO_WRAP", "Vertical variants should avoid multi-column wrapping.");
});

testCase("resolveVerticalLayoutWrap preserves NO_WRAP", () => {
  const wrap = resolveVerticalLayoutWrap("NO_WRAP");
  assertEqual(wrap, "NO_WRAP", "Existing no-wrap configuration stays unchanged.");
});

testCase("shouldExpandAbsoluteChildren returns true when adopting vertical variant", () => {
  const result = shouldExpandAbsoluteChildren("HORIZONTAL", true, "vertical");
  assertEqual(result, true, "Adopting vertical variant should expand absolute children.");
});

testCase("shouldExpandAbsoluteChildren only expands non-auto layouts otherwise", () => {
  const adopt = shouldExpandAbsoluteChildren("HORIZONTAL", false, "square");
  const none = shouldExpandAbsoluteChildren("NONE", false, "square");
  assertEqual(adopt, false, "Horizontal layouts without vertical adoption should not expand.");
  assertEqual(none, true, "Root frames without auto layout still expand absolute children.");
});

testCase("shouldExpandAbsoluteChildren expands horizontal layouts for vertical targets", () => {
  const result = shouldExpandAbsoluteChildren("HORIZONTAL", false, "vertical");
  assertEqual(result, true, "Horizontal auto-layouts with absolute children should still expand for vertical targets.");
});
