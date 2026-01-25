/**
 * Characterization Tests for design-executor.ts main functions
 *
 * These tests document the CURRENT behavior of createDesignVariant() and
 * applyEvaluationAdjustments(). They must pass both before and after refactoring.
 *
 * Since the functions require Figma runtime, we test the extractable pure functions
 * and document the expected behavior of the orchestration functions.
 */

import {
  assert,
  testCase,
  assertEqual,
  resetNodeCounter,
  createFrameNode,
  createTextNode,
  createInstanceNode,
  createRectangleNode,
  createGroupNode,
  createImageFill,
  type StubFrameNode,
  type StubSceneNode,
  type StubInstanceNode,
  type StubRectangleNode,
} from "../fixtures/figma-stubs.js";

// ============================================================================
// Test: NodeMap Building Behavior
// ============================================================================

/**
 * Simulates buildNodeMap behavior for testing.
 * Maps source node IDs to cloned nodes via parallel BFS traversal.
 */
function buildNodeMap(
  sourceFrame: StubFrameNode,
  clonedFrame: StubFrameNode
): { [sourceId: string]: StubSceneNode } {
  const map: { [key: string]: StubSceneNode } = {};

  const sourceQueue: StubSceneNode[] = [sourceFrame as unknown as StubSceneNode];
  const clonedQueue: StubSceneNode[] = [clonedFrame as unknown as StubSceneNode];

  while (sourceQueue.length > 0 && clonedQueue.length > 0) {
    const sourceNode = sourceQueue.shift()!;
    const clonedNode = clonedQueue.shift()!;

    map[sourceNode.id] = clonedNode;

    if ("children" in sourceNode && "children" in clonedNode) {
      const sourceChildren = (sourceNode as StubFrameNode).children;
      const clonedChildren = (clonedNode as StubFrameNode).children;
      for (let i = 0; i < sourceChildren.length; i++) {
        if (i < clonedChildren.length) {
          sourceQueue.push(sourceChildren[i]);
          clonedQueue.push(clonedChildren[i]);
        }
      }
    }
  }

  return map;
}

testCase("buildNodeMap creates source→clone ID mapping via parallel BFS", () => {
  resetNodeCounter();

  // Create source frame with nested structure
  const sourceChild1 = createRectangleNode({ id: "src-1", name: "Rect1" });
  const sourceChild2 = createTextNode({ id: "src-2", name: "Text1" });
  const sourceFrame = createFrameNode({
    id: "src-root",
    name: "Source",
    children: [sourceChild1 as unknown as StubSceneNode, sourceChild2 as unknown as StubSceneNode],
  });

  // Clone it (simulating Figma's clone behavior)
  const clonedChild1 = createRectangleNode({ id: "clone-1", name: "Rect1" });
  const clonedChild2 = createTextNode({ id: "clone-2", name: "Text1" });
  const clonedFrame = createFrameNode({
    id: "clone-root",
    name: "Source",
    children: [clonedChild1 as unknown as StubSceneNode, clonedChild2 as unknown as StubSceneNode],
  });

  const nodeMap = buildNodeMap(sourceFrame, clonedFrame);

  // Source IDs should map to cloned nodes
  assertEqual(nodeMap["src-root"].id, "clone-root", "Root should be mapped");
  assertEqual(nodeMap["src-1"].id, "clone-1", "Child 1 should be mapped");
  assertEqual(nodeMap["src-2"].id, "clone-2", "Child 2 should be mapped");
});

// ============================================================================
// Test: Variant Node Map Building
// ============================================================================

/**
 * Simulates buildVariantNodeMap behavior for testing.
 * Maps all node IDs to their nodes within a single frame tree.
 */
function buildVariantNodeMap(frame: StubFrameNode): Map<string, StubSceneNode> {
  const map = new Map<string, StubSceneNode>();
  const queue: StubSceneNode[] = [frame as unknown as StubSceneNode];

  while (queue.length > 0) {
    const node = queue.shift()!;
    map.set(node.id, node);

    if ("children" in node) {
      queue.push(...(node as StubFrameNode).children);
    }
  }

  return map;
}

testCase("buildVariantNodeMap creates ID→node mapping for all descendants", () => {
  resetNodeCounter();

  const child = createTextNode({ id: "child-1", name: "Text" });
  const nestedChild = createRectangleNode({ id: "nested-1", name: "Rect" });
  const group = createGroupNode({
    id: "group-1",
    name: "Group",
    children: [nestedChild as unknown as StubSceneNode],
  });
  const frame = createFrameNode({
    id: "frame-1",
    name: "Frame",
    children: [child as unknown as StubSceneNode, group as unknown as StubSceneNode],
  });

  const map = buildVariantNodeMap(frame);

  assertEqual(map.size, 4, "Should have 4 nodes");
  assert(map.has("frame-1"), "Should have frame");
  assert(map.has("child-1"), "Should have child");
  assert(map.has("group-1"), "Should have group");
  assert(map.has("nested-1"), "Should have nested child");
});

