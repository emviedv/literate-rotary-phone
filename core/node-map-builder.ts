/**
 * Node Map Builder
 *
 * Utilities for mapping source Figma nodes to their cloned counterparts
 * and searching node trees by name.
 */

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
