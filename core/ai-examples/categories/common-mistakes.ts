/**
 * Common mistake examples for AI few-shot training.
 * These examples show INCORRECT responses followed by corrections,
 * teaching the model what NOT to do.
 *
 * Category: Common Mistakes (Negative Examples)
 * Purpose: Prevent frequent failure modes by explicitly showing wrong→right patterns
 * Key Concepts: Role misclassification, incomplete positioning, missing feasibility, omitted targets
 */

import type { ChatMessage } from '../types/chat-message.js';

/**
 * Mistake 1: Role Misclassification (hero_image vs hero_bleed)
 *
 * WRONG: Device mockup extending beyond frame bounds classified as hero_image
 * RIGHT: Should be hero_bleed because position extends outside frame
 *
 * Teaching Point: When node.y < 0 or node extends past frame bounds, use hero_bleed
 */
export const MISTAKE_ROLE_CLASSIFICATION: readonly ChatMessage[] = [
  {
    role: "user",
    content: JSON.stringify({
      frame: {
        id: "mistake1",
        name: "App Promo Banner",
        size: { width: 1920, height: 1080 },
        childCount: 4,
        nodes: [
          { id: "bg", name: "Gradient", type: "RECTANGLE", rel: { x: 0, y: 0, width: 1920, height: 1080 }, fillType: "OTHER" },
          { id: "phone", name: "Phone Mockup", type: "FRAME", rel: { x: 1200, y: -150, width: 900, height: 1400 }, fillType: "IMAGE" },
          { id: "heading", name: "Headline", type: "TEXT", rel: { x: 100, y: 400, width: 800, height: 100 }, text: "Your money, simplified", fontSize: 72, fontWeight: "Bold" },
          { id: "cta", name: "Download", type: "FRAME", rel: { x: 100, y: 560, width: 200, height: 56 }, fillType: "SOLID" }
        ]
      },
      targets: [{ id: "figma-cover", width: 1920, height: 960, label: "Figma Cover" }]
    })
  },
  {
    role: "assistant",
    content: JSON.stringify({
      _correction: {
        mistake: "Classified phone mockup as hero_image instead of hero_bleed",
        why_wrong: "Phone mockup has y=-150, meaning it extends 150px ABOVE the frame bounds. This is intentional bleed that should be preserved during scaling.",
        correct_approach: "Use hero_bleed for any element where node.y < 0 OR node.x < 0 OR (node.x + node.width) > frame.width OR (node.y + node.height) > frame.height"
      },
      signals: {
        roles: [
          { nodeId: "bg", role: "background", confidence: 0.96 },
          { nodeId: "phone", role: "hero", confidence: 0.94 },
          { nodeId: "heading", role: "heading", confidence: 0.98 },
          { nodeId: "cta", role: "cta", confidence: 0.92 }
        ],
        focalPoints: [{ nodeId: "heading", x: 0.26, y: 0.42, confidence: 0.88 }],
        qa: [],
        faceRegions: []
      },
      layoutAdvice: {
        entries: [{
          targetId: "figma-cover",
          selectedId: "split-left",
          score: 0.91,
          suggestedLayoutMode: "HORIZONTAL",
          backgroundNodeId: "bg",
          description: "Text left, phone mockup bleeds to right edge with intentional overflow preserved.",
          feasibility: {
            achievable: true,
            requiresRestructure: false,
            predictedFill: 0.85,
            uniformScaleResult: "89% scale creates comfortable fit with bleed preserved"
          },
          positioning: {
            "bg": {
              visible: true,
              priority: 10,
              anchor: "fill",
              constraints: { horizontal: "stretch", vertical: "stretch" },
              rationale: "Full bleed background"
            },
            "phone": {
              visible: true,
              priority: 2,
              anchor: "center-right",
              image: { fit: "cover", allowBleed: true, bleedAnchor: "right" },
              rationale: "CRITICAL: hero_bleed anchors to right edge, preserving intentional overflow above frame"
            },
            "heading": {
              visible: true,
              priority: 1,
              anchor: "center-left",
              offset: { left: 100, fromSafeArea: true },
              text: { maxLines: 2, minFontSize: 48, targetFontSize: 64, textAlign: "left" },
              rationale: "Title anchored left with safe area offset"
            },
            "cta": {
              visible: true,
              priority: 2,
              anchor: "center-left",
              offset: { left: 100, top: 160, fromSafeArea: true },
              size: { mode: "auto", minWidth: 180, minHeight: 48 },
              rationale: "CTA below title with consistent left alignment"
            }
          }
        }]
      }
    })
  }
];

