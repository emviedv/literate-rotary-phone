// Mock globals
const pluginData = new Map<string, string>();

(globalThis as any).figma = {
  createFrame: () => ({ type: "FRAME", children: [] }),
  createRectangle: () => ({ type: "RECTANGLE" }),
  showUI: () => {}, // Add showUI mock
  on: () => {},
  ui: { onmessage: () => {} }
};

import { AiSignals } from "../types/ai-signals.js";

declare const process: { exit: (code: number) => void };

// Lazy import to ensure globals are set
let combineChildBounds: any;

async function loadModule() {
  if (combineChildBounds) return;
  const main = await import("../core/main.js");
  combineChildBounds = main.combineChildBounds;
}

type MockNode = {
  id: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  absoluteBoundingBox: { x: number; y: number; width: number; height: number };
  children: MockNode[];
  getPluginData: (key: string) => string | undefined;
  setPluginData: (key: string, val: string) => void;
};

function createMockNode(id: string, x: number, y: number, width: number, height: number, type = "RECTANGLE"): MockNode {
  return {
    id,
    type,
    x, y, width, height,
    absoluteBoundingBox: { x, y, width, height },
    children: [],
    getPluginData: (key: string) => pluginData.get(`${id}-${key}`),
    setPluginData: (key: string, val: string) => pluginData.set(`${id}-${key}`, val)
  };
}

function testCase(name: string, fn: () => Promise<void>) {
  // Wrap execution to catch async errors if needed, though run-tests awaits node execution
  fn().then(() => console.log(`✅ ${name}`)).catch(error => {
    console.error(`❌ ${name}`);
    console.error(error);
    process.exit(1);
  });
}

function assert(condition: boolean, message?: string) {
  if (!condition) {
    throw new Error(message || "Assertion failed");
  }
}

testCase("combineChildBounds excludes nodes that fill the frame (geometric heuristic)", async () => {
  await loadModule();
  const frame = createMockNode("frame", 0, 0, 1000, 1000, "FRAME");
  const bg = createMockNode("bg", 0, 0, 1000, 1000); // 100% size -> Should be excluded
  const content = createMockNode("content", 100, 100, 100, 100);
  
  frame.children = [bg, content];
  
  const bounds = combineChildBounds(frame as unknown as FrameNode);
  
  if (!bounds) throw new Error("Bounds should not be null");
  assert(bounds.x === 100, `Expected x=100 (bg excluded), got ${bounds.x}`);
  assert(bounds.width === 100, `Expected width=100, got ${bounds.width}`);
});

testCase("combineChildBounds excludes nodes with ignored roles (even if small)", async () => {
  await loadModule();
  const frame = createMockNode("frame", 0, 0, 1000, 1000, "FRAME");
  const decorative = createMockNode("deco", 0, 0, 100, 100); // Small, but decorative role
  const content = createMockNode("content", 200, 200, 100, 100);
  
  frame.children = [decorative, content];
  
  const aiSignals: AiSignals = {
    roles: [
      { nodeId: "deco", role: "container", confidence: 0.9 }
    ],
    focalPoints: [],
    qa: []
  };
  
  const bounds = combineChildBounds(frame as unknown as FrameNode, aiSignals);
  
  if (!bounds) throw new Error("Bounds should not be null");
  assert(bounds.x === 200, `Expected x=200 (deco excluded), got ${bounds.x}`);
});
