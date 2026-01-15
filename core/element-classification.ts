/**
 * Element Classification Module
 *
 * Functions for classifying Figma nodes by their semantic role (logo, icon, badge, button)
 * and visual characteristics (background-like, decorative pointer).
 *
 * These classifications inform scaling behavior - e.g., logos have minimum size constraints,
 * backgrounds fill the frame, decorative pointers preserve aspect ratio.
 *
 * Extracted from variant-scaling.ts for modularity and testability.
 */

import { MIN_ELEMENT_SIZES, ELEMENT_ROLE_PATTERNS } from "./layout-constants.js";
import { cloneValue } from "./effect-scaling.js";

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Semantic element roles that trigger special scaling behavior.
 * Each role has minimum size constraints defined in layout-constants.ts.
 */
export type ElementRole = keyof typeof MIN_ELEMENT_SIZES;

// ============================================================================
// Element Role Detection
// ============================================================================

/**
 * Detects element role based on node name or structural characteristics.
 * Used to enforce minimum sizes for logos, icons, badges, and buttons.
 *
 * Detection strategy:
 * 1. Check name against pattern dictionary (highest priority)
 * 2. Apply heuristics for small frames with images/vectors (likely logos/icons)
 *
 * @param node - The node to classify
 * @returns The detected role or null if no role applies
 */
export function getElementRole(node: SceneNode): ElementRole | null {
  const name = node.name;

  // Check name patterns for semantic roles
  for (const [role, pattern] of Object.entries(ELEMENT_ROLE_PATTERNS)) {
    if (pattern.test(name)) {
      return role as ElementRole;
    }
  }

  // Heuristic: small frames/groups with images or vectors are likely logos/icons
  if ("width" in node && "height" in node && typeof node.width === "number" && typeof node.height === "number") {
    // Small frame/group threshold - likely a logo or icon
    if (node.width < 150 && node.height < 150) {
      if (node.type === "FRAME" || node.type === "GROUP") {
        // Check for image fills or vector children (common in logos)
        if ("fills" in node && Array.isArray(node.fills)) {
          const hasImageFill = (node.fills as readonly Paint[]).some(
            (f) => f.type === "IMAGE" || f.type === "VIDEO"
          );
          if (hasImageFill) {
            return "LOGO";
          }
        }
        // Check for vector children (common in logos)
        if ("children" in node) {
          const hasVectorChild = node.children.some(
            (child) => child.type === "VECTOR" || child.type === "BOOLEAN_OPERATION"
          );
          if (hasVectorChild) {
            return "ICON";
          }
        }
      }
    }
  }

  return null;
}

// ============================================================================
// Background Detection
// ============================================================================

/**
 * Determines if a node covers enough area to be considered a background element.
 * Background elements are scaled to fill the target frame completely.
 *
 * Threshold: 95% of root frame area (same as warning detection logic).
 *
 * @param node - The node to check
 * @param rootWidth - Width of the root frame
 * @param rootHeight - Height of the root frame
 * @returns true if the node is background-like
 */
export function isBackgroundLike(node: SceneNode, rootWidth: number, rootHeight: number): boolean {
  if (!("width" in node) || !("height" in node)) return false;
  if (typeof node.width !== "number" || typeof node.height !== "number") return false;
  const nodeArea = node.width * node.height;
  const rootArea = rootWidth * rootHeight;
  // 95% threshold, same as warning logic
  return rootArea > 0 && nodeArea >= rootArea * 0.95;
}

// ============================================================================
// Decorative Element Detection
// ============================================================================

/**
 * Detects decorative pointer elements like speech bubble pointers, arrows, etc.
 * These should preserve their aspect ratio rather than being stretched.
 *
 * Detection criteria:
 * 1. Node is a FRAME, VECTOR, or POLYGON
 * 2. Has extreme aspect ratio (>3 or <0.33)
 * 3. Either: parent has container-like name, OR node has pointer-like name
 *
 * @param node - The node to check
 * @returns true if the node appears to be a decorative pointer
 */
export function isDecorativePointer(node: SceneNode): boolean {
  if (node.type !== "FRAME" && node.type !== "VECTOR" && node.type !== "POLYGON") return false;

  if (!("width" in node) || !("height" in node)) return false;
  const width = node.width as number;
  const height = node.height as number;

  if (width <= 0 || height <= 0) return false;

  const aspectRatio = width / height;

  // Pointers are typically extreme aspect ratios (wide and short OR tall and narrow)
  if (aspectRatio > 3 || aspectRatio < 0.33) {
    // Check if parent looks like a text container or card
    const parent = node.parent;
    if (parent && "name" in parent) {
      const parentName = (parent.name as string).toLowerCase();
      if (/frame|container|card|box|bubble|speech|tooltip|callout/i.test(parentName)) {
        return true;
      }
    }

    // Also check if the node itself has pointer-like naming
    const nodeName = node.name.toLowerCase();
    if (/pointer|arrow|triangle|tip|caret|tail/i.test(nodeName)) {
      return true;
    }
  }

  return false;
}

// ============================================================================
// Image Fill Handling
// ============================================================================

/**
 * Ensures IMAGE/VIDEO fills use FILL scaleMode for aspect ratio preservation.
 * FILL mode scales images to cover container while maintaining proportions - excess is cropped.
 *
 * Only forces FILL mode for background nodes to preserve user intent for content images.
 *
 * @param node - The node to update
 * @param isBackground - If true, forces FILL mode for coverage; if false, preserves user intent
 */
export function ensureFillModeForImages(node: SceneNode, isBackground: boolean = false): void {
  if (!("fills" in node) || !Array.isArray(node.fills)) return;

  // Only force FILL mode for background nodes to preserve user intent for content images
  if (!isBackground) return;

  const fills = node.fills as readonly Paint[];
  const needsUpdate = fills.some(
    (f) => (f.type === "IMAGE" || f.type === "VIDEO") &&
           f.scaleMode !== "FILL" && f.scaleMode !== "TILE"
  );

  if (!needsUpdate) return;

  node.fills = fills.map((paint): Paint => {
    if (paint.type !== "IMAGE" && paint.type !== "VIDEO") return paint;
    if (paint.scaleMode === "TILE" || paint.scaleMode === "FILL") return paint;

    const clone = cloneValue(paint);
    clone.scaleMode = "FILL";
    if ("imageTransform" in clone) delete (clone as { imageTransform?: unknown }).imageTransform;
    return clone as Paint;
  });
}
