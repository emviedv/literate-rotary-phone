import type { AiFocalPoint, AiQaSignal, AiRole, AiRoleEvidence, AiSignals } from "../types/ai-signals.js";
import type { LayoutAdvice } from "../types/layout-advice.js";
import { VARIANT_TARGETS } from "../types/targets.js";
import { normalizeLayoutAdvice } from "./layout-advice.js";
import { debugFixLog } from "./debug.js";
import { PLUGIN_NAME } from "./plugin-constants.js";

type FetchInit = {
  readonly method?: string;
  readonly headers?: Record<string, string>;
  readonly body?: string;
};

type FetchResponse = {
  readonly ok: boolean;
  readonly status: number;
  readonly statusText: string;
  json(): Promise<unknown>;
  text(): Promise<string>;
};

declare function fetch(url: string, init?: FetchInit): Promise<FetchResponse>;

interface AiResponseShape {
  readonly signals?: unknown;
  readonly layoutAdvice?: unknown;
}

interface ChatCompletion {
  readonly choices?: readonly [
    {
      readonly message?: {
        readonly content?: string;
      };
    }
  ];
}

export interface FrameSummary {
  readonly id: string;
  readonly name: string;
  readonly size: {
    readonly width: number;
    readonly height: number;
  };
  readonly childCount: number;
  readonly nodes: readonly NodeSummary[];
}

export interface NodeSummary {
  readonly id: string;
  readonly name: string;
  readonly type: SceneNode["type"];
  readonly rel: {
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
  };
  readonly text?: string;
  readonly fontSize?: number | "mixed";
  readonly fontWeight?: string;
  readonly fillType?: string;
  readonly layoutMode?: AutoLayoutMixin["layoutMode"];
  readonly primaryAxisAlignItems?: AutoLayoutMixin["primaryAxisAlignItems"];
  readonly counterAxisAlignItems?: AutoLayoutMixin["counterAxisAlignItems"];
  readonly zIndex?: number;
  readonly opacity?: number;
  readonly dominantColor?: string;
}

export interface AiServiceResult {
  readonly signals?: AiSignals;
  readonly layoutAdvice?: LayoutAdvice;
}

const OPENAI_ENDPOINT = "https://api.openai.com/v1/chat/completions";
const OPENAI_MODEL = "gpt-4o-mini";
const MAX_SUMMARY_NODES = 24;
const VALID_ROLES: readonly AiRole[] = [
  // Visual hierarchy
  "logo",
  "hero_image",
  "hero_bleed",
  "secondary_image",
  "background",
  // Typography hierarchy
  "title",
  "subtitle",
  "body",
  "caption",
  // Interactive/Action
  "cta",
  "cta_secondary",
  // Content elements
  "badge",
  "icon",
  "list",
  "feature_item",
  "testimonial",
  "price",
  "rating",
  // Structural
  "divider",
  "container",
  "decorative",
  "unknown"
] as const;
const VALID_QA_CODES: readonly AiQaSignal["code"][] = [
  // Existing signals
  "LOW_CONTRAST",
  "LOGO_TOO_SMALL",
  "TEXT_OVERLAP",
  "UNCERTAIN_ROLES",
  "SALIENCE_MISALIGNED",
  "SAFE_AREA_RISK",
  "GENERIC",
  "EXCESSIVE_TEXT",
  "MISSING_CTA",
  "ASPECT_MISMATCH",
  // Target-specific signals
  "TEXT_TOO_SMALL_FOR_TARGET",
  "CONTENT_DENSITY_MISMATCH",
  "THUMBNAIL_LEGIBILITY",
  "OVERLAY_CONFLICT",
  "CTA_PLACEMENT_RISK",
  "HIERARCHY_UNCLEAR",
  "VERTICAL_OVERFLOW_RISK",
  "HORIZONTAL_OVERFLOW_RISK",
  "PATTERN_MISMATCH"
] as const;

declare const figma: PluginAPI;

