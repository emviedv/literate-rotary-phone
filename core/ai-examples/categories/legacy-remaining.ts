/**
 * Legacy remaining examples (temporary category during refactoring).
 * These examples will be properly categorized in subsequent phases.
 * For now, they maintain the original JSON structure to ensure compatibility.
 */

import type { ChatMessage } from '../types/chat-message.js';

/**
 * All remaining examples from the original file that haven't been categorized yet.
 * This is a temporary solution to maintain the exact same behavior during refactoring.
 */
export const LEGACY_REMAINING_EXAMPLES: readonly ChatMessage[] = [
  // Example 2: Hero banner with background and CTA
  {
    role: "user",
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
    role: "assistant",
    content: JSON.stringify({
      signals: {
        roles: [
          { nodeId: "bg", role: "hero", confidence: 0.95 },
          { nodeId: "logo", role: "logo", confidence: 0.92 },
          { nodeId: "headline", role: "heading", confidence: 0.98 },
          { nodeId: "sub", role: "heading", confidence: 0.88 },
          { nodeId: "cta", role: "cta", confidence: 0.91 }
        ],
        focalPoints: [{ nodeId: "headline", x: 0.23, y: 0.48, confidence: 0.85 }],
        qa: [{ code: "SAFE_AREA_RISK", severity: "warn", message: "CTA near bottom edge for vertical targets", confidence: 0.72 }],
        faceRegions: []
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
    role: "user",
    content: JSON.stringify({
      frame: {
        id: "ex3",
        name: "Carousel Slide",
        size: { width: 1080, height: 1080 },
        childCount: 2,
        nodes: [
          { id: "img", name: "Product Photo", type: "RECTANGLE", rel: { x: 0, y: 0, width: 1080, height: 800 }, fillType: "IMAGE" },
          { id: "text", name: "Caption", type: "TEXT", rel: { x: 40, y: 840, width: 1000, height: 60 }, text: "New collection", fontSize: 32, fontWeight: "Medium" }
        ]
      },
      targets: [{ id: "web-hero", width: 1440, height: 600, label: "Web Hero" }]
    })
  },
  {
    role: "assistant",
    content: JSON.stringify({
      signals: {
        roles: [
          { nodeId: "img", role: "hero", confidence: 0.94 },
          { nodeId: "text", role: "heading", confidence: 0.82 }
        ],
        focalPoints: [{ nodeId: "img", x: 0.5, y: 0.37, confidence: 0.88 }],
        qa: [{ code: "MISSING_CTA", severity: "info", message: "No clear call-to-action button", confidence: 0.75 }],
        faceRegions: []
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

  // Example 5: TikTok Vertical Promo with platform overlay awareness
  {
    role: "user",
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
    role: "assistant",
    content: JSON.stringify({
      signals: {
        roles: [
          { nodeId: "bg", role: "background", confidence: 0.95 },
          { nodeId: "product", role: "hero", confidence: 0.92 },
          { nodeId: "headline", role: "heading", confidence: 0.98 },
          { nodeId: "tagline", role: "heading", confidence: 0.88 },
          { nodeId: "shop", role: "cta", confidence: 0.94 }
        ],
        focalPoints: [{ nodeId: "product", x: 0.5, y: 0.37, confidence: 0.85 }],
        qa: [{ code: "CTA_PLACEMENT_RISK", severity: "warn", message: "CTA at y=1500 may overlap TikTok bottom bar (starts at y=1600)", confidence: 0.78 }],
        faceRegions: []
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

  // Example 7: Web hero with price and layered gradient
  {
    role: "user",
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
    role: "assistant",
    content: JSON.stringify({
      signals: {
        roles: [
          { nodeId: "bg", role: "hero", confidence: 0.94 },
          { nodeId: "overlay", role: "decorative", confidence: 0.85 },
          { nodeId: "headline", role: "heading", confidence: 0.97 },
          { nodeId: "subhead", role: "heading", confidence: 0.90 },
          { nodeId: "price", role: "price", confidence: 0.92 },
          { nodeId: "cta", role: "cta", confidence: 0.95 }
        ],
        focalPoints: [{ nodeId: "headline", x: 0.25, y: 0.38, confidence: 0.88 }],
        qa: [],
        faceRegions: []
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
    role: "user",
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
    role: "assistant",
    content: JSON.stringify({
      signals: {
        roles: [
          { nodeId: "bg", role: "background", confidence: 0.96 },
          { nodeId: "channel", role: "heading", confidence: 0.95 },
          { nodeId: "tagline", role: "heading", confidence: 0.88 },
          { nodeId: "social", role: "list", confidence: 0.72 }
        ],
        focalPoints: [{ nodeId: "channel", x: 0.5, y: 0.45, confidence: 0.90 }],
        qa: [{ code: "OVERLAY_CONFLICT", severity: "warn", message: "Social icons at y=1300 overlap YouTube bottom subscribe area (starts at y=1200)", confidence: 0.82 }],
        faceRegions: []
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
    role: "user",
    content: JSON.stringify({
      frame: {
        id: "ex9",
        name: "Gumroad Product",
        size: { width: 1280, height: 720 },
        childCount: 6,
        nodes: [
          { id: "mockup", name: "Product Mockup", type: "FRAME", rel: { x: 40, y: 80, width: 500, height: 560 }, fillType: "IMAGE" },
          { id: "heading", name: "Product Title", type: "TEXT", rel: { x: 580, y: 120, width: 660, height: 80 }, text: "The Complete Icon Pack", fontSize: 48, fontWeight: "Bold" },
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
    role: "assistant",
    content: JSON.stringify({
      signals: {
        roles: [
          { nodeId: "mockup", role: "hero", confidence: 0.91 },
          { nodeId: "heading", role: "heading", confidence: 0.96 },
          { nodeId: "desc", role: "text", confidence: 0.84 },
          { nodeId: "quote", role: "list", confidence: 0.89 },
          { nodeId: "price", role: "price", confidence: 0.94 },
          { nodeId: "buy", role: "cta", confidence: 0.92 }
        ],
        focalPoints: [{ nodeId: "mockup", x: 0.23, y: 0.5, confidence: 0.85 }],
        qa: [],
        faceRegions: []
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
  },

  // Example 10: Portrait photo with face detection - multiple targets
  {
    role: "user",
    content: JSON.stringify({
      frame: {
        id: "ex10",
        name: "Team Member Card",
        size: { width: 1200, height: 800 },
        childCount: 5,
        nodes: [
          { id: "photo", name: "Portrait", type: "RECTANGLE", rel: { x: 0, y: 0, width: 600, height: 800 }, fillType: "IMAGE" },
          { id: "name", name: "Name", type: "TEXT", rel: { x: 640, y: 280, width: 520, height: 60 }, text: "Sarah Chen", fontSize: 48, fontWeight: "Bold" },
          { id: "role", name: "Role", type: "TEXT", rel: { x: 640, y: 360, width: 520, height: 40 }, text: "Lead Designer", fontSize: 24, fontWeight: "Medium" },
          { id: "bio", name: "Bio", type: "TEXT", rel: { x: 640, y: 420, width: 500, height: 120 }, text: "10+ years creating delightful user experiences for startups and Fortune 500 companies.", fontSize: 18, fontWeight: "Regular" },
          { id: "cta", name: "Connect", type: "FRAME", rel: { x: 640, y: 580, width: 160, height: 48 }, fillType: "SOLID" }
        ]
      },
      targets: [
        { id: "social-carousel", width: 1080, height: 1080, label: "Social Square" },
        { id: "gumroad-thumbnail", width: 600, height: 600, label: "Gumroad Thumb" },
        { id: "figma-thumbnail", width: 480, height: 320, label: "Figma Thumb" },
        { id: "tiktok-vertical", width: 1080, height: 1920, label: "TikTok" }
      ]
    })
  },
  {
    role: "assistant",
    content: JSON.stringify({
      signals: {
        roles: [
          { nodeId: "photo", role: "hero", confidence: 0.94 },
          { nodeId: "name", role: "heading", confidence: 0.96 },
          { nodeId: "role", role: "heading", confidence: 0.88 },
          { nodeId: "bio", role: "text", confidence: 0.82 },
          { nodeId: "cta", role: "cta", confidence: 0.90 }
        ],
        focalPoints: [{ nodeId: "photo", x: 0.25, y: 0.3, confidence: 0.92 }],
        qa: [
          { code: "THUMBNAIL_LEGIBILITY", severity: "warn", message: "Bio text (18px) will be illegible at thumbnail sizes", confidence: 0.85 }
        ],
        faceRegions: [
          { nodeId: "photo", x: 0.25, y: 0.22, width: 0.18, height: 0.25, confidence: 0.94 }
        ]
      },
      layoutAdvice: {
        entries: [
          {
            targetId: "social-carousel",
            selectedId: "hero-first",
            score: 0.88,
            suggestedLayoutMode: "VERTICAL",
            description: "Stack photo at top with text below; face in upper region leaves room for text in bottom third."
          },
          {
            targetId: "gumroad-thumbnail",
            selectedId: "compact-vertical",
            score: 0.82,
            suggestedLayoutMode: "VERTICAL",
            description: "Compact layout with photo dominant; position name/role in bottom third to avoid face overlap."
          },
          {
            targetId: "figma-thumbnail",
            selectedId: "split-left",
            score: 0.78,
            suggestedLayoutMode: "HORIZONTAL",
            description: "Wide format suits left-right split; keep face visible on left, condensed text on right."
          },
          {
            targetId: "tiktok-vertical",
            selectedId: "centered-stack",
            score: 0.91,
            suggestedLayoutMode: "VERTICAL",
            description: "Tall format centers content vertically; face naturally in upper half, text card in lower safe zone."
          }
        ]
      }
    })
  },

  // Example 11: Marketing banner with bleed image - multiple target advice
  {
    role: "user",
    content: JSON.stringify({
      frame: {
        id: "ex11",
        name: "App Launch Banner",
        size: { width: 1920, height: 1080 },
        childCount: 6,
        nodes: [
          { id: "bg", name: "Gradient BG", type: "RECTANGLE", rel: { x: 0, y: 0, width: 1920, height: 1080 }, fillType: "OTHER" },
          { id: "device", name: "Phone Mockup", type: "FRAME", rel: { x: 1200, y: -100, width: 800, height: 1200 }, fillType: "IMAGE" },
          { id: "logo", name: "App Logo", type: "FRAME", rel: { x: 120, y: 80, width: 180, height: 60 }, fillType: "IMAGE" },
          { id: "headline", name: "Headline", type: "TEXT", rel: { x: 120, y: 340, width: 800, height: 120 }, text: "Your finances, simplified", fontSize: 72, fontWeight: "Bold" },
          { id: "subhead", name: "Subheadline", type: "TEXT", rel: { x: 120, y: 480, width: 700, height: 80 }, text: "Track spending, save smarter, reach your goals faster", fontSize: 28, fontWeight: "Regular" },
          { id: "badges", name: "Store Badges", type: "FRAME", rel: { x: 120, y: 600, width: 340, height: 56 }, layoutMode: "HORIZONTAL" }
        ]
      },
      targets: [
        { id: "figma-cover", width: 1920, height: 960, label: "Figma Cover" },
        { id: "web-hero", width: 1440, height: 600, label: "Web Hero" },
        { id: "youtube-cover", width: 2560, height: 1440, label: "YouTube" },
        { id: "social-carousel", width: 1080, height: 1080, label: "Social" }
      ]
    })
  },
  {
    role: "assistant",
    content: JSON.stringify({
      signals: {
        roles: [
          { nodeId: "bg", role: "background", confidence: 0.96 },
          { nodeId: "device", role: "hero", confidence: 0.92 },
          { nodeId: "logo", role: "logo", confidence: 0.94 },
          { nodeId: "headline", role: "heading", confidence: 0.98 },
          { nodeId: "subhead", role: "heading", confidence: 0.88 },
          { nodeId: "badges", role: "cta", confidence: 0.85 }
        ],
        focalPoints: [
          { nodeId: "headline", x: 0.27, y: 0.37, confidence: 0.88 },
          { nodeId: "device", x: 0.83, y: 0.45, confidence: 0.82 }
        ],
        qa: [],
        faceRegions: []
      },
      layoutAdvice: {
        entries: [
          {
            targetId: "figma-cover",
            selectedId: "split-left",
            score: 0.94,
            suggestedLayoutMode: "HORIZONTAL",
            backgroundNodeId: "bg",
            description: "Wide format preserves left text + right device composition; hero_bleed anchors to right edge."
          },
          {
            targetId: "web-hero",
            selectedId: "banner-spread",
            score: 0.89,
            suggestedLayoutMode: "HORIZONTAL",
            backgroundNodeId: "bg",
            description: "Ultra-wide banner spreads content across width; may need to crop device vertically."
          },
          {
            targetId: "youtube-cover",
            selectedId: "layered-hero",
            score: 0.86,
            suggestedLayoutMode: "NONE",
            backgroundNodeId: "bg",
            description: "Center content in safe zone; device bleed can extend to edges beyond safe area."
          },
          {
            targetId: "social-carousel",
            selectedId: "centered-stack",
            score: 0.82,
            suggestedLayoutMode: "VERTICAL",
            backgroundNodeId: "bg",
            description: "Square format requires vertical stack; device may need repositioning or scaling down."
          }
        ]
      }
    })
  },

  // Example 10: Accessibility and design quality issues
  {
    role: "user",
    content: JSON.stringify({
      frame: {
        id: "ex10",
        name: "QA Issues Demo",
        size: { width: 800, height: 600 },
        childCount: 8,
        nodes: [
          { id: "bg", name: "Background", type: "RECTANGLE", rel: { x: 0, y: 0, width: 800, height: 600 }, fillType: "SOLID", fill: "#F0F0F0" },
          { id: "smalltext", name: "Tiny Text", type: "TEXT", rel: { x: 50, y: 50, width: 200, height: 15 }, text: "Very small text", fontSize: 8, fontWeight: "Regular", fill: "#999999" },
          { id: "lowcontrast", name: "Low Contrast", type: "TEXT", rel: { x: 50, y: 100, width: 300, height: 25 }, text: "Low contrast text", fontSize: 16, fontWeight: "Regular", fill: "#CCCCCC" },
          { id: "tinybutton", name: "Tiny Button", type: "RECTANGLE", rel: { x: 50, y: 150, width: 30, height: 20 }, fillType: "SOLID", fill: "#0066CC" },
          { id: "h1", name: "H1", type: "TEXT", rel: { x: 50, y: 200, width: 300, height: 40 }, text: "Main Heading", fontSize: 32, fontWeight: "Bold" },
          { id: "h3", name: "H3", type: "TEXT", rel: { x: 50, y: 250, width: 300, height: 25 }, text: "Sub Sub Heading", fontSize: 18, fontWeight: "Bold" },
          { id: "mixed1", name: "Arial Text", type: "TEXT", rel: { x: 50, y: 300, width: 200, height: 20 }, text: "Arial font", fontSize: 14, fontFamily: "Arial" },
          { id: "mixed2", name: "Helvetica Text", type: "TEXT", rel: { x: 300, y: 300, width: 200, height: 20 }, text: "Helvetica font", fontSize: 14, fontFamily: "Helvetica" }
        ]
      },
      targets: [{ id: "web-hero", width: 1440, height: 600, label: "Web Hero" }]
    })
  },
  {
    role: "assistant",
    content: JSON.stringify({
      signals: {
        roles: [
          { nodeId: "h1", role: "heading", confidence: 0.95 },
          { nodeId: "h3", role: "heading", confidence: 0.85 },
          { nodeId: "mixed1", role: "text", confidence: 0.7 },
          { nodeId: "mixed2", role: "text", confidence: 0.7 },
          { nodeId: "tinybutton", role: "cta", confidence: 0.6 }
        ],
        focalPoints: [{ nodeId: "h1", x: 0.25, y: 0.37, confidence: 0.8 }],
        qa: [
          {
            code: "TEXT_TOO_SMALL_ACCESSIBLE",
            severity: "error",
            message: "Text at 8px is below 12px accessibility threshold and will be difficult to read"
          },
          {
            code: "COLOR_CONTRAST_INSUFFICIENT",
            severity: "error",
            message: "Light gray text on light background has poor contrast ratio below WCAG AA standards"
          },
          {
            code: "INSUFFICIENT_TOUCH_TARGETS",
            severity: "warn",
            message: "Button is only 30x20px, below 44x44px mobile accessibility requirement"
          },
          {
            code: "HEADING_HIERARCHY_BROKEN",
            severity: "warn",
            message: "H3 follows H1 directly, skipping H2 level breaks accessibility hierarchy"
          },
          {
            code: "TYPOGRAPHY_INCONSISTENCY",
            severity: "info",
            message: "Mixed font families (Arial and Helvetica) create inconsistent visual hierarchy"
          }
        ],
        faceRegions: []
      },
      layoutAdvice: {
        entries: [{
          targetId: "web-hero",
          selectedId: "horizontal-stack",
          score: 0.75,
          suggestedLayoutMode: "HORIZONTAL",
          description: "Fix accessibility issues before scaling to wide banner format"
        }]
      }
    })
  }
];