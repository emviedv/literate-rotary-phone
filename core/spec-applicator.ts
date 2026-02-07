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

console.log("[spec-applicator] Module loaded, TikTok dimensions:", TIKTOK_WIDTH, "x", TIKTOK_HEIGHT);

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
  console.log("[spec-applicator] applyLayoutSpec started");
  console.log("[spec-applicator] Source frame:", sourceFrame.name, "id:", sourceFrame.id);
  console.log("[spec-applicator] Spec nodes count:", spec.nodes.length);

  // Clone the source frame
  console.log("[spec-applicator] Cloning source frame...");
  const variant = sourceFrame.clone();
  variant.name = `${sourceFrame.name} - TikTok`;
  console.log("[spec-applicator] Clone created:", variant.name, "id:", variant.id);

  // Get or create the dedicated TikTok outputs page
  const outputPage = getOrCreateOutputPage();

  // Calculate position BEFORE appending (so it doesn't include this variant)
  const nextY = getNextYPosition(outputPage);

  // Move variant to output page
  console.log("[spec-applicator] Moving variant to output page...");
  outputPage.appendChild(variant);

  // Position on output page (stack vertically)
  variant.x = 0;
  variant.y = nextY;
  console.log("[spec-applicator] Positioned on output page at:", variant.x, variant.y);

  // Resize to TikTok dimensions
  console.log("[spec-applicator] Resizing to TikTok dimensions...");
  variant.resize(TIKTOK_WIDTH, TIKTOK_HEIGHT);
  console.log("[spec-applicator] New dimensions:", variant.width, "x", variant.height);

  // Apply root layout configuration (convert to auto-layout if needed)
  console.log("[spec-applicator] Applying root layout...");
  applyRootLayout(variant, spec.rootLayout);

  // Build a map of node specs by ID for quick lookup
  const specMap = new Map<string, NodeSpec>();
  for (const nodeSpec of spec.nodes) {
    specMap.set(nodeSpec.nodeId, nodeSpec);
    console.log("[spec-applicator] Mapped spec for node:", nodeSpec.nodeId, nodeSpec.nodeName);
  }
  console.log("[spec-applicator] Spec map size:", specMap.size);

  // Apply specs to all children
  console.log("[spec-applicator] Applying node specs...");
  await applyNodeSpecs(variant, specMap);

  // Reorder children based on order values
  console.log("[spec-applicator] Reordering children...");
  reorderChildren(variant, specMap);

  console.log("[spec-applicator] Layout application complete");
  return variant;
}

/**
 * Apply root layout configuration to the variant frame.
 */
function applyRootLayout(frame: FrameNode, layout: LayoutSpec["rootLayout"]): void {
  console.log("[spec-applicator] applyRootLayout - frame:", frame.name);
  console.log("[spec-applicator] Layout config:", JSON.stringify(layout));

  // Enable auto-layout with vertical direction
  frame.layoutMode = "VERTICAL";
  console.log("[spec-applicator] Set layoutMode to VERTICAL");

  // Apply padding
  frame.paddingTop = layout.padding.top;
  frame.paddingRight = layout.padding.right;
  frame.paddingBottom = layout.padding.bottom;
  frame.paddingLeft = layout.padding.left;
  console.log("[spec-applicator] Applied padding:", layout.padding);

  // Apply gap
  frame.itemSpacing = layout.gap;
  console.log("[spec-applicator] Applied gap:", layout.gap);

  // Apply alignment
  frame.primaryAxisAlignItems = layout.primaryAxisAlign;
  frame.counterAxisAlignItems = layout.counterAxisAlign;
  console.log("[spec-applicator] Applied alignment - primary:", layout.primaryAxisAlign, "counter:", layout.counterAxisAlign);

  // Ensure frame sizing is fixed (we set the dimensions explicitly)
  frame.layoutSizingHorizontal = "FIXED";
  frame.layoutSizingVertical = "FIXED";
  console.log("[spec-applicator] Set sizing to FIXED");

  // Clip content that overflows
  frame.clipsContent = true;
  console.log("[spec-applicator] Enabled content clipping");
}

/**
 * Recursively apply node specs to all descendants.
 */