const FEW_SHOT_MESSAGES = [
  // Example 1: Simple feature card
  {
    role: "system",
    name: "example_user",
    content: JSON.stringify({
      frame: {
        id: "ex1",
        name: "Feature Card",
        size: { width: 400, height: 300 },
        childCount: 3,
        nodes: [
          { id: "n1", name: "Icon", type: "RECTANGLE", rel: { x: 20, y: 20, width: 40, height: 40 }, fillType: "IMAGE" },
          { id: "n2", name: "Title", type: "TEXT", rel: { x: 20, y: 80, width: 300, height: 30 }, text: "Analytics", fontSize: 24, fontWeight: "Bold" },
          { id: "n3", name: "Desc", type: "TEXT", rel: { x: 20, y: 120, width: 300, height: 60 }, text: "View your data.", fontSize: 16 }
        ]
      },
      targets: [{ id: "ig-story", width: 1080, height: 1920, label: "Story" }]
    })
  },
  {
    role: "system",
    name: "example_assistant",
    content: JSON.stringify({
      signals: {
        roles: [
          { nodeId: "n1", role: "logo", confidence: 0.9 },
          { nodeId: "n2", role: "title", confidence: 0.95 },
          { nodeId: "n3", role: "body", confidence: 0.8 }
        ],
        focalPoints: [{ nodeId: "n1", x: 0.1, y: 0.13, confidence: 0.9 }],
        qa: []
      },
      layoutAdvice: {
        entries: [
          {
            targetId: "ig-story",
            selectedId: "vertical-stack",
            score: 0.95,
            suggestedLayoutMode: "VERTICAL",
            description: "Stack content vertically for tall screen."
          }
        ]
      }
    })
  },
  // Example 2: Hero banner with background and CTA
  {
    role: "system",
    name: "example_user",
    content: JSON.stringify({
      frame: {
        id: "ex2",
        name: "Product Launch Banner",
        size: { width: 1920, height: 960 },
        childCount: 5,
        nodes: [
          { id: "bg", name: "Background", type: "RECTANGLE", rel: { x: 0, y: 0, width: 1920, height: 960 }, fillType: "IMAGE" },
          { id: "logo", name: "Brand Logo", type: "FRAME", rel: { x: 60, y: 40, width: 120, height: 48 }, fillType: "IMAGE" },
          { id: "headline", name: "Headline", type: "TEXT", rel: { x: 60, y: 380, width: 800, height: 80 }, text: "Introducing the Future of Design", fontSize: 64, fontWeight: "Bold" },
          { id: "sub", name: "Subheadline", type: "TEXT", rel: { x: 60, y: 480, width: 600, height: 40 }, text: "Available now on all platforms", fontSize: 24, fontWeight: "Regular" },
          { id: "cta", name: "CTA Button", type: "FRAME", rel: { x: 60, y: 560, width: 200, height: 56 }, fillType: "SOLID", layoutMode: "HORIZONTAL" }
        ]
      },
      targets: [{ id: "tiktok-vertical", width: 1080, height: 1920, label: "TikTok" }]
    })
  },
  {
    role: "system",
    name: "example_assistant",
    content: JSON.stringify({
      signals: {
        roles: [
          { nodeId: "bg", role: "hero_image", confidence: 0.95 },
          { nodeId: "logo", role: "logo", confidence: 0.92 },
          { nodeId: "headline", role: "title", confidence: 0.98 },
          { nodeId: "sub", role: "subtitle", confidence: 0.88 },
          { nodeId: "cta", role: "cta", confidence: 0.91 }
        ],
        focalPoints: [{ nodeId: "headline", x: 0.23, y: 0.48, confidence: 0.85 }],
        qa: [{ code: "SAFE_AREA_RISK", severity: "warn", message: "CTA near bottom edge for vertical targets", confidence: 0.72 }]
      },
      layoutAdvice: {
        entries: [{
          targetId: "tiktok-vertical",
          selectedId: "centered-stack",
          score: 0.88,
          suggestedLayoutMode: "VERTICAL",
          backgroundNodeId: "bg",
          description: "Stack elements vertically centered over hero background."
        }]
      }
    })
  },
  // Example 3: Social carousel tile (square, minimal)
  {
    role: "system",
    name: "example_user",
    content: JSON.stringify({
      frame: {
        id: "ex3",
        name: "Carousel Slide",
        size: { width: 1080, height: 1080 },
        childCount: 2,
        nodes: [
          { id: "img", name: "Product Photo", type: "RECTANGLE", rel: { x: 0, y: 0, width: 1080, height: 800 }, fillType: "IMAGE" },
          { id: "caption", name: "Caption", type: "TEXT", rel: { x: 40, y: 840, width: 1000, height: 60 }, text: "New collection", fontSize: 32, fontWeight: "Medium" }
        ]
      },
      targets: [{ id: "web-hero", width: 1440, height: 600, label: "Web Hero" }]
    })
  },
  {
    role: "system",
    name: "example_assistant",
    content: JSON.stringify({
      signals: {
        roles: [
          { nodeId: "img", role: "hero_image", confidence: 0.94 },
          { nodeId: "caption", role: "title", confidence: 0.82 }
        ],
        focalPoints: [{ nodeId: "img", x: 0.5, y: 0.37, confidence: 0.88 }],
        qa: [{ code: "MISSING_CTA", severity: "info", message: "No clear call-to-action button", confidence: 0.75 }]
      },
      layoutAdvice: {
        entries: [{
          targetId: "web-hero",
          selectedId: "horizontal-split",
          score: 0.82,
          suggestedLayoutMode: "HORIZONTAL",
          description: "Arrange image and caption side by side for wide format."
        }]
      }
    })
  },
  // Example 4: Dense dashboard mockup
  {
    role: "system",
    name: "example_user",
    content: JSON.stringify({
      frame: {
        id: "ex4",
        name: "Dashboard Preview",
        size: { width: 1200, height: 800 },
        childCount: 12,
        nodes: [
          { id: "nav", name: "Navigation", type: "FRAME", rel: { x: 0, y: 0, width: 200, height: 800 }, fillType: "SOLID", layoutMode: "VERTICAL" },
          { id: "header", name: "Header", type: "FRAME", rel: { x: 200, y: 0, width: 1000, height: 60 }, fillType: "SOLID", layoutMode: "HORIZONTAL" },
          { id: "chart1", name: "Chart 1", type: "FRAME", rel: { x: 220, y: 80, width: 460, height: 300 }, fillType: "SOLID" },
          { id: "chart2", name: "Chart 2", type: "FRAME", rel: { x: 700, y: 80, width: 460, height: 300 }, fillType: "SOLID" },
          { id: "table", name: "Data Table", type: "FRAME", rel: { x: 220, y: 400, width: 940, height: 380 }, fillType: "SOLID", layoutMode: "VERTICAL" }
        ]
      },
      targets: [{ id: "figma-thumb", width: 480, height: 320, label: "Figma Thumbnail" }]
    })
  },
  {
    role: "system",
    name: "example_assistant",
    content: JSON.stringify({
      signals: {
        roles: [
          { nodeId: "nav", role: "decorative", confidence: 0.7 },
          { nodeId: "header", role: "decorative", confidence: 0.65 },
          { nodeId: "chart1", role: "secondary_image", confidence: 0.78 },
          { nodeId: "chart2", role: "secondary_image", confidence: 0.78 },
          { nodeId: "table", role: "list", confidence: 0.72 }
        ],
        focalPoints: [{ nodeId: "chart1", x: 0.35, y: 0.3, confidence: 0.7 }],
        qa: [
          { code: "UNCERTAIN_ROLES", severity: "info", message: "Complex UI with many similar elements", confidence: 0.68 },
          { code: "ASPECT_MISMATCH", severity: "warn", message: "Wide dashboard may lose detail in small thumbnail", confidence: 0.8 }
        ]
      },
      layoutAdvice: {
        entries: [{
          targetId: "figma-thumb",
          selectedId: "preserve-layout",
          score: 0.75,
          suggestedLayoutMode: "NONE",
          description: "Preserve original layout and scale uniformly for dashboard preview."
        }]
      }
    })
  },
  // Example 5: TikTok Vertical Promo with platform overlay awareness
  {
    role: "system",
    name: "example_user",
    content: JSON.stringify({
      frame: {
        id: "ex5",
        name: "Product Promo Vertical",
        size: { width: 1080, height: 1920 },
        childCount: 5,
        nodes: [
          { id: "bg", name: "Gradient BG", type: "RECTANGLE", rel: { x: 0, y: 0, width: 1080, height: 1920 }, fillType: "OTHER" },
          { id: "product", name: "Product Shot", type: "FRAME", rel: { x: 140, y: 400, width: 800, height: 600 }, fillType: "IMAGE" },
          { id: "headline", name: "Headline", type: "TEXT", rel: { x: 80, y: 1100, width: 920, height: 120 }, text: "Summer Collection", fontSize: 72, fontWeight: "Bold" },
          { id: "tagline", name: "Tagline", type: "TEXT", rel: { x: 80, y: 1240, width: 920, height: 60 }, text: "Limited edition prints", fontSize: 32, fontWeight: "Regular" },
          { id: "shop", name: "Shop Now", type: "FRAME", rel: { x: 340, y: 1500, width: 400, height: 80 }, fillType: "SOLID", layoutMode: "HORIZONTAL" }
        ]
      },
      targets: [{ id: "tiktok-vertical", width: 1080, height: 1920, label: "TikTok" }]
    })
  },
  {
    role: "system",
    name: "example_assistant",
    content: JSON.stringify({
      signals: {
        roles: [
          { nodeId: "bg", role: "background", confidence: 0.95 },
          { nodeId: "product", role: "hero_image", confidence: 0.92 },
          { nodeId: "headline", role: "title", confidence: 0.98 },
          { nodeId: "tagline", role: "subtitle", confidence: 0.88 },
          { nodeId: "shop", role: "cta", confidence: 0.94 }
        ],
        focalPoints: [{ nodeId: "product", x: 0.5, y: 0.37, confidence: 0.85 }],
        qa: [{ code: "CTA_PLACEMENT_RISK", severity: "warn", message: "CTA at y=1500 may overlap TikTok bottom bar (starts at y=1600)", confidence: 0.78 }]
      },
      layoutAdvice: {
        entries: [{
          targetId: "tiktok-vertical",
          selectedId: "hero-first",
          score: 0.91,
          suggestedLayoutMode: "VERTICAL",
          backgroundNodeId: "bg",
          description: "Hero image prominent at top, text below, CTA should move above platform safe zone."
        }]
      }
    })
  },
  // Example 6: Small thumbnail with dense content - legibility warning
  {
    role: "system",
    name: "example_user",
    content: JSON.stringify({
      frame: {
        id: "ex6",
        name: "UI Kit Thumbnail",
        size: { width: 1200, height: 900 },
        childCount: 8,
        nodes: [
          { id: "bg", name: "BG", type: "RECTANGLE", rel: { x: 0, y: 0, width: 1200, height: 900 }, fillType: "SOLID", dominantColor: "#1a1a2e" },
          { id: "logo", name: "Brand", type: "FRAME", rel: { x: 40, y: 30, width: 100, height: 40 }, fillType: "IMAGE" },
          { id: "title", name: "Title", type: "TEXT", rel: { x: 40, y: 100, width: 400, height: 60 }, text: "Enterprise UI Kit", fontSize: 48, fontWeight: "Bold" },
          { id: "desc", name: "Description", type: "TEXT", rel: { x: 40, y: 180, width: 500, height: 80 }, text: "200+ components for Figma with auto layout and variants support", fontSize: 18, fontWeight: "Regular" },
          { id: "preview1", name: "Preview 1", type: "FRAME", rel: { x: 600, y: 80, width: 250, height: 180 }, fillType: "IMAGE" },
          { id: "preview2", name: "Preview 2", type: "FRAME", rel: { x: 870, y: 80, width: 250, height: 180 }, fillType: "IMAGE" },
          { id: "preview3", name: "Preview 3", type: "FRAME", rel: { x: 600, y: 280, width: 250, height: 180 }, fillType: "IMAGE" },
          { id: "badge", name: "Badge", type: "FRAME", rel: { x: 40, y: 280, width: 120, height: 32 }, fillType: "SOLID" }
        ]
      },
      targets: [{ id: "figma-thumbnail", width: 480, height: 320, label: "Thumbnail" }]
    })
  },
  {
    role: "system",
    name: "example_assistant",
    content: JSON.stringify({
      signals: {
        roles: [
          { nodeId: "bg", role: "background", confidence: 0.98 },
          { nodeId: "logo", role: "logo", confidence: 0.88 },
          { nodeId: "title", role: "title", confidence: 0.95 },
          { nodeId: "desc", role: "body", confidence: 0.82 },
          { nodeId: "preview1", role: "secondary_image", confidence: 0.75 },
          { nodeId: "preview2", role: "secondary_image", confidence: 0.75 },
          { nodeId: "preview3", role: "secondary_image", confidence: 0.75 },
          { nodeId: "badge", role: "badge", confidence: 0.85 }
        ],
        focalPoints: [{ nodeId: "title", x: 0.2, y: 0.15, confidence: 0.82 }],
        qa: [
          { code: "THUMBNAIL_LEGIBILITY", severity: "warn", message: "Description text (18px) will scale to ~7px, below legibility threshold", confidence: 0.88 },
          { code: "CONTENT_DENSITY_MISMATCH", severity: "info", message: "8 elements may be too dense for 480x320 thumbnail", confidence: 0.72 }
        ]
      },
      layoutAdvice: {
        entries: [{
          targetId: "figma-thumbnail",
          selectedId: "compact-vertical",
          score: 0.78,
          suggestedLayoutMode: "VERTICAL",
          backgroundNodeId: "bg",
          description: "Simplify to title + one preview; description and secondary previews will be illegible at thumbnail size."
        }]
      }
    })
  },
  // Example 7: Web hero with price and layered gradient
  {
    role: "system",
    name: "example_user",
    content: JSON.stringify({
      frame: {
        id: "ex7",
        name: "SaaS Hero",
        size: { width: 1440, height: 600 },
        childCount: 6,
        nodes: [
          { id: "bg", name: "Hero BG", type: "RECTANGLE", rel: { x: 0, y: 0, width: 1440, height: 600 }, fillType: "IMAGE" },
          { id: "overlay", name: "Overlay", type: "RECTANGLE", rel: { x: 0, y: 0, width: 720, height: 600 }, fillType: "SOLID", dominantColor: "#000000", opacity: 0.6 },
          { id: "headline", name: "Headline", type: "TEXT", rel: { x: 80, y: 180, width: 560, height: 100 }, text: "Scale your business", fontSize: 56, fontWeight: "Bold" },
          { id: "subhead", name: "Subheadline", type: "TEXT", rel: { x: 80, y: 300, width: 480, height: 60 }, text: "The all-in-one platform for growth", fontSize: 24, fontWeight: "Regular" },
          { id: "price", name: "Price", type: "TEXT", rel: { x: 80, y: 380, width: 200, height: 40 }, text: "From $29/mo", fontSize: 20, fontWeight: "Medium" },
          { id: "cta", name: "CTA", type: "FRAME", rel: { x: 80, y: 440, width: 180, height: 52 }, fillType: "SOLID", layoutMode: "HORIZONTAL" }
        ]
      },
      targets: [{ id: "web-hero", width: 1440, height: 600, label: "Web Hero" }]
    })
  },
  {
    role: "system",
    name: "example_assistant",
    content: JSON.stringify({
      signals: {
        roles: [
          { nodeId: "bg", role: "hero_image", confidence: 0.94 },
          { nodeId: "overlay", role: "decorative", confidence: 0.85 },
          { nodeId: "headline", role: "title", confidence: 0.97 },
          { nodeId: "subhead", role: "subtitle", confidence: 0.90 },
          { nodeId: "price", role: "price", confidence: 0.92 },
          { nodeId: "cta", role: "cta", confidence: 0.95 }
        ],
        focalPoints: [{ nodeId: "headline", x: 0.25, y: 0.38, confidence: 0.88 }],
        qa: []
      },
      layoutAdvice: {
        entries: [{
          targetId: "web-hero",
          selectedId: "layered-gradient",
          score: 0.93,
          suggestedLayoutMode: "NONE",
          backgroundNodeId: "bg",
          description: "Existing layered composition with gradient overlay works well for ultra-wide banner format."
        }]
      }
    })
  },
  // Example 8: YouTube cover with safe zone awareness
  {
    role: "system",
    name: "example_user",
    content: JSON.stringify({
      frame: {
        id: "ex8",
        name: "Channel Banner",
        size: { width: 2560, height: 1440 },
        childCount: 4,
        nodes: [
          { id: "bg", name: "Background", type: "RECTANGLE", rel: { x: 0, y: 0, width: 2560, height: 1440 }, fillType: "IMAGE" },
          { id: "channel", name: "Channel Name", type: "TEXT", rel: { x: 980, y: 580, width: 600, height: 80 }, text: "Design Weekly", fontSize: 64, fontWeight: "Bold" },
          { id: "tagline", name: "Tagline", type: "TEXT", rel: { x: 980, y: 680, width: 600, height: 40 }, text: "Tutorials every Tuesday", fontSize: 28, fontWeight: "Regular" },
          { id: "social", name: "Social Icons", type: "FRAME", rel: { x: 1080, y: 1300, width: 400, height: 40 }, layoutMode: "HORIZONTAL" }
        ]
      },
      targets: [{ id: "youtube-cover", width: 2560, height: 1440, label: "YouTube Cover" }]
    })
  },
  {
    role: "system",
    name: "example_assistant",
    content: JSON.stringify({
      signals: {
        roles: [
          { nodeId: "bg", role: "background", confidence: 0.96 },
          { nodeId: "channel", role: "title", confidence: 0.95 },
          { nodeId: "tagline", role: "subtitle", confidence: 0.88 },
          { nodeId: "social", role: "list", confidence: 0.72 }
        ],
        focalPoints: [{ nodeId: "channel", x: 0.5, y: 0.45, confidence: 0.90 }],
        qa: [{ code: "OVERLAY_CONFLICT", severity: "warn", message: "Social icons at y=1300 overlap YouTube bottom subscribe area (starts at y=1200)", confidence: 0.82 }]
      },
      layoutAdvice: {
        entries: [{
          targetId: "youtube-cover",
          selectedId: "centered-stack",
          score: 0.86,
          suggestedLayoutMode: "VERTICAL",
          backgroundNodeId: "bg",
          description: "Center content vertically in safe zone; move social icons above platform overlay area."
        }]
      }
    })
  },
  // Example 9: Gumroad product with testimonial
  {
    role: "system",
    name: "example_user",
    content: JSON.stringify({
      frame: {
        id: "ex9",
        name: "Gumroad Product",
        size: { width: 1280, height: 720 },
        childCount: 6,
        nodes: [
          { id: "mockup", name: "Product Mockup", type: "FRAME", rel: { x: 40, y: 80, width: 500, height: 560 }, fillType: "IMAGE" },
          { id: "title", name: "Product Title", type: "TEXT", rel: { x: 580, y: 120, width: 660, height: 80 }, text: "The Complete Icon Pack", fontSize: 48, fontWeight: "Bold" },
          { id: "desc", name: "Description", type: "TEXT", rel: { x: 580, y: 220, width: 620, height: 100 }, text: "2000+ icons in 5 styles. SVG, PNG, and Figma files included.", fontSize: 20, fontWeight: "Regular" },
          { id: "quote", name: "Testimonial", type: "TEXT", rel: { x: 580, y: 360, width: 620, height: 80 }, text: "\"Best icon pack I've ever used\" - @designlead", fontSize: 18, fontWeight: "Italic" },
          { id: "price", name: "Price", type: "TEXT", rel: { x: 580, y: 480, width: 200, height: 50 }, text: "$49", fontSize: 36, fontWeight: "Bold" },
          { id: "buy", name: "Buy Button", type: "FRAME", rel: { x: 580, y: 560, width: 200, height: 56 }, fillType: "SOLID" }
        ]
      },
      targets: [{ id: "gumroad-cover", width: 1280, height: 720, label: "Gumroad Cover" }]
    })
  },
  {
    role: "system",
    name: "example_assistant",
    content: JSON.stringify({
      signals: {
        roles: [
          { nodeId: "mockup", role: "hero_image", confidence: 0.91 },
          { nodeId: "title", role: "title", confidence: 0.96 },
          { nodeId: "desc", role: "body", confidence: 0.84 },
          { nodeId: "quote", role: "testimonial", confidence: 0.89 },
          { nodeId: "price", role: "price", confidence: 0.94 },
          { nodeId: "buy", role: "cta", confidence: 0.92 }
        ],
        focalPoints: [{ nodeId: "mockup", x: 0.23, y: 0.5, confidence: 0.85 }],
        qa: []
      },
      layoutAdvice: {
        entries: [{
          targetId: "gumroad-cover",
          selectedId: "split-left",
          score: 0.92,
          suggestedLayoutMode: "HORIZONTAL",
          description: "Product mockup on left, text content on right creates clear visual hierarchy for product cover."
        }]
      }
    })
  }
];

