import { createQaOverlay } from "../core/qa-overlay.js";
import { VARIANT_TARGETS } from "../types/targets.js";

// Mock Figma globals
const pluginData = new Map<string, string>();

type MockNode = {
  id: string;
  name: string;
  type?: string;
  children: MockNode[];
  x: number;
  y: number;
  width?: number;
  height?: number;
  constraints?: FrameNode["constraints"];
  appendChild(child: MockNode): void;
  resizeWithoutConstraints(w: number, h: number): void;
  setPluginData(key: string, value: string): void;
  getPluginData(key: string): string | undefined;
};

let nodeIdCounter = 0;

function createMockNode(): MockNode {
  const id = `mock-id-${++nodeIdCounter}`;
  return {
    id,
    name: "Mock Node",
    children: [],
    x: 0,
    y: 0,
    constraints: { horizontal: "MIN", vertical: "MIN" },
    appendChild(child: MockNode) {
      this.children.push(child);
    },
    resizeWithoutConstraints(w: number, h: number) {
      this.width = w;
      this.height = h;
    },
    setPluginData(key: string, value: string) {
      pluginData.set(`${id}:${key}`, value);
    },
    getPluginData(key: string) {
      return pluginData.get(`${id}:${key}`);
    }
  };
}

(globalThis as any).figma = {
  createFrame: () => ({ ...createMockNode(), type: "FRAME", children: [] }),
  createRectangle: () => ({ ...createMockNode(), type: "RECTANGLE" }),
};

function assert(condition: boolean, message?: string) {
  if (!condition) {
    throw new Error(message || "Assertion failed");
  }
}

function testCase(name: string, fn: () => void) {
  try {
    fn();
    console.log(`✅ ${name}`);
  } catch (error) {
    console.error(`❌ ${name}`);
    throw error;
  }
}

// Dimension tests
testCase("createQaOverlay generates YouTube safe area", () => {
  const target = VARIANT_TARGETS.find(t => t.id === "youtube-cover");
  if (!target) throw new Error("Target not found");
  const overlay = createQaOverlay(target, 0.1) as unknown as MockNode;

  assert(overlay.children.length === 1, "Should have 1 child (safe area)");
  const safeArea = overlay.children[0];
  assert(safeArea.name === "Text & Logo Safe Area", "Should be named 'Text & Logo Safe Area'");
  assert(safeArea.width === 1546, "Width should be 1546");
  assert(safeArea.height === 423, "Height should be 423");
});

testCase("createQaOverlay generates TikTok safe area", () => {
  const target = VARIANT_TARGETS.find(t => t.id === "tiktok-vertical");
  if (!target) throw new Error("Target not found");
  const overlay = createQaOverlay(target, 0.1) as unknown as MockNode;

  assert(overlay.children.length === 1, "Should have 1 child");
  const safeArea = overlay.children[0];
  assert(safeArea.name === "Content Safe Zone", "Should be named 'Content Safe Zone'");
  // 1080 - 44 - 120 = 916
  assert(safeArea.width === 916, `Width should be 916, got ${safeArea.width}`);
  // 1920 - 108 - 320 = 1492
  assert(safeArea.height === 1492, `Height should be 1492, got ${safeArea.height}`);
});

testCase("createQaOverlay generates generic safe area", () => {
  const target = VARIANT_TARGETS.find(t => t.id === "web-hero"); // 1440 x 600
  if (!target) throw new Error("Target not found");
  const overlay = createQaOverlay(target, 0.1) as unknown as MockNode; // 10%

  assert(overlay.children.length === 1, "Should have 1 child");
  const safeArea = overlay.children[0];
  assert(safeArea.name === "Safe Area", "Should be named 'Safe Area'");

  const insetX = 1440 * 0.1;
  const insetY = 600 * 0.1;
  const expectedWidth = 1440 - insetX * 2;
  const expectedHeight = 600 - insetY * 2;

  assert(Math.abs((safeArea.width || 0) - expectedWidth) < 0.1, `Width should match calculation: ${expectedWidth}`);
  assert(Math.abs((safeArea.height || 0) - expectedHeight) < 0.1, `Height should match calculation: ${expectedHeight}`);
});

