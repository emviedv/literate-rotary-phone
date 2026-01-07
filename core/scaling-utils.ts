
export function scaleStrokeWeight(originalWeight: number, scale: number): number {
  if (originalWeight <= 0) return 0;
  
  if (scale > 1) {
    // Standard dampening power
    const dampeningPower = 0.7;

    let newWeight = originalWeight * Math.pow(scale, dampeningPower);
    const maxWeight = Math.max(originalWeight * 4, 8);
    newWeight = Math.min(newWeight, maxWeight);
    return Math.round(newWeight * 100) / 100;
  } else {
    // Downscaling
    let newWeight = originalWeight * scale;
    return Math.max(newWeight, 0.5);
  }
}

export function scaleCornerRadius(
    value: number, 
    scale: number, 
    nodeWidth: number, 
    nodeHeight: number
): number {
    if (value === 0) return 0;

    let scaledValue: number;
    if (scale > 1) {
      scaledValue = value * Math.pow(scale, 0.7);
    } else if (scale < 1) {
      scaledValue = Math.max(value * scale, value > 0 ? 1 : 0);
    } else {
      scaledValue = value * scale;
    }

    const maxRadius = Math.min(nodeWidth, nodeHeight) / 2;
    return Math.min(scaledValue, maxRadius);
}
