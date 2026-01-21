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
  const requestedInset = normaliseSafeInset(context.safeInset);

  // Even with no extra space, honor safe area insets as hard minimums
  if (totalExtra <= 0) {
    return { start: requestedInset.start, end: requestedInset.end, interior: 0 };
  }
  const appliedSafe = applySafeInsetBudget(requestedInset, totalExtra);
  const gaps = normaliseGaps(context.gaps);
  const flowChildCount = Math.max(0, context.flowChildCount);
  const baseItemSpacing = Math.max(0, context.baseItemSpacing ?? 0);

  const leftover = Math.max(totalExtra - appliedSafe.start - appliedSafe.end, 0);
  const canReflow = context.allowInteriorExpansion !== false && flowChildCount >= 2 && leftover > 0;

  let baseInteriorWeight = 0;
  if (canReflow) {
    const gapCount = Math.max(flowChildCount - 1, 1);
    // Increased base weight for more generous gap distribution
    // Was: 0.65 + gapCount * 0.10, cap 0.88
    // Now: Allow nearly full expansion (cap 0.98) for sparse layouts to fill space
    baseInteriorWeight = Math.min(0.75 + gapCount * 0.12, 0.98);
    if (baseItemSpacing < 16) {
      // Smaller penalty for tight spacing (was 0.95)
      baseInteriorWeight *= 0.98;
    }
  }

  const asymmetry = gaps ? computeAsymmetry(gaps) : 0;
  const symmetryMultiplier = 1 - asymmetry * 0.6;
  const interiorWeight = clamp(baseInteriorWeight * symmetryMultiplier, 0, 1.0);
  const interiorExtra = round(leftover * interiorWeight);

  // CRITICAL FIX: If there is only 1 child, do NOT dump all extra space into padding.
  // Leave it for the child to grow into (layoutGrow: 1).
  // Only use edgeBudget to satisfy safe area constraints.
  let edgeBudget = round(totalExtra - interiorExtra);
  
  if (flowChildCount === 1 && totalExtra > 0) {
     // Calculate minimum required padding to satisfy safe areas
     const minStart = Math.max(0, requestedInset.start - (context.gaps?.start || 0));
     const minEnd = Math.max(0, requestedInset.end - (context.gaps?.end || 0));
     edgeBudget = minStart + minEnd;
  }

  const distributed = distributePadding({
    totalExtra: edgeBudget,
    safeInset: appliedSafe,
    gaps: gaps ?? null,
    focus: context.focalRatio
  });

  // Ensure final start/end are at least the safe area insets (hard minimum)
  return {
    start: Math.max(round(distributed.start), requestedInset.start),
    end: Math.max(round(distributed.end), requestedInset.end),
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
  return Math.round(value);
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

function applySafeInsetBudget(requested: DistributedPadding, _totalExtra: number): DistributedPadding {
  // Safe area insets are hard minimums - never scale them down
  // If there's not enough totalExtra, interior expansion will be 0 (via leftover calculation)
  return {
    start: Math.max(0, requested.start),
    end: Math.max(0, requested.end)
  };
}
