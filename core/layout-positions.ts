export interface LayoutOptions {
  readonly margin: number;
  readonly gap: number;
  readonly maxRowWidth: number;
  readonly direction?: 'horizontal' | 'vertical';
}

export interface LayoutResult {
  readonly positions: ReadonlyArray<{ readonly x: number; readonly y: number }>;
  readonly bounds: { readonly width: number; readonly height: number };
}

/**
 * Computes non-overlapping frame positions for a sequence of variants.
 * The layout can be horizontal (with wrapping) or vertical (stacked).
 * The result is deterministic to aid QA.
 */
export function computeVariantLayout(
  sizes: ReadonlyArray<{ readonly width: number; readonly height: number }>,
  options: LayoutOptions
): LayoutResult {
  if (sizes.length === 0) {
    return {
      positions: [],
      bounds: { width: 0, height: 0 }
    };
  }

  const positions: { x: number; y: number }[] = [];
  let maxWidth = 0;
  let maxHeight = 0;

  if (options.direction === 'vertical') {
    let cursorY = options.margin;
    for (const size of sizes) {
      // In vertical mode, all items are left-aligned at the margin.
      // A more sophisticated approach might center them relative to the max width.
      const x = options.margin;
      positions.push({ x, y: cursorY });

      const rightEdge = x + size.width + options.margin;
      if (rightEdge > maxWidth) {
        maxWidth = rightEdge;
      }

      cursorY += size.height + options.gap;
    }
    // The last item doesn't have a gap after it, so we subtract one gap length
    // and add the final margin.
    maxHeight = cursorY - options.gap + options.margin;
  } else {
    // Default to horizontal layout
    let cursorX = options.margin;
    let cursorY = options.margin;
    let rowHeight = 0;

    for (const size of sizes) {
      const requiresWrap = cursorX + size.width > options.maxRowWidth && cursorX > options.margin;
      if (requiresWrap) {
        cursorX = options.margin;
        cursorY += rowHeight + options.gap;
        rowHeight = 0;
      }

      positions.push({ x: cursorX, y: cursorY });

      const rightEdge = cursorX + size.width + options.margin;
      const bottomEdge = cursorY + size.height + options.margin;
      if (rightEdge > maxWidth) {
        maxWidth = rightEdge;
      }
      if (bottomEdge > maxHeight) {
        maxHeight = bottomEdge;
      }

      cursorX += size.width + options.gap;
      if (size.height > rowHeight) {
        rowHeight = size.height;
      }
    }
  }

  return {
    positions,
    bounds: { width: maxWidth, height: maxHeight }
  };
}
