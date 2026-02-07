/**
 * Image Export Module
 *
 * Handles exporting frames to base64 PNG for AI vision analysis.
 */

/**
 * Export a frame as a base64-encoded PNG string.
 * The image is scaled to fit within maxDimension while preserving aspect ratio.
 *
 * @param frame - The frame to export
 * @param maxDimension - Maximum width or height in pixels (default: 1024)
 * @returns Base64-encoded PNG data (without data URL prefix)
 */
export async function exportFrameAsBase64(
  frame: FrameNode,
  maxDimension: number = 1024
): Promise<string> {
  // Calculate scale to fit within maxDimension
  const scale = Math.min(maxDimension / frame.width, maxDimension / frame.height, 2);

  // Export as PNG bytes
  const bytes = await frame.exportAsync({
    format: "PNG",
    constraint: { type: "SCALE", value: scale },
  });

  // Convert to base64
  return uint8ArrayToBase64(bytes);
}

/**
 * Convert a Uint8Array to a base64 string.
 * Works in Figma's plugin environment which lacks btoa().
 */
function uint8ArrayToBase64(bytes: Uint8Array): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  let result = "";
  const len = bytes.length;

  for (let i = 0; i < len; i += 3) {
    const a = bytes[i];
    const b = i + 1 < len ? bytes[i + 1] : 0;
    const c = i + 2 < len ? bytes[i + 2] : 0;

    result += chars[a >> 2];
    result += chars[((a & 3) << 4) | (b >> 4)];
    result += i + 1 < len ? chars[((b & 15) << 2) | (c >> 6)] : "=";
    result += i + 2 < len ? chars[c & 63] : "=";
  }

  return result;
}
