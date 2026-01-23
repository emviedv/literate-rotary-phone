/**
 * Characterization Tests for applyNodeSpec() behavior
 *
 * Documents the current behavior of spec application logic including:
 * - Atomic child handling (skip ALL modifications)
 * - Atomic instance handling (skip size only)
 * - Visibility handling
 * - Position with auto-layout awareness
 * - Size with aspect ratio preservation for images
 * - Scale factor application
 * - Text truncation
 */

import {
  assert,
  testCase,
  assertEqual,
  resetNodeCounter,
  createFrameNode,
  createTextNode,
  createRectangleNode,
  createImageFill,
  type StubSceneNode,
  type StubTextNode,
  type StubRectangleNode,
  type StubFrameNode,
} from "../fixtures/figma-stubs.js";

// ============================================================================
// Constants (matching design-executor.ts)
// ============================================================================

const POSITION_CHANGE_THRESHOLD = 10;
const MIN_EDGE_PADDING = 40;
const CONSTRAINTS = { WIDTH: 1080, HEIGHT: 1920 };

// ============================================================================
// NodeSpec Type
// ============================================================================

interface NodeSpec {
  nodeId: string;
  nodeName: string;
  visible: boolean;
  position?: { x: number; y: number };
  size?: { width: number; height: number };
  zIndex?: number;
  textTruncate?: boolean;
  maxLines?: number;
  scaleFactor?: number;
}

// ============================================================================
// Simplified applyNodeSpec for testing
// ============================================================================

function shouldBreakAutoLayout(
  node: { x: number; y: number },
  targetPos: { x: number; y: number }
): boolean {
  const dx = Math.abs(node.x - targetPos.x);
  const dy = Math.abs(node.y - targetPos.y);
  return dx > POSITION_CHANGE_THRESHOLD || dy > POSITION_CHANGE_THRESHOLD;
}

function hasImageFill(node: StubSceneNode): boolean {
  if (!("fills" in node)) return false;
  const fills = (node as StubRectangleNode).fills;
  return fills?.some((f) => f.type === "IMAGE") ?? false;
}

/**
 * Simulates applyNodeSpec behavior for characterization testing.
 * Returns object describing what was applied.
 */
function applyNodeSpec(
  node: StubSceneNode,
  spec: NodeSpec,
  isAtomicChild: boolean = false,
  isAtomicInstance: boolean = false
): { skipped: string[]; applied: string[] } {
  const skipped: string[] = [];
  const applied: string[] = [];

  // CRITICAL: Skip ALL modifications for atomic group children
  if (isAtomicChild) {
    skipped.push("all (atomic child)");
    return { skipped, applied };
  }

  // Handle visibility
  if (!spec.visible) {
    node.visible = false;
    applied.push("visibility=false");
    return { skipped, applied };
  }

  node.visible = true;
  applied.push("visibility=true");

  // Apply position
  if (spec.position) {
    // Check if parent is auto-layout
    const parentIsAutoLayout =
      node.parent &&
      "layoutMode" in node.parent &&
      (node.parent as StubFrameNode).layoutMode !== "NONE";

    if (parentIsAutoLayout) {
      skipped.push("position (parent is auto-layout)");
    } else {
      const needsRepositioning = shouldBreakAutoLayout(
        { x: node.x, y: node.y },
        spec.position
      );

      if (needsRepositioning) {
        // Break out of auto-layout
        if ("layoutPositioning" in node && node.layoutPositioning === "AUTO") {
          (node as StubFrameNode).layoutPositioning = "ABSOLUTE";
          applied.push("layoutPositioning=ABSOLUTE");
        }

        // Apply position (with edge padding for text)
        let targetX = spec.position.x;
        if (node.type === "TEXT" && "width" in node) {
          const textWidth = (node as StubTextNode).width;
          const maxX = CONSTRAINTS.WIDTH - MIN_EDGE_PADDING - textWidth;

          if (targetX < MIN_EDGE_PADDING) {
            targetX = MIN_EDGE_PADDING;
            applied.push("edge-padding-left");
          } else if (targetX > maxX && maxX > MIN_EDGE_PADDING) {
            targetX = maxX;
            applied.push("edge-padding-right");
          }
        }

        node.x = targetX;
        node.y = spec.position.y;
        applied.push(`position(${targetX}, ${spec.position.y})`);
      } else {
        skipped.push("position (delta < threshold)");
      }
    }
  }

  // Apply size - SKIP for atomic instances
  if (spec.size && "resize" in node) {
    if (isAtomicInstance) {
      skipped.push("size (atomic instance)");
    } else {
      const isImage = hasImageFill(node);

      let targetWidth = spec.size.width;
      let targetHeight = spec.size.height;

      if (isImage && "width" in node && "height" in node) {
        // Preserve aspect ratio for images
        const frameNode = node as StubFrameNode;
        const scaleByWidth = spec.size.width / frameNode.width;
        const scaleByHeight = spec.size.height / frameNode.height;
        const scale = Math.max(scaleByWidth, scaleByHeight);

        targetWidth = frameNode.width * scale;
        targetHeight = frameNode.height * scale;
        applied.push(`size-with-aspect(${targetWidth}, ${targetHeight})`);
      } else {
        applied.push(`size(${targetWidth}, ${targetHeight})`);
      }

      (node as StubFrameNode).resize(targetWidth, targetHeight);
    }
  }

  // Apply scale factor - SKIP for atomic instances
  if (spec.scaleFactor && spec.scaleFactor !== 1.0 && !spec.size) {
    if (isAtomicInstance) {
      skipped.push("scaleFactor (atomic instance)");
    } else if ("width" in node && "height" in node && "resize" in node) {
      const frameNode = node as StubFrameNode;
      const newWidth = frameNode.width * spec.scaleFactor;
      const newHeight = frameNode.height * spec.scaleFactor;
      frameNode.resize(newWidth, newHeight);
      applied.push(`scaleFactor(${spec.scaleFactor})`);
    }
  }

  // Handle text truncation
  if (node.type === "TEXT" && spec.textTruncate) {
    const textNode = node as unknown as StubTextNode;
    textNode.textTruncation = "ENDING";
    textNode.maxLines = spec.maxLines ?? 1;
    applied.push(`textTruncation(${spec.maxLines ?? 1})`);
  }

  return { skipped, applied };
}

