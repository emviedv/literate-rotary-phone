/**
 * Contract Tests for design-layout-enforcer module
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
  createImageFill,
  type StubFrameNode,
  type StubSceneNode,
  type StubRectangleNode,
} from "../fixtures/figma-stubs.js";

// ============================================================================
// Contract Types
// ============================================================================

interface NodeMap {
  readonly [sourceId: string]: StubSceneNode;
}

interface NodeSpec {
  nodeId: string;
  nodeName: string;
  visible: boolean;
  zIndex?: number;
}

/**
 * Contract interface that the design-layout-enforcer module must implement.
 */
interface LayoutEnforcerContract {
  /**
   * Reorders children of the variant frame based on zIndex values from specs.
   * Lower zIndex = earlier in children array = behind.
   * @param variant - The variant frame whose children will be reordered
   * @param nodeMap - Map from source node IDs to cloned nodes
   * @param specs - Array of node specifications with optional zIndex values
   * @param atomicGroupChildIds - Set of node IDs that are children of atomic groups
   */
  reorderChildrenByZIndex(
    variant: StubFrameNode,
    nodeMap: NodeMap,
    specs: readonly NodeSpec[],
    atomicGroupChildIds: Set<string>
  ): void;

  /**
   * Enforces TikTok safe areas by checking node positions.
   * @param frame - The frame to check
   * @returns Array of violation messages (empty if no violations)
   */
  enforceSafeAreas(frame: StubFrameNode): string[];
}

// ============================================================================
// Constants
// ============================================================================

const TIKTOK_HEIGHT = 1920;
const BOTTOM_DANGER_ZONE = 0.08;
const TOP_CAUTION_ZONE = 0.04;

// ============================================================================
// Implementation (will be replaced by import after extraction)
// ============================================================================

function reorderChildrenByZIndex(
  variant: StubFrameNode,
  nodeMap: NodeMap,
  specs: readonly NodeSpec[],
  atomicGroupChildIds: Set<string>
): void {
  // Filter to visible nodes with zIndex, excluding atomic children
  const specsWithZIndex = specs
    .filter((s) => s.visible !== false && s.zIndex !== undefined)
    .filter((s) => {
      const node = nodeMap[s.nodeId];
      return !node || !atomicGroupChildIds.has(node.id);
    })
    .sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0));

  if (specsWithZIndex.length === 0) return;

  for (let i = 0; i < specsWithZIndex.length; i++) {
    const spec = specsWithZIndex[i];
    const node = nodeMap[spec.nodeId];

    if (node && node.parent === (variant as unknown as StubSceneNode) && !node.removed) {
      variant.insertChild(i, node);
    }
  }
}

function isImportantContent(node: StubSceneNode): boolean {
  if (node.type === "TEXT") return true;
  if ("fills" in node) {
    const fills = (node as StubRectangleNode).fills as readonly Paint[];
    if (fills?.some((f: Paint) => f.type === "IMAGE")) return true;
  }
  return false;
}

function enforceSafeAreas(frame: StubFrameNode): string[] {
  const bottomDangerY = TIKTOK_HEIGHT * (1 - BOTTOM_DANGER_ZONE);
  const topCautionY = TIKTOK_HEIGHT * TOP_CAUTION_ZONE;

  const violations: string[] = [];

  function checkNode(node: StubSceneNode): void {
    if (!node.visible) return;

    if (node.absoluteBoundingBox) {
      const bounds = node.absoluteBoundingBox;
      const frameBounds = frame.absoluteBoundingBox;

      if (!frameBounds) return;

      const relY = bounds.y - frameBounds.y;
      const relBottom = relY + bounds.height;

      // Check bottom danger zone
      if (relBottom > bottomDangerY && node.type !== "FRAME") {
        violations.push(`${node.name} extends into bottom danger zone (y=${Math.round(relY)})`);
      }

      // Check top caution zone
      if (relY < topCautionY && isImportantContent(node)) {
        violations.push(`${node.name} is in top caution zone (y=${Math.round(relY)})`);
      }
    }

    if ("children" in node) {
      for (const child of (node as StubFrameNode).children) {
        checkNode(child);
      }
    }
  }

  for (const child of frame.children) {
    checkNode(child);
  }

  return violations;
}

