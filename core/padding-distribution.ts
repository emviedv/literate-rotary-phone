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
  readonly safeInset: number;
  readonly gaps?: AxisGaps | null;
}

/**
 * Splits extra space between the start/end of an axis while guaranteeing the minimum
 * safe inset on both sides. When the original layout had asymmetric breathing room,
 * the distribution honours that ratio; otherwise, it falls back to an even split.
 */
export function distributePadding(options: DistributePaddingOptions): DistributedPadding {
  const totalExtra = Math.max(0, options.totalExtra);
  const requestedInset = Math.max(0, options.safeInset);

  if (totalExtra === 0) {
    return { start: 0, end: 0 };
  }

  const insetPerSide = Math.min(requestedInset, totalExtra / 2);
  const remaining = Math.max(totalExtra - insetPerSide * 2, 0);

  let startShare = 0.5;

  if (options.gaps && Number.isFinite(options.gaps.start) && Number.isFinite(options.gaps.end)) {
    const startGap = Math.max(0, options.gaps.start);
    const endGap = Math.max(0, options.gaps.end);
    const totalGap = startGap + endGap;

    if (totalGap > 0) {
      startShare = startGap / totalGap;
    }
  }

  return {
    start: insetPerSide + remaining * startShare,
    end: insetPerSide + remaining * (1 - startShare)
  };
}