export async function requestAiInsights(frame: FrameNode, apiKey: string): Promise<AiServiceResult | null> {
  const summary = summarizeFrame(frame);
  const body = {
    model: OPENAI_MODEL,
    temperature: 0.1,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `You are ${PLUGIN_NAME} Layout AI. Analyze Figma marketing frames and provide intelligent layout adaptation recommendations for multiple target formats.

## OUTPUT FORMAT
Return ONLY valid JSON: {"signals":{roles,focalPoints,qa},"layoutAdvice":{entries}}

## ROLE CLASSIFICATION (confidence 0-1)
Classify each node by semantic role:
- logo: Brand marks. <10% frame area, corner positioned, IMAGE fill
- hero_image: Primary visual. IMAGE fill, >40% area, often lowest z-index
- hero_bleed: Image/element that INTENTIONALLY extends beyond or is cropped by frame bounds. Patterns include: (1) device mockups at angles with edges cut off, (2) portrait photos cropped at head/shoulders, (3) landscape photos bleeding to frame edges, (4) any image positioned so part is "outside" the frame. Recognizable by: off-center near edge, visually "cut off", often large scale. CRITICAL: preserve edge-relative position when scaling - do not try to fit entirely within safe area
- background: Full-bleed layer. >90% coverage, bottom z-index, no text children
- secondary_image: Supporting visual. Smaller than hero_image
- title: Primary headline. Largest fontSize, Bold weight, <60 chars
- subtitle: Secondary text. Second-largest fontSize, near title, lighter weight
- body: Paragraph content. fontSize 14-18px, >60 chars
- caption: Small text near images. fontSize <14px
- cta: Action buttons. Rounded shape, SOLID fill, short action text ("Get Started", "Learn More")
- cta_secondary: Secondary actions. Outline style or lighter fill
- icon: Small symbolic images. <64px square, near text labels
- badge: Overlay chips. Small, corner-positioned ("New", "Sale")
- price: Pricing info. Contains "$" or currency, medium fontSize
- testimonial: Quotes with attribution
- rating: Star ratings, numeric scores
- list: Repeated similar structures
- feature_item: Single item in a feature list
- divider: Thin separators
- container: Grouping frames
- decorative: Non-semantic shapes, gradients

## CONFIDENCE CALIBRATION
- 0.90-1.00: Unambiguous match (e.g., text with "Get Started" in button = cta)
- 0.75-0.89: Strong match with minor ambiguity
- 0.60-0.74: Likely match but competing interpretations possible
- <0.60: Weak match, use "unknown" or omit

## FOCAL POINTS
Identify 1-2 primary visual attention points (x,y normalized 0-1 from top-left):
- Face/eyes in photos
- Product centers
- Logo center for brand-focused content
- Title start for text-heavy content

## QA SIGNALS (emit only when confident)
Existing:
- LOW_CONTRAST: Text color too similar to background
- LOGO_TOO_SMALL: Logo <3% of frame area
- TEXT_OVERLAP: Text nodes with intersecting bounds
- SAFE_AREA_RISK: Important content within 5% of edges
- EXCESSIVE_TEXT: Body text >200 chars
- MISSING_CTA: Marketing frame without call-to-action
- ASPECT_MISMATCH: Source poorly suited for target aspect ratio

Target-specific:
- TEXT_TOO_SMALL_FOR_TARGET: Text will be <9px after scaling to small targets
- THUMBNAIL_LEGIBILITY: Fine details won't render at 480x320
- CONTENT_DENSITY_MISMATCH: Too much/little content for target
- OVERLAY_CONFLICT: Content in platform UI zones (TikTok/YouTube)
- CTA_PLACEMENT_RISK: CTA in platform-obscured zone
- HIERARCHY_UNCLEAR: No clear size/weight differentiation

## TARGET-SPECIFIC LAYOUT GUIDANCE

figma-thumbnail (480x320): Legibility critical. Patterns: compact-vertical, centered-stack, preserve-layout. Min fontSize after scale: 9px.

figma-cover (1920x960): Room for horizontal spreading. Patterns: layered-hero, split-left, horizontal-stack, banner-spread.

figma-gallery (1600x960): Similar to cover. Patterns: layered-hero, split-left, horizontal-stack.

web-hero (1440x600): Ultra-wide, spread elements across width. Patterns: banner-spread, split-left, split-right, layered-gradient. Avoid centered-stack.

social-carousel (1080x1080): Balanced square composition. Patterns: centered-stack, layered-hero, text-first, hero-first.

youtube-cover (2560x1440): Keep critical content in center safe zone, avoid bottom 240px. Patterns: layered-hero, banner-spread, centered-stack.

tiktok-vertical (1080x1920): Extreme vertical, large text (24px+). Top 108px and bottom 320px are platform UI zones. Patterns: centered-stack, vertical-stack, hero-first, text-first.

gumroad-cover (1280x720): Product display 16:9. Patterns: split-left, layered-hero, horizontal-stack.

gumroad-thumbnail (600x600): Small square, max impact. Patterns: centered-stack, compact-vertical, hero-first. 1-2 elements for clarity.

## LAYOUT ADVICE OUTPUT
For each target provide:
- selectedId: Best-fit pattern (horizontal-stack, vertical-stack, centered-stack, split-left, split-right, layered-hero, layered-gradient, hero-first, text-first, compact-vertical, banner-spread, preserve-layout)
- score: Confidence 0-1
- suggestedLayoutMode: HORIZONTAL, VERTICAL, or NONE
- backgroundNodeId: Node ID for >90% coverage layer (if applicable)
- description: 1-sentence rationale`
      },
      ...FEW_SHOT_MESSAGES,
      {
        role: "user",
        content: JSON.stringify({
          frame: summary,
          targets: VARIANT_TARGETS
        })
      }
    ]
  };

  const response = await fetch(OPENAI_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const message = await response.text().catch(() => "");
    throw new Error(`OpenAI request failed (${response.status} ${response.statusText}): ${message.slice(0, 200)}`);
  }

  const payload = (await response.json()) as ChatCompletion;
  const content = payload.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("OpenAI response missing content.");
  }

  let parsed: AiResponseShape;
  try {
    parsed = JSON.parse(content) as AiResponseShape;
  } catch (error) {
    throw new Error(`OpenAI response was not valid JSON: ${error instanceof Error ? error.message : String(error)}`);
  }

  const signals = sanitizeAiSignals(parsed.signals);
  const layoutAdvice = normalizeLayoutAdvice(parsed.layoutAdvice);

  debugFixLog("ai service parsed response", {
    roles: signals?.roles.length ?? 0,
    qa: signals?.qa.length ?? 0,
    layoutTargets: layoutAdvice?.entries.length ?? 0
  });

  if (!signals && !layoutAdvice) {
    return null;
  }

  return {
    signals,
    layoutAdvice: layoutAdvice ?? undefined
  };
}

