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
