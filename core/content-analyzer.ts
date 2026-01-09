import { LEGACY_ROLE_KEY, ROLE_KEY } from "./plugin-constants.js";
import { ASPECT_RATIOS } from "./layout-constants.js";

/**
 * Content analyzer to understand source frame structure and determine
 * the best scaling strategy for any source-target combination
 */

export interface ContentAnalysis {
  actualContentBounds: { x: number; y: number; width: number; height: number } | null;
  hasAutoLayout: boolean;
  layoutDirection: "HORIZONTAL" | "VERTICAL" | "NONE";
  childCount: number;
  hasText: boolean;
  hasImages: boolean;
  contentDensity: "sparse" | "normal" | "dense";
  recommendedStrategy: ScalingStrategy;
  effectiveWidth: number;
  effectiveHeight: number;
}

export type ScalingStrategy =
  | "fill"           // Aggressively fill the target
  | "fit"            // Conservative fit within bounds
  | "adaptive"       // Smart blend based on content
  | "reflow"         // Restructure content for extreme changes
  | "stretch";       // Allow some distortion for better fill

/**
 * Analyzes frame content to understand its actual bounds and structure
 */
export function analyzeContent(frame: FrameNode): ContentAnalysis {
  // Find actual content bounds (ignoring empty space)
  const actualBounds = findActualContentBounds(frame);

  // Use actual content bounds if available, otherwise frame bounds
  const effectiveWidth = actualBounds ? actualBounds.width : frame.width;
  const effectiveHeight = actualBounds ? actualBounds.height : frame.height;

  // Analyze content composition
  const hasText = hasTextContent(frame);
  const hasImages = hasImageContent(frame);
  const childCount = countVisibleChildren(frame);
  const normalizedLayoutMode = normalizeLayoutMode(frame.layoutMode);
  const hasAutoLayout = normalizedLayoutMode !== "NONE";

  // Determine content density
  let contentDensity: ContentAnalysis["contentDensity"] = "normal";
  if (childCount === 0) {
    contentDensity = "sparse";
  } else if (childCount > 10) {
    contentDensity = "dense";
  } else if (childCount <= 2) {
    contentDensity = "sparse";
  }

  // Determine recommended strategy
  const strategy = determineScalingStrategy({
    hasAutoLayout,
    layoutDirection: normalizedLayoutMode,
    contentDensity,
    hasText,
    hasImages,
    aspectRatio: effectiveWidth / Math.max(effectiveHeight, 1)
  });

  return {
    actualContentBounds: actualBounds,
    hasAutoLayout,
    layoutDirection: normalizedLayoutMode,
    childCount,
    hasText,
    hasImages,
    contentDensity,
    recommendedStrategy: strategy,
    effectiveWidth,
    effectiveHeight
  };
}

/**
 * Finds the actual bounds of visible content, excluding empty space
 */
