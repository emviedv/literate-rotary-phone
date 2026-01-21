/**
 * Layout Detection Helpers
 *
 * Pure utility functions for detecting content types and structural patterns
 * in Figma frames. Used by auto-layout-adapter for intelligent layout decisions.
 */

import { DETECTION_THRESHOLDS } from "./layout-constants.js";

/**
 * Checks if a frame contains any text children (recursively).
 */
export function hasTextChildren(frame: FrameNode): boolean {
  return frame.children.some(child =>
    child.type === "TEXT" ||
    ("children" in child && hasTextChildren(child as unknown as FrameNode))
  );
}

/**
 * Checks if a node contains image or video content (recursively).
 */
export function hasImageContent(node: SceneNode): boolean {
  if ("fills" in node && Array.isArray(node.fills)) {
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

/**
 * Checks if a frame contains image children.
 * Convenience wrapper around hasImageContent.
 */
export function hasImageChildren(frame: FrameNode): boolean {
  return hasImageContent(frame as unknown as SceneNode);
}

/**
 * Checks if a node contains any text content (recursively).
 */
export function containsText(node: SceneNode): boolean {
  if (node.type === "TEXT") return true;
  if ("children" in node) {
    return node.children.some((c) => containsText(c as SceneNode));
  }
  return false;
}

/**
 * Multi-signal background detection.
 * Combines: area coverage, layer position, fill type, text content, and name hints.
 *
 * A node is considered background-like if:
 * 1. It covers ≥90% of the root frame area, AND
 * 2. At least one additional signal is present (bottom layer, image/gradient fill, no text, or background name)
 */
export function isBackgroundLike(
  node: SceneNode,
  rootWidth: number,
  rootHeight: number,
  isBottomLayer: boolean = false
): boolean {
  if (!("width" in node) || !("height" in node)) return false;
  if (typeof (node as any).width !== "number" || typeof (node as any).height !== "number") return false;

  const nodeArea = (node as any).width * (node as any).height;
  const rootArea = rootWidth * rootHeight;

  // Signal 1: Area coverage (uses unified threshold from layout-constants.ts)
  const coversFrame = rootArea > 0 && nodeArea >= rootArea * DETECTION_THRESHOLDS.BACKGROUND_AREA_COVERAGE;

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

/**
 * Counts children that participate in auto-layout flow.
 * Excludes: background-like elements, invisible children, absolutely positioned children.
 */
export function countFlowChildren(frame: FrameNode): number {
  let count = 0;
  for (const child of frame.children) {
    if (isBackgroundLike(child, frame.width, frame.height)) continue;
    if ("visible" in child && !child.visible) continue;
    if ("layoutPositioning" in child && child.layoutPositioning === "ABSOLUTE") continue;
    count++;
  }
  return count;
}

/**
 * Heuristic to detect composed component frames (logos, buttons, icons) that
 * should NOT have their internal auto-layout modified.
 *
 * This prevents breaking small, self-contained UI elements when adapting
 * layouts for different target sizes.
 */
export function isComponentLikeFrame(node: FrameNode): boolean {
  // Small frames are likely components (logos, icons, buttons)
  if (node.width < 200 && node.height < 200) {
    return true;
  }

  // Check for common component name patterns
  const nameLower = node.name.toLowerCase();
  const componentPatterns = /logo|icon|button|badge|chip|avatar|cta|tag|pill|indicator/i;
  if (componentPatterns.test(nameLower)) {
    return true;
  }

  // Frames with auto-layout and few children are likely atomic components
  // (e.g., a logo with icon + text, or a button with icon + label)
  if (node.layoutMode !== "NONE" && node.children.length <= 3) {
    // Additional check: if children are mostly text/vectors, it's a component
    const hasOnlySimpleChildren = node.children.every(
      (child) => child.type === "TEXT" || child.type === "VECTOR" || child.type === "RECTANGLE" || child.type === "ELLIPSE"
    );
    if (hasOnlySimpleChildren) {
      return true;
    }
  }

  return false;
}
