/**
 * Contract Tests for design-atomic-groups module
 *
 * Defines the interface contract that the extracted module must satisfy.
 * These tests will initially test the inline functions, then after extraction
 * will test the imported module.
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
// Contract: AtomicGroupService Interface
// ============================================================================

/**
 * Contract interface that the design-atomic-groups module must implement.
 */
interface AtomicGroupServiceContract {
  /**
   * Collects IDs of all atomic instances (INSTANCE nodes that should be preserved).
   * @param frame - The root frame to scan
   * @returns Set of instance node IDs that should NOT be detached
   */
  collectAtomicInstanceIds(frame: StubFrameNode): Set<string>;

  /**
   * Collects all node IDs that are children of atomic groups.
   * These children should NOT be repositioned independently.
   * @param frame - The root frame to scan
   * @returns Set of node IDs that are descendants of atomic groups
   */
  collectAtomicGroupChildren(frame: StubFrameNode): Set<string>;

  /**
   * Detaches non-atomic component instances in a frame tree.
   * Atomic instances are preserved to maintain their component boundaries.
   * @param frame - The frame to process
   * @param atomicInstanceIds - Set of instance IDs to skip
   * @returns Number of instances detached
   */
  detachAllInstances(frame: StubFrameNode, atomicInstanceIds?: Set<string>): number;
}

// ============================================================================
// Implementation (will be replaced by import after extraction)
// ============================================================================

function collectAtomicInstanceIds(frame: StubFrameNode): Set<string> {
  const atomicIds = new Set<string>();

  function scanForAtomicInstances(node: StubSceneNode): void {
    if (node.type === "INSTANCE") {
      atomicIds.add(node.id);
      return;
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

// Create service instance conforming to contract
const atomicGroupService: AtomicGroupServiceContract = {
  collectAtomicInstanceIds,
  collectAtomicGroupChildren,
  detachAllInstances,
};

// ============================================================================
// Contract Tests
// ============================================================================

testCase("CONTRACT: collectAtomicInstanceIds returns empty Set for no instances", () => {
  resetNodeCounter();

  const frame = createFrameNode({
    children: [
      createTextNode({}) as unknown as StubSceneNode,
      createRectangleNode({}) as unknown as StubSceneNode,
    ],
  });

  const ids = atomicGroupService.collectAtomicInstanceIds(frame);

  assertEqual(ids.size, 0, "Empty frame should have no atomic instances");
});

testCase("CONTRACT: collectAtomicInstanceIds returns atomic instance IDs only", () => {
  resetNodeCounter();

  const instance1 = createInstanceNode({ id: "inst-1", name: "iPhone" });
  const instance2 = createInstanceNode({ id: "inst-2", name: "Button" });
  const nonInstance = createRectangleNode({ id: "rect-1", name: "Background" });

  const frame = createFrameNode({
    children: [
      instance1 as unknown as StubSceneNode,
      nonInstance as unknown as StubSceneNode,
      instance2 as unknown as StubSceneNode,
    ],
  });

  const ids = atomicGroupService.collectAtomicInstanceIds(frame);

  assertEqual(ids.size, 2, "Should find 2 instances");
  assert(ids.has("inst-1"), "Should include first instance");
  assert(ids.has("inst-2"), "Should include second instance");
  assert(!ids.has("rect-1"), "Should NOT include non-instance");
});

testCase("CONTRACT: collectAtomicGroupChildren collects all nested descendants", () => {
  resetNodeCounter();

  // Deeply nested structure inside instance
  const deepChild = createVectorNode({ id: "deep" });
  const midGroup = createGroupNode({
    id: "mid",
    children: [deepChild as unknown as StubSceneNode],
  });
  const topChild = createRectangleNode({ id: "top" });

  const instance = createInstanceNode({
    id: "mockup",
    children: [
      topChild as unknown as StubSceneNode,
      midGroup as unknown as StubSceneNode,
    ],
  });

  const frame = createFrameNode({
    children: [instance as unknown as StubSceneNode],
  });

  const childIds = atomicGroupService.collectAtomicGroupChildren(frame);

  assertEqual(childIds.size, 3, "Should collect all 3 descendants");
  assert(childIds.has("top"), "Should include top child");
  assert(childIds.has("mid"), "Should include mid group");
  assert(childIds.has("deep"), "Should include deep child");
  assert(!childIds.has("mockup"), "Should NOT include the instance itself");
});

testCase("CONTRACT: detachAllInstances skips IDs in atomicInstanceIds Set", () => {
  resetNodeCounter();

  const atomicInst = createInstanceNode({ id: "preserve-me", name: "iPhone" });
  const detachInst = createInstanceNode({ id: "detach-me", name: "Button" });

  const frame = createFrameNode({
    children: [
      atomicInst as unknown as StubSceneNode,
      detachInst as unknown as StubSceneNode,
    ],
  });

  const atomicIds = new Set(["preserve-me"]);
  const count = atomicGroupService.detachAllInstances(frame, atomicIds);

  assertEqual(count, 1, "Should detach only 1 instance");
  assertEqual(frame.children[0].type, "INSTANCE", "Atomic instance should be preserved");
});

testCase("CONTRACT: detachAllInstances returns count of detached instances", () => {
  resetNodeCounter();

  const inst1 = createInstanceNode({ id: "i1" });
  const inst2 = createInstanceNode({ id: "i2" });
  const inst3 = createInstanceNode({ id: "i3" });

  const frame = createFrameNode({
    children: [
      inst1 as unknown as StubSceneNode,
      inst2 as unknown as StubSceneNode,
      inst3 as unknown as StubSceneNode,
    ],
  });

  const count = atomicGroupService.detachAllInstances(frame, new Set());

  assertEqual(count, 3, "Should return count of all detached instances");
});

testCase("CONTRACT: detachAllInstances processes nested instances in groups", () => {
  resetNodeCounter();

  const nestedInst = createInstanceNode({ id: "nested" });
  const group = createGroupNode({
    children: [nestedInst as unknown as StubSceneNode],
  });

  const frame = createFrameNode({
    children: [group as unknown as StubSceneNode],
  });

  const count = atomicGroupService.detachAllInstances(frame, new Set());

  assertEqual(count, 1, "Should detach nested instance");
});

testCase("CONTRACT: collectAtomicGroupChildren handles multiple atomic groups", () => {
  resetNodeCounter();

  const inst1Child = createRectangleNode({ id: "inst1-child" });
  const inst1 = createInstanceNode({
    id: "inst1",
    children: [inst1Child as unknown as StubSceneNode],
  });

  const inst2Child = createVectorNode({ id: "inst2-child" });
  const inst2 = createInstanceNode({
    id: "inst2",
    children: [inst2Child as unknown as StubSceneNode],
  });

  const frame = createFrameNode({
    children: [
      inst1 as unknown as StubSceneNode,
      inst2 as unknown as StubSceneNode,
    ],
  });

  const childIds = atomicGroupService.collectAtomicGroupChildren(frame);

  assertEqual(childIds.size, 2, "Should collect children from both instances");
  assert(childIds.has("inst1-child"), "Should include inst1 child");
  assert(childIds.has("inst2-child"), "Should include inst2 child");
});

// ============================================================================
// Summary
// ============================================================================

console.log("\n✅ All design-atomic-groups contract tests passed!");