// ============================================================================
// Atomic Child Tests
// ============================================================================

testCase("applyNodeSpec: SKIPS ALL modifications for atomic group children", () => {
  resetNodeCounter();

  const node = createRectangleNode({
    id: "child-1",
    name: "Screen",
    x: 10,
    y: 20,
    width: 100,
    height: 200,
    visible: true,
  });

  const spec: NodeSpec = {
    nodeId: "child-1",
    nodeName: "Screen",
    visible: true,
    position: { x: 500, y: 600 },
    size: { width: 200, height: 400 },
    scaleFactor: 2.0,
  };

  const result = applyNodeSpec(node as unknown as StubSceneNode, spec, true, false);

  // Node should be unchanged
  assertEqual(node.x, 10, "X should be unchanged");
  assertEqual(node.y, 20, "Y should be unchanged");
  assertEqual(node.width, 100, "Width should be unchanged");
  assertEqual(node.height, 200, "Height should be unchanged");
  assert(result.skipped.includes("all (atomic child)"), "Should skip all");
});

// ============================================================================
// Visibility Tests
// ============================================================================

testCase("applyNodeSpec: sets visible=false and returns early when spec.visible=false", () => {
  resetNodeCounter();

  const node = createRectangleNode({
    id: "rect-1",
    visible: true,
    x: 100,
    y: 100,
  });

  const spec: NodeSpec = {
    nodeId: "rect-1",
    nodeName: "Rect",
    visible: false,
    position: { x: 500, y: 600 }, // Should be ignored
    size: { width: 200, height: 200 }, // Should be ignored
  };

  const result = applyNodeSpec(node as unknown as StubSceneNode, spec, false, false);

  assertEqual(node.visible, false, "Should be hidden");
  assertEqual(node.x, 100, "Position should be unchanged");
  assert(result.applied.includes("visibility=false"), "Should apply visibility");
  assert(!result.applied.some((a) => a.startsWith("position")), "Should not apply position");
});

testCase("applyNodeSpec: sets visible=true for visible specs", () => {
  resetNodeCounter();

  const node = createRectangleNode({
    id: "rect-1",
    visible: false, // Start hidden
  });

  const spec: NodeSpec = {
    nodeId: "rect-1",
    nodeName: "Rect",
    visible: true,
  };

  applyNodeSpec(node as unknown as StubSceneNode, spec, false, false);

  assertEqual(node.visible, true, "Should be visible");
});

// ============================================================================
// Position Tests
// ============================================================================

