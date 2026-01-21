/**
 * All original examples in exact order (temporary during refactoring).
 * This file contains the complete, unmodified content from ai-few-shot-examples.ts
 * to ensure backwards compatibility during the modular refactoring process.
 */

import type { ChatMessage } from '../types/chat-message.js';
import { COMMON_MISTAKE_EXAMPLES } from './common-mistakes.js';

/**
 * Original 26 messages (13 pairs) plus 8 common mistake messages (4 pairs)
 * Total: 34 messages (17 pairs)
 */
export const ALL_ORIGINAL_EXAMPLES: readonly ChatMessage[] = [
  // Example 1: Simple feature card
  {
    role: "user",
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
    role: "assistant",
    content: JSON.stringify({
      signals: {
        roles: [
          { nodeId: "n1", role: "logo", confidence: 0.9 },
          { nodeId: "n2", role: "heading", confidence: 0.95 },
          { nodeId: "n3", role: "text", confidence: 0.8 }
        ],
        focalPoints: [{ nodeId: "n1", x: 0.1, y: 0.13, confidence: 0.9 }],
        qa: [],
        faceRegions: []
      },
      layoutAdvice: {
        entries: [
          {
            targetId: "ig-story",
            selectedId: "vertical-stack",
            score: 0.95,
            suggestedLayoutMode: "VERTICAL",
            description: "Stack content vertically for tall screen.",
            feasibility: {
              achievable: true,
              requiresRestructure: false,
              predictedFill: 0.65,
              uniformScaleResult: "56% scale creates 224×168 content in 1080×1920 frame"
            },
            positioning: {
              "n1": {
                visible: true,
                priority: 2,
                anchor: "top-center",
                offset: { top: 200, fromSafeArea: true },
                size: { mode: "scale-proportional", scaleFactor: 2.5, width: 100, height: 100 },
                rationale: "Icon scaled up and centered at top for vertical format"
              },
              "n2": {
                visible: true,
                priority: 1,
                anchor: "center",
                size: { mode: "auto", scaleFactor: 2.0 },
                text: {
                  maxLines: 2,
                  minFontSize: 36,
                  targetFontSize: 48,
                  textAlign: "center"
                },
                spacing: { before: 60, after: 24 },
                rationale: "Title enlarged and centered for vertical impact"
              },
              "n3": {
                visible: true,
                priority: 3,
                anchor: "center",
                size: { mode: "auto", scaleFactor: 1.8, maxWidth: 900 },
                text: {
                  maxLines: 4,
                  minFontSize: 20,
                  targetFontSize: 28,
                  textAlign: "center"
                },
                rationale: "Body text centered below title with comfortable reading width"
              }
            }
          }
        ]
      }
    })
  },
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
          description: "Stack elements vertically centered over hero background.",
          feasibility: {
            achievable: true,
            requiresRestructure: false,
            predictedFill: 0.75,
            uniformScaleResult: "56% scale creates 1075×538 content centered in 1080×1920 frame"
          },
          positioning: {
            "bg": {
              visible: true,
              priority: 10,
              anchor: "fill",
              constraints: { horizontal: "stretch", vertical: "stretch" },
              image: { fit: "cover", cropFocus: { x: 0.5, y: 0.4 } },
              rationale: "Full bleed background, crop focus above center for vertical"
            },
            "logo": {
              visible: true,
              priority: 2,
              anchor: "top-center",
              offset: { top: 140, fromSafeArea: true },
              size: { mode: "fixed", width: 120, height: 48, scaleFactor: 1.0 },
              constraints: { horizontal: "center", vertical: "top" },
              rationale: "Centered below TikTok status bar (108px safe zone)"
            },
            "headline": {
              visible: true,
              priority: 1,
              anchor: "center",
              size: { mode: "auto", scaleFactor: 0.85, maxWidth: 900 },
              text: {
                maxLines: 3,
                minFontSize: 36,
                targetFontSize: 54,
                textAlign: "center"
              },
              spacing: { before: 60, after: 24 },
              rationale: "Large centered headline for vertical scroll-stopping impact"
            },
            "sub": {
              visible: true,
              priority: 3,
              anchor: "center",
              size: { mode: "auto", scaleFactor: 0.9, maxWidth: 800 },
              text: {
                maxLines: 2,
                minFontSize: 20,
                targetFontSize: 28,
                textAlign: "center"
              },
              spacing: { after: 40 },
              rationale: "Supporting text centered below headline"
            },
            "cta": {
              visible: true,
              priority: 2,
              anchor: "bottom-center",
              offset: { bottom: 360, fromSafeArea: true },
              size: { mode: "auto", minWidth: 220, minHeight: 56 },
              constraints: { horizontal: "center", vertical: "bottom" },
              warnings: [{ code: "PLATFORM_UI_PROXIMITY", message: "Positioned 40px above TikTok bottom bar", severity: "info" }],
              rationale: "Large CTA above TikTok bottom bar (320px), meets 44px touch target"
            }
          }
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
  // Example 4: Dense dashboard mockup
  {
    role: "user",
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
      targets: [{ id: "figma-thumbnail", width: 480, height: 320, label: "Figma Thumbnail" }]
    })
  },
  {
    role: "assistant",
    content: JSON.stringify({
      signals: {
        roles: [
          { nodeId: "nav", role: "decorative", confidence: 0.7 },
          { nodeId: "header", role: "decorative", confidence: 0.65 },
          { nodeId: "chart1", role: "image", confidence: 0.78 },
          { nodeId: "chart2", role: "image", confidence: 0.78 },
          { nodeId: "table", role: "list", confidence: 0.72 }
        ],
        focalPoints: [{ nodeId: "chart1", x: 0.35, y: 0.3, confidence: 0.7 }],
        qa: [
          { code: "UNCERTAIN_ROLES", severity: "info", message: "Complex UI with many similar elements", confidence: 0.68 },
          { code: "ASPECT_MISMATCH", severity: "warn", message: "Wide dashboard may lose detail in small thumbnail", confidence: 0.8 }
        ],
        faceRegions: []
      },
      layoutAdvice: {
        entries: [{
          targetId: "figma-thumbnail",
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
  // Example 6: Small thumbnail with dense content - legibility warning
  {
    role: "user",
    content: JSON.stringify({
      frame: {
        id: "ex6",
        name: "UI Kit Thumbnail",
        size: { width: 1200, height: 900 },
        childCount: 8,
        nodes: [
          { id: "bg", name: "BG", type: "RECTANGLE", rel: { x: 0, y: 0, width: 1200, height: 900 }, fillType: "SOLID", dominantColor: "#1a1a2e" },
          { id: "logo", name: "Brand", type: "FRAME", rel: { x: 40, y: 30, width: 100, height: 40 }, fillType: "IMAGE" },
          { id: "heading", name: "Title", type: "TEXT", rel: { x: 40, y: 100, width: 400, height: 60 }, text: "Enterprise UI Kit", fontSize: 48, fontWeight: "Bold" },
          { id: "desc", name: "Description", type: "TEXT", rel: { x: 40, y: 180, width: 500, height: 80 }, text: "200+ components for Figma with auto layout and variants support", fontSize: 18, fontWeight: "Regular" },
          { id: "preview1", name: "Preview 1", type: "FRAME", rel: { x: 600, y: 80, width: 250, height: 180 }, fillType: "IMAGE" },
          { id: "preview2", name: "Preview 2", type: "FRAME", rel: { x: 870, y: 80, width: 250, height: 180 }, fillType: "IMAGE" },
          { id: "preview3", name: "Preview 3", type: "FRAME", rel: { x: 600, y: 280, width: 250, height: 180 }, fillType: "IMAGE" },
          { id: "decorative", name: "Badge", type: "FRAME", rel: { x: 40, y: 280, width: 120, height: 32 }, fillType: "SOLID" }
        ]
      },
      targets: [{ id: "figma-thumbnail", width: 480, height: 320, label: "Thumbnail" }]
    })
  },
  {
    role: "assistant",
    content: JSON.stringify({
      signals: {
        roles: [
          { nodeId: "bg", role: "background", confidence: 0.98 },
          { nodeId: "logo", role: "logo", confidence: 0.88 },
          { nodeId: "heading", role: "heading", confidence: 0.95 },
          { nodeId: "desc", role: "text", confidence: 0.82 },
          { nodeId: "preview1", role: "image", confidence: 0.75 },
          { nodeId: "preview2", role: "image", confidence: 0.75 },
          { nodeId: "preview3", role: "image", confidence: 0.75 },
          { nodeId: "decorative", role: "decorative", confidence: 0.85 }
        ],
        focalPoints: [{ nodeId: "heading", x: 0.2, y: 0.15, confidence: 0.82 }],
        qa: [
          { code: "THUMBNAIL_LEGIBILITY", severity: "warn", message: "Description text (18px) will scale to ~7px, below legibility threshold", confidence: 0.88 },
          { code: "CONTENT_DENSITY_MISMATCH", severity: "info", message: "8 elements may be too dense for 480x320 thumbnail", confidence: 0.72 }
        ],
        faceRegions: []
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
  },
  // Example 11: EXTREME aspect ratio transformation - Vertical stack to Leaderboard
  // This example demonstrates the new feasibility and restructure fields
  {
    role: "user",
    content: JSON.stringify({
      frame: {
        id: "ex11",
        name: "Kanban Promo Vertical",
        size: { width: 600, height: 900 },
        childCount: 4,
        nodes: [
          { id: "logo", name: "Logo", type: "FRAME", rel: { x: 20, y: 20, width: 80, height: 80 }, fillType: "IMAGE" },
          { id: "heading", name: "Title", type: "TEXT", rel: { x: 20, y: 120, width: 560, height: 80 }, text: "the kanban you'll absolutely love", fontSize: 48, fontWeight: "Bold" },
          { id: "heading", name: "Subtitle", type: "TEXT", rel: { x: 20, y: 210, width: 560, height: 40 }, text: "Organize your work beautifully", fontSize: 24, fontWeight: "Regular" },
          { id: "screenshot", name: "App Screenshot", type: "RECTANGLE", rel: { x: 20, y: 270, width: 560, height: 610 }, fillType: "IMAGE" }
        ]
      },
      targets: [
        { id: "display-leaderboard", width: 728, height: 90, label: "Leaderboard" },
        { id: "facebook-cover", width: 820, height: 312, label: "Facebook Cover" }
      ]
    })
  },
  {
    role: "assistant",
    content: JSON.stringify({
      signals: {
        roles: [
          { nodeId: "logo", role: "logo", confidence: 0.95 },
          { nodeId: "heading", role: "heading", confidence: 0.98 },
          { nodeId: "heading", role: "heading", confidence: 0.92 },
          { nodeId: "screenshot", role: "hero", confidence: 0.94 }
        ],
        focalPoints: [
          { nodeId: "heading", x: 0.5, y: 0.17, confidence: 0.9 }
        ],
        qa: [
          {
            code: "ASPECT_MISMATCH",
            severity: "warn",
            message: "Vertical 4-element stack cannot fit in 90px leaderboard height. Screenshot and subtitle must be dropped.",
            confidence: 0.95
          },
          {
            code: "CONTENT_DENSITY_MISMATCH",
            severity: "warn",
            message: "Source has 4 stacked elements but leaderboard can only fit 2 elements horizontally.",
            confidence: 0.9
          }
        ],
        faceRegions: []
      },
      layoutAdvice: {
        entries: [
          {
            targetId: "display-leaderboard",
            selectedId: "horizontal-stack",
            score: 0.78,
            suggestedLayoutMode: "HORIZONTAL",
            description: "Drop screenshot and subtitle (won't fit 90px height), arrange logo and title horizontally with single-line text.",
            feasibility: {
              achievable: true,
              requiresRestructure: true,
              predictedFill: 0.85,
              uniformScaleResult: "10% scale would create 60×90px content in 728×90 frame (8% width coverage - unacceptable)"
            },
            restructure: {
              contentPriority: ["logo", "heading", "heading", "screenshot"],
              drop: ["screenshot", "heading"],
              keepRequired: ["logo", "heading"],
              arrangement: "horizontal",
              textTreatment: "single-line"
            },
            positioning: {
              "logo": {
                visible: true,
                priority: 2,
                anchor: "center-left",
                offset: { left: 16, fromSafeArea: false },
                size: { mode: "fixed", width: 60, height: 60, minWidth: 40 },
                constraints: { horizontal: "left", vertical: "center" },
                rationale: "Fixed size logo anchored left with minimal padding for leaderboard"
              },
              "title": {
                visible: true,
                priority: 1,
                anchor: "center",
                size: { mode: "fill", maxWidth: 600 },
                containerAlignment: { grow: 1, counter: "center" },
                text: {
                  maxLines: 1,
                  minFontSize: 18,
                  targetFontSize: 24,
                  truncation: "ellipsis",
                  textAlign: "left",
                  alternateText: "the kanban you'll love"
                },
                spacing: { before: 16 },
                rationale: "Single-line title fills remaining width, truncated if needed"
              },
              "subtitle": {
                visible: false,
                priority: 4,
                anchor: "center",
                warnings: [{ code: "DROPPED_FOR_TARGET", message: "Won't fit in 90px leaderboard height", severity: "info" }],
                rationale: "Hidden - leaderboard can only fit 2 elements vertically"
              },
              "screenshot": {
                visible: false,
                priority: 5,
                anchor: "center",
                warnings: [{ code: "DROPPED_FOR_TARGET", message: "Image too tall for 90px height", severity: "info" }],
                rationale: "Hidden - hero image cannot fit in extreme horizontal format"
              }
            }
          },
          {
            targetId: "facebook-cover",
            selectedId: "horizontal-stack",
            score: 0.82,
            suggestedLayoutMode: "HORIZONTAL",
            description: "Drop screenshot (too tall for 312px), keep logo, title, and subtitle arranged horizontally.",
            feasibility: {
              achievable: true,
              requiresRestructure: true,
              predictedFill: 0.75,
              uniformScaleResult: "35% scale would create 210×315px content in 820×312 frame (26% width coverage - needs restructuring)"
            },
            restructure: {
              contentPriority: ["logo", "title", "subtitle", "screenshot"],
              drop: ["screenshot"],
              keepRequired: ["logo", "title", "subtitle"],
              arrangement: "horizontal",
              textTreatment: "wrap"
            },
            positioning: {
              "logo": {
                visible: true,
                priority: 2,
                anchor: "center-left",
                offset: { left: 40, fromSafeArea: false },
                size: { mode: "fixed", width: 80, height: 80 },
                constraints: { horizontal: "left", vertical: "center" },
                rationale: "Logo anchored left in Facebook cover safe zone"
              },
              "title": {
                visible: true,
                priority: 1,
                anchor: "center",
                size: { mode: "auto", scaleFactor: 0.7, maxWidth: 500 },
                text: {
                  maxLines: 2,
                  minFontSize: 24,
                  targetFontSize: 36,
                  textAlign: "left"
                },
                spacing: { before: 32 },
                rationale: "Title centered with 2-line allowance for Facebook cover"
              },
              "subtitle": {
                visible: true,
                priority: 3,
                anchor: "center",
                size: { mode: "auto", scaleFactor: 0.8, maxWidth: 400 },
                text: {
                  maxLines: 1,
                  minFontSize: 16,
                  targetFontSize: 20,
                  textAlign: "left"
                },
                spacing: { before: 12 },
                rationale: "Subtitle below title, single line for cleaner look"
              },
              "screenshot": {
                visible: false,
                priority: 5,
                anchor: "center-right",
                image: { fit: "contain" },
                warnings: [{ code: "DROPPED_FOR_TARGET", message: "Screenshot too tall for 312px Facebook cover height", severity: "info" }],
                rationale: "Hidden - image would dominate limited vertical space"
              }
            }
          }
        ]
      }
    })
  },
  // Common mistake examples (negative examples showing wrong→right patterns)
  ...COMMON_MISTAKE_EXAMPLES
];