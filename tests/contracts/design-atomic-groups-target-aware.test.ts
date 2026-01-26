/**
 * Contract Tests for Target-Aware Atomic Group Collection
 *
 * These tests verify the behavior of collectAtomicGroupChildrenTargetAware()
 * which provides different atomic protection behavior based on target format.
 *
 * Key Behaviors:
 * - TikTok targets: Allow repositioning of INSTANCE nodes and proximity groups
 * - Non-TikTok targets: Strict protection for all atomic children
 * - Device mockups: Always protected regardless of target
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
  type StubFrameNode,
  type StubSceneNode,
} from "../fixtures/figma-stubs.js";

// ============================================================================
// Mock isAtomicGroup and isAtomicGroupTargetAware behavior
// ============================================================================

const ATOMIC_GROUP_NAME_PATTERN = /\b(illustration|mockup|device|phone|iphone|android|tablet|ipad|asset|graphic|artwork|icon-group|logo-group|diagram|infographic|chart|screenshot|frame-mockup|screen|bezel)\b/i;
const PROXIMITY_GROUP_NAME_PATTERN = /^ProximityGroup|^RecoveredGroup/i;
const DEVICE_MOCKUP_NAME_PATTERN = /\b(mockup|device|phone|iphone|android|tablet|ipad|screen|bezel|frame-mockup)\b/i;

interface AtomicAnalysis {
  readonly isAtomic: boolean;
  readonly allowsRepositioning: boolean;
  readonly reason: string;
}

function isAtomicGroup(node: StubSceneNode): boolean {
  if (node.type !== "GROUP" && node.type !== "FRAME" && node.type !== "INSTANCE") return false;
  if (node.type === "INSTANCE") return true;
  if (!("children" in node) || node.children.length === 0) return false;

  const children = node.children;
  const hasTextChild = children.some((child) => child.type === "TEXT");
  if (hasTextChild) return false;

  if (ATOMIC_GROUP_NAME_PATTERN.test(node.name)) return true;
  if (PROXIMITY_GROUP_NAME_PATTERN.test(node.name)) return true;

  return false;
}

function isAtomicGroupTargetAware(node: StubSceneNode, targetId: string): AtomicAnalysis {
  const isStandardAtomic = isAtomicGroup(node);

  if (!isStandardAtomic) {
    return { isAtomic: false, allowsRepositioning: true, reason: 'Not an atomic group' };
  }

  if (DEVICE_MOCKUP_NAME_PATTERN.test(node.name)) {
    return { isAtomic: true, allowsRepositioning: false, reason: 'Device mockup - strict protection' };
  }

  if (node.type === "TEXT") {
    return { isAtomic: true, allowsRepositioning: false, reason: 'Text within atomic group' };
  }

  if (targetId === "tiktok-vertical") {
    if (node.type === "INSTANCE") {
      return { isAtomic: true, allowsRepositioning: true, reason: 'Component instance - TikTok repositioning allowed' };
    }
    if (PROXIMITY_GROUP_NAME_PATTERN.test(node.name)) {
      return { isAtomic: true, allowsRepositioning: true, reason: 'Proximity group - TikTok repositioning allowed' };
    }
  }

  return { isAtomic: true, allowsRepositioning: false, reason: `Atomic group - strict protection for target ${targetId}` };
}

// ============================================================================
// Simulate collectAtomicGroupChildrenTargetAware behavior
// ============================================================================

/**
 * Target-aware version of collectAtomicGroupChildren.
 * For TikTok, repositionable atomic containers (instances, proximity groups)
 * will NOT have their children collected, allowing AI to reposition the container.
 */
