export interface LayoutOptions {
  readonly margin: number;
  readonly gap: number;
  readonly maxRowWidth: number;
}

export interface LayoutResult {
  readonly positions: ReadonlyArray<{ readonly x: number; readonly y: number }>;
  readonly bounds: { readonly width: number; readonly height: number };
}

/**
 * Computes non-overlapping frame positions for a sequence of variants, wrapping rows
 * when the width budget is exceeded. The result is deterministic to aid QA.
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

  let cursorX = options.margin;
  let cursorY = options.margin;
  let rowHeight = 0;
  let maxWidth = 0;
  let maxHeight = 0;

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

  return {
    positions,
    bounds: { width: maxWidth, height: maxHeight }
  };
}