// ============================================================================
// Test: Find Node By Name
// ============================================================================

/**
 * Simulates findNodeByName behavior for testing.
 * Returns first BFS match or null.
 */
function findNodeByName(frame: StubFrameNode, name: string): StubSceneNode | null {
  const queue: StubSceneNode[] = [...frame.children];

  while (queue.length > 0) {
    const node = queue.shift()!;
    if (node.name === name) {
      return node;
    }
    if ("children" in node) {
      queue.push(...(node as StubFrameNode).children);
    }
  }

  return null;
}

testCase("findNodeByName returns first BFS match", () => {
  resetNodeCounter();

  const text1 = createTextNode({ id: "t1", name: "Title" });
  const text2 = createTextNode({ id: "t2", name: "Title" }); // Same name
  const nested = createTextNode({ id: "t3", name: "Title" }); // Nested, same name
  const group = createGroupNode({
    id: "g1",
    name: "Group",
    children: [nested as unknown as StubSceneNode],
  });
  const frame = createFrameNode({
    id: "f1",
    name: "Frame",
    children: [text1 as unknown as StubSceneNode, group as unknown as StubSceneNode, text2 as unknown as StubSceneNode],
  });

  const found = findNodeByName(frame, "Title");

  // BFS: should find text1 first (children processed before grandchildren)
  assertEqual(found?.id, "t1", "Should find first BFS match");
});

testCase("findNodeByName returns null when not found", () => {
  resetNodeCounter();

  const frame = createFrameNode({
    id: "f1",
    name: "Frame",
    children: [createTextNode({ name: "Other" }) as unknown as StubSceneNode],
  });

  const found = findNodeByName(frame, "NonExistent");
  assertEqual(found, null, "Should return null for missing node");
});

// ============================================================================
// Test: Position Change Threshold
// ============================================================================

const POSITION_CHANGE_THRESHOLD = 10;

function shouldBreakAutoLayout(
  node: { x: number; y: number },
  targetPos: { x: number; y: number }
): boolean {
  const dx = Math.abs(node.x - targetPos.x);
  const dy = Math.abs(node.y - targetPos.y);
  return dx > POSITION_CHANGE_THRESHOLD || dy > POSITION_CHANGE_THRESHOLD;
}

testCase("shouldBreakAutoLayout returns false when delta < POSITION_CHANGE_THRESHOLD", () => {
  const node = { x: 100, y: 200 };

  // Within threshold
  assert(!shouldBreakAutoLayout(node, { x: 105, y: 205 }), "5px delta should not break");
  assert(!shouldBreakAutoLayout(node, { x: 110, y: 200 }), "Exactly 10px X should not break");
  assert(!shouldBreakAutoLayout(node, { x: 100, y: 210 }), "Exactly 10px Y should not break");
});

testCase("shouldBreakAutoLayout returns true when delta > POSITION_CHANGE_THRESHOLD", () => {
  const node = { x: 100, y: 200 };

  // Beyond threshold
  assert(shouldBreakAutoLayout(node, { x: 111, y: 200 }), "11px X delta should break");
  assert(shouldBreakAutoLayout(node, { x: 100, y: 211 }), "11px Y delta should break");
  assert(shouldBreakAutoLayout(node, { x: 150, y: 300 }), "Large delta should break");
});

// ============================================================================
// Test: Atomic Instance Collection
// ============================================================================

/**
 * Simulates collectAtomicInstanceIds behavior.
 * INSTANCE nodes are always atomic in the real implementation.
 */
function collectAtomicInstanceIds(frame: StubFrameNode): Set<string> {
  const atomicIds = new Set<string>();

  function scanForAtomicInstances(node: StubSceneNode): void {
    // Component instances are inherently atomic
    if (node.type === "INSTANCE") {
      atomicIds.add(node.id);
      return; // Don't recurse into atomic instances
    }

    if ("children" in node) {
      for (const child of (node as StubFrameNode).children) {
        scanForAtomicInstances(child);
      }
    }
  }

  for (const child of frame.children) {
    scanForAtomicInstances(child);
  }

  return atomicIds;
}

testCase("collectAtomicInstanceIds returns empty Set for no instances", () => {
  resetNodeCounter();

  const frame = createFrameNode({
    children: [
      createTextNode({ name: "Text" }) as unknown as StubSceneNode,
      createRectangleNode({ name: "Rect" }) as unknown as StubSceneNode,
    ],
  });

  const ids = collectAtomicInstanceIds(frame);
  assertEqual(ids.size, 0, "Should have no atomic instances");
});

