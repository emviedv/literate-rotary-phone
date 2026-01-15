/**
 * Constraint Scaling Module
 *
 * Functions for collecting, validating, and applying dimension constraints
 * (minWidth, maxWidth, minHeight, maxHeight) during frame scaling.
 *
 * Handles edge cases like:
 * - min > max conflicts (resolved by averaging)
 * - Constraints that would prevent intended sizing
 * - Scale direction-aware application order
 *
 * Extracted from variant-scaling.ts for modularity and testability.
 */

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Scaled constraint values for a node.
 * null indicates the constraint was not present on the node.
 */
export type ScaledConstraints = {
  minWidth: number | null;
  maxWidth: number | null;
  minHeight: number | null;
  maxHeight: number | null;
};

// ============================================================================
// Constraint Collection
// ============================================================================

/**
 * Constraint property names to collect from nodes.
 * Using a constant array enables iteration and deduplication.
 */
const CONSTRAINT_KEYS = ["minWidth", "maxWidth", "minHeight", "maxHeight"] as const;

/**
 * Collects and scales all dimension constraints from a node.
 * Values are rounded to whole pixels for consistent rendering.
 *
 * @param node - The node to collect constraints from
 * @param scale - The scaling factor
 * @returns Scaled constraint values (null for missing constraints)
 */
export function collectAndScaleConstraints(node: SceneNode, scale: number): ScaledConstraints {
  const result: ScaledConstraints = {
    minWidth: null,
    maxWidth: null,
    minHeight: null,
    maxHeight: null
  };

  // Use any type for dynamic property access on Figma nodes
  const nodeAny = node as unknown as Record<string, unknown>;
  for (const key of CONSTRAINT_KEYS) {
    if (key in node && typeof nodeAny[key] === "number") {
      result[key] = Math.round((nodeAny[key] as number) * scale);
    }
  }

  return result;
}

// ============================================================================
// Constraint Validation
// ============================================================================

/**
 * Validates and resolves constraint conflicts.
 *
 * Resolution strategies:
 * 1. min > max conflict: Average the values, clamp to target size
 * 2. min > targetSize: Clamp min to target size
 * 3. max < targetSize: Expand max to target size
 *
 * This ensures constraints don't prevent the node from reaching its
 * intended scaled dimensions.
 *
 * @param constraints - The scaled constraints to validate
 * @param targetWidth - The intended width after scaling
 * @param targetHeight - The intended height after scaling
 * @returns Validated constraints (may be modified)
 */
export function validateConstraints(
  constraints: ScaledConstraints,
  targetWidth: number,
  targetHeight: number
): ScaledConstraints {
  const result = { ...constraints };

  // Resolve min > max conflicts by averaging
  if (result.minWidth !== null && result.maxWidth !== null) {
    if (result.minWidth > result.maxWidth) {
      const avgWidth = (result.minWidth + result.maxWidth) / 2;
      result.minWidth = Math.min(avgWidth, targetWidth);
      result.maxWidth = Math.max(avgWidth, targetWidth);
    }
  }
  if (result.minHeight !== null && result.maxHeight !== null) {
    if (result.minHeight > result.maxHeight) {
      const avgHeight = (result.minHeight + result.maxHeight) / 2;
      result.minHeight = Math.min(avgHeight, targetHeight);
      result.maxHeight = Math.max(avgHeight, targetHeight);
    }
  }

  // Ensure constraints don't prevent intended sizing
  if (result.minWidth !== null && result.minWidth > targetWidth) {
    result.minWidth = targetWidth;
  }
  if (result.maxWidth !== null && result.maxWidth < targetWidth) {
    result.maxWidth = targetWidth;
  }
  if (result.minHeight !== null && result.minHeight > targetHeight) {
    result.minHeight = targetHeight;
  }
  if (result.maxHeight !== null && result.maxHeight < targetHeight) {
    result.maxHeight = targetHeight;
  }

  return result;
}

// ============================================================================
// Constraint Application
// ============================================================================

/**
 * Applies validated constraints to a node in the correct order.
 *
 * The application order depends on scale direction:
 * - Scaling down (scale < 1): Apply min first, then max
 * - Scaling up (scale >= 1): Apply max first, then min
 *
 * This prevents Figma from rejecting intermediate invalid states
 * where min > max temporarily during application.
 *
 * @param node - The node to apply constraints to
 * @param constraints - The validated constraints
 * @param scale - The scale factor (determines application order)
 */
export function applyConstraints(
  node: SceneNode,
  constraints: ScaledConstraints,
  scale: number
): void {
  // Use any type for dynamic property assignment on Figma nodes
  const nodeAny = node as unknown as Record<string, unknown>;

  if (scale < 1) {
    // Scaling down: apply min first (it's getting smaller)
    if (constraints.minWidth !== null) nodeAny.minWidth = constraints.minWidth;
    if (constraints.minHeight !== null) nodeAny.minHeight = constraints.minHeight;
    if (constraints.maxWidth !== null) nodeAny.maxWidth = constraints.maxWidth;
    if (constraints.maxHeight !== null) nodeAny.maxHeight = constraints.maxHeight;
  } else {
    // Scaling up: apply max first (it's getting larger)
    if (constraints.maxWidth !== null) nodeAny.maxWidth = constraints.maxWidth;
    if (constraints.maxHeight !== null) nodeAny.maxHeight = constraints.maxHeight;
    if (constraints.minWidth !== null) nodeAny.minWidth = constraints.minWidth;
    if (constraints.minHeight !== null) nodeAny.minHeight = constraints.minHeight;
  }
}
