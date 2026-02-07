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
  console.log("[selection] getSelectedFrame - selection count:", selection.length);

  if (selection.length !== 1) {
    console.log("[selection] Invalid: not exactly one node selected");
    return null;
  }

  const node = selection[0];
  console.log("[selection] Selected node type:", node.type, "name:", node.name);

  if (node.type !== "FRAME") {
    console.log("[selection] Invalid: selected node is not a FRAME");
    return null;
  }

  console.log("[selection] Valid frame selected:", node.name, "id:", node.id);
  return node;
}

/**
 * Build a simplified node tree from a frame for AI analysis.
 * Only includes relevant properties: id, name, type, dimensions, children.
 */
export function buildNodeTree(node: SceneNode, maxDepth: number = 5): NodeTreeItem {
  console.log("[selection] buildNodeTree - node:", node.name, "type:", node.type, "depth remaining:", maxDepth);

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
    console.log("[selection] Node", node.name, "has", children.length, "children");
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

  console.log("[selection] flattenNodeTree - total nodes:", result.length);
  return result;
}
