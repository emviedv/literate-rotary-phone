/**
 * Design Page Manager
 *
 * Manages the "AI Designs" page where TikTok variants are placed.
 * Keeps AI experiments separate from the regular variant generation output.
 */

import { debugFixLog } from "./debug.js";

declare const figma: PluginAPI;

// ============================================================================
// Constants
// ============================================================================

const AI_DESIGNS_PAGE_NAME = "AI Designs";
const CONTAINER_GAP = 80;
const CONTAINER_PADDING = 32;

// ============================================================================
// Page Management
// ============================================================================

/**
 * Ensures the "AI Designs" page exists, creating it if necessary.
 * Returns the page node for placing generated designs.
 */
export function ensureDesignPage(): PageNode {
  const existing = figma.root.children.find(
    (child): child is PageNode =>
      child.type === "PAGE" && child.name === AI_DESIGNS_PAGE_NAME
  );

  if (existing) {
    debugFixLog("AI Designs page found", { pageId: existing.id });
    return existing;
  }

  const page = figma.createPage();
  page.name = AI_DESIGNS_PAGE_NAME;
  figma.root.appendChild(page);

  debugFixLog("AI Designs page created", { pageId: page.id });
  return page;
}

// ============================================================================
// Container Management
// ============================================================================

/**
 * Creates a container frame for a TikTok design variant.
 * Uses naming convention: "TikTok • {Source Name} • {Timestamp}"
 */
export function createDesignContainer(
  page: PageNode,
  sourceName: string
): FrameNode {
  // Switch to the AI Designs page
  figma.currentPage = page;

  const timestamp = formatTimestamp(new Date());
  const containerName = `TikTok • ${sourceName} • ${timestamp}`;

  const container = figma.createFrame();
  container.name = containerName;
  container.cornerRadius = 16;
  container.layoutMode = "NONE";
  container.fills = [
    {
      type: "SOLID",
      color: { r: 0.12, g: 0.12, b: 0.14 } // Dark background for TikTok aesthetic
    }
  ];
  container.strokes = [
    {
      type: "SOLID",
      color: { r: 0.25, g: 0.25, b: 0.3 }
    }
  ];
  container.strokeWeight = 1;
  container.paddingLeft = CONTAINER_PADDING;
  container.paddingRight = CONTAINER_PADDING;
  container.paddingTop = CONTAINER_PADDING;
  container.paddingBottom = CONTAINER_PADDING;
  container.clipsContent = false;

  page.appendChild(container);

  // Position below existing content
  const bottom = page.children.reduce<number>((accumulator, child) => {
    if (child === container) {
      return accumulator;
    }
    return Math.max(accumulator, child.y + child.height);
  }, 0);

  container.x = 0;
  container.y = bottom + CONTAINER_GAP;
  container.resizeWithoutConstraints(1144, 2000); // Enough for 1080x1920 + padding

  debugFixLog("Design container created", {
    containerId: container.id,
    containerName,
    position: { x: container.x, y: container.y }
  });

  return container;
}

/**
 * Adds a label to the container showing generation metadata.
 * Uses the provided font from the source frame if available.
 */
export async function addContainerLabel(
  container: FrameNode,
  sourceName: string,
  confidence?: number,
  sourceFont?: FontName
): Promise<TextNode> {
  const label = figma.createText();
  label.name = "Generation Label";

  // Use the source frame's font if provided, otherwise use the label's default
  const fontToUse = sourceFont ?? (label.fontName as FontName);

  try {
    await figma.loadFontAsync(fontToUse);
    label.fontName = fontToUse;
  } catch {
    debugFixLog("Could not load font for label", { font: fontToUse });
  }

  const confidenceText = confidence !== undefined
    ? ` • ${Math.round(confidence * 100)}% confidence`
    : "";

  label.characters = `AI-generated TikTok variant from "${sourceName}"${confidenceText}`;
  label.fontSize = 12;
  label.fills = [{ type: "SOLID", color: { r: 0.6, g: 0.6, b: 0.65 } }];

  container.appendChild(label);
  label.x = CONTAINER_PADDING;
  label.y = CONTAINER_PADDING / 2 - 6;

  return label;
}

/**
 * Sizes the container to fit the variant with appropriate padding.
 */
export function sizeContainerToFit(
  container: FrameNode,
  variant: FrameNode
): void {
  const width = variant.width + CONTAINER_PADDING * 2;
  const height = variant.height + CONTAINER_PADDING * 2 + 24; // Extra for label

  container.resizeWithoutConstraints(width, height);

  debugFixLog("Container resized to fit variant", {
    containerId: container.id,
    variantSize: { width: variant.width, height: variant.height },
    containerSize: { width, height }
  });
}

// ============================================================================
// Navigation
// ============================================================================

/**
 * Navigates the Figma viewport to show the generated design.
 */
export function navigateToDesign(page: PageNode, variant: FrameNode): void {
  figma.currentPage = page;
  figma.viewport.scrollAndZoomIntoView([variant]);

  debugFixLog("Viewport navigated to design", {
    pageId: page.id,
    variantId: variant.id
  });
}

/**
 * Positions the variant within its container.
 */
export function positionVariantInContainer(
  container: FrameNode,
  variant: FrameNode
): void {
  variant.x = CONTAINER_PADDING;
  variant.y = CONTAINER_PADDING + 24; // Below label

  debugFixLog("Variant positioned in container", {
    variantId: variant.id,
    position: { x: variant.x, y: variant.y }
  });
}

// ============================================================================
// Cleanup
// ============================================================================

/**
 * Removes a failed design attempt (container and contents).
 */
export function removeDesignContainer(container: FrameNode): void {
  try {
    if (!container.removed) {
      const containerId = container.id;
      container.remove();
      debugFixLog("Design container removed", { containerId });
    }
  } catch (error) {
    debugFixLog("Failed to remove design container", {
      error: error instanceof Error ? error.message : String(error)
    });
  }
}

// ============================================================================
// Utilities
// ============================================================================

/**
 * Formats a timestamp for display in container names.
 */
function formatTimestamp(date: Date): string {
  return `${date.toLocaleDateString()} · ${date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit"
  })}`;
}
