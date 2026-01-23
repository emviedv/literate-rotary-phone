/**
 * Design Node Mapper Module
 *
 * Functions for mapping and finding nodes during design transformation.
 * Provides utilities for creating source→clone mappings and searching
 * for nodes by ID or name.
 */

// ============================================================================
// Types
// ============================================================================

/**
 * Maps source node IDs to corresponding cloned nodes.
 * Used to look up the cloned version of a source node by the source's ID.
 */
export interface NodeMap {
  readonly [sourceId: string]: SceneNode;
}

// ============================================================================
// Node Map Building
// ============================================================================

/**
 * Builds a map from source node IDs to corresponding cloned nodes.
 * Uses parallel BFS traversal of both trees, mapping nodes at matching positions.
 *
 * @param sourceFrame - The original source frame
 * @param clonedFrame - The cloned frame
 * @returns Map from source node IDs to cloned nodes
 */
export function buildNodeMap(sourceFrame: FrameNode, clonedFrame: FrameNode): NodeMap {
  const map: { [key: string]: SceneNode } = {};

  // Walk both trees in parallel
  const sourceQueue: SceneNode[] = [sourceFrame];
  const clonedQueue: SceneNode[] = [clonedFrame];

  while (sourceQueue.length > 0 && clonedQueue.length > 0) {
    const sourceNode = sourceQueue.shift()!;
    const clonedNode = clonedQueue.shift()!;

    map[sourceNode.id] = clonedNode;

    if ("children" in sourceNode && "children" in clonedNode) {
      // Traverse children in order
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
 * Used for looking up nodes by their own ID within a single frame tree.
 *
 * @param frame - The frame to map
 * @returns Map from node IDs to nodes
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

// ============================================================================
// Node Search
// ============================================================================

/**
 * Finds a node by name within a frame tree using BFS.
 * Returns the first matching node found.
 *
 * Note: This searches frame.children, not the frame itself.
 *
 * @param frame - The frame to search
 * @param name - The name to find
 * @returns The first matching node, or null if not found
 */
export function findNodeByName(frame: FrameNode, name: string): SceneNode | null {
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
