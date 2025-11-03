export interface VariantTarget {
  readonly id: string;
  readonly label: string;
  readonly description: string;
  readonly width: number;
  readonly height: number;
}

export const VARIANT_TARGETS: readonly VariantTarget[] = [
  {
    id: "figma-cover",
    label: "Figma Community Cover",
    description: "1920 × 960 hero cover",
    width: 1920,
    height: 960
  },
  {
    id: "figma-gallery",
    label: "Figma Community Gallery",
    description: "1600 × 960 gallery preview",
    width: 1600,
    height: 960
  },
  {
    id: "figma-thumbnail",
    label: "Figma Community Thumbnail",
    description: "480 × 320 thumbnail",
    width: 480,
    height: 320
  },
  {
    id: "web-hero",
    label: "Web Hero Banner",
    description: "1440 × 600 responsive hero",
    width: 1440,
    height: 600
  }
] as const;

export function getTargetById(id: string): VariantTarget | undefined {
  return VARIANT_TARGETS.find((target) => target.id === id);
}
