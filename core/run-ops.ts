import { computeVariantLayout } from "./layout-positions.js";
import { debugFixLog } from "./debug.js";
import { RUN_ID_KEY, STAGING_PAGE_NAME } from "./plugin-constants.js";

const RUN_GAP = 160;
const RUN_MARGIN = 48;
const MAX_ROW_WIDTH = 3200;

declare const figma: PluginAPI;

export function ensureStagingPage(): PageNode {
  const existing = figma.root.children.find(
    (child): child is PageNode => child.type === "PAGE" && child.name === STAGING_PAGE_NAME
  );

  if (existing) {
    return existing;
  }

  const page = figma.createPage();
  page.name = STAGING_PAGE_NAME;
  figma.root.appendChild(page);
  return page;
}

export function createRunContainer(page: PageNode, runId: string, sourceName: string): FrameNode {
  figma.currentPage = page;

  const container = figma.createFrame();
  container.name = `Run ${formatTimestamp(new Date())} · ${sourceName}`;
  container.cornerRadius = 24;
  container.layoutMode = "NONE";
  container.fills = [
    {
      type: "SOLID",
      color: { r: 0.97, g: 0.98, b: 1 }
    }
  ];
  container.strokes = [
    {
      type: "SOLID",
      color: { r: 0.62, g: 0.68, b: 0.87 }
    }
  ];
  container.strokeWeight = 2;
  container.paddingLeft = RUN_MARGIN;
  container.paddingRight = RUN_MARGIN;
  container.paddingTop = RUN_MARGIN;
  container.paddingBottom = RUN_MARGIN;
  container.itemSpacing = RUN_GAP;
  container.clipsContent = false;
  container.setPluginData(RUN_ID_KEY, runId);

  page.appendChild(container);

  const bottom = page.children.reduce<number>((accumulator, child) => {
    if (child === container) {
      return accumulator;
    }
    return Math.max(accumulator, child.y + child.height);
  }, 0);

  container.x = 0;
  container.y = bottom + RUN_GAP;
  container.resizeWithoutConstraints(800, 800);

  return container;
}

export async function lockOverlays(overlays: readonly FrameNode[]): Promise<void> {
  if (overlays.length === 0) {
    return;
  }

  const flushAsync = (figma as { flushAsync?: (() => Promise<void>) | undefined }).flushAsync;
  if (typeof flushAsync === "function") {
    try {
      await flushAsync.call(figma);
      debugFixLog("flush completed before locking overlays", { overlayCount: overlays.length });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      debugFixLog("flush failed before locking overlays", {
        overlayCount: overlays.length,
        errorMessage: message
      });
    }
  }

  for (const overlay of overlays) {
    overlay.locked = true;
    debugFixLog("qa overlay locked", {
      overlayId: overlay.id
    });
  }
}

export function layoutVariants(container: FrameNode, variants: readonly FrameNode[]): void {
  if (variants.length === 0) {
    return;
  }

  const sizes = variants.map((variant) => ({ width: variant.width, height: variant.height }));
  const layout = computeVariantLayout(sizes, { margin: RUN_MARGIN, gap: RUN_GAP, maxRowWidth: MAX_ROW_WIDTH });

  layout.positions.forEach((position, index) => {
    const variant = variants[index];
    variant.x = position.x;
    variant.y = position.y;
  });

  const containerWidth = Math.max(container.width, layout.bounds.width);
  const containerHeight = Math.max(container.height, layout.bounds.height);
  container.resizeWithoutConstraints(containerWidth, containerHeight);

  debugFixLog("variants positioned within container", {
    containerWidth,
    containerHeight,
    variantCount: variants.length
  });
}

/**
 * Re-parents generated variant frames onto the staging page so each target sits
 * in its own top-level frame, then removes the temporary container shell.
 */
export function promoteVariantsToPage(page: PageNode, container: FrameNode, variants: readonly FrameNode[]): void {
  const parent = container.parent;
  if (!parent || parent.type !== "PAGE") {
    debugFixLog("skipped promotion because container parent is not a page", {
      parentType: parent?.type ?? "none"
    });
    return;
  }

  const baseX = container.x;
  const baseY = container.y;

  for (const variant of variants) {
    const absoluteX = baseX + variant.x;
    const absoluteY = baseY + variant.y;
    page.appendChild(variant);
    variant.x = absoluteX;
    variant.y = absoluteY;
  }

  container.remove();

  debugFixLog("variants promoted to top-level frames", {
    baseX,
    baseY,
    variantCount: variants.length
  });
}

export function exposeRun(page: PageNode, variants: readonly FrameNode[]): void {
  if (variants.length === 0) {
    return;
  }
  figma.currentPage = page;
  figma.viewport.scrollAndZoomIntoView([...variants]);
}

function formatTimestamp(date: Date): string {
  return `${date.toLocaleDateString()} · ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
}
