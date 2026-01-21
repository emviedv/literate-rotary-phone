/**
 * Text Scaling Module
 *
 * Functions for scaling text nodes while maintaining legibility and proper formatting.
 * Handles font loading, character-by-character property scaling, and auto-resize mode
 * management to prevent awkward line breaks.
 *
 * Extracted from variant-scaling.ts for modularity and testability.
 */

import type { VariantTarget } from "../types/targets.js";
import { MIN_LEGIBLE_SIZES, RESOLUTION_THRESHOLDS } from "./layout-constants.js";

declare const figma: PluginAPI;

// ============================================================================
// Minimum Legibility
// ============================================================================

/**
 * Get minimum legible font size based on target resolution.
 *
 * The minimum size varies by target context:
 * - Thumbnails (< 500px): 9px - viewed at small size, smaller text acceptable
 * - Large displays (>= 2000px): 14px - need larger text for readability
 * - Standard (500-2000px): 11px - baseline minimum
 *
 * @param target - The variant target with dimensions
 * @returns The minimum font size in pixels
 */
export function getMinLegibleSize(target: VariantTarget): number {
  const minDimension = Math.min(target.width, target.height);
  if (minDimension < RESOLUTION_THRESHOLDS.THUMBNAIL_DIMENSION) {
    // Thumbnails: smaller text is acceptable (viewed at small size)
    return MIN_LEGIBLE_SIZES.THUMBNAIL;
  }
  if (target.width >= RESOLUTION_THRESHOLDS.LARGE_DISPLAY_DIMENSION || target.height >= RESOLUTION_THRESHOLDS.LARGE_DISPLAY_DIMENSION) {
    // Large displays (YouTube 2560px): need larger text
    return MIN_LEGIBLE_SIZES.LARGE_DISPLAY;
  }
  // Social/standard: baseline minimum
  return MIN_LEGIBLE_SIZES.STANDARD;
}

// ============================================================================
// Text Auto-Resize Management
// ============================================================================

/**
 * Restores text auto-resize mode after scaling, with adjustments to prevent awkward line breaks.
 *
 * Behavior:
 * - WIDTH_AND_HEIGHT boxes are converted to HEIGHT to preserve the scaled width
 * - This prevents text from shrinking back and causing mid-word line breaks
 * - NONE and HEIGHT modes are preserved as-is
 *
 * @param node - The text node to restore
 * @param originalAutoResize - The original auto-resize mode before scaling
 */
export function restoreTextAutoResize(node: TextNode, originalAutoResize: TextNode["textAutoResize"]): void {
  if (originalAutoResize === "WIDTH_AND_HEIGHT") {
    // For fully auto text, lock width but allow height to grow
    // This prevents the text box from shrinking back to minimal width
    node.textAutoResize = "HEIGHT";
  } else {
    // Restore original mode (NONE or HEIGHT)
    node.textAutoResize = originalAutoResize;
  }
}

// ============================================================================
// Text Node Scaling
// ============================================================================

/**
 * Scales a text node's dimensions and typography properties.
 *
 * Scaling Process:
 * 1. Capture original auto-resize mode
 * 2. Set auto-resize to NONE to prevent Figma from resizing during changes
 * 3. Scale the text box dimensions first (before font changes)
 * 4. Load required fonts asynchronously (with caching)
 * 5. Scale each character range's font size, line height, and letter spacing
 * 6. Restore auto-resize mode (with WIDTH_AND_HEIGHT → HEIGHT conversion)
 *
 * Font sizes are floored at the minimum legible size for the target resolution.
 *
 * @param node - The text node to scale
 * @param scale - The scaling factor
 * @param fontCache - Cache of loaded fonts to avoid redundant loading
 * @param target - The target variant (for minimum legibility calculation)
 */
export async function scaleTextNode(
  node: TextNode,
  scale: number,
  fontCache: Set<string>,
  target: VariantTarget
): Promise<void> {
  const minLegibleSize = getMinLegibleSize(target);
  const characters = node.characters;

  // STEP 1: Store original auto-resize mode to preserve text box width
  const originalAutoResize = node.textAutoResize;

  // STEP 2: Set to NONE to prevent auto-shrinking during scaling
  // This prevents Figma from immediately resizing the box after font changes
  node.textAutoResize = "NONE";

  // STEP 3: Scale text box dimensions FIRST (before font scaling)
  // This ensures the text box is large enough to accommodate scaled text
  // CRITICAL FIX: Ensure clean integer dimensions for text boxes
  const scaledWidth = Math.max(1, Math.round(node.width * scale));
  const scaledHeight = Math.max(1, Math.round(node.height * scale));
  node.resize(scaledWidth, scaledHeight);

  if (characters.length === 0) {
    if (node.fontSize !== figma.mixed && typeof node.fontSize === "number") {
      // Use half-pixel rounding for font size
      const rawSize = node.fontSize * scale;
      node.fontSize = Math.max(Math.round(rawSize * 2) / 2, minLegibleSize);
    }
    // Restore auto-resize for empty text nodes
    restoreTextAutoResize(node, originalAutoResize);
    return;
  }

  // STEP 4: Load fonts and scale text properties
  const fontNames = await node.getRangeAllFontNames(0, characters.length);
  for (const font of fontNames) {
    const cacheKey = `${font.family}__${font.style}`;
    if (!fontCache.has(cacheKey)) {
      await figma.loadFontAsync(font);
      fontCache.add(cacheKey);
    }
  }

  // Scale each character's typography properties
  for (let i = 0; i < characters.length; i += 1) {
    const nextIndex = i + 1;

    // Scale font size with minimum legibility floor
    const fontSize = node.getRangeFontSize(i, nextIndex);
    if (fontSize !== figma.mixed && typeof fontSize === "number") {
      // Use half-pixel rounding for better sub-pixel legibility while avoiding long decimals
      const rawSize = fontSize * scale;
      const newFontSize = Math.max(Math.round(rawSize * 2) / 2, minLegibleSize);
      node.setRangeFontSize(i, nextIndex, newFontSize);
    }

    // Scale line height (only pixel values, percentage stays relative)
    const lineHeight = node.getRangeLineHeight(i, nextIndex);
    if (lineHeight !== figma.mixed && lineHeight.unit === "PIXELS") {
      // Half-pixel rounding for line height
      const newValue = Math.round(lineHeight.value * scale * 2) / 2;
      node.setRangeLineHeight(i, nextIndex, {
        unit: "PIXELS",
        value: newValue
      });
    }

    // Scale letter spacing (only pixel values)
    const letterSpacing = node.getRangeLetterSpacing(i, nextIndex);
    if (letterSpacing !== figma.mixed && letterSpacing.unit === "PIXELS") {
      // Round letter spacing to 2 decimal places (standard for typography)
      const newValue = Math.round(letterSpacing.value * scale * 100) / 100;
      node.setRangeLetterSpacing(i, nextIndex, {
        unit: "PIXELS",
        value: newValue
      });
    }
  }

  // STEP 5: Restore auto-resize mode with appropriate adjustments
  restoreTextAutoResize(node, originalAutoResize);
}
