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

testCase("Layout Adapter Config: No arbitrary text width cap", () => {
  const frame = mockFrame({
    children: [mockText()]
  });
  
  // Target: Vertical 1080x1920
  const target = { width: 1080, height: 1920 };
  const scale = 1;
  
  const plan = createLayoutAdaptationPlan(frame, target, "vertical", scale, { 
      adoptVerticalVariant: true 
  });
  
  const childPlan = plan.childAdaptations.get("text1");
  
  // Currently, it sets maxWidth to target.width * 0.8 (864)
  // We want it to be undefined (no cap) or effectively fill-container logic.
  
  // If undefined, it means no explicit max width constraint, which is good.
  assert(
      childPlan?.maxWidth === undefined, 
      `Expected no max width cap on text, got ${childPlan?.maxWidth}`
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