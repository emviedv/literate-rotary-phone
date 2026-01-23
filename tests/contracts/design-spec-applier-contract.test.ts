/**
 * Contract Tests for design-spec-applier module
 *
 * Defines the interface contract that the extracted module must satisfy.
 */

import {
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
// Contract Types
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

/**
 * Contract interface that the design-spec-applier module must implement.
 */
interface SpecApplierContract {
  /**
   * Applies a single node specification to a Figma node.
   * @param node - The node to modify
   * @param spec - The specification to apply
   * @param isAtomicChild - If true, skip ALL modifications
   * @param isAtomicInstance - If true, skip size/scale changes only
   */
  applyNodeSpec(
    node: StubSceneNode,
    spec: NodeSpec,
    isAtomicChild: boolean,
    isAtomicInstance: boolean
  ): void;

  /**
   * Applies text truncation settings to a text node.
   * @param textNode - The text node to truncate
   * @param maxLines - Maximum number of lines
   */
  applyTextTruncation(textNode: StubTextNode, maxLines: number): void;
}

// ============================================================================
// Implementation Constants
// ============================================================================

const POSITION_CHANGE_THRESHOLD = 10;
const MIN_EDGE_PADDING = 40;
const CONSTRAINTS = { WIDTH: 1080, HEIGHT: 1920 };

// ============================================================================
// Implementation (will be replaced by import after extraction)
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
  const fills = (node as StubRectangleNode).fills as readonly Paint[];
  return fills?.some((f: Paint) => f.type === "IMAGE") ?? false;
}

function applyNodeSpec(
  node: StubSceneNode,
  spec: NodeSpec,
  isAtomicChild: boolean = false,
  isAtomicInstance: boolean = false
): void {
  // Skip ALL modifications for atomic group children
  if (isAtomicChild) {
    return;
  }

  // Handle visibility
  if (!spec.visible) {
    node.visible = false;
    return;
  }

  node.visible = true;

  // Apply position
  if (spec.position) {
    const parentIsAutoLayout =
      node.parent &&
      "layoutMode" in node.parent &&
      (node.parent as StubFrameNode).layoutMode !== "NONE";

    if (!parentIsAutoLayout) {
      const needsRepositioning = shouldBreakAutoLayout(
        { x: node.x, y: node.y },
        spec.position
      );

      if (needsRepositioning) {
        if ("layoutPositioning" in node && node.layoutPositioning === "AUTO") {
          (node as StubFrameNode).layoutPositioning = "ABSOLUTE";
        }

        let targetX = spec.position.x;
        if (node.type === "TEXT" && "width" in node) {
          const textWidth = (node as StubTextNode).width;
          const maxX = CONSTRAINTS.WIDTH - MIN_EDGE_PADDING - textWidth;

          if (targetX < MIN_EDGE_PADDING) {
            targetX = MIN_EDGE_PADDING;
          } else if (targetX > maxX && maxX > MIN_EDGE_PADDING) {
            targetX = maxX;
          }
        }

        node.x = targetX;
        node.y = spec.position.y;
      }
    }
  }

  // Apply size - SKIP for atomic instances
  if (spec.size && "resize" in node) {
    if (!isAtomicInstance) {
      const isImage = hasImageFill(node);

      let targetWidth = spec.size.width;
      let targetHeight = spec.size.height;

      if (isImage && "width" in node && "height" in node) {
        const frameNode = node as StubFrameNode;
        const scaleByWidth = spec.size.width / frameNode.width;
        const scaleByHeight = spec.size.height / frameNode.height;
        const scale = Math.max(scaleByWidth, scaleByHeight);

        targetWidth = frameNode.width * scale;
        targetHeight = frameNode.height * scale;
      }

      (node as StubFrameNode).resize(targetWidth, targetHeight);
    }
  }

  // Apply scale factor - SKIP for atomic instances
  if (spec.scaleFactor && spec.scaleFactor !== 1.0 && !spec.size) {
    if (!isAtomicInstance && "width" in node && "height" in node && "resize" in node) {
      const frameNode = node as StubFrameNode;
      const newWidth = frameNode.width * spec.scaleFactor;
      const newHeight = frameNode.height * spec.scaleFactor;
      frameNode.resize(newWidth, newHeight);
    }
  }

  // Handle text truncation
  if (node.type === "TEXT" && spec.textTruncate) {
    applyTextTruncation(node as unknown as StubTextNode, spec.maxLines ?? 1);
  }
}

function applyTextTruncation(textNode: StubTextNode, maxLines: number): void {
  textNode.textTruncation = "ENDING";
  textNode.maxLines = maxLines;
}

// Create service instance conforming to contract
const specApplierService: SpecApplierContract = {
  applyNodeSpec,
  applyTextTruncation,
};

// ============================================================================
// Contract Tests
// ============================================================================

