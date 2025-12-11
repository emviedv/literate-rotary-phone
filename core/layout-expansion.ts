import { distributePadding } from "./padding-distribution.js";
import type { AxisGaps, DistributedPadding } from "./padding-distribution.js";

export interface LayoutExpansionContext {
  readonly totalExtra: number;
  readonly safeInset: number | { readonly start: number; readonly end: number };
  readonly gaps?: AxisGaps | null;
  readonly flowChildCount: number;
  readonly baseItemSpacing?: number;
  readonly allowInteriorExpansion?: boolean;
  readonly focalRatio?: number | null;
}

export interface AxisExpansionPlan extends DistributedPadding {
  readonly interior: number;
}

export function planAutoLayoutExpansion(context: LayoutExpansionContext): AxisExpansionPlan {
  const totalExtra = Math.max(0, context.totalExtra);
  if (totalExtra === 0) {
    return { start: 0, end: 0, interior: 0 };
  }

  const requestedInset = normaliseSafeInset(context.safeInset);
  const appliedSafe = applySafeInsetBudget(requestedInset, totalExtra);
  const gaps = normaliseGaps(context.gaps);
  const flowChildCount = Math.max(0, context.flowChildCount);
  const baseItemSpacing = Math.max(0, context.baseItemSpacing ?? 0);

  const leftover = Math.max(totalExtra - appliedSafe.start - appliedSafe.end, 0);
  const canReflow = context.allowInteriorExpansion !== false && flowChildCount >= 2 && leftover > 0;

  let baseInteriorWeight = 0;
  if (canReflow) {
    const gapCount = Math.max(flowChildCount - 1, 1);
    baseInteriorWeight = Math.min(0.58 + gapCount * 0.12, 0.82);
    if (baseItemSpacing < 16) {
      baseInteriorWeight *= 0.92;
    }
  }

  const asymmetry = gaps ? computeAsymmetry(gaps) : 0;
  const symmetryMultiplier = 1 - asymmetry * 0.6;
  const interiorWeight = clamp(baseInteriorWeight * symmetryMultiplier, 0, 0.9);
  const interiorExtra = round(leftover * interiorWeight);

  const edgeBudget = round(totalExtra - interiorExtra);
  const distributed = distributePadding({
    totalExtra: edgeBudget,
    safeInset: appliedSafe,
    gaps: gaps ?? null,
    focus: context.focalRatio
  });

  return {
    start: round(distributed.start),
    end: round(distributed.end),
    interior: round(interiorExtra)
  };
}

function normaliseGaps(gaps: AxisGaps | null | undefined): AxisGaps | null {
  if (!gaps) {
    return null;
  }
  const start = Number.isFinite(gaps.start) ? Math.max(0, gaps.start) : 0;
  const end = Number.isFinite(gaps.end) ? Math.max(0, gaps.end) : 0;
  if (start === 0 && end === 0) {
    return null;
  }
  return { start, end };
}

function computeAsymmetry(gaps: AxisGaps): number {
  const total = gaps.start + gaps.end;
  if (total === 0) {
    return 0;
  }
  return Math.min(1, Math.abs(gaps.start - gaps.end) / total);
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function normaliseSafeInset(value: number | { readonly start: number; readonly end: number }): DistributedPadding {
  if (typeof value === "number") {
    const inset = Math.max(0, value);
    return { start: inset, end: inset };
  }
  return {
    start: Math.max(0, value.start),
    end: Math.max(0, value.end)
  };
}

function applySafeInsetBudget(requested: DistributedPadding, totalExtra: number): DistributedPadding {
  const totalRequested = requested.start + requested.end;
  if (totalRequested === 0 || totalExtra === 0) {
    return { start: 0, end: 0 };
  }
  if (totalExtra >= totalRequested) {
    return requested;
  }
  const scale = totalExtra / totalRequested;
  return {
    start: requested.start * scale,
    end: requested.end * scale
  };
}
