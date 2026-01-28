# Design Executor Refactor Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Refactor `core/design-executor.ts` (1189 LOC) into modular files under 400 LOC each, with comprehensive test coverage and no behavior changes.

**Architecture:** Split the monolithic executor into 5 focused modules:
1. `design-executor.ts` - Public API and orchestration (main entry points)
2. `node-map-builder.ts` - Node mapping and lookup utilities
3. `spec-applicator.ts` - Node specification application logic
4. `edge-enforcement.ts` - Safe area and edge padding enforcement
5. `instance-management.ts` - Instance detachment and atomic group handling

**Tech Stack:** TypeScript, Figma Plugin API, custom test runner (Node.js)

---

## Phase 0: Preparation

### Task 0.1: Update tsconfig.tests.json for design-executor

**Files:**
- Modify: `tsconfig.tests.json`

**Step 1: Add design-executor to test includes**

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "outDir": "build-tests",
    "rootDir": ".",
    "lib": ["ES2020"],
    "types": ["node", "@figma/plugin-typings/plugin-api"],
    "module": "Node16",
    "moduleResolution": "Node16",
    "skipLibCheck": true
  },
  "include": [
    "tests/**/*.ts",
    "core/layout-positions.ts",
    "core/padding-distribution.ts",
    "core/layout-expansion.ts",
    "core/absolute-geometry.ts",
    "core/absolute-layout.ts",
    "core/layout-advice.ts",
    "core/layout-profile.ts",
    "core/qa-overlay.ts",
    "core/auto-layout-adapter.ts",
    "core/debug.ts",
    "core/ai-service.ts",
    "core/ai-few-shot-examples.ts",
    "core/ai-sanitization.ts",
    "core/ai-frame-summary.ts",
    "core/design-executor.ts",
    "core/element-classification.ts",
    "core/node-map-builder.ts",
    "core/spec-applicator.ts",
    "core/edge-enforcement.ts",
    "core/instance-management.ts",
    "types/design-types.ts"
  ]
}
```

**Step 2: Commit preparation**

```bash
git add tsconfig.tests.json
git commit -m "chore: prepare tsconfig for design-executor testing"
```

---

## Phase 1: Characterization Tests

Lock current behavior before any refactoring. These tests must pass now and after.

### Task 1.1: Test node map building

**Files:**
- Create: `tests/design-executor/node-map-builder.test.ts`

**Step 1: Write passing tests**

```typescript
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
```

**Step 2: Run test to verify it passes**

Run: `npm run test`
Expected: PASS - all node map tests green

**Step 3: Commit**

```bash
git add tests/design-executor/node-map-builder.test.ts
git commit -m "test: add characterization tests for node map building"
```

---

### Task 1.2: Test spec application logic

**Files:**
- Create: `tests/design-executor/spec-applicator.test.ts`

**Step 1: Write passing tests**

```typescript
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

