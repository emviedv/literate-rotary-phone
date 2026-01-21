import { debugAutoLayoutLog } from "./debug.js";
import type {
  LayoutAdviceEntry,
  ElementPositioning,
  AnchorRegion
} from "../types/layout-advice.js";
import {
  hasTextChildren,
  hasImageChildren,
  countFlowChildren,
  isComponentLikeFrame
} from "./layout-detection-helpers.js";
import {
  type LayoutContext,
  determineOptimalLayoutMode,
  determineSizingModes,
  determineWrapBehavior
} from "./layout-mode-resolver.js";
import { determineAlignments } from "./layout-alignment.js";
import { calculateSpacing, calculatePaddingAdjustments } from "./layout-spacing.js";

/**
 * Auto Layout Adapter - Intelligently restructures auto layouts for different target formats
 *
 * FREESTYLE POSITIONING MODE:
 * This module now operates in "full freestyle" mode where the AI provides
 * per-node positioning directly via the `positioning` map. Pattern-based
 * child adaptations have been removed - AI decisions are trusted directly.
 *
 * When AI positioning is available, children are positioned using:
 * - anchor: 9-point grid positioning
 * - offset: edge offsets with safe area awareness
 * - size: fixed/percentage sizing
 * - text: maxLines, minFontSize, textAlign
 * - visible: show/hide nodes
 *
 * When AI positioning is NOT available (fallback), children use scaled
 * source positioning without deterministic restructuring.
 */

export interface LayoutAdaptationPlan {
  layoutMode: "HORIZONTAL" | "VERTICAL" | "NONE";
  primaryAxisSizingMode: FrameNode["primaryAxisSizingMode"];
  counterAxisSizingMode: FrameNode["counterAxisSizingMode"];
  primaryAxisAlignItems: FrameNode["primaryAxisAlignItems"];
  counterAxisAlignItems: FrameNode["counterAxisAlignItems"];
  layoutWrap: "WRAP" | "NO_WRAP";
  layoutGrow?: number;
  itemSpacing: number;
  counterAxisSpacing?: number;
  paddingAdjustments: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
}


/**
 * Creates an adaptation plan for auto layout based on source and target
 */
