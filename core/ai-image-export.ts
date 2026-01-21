/**
 * Image Export Utilities for AI Analysis
 *
 * Handles exporting Figma frames as base64-encoded images
 * suitable for vision model analysis.
 */

import { debugFixLog } from "./debug.js";
import { MAX_IMAGE_DIMENSION } from "./ai-system-prompt.js";

/**
 * Exports a frame as a base64-encoded PNG for vision analysis.
 * Constrains to MAX_IMAGE_DIMENSION to control token costs.
 */
export async function exportFrameAsBase64(frame: FrameNode): Promise<string> {
  const scale = Math.min(
    MAX_IMAGE_DIMENSION / frame.width,
    MAX_IMAGE_DIMENSION / frame.height,
    2 // Cap at 2x to avoid excessive file sizes
  );

  const startExport = Date.now();
  const bytes = await frame.exportAsync({
    format: "PNG",
    constraint: { type: "SCALE", value: scale }
  });
  debugFixLog(`EXPORT_ASYNC took ${Date.now() - startExport}ms`);

  // Convert Uint8Array to base64 (Figma sandbox doesn't have btoa)
  const startBase64 = Date.now();
  const result = uint8ArrayToBase64(bytes);
  debugFixLog(`BASE64_CONVERSION took ${Date.now() - startBase64}ms`);
  return result;
}

/**
 * Converts Uint8Array to base64 string without using btoa.
 * Works in Figma's sandboxed plugin environment.
 */
export function uint8ArrayToBase64(bytes: Uint8Array): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  const len = bytes.length;
  const result: string[] = [];

  for (let i = 0; i < len; i += 3) {
    const b1 = bytes[i];
    const b2 = i + 1 < len ? bytes[i + 1] : 0;
    const b3 = i + 2 < len ? bytes[i + 2] : 0;

    const c1 = chars[b1 >> 2];
    const c2 = chars[((b1 & 3) << 4) | (b2 >> 4)];
    const c3 = i + 1 < len ? chars[((b2 & 15) << 2) | (b3 >> 6)] : "=";
    const c4 = i + 2 < len ? chars[b3 & 63] : "=";

    result.push(c1 + c2 + c3 + c4);
  }

  return result.join("");
}

/**
 * Attempts to export a frame as base64, returning null on failure.
 * Used by AI request functions to gracefully handle export errors.
 */
export async function tryExportFrameAsBase64(frame: FrameNode): Promise<string | null> {
  try {
    const startExport = Date.now();
    const imageBase64 = await exportFrameAsBase64(frame);
    debugFixLog(`EXPORT_FRAME took ${Date.now() - startExport}ms`);
    debugFixLog("frame exported for vision analysis", {
      frameId: frame.id,
      imageSize: imageBase64.length
    });
    return imageBase64;
  } catch (error) {
    debugFixLog("frame export failed, continuing without image", {
      error: error instanceof Error ? error.message : String(error)
    });
    return null;
  }
}
