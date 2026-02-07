/**
 * Image Export Module
 *
 * Handles exporting frames to base64 PNG for AI vision analysis.
 */

console.log("[image-export] Module loaded");

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
  console.log("[image-export] exportFrameAsBase64 called");
  console.log("[image-export] Frame:", frame.name, "dimensions:", frame.width, "x", frame.height);
  console.log("[image-export] Max dimension:", maxDimension);

  // Calculate scale to fit within maxDimension
  const scale = Math.min(maxDimension / frame.width, maxDimension / frame.height, 2);
  console.log("[image-export] Calculated scale:", scale);

  // Export as PNG bytes
  console.log("[image-export] Exporting PNG...");
  const startTime = Date.now();
  const bytes = await frame.exportAsync({
    format: "PNG",
    constraint: { type: "SCALE", value: scale },
  });
  const elapsed = Date.now() - startTime;
  console.log("[image-export] Export complete in", elapsed, "ms, bytes:", bytes.length);

  // Convert to base64
  console.log("[image-export] Converting to base64...");
  const base64 = uint8ArrayToBase64(bytes);
  console.log("[image-export] Base64 length:", base64.length);

  return base64;
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
