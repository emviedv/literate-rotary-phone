/**
 * Selection Module
 *
 * Handles extracting the selected frame and building a node tree
 * representation for AI analysis.
 */

import type { NodeTreeItem } from "../types/layout-spec";

/**
 * Get the currently selected frame node.
 * Returns null if selection is invalid (not exactly one frame).
 */
export function getSelectedFrame(): FrameNode | null {
  const selection = figma.currentPage.selection;

  if (selection.length !== 1) {
    return null;
  }

  const node = selection[0];

  if (node.type !== "FRAME") {
    return null;
  }

  return node;
}

/**
 * Build a simplified node tree from a frame for AI analysis.
 * Only includes relevant properties: id, name, type, dimensions, children.
 */
export function buildNodeTree(node: SceneNode, maxDepth: number = 5): NodeTreeItem {
  const item: NodeTreeItem = {
    id: node.id,
    name: node.name,
    type: node.type,
    width: "width" in node ? node.width : 0,
    height: "height" in node ? node.height : 0,
  };

  // Recurse into children for container types
  if (maxDepth > 0 && "children" in node) {
    const children = node.children as readonly SceneNode[];
    if (children.length > 0) {
      item.children = children.map((child) => buildNodeTree(child, maxDepth - 1));
    }
  }

  return item;
}

/**
 * Flatten a node tree into a list of all nodes with their IDs.
 * Useful for mapping AI specs back to actual Figma nodes.
 */
export function flattenNodeTree(tree: NodeTreeItem): NodeTreeItem[] {
  const result: NodeTreeItem[] = [tree];

  if (tree.children) {
    for (const child of tree.children) {
      result.push(...flattenNodeTree(child));
    }
  }

  return result;
}