testCase("CONTRACT: applyNodeSpec respects isAtomicChild flag (no-op)", () => {
  resetNodeCounter();

  const node = createRectangleNode({
    id: "child",
    x: 10,
    y: 20,
    width: 100,
    height: 200,
    visible: true,
  });

  const spec: NodeSpec = {
    nodeId: "child",
    nodeName: "Child",
    visible: true,
    position: { x: 500, y: 600 },
    size: { width: 300, height: 400 },
    scaleFactor: 2.0,
  };

  specApplierService.applyNodeSpec(node as unknown as StubSceneNode, spec, true, false);

  // Everything should be unchanged
  assertEqual(node.x, 10, "X should be unchanged");
  assertEqual(node.y, 20, "Y should be unchanged");
  assertEqual(node.width, 100, "Width should be unchanged");
  assertEqual(node.height, 200, "Height should be unchanged");
});

testCase("CONTRACT: applyNodeSpec respects isAtomicInstance flag (skips size only)", () => {
  resetNodeCounter();

  const node = createRectangleNode({
    id: "instance",
    x: 10,
    y: 20,
    width: 100,
    height: 200,
  });

  const spec: NodeSpec = {
    nodeId: "instance",
    nodeName: "Instance",
    visible: true,
    position: { x: 500, y: 600 }, // Should be applied
    size: { width: 300, height: 400 }, // Should be skipped
  };

  specApplierService.applyNodeSpec(node as unknown as StubSceneNode, spec, false, true);

  // Position should change, size should not
  assertEqual(node.x, 500, "X should change");
  assertEqual(node.y, 600, "Y should change");
  assertEqual(node.width, 100, "Width should be unchanged (atomic instance)");
  assertEqual(node.height, 200, "Height should be unchanged (atomic instance)");
});

testCase("CONTRACT: applyNodeSpec applies position with threshold check", () => {
  resetNodeCounter();

  // Test case 1: Small move (within threshold) - no change
  const node1 = createRectangleNode({ id: "n1", x: 100, y: 200 });
  specApplierService.applyNodeSpec(
    node1 as unknown as StubSceneNode,
    { nodeId: "n1", nodeName: "N1", visible: true, position: { x: 105, y: 205 } },
    false,
    false
  );
  assertEqual(node1.x, 100, "Small X move should be skipped");
  assertEqual(node1.y, 200, "Small Y move should be skipped");

  // Test case 2: Large move (beyond threshold) - applied
  const node2 = createRectangleNode({ id: "n2", x: 100, y: 200 });
  specApplierService.applyNodeSpec(
    node2 as unknown as StubSceneNode,
    { nodeId: "n2", nodeName: "N2", visible: true, position: { x: 500, y: 600 } },
    false,
    false
  );
  assertEqual(node2.x, 500, "Large X move should be applied");
  assertEqual(node2.y, 600, "Large Y move should be applied");
});

testCase("CONTRACT: applyNodeSpec preserves image aspect ratio", () => {
  resetNodeCounter();

  // 100x200 image (aspect ratio 0.5)
  const node = createRectangleNode({
    id: "image",
    width: 100,
    height: 200,
    fills: [createImageFill()],
  });

  const spec: NodeSpec = {
    nodeId: "image",
    nodeName: "Image",
    visible: true,
    size: { width: 400, height: 300 }, // Different aspect ratio
  };

  specApplierService.applyNodeSpec(node as unknown as StubSceneNode, spec, false, false);

  // Scale = max(400/100, 300/200) = max(4, 1.5) = 4
  assertEqual(node.width, 400, "Width should be scaled");
  assertEqual(node.height, 800, "Height should preserve aspect ratio");
});

testCase("CONTRACT: applyTextTruncation sets textTruncation=ENDING and maxLines", () => {
  resetNodeCounter();

  const node = createTextNode({ id: "text" });

  specApplierService.applyTextTruncation(node, 3);

  assertEqual(node.textTruncation, "ENDING", "Should set truncation mode");
  assertEqual(node.maxLines, 3, "Should set maxLines");
});

testCase("CONTRACT: applyNodeSpec handles visibility=false early return", () => {
  resetNodeCounter();

  const node = createRectangleNode({
    id: "rect",
    visible: true,
    x: 100,
    y: 200,
    width: 50,
    height: 60,
  });

  const spec: NodeSpec = {
    nodeId: "rect",
    nodeName: "Rect",
    visible: false,
    position: { x: 500, y: 600 }, // Should be ignored
    size: { width: 200, height: 300 }, // Should be ignored
  };

  specApplierService.applyNodeSpec(node as unknown as StubSceneNode, spec, false, false);

  assertEqual(node.visible, false, "Should be hidden");
  assertEqual(node.x, 100, "Position should be unchanged");
  assertEqual(node.width, 50, "Size should be unchanged");
});

testCase("CONTRACT: applyNodeSpec skips position for auto-layout children", () => {
  resetNodeCounter();

  const parent = createFrameNode({
    id: "parent",
    layoutMode: "VERTICAL",
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

  specApplierService.applyNodeSpec(child as unknown as StubSceneNode, spec, false, false);

  assertEqual(child.x, 10, "X should be unchanged for auto-layout child");
  assertEqual(child.y, 20, "Y should be unchanged for auto-layout child");
});

// ============================================================================
// Summary
// ============================================================================

console.log("\n✅ All design-spec-applier contract tests passed!");
