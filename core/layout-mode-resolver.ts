/**
 * Layout Mode Resolver
 *
 * Determines optimal layout mode, sizing modes, and wrap behavior
 * based on source frame characteristics and target format requirements.
 */

import { debugAutoLayoutLog } from "./debug.js";
import type { LayoutAdviceEntry } from "../types/layout-advice.js";
import type { LayoutPatternId } from "../types/layout-patterns.js";
import { LAYOUT_PATTERNS } from "../types/layout-patterns.js";
import { ASPECT_RATIOS } from "./layout-constants.js";

/**
 * Context object passed between layout decision functions.
 * Encapsulates source frame state and target requirements.
 */
export type LayoutContext = {
  sourceLayout: {
    mode: "HORIZONTAL" | "VERTICAL" | "NONE";
    width: number;
    height: number;
    childCount: number;
    hasText: boolean;
    hasImages: boolean;
    itemSpacing: number | null;
    padding?: {
      top: number;
      right: number;
      bottom: number;
      left: number;
    };
    alignments?: {
      primaryAxisAlignItems: FrameNode["primaryAxisAlignItems"];
      counterAxisAlignItems: FrameNode["counterAxisAlignItems"];
    };
  };
  targetProfile: {
    type: "horizontal" | "vertical" | "square";
    width: number;
    height: number;
    aspectRatio: number;
    safeWidth: number;
    safeHeight: number;
  };
  scale: number;
  adoptVerticalVariant: boolean;
  sourceItemSpacing?: number | null;
  layoutAdvice?: LayoutAdviceEntry;
};

/**
 * Determines if a layout mode change should be forced regardless of other heuristics.
 * Triggered by extreme aspect ratio transitions where original layout cannot be preserved.
 */
export function shouldForceLayoutModeChange(context: LayoutContext): boolean {
  const { sourceLayout, targetProfile } = context;
  const aspectRatio = targetProfile.aspectRatio;

  // Force HORIZONTAL -> VERTICAL for extreme vertical targets (TikTok)
  if (aspectRatio < ASPECT_RATIOS.EXTREME_VERTICAL && sourceLayout.mode === "HORIZONTAL") {
    return true;
  }

  // Force VERTICAL -> HORIZONTAL for extreme horizontal targets (Banners)
  if (aspectRatio > ASPECT_RATIOS.EXTREME_HORIZONTAL && sourceLayout.mode === "VERTICAL") {
    return true;
  }

  return false;
}

/**
 * Determines the optimal layout mode based on source and target.
 * Uses transition zones for smoother aspect ratio handling.
 *
 * Priority order:
 * 1. AI suggestedLayoutMode (explicit override)
 * 2. AI pattern selection (derive from pattern)
 * 3. shouldForceLayoutModeChange (mandatory transitions)
 * 4. adoptVerticalVariant flag
 * 5. Aspect ratio heuristics
 */