export function summarizeFrame(frame: FrameNode): FrameSummary {
  const frameBounds = frame.absoluteBoundingBox;
  const originX = frameBounds?.x ?? 0;
  const originY = frameBounds?.y ?? 0;

  const nodes: NodeSummary[] = [];
  const queue: SceneNode[] = [...frame.children];
  let zIndex = 0;

  while (queue.length > 0 && nodes.length < MAX_SUMMARY_NODES) {
    const node = queue.shift();
    if (!node || !node.visible) {
      continue;
    }
    const description = describeNode(node, originX, originY, zIndex);
    zIndex++;
    if (description) {
      nodes.push(description);
    }
    if ("children" in node) {
      queue.push(...node.children);
    }
  }

  return {
    id: frame.id,
    name: frame.name,
    size: {
      width: Math.round(frame.width),
      height: Math.round(frame.height)
    },
    childCount: frame.children.length,
    nodes
  };
}

function describeNode(node: SceneNode, originX: number, originY: number, zIndex: number): NodeSummary | null {
  if (!("absoluteBoundingBox" in node) || !node.absoluteBoundingBox) {
    return null;
  }
  const bounds = node.absoluteBoundingBox;
  const isText = node.type === "TEXT";
  const text = isText
    ? (node as TextNode).characters
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 160)
    : undefined;

  let fontSize: number | "mixed" | undefined;
  let fontWeight: string | undefined;

  if (isText) {
    const tNode = node as TextNode;
    fontSize = tNode.fontSize === figma.mixed ? "mixed" : Math.round(tNode.fontSize as number);
    fontWeight = tNode.fontName === figma.mixed ? "mixed" : (tNode.fontName as FontName).style;
  }

  let fillType: string | undefined;
  let dominantColor: string | undefined;
  if ("fills" in node && Array.isArray(node.fills)) {
    const fills = node.fills as readonly Paint[];
    if (fills.some((f) => f.type === "IMAGE")) {
      fillType = "IMAGE";
    } else if (fills.some((f) => f.type === "SOLID")) {
      fillType = "SOLID";
      // Extract dominant color from first visible solid fill
      const solidFill = fills.find((f) => f.type === "SOLID" && f.visible !== false) as SolidPaint | undefined;
      if (solidFill) {
        const c = solidFill.color;
        const r = Math.round(c.r * 255).toString(16).padStart(2, "0");
        const g = Math.round(c.g * 255).toString(16).padStart(2, "0");
        const b = Math.round(c.b * 255).toString(16).padStart(2, "0");
        dominantColor = `#${r}${g}${b}`;
      }
    } else if (fills.length > 0) {
      fillType = "OTHER";
    }
  }

  // Extract opacity
  let opacity: number | undefined;
  if ("opacity" in node && typeof node.opacity === "number" && node.opacity < 1) {
    opacity = round(node.opacity);
  }

  const layoutDetails =
    "layoutMode" in node && node.layoutMode && node.layoutMode !== "NONE"
      ? {
          layoutMode: node.layoutMode,
          primaryAxisAlignItems: node.primaryAxisAlignItems,
          counterAxisAlignItems: node.counterAxisAlignItems
        }
      : {};

  return {
    id: node.id,
    name: node.name || node.type,
    type: node.type,
    rel: {
      x: round(bounds.x - originX),
      y: round(bounds.y - originY),
      width: round(bounds.width),
      height: round(bounds.height)
    },
    zIndex,
    ...(text ? { text } : {}),
    ...(fontSize !== undefined ? { fontSize } : {}),
    ...(fontWeight ? { fontWeight } : {}),
    ...(fillType ? { fillType } : {}),
    ...(dominantColor ? { dominantColor } : {}),
    ...(opacity !== undefined ? { opacity } : {}),
    ...layoutDetails
  };
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