export function createLayoutAdaptationPlan(
  frame: FrameNode,
  target: { width: number; height: number },
  profile: "horizontal" | "vertical" | "square",
  scale: number,
  options?: {
    readonly sourceLayoutMode?: "HORIZONTAL" | "VERTICAL" | "NONE";
    readonly sourceSize?: { readonly width: number; readonly height: number };
    readonly sourceFlowChildCount?: number;
    readonly adoptVerticalVariant?: boolean;
    readonly sourceItemSpacing?: number | null;
    readonly sourcePadding?: {
      readonly top: number;
      readonly right: number;
      readonly bottom: number;
      readonly left: number;
    };
    readonly sourceAlignments?: {
      readonly primaryAxisAlignItems: FrameNode["primaryAxisAlignItems"];
      readonly counterAxisAlignItems: FrameNode["counterAxisAlignItems"];
    };
    readonly layoutAdvice?: LayoutAdviceEntry;
    readonly safeAreaRatio?: number;
  }
): LayoutAdaptationPlan {
  const sourceLayoutMode: LayoutContext["sourceLayout"]["mode"] =
    options?.sourceLayoutMode ??
    (frame.layoutMode === "GRID" ? "NONE" : frame.layoutMode);

  // Calculate safe area dimensions for spacing calculations
  const safeAreaRatio = options?.safeAreaRatio ?? 0;
  const safeWidth = target.width - (target.width * safeAreaRatio * 2);
  const safeHeight = target.height - (target.height * safeAreaRatio * 2);

  // Resolve source padding: prefer options.sourcePadding, fallback to frame values
  const sourcePadding = options?.sourcePadding ?? {
    top: frame.paddingTop || 0,
    right: frame.paddingRight || 0,
    bottom: frame.paddingBottom || 0,
    left: frame.paddingLeft || 0
  };

  // Resolve source alignments: prefer options.sourceAlignments, fallback to frame values
  // Only capture alignments if they exist and are valid on the frame
  const sourceAlignments = options?.sourceAlignments ?? (
    frame.layoutMode !== "NONE" &&
    "primaryAxisAlignItems" in frame &&
    "counterAxisAlignItems" in frame &&
    frame.primaryAxisAlignItems !== undefined &&
    frame.counterAxisAlignItems !== undefined
      ? {
          primaryAxisAlignItems: frame.primaryAxisAlignItems,
          counterAxisAlignItems: frame.counterAxisAlignItems
        }
      : undefined
  );

  const context: LayoutContext = {
    sourceLayout: {
      mode: sourceLayoutMode,
      width: options?.sourceSize?.width ?? frame.width,
      height: options?.sourceSize?.height ?? frame.height,
      childCount:
        options?.sourceFlowChildCount ?? countFlowChildren(frame),
      hasText: hasTextChildren(frame),
      hasImages: hasImageChildren(frame),
      itemSpacing: options?.sourceItemSpacing ?? (frame.layoutMode !== "NONE" ? frame.itemSpacing : null),
      padding: sourcePadding,
      alignments: sourceAlignments
    },
    targetProfile: {
      type: profile,
      width: target.width,
      height: target.height,
      aspectRatio: target.width / target.height,
      safeWidth,
      safeHeight
    },
    scale,
    adoptVerticalVariant: options?.adoptVerticalVariant ?? false,
    layoutAdvice: options?.layoutAdvice
  };

  // Determine the best layout mode for the target
  const newLayoutMode = determineOptimalLayoutMode(context);

  // Calculate sizing modes based on new layout
  const sizingModes = determineSizingModes(newLayoutMode, context);

  // Determine alignment strategies
  const alignments = determineAlignments(newLayoutMode, context);

  // Calculate wrap behavior
  const wrapBehavior = determineWrapBehavior(newLayoutMode, context);

  // Calculate spacing adjustments
  const spacing = calculateSpacing(frame, newLayoutMode, context);

  // Calculate padding adjustments
  const padding = calculatePaddingAdjustments(frame, newLayoutMode, context);

  // FREESTYLE MODE: Child adaptations are now handled by AI positioning map
  // No deterministic child-specific adaptations are created here

  const plan: LayoutAdaptationPlan = {
    layoutMode: newLayoutMode,
    primaryAxisSizingMode: sizingModes.primary,
    counterAxisSizingMode: sizingModes.counter,
    primaryAxisAlignItems: alignments.primary,
    counterAxisAlignItems: alignments.counter,
    layoutWrap: wrapBehavior,
    itemSpacing: spacing.item,
    counterAxisSpacing: spacing.counter,
    paddingAdjustments: padding
  };

  debugAutoLayoutLog("layout adaptation plan summary (FREESTYLE)", {
    targetType: context.targetProfile.type,
    adoptVerticalVariant: context.adoptVerticalVariant,
    targetSize: `${context.targetProfile.width}x${context.targetProfile.height}`,
    sourceLayout: {
      mode: context.sourceLayout.mode,
      width: context.sourceLayout.width,
      height: context.sourceLayout.height,
      childCount: context.sourceLayout.childCount,
      itemSpacing: context.sourceLayout.itemSpacing
    },
    scale: context.scale,
    resolvedLayoutMode: plan.layoutMode,
    alignments: {
      primary: plan.primaryAxisAlignItems,
      counter: plan.counterAxisAlignItems
    },
    sizing: {
      primary: plan.primaryAxisSizingMode,
      counter: plan.counterAxisSizingMode
    },
    layoutWrap: plan.layoutWrap,
    itemSpacing: plan.itemSpacing,
    paddingAdjustments: plan.paddingAdjustments,
    hasAiPositioning: !!(options?.layoutAdvice?.positioning)
  });

  return plan;
}

/**
 * Applies the adaptation plan to a frame
 *
 * FREESTYLE POSITIONING MODE:
 * - If AI positioning map is available, use it for per-node decisions
 * - If AI positioning is missing, apply frame-level layout only (scale-only fallback)
 * - No deterministic child adaptations are applied
 *
 * @param frame The frame to adapt
 * @param plan The layout adaptation plan
 * @param layoutAdvice Optional AI layout advice containing positioning instructions
 */
