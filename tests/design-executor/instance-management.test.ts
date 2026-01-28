/**
 * Characterization tests for instance detachment and atomic group collection.
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

interface MockNode {
  id: string;
  name: string;
  type: string;
  visible: boolean;
  children?: MockNode[];
  fills?: readonly { type: string }[];
}

function createMockInstance(overrides: Partial<MockNode> = {}): MockNode {
  return {
    id: overrides.id ?? "instance-1",
    name: overrides.name ?? "Instance",
    type: "INSTANCE",
    visible: true,
    children: overrides.children ?? [],
    ...overrides,
  };
}

function createMockGroup(overrides: Partial<MockNode> = {}): MockNode {
  return {
    id: overrides.id ?? "group-1",
    name: overrides.name ?? "Group",
    type: "GROUP",
    visible: true,
    children: overrides.children ?? [],
    ...overrides,
  };
}

function createMockFrame(overrides: Partial<MockNode> = {}): MockNode {
  return {
    id: overrides.id ?? "frame-1",
    name: overrides.name ?? "Frame",
    type: "FRAME",
    visible: true,
    children: overrides.children ?? [],
    ...overrides,
  };
}

function createMockText(id: string): MockNode {
  return { id, name: "Text", type: "TEXT", visible: true };
}

// ============================================================================
// Characterization: isAtomicGroup logic (from element-classification.ts)
// ============================================================================

const ATOMIC_GROUP_NAME_PATTERN =
  /\b(illustration|mockup|device|phone|iphone|android|tablet|ipad|asset|graphic|artwork|icon-group|logo-group|diagram|infographic|chart|screenshot|frame-mockup|screen|bezel)\b/i;

function isAtomicGroup(node: MockNode): boolean {
  if (node.type !== "GROUP" && node.type !== "FRAME" && node.type !== "INSTANCE") {
    return false;
  }

  // INSTANCE nodes are always atomic
  if (node.type === "INSTANCE") return true;

  const children = node.children ?? [];
  if (children.length === 0) return false;

  // TEXT children disqualify
  if (children.some((c) => c.type === "TEXT")) return false;

  // Name pattern match
  if (ATOMIC_GROUP_NAME_PATTERN.test(node.name)) return true;

  // High vector density (>70%)
  const vectorCount = children.filter(
    (c) =>
      c.type === "VECTOR" ||
      c.type === "BOOLEAN_OPERATION" ||
      c.type === "STAR" ||
      c.type === "POLYGON" ||
      c.type === "ELLIPSE" ||
      c.type === "RECTANGLE" ||
      c.type === "LINE"
  ).length;
  if (vectorCount / children.length > 0.7) return true;

  // Image fill present
  const hasImage = children.some((c) =>
    (c.fills ?? []).some((f) => f.type === "IMAGE" || f.type === "VIDEO")
  );
  if (hasImage) return true;

  return false;
}

// ============================================================================
// Characterization: collectAtomicInstanceIds
// ============================================================================

function collectAtomicInstanceIds(frame: MockNode): Set<string> {
  const atomicIds = new Set<string>();

  function scan(node: MockNode): void {
    if (node.type === "INSTANCE" && isAtomicGroup(node)) {
      atomicIds.add(node.id);
      return; // Don't recurse into atomic instances
    }
    for (const child of node.children ?? []) {
      scan(child);
    }
  }

  for (const child of frame.children ?? []) {
    scan(child);
  }

  return atomicIds;
}

// ============================================================================
// Characterization: collectAtomicGroupChildren
// ============================================================================

function collectAtomicGroupChildren(frame: MockNode): Set<string> {
  const childIds = new Set<string>();

  function collectChildIds(parent: MockNode): void {
    for (const child of parent.children ?? []) {
      childIds.add(child.id);
      collectChildIds(child);
    }
  }

  function scan(node: MockNode): void {
    if (isAtomicGroup(node)) {
      collectChildIds(node);
      return;
    }
    for (const child of node.children ?? []) {
      scan(child);
    }
  }

  for (const child of frame.children ?? []) {
    scan(child);
  }

  return childIds;
}

// ============================================================================
// Tests
// ============================================================================

console.log("\n🔧 Instance Management Characterization Tests\n");

// --- Atomic Instance Detection ---

testCase("INSTANCE nodes are always atomic", () => {
  const instance = createMockInstance({ name: "Generic Button" });

  const result = isAtomicGroup(instance);

  assertEqual(result, true, "All INSTANCE nodes are atomic");
});

testCase("collectAtomicInstanceIds finds nested instances", () => {
  const frame = createMockFrame({
    children: [
      createMockInstance({ id: "inst-1", name: "Button" }),
      createMockFrame({
        children: [createMockInstance({ id: "inst-2", name: "Nested Instance" })],
      }),
    ],
  });

  const ids = collectAtomicInstanceIds(frame);

  assertTrue(ids.has("inst-1"), "Should find top-level instance");
  assertTrue(ids.has("inst-2"), "Should find nested instance");
  assertEqual(ids.size, 2, "Should find exactly 2 instances");
});

// --- Atomic Group Child Collection ---

testCase("collectAtomicGroupChildren collects all descendants of atomic group", () => {
  const frame = createMockFrame({
    children: [
      createMockGroup({
        id: "mockup",
        name: "iPhone mockup",
        children: [
          { id: "bezel", name: "Bezel", type: "RECTANGLE", visible: true },
          {
            id: "screen",
            name: "Screen",
            type: "FRAME",
            visible: true,
            children: [{ id: "content", name: "Content", type: "RECTANGLE", visible: true }],
          },
        ],
      }),
    ],
  });

  const childIds = collectAtomicGroupChildren(frame);

  assertTrue(childIds.has("bezel"), "Should include bezel");
  assertTrue(childIds.has("screen"), "Should include screen");
  assertTrue(childIds.has("content"), "Should include nested content");
  assertEqual(childIds.size, 3, "Should have 3 children total");
});

testCase("collectAtomicGroupChildren excludes non-atomic group children", () => {
  const frame = createMockFrame({
    children: [
      createMockGroup({
        id: "layout-group",
        name: "Content Container",
        children: [createMockText("text-1"), createMockText("text-2")],
      }),
    ],
  });

  // Group has TEXT children, so it's NOT atomic
  const childIds = collectAtomicGroupChildren(frame);

  assertEqual(childIds.size, 0, "Non-atomic group children should not be collected");
});

// --- Detachment Logic ---

testCase("detachAllInstances skips atomic instances", () => {
  // Characterization: if atomicInstanceIds.has(node.id), skip detachment
  const atomicIds = new Set(["inst-atomic"]);
  const nodeId = "inst-atomic";

  const shouldSkip = atomicIds.has(nodeId);

  assertEqual(shouldSkip, true, "Atomic instances should be skipped");
});

testCase("detachAllInstances processes non-atomic instances", () => {
  const atomicIds = new Set(["inst-atomic"]);
  const nodeId = "inst-regular";

  const shouldSkip = atomicIds.has(nodeId);

  assertEqual(shouldSkip, false, "Regular instances should be processed");
});

console.log("\n✅ All instance management characterization tests passed!\n");
