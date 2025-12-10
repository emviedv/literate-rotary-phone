import { debugAutoLayoutLog } from "./debug.js";

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

export interface ChildAdaptation {
  layoutGrow?: number;
  layoutAlign?: "INHERIT" | "STRETCH";
  minWidth?: number;
  maxWidth?: number;
  minHeight?: number;
  maxHeight?: number;
}

type LayoutContext = {
  sourceLayout: {
    mode: "HORIZONTAL" | "VERTICAL" | "NONE";
    width: number;
    height: number;
    childCount: number;
    hasText: boolean;
    hasImages: boolean;
  };
  targetProfile: {
    type: "horizontal" | "vertical" | "square";
    width: number;
    height: number;
    aspectRatio: number;
  };
  scale: number;
};

/**
 * Creates an adaptation plan for auto layout based on source and target
 */
export function createLayoutAdaptationPlan(
  frame: FrameNode,
  target: { width: number; height: number },
  profile: "horizontal" | "vertical" | "square",
  scale: number
): LayoutAdaptationPlan {
  const sourceLayoutMode: LayoutContext["sourceLayout"]["mode"] =
    frame.layoutMode === "GRID" ? "NONE" : frame.layoutMode;

  const context: LayoutContext = {
    sourceLayout: {
      mode: sourceLayoutMode,
      width: frame.width,
      height: frame.height,
      childCount: frame.children.filter(c => c.visible).length,
      hasText: hasTextChildren(frame),
      hasImages: hasImageChildren(frame)
    },
    targetProfile: {
      type: profile,
      width: target.width,
      height: target.height,
      aspectRatio: target.width / target.height
    },
    scale
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

  return {
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
}

/**
 * Determines the optimal layout mode based on source and target
 */
function determineOptimalLayoutMode(context: LayoutContext): "HORIZONTAL" | "VERTICAL" | "NONE" {
  const { sourceLayout, targetProfile } = context;

  // If source has no auto layout, determine best mode for target
  if (sourceLayout.mode === "NONE") {
    if (targetProfile.type === "vertical" && targetProfile.aspectRatio < 0.6) {
      return "VERTICAL";
    }
    if (targetProfile.type === "horizontal" && targetProfile.aspectRatio > 1.5) {
      return "HORIZONTAL";
    }
    return "NONE"; // Keep as is for square-ish targets
  }

  // For extreme vertical targets (like TikTok)
  if (targetProfile.type === "vertical" && targetProfile.aspectRatio < 0.57) {
    // Convert horizontal to vertical for better fill
    if (sourceLayout.mode === "HORIZONTAL" && sourceLayout.childCount >= 2) {
      return "VERTICAL";
    }
    return sourceLayout.mode === "VERTICAL" ? "VERTICAL" : "VERTICAL";
  }

  // For extreme horizontal targets (like ultra-wide banners)
  if (targetProfile.type === "horizontal" && targetProfile.aspectRatio > 2.5) {
    // Convert vertical to horizontal for better fill
    if (sourceLayout.mode === "VERTICAL" && sourceLayout.childCount >= 2) {
      return "HORIZONTAL";
    }
    return sourceLayout.mode === "HORIZONTAL" ? "HORIZONTAL" : "HORIZONTAL";
  }

  // For moderate aspect ratios, adapt based on child count and content
  if (targetProfile.type === "vertical") {
    // Prefer vertical for tall targets with many children
    if (sourceLayout.childCount > 3) {
      return "VERTICAL";
    }
    // For 2-3 children, prefer keeping the source layout to avoid jumping
    if (sourceLayout.mode === "HORIZONTAL") {
      return "HORIZONTAL";
    }
    return "VERTICAL";
  }

  if (targetProfile.type === "horizontal") {
    // Prefer horizontal for wide targets
    if (sourceLayout.childCount > 3 && sourceLayout.mode === "VERTICAL") {
      // Consider converting to horizontal wrap for many children
      return "HORIZONTAL";
    }
    return sourceLayout.mode === "VERTICAL" ? "VERTICAL" : sourceLayout.mode;
  }

  // For square targets, keep original or use best fit
  return sourceLayout.mode;
}

/**
 * Determines sizing modes for the adapted layout
 */
function determineSizingModes(
  layoutMode: "HORIZONTAL" | "VERTICAL" | "NONE",
  context: LayoutContext
): { primary: FrameNode["primaryAxisSizingMode"]; counter: FrameNode["counterAxisSizingMode"] } {
  if (layoutMode === "NONE") {
    return { primary: "FIXED", counter: "FIXED" };
  }

  // For extreme aspect ratios, always use FIXED to fill space
  if (context.targetProfile.aspectRatio < 0.5 || context.targetProfile.aspectRatio > 2) {
    return { primary: "FIXED", counter: "FIXED" };
  }

  // For moderate layouts, allow some flexibility
  if (layoutMode === "VERTICAL") {
    return {
      primary: context.targetProfile.type === "vertical" ? "FIXED" : "AUTO",
      counter: "FIXED"
    };
  } else {
    return {
      primary: context.targetProfile.type === "horizontal" ? "FIXED" : "AUTO",
      counter: "FIXED"
    };
  }
}

/**
 * Determines alignment strategies for the adapted layout
 */
function determineAlignments(
  layoutMode: "HORIZONTAL" | "VERTICAL" | "NONE",
  context: LayoutContext
): { primary: FrameNode["primaryAxisAlignItems"]; counter: FrameNode["counterAxisAlignItems"] } {
  if (layoutMode === "NONE") {
    return { primary: "MIN", counter: "MIN" };
  }

  // For vertical layouts in tall targets
  if (layoutMode === "VERTICAL" && context.targetProfile.type === "vertical") {
    return {
      primary: context.sourceLayout.childCount <= 3 ? "SPACE_BETWEEN" : "MIN",
      counter: "CENTER"
    };
  }

  // For horizontal layouts in wide targets
  if (layoutMode === "HORIZONTAL" && context.targetProfile.type === "horizontal") {
    return {
      primary: context.sourceLayout.childCount <= 3 ? "SPACE_BETWEEN" : "MIN",
      counter: "CENTER"
    };
  }

  // Default centered approach for mixed scenarios
  return {
    primary: "CENTER",
    counter: "CENTER"
  };
}

/**
 * Determines wrap behavior for the adapted layout
 */
function determineWrapBehavior(
  layoutMode: "HORIZONTAL" | "VERTICAL" | "NONE",
  context: LayoutContext
): "WRAP" | "NO_WRAP" {
  if (layoutMode === "NONE") {
    return "NO_WRAP";
  }

  // Never wrap in vertical layouts for vertical targets
  if (layoutMode === "VERTICAL" && context.targetProfile.type === "vertical") {
    return "NO_WRAP";
  }

  // Consider wrapping for horizontal layouts with many children
  if (layoutMode === "HORIZONTAL" && context.sourceLayout.childCount > 4) {
    // Only wrap if target is wide enough
    if (context.targetProfile.width > 1200) {
      return "WRAP";
    }
  }

  return "NO_WRAP";
}

/**
 * Calculates spacing for the adapted layout
 */
function calculateSpacing(
  frame: FrameNode,
  newLayoutMode: "HORIZONTAL" | "VERTICAL" | "NONE",
  context: LayoutContext
): { item: number; counter?: number } {
  if (newLayoutMode === "NONE") {
    return { item: 0 };
  }

  const baseSpacing = frame.layoutMode !== "NONE" ? frame.itemSpacing : 16;
  const scaledSpacing = baseSpacing * context.scale;

  // Adjust spacing based on target format
  if (context.targetProfile.type === "vertical" && newLayoutMode === "VERTICAL") {
    // More spacing for vertical layouts in tall formats
    const extraSpace = context.targetProfile.height - (context.sourceLayout.height * context.scale);
    const gaps = Math.max(context.sourceLayout.childCount - 1, 1);
    const additionalSpacing = Math.max(0, extraSpace / gaps * 0.3); // Use 30% of extra space
    return {
      item: scaledSpacing + additionalSpacing,
      counter: frame.layoutWrap === "WRAP" ? scaledSpacing : undefined
    };
  }

  if (context.targetProfile.type === "horizontal" && newLayoutMode === "HORIZONTAL") {
    // More spacing for horizontal layouts in wide formats
    const extraSpace = context.targetProfile.width - (context.sourceLayout.width * context.scale);
    const gaps = Math.max(context.sourceLayout.childCount - 1, 1);
    const additionalSpacing = Math.max(0, extraSpace / gaps * 0.3);
    return {
      item: scaledSpacing + additionalSpacing,
      counter: frame.layoutWrap === "WRAP" ? scaledSpacing : undefined
    };
  }

  return { item: scaledSpacing };
}

/**
 * Calculates padding adjustments for the adapted layout
 */
function calculatePaddingAdjustments(
  frame: FrameNode,
  newLayoutMode: "HORIZONTAL" | "VERTICAL" | "NONE",
  context: LayoutContext
): { top: number; right: number; bottom: number; left: number } {
  const basePadding = {
    top: frame.paddingTop || 0,
    right: frame.paddingRight || 0,
    bottom: frame.paddingBottom || 0,
    left: frame.paddingLeft || 0
  };

  // Scale base padding
  const scaledPadding = {
    top: basePadding.top * context.scale,
    right: basePadding.right * context.scale,
    bottom: basePadding.bottom * context.scale,
    left: basePadding.left * context.scale
  };

  // Add extra padding for extreme formats
  if (context.targetProfile.type === "vertical") {
    const verticalExtra = (context.targetProfile.height - context.sourceLayout.height * context.scale) * 0.1;
    scaledPadding.top += verticalExtra;
    scaledPadding.bottom += verticalExtra;
  }

  if (context.targetProfile.type === "horizontal") {
    const horizontalExtra = (context.targetProfile.width - context.sourceLayout.width * context.scale) * 0.1;
    scaledPadding.left += horizontalExtra;
    scaledPadding.right += horizontalExtra;
  }

  const clampPadding = (side: "top" | "right" | "bottom" | "left", value: number): number => {
    if (value >= 0) {
      return value;
    }

    debugAutoLayoutLog("padding clamped to zero", {
      side,
      requested: value,
      targetType: context.targetProfile.type,
      targetWidth: context.targetProfile.width,
      targetHeight: context.targetProfile.height,
      sourceWidth: context.sourceLayout.width,
      sourceHeight: context.sourceLayout.height,
      scale: context.scale
    });

    return 0;
  };

  return {
    top: clampPadding("top", scaledPadding.top),
    right: clampPadding("right", scaledPadding.right),
    bottom: clampPadding("bottom", scaledPadding.bottom),
    left: clampPadding("left", scaledPadding.left)
  };
}

/**
 * Creates child-specific adaptations
 */
function createChildAdaptations(
  frame: FrameNode,
  newLayoutMode: "HORIZONTAL" | "VERTICAL" | "NONE",
  context: LayoutContext
): Map<string, ChildAdaptation> {
  const adaptations = new Map<string, ChildAdaptation>();

  frame.children.forEach((child, index) => {
    if (!child.visible) return;

    const adaptation: ChildAdaptation = {};
    const containsImage = hasImageContent(child as SceneNode);

    // For converted layouts, adjust child properties
    if (frame.layoutMode !== newLayoutMode && newLayoutMode !== "NONE") {
      // When converting to vertical, make children stretch horizontally
      if (newLayoutMode === "VERTICAL") {
        adaptation.layoutAlign = containsImage ? "INHERIT" : "STRETCH";
        adaptation.layoutGrow = 0;

        // Set max width for text elements to prevent over-stretching
        if (!containsImage && child.type === "TEXT") {
          adaptation.maxWidth = context.targetProfile.width * 0.8;
        }

        if (containsImage) {
          debugAutoLayoutLog("preserving media aspect ratio in vertical flow", {
            childId: child.id,
            childType: child.type,
            targetWidth: context.targetProfile.width,
            targetHeight: context.targetProfile.height
          });
        }
      }

      // When converting to horizontal, control heights
      if (newLayoutMode === "HORIZONTAL") {
        adaptation.layoutAlign = "INHERIT";
        adaptation.layoutGrow = containsImage ? 0 : 1; // Distribute space evenly
        adaptation.maxHeight = context.targetProfile.height * 0.8; // Prevent vertical overflow

        const previousAlign = (child as { layoutAlign?: string }).layoutAlign ?? "unknown";
        debugAutoLayoutLog("child layout align normalized", {
          childId: child.id,
          childType: child.type,
          previousAlign,
          assignedAlign: adaptation.layoutAlign,
          sourceLayoutMode: frame.layoutMode,
          targetLayoutMode: newLayoutMode
        });

        if (containsImage && adaptation.layoutGrow === 0) {
          debugAutoLayoutLog("preventing media stretch in horizontal flow", {
            childId: child.id,
            childType: child.type,
            targetWidth: context.targetProfile.width,
            targetHeight: context.targetProfile.height
          });
        }
      }
    }

    // Special handling for first/last children in extreme formats
    if (context.targetProfile.aspectRatio < 0.5 || context.targetProfile.aspectRatio > 2) {
      if (index === 0 || index === frame.children.length - 1) {
        adaptation.layoutGrow = 0; // Don't expand edge elements too much
      }
    }

    if (Object.keys(adaptation).length > 0) {
      adaptations.set(child.id, adaptation);
    }
  });

  return adaptations;
}

/**
 * Applies the adaptation plan to a frame
 */
export function applyLayoutAdaptation(frame: FrameNode, plan: LayoutAdaptationPlan): void {
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

    // Apply child adaptations
    frame.children.forEach(child => {
      const adaptation = plan.childAdaptations.get(child.id);
      if (adaptation && "layoutAlign" in child) {
        if (adaptation.layoutAlign) {
          child.layoutAlign = adaptation.layoutAlign;
        }
        if (adaptation.layoutGrow !== undefined && "layoutGrow" in child) {
          child.layoutGrow = adaptation.layoutGrow;
        }
      }
    });
  }
}

// Helper functions
function hasTextChildren(frame: FrameNode): boolean {
  return frame.children.some(child =>
    child.type === "TEXT" ||
    ("children" in child && hasTextChildren(child as unknown as FrameNode))
  );
}

function hasImageContent(node: SceneNode): boolean {
  if ("fills" in node) {
    const fills = node.fills as readonly Paint[];
    if (fills.some(fill => fill.type === "IMAGE" || fill.type === "VIDEO")) {
      return true;
    }
  }

  if ("children" in node) {
    return node.children.some(child => hasImageContent(child as SceneNode));
  }

  return false;
}

function hasImageChildren(frame: FrameNode): boolean {
  return hasImageContent(frame as unknown as SceneNode);
}