export function applyLayoutAdaptation(
  frame: FrameNode,
  plan: LayoutAdaptationPlan,
  layoutAdvice?: LayoutAdviceEntry
): void {
  // FIRST: Hide elements that AI recommends dropping (before applying layout)
  if (layoutAdvice?.restructure?.drop?.length) {
    hideDroppedElements(frame, layoutAdvice.restructure.drop);
  }

  // Apply main layout properties (frame-level)
  frame.layoutMode = plan.layoutMode;

  if (plan.layoutMode !== "NONE") {
    frame.primaryAxisSizingMode = plan.primaryAxisSizingMode;
    frame.counterAxisSizingMode = plan.counterAxisSizingMode;
    frame.primaryAxisAlignItems = plan.primaryAxisAlignItems;
    frame.counterAxisAlignItems = plan.counterAxisAlignItems;
    frame.layoutWrap = plan.layoutWrap;
    frame.itemSpacing = plan.itemSpacing;

    if (plan.layoutWrap === "WRAP" && plan.counterAxisSpacing !== undefined) {
      frame.counterAxisSpacing = plan.counterAxisSpacing;
    }

    frame.paddingTop = plan.paddingAdjustments.top;
    frame.paddingRight = plan.paddingAdjustments.right;
    frame.paddingBottom = plan.paddingAdjustments.bottom;
    frame.paddingLeft = plan.paddingAdjustments.left;
  }

  // ============================================================================
  // FREESTYLE MODE: Apply AI per-node positioning if available
  // ============================================================================
  if (layoutAdvice?.positioning && Object.keys(layoutAdvice.positioning).length > 0) {
    debugAutoLayoutLog("applyLayoutAdaptation: FREESTYLE MODE - using AI positioning map", {
      frameId: frame.id,
      frameName: frame.name,
      positioningEntries: Object.keys(layoutAdvice.positioning).length,
      targetId: layoutAdvice.targetId
    });

    applyAiPositioningToChildren(frame, layoutAdvice.positioning);
  } else {
    // SCALE-ONLY FALLBACK: No AI positioning available
    // Children retain their source positioning (scaled proportionally)
    debugAutoLayoutLog("applyLayoutAdaptation: SCALE-ONLY FALLBACK - no AI positioning", {
      frameId: frame.id,
      frameName: frame.name,
      targetId: layoutAdvice?.targetId ?? "unknown",
      reason: "AI positioning map is empty or missing"
    });
  }
}

// ============================================================================
// AI POSITIONING APPLICATION (AI-ONLY MODE)
// ============================================================================

/**
 * Applies AI positioning directives to a child node.
 * This is the core of AI-ONLY mode - trusting AI's per-node positioning.
 *
 * @param child - The child node to position
 * @param positioning - AI's positioning directive for this node
 * @param frameWidth - Parent frame width for calculating positions
 * @param frameHeight - Parent frame height for calculating positions
 */