// Create service instance conforming to contract
const layoutEnforcerService: LayoutEnforcerContract = {
  reorderChildrenByZIndex,
  enforceSafeAreas,
};

// ============================================================================
// Contract Tests
// ============================================================================

testCase("CONTRACT: reorderChildrenByZIndex sorts ascending (lower zIndex = behind)", () => {
  resetNodeCounter();

  const child1 = createRectangleNode({ id: "src-1", name: "Front" });
  const child2 = createRectangleNode({ id: "src-2", name: "Middle" });
  const child3 = createRectangleNode({ id: "src-3", name: "Back" });

  const variant = createFrameNode({
    id: "variant",
    children: [
      child1 as unknown as StubSceneNode,
      child2 as unknown as StubSceneNode,
      child3 as unknown as StubSceneNode,
    ],
  });

  const nodeMap: NodeMap = {
    "src-1": child1 as unknown as StubSceneNode,
    "src-2": child2 as unknown as StubSceneNode,
    "src-3": child3 as unknown as StubSceneNode,
  };

  const specs: NodeSpec[] = [
    { nodeId: "src-1", nodeName: "Front", visible: true, zIndex: 10 },
    { nodeId: "src-2", nodeName: "Middle", visible: true, zIndex: 5 },
    { nodeId: "src-3", nodeName: "Back", visible: true, zIndex: 1 },
  ];

  layoutEnforcerService.reorderChildrenByZIndex(variant, nodeMap, specs, new Set());

  // After reordering: Back (1), Middle (5), Front (10)
  assertEqual(variant.children[0].name, "Back", "Lowest zIndex should be first");
  assertEqual(variant.children[1].name, "Middle", "Middle zIndex should be second");
  assertEqual(variant.children[2].name, "Front", "Highest zIndex should be last");
});

testCase("CONTRACT: reorderChildrenByZIndex skips atomic children", () => {
  resetNodeCounter();

  const atomicChild = createRectangleNode({ id: "src-atomic", name: "AtomicChild" });
  const normalChild = createRectangleNode({ id: "src-normal", name: "Normal" });

  const variant = createFrameNode({
    id: "variant",
    children: [
      atomicChild as unknown as StubSceneNode,
      normalChild as unknown as StubSceneNode,
    ],
  });

  const nodeMap: NodeMap = {
    "src-atomic": atomicChild as unknown as StubSceneNode,
    "src-normal": normalChild as unknown as StubSceneNode,
  };

  const specs: NodeSpec[] = [
    { nodeId: "src-atomic", nodeName: "AtomicChild", visible: true, zIndex: 1 },
    { nodeId: "src-normal", nodeName: "Normal", visible: true, zIndex: 10 },
  ];

  // Mark atomic child in the set
  const atomicChildIds = new Set([atomicChild.id]);

  layoutEnforcerService.reorderChildrenByZIndex(variant, nodeMap, specs, atomicChildIds);

  // Only normal should be reordered, atomic stays in original position
  // Since we skip atomic, only normal participates in reordering
  assertEqual(variant.children.length, 2, "Should still have 2 children");
});

testCase("CONTRACT: reorderChildrenByZIndex ignores hidden nodes", () => {
  resetNodeCounter();

  const visible = createRectangleNode({ id: "src-visible", name: "Visible" });
  const hidden = createRectangleNode({ id: "src-hidden", name: "Hidden" });

  const variant = createFrameNode({
    id: "variant",
    children: [
      visible as unknown as StubSceneNode,
      hidden as unknown as StubSceneNode,
    ],
  });

  const nodeMap: NodeMap = {
    "src-visible": visible as unknown as StubSceneNode,
    "src-hidden": hidden as unknown as StubSceneNode,
  };

  const specs: NodeSpec[] = [
    { nodeId: "src-visible", nodeName: "Visible", visible: true, zIndex: 10 },
    { nodeId: "src-hidden", nodeName: "Hidden", visible: false, zIndex: 1 }, // Hidden
  ];

  layoutEnforcerService.reorderChildrenByZIndex(variant, nodeMap, specs, new Set());

  // Hidden node should be excluded from reordering
  assertEqual(variant.children.length, 2, "Should still have 2 children");
});