export function sanitizeAiSignals(raw: unknown): AiSignals | undefined {
  if (!raw || typeof raw !== "object") {
    return undefined;
  }
  const roles = Array.isArray((raw as { roles?: unknown[] }).roles)
    ? (raw as { roles: unknown[] }).roles
        .map((entry) => sanitizeRole(entry))
        .filter((entry): entry is AiRoleEvidence => Boolean(entry))
    : [];
  const focalPoints = Array.isArray((raw as { focalPoints?: unknown[] }).focalPoints)
    ? (raw as { focalPoints: unknown[] }).focalPoints
        .map((entry) => sanitizeFocal(entry))
        .filter((entry): entry is AiFocalPoint => Boolean(entry))
    : [];
  const qa = Array.isArray((raw as { qa?: unknown[] }).qa)
    ? (raw as { qa: unknown[] }).qa.map((entry) => sanitizeQa(entry)).filter((entry): entry is AiQaSignal => Boolean(entry))
    : [];

  if (roles.length === 0 && focalPoints.length === 0 && qa.length === 0) {
    return undefined;
  }

  return {
    roles,
    focalPoints,
    qa
  };
}

function sanitizeRole(entry: unknown): AiRoleEvidence | null {
  if (!entry || typeof entry !== "object") {
    return null;
  }
  const nodeId = (entry as { nodeId?: unknown }).nodeId;
  const role = (entry as { role?: unknown }).role;
  if (typeof nodeId !== "string" || typeof role !== "string") {
    return null;
  }

  const normalizedRole = role
    .trim()
    .replace(/([a-z])([A-Z])/g, "$1_$2")
    .replace(/[\s-]+/g, "_")
    .toLowerCase() as AiRole;
  if (!VALID_ROLES.includes(normalizedRole)) {
    return null;
  }

  const confidence = clampToUnit((entry as { confidence?: unknown }).confidence);
  return {
    nodeId,
    role: normalizedRole,
    confidence: confidence ?? 0.5
  };
}