/**
 * Mistake 2: Missing Positioning Entries
 *
 * WRONG: Only providing positioning for "main" nodes
 * RIGHT: Positioning MUST include an entry for EVERY node in the source frame
 *
 * Teaching Point: Incomplete positioning causes undefined behavior during scaling
 */
export const MISTAKE_MISSING_POSITIONING: readonly ChatMessage[] = [
  {
    role: "user",
    content: JSON.stringify({
      frame: {
        id: "mistake2",
        name: "Product Card",
        size: { width: 800, height: 600 },
        childCount: 5,
        nodes: [
          { id: "bg", name: "Card BG", type: "RECTANGLE", rel: { x: 0, y: 0, width: 800, height: 600 }, fillType: "SOLID" },
          { id: "logo", name: "Brand", type: "FRAME", rel: { x: 30, y: 30, width: 60, height: 24 }, fillType: "IMAGE" },
          { id: "hero", name: "Product", type: "RECTANGLE", rel: { x: 0, y: 80, width: 800, height: 320 }, fillType: "IMAGE" },
          { id: "heading", name: "Name", type: "TEXT", rel: { x: 30, y: 420, width: 500, height: 40 }, text: "Premium Headphones", fontSize: 32, fontWeight: "Bold" },
          { id: "price", name: "Price", type: "TEXT", rel: { x: 30, y: 480, width: 150, height: 30 }, text: "$299", fontSize: 24, fontWeight: "Medium" }
        ]
      },
      targets: [{ id: "social-carousel", width: 1080, height: 1080, label: "Social Square" }]
    })
  },
  {
    role: "assistant",
    content: JSON.stringify({
      _correction: {
        mistake: "Positioning object only included 2 nodes (title, hero) instead of all 5",
        why_wrong: "Every node in the source frame MUST have a positioning entry. Missing entries cause the scaling engine to use fallback behavior, leading to unpredictable layouts.",
        correct_approach: "Always iterate through ALL nodes from the input and provide explicit positioning for each, even if some are marked visible: false"
      },
      signals: {
        roles: [
          { nodeId: "bg", role: "background", confidence: 0.95 },
          { nodeId: "logo", role: "logo", confidence: 0.90 },
          { nodeId: "hero", role: "hero", confidence: 0.94 },
          { nodeId: "heading", role: "heading", confidence: 0.96 },
          { nodeId: "price", role: "price", confidence: 0.92 }
        ],
        focalPoints: [{ nodeId: "hero", x: 0.5, y: 0.33, confidence: 0.85 }],
        qa: [],
        faceRegions: []
      },
      layoutAdvice: {
        entries: [{
          targetId: "social-carousel",
          selectedId: "hero-first",
          score: 0.88,
          suggestedLayoutMode: "VERTICAL",
          backgroundNodeId: "bg",
          description: "Product image at top, text content below for square format.",
          feasibility: {
            achievable: true,
            requiresRestructure: false,
            predictedFill: 0.78,
            uniformScaleResult: "135% scale fills square format comfortably"
          },
          positioning: {
            "bg": {
              visible: true,
              priority: 10,
              anchor: "fill",
              constraints: { horizontal: "stretch", vertical: "stretch" },
              rationale: "Background stretches to fill square format"
            },
            "logo": {
              visible: true,
              priority: 3,
              anchor: "top-left",
              offset: { left: 40, top: 40, fromSafeArea: true },
              size: { mode: "fixed", width: 80, height: 32 },
              rationale: "Logo anchored top-left corner"
            },
            "hero": {
              visible: true,
              priority: 1,
              anchor: "top-center",
              offset: { top: 100, fromSafeArea: true },
              size: { mode: "fill", maxHeight: 540 },
              image: { fit: "cover", cropFocus: { x: 0.5, y: 0.5 } },
              rationale: "Hero image fills top portion of square"
            },
            "heading": {
              visible: true,
              priority: 2,
              anchor: "bottom-left",
              offset: { left: 40, bottom: 120, fromSafeArea: true },
              text: { maxLines: 2, minFontSize: 28, targetFontSize: 40, textAlign: "left" },
              rationale: "Product name in lower third"
            },
            "price": {
              visible: true,
              priority: 3,
              anchor: "bottom-left",
              offset: { left: 40, bottom: 60, fromSafeArea: true },
              text: { maxLines: 1, minFontSize: 24, targetFontSize: 32, textAlign: "left" },
              rationale: "Price below title"
            }
          }
        }]
      }
    })
  }
];