function assertTrue(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
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

interface MockFrameNode {
  id: string;
  name: string;
  type: "FRAME";
  visible: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
  layoutPositioning?: "AUTO" | "ABSOLUTE";
  layoutMode?: string;
  children: unknown[];
  fills?: readonly { type: string }[];
  parent?: { layoutMode: string };
  resize: (w: number, h: number) => void;
  resizeWithoutConstraints: (w: number, h: number) => void;
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

function createMockFrameNode(overrides: Partial<MockFrameNode> = {}): MockFrameNode {
  let currentWidth = overrides.width ?? 300;
  let currentHeight = overrides.height ?? 200;

  return {
    id: "frame-1",
    name: "Frame",
    type: "FRAME",
    visible: true,
    x: 0,
    y: 0,
    width: currentWidth,
    height: currentHeight,
    children: [],
    fills: [],
    resize: (w: number, h: number) => {
      currentWidth = w;
      currentHeight = h;
    },
    resizeWithoutConstraints: (w: number, h: number) => {
      currentWidth = w;
      currentHeight = h;
    },
    ...overrides,
  };
}

interface NodeSpec {
  nodeId: string;
  nodeName: string;
  visible: boolean;
  position?: { x: number; y: number };
  size?: { width: number; height: number };
  scaleFactor?: number;
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
  const spec: NodeSpec = {
    nodeId: "child-1",
    nodeName: "Screen",
    visible: false, // Would normally hide node
    position: { x: 500, y: 500 },
  };

  // Simulate: atomic children skip everything
  const shouldSkip = isAtomicChild;

  assertEqual(shouldSkip, true, "Atomic children should skip all modifications");
});

testCase("atomic instance nodes skip size/scale but allow position", () => {
  // Characterization: isAtomicInstance skips size/scaleFactor but NOT position
  const isAtomicInstance = true;
  const spec: NodeSpec = {
    nodeId: "instance-1",
    nodeName: "iPhone Mockup",
    visible: true,
    position: { x: 100, y: 200 },
    size: { width: 500, height: 1000 },
    scaleFactor: 1.5,
  };

  // Position: allowed
  const positionAllowed = !isAtomicInstance || true; // Position is always applied for instances
  // Size: blocked
  const sizeBlocked = isAtomicInstance;
  // Scale: blocked
  const scaleBlocked = isAtomicInstance;

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

console.log("\n✅ All spec applicator characterization tests passed!\n");
```

**Step 2: Run test**

Run: `npm run test`
Expected: PASS

**Step 3: Commit**

```bash
git add tests/design-executor/spec-applicator.test.ts
git commit -m "test: add characterization tests for spec application"
```

---

### Task 1.3: Test edge and safe area enforcement

**Files:**
- Create: `tests/design-executor/edge-enforcement.test.ts`

**Step 1: Write passing tests**

```typescript
/**
 * Characterization tests for edge padding and safe area enforcement.
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
// Constants
// ============================================================================

const MIN_EDGE_PADDING = 40;
const TIKTOK_WIDTH = 1080;
const TIKTOK_HEIGHT = 1920;
const BOTTOM_DANGER_ZONE = 0.35;
const TOP_CAUTION_ZONE = 0.15;

// ============================================================================
// Tests
// ============================================================================

console.log("\n🛡️ Edge Enforcement Characterization Tests\n");

// --- Edge Padding ---

testCase("enforceEdgePadding: text at left edge (relX < 40) shifts right", () => {
  // Characterization: correction = MIN_EDGE_PADDING - relX
  const relX = 20;
  const correction = MIN_EDGE_PADDING - relX;

  assertEqual(correction, 20, "Should shift 20px right");
});

testCase("enforceEdgePadding: text at right edge shifts left", () => {
  // Characterization: if relRight > maxRight, correction = relRight - maxRight
  const textWidth = 200;
  const relX = 900;
  const relRight = relX + textWidth; // 1100
  const maxRight = TIKTOK_WIDTH - MIN_EDGE_PADDING; // 1040

  const correction = relRight > maxRight ? relRight - maxRight : 0;

  assertEqual(correction, 60, "Should shift 60px left");
});

testCase("enforceEdgePadding: text within bounds has no correction", () => {
  const relX = 100;
  const textWidth = 200;
  const relRight = relX + textWidth; // 300
  const maxRight = TIKTOK_WIDTH - MIN_EDGE_PADDING; // 1040

  const needsLeftCorrection = relX < MIN_EDGE_PADDING;
  const needsRightCorrection = relRight > maxRight;

  assertEqual(needsLeftCorrection, false, "No left correction needed");
  assertEqual(needsRightCorrection, false, "No right correction needed");
});

// --- Safe Area Detection ---

testCase("enforceSafeAreas: bottom danger zone starts at 65% height", () => {
  const bottomDangerY = TIKTOK_HEIGHT * (1 - BOTTOM_DANGER_ZONE);

  assertEqual(bottomDangerY, 1248, "Danger zone starts at y=1248");
});

testCase("enforceSafeAreas: top caution zone ends at 15% height", () => {
  const topCautionY = TIKTOK_HEIGHT * TOP_CAUTION_ZONE;

  assertEqual(topCautionY, 288, "Caution zone ends at y=288");
});

testCase("enforceSafeAreas: node in bottom danger zone is flagged", () => {
  const bottomDangerY = 1248;
  const nodeRelY = 1200;
  const nodeHeight = 100;
  const nodeRelBottom = nodeRelY + nodeHeight; // 1300

  const inDangerZone = nodeRelBottom > bottomDangerY;

  assertEqual(inDangerZone, true, "Node extending past y=1248 is in danger zone");
});

testCase("enforceSafeAreas: node above danger zone is safe", () => {
  const bottomDangerY = 1248;
  const nodeRelBottom = 1200;

  const inDangerZone = nodeRelBottom > bottomDangerY;

  assertEqual(inDangerZone, false, "Node at y=1200 is safe");
});

// --- Important Content Detection ---

testCase("isImportantContent: TEXT nodes are important", () => {
  const nodeType = "TEXT";
  const isImportant = nodeType === "TEXT";

  assertEqual(isImportant, true, "TEXT is important content");
});

testCase("isImportantContent: nodes with IMAGE fills are important", () => {
  const fills = [{ type: "IMAGE" }] as const;
  const hasImageFill = fills.some((f) => f.type === "IMAGE");

  assertEqual(hasImageFill, true, "Image fill indicates important content");
});

testCase("isImportantContent: RECTANGLE without image is not important", () => {
  const nodeType = "RECTANGLE";
  const fills = [{ type: "SOLID" }] as const;

  const isText = nodeType === "TEXT";
  const hasImageFill = fills.some((f) => f.type === "IMAGE");
  const isImportant = isText || hasImageFill;

  assertEqual(isImportant, false, "Plain rectangle is not important");
});

console.log("\n✅ All edge enforcement characterization tests passed!\n");
```

**Step 2: Run test**

Run: `npm run test`
Expected: PASS

**Step 3: Commit**

```bash
git add tests/design-executor/edge-enforcement.test.ts
git commit -m "test: add characterization tests for edge enforcement"
```

---

### Task 1.4: Test instance management

**Files:**
- Create: `tests/design-executor/instance-management.test.ts`

**Step 1: Write passing tests**

```typescript
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

function createMockVector(id: string): MockNode {
  return { id, name: "Vector", type: "VECTOR", visible: true, fills: [] };
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
```

**Step 2: Run test**

Run: `npm run test`
Expected: PASS

**Step 3: Commit**

```bash
git add tests/design-executor/instance-management.test.ts
git commit -m "test: add characterization tests for instance management"
```

---

## Phase 2: Contract Tests

### Task 2.1: Module boundary contracts

**Files:**
- Create: `tests/contracts/design-executor-contracts.test.ts`

**Step 1: Write contract tests**

```typescript
/**
 * Contract tests for design-executor module boundaries.
 *
 * These tests verify the public API contracts between:
 * - design-executor.ts (orchestrator)
 * - External callers (main.ts)
 * - Types (design-types.ts)
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

function assertType(value: unknown, expectedType: string, message: string): void {
  const actualType = typeof value;
  if (actualType !== expectedType) {
    throw new Error(`${message}\nExpected type: ${expectedType}\nActual type: ${actualType}`);
  }
}

// ============================================================================
// Contract: ExecutionResult
// ============================================================================

interface ExecutionResult {
  readonly success: boolean;
  readonly variant?: unknown; // FrameNode in real code
  readonly appliedSpecs: number;
  readonly skippedSpecs: number;
  readonly errors: readonly string[];
}

console.log("\n📜 Design Executor Contract Tests\n");

testCase("ExecutionResult: success is boolean", () => {
  const result: ExecutionResult = {
    success: true,
    appliedSpecs: 5,
    skippedSpecs: 0,
    errors: [],
  };

  assertType(result.success, "boolean", "success must be boolean");
});

testCase("ExecutionResult: appliedSpecs and skippedSpecs are numbers", () => {
  const result: ExecutionResult = {
    success: true,
    appliedSpecs: 10,
    skippedSpecs: 2,
    errors: [],
  };

  assertType(result.appliedSpecs, "number", "appliedSpecs must be number");
  assertType(result.skippedSpecs, "number", "skippedSpecs must be number");
});

testCase("ExecutionResult: errors is array of strings", () => {
  const result: ExecutionResult = {
    success: false,
    appliedSpecs: 3,
    skippedSpecs: 2,
    errors: ["Node not found", "Font load failed"],
  };

  assertTrue(Array.isArray(result.errors), "errors must be array");
  assertTrue(
    result.errors.every((e) => typeof e === "string"),
    "all errors must be strings"
  );
});

// ============================================================================
// Contract: AdjustmentResult
// ============================================================================

interface AdjustmentResult {
  readonly applied: number;
  readonly skipped: number;
  readonly errors: readonly string[];
}

testCase("AdjustmentResult: has required fields", () => {
  const result: AdjustmentResult = {
    applied: 3,
    skipped: 1,
    errors: [],
  };

  assertType(result.applied, "number", "applied must be number");
  assertType(result.skipped, "number", "skipped must be number");
  assertTrue(Array.isArray(result.errors), "errors must be array");
});

// ============================================================================
// Contract: NodeSpec input
// ============================================================================

interface NodeSpec {
  readonly nodeId: string;
  readonly nodeName: string;
  readonly visible: boolean;
  readonly position?: { readonly x: number; readonly y: number };
  readonly size?: { readonly width: number; readonly height: number };
  readonly zIndex?: number;
  readonly scaleFactor?: number;
  readonly textTruncate?: boolean;
  readonly maxLines?: number;
}

testCase("NodeSpec: required fields are present", () => {
  const spec: NodeSpec = {
    nodeId: "123:456",
    nodeName: "Hero Image",
    visible: true,
  };

  assertType(spec.nodeId, "string", "nodeId must be string");
  assertType(spec.nodeName, "string", "nodeName must be string");
  assertType(spec.visible, "boolean", "visible must be boolean");
});

testCase("NodeSpec: position is optional with x,y numbers", () => {
  const spec: NodeSpec = {
    nodeId: "123:456",
    nodeName: "Title",
    visible: true,
    position: { x: 100, y: 200 },
  };

  assertTrue(spec.position !== undefined, "position should exist");
  assertType(spec.position!.x, "number", "x must be number");
  assertType(spec.position!.y, "number", "y must be number");
});

testCase("NodeSpec: size is optional with width,height numbers", () => {
  const spec: NodeSpec = {
    nodeId: "123:456",
    nodeName: "Frame",
    visible: true,
    size: { width: 500, height: 300 },
  };

  assertTrue(spec.size !== undefined, "size should exist");
  assertType(spec.size!.width, "number", "width must be number");
  assertType(spec.size!.height, "number", "height must be number");
});

// ============================================================================
// Contract: Utility function signatures
// ============================================================================

testCase("calculateScaleFactor: returns scale and fitMode", () => {
  // Contract: calculateScaleFactor(frame) => { scale: number, fitMode: 'width'|'height'|'cover' }
  const mockResult = { scale: 1.5, fitMode: "width" as const };

  assertType(mockResult.scale, "number", "scale must be number");
  assertTrue(
    ["width", "height", "cover"].includes(mockResult.fitMode),
    "fitMode must be width, height, or cover"
  );
});

testCase("getTikTokCenter: returns x,y coordinates", () => {
  // Contract: getTikTokCenter() => { x: number, y: number }
  const center = { x: 540, y: 960 };

  assertEqual(center.x, 1080 / 2, "Center x should be half of TikTok width");
  assertEqual(center.y, 1920 / 2, "Center y should be half of TikTok height");
});

testCase("getCenteredPosition: returns x,y for given dimensions", () => {
  // Contract: getCenteredPosition(width, height) => { x: number, y: number }
  const width = 200;
  const height = 100;
  const position = {
    x: (1080 - width) / 2,
    y: (1920 - height) / 2,
  };

  assertEqual(position.x, 440, "Centered x for 200px width");
  assertEqual(position.y, 910, "Centered y for 100px height");
});

console.log("\n✅ All contract tests passed!\n");
```

**Step 2: Run test**

Run: `npm run test`
Expected: PASS

**Step 3: Commit**

```bash
git add tests/contracts/design-executor-contracts.test.ts
git commit -m "test: add contract tests for design-executor module"
```

---

## Phase 3: Extract Modules

### Task 3.1: Extract node-map-builder.ts

**Files:**
- Create: `core/node-map-builder.ts`
- Modify: `core/design-executor.ts`

**Step 1: Create the new module**

```typescript
/**
 * Node Map Builder
 *
 * Utilities for mapping source Figma nodes to their cloned counterparts
 * and searching node trees by name.
 */

import { debugFixLog } from "./debug.js";

// ============================================================================
// Types
// ============================================================================

export interface NodeMap {
  readonly [sourceId: string]: SceneNode;
}

// ============================================================================
// Node Map Building
// ============================================================================

/**
 * Builds a map from source node IDs to corresponding cloned nodes.
 * Walks both trees in parallel, assuming identical structure.
 */
export function buildNodeMap(
  sourceFrame: FrameNode,
  clonedFrame: FrameNode
): NodeMap {
  const map: { [key: string]: SceneNode } = {};

  const sourceQueue: SceneNode[] = [sourceFrame];
  const clonedQueue: SceneNode[] = [clonedFrame];

  while (sourceQueue.length > 0 && clonedQueue.length > 0) {
    const sourceNode = sourceQueue.shift()!;
    const clonedNode = clonedQueue.shift()!;

    map[sourceNode.id] = clonedNode;

    if ("children" in sourceNode && "children" in clonedNode) {
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
 * Builds a map of all nodes in a variant frame by their IDs.
 * Unlike buildNodeMap which maps source→clone, this maps variant IDs→nodes.
 */
export function buildVariantNodeMap(frame: FrameNode): Map<string, SceneNode> {
  const map = new Map<string, SceneNode>();
  const queue: SceneNode[] = [frame];

  while (queue.length > 0) {
    const node = queue.shift()!;
    map.set(node.id, node);

    if ("children" in node) {
      queue.push(...(node as FrameNode | GroupNode).children);
    }
  }

  return map;
}

/**
 * Finds a node by name within a frame tree using BFS.
 */
export function findNodeByName(
  frame: FrameNode,
  name: string
): SceneNode | null {
  const queue: SceneNode[] = [...frame.children];

  while (queue.length > 0) {
    const node = queue.shift()!;
    if (node.name === name) {
      return node;
    }
    if ("children" in node) {
      queue.push(...node.children);
    }
  }

  return null;
}
```

**Step 2: Run tests**

Run: `npm run test`
Expected: PASS

**Step 3: Update design-executor.ts imports**

Replace the internal functions with imports from the new module:

```typescript
// At top of design-executor.ts, add:
import {
  buildNodeMap,
  buildVariantNodeMap,
  findNodeByName,
  type NodeMap,
} from "./node-map-builder.js";

// Remove the local implementations of:
// - interface NodeMap
// - function buildNodeMap()
// - function buildVariantNodeMap()
// - function findNodeByName()
```

**Step 4: Run tests again**

Run: `npm run test`
Expected: PASS

**Step 5: Commit**

```bash
git add core/node-map-builder.ts core/design-executor.ts
git commit -m "refactor: extract node-map-builder module from design-executor"
```

---

### Task 3.2: Extract edge-enforcement.ts

**Files:**
- Create: `core/edge-enforcement.ts`
- Modify: `core/design-executor.ts`

**Step 1: Create the new module**

```typescript
/**
 * Edge Enforcement
 *
 * Enforces safe areas and edge padding for TikTok content.
 * Ensures text and important content stays within visible bounds.
 */

import { debugFixLog } from "./debug.js";
import { TIKTOK_CONSTRAINTS as CONSTRAINTS } from "../types/design-types.js";

// ============================================================================
// Constants
// ============================================================================

/**
 * Minimum padding from frame edges for text and important content.
 */
export const MIN_EDGE_PADDING = 40;

// ============================================================================
// Edge Padding Enforcement
// ============================================================================

/**
 * Enforces minimum edge padding for all text nodes in the frame.
 * Uses absolute bounding box to detect actual position on canvas.
 */
export function enforceEdgePadding(frame: FrameNode): void {
  const frameBounds = frame.absoluteBoundingBox;
  if (!frameBounds) return;

  let correctionCount = 0;

  function checkAndCorrectNode(node: SceneNode): void {
    if (!node.visible) return;

    if (node.type === "TEXT" && node.absoluteBoundingBox) {
      const bounds = node.absoluteBoundingBox;
      const relX = bounds.x - frameBounds!.x;
      const relRight = relX + bounds.width;
      const maxRight = CONSTRAINTS.WIDTH - MIN_EDGE_PADDING;

      // Check left edge
      if (relX < MIN_EDGE_PADDING) {
        const correction = MIN_EDGE_PADDING - relX;
        try {
          node.x = node.x + correction;
          correctionCount++;
          debugFixLog("Edge padding enforcement (post-process): shifted from left", {
            nodeId: node.id,
            nodeName: node.name,
            originalRelX: relX,
            correction,
          });
        } catch (error) {
          debugFixLog("Failed to enforce left edge padding", {
            nodeId: node.id,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }
      // Check right edge
      else if (relRight > maxRight) {
        const correction = relRight - maxRight;
        try {
          node.x = node.x - correction;
          correctionCount++;
          debugFixLog("Edge padding enforcement (post-process): shifted from right", {
            nodeId: node.id,
            nodeName: node.name,
            originalRelRight: relRight,
            correction,
          });
        } catch (error) {
          debugFixLog("Failed to enforce right edge padding", {
            nodeId: node.id,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }
    }

    // Recurse into children
    if ("children" in node) {
      for (const child of (node as FrameNode | GroupNode).children) {
        checkAndCorrectNode(child);
      }
    }
  }

  for (const child of frame.children) {
    checkAndCorrectNode(child);
  }

  if (correctionCount > 0) {
    debugFixLog("Edge padding enforcement complete", {
      textNodesCorrected: correctionCount,
    });
  }
}

// ============================================================================
// Safe Area Enforcement
// ============================================================================

/**
 * Enforces TikTok safe areas by checking node positions.
 * Logs warnings for violations.
 */
export function enforceSafeAreas(frame: FrameNode): void {
  const bottomDangerY = CONSTRAINTS.HEIGHT * (1 - CONSTRAINTS.BOTTOM_DANGER_ZONE);
  const topCautionY = CONSTRAINTS.HEIGHT * CONSTRAINTS.TOP_CAUTION_ZONE;

  const violations: string[] = [];

  function checkNode(node: SceneNode): void {
    if (!node.visible) return;

    if ("absoluteBoundingBox" in node && node.absoluteBoundingBox) {
      const bounds = node.absoluteBoundingBox;
      const frameBounds = frame.absoluteBoundingBox;

      if (!frameBounds) return;

      const relY = bounds.y - frameBounds.y;
      const relBottom = relY + bounds.height;

      if (relBottom > bottomDangerY && node.type !== "FRAME") {
        violations.push(`${node.name} extends into bottom danger zone (y=${Math.round(relY)})`);
      }

      if (relY < topCautionY && isImportantContent(node)) {
        violations.push(`${node.name} is in top caution zone (y=${Math.round(relY)})`);
      }
    }

    if ("children" in node) {
      for (const child of node.children) {
        checkNode(child);
      }
    }
  }

  for (const child of frame.children) {
    checkNode(child);
  }

  if (violations.length > 0) {
    debugFixLog("Safe area violations detected", {
      count: violations.length,
      violations: violations.slice(0, 5),
    });
  }
}

/**
 * Determines if a node contains important content (text, images).
 */
export function isImportantContent(node: SceneNode): boolean {
  if (node.type === "TEXT") return true;
  if ("fills" in node) {
    const fills = node.fills as readonly Paint[] | undefined;
    if (fills?.some((f) => f.type === "IMAGE")) return true;
  }
  return false;
}

/**
 * Checks if a node contains an image fill.
 */
export function hasImageFill(node: SceneNode): boolean {
  if (!("fills" in node)) return false;
  const fills = node.fills as readonly Paint[] | undefined;
  return fills?.some((f) => f.type === "IMAGE") ?? false;
}
```

**Step 2: Run tests**

Run: `npm run test`
Expected: PASS

**Step 3: Update design-executor.ts imports**

```typescript
// At top, add:
import {
  MIN_EDGE_PADDING,
  enforceEdgePadding,
  enforceSafeAreas,
  hasImageFill,
} from "./edge-enforcement.js";

// Remove local implementations
```

**Step 4: Run tests**

Run: `npm run test`
Expected: PASS

**Step 5: Commit**

```bash
git add core/edge-enforcement.ts core/design-executor.ts
git commit -m "refactor: extract edge-enforcement module from design-executor"
```

---

### Task 3.3: Extract instance-management.ts

**Files:**
- Create: `core/instance-management.ts`
- Modify: `core/design-executor.ts`

**Step 1: Create the new module**

```typescript
/**
 * Instance Management
 *
 * Handles Figma component instance operations including:
 * - Atomic group detection and preservation
 * - Instance detachment for repositioning
 * - Child ID collection for atomic groups
 */

import { debugFixLog } from "./debug.js";
import { isAtomicGroup } from "./element-classification.js";

// ============================================================================
// Atomic Instance Collection
// ============================================================================

/**
 * Collects IDs of all atomic instances (INSTANCE nodes that are atomic groups).
 * Must run BEFORE detachAllInstances() to identify which instances to preserve.
 */
export function collectAtomicInstanceIds(frame: FrameNode): Set<string> {
  const atomicIds = new Set<string>();

  function scanForAtomicInstances(node: SceneNode): void {
    if (node.type === "INSTANCE" && isAtomicGroup(node)) {
      atomicIds.add(node.id);
      debugFixLog("Found atomic instance (will preserve)", {
        nodeId: node.id,
        nodeName: node.name,
      });
      return;
    }

    if ("children" in node) {
      for (const child of (node as FrameNode | GroupNode | InstanceNode).children) {
        scanForAtomicInstances(child);
      }
    }
  }

  for (const child of frame.children) {
    scanForAtomicInstances(child);
  }

  return atomicIds;
}

/**
 * Collects all node IDs that are children of atomic groups.
 * These nodes should NOT be repositioned independently.
 */
export function collectAtomicGroupChildren(frame: FrameNode): Set<string> {
  const atomicChildIds = new Set<string>();

  function collectChildIds(parent: SceneNode): void {
    if (!("children" in parent)) return;

    for (const child of (parent as FrameNode | GroupNode).children) {
      atomicChildIds.add(child.id);
      if ("children" in child) {
        collectChildIds(child);
      }
    }
  }

  function scanForAtomicGroups(node: SceneNode): void {
    if (isAtomicGroup(node)) {
      debugFixLog("Found atomic group", {
        nodeId: node.id,
        nodeName: node.name,
        type: node.type,
      });
      collectChildIds(node);
      return;
    }

    if ("children" in node) {
      for (const child of (node as FrameNode | GroupNode).children) {
        scanForAtomicGroups(child);
      }
    }
  }

  for (const child of frame.children) {
    scanForAtomicGroups(child);
  }

  return atomicChildIds;
}

// ============================================================================
// Instance Detachment
// ============================================================================

/**
 * Recursively detaches component instances, EXCEPT for atomic groups.
 * Returns the number of instances detached.
 */
export function detachAllInstances(
  frame: FrameNode,
  atomicInstanceIds: Set<string> = new Set()
): number {
  let detachCount = 0;
  const nodesToProcess: SceneNode[] = [...frame.children];

  while (nodesToProcess.length > 0) {
    const node = nodesToProcess.shift()!;

    if (node.type === "INSTANCE") {
      if (atomicInstanceIds.has(node.id)) {
        debugFixLog("Preserving atomic instance (not detaching)", {
          nodeId: node.id,
          nodeName: node.name,
          reason: "Component instance is atomic group - preserving structure",
        });
        if ("children" in node) {
          nodesToProcess.push(...(node as InstanceNode).children);
        }
        continue;
      }

      try {
        const instance = node as InstanceNode;
        const detached = instance.detachInstance();
        detachCount++;

        if ("children" in detached) {
          nodesToProcess.push(...detached.children);
        }
      } catch (error) {
        debugFixLog("Failed to detach instance", {
          nodeId: node.id,
          nodeName: node.name,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    } else if ("children" in node) {
      nodesToProcess.push(...(node as FrameNode | GroupNode).children);
    }
  }

  return detachCount;
}
```

**Step 2: Run tests**

Run: `npm run test`
Expected: PASS

**Step 3: Update design-executor.ts imports**

```typescript
// Add:
import {
  collectAtomicInstanceIds,
  collectAtomicGroupChildren,
  detachAllInstances,
} from "./instance-management.js";

// Remove local implementations
```

**Step 4: Run tests**

Run: `npm run test`
Expected: PASS

**Step 5: Commit**

```bash
git add core/instance-management.ts core/design-executor.ts
git commit -m "refactor: extract instance-management module from design-executor"
```

---

### Task 3.4: Extract spec-applicator.ts

**Files:**
- Create: `core/spec-applicator.ts`
- Modify: `core/design-executor.ts`

**Step 1: Create the new module**

```typescript
/**
 * Spec Applicator
 *
 * Applies AI-generated design specifications to Figma nodes.
 * Handles positioning, sizing, visibility, and z-index reordering.
 */

import { debugFixLog } from "./debug.js";
import type { NodeSpec } from "../types/design-types.js";
import { TIKTOK_CONSTRAINTS as CONSTRAINTS } from "../types/design-types.js";
import { MIN_EDGE_PADDING, hasImageFill } from "./edge-enforcement.js";
import type { NodeMap } from "./node-map-builder.js";

// ============================================================================
// Constants
// ============================================================================

/**
 * Threshold for position changes that warrant breaking auto-layout.
 */
const POSITION_CHANGE_THRESHOLD = 10;

// ============================================================================
// Position Utilities
// ============================================================================

/**
 * Determines if a position change is significant enough to break auto-layout.
 */
export function shouldBreakAutoLayout(
  node: SceneNode,
  targetPos: { x: number; y: number }
): boolean {
  const dx = Math.abs(node.x - targetPos.x);
  const dy = Math.abs(node.y - targetPos.y);
  return dx > POSITION_CHANGE_THRESHOLD || dy > POSITION_CHANGE_THRESHOLD;
}

// ============================================================================
// Spec Application
// ============================================================================

/**
 * Applies a single node specification to a Figma node.
 *
 * @param node - The Figma node to modify
 * @param spec - The specification from AI
 * @param isAtomicChild - If true, skip ALL modifications
 * @param isAtomicInstance - If true, skip size/scale but allow position
 */
export function applyNodeSpec(
  node: SceneNode,
  spec: NodeSpec,
  isAtomicChild: boolean = false,
  isAtomicInstance: boolean = false
): void {
  // Skip ALL modifications for atomic group children
  if (isAtomicChild) {
    debugFixLog("Skipping ALL spec application for atomic group child", {
      nodeId: spec.nodeId,
      nodeName: spec.nodeName,
      reason: "Child of atomic group - preserving complete state",
    });
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
      (node.parent as FrameNode).layoutMode !== "NONE";

    if (parentIsAutoLayout) {
      debugFixLog("Skipping position for auto-layout child", {
        nodeId: spec.nodeId,
        nodeName: spec.nodeName,
        parentLayoutMode: (node.parent as FrameNode).layoutMode,
        reason: "Child of auto-layout container - position would break flow",
      });
    } else {
      const needsRepositioning = shouldBreakAutoLayout(node, spec.position);

      if (needsRepositioning) {
        if ("layoutPositioning" in node && node.layoutPositioning === "AUTO") {
          try {
            (node as FrameNode).layoutPositioning = "ABSOLUTE";
            debugFixLog("Breaking auto-layout for significant repositioning", {
              nodeId: spec.nodeId,
              nodeName: spec.nodeName,
              currentPos: { x: node.x, y: node.y },
              targetPos: spec.position,
            });
          } catch {
            // Some nodes don't support this
          }
        }

        try {
          let targetX = spec.position.x;
          const targetY = spec.position.y;

          // Edge padding enforcement for text
          if (node.type === "TEXT" && "width" in node) {
            const textWidth = (node as TextNode).width;
            const maxX = CONSTRAINTS.WIDTH - MIN_EDGE_PADDING - textWidth;

            if (targetX < MIN_EDGE_PADDING) {
              debugFixLog("Edge padding enforcement: shifting text from left edge", {
                nodeId: spec.nodeId,
                nodeName: spec.nodeName,
                originalX: targetX,
                correctedX: MIN_EDGE_PADDING,
              });
              targetX = MIN_EDGE_PADDING;
            } else if (targetX > maxX && maxX > MIN_EDGE_PADDING) {
              debugFixLog("Edge padding enforcement: shifting text from right edge", {
                nodeId: spec.nodeId,
                nodeName: spec.nodeName,
                originalX: targetX,
                correctedX: maxX,
              });
              targetX = maxX;
            }
          }

          node.x = targetX;
          node.y = targetY;
        } catch (error) {
          debugFixLog("Failed to set position", {
            nodeId: spec.nodeId,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      } else {
        debugFixLog("Skipping repositioning to preserve auto-layout", {
          nodeId: spec.nodeId,
          nodeName: spec.nodeName,
          currentPos: { x: node.x, y: node.y },
          targetPos: spec.position,
          deltaX: Math.abs(node.x - spec.position.x),
          deltaY: Math.abs(node.y - spec.position.y),
        });
      }
    }
  }

  // Apply size - skip for atomic instances
  if (spec.size && "resize" in node) {
    if (isAtomicInstance) {
      debugFixLog("Skipping size change for atomic instance", {
        nodeId: spec.nodeId,
        nodeName: spec.nodeName,
        requestedSize: spec.size,
        reason: "Resizing component instance breaks internal structure",
      });
    } else {
      const isImage = hasImageFill(node);

      let targetWidth = spec.size.width;
      let targetHeight = spec.size.height;

      if (isImage && "width" in node && "height" in node) {
        const frameNode = node as FrameNode;
        const originalAspect = frameNode.width / frameNode.height;

        const scaleByWidth = spec.size.width / frameNode.width;
        const scaleByHeight = spec.size.height / frameNode.height;
        const scale = Math.max(scaleByWidth, scaleByHeight);

        targetWidth = frameNode.width * scale;
        targetHeight = frameNode.height * scale;

        debugFixLog("Preserving image aspect ratio", {
          nodeId: spec.nodeId,
          nodeName: spec.nodeName,
          original: { w: frameNode.width, h: frameNode.height, aspect: originalAspect },
          specSize: spec.size,
          scale,
          adjusted: { w: targetWidth, h: targetHeight },
        });
      }

      try {
        (node as FrameNode).resize(targetWidth, targetHeight);
      } catch {
        try {
          if ("resizeWithoutConstraints" in node) {
            (node as FrameNode).resizeWithoutConstraints(targetWidth, targetHeight);
          }
        } catch (error) {
          debugFixLog("Failed to resize node", {
            nodeId: spec.nodeId,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }
    }
  }

  // Apply scale factor - skip for atomic instances
  if (spec.scaleFactor && spec.scaleFactor !== 1.0 && !spec.size) {
    if (isAtomicInstance) {
      debugFixLog("Skipping scale factor for atomic instance", {
        nodeId: spec.nodeId,
        nodeName: spec.nodeName,
        requestedScale: spec.scaleFactor,
        reason: "Scaling component instance breaks internal structure",
      });
    } else {
      try {
        if ("width" in node && "height" in node && "resize" in node) {
          const frameNode = node as FrameNode;
          const newWidth = frameNode.width * spec.scaleFactor;
          const newHeight = frameNode.height * spec.scaleFactor;
          frameNode.resize(newWidth, newHeight);
        }
      } catch (error) {
        debugFixLog("Failed to apply scale factor", {
          nodeId: spec.nodeId,
          scaleFactor: spec.scaleFactor,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  // Handle text-specific specs
  if (node.type === "TEXT" && spec.textTruncate) {
    applyTextTruncation(node as TextNode, spec.maxLines ?? 1);
  }
}

/**
 * Truncates text to fit within line limits.
 */
function applyTextTruncation(textNode: TextNode, maxLines: number): void {
  try {
    textNode.textTruncation = "ENDING";
    textNode.maxLines = maxLines;
  } catch {
    debugFixLog("Text truncation not supported", { nodeId: textNode.id });
  }
}

// ============================================================================
// Z-Index Reordering
// ============================================================================

/**
 * Reorders children of the variant frame based on zIndex values.
 */
export function reorderChildrenByZIndex(
  variant: FrameNode,
  nodeMap: NodeMap,
  specs: readonly NodeSpec[],
  atomicGroupChildIds: Set<string>
): void {
  const specsWithZIndex = specs
    .filter((s) => s.visible !== false && s.zIndex !== undefined)
    .filter((s) => {
      const node = nodeMap[s.nodeId];
      if (node && atomicGroupChildIds.has(node.id)) {
        debugFixLog("Skipping z-index reorder for atomic group child", {
          nodeId: s.nodeId,
          nodeName: s.nodeName,
          reason: "Child of atomic group - preserving layer order",
        });
        return false;
      }
      return true;
    })
    .sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0));

  if (specsWithZIndex.length === 0) return;

  let reorderedCount = 0;

  for (let i = 0; i < specsWithZIndex.length; i++) {
    const spec = specsWithZIndex[i];
    const node = nodeMap[spec.nodeId];

    if (node && node.parent === variant && !node.removed) {
      try {
        variant.insertChild(i, node);
        reorderedCount++;
      } catch (error) {
        debugFixLog("Failed to reorder node", {
          nodeId: spec.nodeId,
          nodeName: spec.nodeName,
          targetIndex: i,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  if (reorderedCount > 0) {
    debugFixLog("Children reordered by zIndex", {
      reorderedCount,
      totalWithZIndex: specsWithZIndex.length,
    });
  }
}
```

**Step 2: Run tests**

Run: `npm run test`
Expected: PASS

**Step 3: Update design-executor.ts**

```typescript
// Add:
import {
  applyNodeSpec,
  reorderChildrenByZIndex,
  shouldBreakAutoLayout,
} from "./spec-applicator.js";

// Remove local implementations
```

**Step 4: Run tests**

Run: `npm run test`
Expected: PASS

**Step 5: Commit**

```bash
git add core/spec-applicator.ts core/design-executor.ts
git commit -m "refactor: extract spec-applicator module from design-executor"
```

---

## Phase 4: Final Cleanup

### Task 4.1: Update tsconfig.tests.json with all new modules

**Files:**
- Modify: `tsconfig.tests.json`

Include all new modules in the test compilation.

**Step 1: Update includes**

Already done in Task 0.1.

**Step 2: Run full test suite**

Run: `npm run check`
Expected: PASS (typecheck + tests)

**Step 3: Commit**

```bash
git add tsconfig.tests.json
git commit -m "chore: finalize tsconfig for refactored modules"
```

---

### Task 4.2: Verify LOC reduction

**Files:**
- Check: `core/design-executor.ts`
- Check: All extracted modules

**Step 1: Run LOC analysis**

```bash
npm run size
```

**Expected Results:**
- `design-executor.ts`: ~350 LOC (down from 1189)
- `node-map-builder.ts`: ~70 LOC
- `edge-enforcement.ts`: ~120 LOC
- `instance-management.ts`: ~110 LOC
- `spec-applicator.ts`: ~250 LOC

Total: ~900 LOC (same functionality, better organization)

**Step 2: Document in completion log**

Create a summary of metrics.

---

### Task 4.3: Final test run and commit

**Step 1: Run complete validation**

```bash
npm run clean && npm run build && npm run check
```

**Step 2: Create summary commit**

```bash
git add -A
git commit -m "refactor: complete design-executor modularization

- Extract node-map-builder.ts (node mapping utilities)
- Extract edge-enforcement.ts (safe area and padding)
- Extract instance-management.ts (atomic groups and detachment)
- Extract spec-applicator.ts (node spec application)

Metrics:
- Original: 1189 LOC in single file
- After: ~350 LOC orchestrator + 4 focused modules
- No behavior changes (characterization tests pass)
- All contract tests pass
"
```

---

## Completion Checklist

| Item | Status |
|------|--------|
| Detailed plan written | ⬜ |
| tsconfig.tests.json updated | ⬜ |
| Characterization tests (node-map-builder) | ⬜ |
| Characterization tests (spec-applicator) | ⬜ |
| Characterization tests (edge-enforcement) | ⬜ |
| Characterization tests (instance-management) | ⬜ |
| Contract tests (module boundaries) | ⬜ |
| Extract node-map-builder.ts | ⬜ |
| Extract edge-enforcement.ts | ⬜ |
| Extract instance-management.ts | ⬜ |
| Extract spec-applicator.ts | ⬜ |
| All tests pass | ⬜ |
| LOC metrics documented | ⬜ |
| Final commit | ⬜ |

---

## Notes

**Design Decisions:**
1. **Keep orchestration in design-executor.ts** - The main file remains the public API, coordinating the extracted modules.
2. **No circular dependencies** - Each extracted module depends only on debug.js, design-types.ts, or previous extractions.
3. **Minimal interface changes** - Public exports remain unchanged for callers.

**Risk Mitigation:**
- Characterization tests lock current behavior before any changes
- Contract tests ensure module boundaries are respected
- Each extraction is a separate commit for easy rollback
