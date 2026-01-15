/**
 * Effect and Paint Scaling Module
 *
 * Pure functions for scaling visual effects (shadows, blurs) and paint properties
 * (gradients, tile patterns) with intelligent dampening for extreme scales.
 *
 * Extracted from variant-scaling.ts for modularity and testability.
 */

// ============================================================================
// Type Utilities
// ============================================================================

/**
 * Recursively removes readonly modifiers from a type.
 * Required because Figma API types use readonly arrays/objects,
 * but we need to mutate cloned values during scaling.
 */
type Mutable<T> = T extends ReadonlyArray<infer U>
  ? Mutable<U>[]
  : T extends object
    ? { -readonly [K in keyof T]: Mutable<T[K]> }
    : T;

// ============================================================================
// Core Utilities
// ============================================================================

/**
 * Deep clone a value using JSON serialization.
 * Works for all JSON-serializable Figma types (effects, paints, etc).
 */
export function cloneValue<T>(value: T): Mutable<T> {
  return JSON.parse(JSON.stringify(value)) as Mutable<T>;
}

// ============================================================================
// Effect Scaling
// ============================================================================

/**
 * Scales a visual effect (shadow or blur) with intelligent dampening.
 *
 * Dampening behavior:
 * - For scale <= 2: Linear scaling (radius *= scale)
 * - For scale > 2: Power curve dampening (radius *= scale^0.65 for shadows, scale^0.6 for blurs)
 *
 * Caps:
 * - Shadow radius: 100px max (prevents extreme blur artifacts)
 * - Blur radius: 50px max (performance and visual quality)
 *
 * @param effect - The effect to scale
 * @param scale - The scaling factor
 * @returns A new effect with scaled values
 */
export function scaleEffect(effect: Effect, scale: number): Effect {
  const clone = cloneValue(effect);

  if (clone.type === "DROP_SHADOW" || clone.type === "INNER_SHADOW") {
    if (typeof clone.radius === "number") {
      // Dampen shadow radius for large scales to prevent extreme blurs
      if (scale > 2) {
        clone.radius = clone.radius * Math.pow(scale, 0.65);
      } else {
        clone.radius *= scale;
      }
      // Cap shadow radius to prevent extreme effects
      clone.radius = Math.min(clone.radius, 100);
    }

    if (clone.offset) {
      // Dampen offset for large scales
      const offsetScale = scale > 2 ? Math.pow(scale, 0.7) : scale;
      clone.offset = {
        x: clone.offset.x * offsetScale,
        y: clone.offset.y * offsetScale
      };
    }

    // Scale spread if present
    if (typeof clone.spread === "number") {
      clone.spread = clone.spread * Math.pow(scale, 0.6);
    }
  }

  if (clone.type === "LAYER_BLUR" || clone.type === "BACKGROUND_BLUR") {
    if (typeof clone.radius === "number") {
      // Dampen blur radius for large scales
      if (scale > 2) {
        clone.radius = clone.radius * Math.pow(scale, 0.6);
      } else {
        clone.radius *= scale;
      }
      // Cap blur radius to prevent extreme effects
      clone.radius = Math.min(clone.radius, 50);
    }
  }

  return clone as Effect;
}

// ============================================================================
// Paint Scaling
// ============================================================================

/**
 * Scales a paint (fill) property, handling tile patterns and gradients.
 *
 * Tile mode: Scales the scalingFactor to maintain visual density.
 * Gradients: Scales the transform matrix (first two columns) while
 *            preserving the translation component (third column).
 *
 * @param paint - The paint to scale
 * @param scale - The scaling factor
 * @returns A new paint with scaled values
 */
export function scalePaint(paint: Paint, scale: number): Paint {
  const clone = cloneValue(paint);

  // Scale tile pattern density
  if ((clone.type === "IMAGE" || clone.type === "VIDEO") && clone.scaleMode === "TILE") {
    clone.scalingFactor = (clone.scalingFactor ?? 1) * scale;
  }

  // Scale gradient transforms
  if (
    clone.type === "GRADIENT_LINEAR" ||
    clone.type === "GRADIENT_RADIAL" ||
    clone.type === "GRADIENT_ANGULAR" ||
    clone.type === "GRADIENT_DIAMOND"
  ) {
    const gradientClone = clone as Mutable<typeof clone> & { gradientHandlePositions?: Vector[] };

    // Scale handle positions if present (legacy property)
    if (Array.isArray(gradientClone.gradientHandlePositions)) {
      gradientClone.gradientHandlePositions = gradientClone.gradientHandlePositions.map((position) => ({
        x: position.x * scale,
        y: position.y * scale
      }));
    }

    // Scale transform matrix: [a, b, tx], [c, d, ty]
    // Scale a, b, c, d but preserve tx, ty (translation stays relative to node)
    gradientClone.gradientTransform = gradientClone.gradientTransform.map((row: readonly number[]) =>
      row.map((value: number, index: number) => (index === 2 ? value : value * scale))
    ) as Transform;
  }

  return clone as Paint;
}
