/**
 * Extreme aspect ratio transformation examples for AI few-shot training.
 * These examples demonstrate complex layout restructuring for challenging
 * aspect ratio conversions that require content prioritization.
 *
 * Category: Extreme Transformations
 * Examples: Vertical to leaderboard, dashboard to thumbnail, complex restructuring
 * Key Concepts: Feasibility analysis, content restructure, priority-based dropping
 */

import type { ChatMessage } from '../types/chat-message.js';

/**
 * Example 11: Kanban Promo - Extreme Vertical to Leaderboard
 *
 * Demonstrates the most challenging transformation: vertical 4-element stack
 * to ultra-wide 90px tall leaderboard. Shows feasibility analysis and
 * content restructuring with priority-based element dropping.
 *
 * Key Learning: Feasibility fields, restructure planning, content prioritization
 */
export const EXTREME_VERTICAL_TO_LEADERBOARD: readonly ChatMessage[] = [
  {
    role: "user",
    content: JSON.stringify({
      frame: {
        id: "ex11",
        name: "Kanban Promo Vertical",
        size: { width: 600, height: 900 },
        childCount: 4,
        nodes: [
          {
            id: "logo",
            name: "Logo",
            type: "FRAME",
            rel: { x: 20, y: 20, width: 80, height: 80 },
            fillType: "IMAGE"
          },
          {
            id: "title",
            name: "Title",
            type: "TEXT",
            rel: { x: 20, y: 120, width: 560, height: 80 },
            text: "the kanban you'll absolutely love",
            fontSize: 48,
            fontWeight: "Bold"
          },
          {
            id: "subtitle",
            name: "Subtitle",
            type: "TEXT",
            rel: { x: 20, y: 210, width: 560, height: 40 },
            text: "Organize your work beautifully",
            fontSize: 24,
            fontWeight: "Regular"
          },
          {
            id: "screenshot",
            name: "App Screenshot",
            type: "RECTANGLE",
            rel: { x: 20, y: 270, width: 560, height: 610 },
            fillType: "IMAGE"
          }
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
          { nodeId: "title", role: "heading", confidence: 0.98 },
          { nodeId: "subtitle", role: "heading", confidence: 0.92 },
          { nodeId: "screenshot", role: "hero", confidence: 0.94 }
        ],
        focalPoints: [
          { nodeId: "title", x: 0.5, y: 0.17, confidence: 0.9 }
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
              contentPriority: ["logo", "title", "subtitle", "screenshot"],
              drop: ["screenshot", "subtitle"],
              keepRequired: ["logo", "title"],
              arrangement: "horizontal",
              textTreatment: "single-line"
            },
            positioning: {
              "logo": { region: "left", size: "fixed" },
              "title": { region: "fill", maxLines: 1 }
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
              "logo": { region: "left", size: "fixed" },
              "title": { region: "center", size: "fill" },
              "subtitle": { region: "center", size: "fill" }
            }
          }
        ]
      }
    })
  }
];

/**
 * Example 4: Dashboard Preview - Complex UI to Thumbnail
 *
 * Shows how a complex dashboard with many similar elements
 * must be simplified for thumbnail format. Demonstrates uncertainty
 * handling and preserve-layout fallback.
 *
 * Key Learning: Uncertain role handling, preserve-layout pattern, aspect mismatch warnings
 */
export const DASHBOARD_THUMBNAIL_EXAMPLE: readonly ChatMessage[] = [
  {
    role: "user",
    content: JSON.stringify({
      frame: {
        id: "ex4",
        name: "Dashboard Preview",
        size: { width: 1200, height: 800 },
        childCount: 12,
        nodes: [
          {
            id: "nav",
            name: "Navigation",
            type: "FRAME",
            rel: { x: 0, y: 0, width: 200, height: 800 },
            fillType: "SOLID",
            layoutMode: "VERTICAL"
          },
          {
            id: "header",
            name: "Header",
            type: "FRAME",
            rel: { x: 200, y: 0, width: 1000, height: 60 },
            fillType: "SOLID",
            layoutMode: "HORIZONTAL"
          },
          {
            id: "chart1",
            name: "Chart 1",
            type: "FRAME",
            rel: { x: 220, y: 80, width: 460, height: 300 },
            fillType: "SOLID"
          },
          {
            id: "chart2",
            name: "Chart 2",
            type: "FRAME",
            rel: { x: 700, y: 80, width: 460, height: 300 },
            fillType: "SOLID"
          },
          {
            id: "table",
            name: "Data Table",
            type: "FRAME",
            rel: { x: 220, y: 400, width: 940, height: 380 },
            fillType: "SOLID",
            layoutMode: "VERTICAL"
          }
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
          {
            code: "UNCERTAIN_ROLES",
            severity: "info",
            message: "Complex UI with many similar elements",
            confidence: 0.68
          },
          {
            code: "ASPECT_MISMATCH",
            severity: "warn",
            message: "Wide dashboard may lose detail in small thumbnail",
            confidence: 0.8
          }
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
  }
];

/**
 * All extreme transformation examples combined for export
 */
export const EXTREME_TRANSFORM_EXAMPLES: readonly ChatMessage[] = [
  ...EXTREME_VERTICAL_TO_LEADERBOARD,
  ...DASHBOARD_THUMBNAIL_EXAMPLE
];