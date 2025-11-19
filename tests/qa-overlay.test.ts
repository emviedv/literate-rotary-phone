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

testCase("leaves overlay in-flow when parent lacks auto layout", () => {
  const overlay = createOverlayStub();
  const result = configureQaOverlay(overlay, { parentLayoutMode: "NONE" });

  assertEqual(result.positioningUpdated, false, "no positioning change should be recorded");
  assertEqual(overlay.layoutPositioning, "AUTO", "overlay should remain in AUTO positioning inside static parents");
});

testCase("detaches overlay for auto layout parents", () => {
  const overlay = createOverlayStub();
  const result = configureQaOverlay(overlay, { parentLayoutMode: "HORIZONTAL" });

  assertEqual(result.positioningUpdated, true, "positioning change should be reported");
  assertEqual(overlay.layoutPositioning, "ABSOLUTE", "overlay should become absolute inside auto layout parents");
  assertEqual(overlay.constraints?.horizontal, "STRETCH", "overlay constraints should expand horizontally");
  assertEqual(overlay.constraints?.vertical, "STRETCH", "overlay constraints should expand vertically");
});
