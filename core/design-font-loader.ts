/**
 * Design Font Loader Module
 *
 * Handles loading fonts for text nodes during design transformation.
 * Uses a cache to avoid loading the same font multiple times.
 */

import { debugFixLog, debugPerformanceLog } from "./debug.js";
import { startTimer, endTimer } from "./performance.js";

declare const figma: PluginAPI;

// ============================================================================
// Font Loading
// ============================================================================

/**
 * Enhanced result for font loading with timing information.
 */
export interface FontLoadingResult {
  /** Number of text nodes discovered */
  readonly textNodesFound: number;
  /** Number of unique fonts discovered */
  readonly fontsDiscovered: number;
  /** Number of fonts loaded (not cached) */
  readonly fontsLoaded: number;
  /** Number of fonts served from cache */
  readonly fontsCached: number;
  /** Number of font loading errors */
  readonly errors: number;
  /** Performance timing breakdown */
  readonly timing: {
    readonly total: number;
    readonly discovery: number;
    readonly loading: number;
  };
}

/**
 * Loads all fonts used in a frame tree with detailed performance tracking.
 * Uses a cache to avoid loading the same font multiple times across calls.
 *
 * @param frame - The frame containing text nodes
 * @param cache - Set of already-loaded font keys (family__style format)
 * @returns Promise<FontLoadingResult> - Detailed results including timing
 */
