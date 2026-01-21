/**
 * Simple card examples for AI few-shot training.
 * These examples focus on basic feature cards, thumbnails, and compact layouts
 * with clear hierarchical content structure.
 *
 * Category: Simple Cards & Thumbnails
 * Examples: Feature cards, UI kit previews, compact promotional cards
 * Key Concepts: Basic layout hierarchy, thumbnail legibility, compact design
 */

import type { ChatMessage } from '../types/chat-message.js';

/**
 * Example 1: Simple Feature Card
 *
 * A basic feature card with icon, title, and description.
 * Demonstrates fundamental role classification (logo/title/body)
 * and vertical layout adaptation for tall targets.
 *
 * Key Learning: Basic semantic role assignment, simple vertical stacking
 */
export const FEATURE_CARD_EXAMPLE: readonly ChatMessage[] = [
  {
    role: "user",
    content: JSON.stringify({
      frame: {
        id: "ex1",
        name: "Feature Card",
        size: { width: 400, height: 300 },
        childCount: 3,
        nodes: [
          {
            id: "n1",
            name: "Icon",
            type: "RECTANGLE",
            rel: { x: 20, y: 20, width: 40, height: 40 },
            fillType: "IMAGE"
          },
          {
            id: "n2",
            name: "Title",
            type: "TEXT",
            rel: { x: 20, y: 80, width: 300, height: 30 },
            text: "Analytics",
            fontSize: 24,
            fontWeight: "Bold"
          },
          {
            id: "n3",
            name: "Desc",
            type: "TEXT",
            rel: { x: 20, y: 120, width: 300, height: 60 },
            text: "View your data.",
            fontSize: 16
          }
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
            description: "Stack content vertically for tall screen."
          }
        ]
      }
    })
  }
];

/**
 * Example 6: UI Kit Thumbnail with Dense Content
 *
 * A UI kit preview with multiple elements that demonstrates thumbnail legibility issues.
 * Shows how dense content must be simplified for small target formats.
 *
 * Key Learning: Thumbnail legibility warnings, content density management, priority-based simplification
 */
export const UI_KIT_THUMBNAIL_EXAMPLE: readonly ChatMessage[] = [
  {
    role: "user",
    content: JSON.stringify({
      frame: {
        id: "ex6",
        name: "UI Kit Thumbnail",
        size: { width: 1200, height: 900 },
        childCount: 8,
        nodes: [
          {
            id: "bg",
            name: "BG",
            type: "RECTANGLE",
            rel: { x: 0, y: 0, width: 1200, height: 900 },
            fillType: "SOLID",
            dominantColor: "#1a1a2e"
          },
          {
            id: "logo",
            name: "Brand",
            type: "FRAME",
            rel: { x: 40, y: 30, width: 100, height: 40 },
            fillType: "IMAGE"
          },
          {
            id: "heading",
            name: "Title",
            type: "TEXT",
            rel: { x: 40, y: 100, width: 400, height: 60 },
            text: "Enterprise UI Kit",
            fontSize: 48,
            fontWeight: "Bold"
          },
          {
            id: "desc",
            name: "Description",
            type: "TEXT",
            rel: { x: 40, y: 180, width: 500, height: 80 },
            text: "200+ components for Figma with auto layout and variants support",
            fontSize: 18,
            fontWeight: "Regular"
          },
          {
            id: "preview1",
            name: "Preview 1",
            type: "FRAME",
            rel: { x: 600, y: 80, width: 250, height: 180 },
            fillType: "IMAGE"
          },
          {
            id: "preview2",
            name: "Preview 2",
            type: "FRAME",
            rel: { x: 870, y: 80, width: 250, height: 180 },
            fillType: "IMAGE"
          },
          {
            id: "preview3",
            name: "Preview 3",
            type: "FRAME",
            rel: { x: 600, y: 280, width: 250, height: 180 },
            fillType: "IMAGE"
          },
          {
            id: "decorative",
            name: "Badge",
            type: "FRAME",
            rel: { x: 40, y: 280, width: 120, height: 32 },
            fillType: "SOLID"
          }
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
          {
            code: "THUMBNAIL_LEGIBILITY",
            severity: "warn",
            message: "Description text (18px) will scale to ~7px, below legibility threshold",
            confidence: 0.88
          },
          {
            code: "CONTENT_DENSITY_MISMATCH",
            severity: "info",
            message: "8 elements may be too dense for 480x320 thumbnail",
            confidence: 0.72
          }
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
  }
];

/**
 * All simple card examples combined for export
 */
export const SIMPLE_CARD_EXAMPLES: readonly ChatMessage[] = [
  ...FEATURE_CARD_EXAMPLE,
  ...UI_KIT_THUMBNAIL_EXAMPLE
];