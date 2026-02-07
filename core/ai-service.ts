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

console.log("[ai-service] Module loaded, default key configured:", apiKey.length > 0);

/**
 * Set the OpenAI API key for subsequent calls.
 */
export function setApiKey(key: string): void {
  console.log("[ai-service] setApiKey called, key length:", key.length);
  apiKey = key;
}

/**
 * Check if an API key is configured.
 */
export function hasApiKey(): boolean {
  const has = apiKey.length > 0;
  console.log("[ai-service] hasApiKey:", has);
  return has;
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
  console.log("[ai-service] generateLayoutSpec called");
  console.log("[ai-service] Image base64 length:", imageBase64.length);
  console.log("[ai-service] Source dimensions:", sourceWidth, "x", sourceHeight);
  console.log("[ai-service] Node tree root:", nodeTree.name);

  if (!apiKey) {
    console.error("[ai-service] ERROR: No API key configured");
    throw new Error("OpenAI API key not configured");
  }

  const prompt = buildPrompt(nodeTree, sourceWidth, sourceHeight);
  console.log("[ai-service] Prompt built, length:", prompt.length);

  console.log("[ai-service] Sending request to OpenAI...");
  const startTime = Date.now();

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

  const elapsed = Date.now() - startTime;
  console.log("[ai-service] Response received in", elapsed, "ms, status:", response.status);

  if (!response.ok) {
    const error = await response.text();
    console.error("[ai-service] API error:", response.status, error);
    throw new Error(`OpenAI API error: ${response.status} - ${error}`);
  }

  const data = await response.json() as OpenAIResponse;
  const content = data.choices?.[0]?.message?.content;
  console.log("[ai-service] Response content length:", content?.length ?? 0);

  if (!content) {
    console.error("[ai-service] No content in response");
    throw new Error("No response content from OpenAI");
  }

  console.log("[ai-service] Raw AI response (first 500 chars):", content.substring(0, 500));

  const spec = parseLayoutSpec(content);
  console.log("[ai-service] Parsed layout spec successfully");
  console.log("[ai-service] Spec nodes count:", spec.nodes.length);
  console.log("[ai-service] Semantic groups count:", spec.semanticGroups?.length ?? 0);
  if (spec.semanticGroups && spec.semanticGroups.length > 0) {
    console.log("[ai-service] Semantic groups:", spec.semanticGroups.map(g => `${g.role}(${g.nodeIds.length} nodes, order:${g.order}, visible:${g.visible})`).join(", "));
  }
  console.log("[ai-service] Spec reasoning:", spec.reasoning);

  return spec;
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

## Semantic Grouping
Analyze the design and group related elements by their semantic purpose. Elements that belong together visually should be in the same group.

**Semantic Roles:**
- "hero": Main headline, tagline, primary message - place at top in safe zone
- "product": Device mockups, screenshots, main product imagery
- "features": Feature lists, benefits, bullet points with icons
- "cta": Call-to-action text, website URLs, buttons - position carefully (avoid bottom danger zone)
- "brand": Logo, brand marks - usually at top or bottom
- "metadata": Author info, dates, read times, secondary text - often hidden on mobile
- "decorative": Background shapes, accents, non-essential visuals - usually hidden

**Grouping Rules:**
1. Elements that belong together visually → same group (headline + subhead = one "hero" group)
2. An icon and its label → keep in same group (part of "features")
3. Multiple related buttons → one "cta" group
4. Order groups for TikTok: hero first (1-10), product/features middle (20-40), cta/brand at bottom (50-70)
5. Set visible: false for "decorative" and "metadata" groups when they clutter mobile view

## Padding & Spacing Guidelines
Calculate padding and gap dynamically based on source frame characteristics - DO NOT copy example values verbatim.

**Top Padding**: 160-200px minimum (must clear TikTok status bar at 154px)
**Bottom Padding**: 40-80px (avoid engagement UI overlap, but don't waste vertical space)
**Side Padding**: Scale proportionally from source - typically 24-48px for breathing room
**Gap Between Elements**: Based on source frame's visual density:
  - Dense content (many small elements): 16-24px for compact feel
  - Medium density (typical marketing): 24-32px balanced spacing
  - Sparse/hero-focused (large imagery): 32-48px for dramatic effect

Analyze the source frame's content type:
- Product showcases need breathing room (larger gaps)
- Text-heavy layouts need tighter spacing to fit content
- Hero-driven designs benefit from generous padding

## Output Format
Return ONLY valid JSON (no markdown, no explanation) with this exact structure:
{
  "semanticGroups": [
    {
      "groupId": "group-1",
      "role": "hero",
      "nodeIds": ["123:456", "123:457"],
      "order": 10,
      "visible": true
    },
    {
      "groupId": "group-2",
      "role": "product",
      "nodeIds": ["123:460"],
      "order": 20,
      "visible": true
    },
    {
      "groupId": "group-3",
      "role": "cta",
      "nodeIds": ["123:470", "123:471"],
      "order": 50,
      "visible": true,
      "layoutDirection": "HORIZONTAL"
    },
    {
      "groupId": "group-4",
      "role": "decorative",
      "nodeIds": ["123:480"],
      "order": 99,
      "visible": false
    }
  ],
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
    "padding": { "top": 180, "right": 40, "bottom": 60, "left": 40 },
    "gap": 28,
    "primaryAxisAlign": "MIN",
    "counterAxisAlign": "CENTER"
  },
  "reasoning": "Brief explanation of semantic grouping and layout decisions"
}

**semanticGroups**: Groups of related elements. Use group order values (10, 20, 30...) for positioning.
**nodes**: Individual node overrides for sizing/scale. The order field in nodes is now secondary to group ordering.

IMPORTANT: The values above are examples only. Calculate appropriate values based on the source frame.

## Sizing Modes
- FILL: Element expands to fill available space (use for full-width images, backgrounds)
- HUG: Element shrinks to fit content (use for text, buttons)
- FIXED: Element keeps its original size (rarely needed)

## Order Values
Lower order numbers appear first (top) in the vertical layout. Use order to prioritize content.

## Node Tree Properties
The node tree includes:
- layoutMode: For FRAME nodes - "NONE" (absolute), "HORIZONTAL", or "VERTICAL"
- isGroup: true for GROUP nodes (cannot have auto-layout, will be converted to frames)

## Nested Container Control (layoutDirection)
By default, all nested containers are converted to VERTICAL auto-layout for proper TikTok stacking.
Use layoutDirection to override this behavior:
- "VERTICAL": Convert to vertical auto-layout (default, omit to use)
- "HORIZONTAL": Convert to horizontal auto-layout (for icon rows, button groups)
- "NONE": Keep absolute positioning (for decorative overlays, floating badges, complex positioned elements)

Example with layoutDirection:
{
  "nodeId": "456:789",
  "nodeName": "Badge Container",
  "visible": true,
  "order": 0,
  "widthSizing": "HUG",
  "heightSizing": "HUG",
  "layoutDirection": "NONE"
}`;

/**
 * Build the user prompt with node tree and dimensions.
 */
function buildPrompt(nodeTree: NodeTreeItem, sourceWidth: number, sourceHeight: number): string {
  // Calculate content density hint based on node count
  const nodeCount = countNodes(nodeTree);
  const densityHint = nodeCount > 15 ? "dense" : nodeCount > 8 ? "medium" : "sparse";

  return `Transform this marketing frame for TikTok vertical format (1080×1920).

## Source Frame
- Dimensions: ${sourceWidth}×${sourceHeight}px
- Aspect ratio: ${(sourceWidth / sourceHeight).toFixed(2)}
- Element count: ${nodeCount} nodes (${densityHint} density)

## Spacing Analysis
Based on source frame characteristics, calculate appropriate padding and gap values:
- ${densityHint === "dense" ? "Dense content detected - use tighter gaps (16-24px) to fit more elements" : densityHint === "medium" ? "Medium density - balanced gaps (24-32px) work well" : "Sparse/hero layout - generous gaps (32-48px) create drama"}
- Source is ${sourceWidth > sourceHeight ? "landscape (wide)" : sourceWidth < sourceHeight ? "portrait (tall)" : "square"} - adjust side padding accordingly

## Node Tree
${JSON.stringify(nodeTree, null, 2)}

Analyze the visual composition and generate a layout specification that:
1. Prioritizes the most important visual elements
2. Keeps critical content in the TikTok safe zone (top 8% to bottom 35% is dangerous)
3. Uses vertical stacking for optimal mobile viewing
4. Hides elements that don't translate well to vertical format
5. Calculates appropriate padding and gap values for this specific content (don't use default values)

Return ONLY the JSON layout specification.`;
}

/**
 * Count total nodes in tree recursively.
 */
function countNodes(node: NodeTreeItem): number {
  let count = 1;
  if (node.children) {
    for (const child of node.children) {
      count += countNodes(child);
    }
  }
  return count;
}

/**
 * Parse the AI response into a LayoutSpec object.
 */
function parseLayoutSpec(content: string): LayoutSpec {
  console.log("[ai-service] parseLayoutSpec - input length:", content.length);

  // Try to extract JSON from the response (in case AI adds markdown)
  let jsonStr = content.trim();

  // Remove markdown code blocks if present
  if (jsonStr.startsWith("```")) {
    console.log("[ai-service] Detected markdown code block, stripping...");
    const lines = jsonStr.split("\n");
    lines.shift(); // Remove opening ```json or ```
    while (lines.length && !lines[lines.length - 1].startsWith("```")) {
      // Keep going
    }
    if (lines.length && lines[lines.length - 1].startsWith("```")) {
      lines.pop(); // Remove closing ```
    }
    jsonStr = lines.join("\n");
    console.log("[ai-service] After stripping markdown, length:", jsonStr.length);
  }

  try {
    const parsed = JSON.parse(jsonStr) as LayoutSpec;
    console.log("[ai-service] JSON parsed successfully");

    // Validate required fields
    if (!Array.isArray(parsed.nodes)) {
      console.error("[ai-service] Invalid spec: missing nodes array");
      throw new Error("Invalid layout spec: missing nodes array");
    }
    if (!parsed.rootLayout) {
      console.error("[ai-service] Invalid spec: missing rootLayout");
      throw new Error("Invalid layout spec: missing rootLayout");
    }

    // Log semantic groups info (optional field)
    if (parsed.semanticGroups && Array.isArray(parsed.semanticGroups)) {
      console.log("[ai-service] semanticGroups found:", parsed.semanticGroups.length);
      for (const group of parsed.semanticGroups) {
        console.log(`[ai-service]   Group ${group.groupId}: role=${group.role}, nodes=${group.nodeIds.length}, order=${group.order}, visible=${group.visible}`);
      }
    } else {
      console.log("[ai-service] No semanticGroups in response - will use nodes-only fallback");
    }

    console.log("[ai-service] Validation passed - nodes:", parsed.nodes.length);
    return parsed;
  } catch (error) {
    console.error("[ai-service] JSON parse error:", error);
    console.error("[ai-service] Failed JSON string (first 500 chars):", jsonStr.substring(0, 500));
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
