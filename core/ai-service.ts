/**
 * AI Service Module
 *
 * Single OpenAI call that takes frame image + node tree and returns
 * a complete layout specification for TikTok format.
 */

import type { LayoutSpec, NodeTreeItem } from "../types/layout-spec";

// Default API key injected at build time (can be overridden by user)
declare const __SCALERESIZER_DEFAULT_AI_KEY__: string;

let apiKey: string = typeof __SCALERESIZER_DEFAULT_AI_KEY__ !== "undefined"
  ? __SCALERESIZER_DEFAULT_AI_KEY__
  : "";

/**
 * Set the OpenAI API key for subsequent calls.
 */
export function setApiKey(key: string): void {
  apiKey = key;
}

/**
 * Check if an API key is configured.
 */
export function hasApiKey(): boolean {
  return apiKey.length > 0;
}

/**
 * Generate a layout specification for transforming a frame to TikTok format.
 *
 * @param imageBase64 - Base64-encoded PNG of the source frame
 * @param nodeTree - Simplified node tree of the frame
 * @param sourceWidth - Original frame width
 * @param sourceHeight - Original frame height
 * @returns Layout specification for TikTok format
 */
export async function generateLayoutSpec(
  imageBase64: string,
  nodeTree: NodeTreeItem,
  sourceWidth: number,
  sourceHeight: number
): Promise<LayoutSpec> {
  if (!apiKey) {
    throw new Error("OpenAI API key not configured");
  }

  const prompt = buildPrompt(nodeTree, sourceWidth, sourceHeight);

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: SYSTEM_PROMPT,
        },
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: {
                url: `data:image/png;base64,${imageBase64}`,
                detail: "high",
              },
            },
            {
              type: "text",
              text: prompt,
            },
          ],
        },
      ],
      max_tokens: 4096,
      temperature: 0.3,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error: ${response.status} - ${error}`);
  }

  const data = await response.json() as OpenAIResponse;
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("No response content from OpenAI");
  }

  return parseLayoutSpec(content);
}

/**
 * System prompt that defines the AI's role and output format.
 */
const SYSTEM_PROMPT = `You are a professional marketing designer transforming designs for TikTok vertical format (1080×1920).

Your task is to analyze the provided marketing frame and output a JSON layout specification that rearranges its elements for optimal TikTok display.

## TikTok Safe Areas
- TOP 8% (0-154px): Danger zone - overlapped by status bar and TikTok UI
- BOTTOM 35% (1248-1920px): Danger zone - overlapped by buttons, captions, engagement UI
- SAFE ZONE: 154-1248px (the middle ~60% of the screen)

## Key Principles
1. Place primary content (hero images, main message) in the safe zone
2. Move CTAs and important text away from bottom danger zone
3. Stack elements vertically - TikTok users scroll, not scan horizontally
4. Hide elements that don't work in vertical format (wide banners, horizontal galleries)
5. Prioritize visual hierarchy: hero first, supporting content second, CTAs in safe areas

## Output Format
Return ONLY valid JSON (no markdown, no explanation) with this exact structure:
{
  "nodes": [
    {
      "nodeId": "123:456",
      "nodeName": "Hero Image",
      "visible": true,
      "order": 0,
      "widthSizing": "FILL",
      "heightSizing": "HUG"
    }
  ],
  "rootLayout": {
    "direction": "VERTICAL",
    "padding": { "top": 160, "right": 32, "bottom": 40, "left": 32 },
    "gap": 24,
    "primaryAxisAlign": "MIN",
    "counterAxisAlign": "CENTER"
  },
  "reasoning": "Brief explanation of layout decisions"
}

## Sizing Modes
- FILL: Element expands to fill available space (use for full-width images, backgrounds)
- HUG: Element shrinks to fit content (use for text, buttons)
- FIXED: Element keeps its original size (rarely needed)

## Order Values
Lower order numbers appear first (top) in the vertical layout. Use order to prioritize content.`;

/**
 * Build the user prompt with node tree and dimensions.
 */
function buildPrompt(nodeTree: NodeTreeItem, sourceWidth: number, sourceHeight: number): string {
  return `Transform this marketing frame for TikTok vertical format (1080×1920).

## Source Frame
- Dimensions: ${sourceWidth}×${sourceHeight}px
- Aspect ratio: ${(sourceWidth / sourceHeight).toFixed(2)}

## Node Tree
${JSON.stringify(nodeTree, null, 2)}

Analyze the visual composition and generate a layout specification that:
1. Prioritizes the most important visual elements
2. Keeps critical content in the TikTok safe zone (top 8% to bottom 35% is dangerous)
3. Uses vertical stacking for optimal mobile viewing
4. Hides elements that don't translate well to vertical format

Return ONLY the JSON layout specification.`;
}

/**
 * Parse the AI response into a LayoutSpec object.
 */
function parseLayoutSpec(content: string): LayoutSpec {
  // Try to extract JSON from the response (in case AI adds markdown)
  let jsonStr = content.trim();

  // Remove markdown code blocks if present
  if (jsonStr.startsWith("```")) {
    const lines = jsonStr.split("\n");
    lines.shift(); // Remove opening ```json or ```
    while (lines.length && !lines[lines.length - 1].startsWith("```")) {
      // Keep going
    }
    if (lines.length && lines[lines.length - 1].startsWith("```")) {
      lines.pop(); // Remove closing ```
    }
    jsonStr = lines.join("\n");
  }

  try {
    const parsed = JSON.parse(jsonStr) as LayoutSpec;

    // Validate required fields
    if (!Array.isArray(parsed.nodes)) {
      throw new Error("Invalid layout spec: missing nodes array");
    }
    if (!parsed.rootLayout) {
      throw new Error("Invalid layout spec: missing rootLayout");
    }

    return parsed;
  } catch (error) {
    throw new Error(`Failed to parse layout spec: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * OpenAI API response types (simplified)
 */
interface OpenAIResponse {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
}
