import { createQaOverlay } from "../core/qa-overlay.js";
import { VARIANT_TARGETS } from "../types/targets.js";

// Mock Figma globals
const pluginData = new Map<string, string>();

type MockNode = {
  id: string;
  name: string;
  type?: string;
  children: MockNode[];
  width?: number;
  height?: number;
  appendChild(child: MockNode): void;
  resizeWithoutConstraints(w: number, h: number): void;
  setPluginData(key: string, value: string): void;
  getPluginData(key: string): string | undefined;
};

const mockNode: MockNode = {
  id: "mock-id",
  name: "Mock Node",
  children: [],
  appendChild(child: MockNode) {
    this.children.push(child);
  },
  resizeWithoutConstraints(w: number, h: number) {
    this.width = w;
    this.height = h;
  },
  setPluginData(key: string, value: string) {
    pluginData.set(key, value);
  },
  getPluginData(key: string) {
    return pluginData.get(key);
  }
};

(globalThis as any).figma = {
  createFrame: () => ({ ...mockNode, type: "FRAME", children: [] }),
  createRectangle: () => ({ ...mockNode, type: "RECTANGLE" }),
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
