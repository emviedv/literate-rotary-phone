/**
 * Layout Mode Resolver
 *
 * Determines optimal layout mode, sizing modes, and wrap behavior
 * based on source frame characteristics and target format requirements.
 *
 * FREESTYLE POSITIONING MODE:
 * This module now operates in "full freestyle" mode where the AI provides
 * per-node positioning directly via `suggestedLayoutMode` and `positioning` map.
 * Pattern abstraction has been removed - AI decisions are trusted directly.
 */

import { debugAutoLayoutLog } from "./debug.js";
import type { LayoutAdviceEntry } from "../types/layout-advice.js";
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
 * AI-ONLY MODE: When enabled, trusts AI recommendations completely
 * without falling back to deterministic heuristics.
 * Set to false to restore the original hybrid behavior.
 */
export const AI_ONLY_MODE = true;

/**
 * Determines the optimal layout mode based on source and target.
 *
 * FREESTYLE POSITIONING MODE:
 * Priority order:
 * 1. AI suggestedLayoutMode (explicit frame-level hint from AI)
 * 2. Preserve source layout (trust AI positioning map for per-node decisions)
 * 3. Deterministic fallbacks (only when no AI advice available)
 *
 * Pattern abstraction has been removed - AI provides layout mode directly.
 */
export function determineOptimalLayoutMode(context: LayoutContext): "HORIZONTAL" | "VERTICAL" | "NONE" {
  const { sourceLayout, targetProfile, layoutAdvice } = context;

  // AI Override - highest priority: check explicit suggestedLayoutMode
  if (layoutAdvice?.suggestedLayoutMode) {
    debugAutoLayoutLog("determining optimal layout: using AI suggestedLayoutMode (FREESTYLE)", {
      suggestedMode: layoutAdvice.suggestedLayoutMode,
      hasPositioning: layoutAdvice.positioning ? Object.keys(layoutAdvice.positioning).length : 0,
      context
    });
    return layoutAdvice.suggestedLayoutMode;
  }

  // ============================================================================
  // FREESTYLE MODE: If AI advice exists but no explicit layoutMode, preserve source
  // The AI's positioning map handles per-node decisions - frame layout is secondary
  // ============================================================================
  if (layoutAdvice) {
    debugAutoLayoutLog("determining optimal layout: AI advice present, preserving source layout (FREESTYLE)", {
      hasAdvice: true,
      hasPositioning: layoutAdvice.positioning ? Object.keys(layoutAdvice.positioning).length : 0,
      hasSuggestedMode: !!layoutAdvice.suggestedLayoutMode,
      sourceMode: sourceLayout.mode
    });
    return sourceLayout.mode;
  }

  // ============================================================================
  // DETERMINISTIC FALLBACKS (only reached when AI_ONLY_MODE = false OR no AI advice)
  // ============================================================================

  // Force change if mandatory transition triggered
  if (shouldForceLayoutModeChange(context)) {
    const forcedMode = targetProfile.type === "vertical" ? "VERTICAL" : "HORIZONTAL";
    debugAutoLayoutLog("determining optimal layout: forced mode change triggered (DETERMINISTIC)", {
      forcedMode,
      targetProfile: targetProfile.type,
      aspectRatio: targetProfile.aspectRatio.toFixed(3)
    });
    return forcedMode;
  }

  if (context.adoptVerticalVariant && targetProfile.type === "vertical") {
    debugAutoLayoutLog("determining optimal layout: adopting vertical variant (DETERMINISTIC)", { context });
    return "VERTICAL";
  }

  // Log that we're using deterministic fallbacks
  debugAutoLayoutLog("determining optimal layout: NO AI ADVICE - using deterministic fallbacks", {
    hasLayoutAdvice: !!layoutAdvice,
    aiOnlyMode: AI_ONLY_MODE
  });

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
      debugAutoLayoutLog("determining optimal layout: source is NONE, switching to directional for reflow (DETERMINISTIC)", {
        context,
        aspectDelta,
        bestMode
      });
      return bestMode;
    }

    // Preserve original positioning ONLY for very similar aspect ratios
    debugAutoLayoutLog("determining optimal layout: source is NONE, preserving for similar aspect ratio (DETERMINISTIC)", { context, aspectDelta });
    return "NONE";
  }

  // For extreme vertical targets (like TikTok)
  if (isExtremeVertical) {
    if (sourceLayout.mode === "HORIZONTAL" && hasSignificantText) {
      debugAutoLayoutLog("determining optimal layout: converting text-heavy horizontal to vertical for extreme vertical (DETERMINISTIC)", { context });
      return "VERTICAL";
    }
    if (isImageDominant && sourceLayout.childCount < 3) {
      // Image-dominant with few elements might look better with original orientation
      debugAutoLayoutLog("determining optimal layout: preserving image-dominant layout for extreme vertical (DETERMINISTIC)", { context });
      return sourceLayout.mode;
    }
    debugAutoLayoutLog("determining optimal layout: forcing vertical for extreme vertical target (DETERMINISTIC)", { context });
    return "VERTICAL";
  }

  // For moderate vertical targets
  if (isModerateVertical) {
    if (sourceLayout.mode === "HORIZONTAL" && sourceLayout.childCount >= 3) {
      debugAutoLayoutLog("determining optimal layout: converting multi-child horizontal to vertical for moderate vertical (DETERMINISTIC)", { context });
      return "VERTICAL";
    }
    debugAutoLayoutLog("determining optimal layout: preserving source mode for moderate vertical (DETERMINISTIC)", { context });
    return sourceLayout.mode;
  }

  // For extreme horizontal targets (like ultra-wide banners)
  if (isExtremeHorizontal) {
    if (sourceLayout.mode === "VERTICAL" && sourceLayout.childCount >= 2) {
      debugAutoLayoutLog("determining optimal layout: converting vertical to horizontal for extreme horizontal (DETERMINISTIC)", { context });
      return "HORIZONTAL";
    }
    debugAutoLayoutLog("determining optimal layout: forcing horizontal for extreme horizontal target (DETERMINISTIC)", { context });
    return "HORIZONTAL";
  }

  // For moderate horizontal targets
  if (isModerateHorizontal) {
    if (sourceLayout.mode === "VERTICAL" && sourceLayout.childCount === 2) {
      debugAutoLayoutLog("determining optimal layout: converting 2-child vertical to horizontal for moderate horizontal (DETERMINISTIC)", { context });
      return "HORIZONTAL";
    }
    debugAutoLayoutLog("determining optimal layout: preserving source mode for moderate horizontal (DETERMINISTIC)", { context });
    return sourceLayout.mode;
  }

  // Square-ish targets - preserve source layout
  debugAutoLayoutLog("determining optimal layout: preserving source mode for square-ish target (DETERMINISTIC)", { context });
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
