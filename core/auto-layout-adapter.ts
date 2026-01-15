import { debugAutoLayoutLog } from "./debug.js";
import type { LayoutAdviceEntry } from "../types/layout-advice.js";
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
import { type ChildAdaptation, createChildAdaptations } from "./child-adaptations.js";

/**
 * Auto Layout Adapter - Intelligently restructures auto layouts for different target formats
 * This ensures layouts don't break and adapt properly to extreme aspect ratio changes
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
  childAdaptations: Map<string, ChildAdaptation>;
}

// Re-export ChildAdaptation for consumers
export type { ChildAdaptation } from "./child-adaptations.js";


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

  const context: LayoutContext = {
    sourceLayout: {
      mode: sourceLayoutMode,
      width: options?.sourceSize?.width ?? frame.width,
      height: options?.sourceSize?.height ?? frame.height,
      childCount:
        options?.sourceFlowChildCount ?? countFlowChildren(frame),
      hasText: hasTextChildren(frame),
      hasImages: hasImageChildren(frame),
      itemSpacing: options?.sourceItemSpacing ?? (frame.layoutMode !== "NONE" ? frame.itemSpacing : null)
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

  // Create child-specific adaptations
  const childAdaptations = createChildAdaptations(frame, newLayoutMode, context);

  const plan: LayoutAdaptationPlan = {
    layoutMode: newLayoutMode,
    primaryAxisSizingMode: sizingModes.primary,
    counterAxisSizingMode: sizingModes.counter,
    primaryAxisAlignItems: alignments.primary,
    counterAxisAlignItems: alignments.counter,
    layoutWrap: wrapBehavior,
    itemSpacing: spacing.item,
    counterAxisSpacing: spacing.counter,
    paddingAdjustments: padding,
    childAdaptations
  };

  debugAutoLayoutLog("layout adaptation plan summary", {
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
    childAdaptations: { count: childAdaptations.size }
  });

  return plan;
}

/**
 * Applies the adaptation plan to a frame
 * @param frame The frame to adapt
 * @param plan The layout adaptation plan
 * @param layoutAdvice Optional AI layout advice containing restructure instructions
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

  // Apply main layout properties
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

    // Apply padding
    frame.paddingTop = plan.paddingAdjustments.top;
    frame.paddingRight = plan.paddingAdjustments.right;
    frame.paddingBottom = plan.paddingAdjustments.bottom;
    frame.paddingLeft = plan.paddingAdjustments.left;

    // Apply child adaptations (skip hidden children)
    frame.children.forEach(child => {
      // Skip hidden children
      if ("visible" in child && !child.visible) {
        return;
      }

      const adaptation = plan.childAdaptations.get(child.id);
      if (adaptation) {
        if ("layoutPositioning" in child && adaptation.layoutPositioning) {
          child.layoutPositioning = adaptation.layoutPositioning;
        }
        if ("layoutAlign" in child && adaptation.layoutAlign) {
          child.layoutAlign = adaptation.layoutAlign;
        }
        if ("layoutGrow" in child && adaptation.layoutGrow !== undefined) {
          child.layoutGrow = adaptation.layoutGrow;
        }
      }
    });
  }
}

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
    const plan = createLayoutAdaptationPlan(node, target, profile, scale);

    // Only apply if the mode actually changes (avoid churning)
    if (plan.layoutMode !== node.layoutMode) {
      debugAutoLayoutLog("adapting nested structural frame", {
        nodeId: node.id,
        from: node.layoutMode,
        to: plan.layoutMode
      });
      applyLayoutAdaptation(node, plan);
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
  
  // If it's very wide, it's likely a row that needs stacking
  if (node.width >= targetWidth * 0.5) {
    return true;
  }
  
  // Or if it's auto-layout and has significant height?
  // No, width is the main constraint for switching H->V.
  
  return false;
}

