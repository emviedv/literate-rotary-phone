/**
 * Test Stub Factories for Figma Nodes
 *
 * These create minimal stub objects that satisfy the type requirements
 * for testing design-executor.ts functions without the Figma runtime.
 */

// ============================================================================
// Test Utilities
// ============================================================================

export function assert(condition: unknown, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

export function testCase(name: string, fn: () => void | Promise<void>): void {
  const runTest = async () => {
    try {
      await fn();
      console.log(`✅ ${name}`);
    } catch (error) {
      console.error(`❌ ${name}`);
      throw error;
    }
  };

  // Handle both sync and async test functions
  const result = runTest();
  if (result instanceof Promise) {
    result.catch(() => process.exit(1));
  }
}

export function assertEqual<T>(actual: T, expected: T, message?: string): void {
  const actualStr = JSON.stringify(actual);
  const expectedStr = JSON.stringify(expected);
  if (actualStr !== expectedStr) {
    throw new Error(
      message ?? `Expected ${expectedStr} but got ${actualStr}`
    );
  }
}

// ============================================================================
// Node ID Counter
// ============================================================================

let nodeCounter = 0;

export function resetNodeCounter(): void {
  nodeCounter = 0;
}

function nextId(prefix: string): string {
  nodeCounter += 1;
  return `${prefix}-${nodeCounter}`;
}

// ============================================================================
// Stub Types
// ============================================================================

export interface StubFrameNode {
  id: string;
  name: string;
  type: "FRAME";
  visible: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
  layoutMode: "NONE" | "HORIZONTAL" | "VERTICAL";
  layoutPositioning?: "AUTO" | "ABSOLUTE";
  children: StubSceneNode[];
  parent: StubSceneNode | null;
  fills: readonly Paint[];
  absoluteBoundingBox: { x: number; y: number; width: number; height: number } | null;
  removed: boolean;
  clone: () => StubFrameNode;
  resizeWithoutConstraints: (width: number, height: number) => void;
  resize: (width: number, height: number) => void;
  insertChild: (index: number, child: StubSceneNode) => void;
}

export interface StubTextNode {
  id: string;
  name: string;
  type: "TEXT";
  visible: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
  characters: string;
  fills: readonly Paint[];
  absoluteBoundingBox: { x: number; y: number; width: number; height: number } | null;
  parent: StubSceneNode | null;
  removed: boolean;
  layoutPositioning?: "AUTO" | "ABSOLUTE";
  textTruncation?: "DISABLED" | "ENDING";
  maxLines?: number;
  getRangeAllFontNames: (start: number, end: number) => Promise<FontName[]>;
}

export interface StubInstanceNode {
  id: string;
  name: string;
  type: "INSTANCE";
  visible: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
  children: StubSceneNode[];
  parent: StubSceneNode | null;
  fills: readonly Paint[];
  absoluteBoundingBox: { x: number; y: number; width: number; height: number } | null;
  removed: boolean;
  layoutPositioning?: "AUTO" | "ABSOLUTE";
  detachInstance: () => StubFrameNode;
}

export interface StubGroupNode {
  id: string;
  name: string;
  type: "GROUP";
  visible: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
  children: StubSceneNode[];
  parent: StubSceneNode | null;
  absoluteBoundingBox: { x: number; y: number; width: number; height: number } | null;
  removed: boolean;
}

export interface StubRectangleNode {
  id: string;
  name: string;
  type: "RECTANGLE";
  visible: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
  fills: readonly Paint[];
  parent: StubSceneNode | null;
  absoluteBoundingBox: { x: number; y: number; width: number; height: number } | null;
  removed: boolean;
  layoutPositioning?: "AUTO" | "ABSOLUTE";
  resize: (width: number, height: number) => void;
  resizeWithoutConstraints: (width: number, height: number) => void;
}

export interface StubVectorNode {
  id: string;
  name: string;
  type: "VECTOR";
  visible: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
  fills: readonly Paint[];
  parent: StubSceneNode | null;
  absoluteBoundingBox: { x: number; y: number; width: number; height: number } | null;
  removed: boolean;
}

export type StubSceneNode =
  | StubFrameNode
  | StubTextNode
  | StubInstanceNode
  | StubGroupNode
  | StubRectangleNode
  | StubVectorNode;

// ============================================================================
// Stub Factories
// ============================================================================

export interface FrameNodeOverrides {
  id?: string;
  name?: string;
  visible?: boolean;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  layoutMode?: "NONE" | "HORIZONTAL" | "VERTICAL";
  layoutPositioning?: "AUTO" | "ABSOLUTE";
  children?: StubSceneNode[];
  fills?: readonly Paint[];
  parent?: StubSceneNode | null;
}

export function createFrameNode(overrides: FrameNodeOverrides = {}): StubFrameNode {
  const id = overrides.id ?? nextId("frame");
  const x = overrides.x ?? 0;
  const y = overrides.y ?? 0;
  const width = overrides.width ?? 100;
  const height = overrides.height ?? 100;

  const frame: StubFrameNode = {
    id,
    name: overrides.name ?? "Frame",
    type: "FRAME",
    visible: overrides.visible ?? true,
    x,
    y,
    width,
    height,
    layoutMode: overrides.layoutMode ?? "NONE",
    layoutPositioning: overrides.layoutPositioning,
    children: overrides.children ?? [],
    parent: overrides.parent ?? null,
    fills: overrides.fills ?? [],
    absoluteBoundingBox: { x, y, width, height },
    removed: false,
    clone: function() {
      const cloned = createFrameNode({
        ...overrides,
        id: nextId("frame"),
        name: this.name,
        x: this.x,
        y: this.y,
        width: this.width,
        height: this.height,
        layoutMode: this.layoutMode,
        children: this.children.map(child => cloneNode(child)),
        fills: [...this.fills],
      });
      // Set parent references for cloned children
      cloned.children.forEach(child => {
        (child as StubSceneNode).parent = cloned as unknown as StubSceneNode;
      });
      return cloned;
    },
    resizeWithoutConstraints: function(w: number, h: number) {
      this.width = w;
      this.height = h;
      if (this.absoluteBoundingBox) {
        this.absoluteBoundingBox.width = w;
        this.absoluteBoundingBox.height = h;
      }
    },
    resize: function(w: number, h: number) {
      this.resizeWithoutConstraints(w, h);
    },
    insertChild: function(index: number, child: StubSceneNode) {
      // Remove from current position if already in children
      const currentIndex = this.children.indexOf(child);
      if (currentIndex !== -1) {
        this.children.splice(currentIndex, 1);
        // Adjust index if removing from before target position
        if (currentIndex < index) {
          index--;
        }
      }
      this.children.splice(index, 0, child);
      child.parent = this as unknown as StubSceneNode;
    },
  };

  // Set parent references
  frame.children.forEach(child => {
    child.parent = frame as unknown as StubSceneNode;
  });

  return frame;
}

export interface TextNodeOverrides {
  id?: string;
  name?: string;
  visible?: boolean;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  characters?: string;
  fills?: readonly Paint[];
  parent?: StubSceneNode | null;
  layoutPositioning?: "AUTO" | "ABSOLUTE";
}

export function createTextNode(overrides: TextNodeOverrides = {}): StubTextNode {
  const id = overrides.id ?? nextId("text");
  const x = overrides.x ?? 0;
  const y = overrides.y ?? 0;
  const width = overrides.width ?? 100;
  const height = overrides.height ?? 20;

  return {
    id,
    name: overrides.name ?? "Text",
    type: "TEXT",
    visible: overrides.visible ?? true,
    x,
    y,
    width,
    height,
    characters: overrides.characters ?? "Sample text",
    fills: overrides.fills ?? [],
    absoluteBoundingBox: { x, y, width, height },
    parent: overrides.parent ?? null,
    removed: false,
    layoutPositioning: overrides.layoutPositioning,
    getRangeAllFontNames: async () => [{ family: "Inter", style: "Regular" }],
  };
}

export interface InstanceNodeOverrides {
  id?: string;
  name?: string;
  visible?: boolean;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  children?: StubSceneNode[];
  fills?: readonly Paint[];
  parent?: StubSceneNode | null;
  isAtomicGroup?: boolean; // For testing isAtomicGroup behavior
}

export function createInstanceNode(overrides: InstanceNodeOverrides = {}): StubInstanceNode {
  const id = overrides.id ?? nextId("instance");
  const x = overrides.x ?? 0;
  const y = overrides.y ?? 0;
  const width = overrides.width ?? 100;
  const height = overrides.height ?? 100;

  const instance: StubInstanceNode = {
    id,
    name: overrides.name ?? "Instance",
    type: "INSTANCE",
    visible: overrides.visible ?? true,
    x,
    y,
    width,
    height,
    children: overrides.children ?? [],
    parent: overrides.parent ?? null,
    fills: overrides.fills ?? [],
    absoluteBoundingBox: { x, y, width, height },
    removed: false,
    detachInstance: function() {
      // Convert instance to frame
      const frame = createFrameNode({
        id: this.id, // Keep same ID
        name: this.name,
        x: this.x,
        y: this.y,
        width: this.width,
        height: this.height,
        children: this.children,
        fills: this.fills,
        parent: this.parent,
      });
      return frame;
    },
  };

  // Set parent references
  instance.children.forEach(child => {
    child.parent = instance as unknown as StubSceneNode;
  });

  return instance;
}

export interface GroupNodeOverrides {
  id?: string;
  name?: string;
  visible?: boolean;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  children?: StubSceneNode[];
  parent?: StubSceneNode | null;
}

export function createGroupNode(overrides: GroupNodeOverrides = {}): StubGroupNode {
  const id = overrides.id ?? nextId("group");
  const x = overrides.x ?? 0;
  const y = overrides.y ?? 0;
  const width = overrides.width ?? 100;
  const height = overrides.height ?? 100;

  const group: StubGroupNode = {
    id,
    name: overrides.name ?? "Group",
    type: "GROUP",
    visible: overrides.visible ?? true,
    x,
    y,
    width,
    height,
    children: overrides.children ?? [],
    parent: overrides.parent ?? null,
    absoluteBoundingBox: { x, y, width, height },
    removed: false,
  };

  // Set parent references
  group.children.forEach(child => {
    child.parent = group as unknown as StubSceneNode;
  });

  return group;
}

export interface RectangleNodeOverrides {
  id?: string;
  name?: string;
  visible?: boolean;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  fills?: readonly Paint[];
  parent?: StubSceneNode | null;
  layoutPositioning?: "AUTO" | "ABSOLUTE";
}

export function createRectangleNode(overrides: RectangleNodeOverrides = {}): StubRectangleNode {
  const id = overrides.id ?? nextId("rect");
  const x = overrides.x ?? 0;
  const y = overrides.y ?? 0;
  const width = overrides.width ?? 100;
  const height = overrides.height ?? 100;

  return {
    id,
    name: overrides.name ?? "Rectangle",
    type: "RECTANGLE",
    visible: overrides.visible ?? true,
    x,
    y,
    width,
    height,
    fills: overrides.fills ?? [],
    parent: overrides.parent ?? null,
    absoluteBoundingBox: { x, y, width, height },
    removed: false,
    layoutPositioning: overrides.layoutPositioning,
    resize: function(w: number, h: number) {
      this.width = w;
      this.height = h;
      if (this.absoluteBoundingBox) {
        this.absoluteBoundingBox.width = w;
        this.absoluteBoundingBox.height = h;
      }
    },
    resizeWithoutConstraints: function(w: number, h: number) {
      this.resize(w, h);
    },
  };
}

export interface VectorNodeOverrides {
  id?: string;
  name?: string;
  visible?: boolean;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  fills?: readonly Paint[];
  parent?: StubSceneNode | null;
}

export function createVectorNode(overrides: VectorNodeOverrides = {}): StubVectorNode {
  const id = overrides.id ?? nextId("vector");
  const x = overrides.x ?? 0;
  const y = overrides.y ?? 0;
  const width = overrides.width ?? 50;
  const height = overrides.height ?? 50;

  return {
    id,
    name: overrides.name ?? "Vector",
    type: "VECTOR",
    visible: overrides.visible ?? true,
    x,
    y,
    width,
    height,
    fills: overrides.fills ?? [],
    parent: overrides.parent ?? null,
    absoluteBoundingBox: { x, y, width, height },
    removed: false,
  };
}

// ============================================================================
// Clone Helper
// ============================================================================

function cloneNode(node: StubSceneNode): StubSceneNode {
  switch (node.type) {
    case "FRAME":
      return createFrameNode({
        name: node.name,
        x: node.x,
        y: node.y,
        width: node.width,
        height: node.height,
        layoutMode: node.layoutMode,
        children: node.children.map(cloneNode),
        fills: [...node.fills],
      });
    case "TEXT":
      return createTextNode({
        name: node.name,
        x: node.x,
        y: node.y,
        width: node.width,
        height: node.height,
        characters: node.characters,
        fills: [...node.fills],
      });
    case "INSTANCE":
      return createInstanceNode({
        name: node.name,
        x: node.x,
        y: node.y,
        width: node.width,
        height: node.height,
        children: node.children.map(cloneNode),
        fills: [...node.fills],
      });
    case "GROUP":
      return createGroupNode({
        name: node.name,
        x: node.x,
        y: node.y,
        width: node.width,
        height: node.height,
        children: node.children.map(cloneNode),
      });
    case "RECTANGLE":
      return createRectangleNode({
        name: node.name,
        x: node.x,
        y: node.y,
        width: node.width,
        height: node.height,
        fills: [...node.fills],
      });
    case "VECTOR":
      return createVectorNode({
        name: node.name,
        x: node.x,
        y: node.y,
        width: node.width,
        height: node.height,
        fills: [...node.fills],
      });
    default:
      throw new Error(`Unknown node type: ${(node as StubSceneNode).type}`);
  }
}

// ============================================================================
// Image Fill Helper
// ============================================================================

export function createImageFill(): Paint {
  return {
    type: "IMAGE",
    scaleMode: "FILL",
    imageHash: "test-hash",
    visible: true,
    opacity: 1,
  } as unknown as Paint;
}

export function createSolidFill(color = { r: 1, g: 1, b: 1 }): Paint {
  return {
    type: "SOLID",
    color,
    visible: true,
    opacity: 1,
  } as unknown as Paint;
}
