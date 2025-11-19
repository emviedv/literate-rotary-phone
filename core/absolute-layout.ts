import { scaleCenterToRange } from "./absolute-geometry.js";
import type { LayoutProfile } from "./layout-profile.js";

export interface AbsoluteChildSnapshot {
  readonly id: string;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface AbsolutePlan {
  readonly id: string;
  readonly x: number;
  readonly y: number;
}

export interface PlanAbsoluteChildPositionsInput {
  readonly profile: LayoutProfile;
  readonly safeBounds: { readonly x: number; readonly y: number; readonly width: number; readonly height: number };
  readonly children: ReadonlyArray<AbsoluteChildSnapshot>;
}

export function planAbsoluteChildPositions(input: PlanAbsoluteChildPositionsInput): AbsolutePlan[] {
  if (input.children.length === 0) {
    return [];
  }

  const safeBounds = normaliseBounds(input.safeBounds);
  const contentBounds = measureBounds(input.children);

  if (input.profile === "vertical" && input.children.length >= 2) {
    const horizontalSpan = contentBounds.width;
    const verticalSpan = contentBounds.height;
    const layoutIsPredominantlyHorizontal = horizontalSpan > verticalSpan * 1.1;

    if (layoutIsPredominantlyHorizontal) {
      return planVerticalStack(input.children, safeBounds);
    }
  }

  if (boundsContain(safeBounds, contentBounds)) {
    return input.children.map((child) => ({ id: child.id, x: round(child.x), y: round(child.y) }));
  }

  return projectChildrenToBounds(input.children, contentBounds, safeBounds);
}

function planVerticalStack(children: ReadonlyArray<AbsoluteChildSnapshot>, safe: Bounds): AbsolutePlan[] {
  const ordered = [...children].sort((a, b) => {
    if (a.x !== b.x) {
      return a.x - b.x;
    }
    return a.y - b.y;
  });

  const plans = new Map<string, AbsolutePlan>();
  const totalChildHeight = ordered.reduce((sum, child) => sum + child.height, 0);
  const gapCount = Math.max(ordered.length - 1, 0);
  const availableForGaps = Math.max(safe.height - totalChildHeight, 0);
  const gapSize = gapCount > 0 ? availableForGaps / gapCount : 0;
  let cursorY = safe.y;

  ordered.forEach((child, index) => {
    const targetY = clamp(cursorY, safe.y, safe.y + safe.height - child.height);
    const targetX = clamp(safe.x + (safe.width - child.width) / 2, safe.x, safe.x + safe.width - child.width);
    plans.set(child.id, {
      id: child.id,
      x: round(targetX),
      y: round(targetY)
    });
    cursorY = targetY + child.height + gapSize;
  });

  return children.map((child) => plans.get(child.id) ?? { id: child.id, x: child.x, y: child.y });
}

function projectChildrenToBounds(
  children: ReadonlyArray<AbsoluteChildSnapshot>,
  source: Bounds,
  target: Bounds
): AbsolutePlan[] {
  const sourceRangeX = { start: source.x, size: source.width };
  const sourceRangeY = { start: source.y, size: source.height };
  const targetRangeX = { start: target.x, size: target.width };
  const targetRangeY = { start: target.y, size: target.height };

  return children.map((child) => {
    const centerX = child.x + child.width / 2;
    const centerY = child.y + child.height / 2;

    const mappedCenterX = scaleCenterToRange(centerX, sourceRangeX, targetRangeX);
    const mappedCenterY = scaleCenterToRange(centerY, sourceRangeY, targetRangeY);

    const nextX = clamp(mappedCenterX - child.width / 2, target.x, target.x + target.width - child.width);
    const nextY = clamp(mappedCenterY - child.height / 2, target.y, target.y + target.height - child.height);

    return {
      id: child.id,
      x: round(nextX),
      y: round(nextY)
    };
  });
}

type Bounds = { x: number; y: number; width: number; height: number };

function measureBounds(children: ReadonlyArray<AbsoluteChildSnapshot>): Bounds {
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  for (const child of children) {
    minX = Math.min(minX, child.x);
    minY = Math.min(minY, child.y);
    maxX = Math.max(maxX, child.x + child.width);
    maxY = Math.max(maxY, child.y + child.height);
  }

  if (!Number.isFinite(minX) || !Number.isFinite(minY) || !Number.isFinite(maxX) || !Number.isFinite(maxY)) {
    return { x: 0, y: 0, width: 0, height: 0 };
  }

  return {
    x: minX,
    y: minY,
    width: Math.max(0, maxX - minX),
    height: Math.max(0, maxY - minY)
  };
}

function normaliseBounds(bounds: { x: number; y: number; width: number; height: number }): Bounds {
  return {
    x: Number.isFinite(bounds.x) ? bounds.x : 0,
    y: Number.isFinite(bounds.y) ? bounds.y : 0,
    width: Math.max(0, Number.isFinite(bounds.width) ? bounds.width : 0),
    height: Math.max(0, Number.isFinite(bounds.height) ? bounds.height : 0)
  };
}

function boundsContain(outer: Bounds, inner: Bounds): boolean {
  return (
    inner.x >= outer.x &&
    inner.y >= outer.y &&
    inner.x + inner.width <= outer.x + outer.width + 0.01 &&
    inner.y + inner.height <= outer.y + outer.height + 0.01
  );
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}
