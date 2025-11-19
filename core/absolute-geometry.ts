export interface AxisRange {
  readonly start: number;
  readonly size: number;
}

/**
 * Projects a point from one axis-aligned range into another by scaling the offset
 * around the range center. When the source span collapses, the destination center
 * is returned.
 */
export function scaleCenterToRange(value: number, from: AxisRange, to: AxisRange): number {
  const boundedFrom = normaliseRange(from);
  const boundedTo = normaliseRange(to);

  if (boundedTo.size === 0) {
    return boundedTo.start;
  }

  if (boundedFrom.size === 0) {
    return boundedTo.start + boundedTo.size / 2;
  }

  const fromCenter = boundedFrom.start + boundedFrom.size / 2;
  const toCenter = boundedTo.start + boundedTo.size / 2;
  const scale = boundedTo.size / boundedFrom.size;

  return toCenter + (value - fromCenter) * scale;
}

function normaliseRange(range: AxisRange): AxisRange {
  const size = Math.max(0, Number.isFinite(range.size) ? range.size : 0);
  const start = Number.isFinite(range.start) ? range.start : 0;
  return { start, size };
}