function applyAiPositioning(
  child: SceneNode,
  positioning: ElementPositioning,
  frameWidth: number,
  frameHeight: number
): void {
  // Handle visibility first
  if (positioning.visible === false && "visible" in child) {
    child.visible = false;
    debugAutoLayoutLog("AI positioning: hiding node", {
      nodeId: child.id,
      nodeName: child.name,
      reason: positioning.rationale ?? "AI marked as not visible"
    });
    return; // Don't position hidden nodes
  }

  // Apply anchor-based positioning for ABSOLUTE positioned nodes
  if ("layoutPositioning" in child && child.layoutPositioning === "ABSOLUTE") {
    const childWidth = "width" in child ? (child as { width: number }).width : 0;
    const childHeight = "height" in child ? (child as { height: number }).height : 0;

    const { x, y } = calculatePositionFromAnchor(
      positioning.anchor,
      frameWidth,
      frameHeight,
      childWidth,
      childHeight,
      positioning.offset
    );

    if ("x" in child && "y" in child) {
      (child as SceneNode & { x: number; y: number }).x = Math.round(x);
      (child as SceneNode & { y: number }).y = Math.round(y);

      debugAutoLayoutLog("AI positioning: positioned absolute node", {
        nodeId: child.id,
        nodeName: child.name,
        anchor: positioning.anchor,
        offset: positioning.offset,
        position: { x: Math.round(x), y: Math.round(y) }
      });
    }
  }

  // Apply size directives if specified
  if (positioning.size && "resize" in child) {
    const resizable = child as SceneNode & { resize: (width: number, height: number) => void };
    if (positioning.size.mode === "fixed" && positioning.size.width && positioning.size.height) {
      resizable.resize(positioning.size.width, positioning.size.height);
      debugAutoLayoutLog("AI positioning: applied fixed size", {
        nodeId: child.id,
        nodeName: child.name,
        size: { width: positioning.size.width, height: positioning.size.height }
      });
    }
  }

  // Apply text directives for TEXT nodes
  if (child.type === "TEXT" && positioning.text) {
    const textNode = child as TextNode;
    const textDirective = positioning.text;

    // Apply text alignment if specified
    if (textDirective.textAlign) {
      const alignMap: Record<string, "LEFT" | "CENTER" | "RIGHT" | "JUSTIFIED"> = {
        "left": "LEFT",
        "center": "CENTER",
        "right": "RIGHT",
        "justify": "JUSTIFIED"
      };
      if (alignMap[textDirective.textAlign]) {
        textNode.textAlignHorizontal = alignMap[textDirective.textAlign];
      }
    }

    debugAutoLayoutLog("AI positioning: applied text directives", {
      nodeId: child.id,
      nodeName: child.name,
      textAlign: textDirective.textAlign,
      maxLines: textDirective.maxLines,
      minFontSize: textDirective.minFontSize
    });
  }

  // Apply layout alignment for flow children
  if ("layoutAlign" in child && positioning.containerAlignment) {
    const alignMap: Record<string, "INHERIT" | "STRETCH" | "MIN" | "CENTER" | "MAX"> = {
      "start": "MIN",
      "center": "CENTER",
      "end": "MAX",
      "stretch": "STRETCH"
    };

    if (positioning.containerAlignment.counter && alignMap[positioning.containerAlignment.counter]) {
      (child as SceneNode & { layoutAlign: "INHERIT" | "STRETCH" | "MIN" | "CENTER" | "MAX" }).layoutAlign = alignMap[positioning.containerAlignment.counter];
    }

    // Apply layout grow
    if ("layoutGrow" in child && positioning.containerAlignment.grow !== undefined) {
      (child as SceneNode & { layoutGrow: number }).layoutGrow = positioning.containerAlignment.grow;
    }

    debugAutoLayoutLog("AI positioning: applied container alignment", {
      nodeId: child.id,
      nodeName: child.name,
      alignment: positioning.containerAlignment
    });
  }
}

/**
 * Calculates x/y position from an anchor region and optional offset.
 */
function calculatePositionFromAnchor(
  anchor: AnchorRegion,
  frameWidth: number,
  frameHeight: number,
  childWidth: number,
  childHeight: number,
  offset?: ElementPositioning["offset"]
): { x: number; y: number } {
  let x = 0;
  let y = 0;

  // Calculate base position from anchor
  switch (anchor) {
    case "top-left":
      x = 0;
      y = 0;
      break;
    case "top-center":
      x = (frameWidth - childWidth) / 2;
      y = 0;
      break;
    case "top-right":
      x = frameWidth - childWidth;
      y = 0;
      break;
    case "center-left":
      x = 0;
      y = (frameHeight - childHeight) / 2;
      break;
    case "center":
      x = (frameWidth - childWidth) / 2;
      y = (frameHeight - childHeight) / 2;
      break;
    case "center-right":
      x = frameWidth - childWidth;
      y = (frameHeight - childHeight) / 2;
      break;
    case "bottom-left":
      x = 0;
      y = frameHeight - childHeight;
      break;
    case "bottom-center":
      x = (frameWidth - childWidth) / 2;
      y = frameHeight - childHeight;
      break;
    case "bottom-right":
      x = frameWidth - childWidth;
      y = frameHeight - childHeight;
      break;
    case "fill":
      // Fill means position at 0,0 and stretch to fill (size would be handled separately)
      x = 0;
      y = 0;
      break;
  }

  // Apply offsets if provided
  if (offset) {
    if (offset.left !== undefined) x += offset.left;
    if (offset.right !== undefined) x -= offset.right;
    if (offset.top !== undefined) y += offset.top;
    if (offset.bottom !== undefined) y -= offset.bottom;
  }

  return { x, y };
}