function findActualContentBounds(
  frame: FrameNode
): { x: number; y: number; width: number; height: number } | null {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let hasVisibleContent = false;

  function processNode(node: SceneNode, depth: number = 0): void {
    // Skip if invisible or too deep
    if (!node.visible || depth > 10) return;

    // Skip overlay elements
    if (
      "getPluginData" in node &&
      (node.getPluginData(ROLE_KEY) === "overlay" || node.getPluginData(LEGACY_ROLE_KEY) === "overlay")
    ) {
      return;
    }

    // Check if node has actual content
    const hasContent =
      (node.type === "TEXT" && (node as TextNode).characters.length > 0) ||
      (node.type === "RECTANGLE" || node.type === "ELLIPSE") ||
      ("fills" in node && Array.isArray(node.fills) && node.fills.length > 0) ||
      ("strokes" in node && Array.isArray(node.strokes) && node.strokes.length > 0);

    if (hasContent && "absoluteBoundingBox" in node && node.absoluteBoundingBox) {
      const bounds = node.absoluteBoundingBox;
      minX = Math.min(minX, bounds.x);
      minY = Math.min(minY, bounds.y);
      maxX = Math.max(maxX, bounds.x + bounds.width);
      maxY = Math.max(maxY, bounds.y + bounds.height);
      hasVisibleContent = true;
    }

    // Recurse for containers
    if ("children" in node) {
      for (const child of node.children) {
        processNode(child as SceneNode, depth + 1);
      }
    }
  }

  processNode(frame);

  if (!hasVisibleContent || !frame.absoluteBoundingBox) {
    return null;
  }

  const frameBounds = frame.absoluteBoundingBox;

  // Convert to relative coordinates
  const relativeMinX = minX - frameBounds.x;
  const relativeMinY = minY - frameBounds.y;
  const contentWidth = maxX - minX;
  const contentHeight = maxY - minY;

  // Clamp to frame bounds
  return {
    x: Math.max(0, relativeMinX),
    y: Math.max(0, relativeMinY),
    width: Math.min(contentWidth, frame.width),
    height: Math.min(contentHeight, frame.height)
  };
}

/**
 * Checks if frame contains text content
 */
function hasTextContent(frame: FrameNode): boolean {
  const checkNode = (node: SceneNode): boolean => {
    if (node.type === "TEXT") {
      return (node as TextNode).characters.length > 0;
    }
    if ("children" in node) {
      return node.children.some(child => checkNode(child as SceneNode));
    }
    return false;
  };

  return checkNode(frame);
}

/**
 * Checks if frame contains image content
 */
function hasImageContent(frame: FrameNode): boolean {
  const checkNode = (node: SceneNode): boolean => {
    if ("fills" in node && Array.isArray(node.fills)) {
      const hasFills = node.fills as readonly Paint[];
      if (hasFills.some(fill => fill.type === "IMAGE" || fill.type === "VIDEO")) {
        return true;
      }
    }
    if ("children" in node) {
      return node.children.some(child => checkNode(child as SceneNode));
    }
    return false;
  };

  return checkNode(frame);
}

/**
 * Counts visible children (excluding overlays)
 */
function countVisibleChildren(frame: FrameNode): number {
  return frame.children.filter(child => {
    if (!child.visible) return false;
    if (
      "getPluginData" in child &&
      (child.getPluginData(ROLE_KEY) === "overlay" || child.getPluginData(LEGACY_ROLE_KEY) === "overlay")
    ) {
      return false;
    }
    return true;
  }).length;
}

function normalizeLayoutMode(mode: FrameNode["layoutMode"]): "HORIZONTAL" | "VERTICAL" | "NONE" {
  return mode === "GRID" ? "NONE" : mode;
}

/**
 * Determines the best scaling strategy based on content analysis
 */
function determineScalingStrategy(params: {
  hasAutoLayout: boolean;
  layoutDirection: "HORIZONTAL" | "VERTICAL" | "NONE";
  contentDensity: "sparse" | "normal" | "dense";
  hasText: boolean;
  hasImages: boolean;
  aspectRatio: number;
}): ScalingStrategy {
  const { hasAutoLayout, contentDensity, hasText, hasImages, aspectRatio } = params;

  // For sparse content, always fill
  if (contentDensity === "sparse") {
    return "fill";
  }

  // For dense content with auto layout, use adaptive
  if (contentDensity === "dense" && hasAutoLayout) {
    return "adaptive";
  }

  // For text-heavy content, prefer reflow for extreme aspect changes
  if (hasText && !hasImages) {
    if (aspectRatio > ASPECT_RATIOS.STRETCH_HORIZONTAL || aspectRatio < ASPECT_RATIOS.STRETCH_VERTICAL) {
      return "reflow";
    }
    return "adaptive";
  }

  // For image-heavy content, allow some stretch
  if (hasImages && !hasText) {
    return "stretch";
  }

  // Default to adaptive
  return "adaptive";
}

