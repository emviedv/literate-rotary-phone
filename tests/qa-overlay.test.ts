import { configureQaOverlay } from "../core/qa-overlay.js";

type OverlayStub = {
  x: number;
  y: number;
  layoutPositioning?: "AUTO" | "ABSOLUTE";
  constraints?: FrameNode["constraints"];
  locked?: boolean;
};

function createOverlayStub(): OverlayStub {
  return {
    x: 10,
    y: 20,
    layoutPositioning: "AUTO",
    constraints: {
      horizontal: "MIN",
      vertical: "MIN"
    }
  };
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

testCase("applies stretch constraints even when parent lacks auto layout", () => {
  const overlay = createOverlayStub();
  const result = configureQaOverlay(overlay, { parentLayoutMode: "NONE" });

  assertEqual(result.positioningUpdated, true, "positioning change should be recorded due to constraints");
  assertEqual(overlay.layoutPositioning, "AUTO", "overlay should remain in AUTO positioning inside static parents");
  assertEqual(overlay.constraints?.horizontal, "STRETCH", "overlay constraints should expand horizontally");
  assertEqual(overlay.constraints?.vertical, "STRETCH", "overlay constraints should expand vertically");
});

testCase("resets coordinates to 0,0 after setting absolute positioning", () => {
  const overlay = createOverlayStub();
  // Simulate overlay being "in flow" at a specific position
  overlay.x = 100;
  overlay.y = 200;
  
  const result = configureQaOverlay(overlay, { parentLayoutMode: "HORIZONTAL" });

  assertEqual(result.positioningUpdated, true, "positioning change should be recorded");
  assertEqual(overlay.layoutPositioning, "ABSOLUTE", "overlay should become absolute");
  assertEqual(overlay.x, 0, "overlay X should be reset to 0");
  assertEqual(overlay.y, 0, "overlay Y should be reset to 0");
});

testCase("respects custom constraints provided in options", () => {
  const overlay = createOverlayStub();
  const customConstraints: FrameNode["constraints"] = {
    horizontal: "STRETCH",
    vertical: "MIN"
  };
  
  const result = configureQaOverlay(overlay, { 
    parentLayoutMode: "VERTICAL",
    constraints: customConstraints
  });

  assertEqual(result.positioningUpdated, true, "positioning change should be recorded");
  assertEqual(overlay.constraints?.horizontal, "STRETCH", "horizontal constraint should match custom value");
  assertEqual(overlay.constraints?.vertical, "MIN", "vertical constraint should match custom value");
});