// Position tests - verify safe rect is positioned correctly within overlay
testCase("createQaOverlay positions YouTube safe area correctly", () => {
  const target = VARIANT_TARGETS.find(t => t.id === "youtube-cover");
  if (!target) throw new Error("Target not found");
  const overlay = createQaOverlay(target, 0.1) as unknown as MockNode;

  assert(overlay.children.length === 1, "Should have 1 child");
  const safeArea = overlay.children[0];

  // YouTube: 2560x1440, safe area 1546x423 centered
  const expectedX = (2560 - 1546) / 2; // 507
  const expectedY = (1440 - 423) / 2;  // 508.5

  assert(Math.abs(safeArea.x - expectedX) < 0.1,
    `Safe area X should be ${expectedX}, got ${safeArea.x}`);
  assert(Math.abs(safeArea.y - expectedY) < 0.1,
    `Safe area Y should be ${expectedY}, got ${safeArea.y}`);
});

testCase("createQaOverlay positions TikTok safe area correctly", () => {
  const target = VARIANT_TARGETS.find(t => t.id === "tiktok-vertical");
  if (!target) throw new Error("Target not found");
  const overlay = createQaOverlay(target, 0.1) as unknown as MockNode;

  assert(overlay.children.length === 1, "Should have 1 child");
  const safeArea = overlay.children[0];

  // TikTok: left=44, top=108
  assert(safeArea.x === 44, `Safe area X should be 44, got ${safeArea.x}`);
  assert(safeArea.y === 108, `Safe area Y should be 108, got ${safeArea.y}`);
});

testCase("createQaOverlay positions generic safe area correctly", () => {
  const target = VARIANT_TARGETS.find(t => t.id === "web-hero"); // 1440x600
  if (!target) throw new Error("Target not found");
  const overlay = createQaOverlay(target, 0.1) as unknown as MockNode;

  assert(overlay.children.length === 1, "Should have 1 child");
  const safeArea = overlay.children[0];

  // 10% inset: x = 1440 * 0.1 = 144, y = 600 * 0.1 = 60
  const expectedX = 1440 * 0.1;
  const expectedY = 600 * 0.1;

  assert(Math.abs(safeArea.x - expectedX) < 0.1,
    `Safe area X should be ${expectedX}, got ${safeArea.x}`);
  assert(Math.abs(safeArea.y - expectedY) < 0.1,
    `Safe area Y should be ${expectedY}, got ${safeArea.y}`);
});

// Constraint tests
testCase("createQaOverlay applies SCALE constraints to generic targets", () => {
  const target = VARIANT_TARGETS.find(t => t.id === "web-hero");
  if (!target) throw new Error("Target not found");
  const overlay = createQaOverlay(target, 0.1) as unknown as MockNode;
  const safeArea = overlay.children[0];

  assert(safeArea.constraints?.horizontal === "SCALE", "Horizontal constraint should be SCALE");
  assert(safeArea.constraints?.vertical === "SCALE", "Vertical constraint should be SCALE");
});

testCase("createQaOverlay applies CENTER constraints to YouTube", () => {
  const target = VARIANT_TARGETS.find(t => t.id === "youtube-cover");
  if (!target) throw new Error("Target not found");
  const overlay = createQaOverlay(target, 0.1) as unknown as MockNode;
  const safeArea = overlay.children[0];

  assert(safeArea.constraints?.horizontal === "CENTER", "Horizontal constraint should be CENTER");
  assert(safeArea.constraints?.vertical === "CENTER", "Vertical constraint should be CENTER");
});

testCase("createQaOverlay applies STRETCH constraints to TikTok", () => {
  const target = VARIANT_TARGETS.find(t => t.id === "tiktok-vertical");
  if (!target) throw new Error("Target not found");
  const overlay = createQaOverlay(target, 0.1) as unknown as MockNode;
  const safeArea = overlay.children[0];

  assert(safeArea.constraints?.horizontal === "STRETCH", "Horizontal constraint should be STRETCH");
  assert(safeArea.constraints?.vertical === "STRETCH", "Vertical constraint should be STRETCH");
});