testCase("applyNodeSpec: SKIPS position when parent is auto-layout", () => {
  resetNodeCounter();

  const parent = createFrameNode({
    id: "parent",
    layoutMode: "VERTICAL", // Auto-layout enabled
  });

  const child = createRectangleNode({
    id: "child",
    x: 10,
    y: 20,
  });
  child.parent = parent as unknown as StubSceneNode;

  const spec: NodeSpec = {
    nodeId: "child",
    nodeName: "Child",
    visible: true,
    position: { x: 500, y: 600 },
  };

  const result = applyNodeSpec(child as unknown as StubSceneNode, spec, false, false);

  assertEqual(child.x, 10, "X should be unchanged");
  assertEqual(child.y, 20, "Y should be unchanged");
  assert(result.skipped.includes("position (parent is auto-layout)"), "Should skip for auto-layout");
});

testCase("applyNodeSpec: SKIPS position when delta < POSITION_CHANGE_THRESHOLD", () => {
  resetNodeCounter();

  const node = createRectangleNode({
    id: "rect",
    x: 100,
    y: 200,
  });

  const spec: NodeSpec = {
    nodeId: "rect",
    nodeName: "Rect",
    visible: true,
    position: { x: 105, y: 205 }, // Within 10px threshold
  };

  const result = applyNodeSpec(node as unknown as StubSceneNode, spec, false, false);

  assertEqual(node.x, 100, "X should be unchanged");
  assertEqual(node.y, 200, "Y should be unchanged");
  assert(result.skipped.includes("position (delta < threshold)"), "Should skip small moves");
});

testCase("applyNodeSpec: breaks layoutPositioning to ABSOLUTE for significant moves", () => {
  resetNodeCounter();

  const node = createRectangleNode({
    id: "rect",
    x: 100,
    y: 200,
    layoutPositioning: "AUTO",
  });

  const spec: NodeSpec = {
    nodeId: "rect",
    nodeName: "Rect",
    visible: true,
    position: { x: 500, y: 600 }, // Beyond threshold
  };

  applyNodeSpec(node as unknown as StubSceneNode, spec, false, false);

  assertEqual(node.layoutPositioning, "ABSOLUTE", "Should break to absolute");
  assertEqual(node.x, 500, "X should be updated");
  assertEqual(node.y, 600, "Y should be updated");
});

// ============================================================================
// Size Tests
// ============================================================================

testCase("applyNodeSpec: SKIPS size changes for atomic instances", () => {
  resetNodeCounter();

  const node = createRectangleNode({
    id: "instance",
    width: 100,
    height: 200,
  });

  const spec: NodeSpec = {
    nodeId: "instance",
    nodeName: "Instance",
    visible: true,
    size: { width: 300, height: 400 },
  };

  const result = applyNodeSpec(node as unknown as StubSceneNode, spec, false, true);

  assertEqual(node.width, 100, "Width should be unchanged");
  assertEqual(node.height, 200, "Height should be unchanged");
  assert(result.skipped.includes("size (atomic instance)"), "Should skip size for atomic instance");
});

testCase("applyNodeSpec: preserves aspect ratio for nodes with image fills", () => {
  resetNodeCounter();

  // 100x200 image (aspect ratio 0.5)
  const node = createRectangleNode({
    id: "image",
    width: 100,
    height: 200,
    fills: [createImageFill()],
  });

  // Request 400x300 (aspect ratio 1.33)
  const spec: NodeSpec = {
    nodeId: "image",
    nodeName: "Image",
    visible: true,
    size: { width: 400, height: 300 },
  };

  applyNodeSpec(node as unknown as StubSceneNode, spec, false, false);

  // Scale = max(400/100, 300/200) = max(4, 1.5) = 4
  // Result: 100*4 = 400, 200*4 = 800
  assertEqual(node.width, 400, "Width should be scaled");
  assertEqual(node.height, 800, "Height should preserve aspect ratio");
});

testCase("applyNodeSpec: applies exact size for non-image nodes", () => {
  resetNodeCounter();

  const node = createRectangleNode({
    id: "rect",
    width: 100,
    height: 200,
    fills: [], // No image
  });

  const spec: NodeSpec = {
    nodeId: "rect",
    nodeName: "Rect",
    visible: true,
    size: { width: 300, height: 400 },
  };

  applyNodeSpec(node as unknown as StubSceneNode, spec, false, false);

  assertEqual(node.width, 300, "Width should be exact");
  assertEqual(node.height, 400, "Height should be exact");
});

// ============================================================================
// Scale Factor Tests
// ============================================================================