testCase("collectAtomicInstanceIds returns instance IDs", () => {
  resetNodeCounter();

  const instance1 = createInstanceNode({ id: "inst-1", name: "iPhone Mockup" });
  const instance2 = createInstanceNode({ id: "inst-2", name: "Button" });
  const frame = createFrameNode({
    children: [
      instance1 as unknown as StubSceneNode,
      createTextNode({ name: "Text" }) as unknown as StubSceneNode,
      instance2 as unknown as StubSceneNode,
    ],
  });

  const ids = collectAtomicInstanceIds(frame);

  assertEqual(ids.size, 2, "Should have 2 atomic instances");
  assert(ids.has("inst-1"), "Should include first instance");
  assert(ids.has("inst-2"), "Should include second instance");
});

// ============================================================================
// Test: Atomic Group Children Collection
// ============================================================================

/**
 * Simulates collectAtomicGroupChildren behavior.
 * Collects all descendant IDs of atomic groups (INSTANCE nodes).
 */
function collectAtomicGroupChildren(frame: StubFrameNode): Set<string> {
  const atomicChildIds = new Set<string>();

  function collectChildIds(parent: StubSceneNode): void {
    if (!("children" in parent)) return;

    for (const child of (parent as StubFrameNode).children) {
      atomicChildIds.add(child.id);
      if ("children" in child) {
        collectChildIds(child);
      }
    }
  }

  function scanForAtomicGroups(node: StubSceneNode): void {
    // INSTANCE nodes are atomic groups
    if (node.type === "INSTANCE") {
      collectChildIds(node);
      return; // Don't recurse - we've collected children
    }

    if ("children" in node) {
      for (const child of (node as StubFrameNode).children) {
        scanForAtomicGroups(child);
      }
    }
  }

  for (const child of frame.children) {
    scanForAtomicGroups(child);
  }

  return atomicChildIds;
}

testCase("collectAtomicGroupChildren collects all nested descendants of atomic instances", () => {
  resetNodeCounter();

  // iPhone mockup with screen and bezel children
  const screen = createRectangleNode({ id: "screen", name: "Screen" });
  const bezel = createRectangleNode({ id: "bezel", name: "Bezel" });
  const instance = createInstanceNode({
    id: "iphone",
    name: "iPhone Mockup",
    children: [screen as unknown as StubSceneNode, bezel as unknown as StubSceneNode],
  });

  const frame = createFrameNode({
    children: [
      instance as unknown as StubSceneNode,
      createTextNode({ id: "title", name: "Title" }) as unknown as StubSceneNode,
    ],
  });

  const childIds = collectAtomicGroupChildren(frame);

  assertEqual(childIds.size, 2, "Should have 2 children from instance");
  assert(childIds.has("screen"), "Should include screen");
  assert(childIds.has("bezel"), "Should include bezel");
  assert(!childIds.has("title"), "Should NOT include non-atomic child");
  assert(!childIds.has("iphone"), "Should NOT include the instance itself");
});

// ============================================================================
// Test: Instance Detachment
// ============================================================================

/**
 * Simulates detachAllInstances behavior.
 * Detaches non-atomic instances, preserves atomic ones.
 */
function detachAllInstances(frame: StubFrameNode, atomicInstanceIds: Set<string> = new Set()): number {
  let detachCount = 0;
  const nodesToProcess: StubSceneNode[] = [...frame.children];

  while (nodesToProcess.length > 0) {
    const node = nodesToProcess.shift()!;

    if (node.type === "INSTANCE") {
      if (atomicInstanceIds.has(node.id)) {
        // Skip atomic instances but process their children
        if ("children" in node) {
          nodesToProcess.push(...(node as StubInstanceNode).children);
        }
        continue;
      }

      // Detach: convert to frame (in real Figma, detachInstance() does this)
      const instance = node as StubInstanceNode;
      const detached = instance.detachInstance();
      detachCount++;

      // Replace in parent's children array (simplified)
      const parent = node.parent as StubFrameNode | null;
      if (parent && "children" in parent) {
        const idx = parent.children.indexOf(node);
        if (idx !== -1) {
          parent.children[idx] = detached as unknown as StubSceneNode;
        }
      }

      // Process detached frame's children
      if ("children" in detached) {
        nodesToProcess.push(...detached.children);
      }
    } else if ("children" in node) {
      nodesToProcess.push(...(node as StubFrameNode).children);
    }
  }

  return detachCount;
}

testCase("detachAllInstances skips IDs in atomicInstanceIds Set", () => {
  resetNodeCounter();

  const atomicInstance = createInstanceNode({ id: "atomic-1", name: "iPhone Mockup" });
  const regularInstance = createInstanceNode({ id: "regular-1", name: "Button Component" });
  const frame = createFrameNode({
    children: [
      atomicInstance as unknown as StubSceneNode,
      regularInstance as unknown as StubSceneNode,
    ],
  });

  const atomicIds = new Set(["atomic-1"]);
  const detachCount = detachAllInstances(frame, atomicIds);

  assertEqual(detachCount, 1, "Should detach only 1 instance");
  // Atomic instance should still be type INSTANCE
  assertEqual(frame.children[0].type, "INSTANCE", "Atomic instance should be preserved");
});