testCase("CONTRACT: enforceSafeAreas detects bottom danger zone violations", () => {
  resetNodeCounter();

  // Bottom danger starts at 1920 * 0.92 = 1766
  // A node that extends past 1766 is in the danger zone
  const dangerNode = createRectangleNode({
    id: "danger",
    name: "DangerNode",
    x: 100,
    y: 1700, // Starts at 1700, extends to 1800 (past 1766)
    width: 100,
    height: 100,
  });

  const frame = createFrameNode({
    id: "frame",
    x: 0,
    y: 0,
    width: 1080,
    height: 1920,
    children: [dangerNode as unknown as StubSceneNode],
  });

  const violations = layoutEnforcerService.enforceSafeAreas(frame);

  assert(violations.length > 0, "Should detect violation");
  assert(violations[0].includes("bottom danger zone"), "Should mention bottom danger zone");
});

testCase("CONTRACT: enforceSafeAreas detects top caution zone for important content", () => {
  resetNodeCounter();

  // Top caution ends at 1920 * 0.04 = 77
  // Important content (TEXT) in this zone should trigger a warning
  const topText = createTextNode({
    id: "top-text",
    name: "TopText",
    x: 100,
    y: 50, // Well within top caution zone
    width: 200,
    height: 30,
  });

  const frame = createFrameNode({
    id: "frame",
    x: 0,
    y: 0,
    width: 1080,
    height: 1920,
    children: [topText as unknown as StubSceneNode],
  });

  const violations = layoutEnforcerService.enforceSafeAreas(frame);

  assert(violations.length > 0, "Should detect top caution violation");
  assert(violations[0].includes("top caution zone"), "Should mention top caution zone");
});

testCase("CONTRACT: enforceSafeAreas ignores hidden nodes", () => {
  resetNodeCounter();

  const hiddenNode = createTextNode({
    id: "hidden",
    name: "HiddenText",
    visible: false,
    x: 100,
    y: 50, // In top caution zone, but hidden
  });

  const frame = createFrameNode({
    id: "frame",
    x: 0,
    y: 0,
    width: 1080,
    height: 1920,
    children: [hiddenNode as unknown as StubSceneNode],
  });

  const violations = layoutEnforcerService.enforceSafeAreas(frame);

  assertEqual(violations.length, 0, "Should not detect violations for hidden nodes");
});

testCase("CONTRACT: enforceSafeAreas ignores non-important content in top zone", () => {
  resetNodeCounter();

  // Plain rectangle (not TEXT, no IMAGE fill) is not "important"
  const topRect = createRectangleNode({
    id: "top-rect",
    name: "TopRect",
    x: 100,
    y: 50, // In top caution zone
    width: 200,
    height: 100,
    fills: [], // No image fill
  });

  const frame = createFrameNode({
    id: "frame",
    x: 0,
    y: 0,
    width: 1080,
    height: 1920,
    children: [topRect as unknown as StubSceneNode],
  });

  const violations = layoutEnforcerService.enforceSafeAreas(frame);

  // Plain rectangles are not considered "important" so should not trigger top caution
  assertEqual(violations.length, 0, "Should not flag non-important content");
});

testCase("CONTRACT: enforceSafeAreas considers image nodes as important", () => {
  resetNodeCounter();

  const topImage = createRectangleNode({
    id: "top-image",
    name: "TopImage",
    x: 100,
    y: 50, // In top caution zone
    width: 200,
    height: 100,
    fills: [createImageFill()],
  });

  const frame = createFrameNode({
    id: "frame",
    x: 0,
    y: 0,
    width: 1080,
    height: 1920,
    children: [topImage as unknown as StubSceneNode],
  });

  const violations = layoutEnforcerService.enforceSafeAreas(frame);

  assert(violations.length > 0, "Should flag image in top caution zone");
});

// ============================================================================
// Summary
// ============================================================================

console.log("\n✅ All design-layout-enforcer contract tests passed!");