testCase("applyNodeSpec: applies scaleFactor when size not specified", () => {
  resetNodeCounter();

  const node = createRectangleNode({
    id: "rect",
    width: 100,
    height: 50,
  });

  const spec: NodeSpec = {
    nodeId: "rect",
    nodeName: "Rect",
    visible: true,
    scaleFactor: 2.0, // Double the size
  };

  applyNodeSpec(node as unknown as StubSceneNode, spec, false, false);

  assertEqual(node.width, 200, "Width should be doubled");
  assertEqual(node.height, 100, "Height should be doubled");
});

testCase("applyNodeSpec: SKIPS scaleFactor for atomic instances", () => {
  resetNodeCounter();

  const node = createRectangleNode({
    id: "instance",
    width: 100,
    height: 50,
  });

  const spec: NodeSpec = {
    nodeId: "instance",
    nodeName: "Instance",
    visible: true,
    scaleFactor: 3.0,
  };

  const result = applyNodeSpec(node as unknown as StubSceneNode, spec, false, true);

  assertEqual(node.width, 100, "Width should be unchanged");
  assertEqual(node.height, 50, "Height should be unchanged");
  assert(result.skipped.includes("scaleFactor (atomic instance)"), "Should skip scaleFactor");
});

testCase("applyNodeSpec: ignores scaleFactor=1.0 (no change)", () => {
  resetNodeCounter();

  const node = createRectangleNode({
    id: "rect",
    width: 100,
    height: 50,
  });

  const spec: NodeSpec = {
    nodeId: "rect",
    nodeName: "Rect",
    visible: true,
    scaleFactor: 1.0,
  };

  const result = applyNodeSpec(node as unknown as StubSceneNode, spec, false, false);

  assertEqual(node.width, 100, "Width should be unchanged");
  assert(!result.applied.some((a) => a.includes("scaleFactor")), "Should not apply 1.0 scale");
});

// ============================================================================
// Text Truncation Tests
// ============================================================================

testCase("applyNodeSpec: applies text truncation with textTruncate=true", () => {
  resetNodeCounter();

  const node = createTextNode({
    id: "text",
    characters: "Long text content that might need truncation",
  });

  const spec: NodeSpec = {
    nodeId: "text",
    nodeName: "Text",
    visible: true,
    textTruncate: true,
    maxLines: 2,
  };

  applyNodeSpec(node as unknown as StubSceneNode, spec, false, false);

  assertEqual(node.textTruncation, "ENDING", "Should set truncation mode");
  assertEqual(node.maxLines, 2, "Should set maxLines");
});

testCase("applyNodeSpec: defaults maxLines to 1 when not specified", () => {
  resetNodeCounter();

  const node = createTextNode({ id: "text" });

  const spec: NodeSpec = {
    nodeId: "text",
    nodeName: "Text",
    visible: true,
    textTruncate: true,
    // maxLines not specified
  };

  applyNodeSpec(node as unknown as StubSceneNode, spec, false, false);

  assertEqual(node.maxLines, 1, "Should default to 1 line");
});

// ============================================================================
// Edge Padding Tests
// ============================================================================

testCase("applyNodeSpec: enforces MIN_EDGE_PADDING for text at left edge", () => {
  resetNodeCounter();

  const node = createTextNode({
    id: "text",
    x: 100,
    y: 100,
    width: 200,
  });

  const spec: NodeSpec = {
    nodeId: "text",
    nodeName: "Text",
    visible: true,
    position: { x: 10, y: 500 }, // Too close to left edge (< 40)
  };

  const result = applyNodeSpec(node as unknown as StubSceneNode, spec, false, false);

  assertEqual(node.x, MIN_EDGE_PADDING, "X should be clamped to MIN_EDGE_PADDING");
  assert(result.applied.includes("edge-padding-left"), "Should apply left padding");
});

testCase("applyNodeSpec: enforces MIN_EDGE_PADDING for text at right edge", () => {
  resetNodeCounter();

  const textWidth = 200;
  const node = createTextNode({
    id: "text",
    x: 100,
    y: 100,
    width: textWidth,
  });

  // maxX = 1080 - 40 - 200 = 840
  const spec: NodeSpec = {
    nodeId: "text",
    nodeName: "Text",
    visible: true,
    position: { x: 900, y: 500 }, // Too close to right edge (900 > 840)
  };

  const result = applyNodeSpec(node as unknown as StubSceneNode, spec, false, false);

  const expectedX = CONSTRAINTS.WIDTH - MIN_EDGE_PADDING - textWidth; // 840
  assertEqual(node.x, expectedX, "X should be clamped to prevent overflow");
  assert(result.applied.includes("edge-padding-right"), "Should apply right padding");
});

// ============================================================================
// Summary
// ============================================================================

console.log("\n✅ All design-spec-applier characterization tests passed!");