export function determineOptimalLayoutMode(context: LayoutContext): "HORIZONTAL" | "VERTICAL" | "NONE" {
  const { sourceLayout, targetProfile, layoutAdvice } = context;

  // AI Override - highest priority: check explicit suggestedLayoutMode first
  if (layoutAdvice?.suggestedLayoutMode) {
    debugAutoLayoutLog("determining optimal layout: using AI suggestedLayoutMode", {
      suggestedMode: layoutAdvice.suggestedLayoutMode,
      context
    });
    return layoutAdvice.suggestedLayoutMode;
  }

  // AI Override - second priority: derive layout mode from selected pattern
  if (layoutAdvice?.selectedId) {
    const patternId = layoutAdvice.selectedId as LayoutPatternId;
    const pattern = LAYOUT_PATTERNS[patternId];
    if (pattern) {
      // IMPORTANT: Don't apply NONE-layout patterns to frames that originally had auto-layout
      // This prevents destroying the flow layout and causing children to overlap
      if (pattern.layoutMode === "NONE" && sourceLayout.mode !== "NONE") {
        debugAutoLayoutLog("determining optimal layout: AI pattern has NONE but source has auto-layout, preserving source", {
          patternId,
          patternLayoutMode: pattern.layoutMode,
          sourceMode: sourceLayout.mode,
          context
        });
        return sourceLayout.mode;
      }
      debugAutoLayoutLog("determining optimal layout: deriving from AI pattern selection", {
        patternId,
        patternLayoutMode: pattern.layoutMode,
        context
      });
      return pattern.layoutMode;
    }
  }

  // Force change if mandatory transition triggered
  if (shouldForceLayoutModeChange(context)) {
    const forcedMode = targetProfile.type === "vertical" ? "VERTICAL" : "HORIZONTAL";
    debugAutoLayoutLog("determining optimal layout: forced mode change triggered", {
      forcedMode,
      targetProfile: targetProfile.type,
      aspectRatio: targetProfile.aspectRatio.toFixed(3)
    });
    return forcedMode;
  }

  if (context.adoptVerticalVariant && targetProfile.type === "vertical") {
    debugAutoLayoutLog("determining optimal layout: adopting vertical variant", { context });
    return "VERTICAL";
  }

  const aspectRatio = targetProfile.aspectRatio;
  const sourceAspect = sourceLayout.width / Math.max(sourceLayout.height, 1);

  // Define transition zones (more granular than before)
  const isExtremeVertical = aspectRatio < ASPECT_RATIOS.EXTREME_VERTICAL;      // 9:16 ratio (TikTok)
  const isModerateVertical = aspectRatio < ASPECT_RATIOS.MODERATE_VERTICAL;     // 3:4 ratio
  const isExtremeHorizontal = aspectRatio > ASPECT_RATIOS.EXTREME_HORIZONTAL;    // 5:2 ratio
  const isModerateHorizontal = aspectRatio > ASPECT_RATIOS.MODERATE_HORIZONTAL;   // 16:10 ratio

  // Content awareness signals
  const hasSignificantText = sourceLayout.hasText && sourceLayout.childCount >= 3;
  const isImageDominant = sourceLayout.hasImages && !sourceLayout.hasText;

    // If source has no auto layout, determine best mode for target
  if (sourceLayout.mode === "NONE") {
    // Consider source-target aspect delta for major reorientation
    const aspectDelta = Math.abs(sourceAspect - aspectRatio);

    // CRITICAL FIX: Prefer switching to directional layout to enable reflow/fill behavior.
    // Only preserve NONE if the aspect ratio is very similar (preventing jarring shifts).
    if (aspectDelta > 0.2) {
      const bestMode = targetProfile.type === "vertical" ? "VERTICAL" : "HORIZONTAL";
      debugAutoLayoutLog("determining optimal layout: source is NONE, switching to directional for reflow", { 
        context, 
        aspectDelta,
        bestMode 
      });
      return bestMode;
    }
    
    // Preserve original positioning ONLY for very similar aspect ratios
    debugAutoLayoutLog("determining optimal layout: source is NONE, preserving for similar aspect ratio", { context, aspectDelta });
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
 * Determines sizing modes for the adapted layout.
 * Variant frames always use FIXED sizing to fill their target dimensions.
 */
export function determineSizingModes(
  layoutMode: "HORIZONTAL" | "VERTICAL" | "NONE",
  context: LayoutContext
): { primary: FrameNode["primaryAxisSizingMode"]; counter: FrameNode["counterAxisSizingMode"] } {
  if (layoutMode === "NONE") {
    return { primary: "FIXED", counter: "FIXED" };
  }

  // For extreme aspect ratios, always use FIXED to fill space
  if (context.targetProfile.aspectRatio < ASPECT_RATIOS.EDGE_SIZING_VERTICAL || context.targetProfile.aspectRatio > ASPECT_RATIOS.EDGE_SIZING_HORIZONTAL) {
    return { primary: "FIXED", counter: "FIXED" };
  }

  // Always use FIXED sizing for variant frames - they have been explicitly
  // resized to target dimensions and should never hug content
  return { primary: "FIXED", counter: "FIXED" };
}

/**
 * Determines wrap behavior for the adapted layout.
 *
 * Rules:
 * - NONE layouts never wrap
 * - Vertical layouts in vertical targets never wrap
 * - Horizontal layouts with many children (>4) on wide targets (>1200px) may wrap
 */
export function determineWrapBehavior(
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