/**
 * Mistake 3: Missing Feasibility Analysis
 *
 * WRONG: layoutAdvice entry without feasibility object
 * RIGHT: EVERY entry MUST include feasibility analysis
 *
 * Teaching Point: Feasibility tells the scaling engine what to expect
 */
export const MISTAKE_MISSING_FEASIBILITY: readonly ChatMessage[] = [
  {
    role: "user",
    content: JSON.stringify({
      frame: {
        id: "mistake3",
        name: "Blog Header",
        size: { width: 1200, height: 630 },
        childCount: 3,
        nodes: [
          { id: "bg", name: "Photo", type: "RECTANGLE", rel: { x: 0, y: 0, width: 1200, height: 630 }, fillType: "IMAGE" },
          { id: "heading", name: "Title", type: "TEXT", rel: { x: 60, y: 400, width: 800, height: 80 }, text: "10 Tips for Better Design", fontSize: 56, fontWeight: "Bold" },
          { id: "author", name: "Author", type: "TEXT", rel: { x: 60, y: 500, width: 400, height: 30 }, text: "By Sarah Chen", fontSize: 20, fontWeight: "Regular" }
        ]
      },
      targets: [{ id: "youtube-thumbnail", width: 1280, height: 720, label: "YouTube Thumbnail" }]
    })
  },
  {
    role: "assistant",
    content: JSON.stringify({
      _correction: {
        mistake: "layoutAdvice entry was missing the required feasibility object",
        why_wrong: "The feasibility object is MANDATORY for every layoutAdvice entry. It communicates expected transformation outcomes to the scaling engine and helps users understand what will happen.",
        correct_approach: "Always include feasibility with: achievable (bool), requiresRestructure (bool), predictedFill (0-1), and uniformScaleResult (descriptive string)"
      },
      signals: {
        roles: [
          { nodeId: "bg", role: "hero", confidence: 0.94 },
          { nodeId: "heading", role: "heading", confidence: 0.97 },
          { nodeId: "author", role: "text", confidence: 0.85 }
        ],
        focalPoints: [{ nodeId: "heading", x: 0.38, y: 0.70, confidence: 0.88 }],
        qa: [],
        faceRegions: []
      },
      layoutAdvice: {
        entries: [{
          targetId: "youtube-thumbnail",
          selectedId: "layered-hero",
          score: 0.92,
          suggestedLayoutMode: "NONE",
          backgroundNodeId: "bg",
          description: "Text overlaid on hero image, similar aspect ratio makes this a natural fit.",
          feasibility: {
            achievable: true,
            requiresRestructure: false,
            predictedFill: 0.92,
            uniformScaleResult: "107% scale creates 1284×675 content in 1280×720 frame with slight crop"
          },
          positioning: {
            "bg": {
              visible: true,
              priority: 10,
              anchor: "fill",
              constraints: { horizontal: "stretch", vertical: "stretch" },
              image: { fit: "cover", cropFocus: { x: 0.5, y: 0.5 } },
              rationale: "Hero image fills frame with center crop"
            },
            "heading": {
              visible: true,
              priority: 1,
              anchor: "bottom-left",
              offset: { left: 80, bottom: 100, fromSafeArea: true },
              text: { maxLines: 2, minFontSize: 48, targetFontSize: 60, textAlign: "left" },
              rationale: "Large title in lower portion for YouTube thumbnail impact"
            },
            "author": {
              visible: true,
              priority: 3,
              anchor: "bottom-left",
              offset: { left: 80, bottom: 50, fromSafeArea: true },
              text: { maxLines: 1, minFontSize: 18, targetFontSize: 22, textAlign: "left" },
              rationale: "Author byline below title"
            }
          }
        }]
      }
    })
  }
];

