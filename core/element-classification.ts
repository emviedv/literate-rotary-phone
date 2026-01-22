/**
 * Element Classification Module
 *
 * Functions for classifying Figma nodes by their semantic role.
 * Simplified version - only includes functions needed for TikTok design flow.
 */

// ============================================================================
// Atomic Group Detection
// ============================================================================

/**
 * Pattern to match names that suggest an atomic illustration/mockup group.
 * These groups should be treated as single visual units during scaling.
 */
const ATOMIC_GROUP_NAME_PATTERN = /\b(illustration|mockup|device|phone|iphone|android|tablet|ipad|asset|graphic|artwork|icon-group|logo-group|diagram|infographic|chart|screenshot|frame-mockup|screen|bezel)\b/i;

/**
 * Pattern to match proximity groups created by the auto-layout system.
 * These groups should be treated as atomic units to preserve their internal layout.
 */
const PROXIMITY_GROUP_NAME_PATTERN = /^ProximityGroup|^RecoveredGroup/i;

/**
 * Detects if a GROUP or FRAME node should be treated as an atomic unit during scaling.
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
 * 5. For FRAMEs: contains nested frames that look like device bezels/screens
 *
 * @param node - The node to check
 * @returns true if the group should be scaled as an atomic unit
 */
export function isAtomicGroup(node: SceneNode): boolean {
  // Support GROUP, FRAME, and INSTANCE types for mockups
  if (node.type !== "GROUP" && node.type !== "FRAME" && node.type !== "INSTANCE") return false;

  // Component instances are inherently atomic - they're intentionally grouped by the designer
  // We detect this BEFORE detachment so the component boundary is preserved
  if (node.type === "INSTANCE") return true;

  // Must have children to analyze
  if (!("children" in node) || node.children.length === 0) return false;

  const children = node.children as readonly SceneNode[];

  // Disqualifier: ANY TEXT children indicate a structural container, not an atomic illustration
  // This is true even for named containers like "illustration" - if it has text, it's a layout container
  const hasTextChild = children.some((child) => child.type === "TEXT");
  if (hasTextChild) return false;

  // Heuristic 1: Name suggests atomic illustration/mockup (and no text children)
  if (ATOMIC_GROUP_NAME_PATTERN.test(node.name)) {
    return true;
  }

  // Heuristic 1b: Proximity groups should be treated as atomic
  // These are auto-layout containers created by the proximity system
  if (PROXIMITY_GROUP_NAME_PATTERN.test(node.name)) {
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

  // Heuristic 4: Auto-layout containers with multiple children (likely proximity groups)
  // These containers were intentionally created to group elements and should stay together
  if (
    node.type === "FRAME" &&
    "layoutMode" in node &&
    node.layoutMode !== "NONE" &&
    children.length >= 2
  ) {
    // Additional check: if container has no visual properties itself (pure layout container)
    // and contains elements that could be proximity-grouped
    const hasOwnFills = "fills" in node && Array.isArray(node.fills) &&
      node.fills.length > 0 && node.fills.some((f: any) => f.visible !== false);
    const hasOwnStrokes = "strokes" in node && Array.isArray(node.strokes) &&
      node.strokes.length > 0 && node.strokes.some((s: any) => s.visible !== false);

    // If it's a pure layout container (no own visual properties), treat as atomic
    if (!hasOwnFills && !hasOwnStrokes) {
      return true;
    }
  }

  return false;
}