function collectAtomicGroupChildrenTargetAware(frame: StubFrameNode, targetId: string): Set<string> {
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
    if (isAtomicGroup(node)) {
      const analysis = isAtomicGroupTargetAware(node, targetId);

      if (analysis.allowsRepositioning) {
        // For TikTok-repositionable atomic groups, DO NOT collect children
        // This allows the AI to reposition the container without blocking
        if ("children" in node) {
          for (const child of (node as StubFrameNode).children) {
            scanForAtomicGroups(child);
          }
        }
        return;
      }

      // Atomic group does NOT allow repositioning - collect all children for protection
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

// ============================================================================
// Tests: TikTok Target - Instance Repositioning Allowed
// ============================================================================

testCase("collectAtomicGroupChildrenTargetAware: TikTok allows instance repositioning", () => {
  resetNodeCounter();

  // Create a Button instance (NOT a device mockup)
  const buttonLabel = createTextNode({ id: "label-1", name: "Label" });
  const buttonIcon = createRectangleNode({ id: "icon-1", name: "Icon" });
  const buttonInstance = createInstanceNode({
    id: "button-1",
    name: "Button Component",
    children: [buttonLabel as unknown as StubSceneNode, buttonIcon as unknown as StubSceneNode],
  });

  const frame = createFrameNode({
    id: "root",
    name: "Root",
    children: [
      buttonInstance as unknown as StubSceneNode,
      createTextNode({ id: "title", name: "Title" }) as unknown as StubSceneNode,
    ],
  });

  const childIds = collectAtomicGroupChildrenTargetAware(frame, "tiktok-vertical");

  // For TikTok, Button instance allows repositioning
  // So its children should NOT be collected for protection
  assert(!childIds.has("label-1"), "Button label should NOT be protected for TikTok");
  assert(!childIds.has("icon-1"), "Button icon should NOT be protected for TikTok");
  assert(!childIds.has("button-1"), "Button instance itself should NOT be collected");
  assert(!childIds.has("title"), "Title text should NOT be in atomic children");
});

testCase("collectAtomicGroupChildrenTargetAware: Non-TikTok targets protect all atomic children", () => {
  resetNodeCounter();

  // Same setup as above
  const buttonLabel = createTextNode({ id: "label-1", name: "Label" });
  const buttonIcon = createRectangleNode({ id: "icon-1", name: "Icon" });
  const buttonInstance = createInstanceNode({
    id: "button-1",
    name: "Button Component",
    children: [buttonLabel as unknown as StubSceneNode, buttonIcon as unknown as StubSceneNode],
  });

  const frame = createFrameNode({
    id: "root",
    name: "Root",
    children: [
      buttonInstance as unknown as StubSceneNode,
      createTextNode({ id: "title", name: "Title" }) as unknown as StubSceneNode,
    ],
  });

  const childIds = collectAtomicGroupChildrenTargetAware(frame, "youtube-thumbnail");

  // For non-TikTok targets, instance children SHOULD be protected
  assert(childIds.has("label-1"), "Button label SHOULD be protected for non-TikTok");
  assert(childIds.has("icon-1"), "Button icon SHOULD be protected for non-TikTok");
  assert(!childIds.has("button-1"), "Button instance itself should NOT be collected");
});

// ============================================================================
// Tests: Device Mockups Always Protected
// ============================================================================

testCase("collectAtomicGroupChildrenTargetAware: Device mockups always protected regardless of target", () => {
  resetNodeCounter();

  // iPhone mockup - should ALWAYS be protected
  const screen = createRectangleNode({ id: "screen-1", name: "Screen" });
  const bezel = createRectangleNode({ id: "bezel-1", name: "Bezel" });
  const iphoneMockup = createInstanceNode({
    id: "iphone-1",
    name: "iPhone Mockup",
    children: [screen as unknown as StubSceneNode, bezel as unknown as StubSceneNode],
  });

  const frame = createFrameNode({
    id: "root",
    name: "Root",
    children: [iphoneMockup as unknown as StubSceneNode],
  });

  // Test with TikTok - even TikTok should protect device mockups
  const childIdsTikTok = collectAtomicGroupChildrenTargetAware(frame, "tiktok-vertical");

  assert(childIdsTikTok.has("screen-1"), "iPhone screen SHOULD be protected even for TikTok");
  assert(childIdsTikTok.has("bezel-1"), "iPhone bezel SHOULD be protected even for TikTok");
});

testCase("collectAtomicGroupChildrenTargetAware: Phone device patterns always protected", () => {
  resetNodeCounter();

  // Various device patterns that should all be protected
  const deviceNames = ["Android Phone", "tablet-frame", "iPad mockup", "device screen"];

  for (const deviceName of deviceNames) {
    const innerChild = createRectangleNode({ id: `child-${deviceName}`, name: "Inner" });
    const deviceInstance = createInstanceNode({
      id: `device-${deviceName}`,
      name: deviceName,
      children: [innerChild as unknown as StubSceneNode],
    });

    const frame = createFrameNode({
      id: "root",
      name: "Root",
      children: [deviceInstance as unknown as StubSceneNode],
    });

    const childIds = collectAtomicGroupChildrenTargetAware(frame, "tiktok-vertical");

    assert(
      childIds.has(`child-${deviceName}`),
      `Device '${deviceName}' children SHOULD be protected`
    );
  }
});

// ============================================================================
// Tests: Proximity Groups
// ============================================================================

testCase("collectAtomicGroupChildrenTargetAware: TikTok allows ProximityGroup repositioning", () => {
  resetNodeCounter();

  // ProximityGroup - should allow repositioning for TikTok
  // Note: ProximityGroups with text children are NOT atomic per isAtomicGroup rules
  // so we use rectangles instead
  const rect1 = createRectangleNode({ id: "rect-1", name: "Rect 1" });
  const rect2 = createRectangleNode({ id: "rect-2", name: "Rect 2" });
  const proximityGroup = createFrameNode({
    id: "prox-1",
    name: "ProximityGroup-1",
    children: [rect1 as unknown as StubSceneNode, rect2 as unknown as StubSceneNode],
  });

  const frame = createFrameNode({
    id: "root",
    name: "Root",
    children: [proximityGroup as unknown as StubSceneNode],
  });

  const childIdsTikTok = collectAtomicGroupChildrenTargetAware(frame, "tiktok-vertical");

  // TikTok should allow repositioning of proximity groups
  assert(!childIdsTikTok.has("rect-1"), "ProximityGroup children should NOT be protected for TikTok");
  assert(!childIdsTikTok.has("rect-2"), "ProximityGroup children should NOT be protected for TikTok");
});

testCase("collectAtomicGroupChildrenTargetAware: Non-TikTok protects ProximityGroup children", () => {
  resetNodeCounter();

  const rect1 = createRectangleNode({ id: "rect-1", name: "Rect 1" });
  const rect2 = createRectangleNode({ id: "rect-2", name: "Rect 2" });
  const proximityGroup = createFrameNode({
    id: "prox-1",
    name: "ProximityGroup-1",
    children: [rect1 as unknown as StubSceneNode, rect2 as unknown as StubSceneNode],
  });

  const frame = createFrameNode({
    id: "root",
    name: "Root",
    children: [proximityGroup as unknown as StubSceneNode],
  });

  const childIdsOther = collectAtomicGroupChildrenTargetAware(frame, "youtube-cover");

  // Non-TikTok should protect proximity group children
  assert(childIdsOther.has("rect-1"), "ProximityGroup children SHOULD be protected for non-TikTok");
  assert(childIdsOther.has("rect-2"), "ProximityGroup children SHOULD be protected for non-TikTok");
});

// ============================================================================
// Tests: Mixed Scenarios
// ============================================================================

testCase("collectAtomicGroupChildrenTargetAware: Mixed atomic types in same frame", () => {
  resetNodeCounter();

  // Button instance (repositionable for TikTok)
  const buttonChild = createRectangleNode({ id: "btn-child", name: "ButtonBg" });
  const buttonInstance = createInstanceNode({
    id: "button-1",
    name: "Button Component",
    children: [buttonChild as unknown as StubSceneNode],
  });

  // iPhone mockup (always protected)
  const iphoneChild = createRectangleNode({ id: "iphone-child", name: "Screen" });
  const iphoneMockup = createInstanceNode({
    id: "iphone-1",
    name: "iPhone Mockup",
    children: [iphoneChild as unknown as StubSceneNode],
  });

  // ProximityGroup (repositionable for TikTok)
  const proxChild = createRectangleNode({ id: "prox-child", name: "Item" });
  const proximityGroup = createFrameNode({
    id: "prox-1",
    name: "ProximityGroup-1",
    children: [proxChild as unknown as StubSceneNode],
  });

  const frame = createFrameNode({
    id: "root",
    name: "Root",
    children: [
      buttonInstance as unknown as StubSceneNode,
      iphoneMockup as unknown as StubSceneNode,
      proximityGroup as unknown as StubSceneNode,
    ],
  });

  const childIds = collectAtomicGroupChildrenTargetAware(frame, "tiktok-vertical");

  // Button and ProximityGroup children should NOT be protected (TikTok repositioning)
  assert(!childIds.has("btn-child"), "Button children should NOT be protected for TikTok");
  assert(!childIds.has("prox-child"), "ProximityGroup children should NOT be protected for TikTok");

  // iPhone children SHOULD be protected (device mockup)
  assert(childIds.has("iphone-child"), "iPhone children SHOULD be protected even for TikTok");
});

testCase("collectAtomicGroupChildrenTargetAware: Empty frame returns empty set", () => {
  resetNodeCounter();

  const frame = createFrameNode({
    id: "root",
    name: "Root",
    children: [],
  });

  const childIds = collectAtomicGroupChildrenTargetAware(frame, "tiktok-vertical");

  assertEqual(childIds.size, 0, "Empty frame should return empty set");
});

testCase("collectAtomicGroupChildrenTargetAware: Regular non-atomic nodes not collected", () => {
  resetNodeCounter();

  // Regular frame (not atomic)
  const regularChild = createRectangleNode({ id: "reg-child", name: "Regular Child" });
  const regularFrame = createFrameNode({
    id: "regular-frame",
    name: "Regular Frame",
    children: [regularChild as unknown as StubSceneNode],
  });

  // Text directly in root (not atomic)
  const titleText = createTextNode({ id: "title", name: "Title" });

  const frame = createFrameNode({
    id: "root",
    name: "Root",
    children: [
      regularFrame as unknown as StubSceneNode,
      titleText as unknown as StubSceneNode,
    ],
  });

  const childIds = collectAtomicGroupChildrenTargetAware(frame, "tiktok-vertical");

  // Regular frames/text are not atomic, so no children should be collected
  assertEqual(childIds.size, 0, "Non-atomic frames should not have children collected");
});

// ============================================================================
// Summary
// ============================================================================

console.log("\n✅ All target-aware atomic group contract tests passed!");
