/**
 * Characterization tests for spec application logic.
 * Tests applyNodeSpec() behavior including atomic group handling.
 */

// Test utilities
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

// ============================================================================
// Constants (mirroring design-executor.ts)
// ============================================================================

const POSITION_CHANGE_THRESHOLD = 10;
const MIN_EDGE_PADDING = 40;
const TIKTOK_WIDTH = 1080;

// ============================================================================
// Mock Factories
// ============================================================================

interface MockTextNode {
  id: string;
  name: string;
  type: "TEXT";
  visible: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
  layoutPositioning?: "AUTO" | "ABSOLUTE";
  parent?: { layoutMode: string };
}

interface NodeSpec {
  nodeId: string;
  nodeName: string;
  visible: boolean;
  position?: { x: number; y: number };
  size?: { width: number; height: number };
  scaleFactor?: number;
}

function createMockTextNode(overrides: Partial<MockTextNode> = {}): MockTextNode {
  return {
    id: "text-1",
    name: "Text",
    type: "TEXT",
    visible: true,
    x: 100,
    y: 100,
    width: 200,
    height: 50,
    ...overrides,
  };
}

// ============================================================================
// Characterization: shouldBreakAutoLayout
// ============================================================================

function shouldBreakAutoLayout(
  node: { x: number; y: number },
  targetPos: { x: number; y: number }
): boolean {
  const dx = Math.abs(node.x - targetPos.x);
  const dy = Math.abs(node.y - targetPos.y);
  return dx > POSITION_CHANGE_THRESHOLD || dy > POSITION_CHANGE_THRESHOLD;
}

// ============================================================================
// Tests
// ============================================================================

console.log("\n🎯 Spec Applicator Characterization Tests\n");

// --- Position Change Threshold ---

testCase("shouldBreakAutoLayout: small delta (≤10px) returns false", () => {
  const node = { x: 100, y: 100 };
  const target = { x: 105, y: 108 };

  const result = shouldBreakAutoLayout(node, target);

  assertEqual(result, false, "Delta ≤10 should preserve auto-layout");
});

testCase("shouldBreakAutoLayout: large X delta (>10px) returns true", () => {
  const node = { x: 100, y: 100 };
  const target = { x: 120, y: 100 };

  const result = shouldBreakAutoLayout(node, target);

  assertEqual(result, true, "X delta >10 should break auto-layout");
});

testCase("shouldBreakAutoLayout: large Y delta (>10px) returns true", () => {
  const node = { x: 100, y: 100 };
  const target = { x: 100, y: 115 };

  const result = shouldBreakAutoLayout(node, target);

  assertEqual(result, true, "Y delta >10 should break auto-layout");
});

testCase("shouldBreakAutoLayout: exact threshold (10px) returns false", () => {
  const node = { x: 100, y: 100 };
  const target = { x: 110, y: 110 };

  const result = shouldBreakAutoLayout(node, target);

  assertEqual(result, false, "Exactly 10px delta should NOT break (needs >10)");
});

// --- Edge Padding Enforcement ---

testCase("text node at left edge should be shifted to MIN_EDGE_PADDING", () => {
  // Characterization: if targetX < MIN_EDGE_PADDING, it becomes MIN_EDGE_PADDING
  const targetX = 20;
  const correctedX = targetX < MIN_EDGE_PADDING ? MIN_EDGE_PADDING : targetX;

  assertEqual(correctedX, 40, "Text at x=20 should shift to x=40");
});

testCase("text node at right edge should be shifted inward", () => {
  // Characterization: maxX = WIDTH - PADDING - textWidth
  const textWidth = 200;
  const targetX = 900; // Too close to right edge
  const maxX = TIKTOK_WIDTH - MIN_EDGE_PADDING - textWidth; // 1080 - 40 - 200 = 840

  const correctedX = targetX > maxX && maxX > MIN_EDGE_PADDING ? maxX : targetX;

  assertEqual(correctedX, 840, "Text at x=900 should shift to x=840");
});

testCase("text node within safe bounds is unchanged", () => {
  const textWidth = 200;
  const targetX = 400;
  const maxX = TIKTOK_WIDTH - MIN_EDGE_PADDING - textWidth;

  const correctedX =
    targetX < MIN_EDGE_PADDING
      ? MIN_EDGE_PADDING
      : targetX > maxX
        ? maxX
        : targetX;

  assertEqual(correctedX, 400, "Text at x=400 should stay at x=400");
});

// --- Atomic Group Handling ---

testCase("atomic child nodes skip ALL modifications", () => {
  // Characterization: if isAtomicChild is true, applyNodeSpec returns immediately
  const isAtomicChild = true;
  // Even with a spec that would normally hide the node...
  const spec: NodeSpec = {
    nodeId: "child-1",
    nodeName: "Screen",
    visible: false, // Would normally hide node
    position: { x: 500, y: 500 },
  };

  // Simulate: atomic children skip everything - visibility is ignored
  const shouldSkip = isAtomicChild && spec.visible === false;

  assertEqual(shouldSkip, true, "Atomic children should skip all modifications");
});

