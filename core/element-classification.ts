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
// Re-export isBackgroundLike from layout-detection-helpers for backward compatibility
// This eliminates the duplicate implementation and uses the unified 90% threshold with multi-signal detection
export { isBackgroundLike } from "./layout-detection-helpers.js";

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
// Background Detection - Re-exported from layout-detection-helpers.ts
// Uses unified 90% threshold with multi-signal detection (area + layer position + fill type + text + name)
// See import statement at top of file
// ============================================================================

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

// ============================================================================
// Atomic Group Detection
// ============================================================================

/**
 * Pattern to match names that suggest an atomic illustration/mockup group.
 * These groups should be treated as single visual units during scaling.
 */
const ATOMIC_GROUP_NAME_PATTERN = /\b(illustration|mockup|device|phone|iphone|android|tablet|ipad|asset|graphic|artwork|icon-group|logo-group|diagram|infographic|chart|screenshot)\b/i;

/**
 * Detects if a GROUP node should be treated as an atomic unit during scaling.
 *
 * Atomic groups are illustration-like containers where children maintain fixed
 * relative positions (e.g., iPhone mockups, vector illustrations, device frames).
 *
 * When a group is atomic:
 * - The group itself is repositioned at the parent level
 * - Children are scaled in size but NOT repositioned independently
 * - This preserves the internal layout of the illustration
 *
 * Heuristics applied:
 * 1. Name patterns: "illustration", "mockup", "device", "phone", etc.
 * 2. High vector/shape density (>70% of children)
 * 3. Image fills present (common in device mockups)
 * 4. NO TEXT children (text indicates a structural container, not an atomic unit)
 *
 * @param node - The node to check
 * @returns true if the group should be scaled as an atomic unit
 */
export function isAtomicGroup(node: SceneNode): boolean {
  if (node.type !== "GROUP") return false;

  // Groups must have children to analyze
  if (!("children" in node) || node.children.length === 0) return false;

  const children = node.children as readonly SceneNode[];

  // Disqualifier: TEXT children indicate a structural container, not an atomic illustration
  const hasTextChild = children.some((child) => child.type === "TEXT");
  if (hasTextChild) return false;

  // Heuristic 1: Name suggests atomic illustration
  if (ATOMIC_GROUP_NAME_PATTERN.test(node.name)) {
    return true;
  }

  // Count child types for composition analysis
  let vectorShapeCount = 0;
  let imageCount = 0;

  for (const child of children) {
    // Vector-like types (common in illustrations)
    if (
      child.type === "VECTOR" ||
      child.type === "BOOLEAN_OPERATION" ||
      child.type === "STAR" ||
      child.type === "POLYGON" ||
      child.type === "ELLIPSE" ||
      child.type === "RECTANGLE" ||
      child.type === "LINE"
    ) {
      vectorShapeCount++;
    }

    // Check for image fills (common in mockups)
    if ("fills" in child && Array.isArray(child.fills)) {
      const fills = child.fills as readonly Paint[];
      if (fills.some((f) => f.type === "IMAGE" || f.type === "VIDEO")) {
        imageCount++;
      }
    }
  }

  // Heuristic 2: High vector/shape density (>70%)
  const vectorDensity = vectorShapeCount / children.length;
  if (vectorDensity > 0.7) {
    return true;
  }

  // Heuristic 3: Contains images (mockup with screenshots/photos)
  if (imageCount > 0) {
    return true;
  }

  return false;
}
