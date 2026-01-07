import { createQaOverlay } from "../core/qa-overlay.js";
import { VariantTarget } from "../types/targets.js";

// Mock figma global
// @ts-ignore
global.figma = {
  createFrame: () => {
    const children: any[] = [];
    return {
        resizeWithoutConstraints: () => {},
        setPluginData: () => {},
        appendChild: (child: any) => children.push(child),
        fills: [],
        strokes: [],
        children,
        constraints: { horizontal: "SCALE", vertical: "SCALE" } // Default
    };
  },
  createRectangle: () => ({
    resizeWithoutConstraints: () => {},
    setPluginData: () => {},
    fills: [],
    strokes: [],
    constraints: {}
  }),
} as any;

const GENERIC_VERTICAL_TARGET: VariantTarget = {
  id: "generic-shorts",
  label: "Generic Shorts",
  description: "Vertical Video Format",
  width: 1080,
  height: 1920
};

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

testCase("Vertical Generalization: Generic vertical target gets STRETCH constraints", () => {
  // This test expects behavior currently only hardcoded for "tiktok-vertical"
  const overlay = createQaOverlay(GENERIC_VERTICAL_TARGET, 0.1);
  
  const safeArea = overlay.children[0] as unknown as RectangleNode;

  // Currently defaults to SCALE
  assert(
    safeArea.constraints?.horizontal === "STRETCH" && safeArea.constraints?.vertical === "STRETCH",
    `Expected STRETCH constraints for vertical video target, got ${JSON.stringify(safeArea.constraints)}`
  );
});

testCase("Vertical Generalization: Generic vertical target gets correct label", () => {
    // We inspect the name of the child rectangle (Safe Area visual)
    const overlay = createQaOverlay(GENERIC_VERTICAL_TARGET, 0.1);
    
    // @ts-ignore - mock structure
    const safeAreaRect = overlay.children?.[0] as any; 
    
    // Currently defaults to "Safe Area"
    // We want "Content Safe Zone" or similar for all vertical video formats
    assert(
        safeAreaRect?.name === "Content Safe Zone", 
        `Expected 'Content Safe Zone' label, got '${safeAreaRect?.name}'`
    );
});