/**
 * Mistake 4: Omitting Targets
 *
 * WRONG: Only providing layoutAdvice for some targets when multiple are requested
 * RIGHT: layoutAdvice.entries MUST have exactly one entry per target
 *
 * Teaching Point: The plugin expects advice for ALL requested targets
 */
export const MISTAKE_OMITTING_TARGETS: readonly ChatMessage[] = [
  {
    role: "user",
    content: JSON.stringify({
      frame: {
        id: "mistake4",
        name: "Event Banner",
        size: { width: 1600, height: 900 },
        childCount: 4,
        nodes: [
          { id: "bg", name: "Background", type: "RECTANGLE", rel: { x: 0, y: 0, width: 1600, height: 900 }, fillType: "OTHER" },
          { id: "logo", name: "Event Logo", type: "FRAME", rel: { x: 100, y: 100, width: 200, height: 80 }, fillType: "IMAGE" },
          { id: "heading", name: "Event Name", type: "TEXT", rel: { x: 100, y: 350, width: 800, height: 100 }, text: "Design Summit 2025", fontSize: 72, fontWeight: "Bold" },
          { id: "date", name: "Date", type: "TEXT", rel: { x: 100, y: 470, width: 400, height: 40 }, text: "March 15-17, 2025", fontSize: 28, fontWeight: "Medium" }
        ]
      },
      targets: [
        { id: "figma-cover", width: 1920, height: 960, label: "Figma Cover" },
        { id: "social-carousel", width: 1080, height: 1080, label: "Social Square" },
        { id: "tiktok-vertical", width: 1080, height: 1920, label: "TikTok" }
      ]
    })
  },
  {
    role: "assistant",
    content: JSON.stringify({
      _correction: {
        mistake: "Only provided layoutAdvice for 1 target when 3 were requested",
        why_wrong: "The input specified 3 targets (figma-cover, social-carousel, tiktok-vertical). The response MUST include exactly one layoutAdvice entry for EACH target. Omitting targets causes the plugin to fail or use suboptimal fallbacks.",
        correct_approach: "Count the targets in the input and ensure layoutAdvice.entries has the same count, with targetId matching each input target"
      },
      signals: {
        roles: [
          { nodeId: "bg", role: "background", confidence: 0.95 },
          { nodeId: "logo", role: "logo", confidence: 0.92 },
          { nodeId: "heading", role: "heading", confidence: 0.98 },
          { nodeId: "date", role: "heading", confidence: 0.88 }
        ],
        focalPoints: [{ nodeId: "heading", x: 0.28, y: 0.44, confidence: 0.90 }],
        qa: [],
        faceRegions: []
      },
      layoutAdvice: {
        entries: [
          {
            targetId: "figma-cover",
            selectedId: "split-left",
            score: 0.89,
            suggestedLayoutMode: "HORIZONTAL",
            backgroundNodeId: "bg",
            description: "Wide format accommodates horizontal text arrangement with room to breathe.",
            feasibility: {
              achievable: true,
              requiresRestructure: false,
              predictedFill: 0.82,
              uniformScaleResult: "107% scale creates comfortable fit"
            },
            positioning: {
              "bg": { visible: true, priority: 10, anchor: "fill", constraints: { horizontal: "stretch", vertical: "stretch" }, rationale: "Background fills frame" },
              "logo": { visible: true, priority: 2, anchor: "top-left", offset: { left: 120, top: 100, fromSafeArea: true }, size: { mode: "fixed", width: 200, height: 80 }, rationale: "Logo in top-left corner" },
              "heading": { visible: true, priority: 1, anchor: "center-left", offset: { left: 120, fromSafeArea: true }, text: { maxLines: 2, minFontSize: 56, targetFontSize: 72, textAlign: "left" }, rationale: "Title centered vertically, left-aligned" },
              "date": { visible: true, priority: 3, anchor: "center-left", offset: { left: 120, fromSafeArea: true }, spacing: { before: 24 }, text: { maxLines: 1, minFontSize: 24, targetFontSize: 28, textAlign: "left" }, rationale: "Date below title" }
            }
          },
          {
            targetId: "social-carousel",
            selectedId: "centered-stack",
            score: 0.86,
            suggestedLayoutMode: "VERTICAL",
            backgroundNodeId: "bg",
            description: "Square format centers content vertically for balanced composition.",
            feasibility: {
              achievable: true,
              requiresRestructure: false,
              predictedFill: 0.75,
              uniformScaleResult: "120% scale centers content in square"
            },
            positioning: {
              "bg": { visible: true, priority: 10, anchor: "fill", constraints: { horizontal: "stretch", vertical: "stretch" }, rationale: "Background fills square" },
              "logo": { visible: true, priority: 2, anchor: "top-center", offset: { top: 120, fromSafeArea: true }, size: { mode: "fixed", width: 180, height: 72 }, rationale: "Logo centered at top" },
              "heading": { visible: true, priority: 1, anchor: "center", text: { maxLines: 3, minFontSize: 48, targetFontSize: 64, textAlign: "center" }, rationale: "Title centered for square impact" },
              "date": { visible: true, priority: 3, anchor: "center", spacing: { before: 32 }, text: { maxLines: 1, minFontSize: 24, targetFontSize: 32, textAlign: "center" }, rationale: "Date centered below title" }
            }
          },
          {
            targetId: "tiktok-vertical",
            selectedId: "centered-stack",
            score: 0.84,
            suggestedLayoutMode: "VERTICAL",
            backgroundNodeId: "bg",
            description: "Vertical format stacks content with safe zones for TikTok UI.",
            feasibility: {
              achievable: true,
              requiresRestructure: false,
              predictedFill: 0.65,
              uniformScaleResult: "56% uniform scale would leave content clustered; vertical arrangement spreads elements"
            },
            positioning: {
              "bg": { visible: true, priority: 10, anchor: "fill", constraints: { horizontal: "stretch", vertical: "stretch" }, rationale: "Background fills vertical frame" },
              "logo": { visible: true, priority: 2, anchor: "top-center", offset: { top: 140, fromSafeArea: true }, size: { mode: "fixed", width: 200, height: 80 }, rationale: "Logo below TikTok status bar (108px safe zone)" },
              "heading": { visible: true, priority: 1, anchor: "center", text: { maxLines: 3, minFontSize: 48, targetFontSize: 72, textAlign: "center" }, spacing: { before: 80 }, rationale: "Large centered title for vertical scroll-stopping impact" },
              "date": { visible: true, priority: 3, anchor: "center", spacing: { before: 40 }, text: { maxLines: 1, minFontSize: 28, targetFontSize: 36, textAlign: "center" }, rationale: "Date below title in safe zone" }
            }
          }
        ]
      }
    })
  }
];

/**
 * All common mistake examples combined for export
 */
export const COMMON_MISTAKE_EXAMPLES: readonly ChatMessage[] = [
  ...MISTAKE_ROLE_CLASSIFICATION,
  ...MISTAKE_MISSING_POSITIONING,
  ...MISTAKE_MISSING_FEASIBILITY,
  ...MISTAKE_OMITTING_TARGETS
];
