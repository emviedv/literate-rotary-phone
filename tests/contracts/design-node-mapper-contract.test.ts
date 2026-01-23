/**
 * Contract Tests for design-node-mapper module
 *
 * Defines the interface contract that the extracted module must satisfy.
 */

import {
  assert,
  testCase,
  assertEqual,
  resetNodeCounter,
  createFrameNode,
  createTextNode,
  createRectangleNode,
  createGroupNode,
  type StubFrameNode,
  type StubSceneNode,
} from "../fixtures/figma-stubs.js";

// ============================================================================
// Contract: NodeMapperContract Interface
// ============================================================================

/**
 * Node map type: maps source node IDs to cloned nodes
 */
interface NodeMap {
  readonly [sourceId: string]: StubSceneNode;
}

/**
 * Contract interface that the design-node-mapper module must implement.
 */
interface NodeMapperContract {
  /**
   * Builds a map from source node IDs to corresponding cloned nodes.
   * Uses parallel BFS traversal of both trees.
   * @param sourceFrame - The original source frame
   * @param clonedFrame - The cloned frame
   * @returns Map from source IDs to cloned nodes
   */
  buildNodeMap(sourceFrame: StubFrameNode, clonedFrame: StubFrameNode): NodeMap;

  /**
   * Builds a map of all nodes in a frame by their IDs.
   * Used for looking up nodes by their own ID (not source→clone mapping).
   * @param frame - The frame to map
   * @returns Map from node IDs to nodes
   */
  buildVariantNodeMap(frame: StubFrameNode): Map<string, StubSceneNode>;

  /**
   * Finds a node by name within a frame tree using BFS.
   * @param frame - The frame to search
   * @param name - The name to find
   * @returns The first matching node, or null if not found
   */
  findNodeByName(frame: StubFrameNode, name: string): StubSceneNode | null;
}

// ============================================================================
// Implementation (will be replaced by import after extraction)
// ============================================================================

function buildNodeMap(
  sourceFrame: StubFrameNode,
  clonedFrame: StubFrameNode
): NodeMap {
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

// Create service instance conforming to contract
const nodeMapperService: NodeMapperContract = {
  buildNodeMap,
  buildVariantNodeMap,
  findNodeByName,
};

// ============================================================================
// Contract Tests
// ============================================================================

testCase("CONTRACT: buildNodeMap maps source[i].id → clone[i] for parallel trees", () => {
  resetNodeCounter();

  // Create parallel structures
  const srcChild1 = createTextNode({ id: "src-text", name: "Title" });
  const srcChild2 = createRectangleNode({ id: "src-rect", name: "BG" });
  const srcFrame = createFrameNode({
    id: "src-root",
    children: [srcChild1 as unknown as StubSceneNode, srcChild2 as unknown as StubSceneNode],
  });

  const cloneChild1 = createTextNode({ id: "clone-text", name: "Title" });
  const cloneChild2 = createRectangleNode({ id: "clone-rect", name: "BG" });
  const cloneFrame = createFrameNode({
    id: "clone-root",
    children: [cloneChild1 as unknown as StubSceneNode, cloneChild2 as unknown as StubSceneNode],
  });

  const nodeMap = nodeMapperService.buildNodeMap(srcFrame, cloneFrame);

  // Verify mappings
  assertEqual(nodeMap["src-root"].id, "clone-root", "Root should map correctly");
  assertEqual(nodeMap["src-text"].id, "clone-text", "Text should map correctly");
  assertEqual(nodeMap["src-rect"].id, "clone-rect", "Rect should map correctly");
});

testCase("CONTRACT: buildNodeMap preserves structure through nested groups", () => {
  resetNodeCounter();

  // Source: Frame -> Group -> Rect
  const srcRect = createRectangleNode({ id: "src-rect" });
  const srcGroup = createGroupNode({
    id: "src-group",
    children: [srcRect as unknown as StubSceneNode],
  });
  const srcFrame = createFrameNode({
    id: "src-frame",
    children: [srcGroup as unknown as StubSceneNode],
  });

  // Clone with same structure
  const cloneRect = createRectangleNode({ id: "clone-rect" });
  const cloneGroup = createGroupNode({
    id: "clone-group",
    children: [cloneRect as unknown as StubSceneNode],
  });
  const cloneFrame = createFrameNode({
    id: "clone-frame",
    children: [cloneGroup as unknown as StubSceneNode],
  });

  const nodeMap = nodeMapperService.buildNodeMap(srcFrame, cloneFrame);

  assertEqual(Object.keys(nodeMap).length, 3, "Should map all 3 nodes");
  assertEqual(nodeMap["src-group"].id, "clone-group", "Group should map");
  assertEqual(nodeMap["src-rect"].id, "clone-rect", "Nested rect should map");
});

testCase("CONTRACT: buildVariantNodeMap maps node.id → node for all descendants", () => {
  resetNodeCounter();

  const child = createTextNode({ id: "child" });
  const nested = createRectangleNode({ id: "nested" });
  const group = createGroupNode({
    id: "group",
    children: [nested as unknown as StubSceneNode],
  });
  const frame = createFrameNode({
    id: "root",
    children: [child as unknown as StubSceneNode, group as unknown as StubSceneNode],
  });

  const map = nodeMapperService.buildVariantNodeMap(frame);

  assertEqual(map.size, 4, "Should have 4 nodes");
  assert(map.has("root"), "Should have root");
  assert(map.has("child"), "Should have child");
  assert(map.has("group"), "Should have group");
  assert(map.has("nested"), "Should have nested");
  assertEqual(map.get("child")?.name, "Text", "Should map to correct node");
});

testCase("CONTRACT: findNodeByName returns first BFS match", () => {
  resetNodeCounter();

  // Create nodes with same name at different levels
  const deepDupe = createTextNode({ id: "deep", name: "Target" });
  const group = createGroupNode({
    id: "group",
    children: [deepDupe as unknown as StubSceneNode],
  });
  const shallowDupe = createTextNode({ id: "shallow", name: "Target" });

  // Order: group (contains deep), then shallow
  const frame = createFrameNode({
    children: [
      group as unknown as StubSceneNode,
      shallowDupe as unknown as StubSceneNode,
    ],
  });

  const found = nodeMapperService.findNodeByName(frame, "Target");

  // BFS processes siblings before children of earlier siblings
  // Queue: [group, shallow] -> process group (no match), add deep -> [shallow, deep]
  // Process shallow (match!)
  assertEqual(found?.id, "shallow", "Should find shallow (first in BFS order)");
});

testCase("CONTRACT: findNodeByName returns null if not found", () => {
  resetNodeCounter();

  const frame = createFrameNode({
    children: [createTextNode({ name: "Other" }) as unknown as StubSceneNode],
  });

  const found = nodeMapperService.findNodeByName(frame, "NonExistent");

  assertEqual(found, null, "Should return null");
});

testCase("CONTRACT: findNodeByName searches children, not root", () => {
  resetNodeCounter();

  const frame = createFrameNode({
    id: "root",
    name: "SearchMe",
    children: [],
  });

  // findNodeByName starts with frame.children, not frame itself
  const found = nodeMapperService.findNodeByName(frame, "SearchMe");

  assertEqual(found, null, "Should not find root frame itself");
});

// ============================================================================
// Summary
// ============================================================================

console.log("\n✅ All design-node-mapper contract tests passed!");
