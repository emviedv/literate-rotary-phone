/**
 * Spec Applicator Module
 *
 * Creates the TikTok variant frame and applies the layout specification
 * using Figma's native auto-layout system.
 */

import type { LayoutSpec, NodeSpec } from "../types/layout-spec";

/** TikTok vertical dimensions */
const TIKTOK_WIDTH = 1080;
const TIKTOK_HEIGHT = 1920;

/**
 * Apply a layout specification to create a TikTok variant.
 *
 * @param sourceFrame - The original frame to transform
 * @param spec - The layout specification from the AI
 * @returns The newly created TikTok variant frame
 */
export async function applyLayoutSpec(
  sourceFrame: FrameNode,
  spec: LayoutSpec
): Promise<FrameNode> {
  // Clone the source frame
  const variant = sourceFrame.clone();
  variant.name = `${sourceFrame.name} - TikTok`;

  // Position next to the source frame
  variant.x = sourceFrame.x + sourceFrame.width + 100;
  variant.y = sourceFrame.y;

  // Resize to TikTok dimensions
  variant.resize(TIKTOK_WIDTH, TIKTOK_HEIGHT);

  // Apply root layout configuration (convert to auto-layout if needed)
  applyRootLayout(variant, spec.rootLayout);

  // Build a map of node specs by ID for quick lookup
  const specMap = new Map<string, NodeSpec>();
  for (const nodeSpec of spec.nodes) {
    specMap.set(nodeSpec.nodeId, nodeSpec);
  }

  // Apply specs to all children
  await applyNodeSpecs(variant, specMap);

  // Reorder children based on order values
  reorderChildren(variant, specMap);

  return variant;
}

/**
 * Apply root layout configuration to the variant frame.
 */
function applyRootLayout(frame: FrameNode, layout: LayoutSpec["rootLayout"]): void {
  // Enable auto-layout with vertical direction
  frame.layoutMode = "VERTICAL";

  // Apply padding
  frame.paddingTop = layout.padding.top;
  frame.paddingRight = layout.padding.right;
  frame.paddingBottom = layout.padding.bottom;
  frame.paddingLeft = layout.padding.left;

  // Apply gap
  frame.itemSpacing = layout.gap;

  // Apply alignment
  frame.primaryAxisAlignItems = layout.primaryAxisAlign;
  frame.counterAxisAlignItems = layout.counterAxisAlign;

  // Ensure frame sizing is fixed (we set the dimensions explicitly)
  frame.layoutSizingHorizontal = "FIXED";
  frame.layoutSizingVertical = "FIXED";

  // Clip content that overflows
  frame.clipsContent = true;
}

/**
 * Recursively apply node specs to all descendants.
 */
async function applyNodeSpecs(
  parent: FrameNode | GroupNode,
  specMap: Map<string, NodeSpec>
): Promise<void> {
  const children = [...parent.children] as SceneNode[];

  for (const child of children) {
    const spec = specMap.get(child.id);

    if (spec) {
      // Apply visibility
      child.visible = spec.visible;

      // Apply sizing modes (only for nodes that support it)
      if ("layoutSizingHorizontal" in child) {
        child.layoutSizingHorizontal = sizingModeToFigma(spec.widthSizing);
        child.layoutSizingVertical = sizingModeToFigma(spec.heightSizing);
      }

      // Apply scale factor if specified
      if (spec.scaleFactor && spec.scaleFactor !== 1 && "resize" in child) {
        const currentWidth = child.width;
        const currentHeight = child.height;
        child.resize(
          currentWidth * spec.scaleFactor,
          currentHeight * spec.scaleFactor
        );
      }
    }

    // Recurse into container nodes
    if ("children" in child) {
      await applyNodeSpecs(child as FrameNode | GroupNode, specMap);
    }
  }
}

/**
 * Reorder children based on the order values in the spec.
 * Only reorders direct children of frames with auto-layout.
 */
function reorderChildren(
  parent: FrameNode,
  specMap: Map<string, NodeSpec>
): void {
  // Only reorder if parent has auto-layout
  if (parent.layoutMode === "NONE") {
    return;
  }

  const children = [...parent.children] as SceneNode[];

  // Get order values for children, defaulting to a high number for unspecified nodes
  const childOrders: Array<{ node: SceneNode; order: number }> = children.map((child) => {
    const spec = specMap.get(child.id);
    return {
      node: child,
      order: spec?.order ?? 999,
    };
  });

  // Sort by order value
  childOrders.sort((a, b) => a.order - b.order);

  // Reorder in Figma by moving each child to its correct position
  for (let i = 0; i < childOrders.length; i++) {
    const { node } = childOrders[i];
    // Move to index i (this is a no-op if already in correct position)
    parent.insertChild(i, node);
  }

  // Recurse into child frames
  for (const child of parent.children) {
    if (child.type === "FRAME" && child.layoutMode !== "NONE") {
      reorderChildren(child, specMap);
    }
  }
}

/**
 * Convert our sizing mode enum to Figma's expected values.
 */
function sizingModeToFigma(mode: NodeSpec["widthSizing"]): "FILL" | "HUG" | "FIXED" {
  switch (mode) {
    case "FILL":
      return "FILL";
    case "HUG":
      return "HUG";
    case "FIXED":
      return "FIXED";
    default:
      return "HUG";
  }
}
