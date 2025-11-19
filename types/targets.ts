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
  },
  {
    id: "social-carousel",
    label: "Social Carousel Panel",
    description: "1080 × 1080 square carousel tile",
    width: 1080,
    height: 1080
  },
  {
    id: "youtube-cover",
    label: "YouTube Cover",
    description: "2560 × 1440 channel cover",
    width: 2560,
    height: 1440
  },
  {
    id: "tiktok-vertical",
    label: "TikTok Vertical Promo",
    description: "1080 × 1920 vertical spotlight",
    width: 1080,
    height: 1920
  },
  {
    id: "gumroad-cover",
    label: "Gumroad Cover",
    description: "1280 × 720 product cover",
    width: 1280,
    height: 720
  },
  {
    id: "gumroad-thumbnail",
    label: "Gumroad Thumbnail",
    description: "600 × 600 store thumbnail",
    width: 600,
    height: 600
  }
] as const;

export function getTargetById(id: string): VariantTarget | undefined {
  return VARIANT_TARGETS.find((target) => target.id === id);
}