async function applyNodeSpecs(
  parent: FrameNode | GroupNode,
  specMap: Map<string, NodeSpec>
): Promise<void> {
  const children = [...parent.children] as SceneNode[];
  console.log("[spec-applicator] applyNodeSpecs - parent:", parent.name, "children count:", children.length);

  for (const child of children) {
    const spec = specMap.get(child.id);

    if (spec) {
      console.log("[spec-applicator] Applying spec to:", child.name, "id:", child.id);
      console.log("[spec-applicator]   visible:", spec.visible, "order:", spec.order);
      console.log("[spec-applicator]   sizing:", spec.widthSizing, "x", spec.heightSizing);

      // Apply visibility
      child.visible = spec.visible;

      // Apply sizing modes (only for nodes that support it)
      if ("layoutSizingHorizontal" in child) {
        child.layoutSizingHorizontal = sizingModeToFigma(spec.widthSizing);
        child.layoutSizingVertical = sizingModeToFigma(spec.heightSizing);
        console.log("[spec-applicator]   Applied sizing modes");
      }

      // Apply scale factor if specified
      if (spec.scaleFactor && spec.scaleFactor !== 1 && "resize" in child) {
        const currentWidth = child.width;
        const currentHeight = child.height;
        child.resize(
          currentWidth * spec.scaleFactor,
          currentHeight * spec.scaleFactor
        );
        console.log("[spec-applicator]   Applied scale factor:", spec.scaleFactor);
      }
    } else {
      console.log("[spec-applicator] No spec for node:", child.name, "id:", child.id);
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
  console.log("[spec-applicator] reorderChildren - parent:", parent.name, "layoutMode:", parent.layoutMode);

  // Only reorder if parent has auto-layout
  if (parent.layoutMode === "NONE") {
    console.log("[spec-applicator] Skipping reorder - no auto-layout");
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

  console.log("[spec-applicator] Child orders before sort:", childOrders.map(c => `${c.node.name}:${c.order}`).join(", "));

  // Sort by order value
  childOrders.sort((a, b) => a.order - b.order);

  console.log("[spec-applicator] Child orders after sort:", childOrders.map(c => `${c.node.name}:${c.order}`).join(", "));

  // Reorder in Figma by moving each child to its correct position
  for (let i = 0; i < childOrders.length; i++) {
    const { node } = childOrders[i];
    parent.insertChild(i, node);
  }
  console.log("[spec-applicator] Children reordered");

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
      console.log("[spec-applicator] Unknown sizing mode:", mode, "- defaulting to HUG");
      return "HUG";
  }
}

/**
 * Get or create the dedicated TikTok outputs page.
 * This keeps generated variants organized in one place.
 */
function getOrCreateOutputPage(): PageNode {
  const pageName = "TikTok Outputs";
  console.log("[spec-applicator] Looking for output page:", pageName);

  // Find existing page
  let page = figma.root.children.find(p => p.name === pageName) as PageNode | undefined;

  // Create if doesn't exist
  if (!page) {
    console.log("[spec-applicator] Output page not found, creating new page");
    page = figma.createPage();
    page.name = pageName;
    console.log("[spec-applicator] Created output page:", pageName, "id:", page.id);
  } else {
    console.log("[spec-applicator] Found existing output page, id:", page.id);
  }

  return page;
}

/**
 * Calculate the next Y position for stacking variants vertically.
 * Returns 0 if page is empty, otherwise the bottom of the lowest frame + gap.
 */
function getNextYPosition(page: PageNode): number {
  console.log("[spec-applicator] Calculating next Y position, children count:", page.children.length);

  if (page.children.length === 0) {
    console.log("[spec-applicator] Page is empty, starting at Y=0");
    return 0;
  }

  // Find the bottom-most frame
  let maxY = 0;
  for (const child of page.children) {
    const bottom = child.y + child.height;
    if (bottom > maxY) {
      maxY = bottom;
      console.log("[spec-applicator] New max bottom:", bottom, "from node:", child.name);
    }
  }

  const nextY = maxY + 100; // 100px gap between outputs
  console.log("[spec-applicator] Next Y position:", nextY);
  return nextY;
}
