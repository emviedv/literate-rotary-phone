/**
 * Spec Applicator Module
 *
 * Creates the TikTok variant frame and applies the layout specification
 * using Figma's native auto-layout system.
 */

import type { LayoutSpec, NodeSpec, SemanticGroup } from "../types/layout-spec";

/** TikTok vertical dimensions */
const TIKTOK_WIDTH = 1080;
const TIKTOK_HEIGHT = 1920;

console.log("[spec-applicator] Module loaded, TikTok dimensions:", TIKTOK_WIDTH, "x", TIKTOK_HEIGHT);

/**
 * Build a mapping from source node IDs to cloned node IDs.
 * Walks both trees in parallel, matching by structure position.
 *
 * @param source - The original node tree
 * @param clone - The cloned node tree
 * @returns Map from source ID to clone ID
 */
function buildIdMapping(source: SceneNode, clone: SceneNode): Map<string, string> {
  const mapping = new Map<string, string>();

  function walkParallel(src: SceneNode, cloned: SceneNode): void {
    // Map this node
    mapping.set(src.id, cloned.id);
    console.log(`[buildIdMapping] ${src.id} (${src.name}) → ${cloned.id}`);

    // Recurse into children if both have them
    if ("children" in src && "children" in cloned) {
      const srcChildren = src.children as readonly SceneNode[];
      const clonedChildren = cloned.children as readonly SceneNode[];

      // Match by index (structure should be identical after clone)
      const len = Math.min(srcChildren.length, clonedChildren.length);
      for (let i = 0; i < len; i++) {
        walkParallel(srcChildren[i], clonedChildren[i]);
      }
    }
  }

  walkParallel(source, clone);
  console.log(`[buildIdMapping] Total mappings: ${mapping.size}`);
  return mapping;
}

/**
 * Remap node IDs in a spec using the source-to-clone mapping.
 * Modifies the spec in place.
 */
