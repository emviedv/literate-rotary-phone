/**
 * Tests for auto-layout-adapter configuration behavior.
 *
 * FREESTYLE POSITIONING MODE:
 * Child adaptations have been removed - AI positioning maps handle per-node decisions.
 * Tests now focus on frame-level layout configuration (padding, spacing).
 */

import { createLayoutAdaptationPlan } from "../core/auto-layout-adapter.js";

// Mock Figma nodes
const mockFrame = (props: any = {}) => ({
  type: "FRAME",
  id: "frame1",
  name: "Frame",
  layoutMode: "HORIZONTAL",
  width: 1000,
  height: 500,
  children: [],
  paddingTop: 20,
  paddingRight: 20,
  paddingBottom: 20,
  paddingLeft: 20,
  itemSpacing: 10,
  visible: true,
  ...props
} as any);

const mockText = (props: any = {}) => ({
  type: "TEXT",
  id: "text1",
  name: "Text",
  width: 200,
  height: 50,
  visible: true,
  ...props
} as any);

function assert(condition: boolean, message: string): void {
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

// ============================================================================
// FREESTYLE MODE: Frame-level configuration tests (childAdaptations removed)
// ============================================================================

testCase("FREESTYLE: plan has no childAdaptations field", () => {
  const frame = mockFrame({
    children: [mockText()]
  });

  const target = { width: 1080, height: 1920 };
  const scale = 1;

  const plan = createLayoutAdaptationPlan(frame, target, "vertical", scale, {
      adoptVerticalVariant: true
  });

  // FREESTYLE mode removes childAdaptations - AI positioning handles per-node decisions
  assert(
      !("childAdaptations" in plan),
      "FREESTYLE mode should not have childAdaptations"
  );
});

testCase("Layout Adapter Config: No arbitrary padding boost", () => {
  const frame = mockFrame({
     paddingTop: 100,
     paddingBottom: 100,
     height: 1000 // Source height
  });

  // Target: Vertical, much taller than source (creates "extra space")
  const target = { width: 1080, height: 2000 };
  const scale = 1;

  // Source 1000 -> Target 2000. Extra space = 1000.
  // Current logic adds 10% of extra space?
  // Code: (target.height - source.height * scale) * 0.1 => (2000 - 1000)*0.1 = 100 extra.
  // So expected top padding = 100 (base) + 100 (boost) = 200.

  const plan = createLayoutAdaptationPlan(frame, target, "vertical", scale, {
      adoptVerticalVariant: true
  });

  // We want EXACT scaling of padding (100 * scale = 100).
  assert(
      plan.paddingAdjustments.top === 100,
      `Expected padding to be 100, got ${plan.paddingAdjustments.top}`
  );
});

testCase("Layout Adapter Config: Padding scales with scale factor", () => {
  const frame = mockFrame({
     paddingTop: 20,
     paddingBottom: 20,
     paddingLeft: 30,
     paddingRight: 30
  });

  const target = { width: 1920, height: 960 };
  const scale = 2; // Double scale

  const plan = createLayoutAdaptationPlan(frame, target, "horizontal", scale);

  // Padding should scale proportionally
  assert(
      plan.paddingAdjustments.top >= 0,
      `Padding top should be non-negative, got ${plan.paddingAdjustments.top}`
  );
  assert(
      plan.paddingAdjustments.left >= 0,
      `Padding left should be non-negative, got ${plan.paddingAdjustments.left}`
  );
});

console.log("\n✅ All layout adapter config tests passed\n");