export async function loadFontsForFrameWithTiming(
  frame: FrameNode,
  cache: Set<string>
): Promise<FontLoadingResult> {
  const startTime = Date.now();

  // Initialize counters
  let textNodesFound = 0;
  let fontsDiscovered = 0;
  let fontsLoaded = 0;
  let fontsCached = 0;
  let errors = 0;

  // Track unique fonts found
  const discoveredFonts = new Set<string>();
  const initialCacheSize = cache.size;

  // Start overall timing
  startTimer("font-loading-total", {
    frameId: frame.id,
    frameName: frame.name,
    initialCacheSize: cache.size
  });

  // Start font discovery timing
  startTimer("font-discovery", {
    frameId: frame.id
  });

  const queue: SceneNode[] = [...frame.children];
  const fontPromises: Array<{ key: string; font: FontName; nodeId: string }> = [];

  // Discovery phase: traverse tree and collect fonts
  while (queue.length > 0) {
    const node = queue.shift()!;

    if (node.type === "TEXT") {
      textNodesFound++;
      const textNode = node as TextNode;

      try {
        const fonts = await textNode.getRangeAllFontNames(0, textNode.characters.length);

        for (const font of fonts) {
          const key = `${font.family}__${font.style}`;
          discoveredFonts.add(key);

          if (!cache.has(key)) {
            fontPromises.push({ key, font, nodeId: node.id });
          } else {
            fontsCached++;
          }
        }
      } catch (error) {
        errors++;
        debugFixLog("Failed to get fonts for text node", {
          nodeId: node.id,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    if ("children" in node) {
      queue.push(...node.children);
    }
  }

  fontsDiscovered = discoveredFonts.size;

  const discoveryMeasurement = endTimer("font-discovery", {
    textNodesFound,
    fontsDiscovered,
    fontsCached,
    fontsToLoad: fontPromises.length
  });

  // Loading phase: load uncached fonts
  let loadingDuration = 0;
  if (fontPromises.length > 0) {
    startTimer("font-loading", {
      fontsToLoad: fontPromises.length,
      cacheHitRate: Math.round((fontsCached / (fontsCached + fontPromises.length)) * 100)
    });

    // Load fonts sequentially to avoid overwhelming the API
    for (const { key, font, nodeId } of fontPromises) {
      try {
        startTimer(`font-load-${key}`, {
          family: font.family,
          style: font.style,
          nodeId
        });

        await figma.loadFontAsync(font);
        cache.add(key);
        fontsLoaded++;

        const individualMeasurement = endTimer(`font-load-${key}`, {
          success: true
        });

        // Log slow font loads
        if (individualMeasurement && individualMeasurement.durationMs > 1000) {
          debugPerformanceLog("slow-font-load", {
            durationMs: individualMeasurement.durationMs,
            family: font.family,
            style: font.style,
            nodeId
          });
        }
      } catch (error) {
        errors++;
        endTimer(`font-load-${key}`, { success: false });

        debugFixLog("Failed to load font", {
          font: `${font.family} ${font.style}`,
          nodeId,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    const loadingMeasurement = endTimer("font-loading", {
      fontsLoaded,
      errors,
      successRate: Math.round((fontsLoaded / fontPromises.length) * 100)
    });
    loadingDuration = loadingMeasurement?.durationMs ?? 0;
  }

  const totalMeasurement = endTimer("font-loading-total", {
    textNodesFound,
    fontsDiscovered,
    fontsLoaded,
    fontsCached,
    errors,
    finalCacheSize: cache.size
  });

  const result: FontLoadingResult = {
    textNodesFound,
    fontsDiscovered,
    fontsLoaded,
    fontsCached,
    errors,
    timing: {
      total: totalMeasurement?.durationMs ?? 0,
      discovery: discoveryMeasurement?.durationMs ?? 0,
      loading: loadingDuration
    }
  };

  debugFixLog("Font loading complete", {
    frameId: frame.id,
    frameName: frame.name,
    ...result,
    cacheGrowth: cache.size - initialCacheSize,
    cacheHitRate: fontsDiscovered > 0 ? Math.round((fontsCached / fontsDiscovered) * 100) : 100
  });

  // Log performance details
  debugPerformanceLog("font-loading-complete", {
    durationMs: Date.now() - startTime,
    textNodesFound,
    fontsDiscovered,
    fontsLoaded,
    fontsCached,
    errors,
    cacheHitRate: fontsDiscovered > 0 ? Math.round((fontsCached / fontsDiscovered) * 100) : 100,
    avgLoadTime: fontsLoaded > 0 ? Math.round(loadingDuration / fontsLoaded) : 0
  });

  return result;
}

/**
 * Legacy compatibility function - loads fonts without returning timing details.
 * Uses a cache to avoid loading the same font multiple times across calls.
 *
 * @param frame - The frame containing text nodes
 * @param cache - Set of already-loaded font keys (family__style format)
 */
export async function loadFontsForFrame(frame: FrameNode, cache: Set<string>): Promise<void> {
  // Use the enhanced version but discard the result
  await loadFontsForFrameWithTiming(frame, cache);
}

// ============================================================================
// Font Analysis Utilities
// ============================================================================

/**
 * Analyzes font usage in a frame without loading them.
 * Useful for understanding font requirements before loading.
 */
export async function analyzeFontUsage(frame: FrameNode): Promise<{
  readonly textNodesFound: number;
  readonly uniqueFonts: readonly string[];
  readonly fontsByFamily: Record<string, readonly string[]>;
  readonly errors: number;
}> {
  startTimer("font-analysis", {
    frameId: frame.id,
    frameName: frame.name
  });

  let textNodesFound = 0;
  let errors = 0;
  const discoveredFonts = new Set<string>();
  const fontsByFamily: Record<string, Set<string>> = {};

  const queue: SceneNode[] = [...frame.children];

  while (queue.length > 0) {
    const node = queue.shift()!;

    if (node.type === "TEXT") {
      textNodesFound++;
      const textNode = node as TextNode;

      try {
        const fonts = await textNode.getRangeAllFontNames(0, textNode.characters.length);

        for (const font of fonts) {
          const key = `${font.family}__${font.style}`;
          discoveredFonts.add(key);

          if (!fontsByFamily[font.family]) {
            fontsByFamily[font.family] = new Set();
          }
          fontsByFamily[font.family].add(font.style);
        }
      } catch (error) {
        errors++;
        debugFixLog("Failed to analyze font for text node", {
          nodeId: node.id,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    if ("children" in node) {
      queue.push(...node.children);
    }
  }

  const analysisMeasurement = endTimer("font-analysis", {
    textNodesFound,
    uniqueFonts: discoveredFonts.size,
    fontFamilies: Object.keys(fontsByFamily).length,
    errors
  });

  // Convert Sets to arrays for return value
  const fontsByFamilyResult: Record<string, readonly string[]> = {};
  for (const [family, styles] of Object.entries(fontsByFamily)) {
    fontsByFamilyResult[family] = Array.from(styles).sort();
  }

  const result = {
    textNodesFound,
    uniqueFonts: Array.from(discoveredFonts).sort(),
    fontsByFamily: fontsByFamilyResult,
    errors
  };

  debugFixLog("Font analysis complete", {
    frameId: frame.id,
    ...result,
    analysisTime: analysisMeasurement?.durationMs
  });

  if (analysisMeasurement) {
    debugPerformanceLog("font-analysis", {
      durationMs: analysisMeasurement.durationMs,
      textNodesFound,
      uniqueFonts: discoveredFonts.size,
      fontFamilies: Object.keys(fontsByFamily).length,
      errors,
      avgFontsPerNode: textNodesFound > 0 ? Math.round((discoveredFonts.size / textNodesFound) * 100) / 100 : 0
    });
  }

  return result;
}

/**
 * Gets statistics about a font cache.
 */
export function getFontCacheStatistics(cache: Set<string>): {
  readonly totalFonts: number;
  readonly fontFamilies: readonly string[];
  readonly mostUsedFamily: string | null;
  readonly cacheKeys: readonly string[];
} {
  const familyCounts: Record<string, number> = {};
  const cacheKeys = Array.from(cache);

  for (const key of cacheKeys) {
    const [family] = key.split("__");
    familyCounts[family] = (familyCounts[family] ?? 0) + 1;
  }

  const families = Object.keys(familyCounts).sort();
  const mostUsedFamily = families.length > 0
    ? Object.entries(familyCounts).reduce((max, [family, count]) =>
        count > (familyCounts[max] ?? 0) ? family : max, families[0])
    : null;

  return {
    totalFonts: cache.size,
    fontFamilies: families,
    mostUsedFamily,
    cacheKeys: cacheKeys.sort()
  };
}