function remapSpecIds(spec: LayoutSpec, idMap: Map<string, string>): void {
  console.log("[remapSpecIds] Remapping spec IDs...");

  // Remap nodes array
  // IMPORTANT: If no mapping exists, KEEP the original ID (don't clear it)
  // This is critical for the second remapping pass where only converted groups have new IDs
  for (const nodeSpec of spec.nodes) {
    const newId = idMap.get(nodeSpec.nodeId);
    if (newId) {
      console.log(`[remapSpecIds] Node ${nodeSpec.nodeName}: ${nodeSpec.nodeId} → ${newId}`);
      nodeSpec.nodeId = newId;
    } else {
      console.log(`[remapSpecIds] Node ${nodeSpec.nodeName}: keeping ${nodeSpec.nodeId} (no mapping)`);
    }
  }

  // Remap semantic groups
  // IMPORTANT: If no mapping exists, KEEP the original ID (don't drop it)
  // This is critical for the second remapping pass where only converted groups have new IDs
  if (spec.semanticGroups) {
    for (const group of spec.semanticGroups) {
      const remappedIds: string[] = [];
      for (const nodeId of group.nodeIds) {
        const newId = idMap.get(nodeId);
        if (newId) {
          console.log(`[remapSpecIds] Group ${group.groupId}: ${nodeId} → ${newId}`);
          remappedIds.push(newId);
        } else {
          // Keep original ID - no mapping means it wasn't converted/changed
          console.log(`[remapSpecIds] Group ${group.groupId}: keeping ${nodeId} (no mapping)`);
          remappedIds.push(nodeId);
        }
      }
      group.nodeIds = remappedIds;
    }
  }

  console.log("[remapSpecIds] Remapping complete");
}

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

  // Build ID mapping from source to clone (critical for semantic groups)
  console.log("[spec-applicator] Building source-to-clone ID mapping...");
  const idMap = buildIdMapping(sourceFrame, variant);

  // Remap all IDs in the spec to use cloned node IDs
  remapSpecIds(spec, idMap);

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

  // Build a map of node specs by ID for quick lookup
  const specMap = new Map<string, NodeSpec>();
  for (const nodeSpec of spec.nodes) {
    specMap.set(nodeSpec.nodeId, nodeSpec);
    console.log("[spec-applicator] Mapped spec for node:", nodeSpec.nodeId, nodeSpec.nodeName);
  }
  console.log("[spec-applicator] Spec map size:", specMap.size);

  // Apply root layout configuration (convert to auto-layout if needed)
  console.log("[spec-applicator] Applying root layout...");
  applyRootLayout(variant, spec.rootLayout);

  // Convert nested containers to auto-layout (groups → frames, absolute → auto-layout)
  // This returns a map of ID changes that occurred during group-to-frame conversions
  console.log("[spec-applicator] Converting nested containers to auto-layout...");
  const conversionIdChanges = convertToAutoLayout(variant, specMap);

  // If any groups were converted to frames, their IDs changed - remap specs again
  if (conversionIdChanges.size > 0) {
    console.log("[spec-applicator] Remapping specs for", conversionIdChanges.size, "group-to-frame conversions...");
    remapSpecIds(spec, conversionIdChanges);

    // Also update specMap with new IDs
    for (const [oldId, newId] of conversionIdChanges) {
      const nodeSpec = specMap.get(oldId);
      if (nodeSpec) {
        console.log(`[spec-applicator] Moving specMap entry: ${oldId} → ${newId}`);
        specMap.delete(oldId);
        nodeSpec.nodeId = newId;
        specMap.set(newId, nodeSpec);
      }
    }
  }

  // Apply semantic grouping if present (takes precedence for ordering)
  let hasSemanticGroups = false;
  if (spec.semanticGroups && spec.semanticGroups.length > 0) {
    console.log("[spec-applicator] Applying semantic grouping...");
    hasSemanticGroups = true;
    const nodeToGroup = applySemanticGrouping(variant, spec.semanticGroups, specMap);
    console.log("[spec-applicator] Semantic grouping applied, mapped", nodeToGroup.size, "nodes to groups");
  } else {
    console.log("[spec-applicator] No semantic groups - using flat node ordering");
  }

  // Apply specs to all children
  console.log("[spec-applicator] Applying node specs...");
  await applyNodeSpecs(variant, specMap);

  // Reorder children based on order values (only if no semantic groups)
  // When semantic groups exist, they already handle the ordering
  if (!hasSemanticGroups) {
    console.log("[spec-applicator] Reordering children via node order values...");
    reorderChildren(variant, specMap);
  } else {
    console.log("[spec-applicator] Skipping node-level reorder - semantic groups handled ordering");
  }

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
    // CRITICAL: Skip nodes inside component instances - they're frozen
    if (isInsideComponentInstance(child)) {
      console.log("[spec-applicator] SKIP (inside component):", child.name, "id:", child.id);
      continue;
    }

    const spec = specMap.get(child.id);

    if (spec) {
      console.log("[spec-applicator] Applying spec to:", child.name, "id:", child.id);
      console.log("[spec-applicator]   visible:", spec.visible, "order:", spec.order);
      console.log("[spec-applicator]   sizing:", spec.widthSizing, "x", spec.heightSizing);

      // Apply visibility
      child.visible = spec.visible;

      // Apply sizing modes (only for nodes that support it)
      // IMPORTANT: HUG sizing requires auto-layout - skip for non-auto-layout frames
      if ("layoutSizingHorizontal" in child) {
        const isAutoLayoutFrame = child.type === "FRAME" && (child as FrameNode).layoutMode !== "NONE";
        const widthMode = sizingModeToFigma(spec.widthSizing);
        const heightMode = sizingModeToFigma(spec.heightSizing);

        // Only apply HUG to auto-layout frames (Figma requirement)
        if (widthMode === "HUG" && !isAutoLayoutFrame) {
          console.log("[spec-applicator]   SKIP width HUG - frame has no auto-layout");
        } else {
          child.layoutSizingHorizontal = widthMode;
        }

        if (heightMode === "HUG" && !isAutoLayoutFrame) {
          console.log("[spec-applicator]   SKIP height HUG - frame has no auto-layout");
        } else {
          child.layoutSizingVertical = heightMode;
        }
        console.log("[spec-applicator]   Applied sizing modes (auto-layout:", isAutoLayoutFrame, ")");
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
 * Convert nested containers to auto-layout for proper child reordering.
 *
 * This function:
 * 1. Converts Groups to Frames (Groups can't have auto-layout)
 * 2. Enables auto-layout on Frames with layoutMode === "NONE"
 * 3. Respects AI-specified layoutDirection (default: VERTICAL)
 * 4. Skips component instances (frozen, can't modify)
 * 5. Recurses into nested containers
 * 6. Returns a map of old IDs → new IDs for converted groups
 *
 * @param parent - The container to process
 * @param specMap - Map of node specs for layoutDirection lookup
 * @param idChanges - Map to track ID changes during group conversion
 */
function convertToAutoLayout(
  parent: FrameNode | GroupNode,
  specMap: Map<string, NodeSpec>,
  idChanges: Map<string, string> = new Map()
): Map<string, string> {
  console.log("[convertToAutoLayout] parent:", parent.name, "type:", parent.type);

  // CRITICAL: Don't process nodes inside component instances - they're frozen
  if (isInsideComponentInstance(parent)) {
    console.log("[convertToAutoLayout] ABORT - parent is inside a component instance:", parent.name);
    return idChanges;
  }

  const children = [...parent.children] as SceneNode[];

  for (const child of children) {
    // Skip component instances - they're frozen and can't be modified
    if (child.type === "INSTANCE") {
      console.log("[convertToAutoLayout] SKIPPING INSTANCE:", child.name, "id:", child.id);
      console.log("[convertToAutoLayout]   Instance is frozen - cannot modify structure");
      continue;
    }

    // Skip COMPONENT definitions
    if (child.type === "COMPONENT") {
      console.log("[convertToAutoLayout] SKIPPING COMPONENT:", child.name, "id:", child.id);
      console.log("[convertToAutoLayout]   Component definitions should not be modified");
      continue;
    }

    // Get spec for this node to check layoutDirection
    const spec = specMap.get(child.id);
    const layoutDirection = spec?.layoutDirection ?? "VERTICAL"; // Default to VERTICAL
    console.log("[convertToAutoLayout] Processing:", child.name, "type:", child.type, "layoutDirection:", layoutDirection);

    // If AI explicitly requested "NONE", skip conversion
    if (layoutDirection === "NONE") {
      console.log("[convertToAutoLayout] AI requested NONE for:", child.name, "- keeping absolute positioning");
      // Still recurse into children - pass idChanges to track any nested conversions
      if ("children" in child && (child.type === "FRAME" || child.type === "GROUP")) {
        console.log("[convertToAutoLayout] Recursing into NONE-direction child:", child.name);
        convertToAutoLayout(child as FrameNode | GroupNode, specMap, idChanges);
      }
      continue;
    }

    // Handle Groups - convert to Frame first
    if (child.type === "GROUP") {
      const group = child as GroupNode;
      const oldId = group.id;

      // Capture ALL properties BEFORE any modifications (group becomes stale after children move)
      const groupName = group.name;
      const groupX = group.x;
      const groupY = group.y;
      const groupWidth = group.width;
      const groupHeight = group.height;
      const groupIndex = parent.children.indexOf(group);
      const groupChildren = [...group.children] as SceneNode[];

      console.log("[convertToAutoLayout] Converting GROUP to FRAME:", groupName);
      console.log("[convertToAutoLayout]   Old ID:", oldId);
      console.log("[convertToAutoLayout]   Group index in parent:", groupIndex);
      console.log("[convertToAutoLayout]   Children count:", groupChildren.length);

      const frame = figma.createFrame();
      const newId = frame.id;

      // Track ID change
      idChanges.set(oldId, newId);
      console.log("[convertToAutoLayout]   ID CHANGED:", oldId, "→", newId);

      // Copy basic properties from saved values
      frame.name = groupName;
      frame.x = groupX;
      frame.y = groupY;
      frame.resize(groupWidth, groupHeight);
      frame.fills = []; // Transparent background

      // Move children from group to frame (preserving relative positions)
      // Note: After this loop, the group becomes empty and Figma auto-removes it
      for (const groupChild of groupChildren) {
        // Calculate relative position within group (using saved groupX/Y)
        const relX = groupChild.x - groupX;
        const relY = groupChild.y - groupY;

        frame.appendChild(groupChild);

        // Restore relative position
        groupChild.x = relX;
        groupChild.y = relY;
      }

      // Replace group with frame in parent
      // Safety check: if index is -1, append at end
      if (groupIndex >= 0) {
        parent.insertChild(groupIndex, frame);
      } else {
        console.log("[spec-applicator] Warning: group not found in parent, appending frame");
        parent.appendChild(frame);
      }

      // Note: Figma automatically removes Groups when they become empty
      // The group is now stale - don't try to access it
      console.log("[spec-applicator] Group converted (auto-removed by Figma):", groupName);

      // Now apply auto-layout to the new frame
      applyAutoLayoutToFrame(frame, layoutDirection);
      console.log("[spec-applicator] Group converted and auto-layout applied:", frame.name);

      // Recurse into the new frame - pass idChanges to track nested conversions
      console.log("[convertToAutoLayout] Recursing into converted frame:", frame.name);
      convertToAutoLayout(frame, specMap, idChanges);
      continue;
    }

    // Handle Frames without auto-layout
    if (child.type === "FRAME") {
      const frame = child as FrameNode;

      // Check if frame contains INSTANCE children - these are product mockups
      // and should keep absolute positioning to preserve decorative elements
      const hasInstanceChild = frame.children.some(c => c.type === "INSTANCE");
      if (hasInstanceChild) {
        console.log("[convertToAutoLayout] SKIP auto-layout for product mockup frame:", frame.name);
        console.log("[convertToAutoLayout]   Contains INSTANCE child - preserving entire subtree");
        // DO NOT recurse into product mockups - their entire internal structure
        // (Container, Groups, decorative elements) must remain absolute-positioned
        continue;
      }

      if (frame.layoutMode === "NONE") {
        console.log("[spec-applicator] Converting FRAME to auto-layout:", frame.name);
        applyAutoLayoutToFrame(frame, layoutDirection);
      } else {
        console.log("[spec-applicator] Frame already has auto-layout:", frame.name, frame.layoutMode);
      }

      // Recurse into child frames - pass idChanges to track nested conversions
      console.log("[convertToAutoLayout] Recursing into frame:", frame.name);
      convertToAutoLayout(frame, specMap, idChanges);
    }
  }

  // Return the accumulated ID changes
  console.log("[convertToAutoLayout] Returning", idChanges.size, "ID changes");
  return idChanges;
}

/**
 * Apply auto-layout configuration to a frame.
 */
function applyAutoLayoutToFrame(
  frame: FrameNode,
  direction: "VERTICAL" | "HORIZONTAL"
): void {
  console.log("[spec-applicator] applyAutoLayoutToFrame:", frame.name, "direction:", direction);

  frame.layoutMode = direction;
  frame.primaryAxisAlignItems = "MIN";
  frame.counterAxisAlignItems = "MIN";
  frame.itemSpacing = 0; // No gap by default - preserve original spacing
  frame.paddingTop = 0;
  frame.paddingRight = 0;
  frame.paddingBottom = 0;
  frame.paddingLeft = 0;

  // Use HUG sizing so frame adapts to content
  frame.layoutSizingHorizontal = "HUG";
  frame.layoutSizingVertical = "HUG";

  console.log("[spec-applicator] Auto-layout applied to:", frame.name);
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

/**
 * Check if a node is inside a component instance (i.e., one of its ancestors is an INSTANCE).
 * Nodes inside instances are part of the component's frozen structure and should NOT be modified.
 */
function isInsideComponentInstance(node: SceneNode): boolean {
  let current: BaseNode | null = node.parent;
  while (current) {
    if ("type" in current) {
      if ((current as SceneNode).type === "INSTANCE") {
        console.log(`[isInsideComponentInstance] Node ${node.name} (${node.id}) is inside instance ${current.name}`);
        return true;
      }
      if ((current as SceneNode).type === "COMPONENT") {
        console.log(`[isInsideComponentInstance] Node ${node.name} (${node.id}) is inside component ${current.name}`);
        return true;
      }
    }
    current = current.parent;
  }
  return false;
}

/**
 * Build a map of ALL nodes in the tree by ID.
 * Also detects and logs component instances to help debug component separation issues.
 */
function buildNodeMap(parent: FrameNode | GroupNode): Map<string, SceneNode> {
  const map = new Map<string, SceneNode>();
  const instanceNodes: string[] = [];
  const componentNodes: string[] = [];

  function walk(node: SceneNode, insideInstance: boolean = false): void {
    map.set(node.id, node);

    // Track instances and components for debugging
    if (node.type === "INSTANCE") {
      instanceNodes.push(`${node.name} (${node.id})`);
      insideInstance = true; // Children are inside this instance
    }
    if (node.type === "COMPONENT") {
      componentNodes.push(`${node.name} (${node.id})`);
    }

    // If we're inside an instance, log the child (helps debug component separation)
    if (insideInstance && node.type !== "INSTANCE") {
      console.log(`[buildNodeMap] Instance child: ${node.name} (${node.id}) - type: ${node.type}`);
    }

    if ("children" in node) {
      for (const child of (node as FrameNode | GroupNode).children) {
        walk(child, insideInstance);
      }
    }
  }

  for (const child of parent.children) {
    walk(child, false);
  }

  if (instanceNodes.length > 0) {
    console.log("[buildNodeMap] Found INSTANCE nodes:", instanceNodes.join(", "));
  }
  if (componentNodes.length > 0) {
    console.log("[buildNodeMap] Found COMPONENT nodes:", componentNodes.join(", "));
  }

  return map;
}

/**
 * Apply semantic grouping to reorder and control visibility of elements.
 *
 * This function:
 * 1. Sorts groups by their order values
 * 2. Applies group-level visibility (hides all nodes in hidden groups)
 * 3. Reorders frame direct children so grouped elements stay together
 * 4. Nested nodes get visibility applied but aren't reordered at root level
 *
 * @param frame - The TikTok variant frame to modify
 * @param groups - Semantic groups from the AI
 * @param specMap - Map of individual node specs for fallback
 * @returns Map of node ID to group for downstream processing
 */
function applySemanticGrouping(
  frame: FrameNode,
  groups: SemanticGroup[],
  specMap: Map<string, NodeSpec>
): Map<string, SemanticGroup> {
  console.log("[applySemanticGrouping] Starting with", groups.length, "groups");

  // Build complete node map for the entire tree
  const allNodesMap = buildNodeMap(frame);
  console.log("[applySemanticGrouping] Built node map with", allNodesMap.size, "nodes");

  // Build direct children map for reordering
  const directChildMap = new Map<string, SceneNode>();
  for (const child of frame.children) {
    directChildMap.set(child.id, child);
  }
  console.log("[applySemanticGrouping] Direct children:", directChildMap.size);

  // Build node-to-group lookup, but SKIP nodes inside component instances
  const nodeToGroup = new Map<string, SemanticGroup>();
  const skippedComponentNodes: string[] = [];

  for (const group of groups) {
    for (const nodeId of group.nodeIds) {
      const node = allNodesMap.get(nodeId);
      const isDirect = directChildMap.has(nodeId);

      // CRITICAL: Skip nodes that are inside component instances
      // These are part of the component's frozen structure and should NOT be manipulated
      if (node && isInsideComponentInstance(node)) {
        skippedComponentNodes.push(`${node.name} (${nodeId})`);
        console.log(`[applySemanticGrouping] SKIPPING node inside component: ${node.name} (${nodeId})`);
        continue;
      }

      nodeToGroup.set(nodeId, group);
      console.log(`[applySemanticGrouping] Mapped node ${nodeId} (${node?.name ?? "NOT FOUND"}) to group ${group.groupId} (${group.role}) - direct: ${isDirect}`);
    }
  }

  if (skippedComponentNodes.length > 0) {
    console.log(`[applySemanticGrouping] PROTECTED ${skippedComponentNodes.length} nodes inside components:`, skippedComponentNodes.join(", "));
  }

  // Sort groups by order (lower = first/top)
  const sortedGroups = [...groups].sort((a, b) => a.order - b.order);
  console.log("[applySemanticGrouping] Sorted groups:", sortedGroups.map(g => `${g.role}:${g.order}`).join(", "));

  // Build flat ordered list of node IDs from visible groups
  // AND apply visibility to all nodes (including nested)
  // CRITICAL: Skip nodes inside component instances
  const orderedNodeIds: string[] = [];
  for (const group of sortedGroups) {
    if (group.visible) {
      console.log(`[applySemanticGrouping] Group "${group.groupId}" (${group.role}) visible - nodes:`, group.nodeIds);

      for (const nodeId of group.nodeIds) {
        const node = allNodesMap.get(nodeId);

        // Skip nodes inside components - they're frozen
        if (node && isInsideComponentInstance(node)) {
          console.log(`[applySemanticGrouping] SKIP visibility for component child: ${node.name} (${nodeId})`);
          continue;
        }

        orderedNodeIds.push(nodeId);

        // Ensure visible nodes are actually visible
        if (node) {
          node.visible = true;
        }
      }
    } else {
      console.log(`[applySemanticGrouping] Group "${group.groupId}" (${group.role}) hidden - hiding nodes:`, group.nodeIds);

      // Hide all nodes in this group (works for nested nodes too)
      for (const nodeId of group.nodeIds) {
        const node = allNodesMap.get(nodeId);

        // Skip nodes inside components - they're frozen
        if (node && isInsideComponentInstance(node)) {
          console.log(`[applySemanticGrouping] SKIP visibility for component child: ${node.name} (${nodeId})`);
          continue;
        }

        if (node) {
          node.visible = false;
          console.log(`[applySemanticGrouping] Hidden: ${node.name} (${nodeId})`);
        }
      }
    }
  }

  console.log("[applySemanticGrouping] Ordered node IDs:", orderedNodeIds);

  // Reorder DIRECT children based on orderedNodeIds
  // Nodes not in any group stay at the end in their original order
  const reorderedChildren: SceneNode[] = [];
  const usedIds = new Set<string>();

  // First, add direct children in group order
  for (const nodeId of orderedNodeIds) {
    const child = directChildMap.get(nodeId);
    if (child) {
      reorderedChildren.push(child);
      usedIds.add(nodeId);
      console.log(`[applySemanticGrouping] Ordered (direct): ${child.name} (${nodeId})`);
    } else {
      // Node exists but is nested - can't reorder at root level
      const nestedNode = allNodesMap.get(nodeId);
      if (nestedNode) {
        console.log(`[applySemanticGrouping] Skipping nested node (can't reorder at root): ${nestedNode.name} (${nodeId})`);
      } else {
        console.log(`[applySemanticGrouping] Warning: Node ${nodeId} not found anywhere in tree`);
      }
    }
  }

  // Then add any remaining children not in groups (preserve original order)
  for (const child of frame.children) {
    if (!usedIds.has(child.id)) {
      reorderedChildren.push(child);
      console.log(`[applySemanticGrouping] Ungrouped: ${child.name} (${child.id})`);
    }
  }

  // Apply the new order to Figma
  console.log("[applySemanticGrouping] Applying new order to frame...");
  for (let i = 0; i < reorderedChildren.length; i++) {
    frame.insertChild(i, reorderedChildren[i]);
  }
  console.log("[applySemanticGrouping] Reordering complete");

  return nodeToGroup;
}