/**
 * Applies AI positioning to all children of a frame using the positioning map.
 *
 * FREESTYLE MODE: This function is the core of freestyle positioning.
 * It validates coverage and logs warnings when nodes are missing from the map.
 *
 * @param frame - The frame whose children to position
 * @param positioningMap - AI's per-node positioning directives
 */
function applyAiPositioningToChildren(
  frame: FrameNode,
  positioningMap: Record<string, ElementPositioning>
): void {
  const visibleChildren = frame.children.filter(c => "visible" in c && c.visible);
  const positionedCount = { found: 0, missing: 0 };
  const missingChildren: string[] = [];

  debugAutoLayoutLog("AI positioning: applying positioning map to children (FREESTYLE)", {
    frameId: frame.id,
    frameName: frame.name,
    positioningEntries: Object.keys(positioningMap).length,
    visibleChildCount: visibleChildren.length,
    totalChildCount: frame.children.length
  });

  for (const child of frame.children) {
    // Skip hidden children - they don't need positioning
    if ("visible" in child && !child.visible) {
      continue;
    }

    // Try to find positioning by ID first, then by name, then lowercase name
    let positioning = positioningMap[child.id];
    if (!positioning) {
      positioning = positioningMap[child.name];
    }
    if (!positioning) {
      positioning = positioningMap[child.name.toLowerCase()];
    }

    if (positioning) {
      applyAiPositioning(child, positioning, frame.width, frame.height);
      positionedCount.found++;
    } else {
      positionedCount.missing++;
      missingChildren.push(child.name || child.id);
      debugAutoLayoutLog("AI positioning: no directive found for child (FREESTYLE FALLBACK)", {
        nodeId: child.id,
        nodeName: child.name,
        childType: child.type,
        availableKeys: Object.keys(positioningMap).slice(0, 10)
      });
    }
  }

  // Log positioning coverage summary
  const coveragePercent = visibleChildren.length > 0
    ? Math.round((positionedCount.found / visibleChildren.length) * 100)
    : 100;

  debugAutoLayoutLog("AI positioning: coverage summary (FREESTYLE)", {
    frameId: frame.id,
    frameName: frame.name,
    coverage: `${coveragePercent}%`,
    positioned: positionedCount.found,
    missing: positionedCount.missing,
    missingNodes: missingChildren.length > 0 ? missingChildren.slice(0, 5) : "none"
  });

  // Warn if coverage is incomplete
  if (positionedCount.missing > 0) {
    debugAutoLayoutLog("AI positioning: INCOMPLETE COVERAGE WARNING", {
      frameId: frame.id,
      missingCount: positionedCount.missing,
      missingNodes: missingChildren,
      recommendation: "Missing nodes will retain scaled source positioning"
    });
  }
}

// ============================================================================
// END AI POSITIONING APPLICATION
// ============================================================================

/**
 * Hides elements that AI determined won't fit in target dimensions.
 * Uses visible:false to preserve the node for potential restoration.
 * Matches by node ID or by lowercased node name.
 */
function hideDroppedElements(frame: FrameNode, dropNodeIds: readonly string[]): void {
  // Create a set for fast lookup, including lowercased versions
  const dropSet = new Set<string>();
  for (const id of dropNodeIds) {
    dropSet.add(id);
    dropSet.add(id.toLowerCase());
  }

  for (const child of frame.children) {
    // Match by node ID or by name (AI might use either)
    const matchesId = dropSet.has(child.id);
    const matchesName = dropSet.has(child.name.toLowerCase());

    if (matchesId || matchesName) {
      if ("visible" in child) {
        debugAutoLayoutLog("Hiding element per AI restructure recommendation", {
          nodeId: child.id,
          nodeName: child.name,
          matchedBy: matchesId ? "id" : "name",
          reason: "Won't fit in target dimensions"
        });
        child.visible = false;

        // Store original visibility for potential undo/restoration
        if ("setPluginData" in child) {
          (child as SceneNode & { setPluginData: (key: string, value: string) => void })
            .setPluginData("biblioscale:hidden-by-restructure", "true");
        }
      }
    }
  }
}

