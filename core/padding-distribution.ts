export interface AxisGaps {
  readonly start: number;
  readonly end: number;
}

export interface DistributedPadding {
  readonly start: number;
  readonly end: number;
}

export interface DistributePaddingOptions {
  readonly totalExtra: number;
  readonly safeInset: number | { readonly start: number; readonly end: number };
  readonly gaps?: AxisGaps | null;
  readonly focus?: number | null;
}

/**
 * Splits extra space between the start/end of an axis while guaranteeing the minimum
 * safe inset on both sides. When the original layout had asymmetric breathing room,
 * the distribution honours that ratio; otherwise, it falls back to an even split.
 */
export function distributePadding(options: DistributePaddingOptions): DistributedPadding {
  const totalExtra = Math.max(0, options.totalExtra);
  const requested = normaliseSafeInset(options.safeInset);
  const requestedTotal = requested.start + requested.end;
  const scale = requestedTotal > 0 && totalExtra < requestedTotal ? totalExtra / requestedTotal : 1;
  const appliedStart = requested.start * scale;
  const appliedEnd = requested.end * scale;
  const remaining = Math.max(totalExtra - appliedStart - appliedEnd, 0);

  let startShare = 0.5;

  if (options.gaps && Number.isFinite(options.gaps.start) && Number.isFinite(options.gaps.end)) {
    const startGap = Math.max(0, options.gaps.start);
    const endGap = Math.max(0, options.gaps.end);
    const totalGap = startGap + endGap;

    if (totalGap > 0) {
      startShare = startGap / totalGap;
    }
  }

  if (typeof options.focus === "number" && Number.isFinite(options.focus)) {
    const clampedFocus = clampRatio(options.focus);
    const blend = 0.6; // keep some memory of original symmetry/gap bias
    startShare = clampRatio(startShare * (1 - blend) + clampedFocus * blend);
  }

  return {
    start: appliedStart + remaining * startShare,
    end: appliedEnd + remaining * (1 - startShare)
  };
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

function clampRatio(value: number): number {
  const clamped = Math.min(Math.max(value, 0), 1);
  const epsilon = 0.05; // avoid collapsing a side completely
  return Math.min(Math.max(clamped, epsilon), 1 - epsilon);
}
