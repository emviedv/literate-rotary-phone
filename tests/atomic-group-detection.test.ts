/**
 * Tests for isAtomicGroup() detection heuristics.
 *
 * Atomic groups are illustration-like containers that should be treated as
 * single visual units during scaling. Children maintain fixed relative positions.
 */

import { isAtomicGroup } from "../core/element-classification.js";

// Test utilities
function assert(condition: unknown, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

function testCase(name: string, fn: () => void): void {
  try {
    fn();
    console.log(`✅ ${name}`);
  } catch (error) {
    console.error(`❌ ${name}`);
    throw error;
  }
}

// Stub factories
let nodeCounter = 0;

type GroupOverrides = {
  id?: string;
  name?: string;
  children?: readonly SceneNode[];
};

type ChildOverrides = {
  id?: string;
  type?: SceneNode["type"];
  name?: string;
  fills?: readonly Paint[];
};

function createChild(overrides: ChildOverrides = {}): SceneNode {
  nodeCounter += 1;
  return {
    id: overrides.id ?? `child-${nodeCounter}`,
    type: overrides.type ?? "RECTANGLE",
    name: overrides.name ?? `child-${nodeCounter}`,
    visible: true,
    fills: overrides.fills ?? [],
  } as SceneNode;
}

function createGroup(overrides: GroupOverrides = {}): SceneNode {
  nodeCounter += 1;
  return {
    id: overrides.id ?? `group-${nodeCounter}`,
    type: "GROUP",
    name: overrides.name ?? "Group",
    visible: true,
    children: overrides.children ?? [],
  } as SceneNode;
}

function createVectorChild(name?: string): SceneNode {
  nodeCounter += 1;
  return {
    id: `vector-${nodeCounter}`,
    type: "VECTOR",
    name: name ?? `vector-${nodeCounter}`,
    visible: true,
    fills: [],
  } as unknown as SceneNode;
}

function createTextChild(name?: string): SceneNode {
  nodeCounter += 1;
  return {
    id: `text-${nodeCounter}`,
    type: "TEXT",
    name: name ?? `text-${nodeCounter}`,
    visible: true,
    fills: [],
  } as unknown as SceneNode;
}

function createImageChild(name?: string): SceneNode {
  nodeCounter += 1;
  return {
    id: `image-${nodeCounter}`,
    type: "RECTANGLE",
    name: name ?? `image-${nodeCounter}`,
    visible: true,
    fills: [{ type: "IMAGE", scaleMode: "FILL", imageHash: "abc123" }] as readonly Paint[],
  } as SceneNode;
}

// ============================================================================
// Non-Group Nodes
// ============================================================================

testCase("non-GROUP nodes return false", () => {
  const frame = { type: "FRAME", name: "illustration", children: [] } as unknown as SceneNode;
  const rect = { type: "RECTANGLE", name: "illustration" } as unknown as SceneNode;
  const text = { type: "TEXT", name: "illustration" } as unknown as SceneNode;

  assert(isAtomicGroup(frame) === false, "FRAME should not be atomic");
  assert(isAtomicGroup(rect) === false, "RECTANGLE should not be atomic");
  assert(isAtomicGroup(text) === false, "TEXT should not be atomic");
});

// ============================================================================
// Name Pattern Detection
// ============================================================================

testCase("group named 'illustration' is atomic", () => {
  const group = createGroup({
    name: "Hero illustration",
    children: [createVectorChild(), createVectorChild()],
  });
  assert(isAtomicGroup(group) === true, "illustration group should be atomic");
});

testCase("group named 'mockup' is atomic", () => {
  const group = createGroup({
    name: "iPhone mockup",
    children: [createChild(), createChild()],
  });
  assert(isAtomicGroup(group) === true, "mockup group should be atomic");
});

testCase("group named 'device' is atomic", () => {
  const group = createGroup({
    name: "Device Frame",
    children: [createChild(), createChild()],
  });
  assert(isAtomicGroup(group) === true, "device group should be atomic");
});

testCase("group named 'phone' is atomic", () => {
  const group = createGroup({
    name: "Phone Asset",
    children: [createChild(), createChild()],
  });
  assert(isAtomicGroup(group) === true, "phone group should be atomic");
});

testCase("group named 'iphone' is atomic", () => {
  const group = createGroup({
    name: "iphone 15 pro",
    children: [createChild(), createChild()],
  });
  assert(isAtomicGroup(group) === true, "iphone group should be atomic");
});

testCase("group named 'graphic' is atomic", () => {
  const group = createGroup({
    name: "Feature graphic",
    children: [createChild(), createChild()],
  });
  assert(isAtomicGroup(group) === true, "graphic group should be atomic");
});

testCase("group named 'artwork' is atomic", () => {
  const group = createGroup({
    name: "Background artwork",
    children: [createChild(), createChild()],
  });
  assert(isAtomicGroup(group) === true, "artwork group should be atomic");
});

// ============================================================================
// TEXT Children Disqualifier
// ============================================================================

testCase("group with TEXT child is NOT atomic (even with illustration name)", () => {
  const group = createGroup({
    name: "Hero illustration",
    children: [createVectorChild(), createTextChild()],
  });
  assert(isAtomicGroup(group) === false, "group with TEXT child should not be atomic");
});

testCase("group with only TEXT children is NOT atomic", () => {
  const group = createGroup({
    name: "Content Group",
    children: [createTextChild(), createTextChild()],
  });
  assert(isAtomicGroup(group) === false, "text-only group should not be atomic");
});

// ============================================================================
// Vector Density Heuristic
// ============================================================================

testCase("group with >70% vectors is atomic", () => {
  const group = createGroup({
    name: "Group 1", // generic name, relies on composition
    children: [
      createVectorChild(),
      createVectorChild(),
      createVectorChild(),
      createVectorChild(),
      createChild({ type: "RECTANGLE" }),
    ],
  });
  assert(isAtomicGroup(group) === true, "high vector density group should be atomic");
});

testCase("group with exactly 70% vectors is NOT atomic (needs >70%)", () => {
  const group = createGroup({
    name: "Group 2",
    children: [
      createVectorChild(),
      createVectorChild(),
      createVectorChild(),
      createVectorChild(),
      createVectorChild(),
      createVectorChild(),
      createVectorChild(),
      createChild({ type: "FRAME" }),
      createChild({ type: "FRAME" }),
      createChild({ type: "FRAME" }),
    ],
  });
  // 7/10 = 0.7, not > 0.7
  assert(isAtomicGroup(group) === false, "70% vectors should not trigger atomic (needs >70%)");
});

testCase("group with <70% vectors and generic name is NOT atomic", () => {
  const group = createGroup({
    name: "Group 3",
    children: [
      createVectorChild(),
      createChild({ type: "RECTANGLE" }),
      createChild({ type: "FRAME" }),
      createChild({ type: "FRAME" }),
    ],
  });
  assert(isAtomicGroup(group) === false, "low vector density group should not be atomic");
});

// ============================================================================
// Image Fill Heuristic
// ============================================================================

testCase("group with image fill child is atomic (mockup detection)", () => {
  const group = createGroup({
    name: "Group 4", // generic name
    children: [createImageChild(), createChild({ type: "RECTANGLE" })],
  });
  assert(isAtomicGroup(group) === true, "group with image child should be atomic (mockup)");
});

testCase("group with image fill but also TEXT is NOT atomic", () => {
  const group = createGroup({
    name: "Card",
    children: [createImageChild(), createTextChild()],
  });
  assert(isAtomicGroup(group) === false, "group with image + TEXT should not be atomic");
});

// ============================================================================
// Empty Groups
// ============================================================================

testCase("empty group is NOT atomic", () => {
  const group = createGroup({
    name: "illustration",
    children: [],
  });
  assert(isAtomicGroup(group) === false, "empty group should not be atomic");
});

// ============================================================================
// Combined Scenarios
// ============================================================================

testCase("iPhone mockup with vectors and shapes is atomic", () => {
  const group = createGroup({
    name: "iPhone 15 Pro Max",
    children: [
      createVectorChild("Screen"),
      createChild({ type: "RECTANGLE", name: "Body" }),
      createChild({ type: "ELLIPSE", name: "Camera" }),
      createChild({ type: "RECTANGLE", name: "Speaker" }),
    ],
  });
  assert(isAtomicGroup(group) === true, "iPhone mockup should be atomic");
});

testCase("card container with text is NOT atomic", () => {
  const group = createGroup({
    name: "Feature Card",
    children: [
      createChild({ type: "RECTANGLE", name: "Background" }),
      createTextChild("Title"),
      createTextChild("Description"),
    ],
  });
  assert(isAtomicGroup(group) === false, "card with text should not be atomic");
});

testCase("infographic group is atomic by name", () => {
  const group = createGroup({
    name: "infographic-stats",
    children: [createChild(), createChild(), createChild()],
  });
  assert(isAtomicGroup(group) === true, "infographic should be atomic");
});

testCase("diagram group is atomic by name", () => {
  const group = createGroup({
    name: "Architecture Diagram",
    children: [createVectorChild(), createVectorChild()],
  });
  assert(isAtomicGroup(group) === true, "diagram should be atomic");
});

console.log("\n✅ All atomic group detection tests passed!");