/**
 * Recursively adapts nested frames that act as structural containers.
 * This ensures that nested layouts (e.g. content rows) also reflow
 * when targeting extreme aspect ratios (like Horizontal -> Vertical).
 *
 * IMPORTANT: Skips component-like frames (logos, buttons, icons) to
 * preserve their internal auto-layout structure.
 */
export function adaptNestedFrames(
  root: FrameNode,
  target: { width: number; height: number },
  profile: "horizontal" | "vertical" | "square",
  scale: number
): void {
  for (const child of root.children) {
    if (child.type === "FRAME") {
      // Skip component-like frames to preserve their internal structure
      if (isComponentLikeFrame(child)) {
        debugAutoLayoutLog("skipping component-like frame in nested adaptation", {
          nodeId: child.id,
          nodeName: child.name,
          width: child.width,
          height: child.height
        });
        continue;
      }
      adaptNodeRecursive(child, target, profile, scale);
    }
  }
}

function adaptNodeRecursive(
  node: FrameNode,
  target: { width: number; height: number },
  profile: "horizontal" | "vertical" | "square",
  scale: number
): void {
  // Skip component-like frames entirely - don't adapt them or their children
  if (isComponentLikeFrame(node)) {
    return;
  }

  // 1. Adapt current node if it looks like a structural container
  if (isStructuralContainer(node, target.width)) {
    // CRITICAL: Capture original auto-layout properties BEFORE creating the plan
    // This ensures nested frames preserve their alignment (items-end, justify-end, etc.)
    const sourceAlignments = node.layoutMode !== "NONE"
      ? {
          primaryAxisAlignItems: node.primaryAxisAlignItems,
          counterAxisAlignItems: node.counterAxisAlignItems
        }
      : undefined;

    const plan = createLayoutAdaptationPlan(node, target, profile, scale, {
      sourceLayoutMode: node.layoutMode === "GRID" ? "NONE" : node.layoutMode,
      sourceSize: { width: node.width, height: node.height },
      sourceItemSpacing: node.layoutMode !== "NONE" ? node.itemSpacing : null,
      sourcePadding: node.layoutMode !== "NONE"
        ? {
            top: node.paddingTop,
            right: node.paddingRight,
            bottom: node.paddingBottom,
            left: node.paddingLeft
          }
        : undefined,
      sourceAlignments
    });

    // Only apply if the mode actually changes (avoid churning)
    if (plan.layoutMode !== node.layoutMode) {
      debugAutoLayoutLog("adapting nested structural frame", {
        nodeId: node.id,
        nodeName: node.name,
        from: node.layoutMode,
        to: plan.layoutMode,
        originalAlignments: sourceAlignments,
        newAlignments: {
          primary: plan.primaryAxisAlignItems,
          counter: plan.counterAxisAlignItems
        }
      });
      applyLayoutAdaptation(node, plan);
    } else {
      // Mode didn't change, but we should still update spacing/padding if needed
      // while PRESERVING the original alignments
      debugAutoLayoutLog("preserving nested frame layout mode", {
        nodeId: node.id,
        nodeName: node.name,
        layoutMode: node.layoutMode,
        preservedAlignments: sourceAlignments
      });
    }
  }

  // 2. Recurse to children
  if ("children" in node) {
    for (const child of node.children) {
      if (child.type === "FRAME") {
        adaptNodeRecursive(child, target, profile, scale);
      }
    }
  }
}

function isStructuralContainer(node: FrameNode, targetWidth: number): boolean {
  if (!node.visible) return false;
  if (node.layoutMode === "NONE") return false; // Don't touch absolute frames
  
  // Case 1: Wide rows that need stacking (Horizontal -> Vertical)
  // If it's very wide relative to target, it might need to wrap or stack
  if (node.width >= targetWidth * 0.5) {
    return true;
  }

  // Case 2: Tall cards that need splitting (Vertical -> Horizontal)
  // If it's a vertical stack with significant height, and we have width to spare
  if (node.layoutMode === "VERTICAL" && node.height > node.width * 1.2) {
    // Only if it contains both text and images (mixed content card)
    const hasText = hasTextChildren(node);
    const hasImages = hasImageChildren(node);
    if (hasText && hasImages) {
      return true;
    }
  }
  
  return false;
}

