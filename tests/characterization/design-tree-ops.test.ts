/**
 * Characterization Tests for tree traversal operations
 *
 * Documents the current behavior of:
 * - buildNodeMap (parallel BFS traversal)
 * - buildVariantNodeMap (single tree ID mapping)
 * - findNodeByName (BFS name search)
 * - collectAtomicInstanceIds (instance detection)
 * - collectAtomicGroupChildren (child collection)
 * - detachAllInstances (instance conversion)
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
  createVectorNode,
  createGroupNode,
  type StubFrameNode,
  type StubSceneNode,
  type StubInstanceNode,
} from "../fixtures/figma-stubs.js";

// ============================================================================
// buildNodeMap Tests
// ============================================================================

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

testCase("buildNodeMap: maps root frame correctly", () => {
  resetNodeCounter();

  const source = createFrameNode({ id: "src-root", name: "Root" });
  const clone = createFrameNode({ id: "clone-root", name: "Root" });

  const map = buildNodeMap(source, clone);

  assertEqual(Object.keys(map).length, 1, "Should have 1 mapping");
  assertEqual(map["src-root"].id, "clone-root", "Root should map to clone");
});

testCase("buildNodeMap: maintains parallel structure through deep nesting", () => {
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

  // Clone: Frame -> Group -> Rect
  const cloneRect = createRectangleNode({ id: "clone-rect" });
  const cloneGroup = createGroupNode({
    id: "clone-group",
    children: [cloneRect as unknown as StubSceneNode],
  });
  const cloneFrame = createFrameNode({
    id: "clone-frame",
    children: [cloneGroup as unknown as StubSceneNode],
  });

  const map = buildNodeMap(srcFrame, cloneFrame);

  assertEqual(Object.keys(map).length, 3, "Should have 3 mappings");
  assertEqual(map["src-frame"].id, "clone-frame", "Frame mapped correctly");
  assertEqual(map["src-group"].id, "clone-group", "Group mapped correctly");
  assertEqual(map["src-rect"].id, "clone-rect", "Rect mapped correctly");
});

testCase("buildNodeMap: handles mismatched child counts gracefully", () => {
  resetNodeCounter();

  const srcChild1 = createRectangleNode({ id: "src-1" });
  const srcChild2 = createRectangleNode({ id: "src-2" });
  const srcFrame = createFrameNode({
    id: "src-frame",
    children: [srcChild1 as unknown as StubSceneNode, srcChild2 as unknown as StubSceneNode],
  });

  // Clone has fewer children
  const cloneChild1 = createRectangleNode({ id: "clone-1" });
  const cloneFrame = createFrameNode({
    id: "clone-frame",
    children: [cloneChild1 as unknown as StubSceneNode],
  });

  const map = buildNodeMap(srcFrame, cloneFrame);

  // Should map what it can
  assertEqual(Object.keys(map).length, 2, "Should map available nodes");
  assertEqual(map["src-frame"].id, "clone-frame", "Frame mapped");
  assertEqual(map["src-1"].id, "clone-1", "First child mapped");
  assert(!("src-2" in map), "Second source child not mapped");
});

// ============================================================================
// buildVariantNodeMap Tests
// ============================================================================

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

testCase("buildVariantNodeMap: includes root frame", () => {
  resetNodeCounter();

  const frame = createFrameNode({ id: "root", children: [] });
  const map = buildVariantNodeMap(frame);

  assert(map.has("root"), "Should include root");
  assertEqual(map.size, 1, "Should have 1 node");
});

testCase("buildVariantNodeMap: traverses all nested levels", () => {
  resetNodeCounter();

  const deepChild = createRectangleNode({ id: "deep" });
  const midChild = createGroupNode({
    id: "mid",
    children: [deepChild as unknown as StubSceneNode],
  });
  const topChild = createFrameNode({
    id: "top",
    children: [midChild as unknown as StubSceneNode],
  });
  const root = createFrameNode({
    id: "root",
    children: [topChild as unknown as StubSceneNode],
  });

  const map = buildVariantNodeMap(root);

  assertEqual(map.size, 4, "Should have 4 nodes");
  assert(map.has("root"), "Has root");
  assert(map.has("top"), "Has top");
  assert(map.has("mid"), "Has mid");
  assert(map.has("deep"), "Has deep");
});

testCase("buildVariantNodeMap: handles multiple children at same level", () => {
  resetNodeCounter();

  const child1 = createTextNode({ id: "c1" });
  const child2 = createTextNode({ id: "c2" });
  const child3 = createTextNode({ id: "c3" });
  const frame = createFrameNode({
    id: "root",
    children: [
      child1 as unknown as StubSceneNode,
      child2 as unknown as StubSceneNode,
      child3 as unknown as StubSceneNode,
    ],
  });

  const map = buildVariantNodeMap(frame);

  assertEqual(map.size, 4, "Should have 4 nodes");
  assertEqual(map.get("c1")?.name, "Text", "Child 1 accessible");
  assertEqual(map.get("c2")?.name, "Text", "Child 2 accessible");
  assertEqual(map.get("c3")?.name, "Text", "Child 3 accessible");
});

// ============================================================================
// findNodeByName Tests
// ============================================================================

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

testCase("findNodeByName: finds direct child", () => {
  resetNodeCounter();

  const target = createTextNode({ id: "target", name: "Title" });
  const frame = createFrameNode({
    children: [target as unknown as StubSceneNode],
  });

  const found = findNodeByName(frame, "Title");
  assertEqual(found?.id, "target", "Should find the node");
});

testCase("findNodeByName: finds nested child via BFS", () => {
  resetNodeCounter();

  const nested = createTextNode({ id: "nested", name: "DeepTitle" });
  const group = createGroupNode({
    children: [nested as unknown as StubSceneNode],
  });
  const frame = createFrameNode({
    children: [group as unknown as StubSceneNode],
  });

  const found = findNodeByName(frame, "DeepTitle");
  assertEqual(found?.id, "nested", "Should find nested node");
});

testCase("findNodeByName: returns FIRST match in BFS order", () => {
  resetNodeCounter();

  // BFS order: immediate children processed before grandchildren
  const nestedDupe = createTextNode({ id: "nested-dupe", name: "Duplicate" });
  const group = createGroupNode({
    children: [nestedDupe as unknown as StubSceneNode],
  });
  const directDupe = createTextNode({ id: "direct-dupe", name: "Duplicate" });

  // Order in children: group first, then direct
  // But BFS processes siblings before children of siblings
  const frame = createFrameNode({
    children: [
      group as unknown as StubSceneNode,
      directDupe as unknown as StubSceneNode,
    ],
  });

  const found = findNodeByName(frame, "Duplicate");

  // BFS: queue starts with [group, directDupe]
  // Process group (not a match), add nestedDupe to queue: [directDupe, nestedDupe]
  // Process directDupe (match!) - return it
  assertEqual(found?.id, "direct-dupe", "Should find first in BFS order");
});

testCase("findNodeByName: returns null when no match", () => {
  resetNodeCounter();

  const frame = createFrameNode({
    children: [createTextNode({ name: "Other" }) as unknown as StubSceneNode],
  });

  const found = findNodeByName(frame, "NonExistent");
  assertEqual(found, null, "Should return null");
});

testCase("findNodeByName: does NOT search the root frame itself", () => {
  resetNodeCounter();

  const frame = createFrameNode({
    id: "root",
    name: "TargetName",
    children: [],
  });

  // Function searches frame.children, not frame itself
  const found = findNodeByName(frame, "TargetName");
  assertEqual(found, null, "Should not find root frame");
});

// ============================================================================
// collectAtomicInstanceIds Tests
// ============================================================================

function collectAtomicInstanceIds(frame: StubFrameNode): Set<string> {
  const atomicIds = new Set<string>();

  function scanForAtomicInstances(node: StubSceneNode): void {
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

testCase("collectAtomicInstanceIds: empty Set for frame with no instances", () => {
  resetNodeCounter();

  const frame = createFrameNode({
    children: [
      createTextNode({}) as unknown as StubSceneNode,
      createRectangleNode({}) as unknown as StubSceneNode,
      createGroupNode({ children: [] }) as unknown as StubSceneNode,
    ],
  });

  const ids = collectAtomicInstanceIds(frame);
  assertEqual(ids.size, 0, "Should be empty");
});

testCase("collectAtomicInstanceIds: finds top-level instances", () => {
  resetNodeCounter();

  const inst1 = createInstanceNode({ id: "inst-1" });
  const inst2 = createInstanceNode({ id: "inst-2" });
  const frame = createFrameNode({
    children: [
      inst1 as unknown as StubSceneNode,
      createTextNode({}) as unknown as StubSceneNode,
      inst2 as unknown as StubSceneNode,
    ],
  });

  const ids = collectAtomicInstanceIds(frame);

  assertEqual(ids.size, 2, "Should find 2 instances");
  assert(ids.has("inst-1"), "Should include inst-1");
  assert(ids.has("inst-2"), "Should include inst-2");
});

testCase("collectAtomicInstanceIds: finds nested instances", () => {
  resetNodeCounter();

  const nestedInst = createInstanceNode({ id: "nested-inst" });
  const group = createGroupNode({
    children: [nestedInst as unknown as StubSceneNode],
  });
  const frame = createFrameNode({
    children: [group as unknown as StubSceneNode],
  });

  const ids = collectAtomicInstanceIds(frame);

  assertEqual(ids.size, 1, "Should find nested instance");
  assert(ids.has("nested-inst"), "Should include nested instance");
});

testCase("collectAtomicInstanceIds: does NOT recurse into instances", () => {
  resetNodeCounter();

  // Instance with nested instance child (shouldn't happen in real Figma, but tests behavior)
  const innerInst = createInstanceNode({ id: "inner" });
  const outerInst = createInstanceNode({
    id: "outer",
    children: [innerInst as unknown as StubSceneNode],
  });
  const frame = createFrameNode({
    children: [outerInst as unknown as StubSceneNode],
  });

  const ids = collectAtomicInstanceIds(frame);

  // Should only find outer, not recurse to find inner
  assertEqual(ids.size, 1, "Should find 1 instance");
  assert(ids.has("outer"), "Should include outer");
  assert(!ids.has("inner"), "Should NOT include inner (no recursion into instances)");
});

// ============================================================================
// collectAtomicGroupChildren Tests
// ============================================================================

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
    if (node.type === "INSTANCE") {
      collectChildIds(node);
      return;
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

testCase("collectAtomicGroupChildren: empty for frame with no instances", () => {
  resetNodeCounter();

  const frame = createFrameNode({
    children: [createTextNode({}) as unknown as StubSceneNode],
  });

  const childIds = collectAtomicGroupChildren(frame);
  assertEqual(childIds.size, 0, "Should be empty");
});

testCase("collectAtomicGroupChildren: collects direct children of instance", () => {
  resetNodeCounter();

  const screen = createRectangleNode({ id: "screen" });
  const bezel = createRectangleNode({ id: "bezel" });
  const instance = createInstanceNode({
    id: "iphone",
    children: [screen as unknown as StubSceneNode, bezel as unknown as StubSceneNode],
  });
  const frame = createFrameNode({
    children: [instance as unknown as StubSceneNode],
  });

  const childIds = collectAtomicGroupChildren(frame);

  assertEqual(childIds.size, 2, "Should have 2 children");
  assert(childIds.has("screen"), "Should include screen");
  assert(childIds.has("bezel"), "Should include bezel");
  assert(!childIds.has("iphone"), "Should NOT include the instance itself");
});

testCase("collectAtomicGroupChildren: collects deeply nested children", () => {
  resetNodeCounter();

  const deepChild = createVectorNode({ id: "deep" });
  const midGroup = createGroupNode({
    id: "mid",
    children: [deepChild as unknown as StubSceneNode],
  });
  const instance = createInstanceNode({
    id: "inst",
    children: [midGroup as unknown as StubSceneNode],
  });
  const frame = createFrameNode({
    children: [instance as unknown as StubSceneNode],
  });

  const childIds = collectAtomicGroupChildren(frame);

  assertEqual(childIds.size, 2, "Should have 2 descendants");
  assert(childIds.has("mid"), "Should include mid group");
  assert(childIds.has("deep"), "Should include deep child");
});

testCase("collectAtomicGroupChildren: excludes non-atomic siblings", () => {
  resetNodeCounter();

  const instChild = createRectangleNode({ id: "inst-child" });
  const instance = createInstanceNode({
    id: "inst",
    children: [instChild as unknown as StubSceneNode],
  });
  const regularChild = createTextNode({ id: "regular" });
  const frame = createFrameNode({
    children: [
      instance as unknown as StubSceneNode,
      regularChild as unknown as StubSceneNode,
    ],
  });

  const childIds = collectAtomicGroupChildren(frame);

  assertEqual(childIds.size, 1, "Should only have instance children");
  assert(childIds.has("inst-child"), "Should include instance child");
  assert(!childIds.has("regular"), "Should NOT include regular sibling");
});

// ============================================================================
// detachAllInstances Tests
// ============================================================================

function detachAllInstances(frame: StubFrameNode, atomicInstanceIds: Set<string> = new Set()): number {
  let detachCount = 0;
  const nodesToProcess: StubSceneNode[] = [...frame.children];

  while (nodesToProcess.length > 0) {
    const node = nodesToProcess.shift()!;

    if (node.type === "INSTANCE") {
      if (atomicInstanceIds.has(node.id)) {
        if ("children" in node) {
          nodesToProcess.push(...(node as StubInstanceNode).children);
        }
        continue;
      }

      const instance = node as StubInstanceNode;
      const detached = instance.detachInstance();
      detachCount++;

      const parent = node.parent as StubFrameNode | null;
      if (parent && "children" in parent) {
        const idx = parent.children.indexOf(node);
        if (idx !== -1) {
          parent.children[idx] = detached as unknown as StubSceneNode;
        }
      }

      if ("children" in detached) {
        nodesToProcess.push(...detached.children);
      }
    } else if ("children" in node) {
      nodesToProcess.push(...(node as StubFrameNode).children);
    }
  }

  return detachCount;
}

testCase("detachAllInstances: returns 0 for no instances", () => {
  resetNodeCounter();

  const frame = createFrameNode({
    children: [createTextNode({}) as unknown as StubSceneNode],
  });

  const count = detachAllInstances(frame);
  assertEqual(count, 0, "Should detach 0");
});

testCase("detachAllInstances: detaches all instances when no atomicIds", () => {
  resetNodeCounter();

  const inst1 = createInstanceNode({ id: "i1" });
  const inst2 = createInstanceNode({ id: "i2" });
  const frame = createFrameNode({
    children: [inst1 as unknown as StubSceneNode, inst2 as unknown as StubSceneNode],
  });

  const count = detachAllInstances(frame, new Set());

  assertEqual(count, 2, "Should detach 2 instances");
});

testCase("detachAllInstances: skips instances in atomicInstanceIds", () => {
  resetNodeCounter();

  const atomicInst = createInstanceNode({ id: "atomic" });
  const regularInst = createInstanceNode({ id: "regular" });
  const frame = createFrameNode({
    children: [
      atomicInst as unknown as StubSceneNode,
      regularInst as unknown as StubSceneNode,
    ],
  });

  const atomicIds = new Set(["atomic"]);
  const count = detachAllInstances(frame, atomicIds);

  assertEqual(count, 1, "Should detach only 1");
  // Atomic instance preserved
  assertEqual(frame.children[0].type, "INSTANCE", "Atomic instance preserved");
});

testCase("detachAllInstances: processes nested instances", () => {
  resetNodeCounter();

  const nestedInst = createInstanceNode({ id: "nested" });
  const outerGroup = createGroupNode({
    id: "group",
    children: [nestedInst as unknown as StubSceneNode],
  });
  const frame = createFrameNode({
    children: [outerGroup as unknown as StubSceneNode],
  });

  const count = detachAllInstances(frame, new Set());

  assertEqual(count, 1, "Should detach nested instance");
});

// ============================================================================
// Summary
// ============================================================================

console.log("\n✅ All design-tree-ops characterization tests passed!");