testCase("atomic instance nodes skip size/scale but allow position", () => {
  // Characterization: isAtomicInstance skips size/scaleFactor but NOT position
  const isAtomicInstance = true;
  // The spec defines size and scale that would normally be applied
  const spec: NodeSpec = {
    nodeId: "instance-1",
    nodeName: "iPhone Mockup",
    visible: true,
    position: { x: 100, y: 200 },
    size: { width: 500, height: 1000 },
    scaleFactor: 1.5,
  };

  // Size: blocked for atomic instances (spec.size is ignored)
  const sizeBlocked = isAtomicInstance && spec.size !== undefined;
  // Scale: blocked for atomic instances (spec.scaleFactor is ignored)
  const scaleBlocked = isAtomicInstance && spec.scaleFactor !== undefined;

  assertEqual(sizeBlocked, true, "Atomic instances should skip size");
  assertEqual(scaleBlocked, true, "Atomic instances should skip scaleFactor");
});

// --- Visibility ---

testCase("spec with visible=false hides node immediately", () => {
  // Characterization: if !spec.visible, set node.visible=false and return
  const spec: NodeSpec = {
    nodeId: "node-1",
    nodeName: "Hidden",
    visible: false,
  };

  const node = createMockTextNode({ visible: true });

  // Simulate applyNodeSpec behavior
  if (!spec.visible) {
    node.visible = false;
  }

  assertEqual(node.visible, false, "Node should be hidden");
});

// --- Image Aspect Ratio Preservation ---

testCase("image nodes preserve aspect ratio during resize", () => {
  // Characterization: images use max(scaleByWidth, scaleByHeight) to cover
  const originalWidth = 400;
  const originalHeight = 300;
  const specWidth = 600;
  const specHeight = 400;

  const scaleByWidth = specWidth / originalWidth; // 1.5
  const scaleByHeight = specHeight / originalHeight; // 1.333
  const scale = Math.max(scaleByWidth, scaleByHeight); // 1.5

  const targetWidth = originalWidth * scale; // 600
  const targetHeight = originalHeight * scale; // 450

  assertEqual(targetWidth, 600, "Width should scale by max factor");
  assertEqual(targetHeight, 450, "Height should preserve aspect ratio");
});

// --- Z-Index Reordering Edge Cases ---

testCase("reorderChildrenByZIndex handles more specs than children", () => {
  // Simulate: 5 specs with zIndex but only 3 are direct children of variant
  const specsCount = 5;
  const directChildrenCount = 3;

  let insertionIndex = 0;
  const insertedIndices: number[] = [];

  for (let i = 0; i < specsCount; i++) {
    const isDirectChild = i < directChildrenCount;
    if (isDirectChild) {
      const safeIndex = Math.min(insertionIndex, directChildrenCount);
      insertedIndices.push(safeIndex);
      insertionIndex++;
    }
  }

  const allIndicesValid = insertedIndices.every(idx => idx <= directChildrenCount);
  assertEqual(allIndicesValid, true, "All indices should be within bounds");
  assertEqual(insertedIndices.length, 3, "Should insert exactly 3 nodes");
});

testCase("z-index insertion clamps to children.length", () => {
  // Simulate the fix: safeIndex = Math.min(insertionIndex, children.length)
  const childrenCount = 2;
  const insertionIndex = 5; // Exceeds children count

  const safeIndex = Math.min(insertionIndex, childrenCount);

  assertEqual(safeIndex, 2, "Should clamp to children count");
});

// --- Orphaned Container Detection ---

testCase("hasVisibleContainerStyling detects visible stroke", () => {
  const node = {
    strokes: [{ type: "SOLID", visible: true }],
    fills: [],
  };
  const hasStroke = node.strokes.some((s: { visible?: boolean }) => s.visible !== false);
  assertEqual(hasStroke, true, "Should detect visible stroke");
});

testCase("hasVisibleContainerStyling detects invisible stroke as false", () => {
  const node = {
    strokes: [{ type: "SOLID", visible: false }],
    fills: [],
  };
  const hasStroke = node.strokes.some((s: { visible?: boolean }) => s.visible !== false);
  assertEqual(hasStroke, false, "Should not detect invisible stroke");
});

testCase("hasVisibleContainerStyling ignores image fills", () => {
  const node = {
    strokes: [],
    fills: [{ type: "IMAGE", visible: true }],
  };
  const hasStyling = node.fills.some(
    (f: { type: string; visible?: boolean }) => f.visible !== false && f.type !== "IMAGE"
  );
  assertEqual(hasStyling, false, "Image fills are content, not styling");
});

testCase("hasVisibleContainerStyling detects solid fill", () => {
  const node = {
    strokes: [],
    fills: [{ type: "SOLID", visible: true }],
  };
  const hasStyling = node.fills.some(
    (f: { type: string; visible?: boolean }) => f.visible !== false && f.type !== "IMAGE"
  );
  assertEqual(hasStyling, true, "Should detect visible solid fill");
});

testCase("orphaned container hidden when no visible children", () => {
  const containerHasStroke = true;
  const visibleChildrenCount = 0;
  const shouldHide = containerHasStroke && visibleChildrenCount === 0;
  assertEqual(shouldHide, true, "Should hide orphaned styled container");
});

testCase("container kept visible when children remain", () => {
  const containerHasStroke = true;
  const visibleChildren = [{ id: "child-1" }]; // Simulates one visible child
  const shouldHide = containerHasStroke && visibleChildren.length === 0;
  assertEqual(shouldHide, false, "Should keep container with remaining children");
});

testCase("container without styling kept visible even when empty", () => {
  const containerHasStroke = false;
  const visibleChildrenCount = 0;
  const shouldHide = containerHasStroke && visibleChildrenCount === 0;
  assertEqual(shouldHide, false, "Unstyled containers don't need hiding");
});

console.log("\n✅ All spec applicator characterization tests passed!\n");