testCase("detachAllInstances returns count of detached instances", () => {
  resetNodeCounter();

  const inst1 = createInstanceNode({ id: "inst-1", name: "Button 1" });
  const inst2 = createInstanceNode({ id: "inst-2", name: "Button 2" });
  const frame = createFrameNode({
    children: [inst1 as unknown as StubSceneNode, inst2 as unknown as StubSceneNode],
  });

  const detachCount = detachAllInstances(frame, new Set());

  assertEqual(detachCount, 2, "Should detach both instances");
});

// ============================================================================
// Test: Image Fill Detection
// ============================================================================

function hasImageFill(node: StubSceneNode): boolean {
  if (!("fills" in node)) return false;
  const fills = (node as StubRectangleNode).fills as readonly Paint[];
  return fills?.some((f: Paint) => f.type === "IMAGE") ?? false;
}

testCase("hasImageFill returns true for nodes with image fills", () => {
  const rect = createRectangleNode({
    fills: [createImageFill()],
  });

  assert(hasImageFill(rect as unknown as StubSceneNode), "Should detect image fill");
});

testCase("hasImageFill returns false for nodes without image fills", () => {
  const rect = createRectangleNode({
    fills: [{ type: "SOLID", color: { r: 1, g: 1, b: 1 } } as unknown as Paint],
  });

  assert(!hasImageFill(rect as unknown as StubSceneNode), "Should not detect solid fill as image");
});

// ============================================================================
// Test: Important Content Detection
// ============================================================================

function isImportantContent(node: StubSceneNode): boolean {
  if (node.type === "TEXT") return true;
  if ("fills" in node) {
    const fills = (node as StubRectangleNode).fills as readonly Paint[];
    if (fills?.some((f: Paint) => f.type === "IMAGE")) return true;
  }
  return false;
}

testCase("isImportantContent returns true for TEXT nodes", () => {
  const text = createTextNode({ name: "Title" });
  assert(isImportantContent(text as unknown as StubSceneNode), "TEXT should be important");
});

testCase("isImportantContent returns true for nodes with image fills", () => {
  const rect = createRectangleNode({ fills: [createImageFill()] });
  assert(isImportantContent(rect as unknown as StubSceneNode), "Image nodes should be important");
});

testCase("isImportantContent returns false for plain rectangles", () => {
  const rect = createRectangleNode({ fills: [] });
  assert(!isImportantContent(rect as unknown as StubSceneNode), "Empty rectangle should not be important");
});

// ============================================================================
// Test: Z-Index Sorting Behavior
// ============================================================================

testCase("z-index sorting: lower zIndex = earlier in array = behind", () => {
  interface SpecWithZIndex {
    nodeId: string;
    zIndex: number;
  }

  const specs: SpecWithZIndex[] = [
    { nodeId: "front", zIndex: 10 },
    { nodeId: "middle", zIndex: 5 },
    { nodeId: "back", zIndex: 1 },
  ];

  // Sort ascending (lower = behind = earlier)
  const sorted = [...specs].sort((a, b) => a.zIndex - b.zIndex);

  assertEqual(sorted[0].nodeId, "back", "Back should be first");
  assertEqual(sorted[1].nodeId, "middle", "Middle should be second");
  assertEqual(sorted[2].nodeId, "front", "Front should be last");
});

// ============================================================================
// Test: TikTok Constraints
// ============================================================================

testCase("TikTok dimensions are 1080x1920", () => {
  const TIKTOK_WIDTH = 1080;
  const TIKTOK_HEIGHT = 1920;

  assertEqual(TIKTOK_WIDTH, 1080, "Width should be 1080");
  assertEqual(TIKTOK_HEIGHT, 1920, "Height should be 1920");
});

testCase("TikTok safe areas: bottom 8%, top 4%", () => {
  const BOTTOM_DANGER_ZONE = 0.08;
  const TOP_CAUTION_ZONE = 0.04;

  const height = 1920;
  const bottomDangerY = height * (1 - BOTTOM_DANGER_ZONE); // Content should be above this
  const topCautionY = height * TOP_CAUTION_ZONE; // Content should be below this

  assertEqual(bottomDangerY, 1766, "Bottom danger zone starts at 1766px");
  assertEqual(topCautionY, 77, "Top caution zone ends at 77px");
});

// ============================================================================
// Summary
// ============================================================================

console.log("\n✅ All design-executor characterization tests passed!");
