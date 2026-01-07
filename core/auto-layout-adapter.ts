import { debugAutoLayoutLog } from "./debug.js";
import { resolveVerticalAlignItems } from "./layout-profile.js";
import type { LayoutAdviceEntry } from "../types/layout-advice.js";

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
  layoutPositioning?: "AUTO" | "ABSOLUTE";
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
    itemSpacing: number | null;
  };
  targetProfile: {
    type: "horizontal" | "vertical" | "square";
    width: number;
    height: number;
    aspectRatio: number;
  };
  scale: number;
  adoptVerticalVariant: boolean;
  sourceItemSpacing?: number | null;
  layoutAdvice?: LayoutAdviceEntry;
};

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
  }
): LayoutAdaptationPlan {
  const sourceLayoutMode: LayoutContext["sourceLayout"]["mode"] =
    options?.sourceLayoutMode ??
    (frame.layoutMode === "GRID" ? "NONE" : frame.layoutMode);

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
      aspectRatio: target.width / target.height
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
 * Determines the optimal layout mode based on source and target
 * Uses transition zones for smoother aspect ratio handling
 */
function determineOptimalLayoutMode(context: LayoutContext): "HORIZONTAL" | "VERTICAL" | "NONE" {
  const { sourceLayout, targetProfile, layoutAdvice } = context;

  // AI Override - highest priority
  if (layoutAdvice?.suggestedLayoutMode) {
    debugAutoLayoutLog("determining optimal layout: using AI suggestion", {
      suggestedMode: layoutAdvice.suggestedLayoutMode,
      context
    });
    return layoutAdvice.suggestedLayoutMode;
  }

  if (context.adoptVerticalVariant && targetProfile.type === "vertical") {
    debugAutoLayoutLog("determining optimal layout: adopting vertical variant", { context });
    return "VERTICAL";
  }

  const aspectRatio = targetProfile.aspectRatio;
  const sourceAspect = sourceLayout.width / Math.max(sourceLayout.height, 1);

  // Define transition zones (more granular than before)
  const isExtremeVertical = aspectRatio < 0.57;      // 9:16 ratio (TikTok)
  const isModerateVertical = aspectRatio < 0.75;     // 3:4 ratio
  const isExtremeHorizontal = aspectRatio > 2.5;    // 5:2 ratio
  const isModerateHorizontal = aspectRatio > 1.6;   // 16:10 ratio

  // Content awareness signals
  const hasSignificantText = sourceLayout.hasText && sourceLayout.childCount >= 3;
  const isImageDominant = sourceLayout.hasImages && !sourceLayout.hasText;

  // If source has no auto layout, determine best mode for target
  if (sourceLayout.mode === "NONE") {
    // Consider source-target aspect delta for major reorientation
    const aspectDelta = Math.abs(sourceAspect - aspectRatio);

    if (isExtremeVertical && aspectDelta > 1.0) {
      debugAutoLayoutLog("determining optimal layout: source is NONE, major reorientation to vertical", { context, aspectDelta });
      return "VERTICAL";
    }
    if (isExtremeHorizontal && aspectDelta > 1.0) {
      debugAutoLayoutLog("determining optimal layout: source is NONE, major reorientation to horizontal", { context, aspectDelta });
      return "HORIZONTAL";
    }
    // Preserve original positioning for moderate changes
    debugAutoLayoutLog("determining optimal layout: source is NONE, preserving for moderate change", { context, aspectDelta });
    return "NONE";
  }

  // For extreme vertical targets (like TikTok)
  if (isExtremeVertical) {
    if (sourceLayout.mode === "HORIZONTAL" && hasSignificantText) {
      debugAutoLayoutLog("determining optimal layout: converting text-heavy horizontal to vertical for extreme vertical", { context });
      return "VERTICAL";
    }
    if (isImageDominant && sourceLayout.childCount < 3) {
      // Image-dominant with few elements might look better with original orientation
      debugAutoLayoutLog("determining optimal layout: preserving image-dominant layout for extreme vertical", { context });
      return sourceLayout.mode;
    }
    debugAutoLayoutLog("determining optimal layout: forcing vertical for extreme vertical target", { context });
    return "VERTICAL";
  }

  // For moderate vertical targets
  if (isModerateVertical) {
    if (sourceLayout.mode === "HORIZONTAL" && sourceLayout.childCount >= 3) {
      debugAutoLayoutLog("determining optimal layout: converting multi-child horizontal to vertical for moderate vertical", { context });
      return "VERTICAL";
    }
    debugAutoLayoutLog("determining optimal layout: preserving source mode for moderate vertical", { context });
    return sourceLayout.mode;
  }

  // For extreme horizontal targets (like ultra-wide banners)
  if (isExtremeHorizontal) {
    if (sourceLayout.mode === "VERTICAL" && sourceLayout.childCount >= 2) {
      debugAutoLayoutLog("determining optimal layout: converting vertical to horizontal for extreme horizontal", { context });
      return "HORIZONTAL";
    }
    debugAutoLayoutLog("determining optimal layout: forcing horizontal for extreme horizontal target", { context });
    return "HORIZONTAL";
  }

  // For moderate horizontal targets
  if (isModerateHorizontal) {
    if (sourceLayout.mode === "VERTICAL" && sourceLayout.childCount === 2) {
      debugAutoLayoutLog("determining optimal layout: converting 2-child vertical to horizontal for moderate horizontal", { context });
      return "HORIZONTAL";
    }
    debugAutoLayoutLog("determining optimal layout: preserving source mode for moderate horizontal", { context });
    return sourceLayout.mode;
  }

  // Square-ish targets - preserve source layout
  debugAutoLayoutLog("determining optimal layout: preserving source mode for square-ish target", { context });
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
    const interiorEstimate = Math.max(context.targetProfile.height - context.sourceLayout.height * context.scale, 0);
    return {
      primary: resolveVerticalAlignItems("CENTER", { interior: interiorEstimate }),
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
 * Uses content-aware distribution based on child count
 */
function calculateSpacing(
  frame: FrameNode,
  newLayoutMode: "HORIZONTAL" | "VERTICAL" | "NONE",
  context: LayoutContext
): { item: number; counter?: number } {
  if (newLayoutMode === "NONE") {
    return { item: 0 };
  }

  const baseSpacingRaw =
    context.sourceLayout.itemSpacing != null
      ? context.sourceLayout.itemSpacing
      : frame.layoutMode !== "NONE"
        ? frame.itemSpacing
        : 16;
  const scaledSpacing = baseSpacingRaw === 0 ? 0 : Math.max(baseSpacingRaw * context.scale, 1);

  // Content-aware distribution ratio based on child count
  const childCount = context.sourceLayout.childCount;
  let distributionRatio: number;
  if (childCount <= 2) {
    // Few children: more generous spacing
    distributionRatio = 0.40;
  } else if (childCount <= 5) {
    // Moderate: standard spacing
    distributionRatio = 0.30;
  } else {
    // Dense: tighter spacing to fit content
    distributionRatio = 0.20;
  }

  // Boost distribution for extreme aspect ratios
  const aspectRatio = context.targetProfile.aspectRatio;
  if (aspectRatio < 0.5 || aspectRatio > 2.5) {
    distributionRatio = Math.min(distributionRatio * 1.3, 0.5);
  }

  // Cap maximum spacing to prevent awkward layouts
  const maxSpacing = scaledSpacing * 8;

  debugAutoLayoutLog("spacing input resolved", {
    targetType: context.targetProfile.type,
    targetWidth: context.targetProfile.width,
    targetHeight: context.targetProfile.height,
    newLayoutMode,
    sourceLayoutMode: context.sourceLayout.mode,
    sourceChildCount: childCount,
    baseSpacing: baseSpacingRaw,
    scaledSpacing,
    distributionRatio,
    scale: context.scale
  });

  // Adjust spacing based on target format
  if (context.targetProfile.type === "vertical" && newLayoutMode === "VERTICAL") {
    const extraSpace = context.targetProfile.height - (context.sourceLayout.height * context.scale);
    const gaps = Math.max(childCount - 1, 1);
    const additionalSpacing = Math.max(0, extraSpace / gaps * distributionRatio);
    const finalSpacing = Math.min(scaledSpacing + additionalSpacing, maxSpacing);
    const result = {
      item: finalSpacing,
      counter: frame.layoutWrap === "WRAP" ? scaledSpacing : undefined
    };
    debugAutoLayoutLog("spacing calculated for vertical target", {
      extraSpace,
      gaps,
      additionalSpacing,
      finalSpacing,
      itemSpacing: result.item,
      counterAxisSpacing: result.counter
    });
    return result;
  }

  if (context.targetProfile.type === "horizontal" && newLayoutMode === "HORIZONTAL") {
    const extraSpace = context.targetProfile.width - (context.sourceLayout.width * context.scale);
    const gaps = Math.max(childCount - 1, 1);
    const additionalSpacing = Math.max(0, extraSpace / gaps * distributionRatio);
    const finalSpacing = Math.min(scaledSpacing + additionalSpacing, maxSpacing);
    const result = {
      item: finalSpacing,
      counter: frame.layoutWrap === "WRAP" ? scaledSpacing : undefined
    };
    debugAutoLayoutLog("spacing calculated for horizontal target", {
      extraSpace,
      gaps,
      additionalSpacing,
      finalSpacing,
      itemSpacing: result.item,
      counterAxisSpacing: result.counter
    });
    return result;
  }

  const result: { item: number; counter?: number } = { item: scaledSpacing };
  debugAutoLayoutLog("spacing calculated for mixed target", {
    itemSpacing: result.item,
    counterAxisSpacing: result.counter
  });
  return result;
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

    // AI Background Override
    if (context.layoutAdvice?.backgroundNodeId) {
      if (child.id === context.layoutAdvice.backgroundNodeId) {
        adaptation.layoutPositioning = "ABSOLUTE";
        adaptations.set(child.id, adaptation);
        return;
      }
      // If AI specified a background, do NOT apply heuristics to others
    } else {
      // Identify background layers using multi-signal detection
      const isBottomLayer = index === frame.children.length - 1;
      if (
        isBackgroundLike(child as SceneNode, context.sourceLayout.width, context.sourceLayout.height, isBottomLayer)
      ) {
        adaptation.layoutPositioning = "ABSOLUTE";
        adaptations.set(child.id, adaptation);
        return;
      }
    }

    // For converted layouts, adjust child properties
    if (frame.layoutMode !== newLayoutMode && newLayoutMode !== "NONE") {
      // When converting to vertical, make children stretch horizontally
      if (newLayoutMode === "VERTICAL") {
        // Only stretch text boxes by default; other elements should maintain their intrinsic size.
        adaptation.layoutAlign = (containsImage || child.type !== 'TEXT') ? "INHERIT" : "STRETCH";
        adaptation.layoutGrow = 0;

        // Set max width for text elements to prevent over-stretching
        if (child.type === "TEXT") {
          adaptation.maxWidth = context.targetProfile.width * 0.8;
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
 * Recursively adapts nested frames that act as structural containers.
 * This ensures that nested layouts (e.g. content rows) also reflow
 * when targeting extreme aspect ratios (like Horizontal -> Vertical).
 */
export function adaptNestedFrames(
  root: FrameNode,
  target: { width: number; height: number },
  profile: "horizontal" | "vertical" | "square",
  scale: number
): void {
  for (const child of root.children) {
    if (child.type === "FRAME") {
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

/**
 * Multi-signal background detection
 * Combines: area coverage, layer position, fill type, text content, and name hints
 */
function isBackgroundLike(node: SceneNode, rootWidth: number, rootHeight: number, isBottomLayer: boolean = false): boolean {
  if (!("width" in node) || !("height" in node)) return false;
  if (typeof (node as any).width !== "number" || typeof (node as any).height !== "number") return false;

  const nodeArea = (node as any).width * (node as any).height;
  const rootArea = rootWidth * rootHeight;

  // Signal 1: Area coverage (lowered from 95% to 90% for better detection)
  const coversFrame = rootArea > 0 && nodeArea >= rootArea * 0.90;

  if (!coversFrame) {
    return false;
  }

  // Signal 2: Fill type (images and gradients are often backgrounds)
  let hasBackgroundFill = false;
  if ("fills" in node && Array.isArray(node.fills)) {
    hasBackgroundFill = (node.fills as readonly Paint[]).some(
      (f) => f.type === "IMAGE" || f.type === "GRADIENT_LINEAR" || f.type === "GRADIENT_RADIAL"
    );
  }

  // Signal 3: No text content
  const hasNoText = node.type !== "TEXT" && !containsText(node);

  // Signal 4: Name hints
  const nameLower = node.name.toLowerCase();
  const hasBackgroundName = ["background", "bg", "backdrop", "hero-bg", "cover"].some(
    (term) => nameLower.includes(term)
  );

  // Decision: require area coverage + at least one other signal
  const otherSignals = [isBottomLayer, hasBackgroundFill, hasNoText, hasBackgroundName].filter(Boolean).length;
  return otherSignals >= 1;
}

function containsText(node: SceneNode): boolean {
  if (node.type === "TEXT") return true;
  if ("children" in node) {
    return node.children.some((c) => containsText(c as SceneNode));
  }
  return false;
}

function countFlowChildren(frame: FrameNode): number {
  let count = 0;
  for (const child of frame.children) {
    if (isBackgroundLike(child, frame.width, frame.height)) continue;
    if ("visible" in child && !child.visible) continue;
    if ("layoutPositioning" in child && child.layoutPositioning === "ABSOLUTE") continue;
    count++;
  }
  return count;
}