/**
 * Characterization tests for node map building functions.
 * Tests buildNodeMap() and findNodeByName() - critical for spec application.
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

function assertTrue(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

// ============================================================================
// Mock Factories
// ============================================================================

let nodeCounter = 0;

interface MockNode {
  id: string;
  name: string;
  type: string;
  visible: boolean;
  children?: MockNode[];
  x?: number;
  y?: number;
  width?: number;
  height?: number;
}

function createMockFrame(overrides: Partial<MockNode> = {}): MockNode {
  nodeCounter++;
  return {
    id: overrides.id ?? `frame-${nodeCounter}`,
    name: overrides.name ?? `Frame ${nodeCounter}`,
    type: "FRAME",
    visible: true,
    children: overrides.children ?? [],
    x: overrides.x ?? 0,
    y: overrides.y ?? 0,
    width: overrides.width ?? 100,
    height: overrides.height ?? 100,
    ...overrides,
  };
}

function createMockText(overrides: Partial<MockNode> = {}): MockNode {
  nodeCounter++;
  return {
    id: overrides.id ?? `text-${nodeCounter}`,
    name: overrides.name ?? `Text ${nodeCounter}`,
    type: "TEXT",
    visible: true,
    x: overrides.x ?? 0,
    y: overrides.y ?? 0,
    ...overrides,
  };
}

// ============================================================================
// buildNodeMap behavior (inline implementation for characterization)
// ============================================================================

/**
 * Characterization: buildNodeMap walks source and cloned trees in parallel,
 * mapping source IDs to cloned nodes.
 */
function buildNodeMap(
  sourceFrame: MockNode,
  clonedFrame: MockNode
): Record<string, MockNode> {
  const map: Record<string, MockNode> = {};
  const sourceQueue: MockNode[] = [sourceFrame];
  const clonedQueue: MockNode[] = [clonedFrame];

  while (sourceQueue.length > 0 && clonedQueue.length > 0) {
    const sourceNode = sourceQueue.shift()!;
    const clonedNode = clonedQueue.shift()!;
    map[sourceNode.id] = clonedNode;

    if (sourceNode.children && clonedNode.children) {
      for (let i = 0; i < sourceNode.children.length; i++) {
        if (i < clonedNode.children.length) {
          sourceQueue.push(sourceNode.children[i]);
          clonedQueue.push(clonedNode.children[i]);
        }
      }
    }
  }
  return map;
}

/**
 * Characterization: findNodeByName does BFS to find first node with matching name.
 */
function findNodeByName(frame: MockNode, name: string): MockNode | null {
  const queue: MockNode[] = frame.children ? [...frame.children] : [];
  while (queue.length > 0) {
    const node = queue.shift()!;
    if (node.name === name) return node;
    if (node.children) queue.push(...node.children);
  }
  return null;
}

// ============================================================================
// Tests
// ============================================================================

console.log("\n🗺️ Node Map Builder Characterization Tests\n");

testCase("buildNodeMap maps root frames correctly", () => {
  const source = createMockFrame({ id: "src-1", name: "Source" });
  const cloned = createMockFrame({ id: "clone-1", name: "Clone" });

  const map = buildNodeMap(source, cloned);

  assertEqual(map["src-1"].id, "clone-1", "Source root should map to cloned root");
});

testCase("buildNodeMap maps nested children in parallel", () => {
  const sourceChild = createMockText({ id: "src-child", name: "Title" });
  const clonedChild = createMockText({ id: "clone-child", name: "Title" });

  const source = createMockFrame({ id: "src-root", children: [sourceChild] });
  const cloned = createMockFrame({ id: "clone-root", children: [clonedChild] });

  const map = buildNodeMap(source, cloned);

  assertEqual(map["src-child"].id, "clone-child", "Source child should map to cloned child");
});

testCase("buildNodeMap handles mismatched child counts gracefully", () => {
  const source = createMockFrame({
    id: "src",
    children: [
      createMockText({ id: "src-1" }),
      createMockText({ id: "src-2" }),
      createMockText({ id: "src-3" }),
    ],
  });
  const cloned = createMockFrame({
    id: "clone",
    children: [
      createMockText({ id: "clone-1" }),
      createMockText({ id: "clone-2" }),
    ],
  });

  const map = buildNodeMap(source, cloned);

  assertEqual(map["src-1"].id, "clone-1", "First child should map");
  assertEqual(map["src-2"].id, "clone-2", "Second child should map");
  assertTrue(!map["src-3"], "Third child should not map (no corresponding clone)");
});

testCase("findNodeByName returns first match by BFS order", () => {
  const frame = createMockFrame({
    children: [
      createMockFrame({
        name: "Container",
        children: [createMockText({ id: "deep", name: "Target" })],
      }),
      createMockText({ id: "shallow", name: "Target" }),
    ],
  });

  const found = findNodeByName(frame, "Target");

  // BFS: Container is visited first, but its child "Target" is queued after "shallow Target"
  // Actually: [Container, shallow Target] -> visit Container, queue deep Target -> [shallow Target, deep Target]
  // So shallow is found first
  assertEqual(found?.id, "shallow", "BFS should find shallow node first");
});

testCase("findNodeByName returns null when no match", () => {
  const frame = createMockFrame({
    children: [createMockText({ name: "Other" })],
  });

  const found = findNodeByName(frame, "NonExistent");

  assertEqual(found, null, "Should return null when not found");
});

testCase("findNodeByName searches entire tree depth", () => {
  const deepNode = createMockText({ id: "deep-node", name: "DeepTarget" });
  const frame = createMockFrame({
    children: [
      createMockFrame({
        children: [
          createMockFrame({
            children: [deepNode],
          }),
        ],
      }),
    ],
  });

  const found = findNodeByName(frame, "DeepTarget");

  assertEqual(found?.id, "deep-node", "Should find deeply nested node");
});

console.log("\n✅ All node map builder characterization tests passed!\n");
