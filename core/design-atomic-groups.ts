/**
 * Design Atomic Groups Module
 *
 * Functions for detecting and managing atomic groups (mockups, illustrations,
 * device frames) during design transformation. Atomic groups are treated as
 * single visual units - their children maintain fixed relative positions.
 */

import { debugFixLog } from "./debug.js";
import { isAtomicGroup } from "./element-classification.js";

// ============================================================================
// Atomic Instance Collection
// ============================================================================

/**
 * Collects IDs of all atomic instances (INSTANCE nodes that are atomic groups).
 * This must run BEFORE detachAllInstances() so we know which instances to preserve.
 *
 * @param frame - The root frame to scan
 * @returns Set of instance node IDs that should NOT be detached
 */
export function collectAtomicInstanceIds(frame: FrameNode): Set<string> {
  const atomicIds = new Set<string>();

  function scanForAtomicInstances(node: SceneNode): void {
    // Check if this instance is an atomic group (mockup, device, illustration)
    if (node.type === "INSTANCE" && isAtomicGroup(node)) {
      atomicIds.add(node.id);
      debugFixLog("Found atomic instance (will preserve)", {
        nodeId: node.id,
        nodeName: node.name
      });
      // Don't recurse into atomic instances - they're fully protected
      return;
    }

    // Recurse into containers
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

// ============================================================================
// Atomic Group Children Collection
// ============================================================================

/**
 * Collects all node IDs that are children of atomic groups.
 * Atomic groups (mockups, illustrations, device frames) should be treated as
 * single visual units - their children should NOT be repositioned independently.
 *
 * This prevents issues like iPhone mockups being torn apart when AI provides
 * separate positioning for the phone frame and screen content.
 *
 * @param frame - The root frame to scan
 * @returns Set of node IDs that are children of atomic groups
 */
export function collectAtomicGroupChildren(frame: FrameNode): Set<string> {
  const atomicChildIds = new Set<string>();

  function collectChildIds(parent: SceneNode): void {
    if (!("children" in parent)) return;

    for (const child of (parent as FrameNode | GroupNode).children) {
      atomicChildIds.add(child.id);
      // Recursively collect nested children
      if ("children" in child) {
        collectChildIds(child);
      }
    }
  }

  function scanForAtomicGroups(node: SceneNode): void {
    // Check if this node is an atomic group
    if (isAtomicGroup(node)) {
      debugFixLog("Found atomic group", {
        nodeId: node.id,
        nodeName: node.name,
        type: node.type
      });
      // Collect all children of this atomic group
      collectChildIds(node);
      // Don't recurse into atomic groups - we've already collected their children
      return;
    }

    // Recurse into non-atomic containers
    if ("children" in node) {
      for (const child of (node as FrameNode | GroupNode).children) {
        scanForAtomicGroups(child);
      }
    }
  }

  // Scan all children of the root frame
  for (const child of frame.children) {
    scanForAtomicGroups(child);
  }

  return atomicChildIds;
}

// ============================================================================
// Instance Detachment
// ============================================================================

/**
 * Recursively detaches component instances in a frame tree, EXCEPT for
 * instances identified as atomic groups (mockups, illustrations, device frames).
 *
 * This converts non-atomic instances to regular frames, allowing their children
 * to be repositioned freely (Figma locks instance children by default).
 *
 * Atomic instances are preserved intact to maintain their component boundaries.
 *
 * @param frame - The frame to process
 * @param atomicInstanceIds - Set of instance IDs to skip (detected atomic groups)
 * @returns Number of instances detached
 */
export function detachAllInstances(frame: FrameNode, atomicInstanceIds: Set<string> = new Set()): number {
  let detachCount = 0;

  // Process children in reverse order since detachment may affect indices
  // Use a queue-based approach for the tree traversal
  const nodesToProcess: SceneNode[] = [...frame.children];

  while (nodesToProcess.length > 0) {
    const node = nodesToProcess.shift()!;

    // Check if this is an instance that can be detached
    if (node.type === "INSTANCE") {
      // Skip detaching if this instance is an atomic group (mockup, illustration, etc.)
      // This preserves the component boundary so children stay together
      if (atomicInstanceIds.has(node.id)) {
        debugFixLog("Preserving atomic instance (not detaching)", {
          nodeId: node.id,
          nodeName: node.name,
          reason: "Component instance is atomic group - preserving structure"
        });
        // Still process children of atomic instances in case there are nested non-atomic instances
        if ("children" in node) {
          nodesToProcess.push(...(node as InstanceNode).children);
        }
        continue;
      }

      try {
        const instance = node as InstanceNode;
        // detachInstance() converts the instance to a FrameNode in place
        const detached = instance.detachInstance();
        detachCount++;

        // The detached frame may have its own children to process
        if ("children" in detached) {
          nodesToProcess.push(...detached.children);
        }
      } catch (error) {
        debugFixLog("Failed to detach instance", {
          nodeId: node.id,
          nodeName: node.name,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    } else if ("children" in node) {
      // Regular frame/group - process its children
      nodesToProcess.push(...(node as FrameNode | GroupNode).children);
    }
  }

  return detachCount;
}