/**
 * Calculates optimal scale based on content analysis and target
 */
export function calculateOptimalScale(
  analysis: ContentAnalysis,
  target: { width: number; height: number },
  safeAreaInsets: { left: number; right: number; top: number; bottom: number },
  profile: "horizontal" | "vertical" | "square"
): number {
  const availableWidth = target.width - safeAreaInsets.left - safeAreaInsets.right;
  const availableHeight = target.height - safeAreaInsets.top - safeAreaInsets.bottom;

  // Use effective dimensions from content analysis
  const sourceWidth = Math.max(analysis.effectiveWidth, 1);
  const sourceHeight = Math.max(analysis.effectiveHeight, 1);

  const widthScale = availableWidth / sourceWidth;
  const heightScale = availableHeight / sourceHeight;

  let scale: number;

  switch (analysis.recommendedStrategy) {
    case "fill":
      // Aggressively fill the space
      scale = Math.max(widthScale, heightScale) * 0.95;
      break;

    case "fit":
      // Conservative fit
      scale = Math.min(widthScale, heightScale) * 0.98;
      break;

    case "stretch":
      // Allow some distortion for better fill
      if (profile === "vertical") {
        scale = heightScale * 0.9;
      } else if (profile === "horizontal") {
        scale = widthScale * 0.9;
      } else {
        scale = (widthScale + heightScale) / 2 * 0.9;
      }
      break;

    case "reflow":
      // For reflow, prioritize the primary axis
      if (profile === "vertical") {
        // For vertical targets, maximize height utilization
        scale = Math.min(heightScale * 0.85, widthScale);
      } else if (profile === "horizontal") {
        // For horizontal targets, maximize width utilization
        scale = Math.min(widthScale * 0.85, heightScale);
      } else {
        // For square, balanced approach
        scale = (Math.min(widthScale, heightScale) + Math.max(widthScale, heightScale)) / 2 * 0.9;
      }
      break;

    case "adaptive":
    default:
      // Smart adaptive scaling based on profile
      if (profile === "vertical") {
        // Vertical: prioritize height but ensure width fits
        if (heightScale <= widthScale) {
          scale = heightScale * 0.95;
        } else {
          const heightFirst = heightScale * 0.9;
          // Allow minimal horizontal overshoot (5%) to unlock vertical fill
          const widthAllowance = widthScale * 1.05;
          scale = Math.min(heightFirst, widthAllowance);
        }
      } else if (profile === "horizontal") {
        // Horizontal: prioritize width but ensure height fits
        if (widthScale <= heightScale) {
          scale = widthScale * 0.95;
        } else {
          // Blend with heavy weight toward filling width, constrained by height
          const blend = widthScale * 0.8 + heightScale * 0.2;
          scale = Math.min(heightScale * 1.05, blend);
        }
      } else {
        // Square: balanced fill
        const avgScale = (widthScale + heightScale) / 2;
        const minScale = Math.min(widthScale, heightScale);
        scale = minScale * 0.6 + avgScale * 0.4;
      }
      break;
  }

  // Ensure minimum scale for readability
  const MIN_SCALE = 0.3;
  // Allow higher scaling for vector-only content to fill large targets
  // For images, cap at 12x to prevent extreme pixelation while ensuring layout fill
  const MAX_SCALE = analysis.hasImages ? 12 : 60;

  // Calculate safe area bounds
  const maxSafeScale = Math.min(widthScale, heightScale);

  // Allow strategy-calculated scale to exceed safe scale by up to 10%
  // This enables better fill while safe area padding absorbs minor overflow.
  // The auto-layout system will handle distribution of any excess.
  const SCALE_OVERSHOOT_ALLOWANCE = 1.10;
  const constrainedScale = Math.min(scale, maxSafeScale * SCALE_OVERSHOOT_ALLOWANCE);

  return Math.max(MIN_SCALE, Math.min(MAX_SCALE, constrainedScale));
}