function sanitizeFocal(entry: unknown): AiFocalPoint | null {
  if (!entry || typeof entry !== "object") {
    return null;
  }
  const nodeId = (entry as { nodeId?: unknown }).nodeId;
  const rawX = (entry as { x?: unknown }).x;
  const rawY = (entry as { y?: unknown }).y;
  if (typeof rawX !== "number" || typeof rawY !== "number") {
    return null;
  }
  return {
    nodeId: typeof nodeId === "string" ? nodeId : "",
    x: clampValue(rawX),
    y: clampValue(rawY),
    confidence: clampToUnit((entry as { confidence?: unknown }).confidence) ?? 0.5
  };
}

function sanitizeQa(entry: unknown): AiQaSignal | null {
  if (!entry || typeof entry !== "object") {
    return null;
  }
  const code = (entry as { code?: unknown }).code;
  if (typeof code !== "string") {
    return null;
  }
  const normalizedCode = code.trim().toUpperCase() as AiQaSignal["code"];
  if (!VALID_QA_CODES.includes(normalizedCode)) {
    return null;
  }
  const severityRaw = (entry as { severity?: unknown }).severity;
  const severity = severityRaw === "info" ? "info" : severityRaw === "error" ? "error" : "warn";
  const message = (entry as { message?: unknown }).message;
  return {
    code: normalizedCode,
    severity,
    message: typeof message === "string" ? message : undefined,
    confidence: clampToUnit((entry as { confidence?: unknown }).confidence)
  };
}

function clampToUnit(value: unknown): number | undefined {
  const parsed = typeof value === "number" ? value : typeof value === "string" ? Number.parseFloat(value) : NaN;
  if (!Number.isFinite(parsed)) {
    return undefined;
  }
  const normalized = parsed > 1 && parsed <= 100 ? parsed / 100 : parsed;
  return Math.min(Math.max(normalized, 0), 1);
}

function clampValue(value: number): number {
  return Math.min(Math.max(value, 0), 1);
}
