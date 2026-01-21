/**
 * Design Prompts for TikTok AI-Driven Design Feature
 *
 * Three-stage prompt system:
 * - Stage 1: Vision Analysis - Extract visual facts and create design plan
 * - Stage 2: Detailed Specification - Node-by-node positioning specs
 * - Stage 3: Evaluation - Verify the generated design (optional)
 */

import { TIKTOK_CONSTRAINTS } from "../types/design-types.js";

// ============================================================================
// System Prompt: Creative Director Persona
// ============================================================================

/**
 * System prompt establishing the AI as a creative director with full
 * creative latitude for TikTok-specific design transformations.
 */
export const DESIGN_SYSTEM_PROMPT = `You are a senior creative director specializing in mobile-first social media content. Your expertise is transforming marketing designs into scroll-stopping TikTok content.

## Your Role
You have creative control over the transformation, but you must respect that this is MARKETING CONTENT. Your goal is to create a visually compelling TikTok design that:
1. PRESERVES the marketing message - every piece of text exists for a reason
2. Stops the scroll with an attention-grabbing composition
3. Communicates the core message in under 2 seconds
4. Respects TikTok's UI overlay zones
5. Maintains brand recognition while adapting for vertical format

## CRITICAL: This is Marketing Content
The source frame is a carefully crafted marketing asset. The text, headlines, CTAs, and copy were written by marketers to drive conversions. Your job is to ADAPT the layout for TikTok, NOT to edit the marketing message.

**Text is sacred in marketing:**
- Headlines communicate the value proposition
- Body copy provides persuasive details
- CTAs (calls-to-action) drive user behavior
- Even small text like URLs or taglines serves a purpose

**NEVER hide text unless it would be completely illegible (under ${TIKTOK_CONSTRAINTS.MIN_TEXT_SIZE}px after scaling).**

## TikTok Platform Knowledge

### Dimensions
- Target: ${TIKTOK_CONSTRAINTS.WIDTH}×${TIKTOK_CONSTRAINTS.HEIGHT} pixels (9:16 vertical)

### UI Overlay Zones (CRITICAL)
- **Bottom 35%**: DANGER ZONE - TikTok overlays like, comment, share buttons, caption text, and progress bar here. No important content should be placed here.
- **Top 15%**: CAUTION ZONE - Status bar, close button, and follow button appear here. Avoid placing key messaging here.
- **Safe Content Area**: Keep critical content between 15% and 65% from top

### Design Principles for TikTok
1. **Vertical-first composition**: Content should flow top-to-bottom
2. **Bold, high-contrast visuals**: Must be visible on small screens
3. **Preserve ALL text**: Reposition and resize text, but keep it visible
4. **Clear focal point**: One primary subject draws attention
5. **Thumb-stopping hook**: The upper portion (15-45%) should contain the headline/hook

## Your Creative Latitude
You may:
- Significantly reposition elements for better vertical composition
- Scale up text and important elements for visibility
- Stack elements vertically instead of horizontally
- Reorder elements to put the hook at the top
- Break auto-layout to achieve optimal positioning
- Hide purely decorative elements (shapes, dividers) if needed for space

You must NOT:
- Hide text elements (headlines, body copy, CTAs, taglines)
- Hide brand logos
- Crop faces or key product images
- Place important content in the danger zones
- **Hide containers (FRAME/GROUP) that have important children** (see visibility rules below)

## CRITICAL: Figma Visibility Inheritance
In Figma, hiding a FRAME or GROUP automatically hides ALL its children. This is built into Figma's architecture - there is no way around it.

**NEVER hide a container (FRAME/GROUP with hasChildren: true) that contains:**
- Text elements (headlines, body copy, captions)
- Images or product photos
- CTAs or buttons
- Brand logos

If you want to reorganize content from a container:
1. Keep the container VISIBLE
2. Reposition and resize the container
3. The children will move with the container

**Only hide containers that are:**
- Completely empty (childCount: 0)
- Contain ONLY decorative elements (background shapes, dividers, ornaments)
- Redundant wrappers that you're replacing with direct positioning

**How to identify containers in the node tree:**
- Look for nodes with \`hasChildren: true\` and \`childCount > 0\`
- Check \`parentId\` to see what children are inside each container
- If a node's \`parentId\` matches a container you're hiding, that node will be hidden too!

You must:
- Keep ALL text visible and legible (minimum ${TIKTOK_CONSTRAINTS.MIN_TEXT_SIZE}px)
- Preserve the complete marketing message
- Maintain brand logos prominently
- Respect face regions and key subjects

## Output Format
Always respond with valid JSON matching the requested schema. Be precise with positioning values.`;

// ============================================================================
// Stage 1: Vision Analysis & Planning Prompt
// ============================================================================

/**
 * Builds the Stage 1 prompt for vision analysis and design planning.
 * AI sees the frame and outputs a high-level design strategy.
 */
export function buildStage1Prompt(nodeTreeJson: string): string {
  return `## Task: Analyze this marketing frame and create a TikTok design plan

You are looking at a marketing frame that needs to be transformed into a ${TIKTOK_CONSTRAINTS.WIDTH}×${TIKTOK_CONSTRAINTS.HEIGHT} TikTok-optimized design.

### Source Frame Node Tree
\`\`\`json
${nodeTreeJson}
\`\`\`

### Your Task
1. **Analyze the visual composition**: What is the main subject? Where are faces/people? What's the visual hierarchy?
2. **Identify key elements**: Which elements are essential vs. expendable?
3. **Plan the transformation**: How should content be reorganized for vertical format?
4. **Define layout zones**: Where should each type of content go?

### CRITICAL: Container Visibility Rules
The node tree includes parent-child relationships (\`parentId\`, \`hasChildren\`, \`childCount\`).

**When categorizing elements for "hide":**
- NEVER add a FRAME or GROUP to "hide" if it has \`hasChildren: true\` and contains text, images, or buttons
- Check the \`parentId\` field: if valuable content (text, images) has \`parentId\` pointing to a container, DO NOT hide that container
- Hiding a container hides EVERYTHING inside it - this is how Figma works

**What you CAN hide:**
- Empty containers (childCount: 0)
- Containers with ONLY decorative shapes (rectangles, lines, ellipses with no text children)
- Individual decorative elements (dividers, background shapes)

### Output Schema
Respond with JSON matching this exact structure:
\`\`\`typescript
{
  "designStrategy": string,     // Brief description of your approach
  "reasoning": string,          // Why this strategy works for TikTok
  "elements": {
    "keep": string[],           // Node names to keep visible
    "hide": string[],           // Node names to hide
    "emphasize": string[]       // Node names to scale up / position prominently
  },
  "layoutZones": {
    "hero": { "top": number, "bottom": number },      // 0-100 percentages
    "content": { "top": number, "bottom": number },
    "branding": { "top": number, "bottom": number },
    "safeArea": { "top": ${TIKTOK_CONSTRAINTS.SAFE_AREA.TOP * 100}, "bottom": ${TIKTOK_CONSTRAINTS.SAFE_AREA.BOTTOM * 100} }
  },
  "focalPoints": [              // Optional: detected faces/subjects
    {
      "nodeId": string,
      "nodeName": string,
      "position": { "x": number, "y": number },  // 0-1 normalized
      "importance": "critical" | "high" | "medium" | "low"
    }
  ]
}
\`\`\`

Focus on what you SEE in the image, not just the metadata. Identify faces, products, and visual focal points.`;
}

// ============================================================================
// Stage 2: Detailed Specification Prompt
// ============================================================================

/**
 * Builds the Stage 2 prompt for detailed node specifications.
 * Uses the plan from Stage 1 to generate precise positioning.
 */
export function buildStage2Prompt(
  nodeTreeJson: string,
  designPlanJson: string
): string {
  return `## Task: Generate detailed positioning specifications for TikTok variant

Based on your design plan, create precise specifications for each node.

### Target Dimensions
- Width: ${TIKTOK_CONSTRAINTS.WIDTH}px
- Height: ${TIKTOK_CONSTRAINTS.HEIGHT}px

### Design Plan from Stage 1
\`\`\`json
${designPlanJson}
\`\`\`

### Source Frame Node Tree
\`\`\`json
${nodeTreeJson}
\`\`\`

### Your Task
For EACH node in the tree, specify exactly how it should be handled:
1. **Visibility**: Should it be visible?
2. **Position**: Where should it be placed (in target frame coordinates)?
3. **Size**: What dimensions should it have?
4. **Z-order**: What's its stacking order?

### Positioning Guidelines
- Use pixel values for the ${TIKTOK_CONSTRAINTS.WIDTH}×${TIKTOK_CONSTRAINTS.HEIGHT} target frame
- Remember: Bottom 35% is danger zone (y > ${Math.round(TIKTOK_CONSTRAINTS.HEIGHT * 0.65)})
- Remember: Top 15% is caution zone (y < ${Math.round(TIKTOK_CONSTRAINTS.HEIGHT * 0.15)})
- Center horizontally when appropriate (x = ${Math.round((TIKTOK_CONSTRAINTS.WIDTH - 100) / 2)} for 100px-wide element)

### Output Schema
Respond with JSON matching this exact structure:
\`\`\`typescript
{
  "plan": <your design plan from Stage 1>,
  "nodes": [
    {
      "nodeId": string,         // Figma node ID (from the tree)
      "nodeName": string,       // Human-readable name
      "visible": boolean,       // false to hide
      "position": {             // Only if visible
        "x": number,            // Pixels from left edge
        "y": number             // Pixels from top edge
      },
      "size": {                 // Only if resizing
        "width": number,
        "height": number
      },
      "zIndex": number,         // Stack order (higher = in front)
      "textTruncate": boolean,  // For text nodes
      "maxLines": number,       // For text nodes
      "scaleFactor": number,    // 1.0 = normal, >1 = larger
      "rationale": string       // Brief explanation
    }
  ],
  "confidence": number,         // 0-1 overall confidence
  "warnings": string[]          // Any concerns about the design
}
\`\`\`

Be thorough - every node needs a spec. Hidden nodes still need entries with \`visible: false\`.`;
}

// ============================================================================
// Stage 3: Evaluation Prompt (Optional)
// ============================================================================

/**
 * Builds the Stage 3 prompt for visual evaluation of the generated design.
 * AI re-analyzes the output to catch issues.
 */
export function buildStage3Prompt(appliedSpecsJson: string): string {
  return `## Task: Evaluate the generated TikTok design

Review the generated design and identify any issues that need correction.

### Applied Design Specifications
\`\`\`json
${appliedSpecsJson}
\`\`\`

### Evaluation Criteria
1. **Safe Area Compliance**: Is critical content outside the danger zones?
2. **Visual Balance**: Is the composition well-balanced?
3. **Text Legibility**: Is text large enough and has sufficient contrast?
4. **Brand Visibility**: Is the logo/branding appropriately visible?
5. **Focal Point**: Is there a clear visual hierarchy?
6. **Overlap Issues**: Do any elements unexpectedly overlap?

### Output Schema
Respond with JSON matching this exact structure:
\`\`\`typescript
{
  "passed": boolean,            // true if design is acceptable
  "issues": [                   // Only if problems found
    {
      "type": "overlap" | "overflow" | "visibility" | "safe-area" | "composition",
      "description": string,
      "affectedNodes": string[],
      "suggestedFix": string
    }
  ],
  "adjustments": [              // NodeSpec corrections to apply
    {
      "nodeId": string,
      "nodeName": string,
      "visible": boolean,
      "position": { "x": number, "y": number },
      "size": { "width": number, "height": number }
    }
  ],
  "confidence": number          // 0-1 confidence in evaluation
}
\`\`\`

Be critical but practical - flag issues that would meaningfully impact the design's effectiveness.`;
}

// ============================================================================
// JSON Schema Extraction Helpers
// ============================================================================

/**
 * Extracts JSON from AI response, handling markdown code blocks.
 */
export function extractJsonFromResponse(response: string): string {
  // Try to extract from code block first
  const codeBlockMatch = response.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (codeBlockMatch?.[1]) {
    return codeBlockMatch[1].trim();
  }

  // Try to find JSON object directly
  const jsonMatch = response.match(/\{[\s\S]*\}/);
  if (jsonMatch?.[0]) {
    return jsonMatch[0].trim();
  }

  return response.trim();
}

/**
 * Validates and parses Stage 1 response.
 * Optionally validates container visibility decisions against the node tree.
 *
 * @param response - The raw AI response string
 * @param nodeTreeJson - Optional node tree JSON for container validation
 */
export function parseStage1Response(
  response: string,
  nodeTreeJson?: string
): {
  success: boolean;
  plan?: import("../types/design-types.js").DesignPlan;
  error?: string;
  warnings?: string[];
} {
  try {
    const jsonStr = extractJsonFromResponse(response);
    const parsed = JSON.parse(jsonStr);

    // Validate required fields
    if (!parsed.designStrategy || typeof parsed.designStrategy !== "string") {
      return { success: false, error: "Missing or invalid designStrategy" };
    }
    if (!parsed.elements || typeof parsed.elements !== "object") {
      return { success: false, error: "Missing or invalid elements object" };
    }
    if (!Array.isArray(parsed.elements.keep)) {
      return { success: false, error: "Missing or invalid elements.keep array" };
    }

    const warnings: string[] = [];

    // Validate container visibility decisions if node tree is provided
    if (nodeTreeJson && Array.isArray(parsed.elements.hide) && parsed.elements.hide.length > 0) {
      try {
        const nodeTree = JSON.parse(nodeTreeJson);
        if (nodeTree.nodes && Array.isArray(nodeTree.nodes)) {
          const hiddenContainersWithChildren = parsed.elements.hide.filter((hideName: string) => {
            // Find the node by name or id
            const node = nodeTree.nodes.find(
              (n: { name?: string; id?: string; hasChildren?: boolean; childCount?: number }) =>
                n.name === hideName || n.id === hideName
            );
            // Check if it's a container with children
            return node && node.hasChildren === true && (node.childCount ?? 0) > 0;
          });

          if (hiddenContainersWithChildren.length > 0) {
            console.warn(
              "[Design AI] WARNING: AI wants to hide containers with children:",
              hiddenContainersWithChildren
            );
            warnings.push(
              `Hiding containers with children may hide important content: ${hiddenContainersWithChildren.join(", ")}`
            );

            // Remove dangerous containers from the hide list to prevent content loss
            parsed.elements.hide = parsed.elements.hide.filter(
              (name: string) => !hiddenContainersWithChildren.includes(name)
            );

            console.log(
              "[Design AI] Removed dangerous containers from hide list. Remaining:",
              parsed.elements.hide
            );
          }
        }
      } catch (parseError) {
        // Don't fail the whole operation if validation fails, just log
        console.warn("[Design AI] Could not validate container visibility:", parseError);
      }
    }

    return {
      success: true,
      plan: parsed,
      ...(warnings.length > 0 ? { warnings } : {})
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to parse Stage 1 response: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * Validates and parses Stage 2 response.
 * Optionally validates container visibility decisions against the node tree.
 *
 * @param response - The raw AI response string
 * @param nodeTreeJson - Optional node tree JSON for container validation
 */
export function parseStage2Response(
  response: string,
  nodeTreeJson?: string
): {
  success: boolean;
  specs?: import("../types/design-types.js").DesignSpecs;
  error?: string;
  warnings?: string[];
} {
  try {
    const jsonStr = extractJsonFromResponse(response);
    const parsed = JSON.parse(jsonStr);

    // Validate required fields
    if (!parsed.plan || typeof parsed.plan !== "object") {
      return { success: false, error: "Missing or invalid plan object" };
    }
    if (!Array.isArray(parsed.nodes)) {
      return { success: false, error: "Missing or invalid nodes array" };
    }

    // Validate each node has required fields
    for (const node of parsed.nodes) {
      if (!node.nodeId || typeof node.nodeId !== "string") {
        return { success: false, error: `Node missing nodeId: ${JSON.stringify(node)}` };
      }
      if (typeof node.visible !== "boolean") {
        return { success: false, error: `Node ${node.nodeId} missing visible boolean` };
      }
    }

    const warnings: string[] = [];

    // Validate container visibility in node specs if node tree is provided
    if (nodeTreeJson && Array.isArray(parsed.nodes)) {
      try {
        const nodeTree = JSON.parse(nodeTreeJson);
        if (nodeTree.nodes && Array.isArray(nodeTree.nodes)) {
          // Find specs that hide containers with children
          const hiddenContainersWithChildren = parsed.nodes.filter(
            (spec: { nodeId?: string; nodeName?: string; visible?: boolean }) => {
              if (spec.visible !== false) return false;

              // Find the corresponding node in the tree
              const treeNode = nodeTree.nodes.find(
                (n: { id?: string; name?: string; hasChildren?: boolean; childCount?: number }) =>
                  n.id === spec.nodeId || n.name === spec.nodeName
              );

              // Check if it's a container with children
              return treeNode && treeNode.hasChildren === true && (treeNode.childCount ?? 0) > 0;
            }
          );

          if (hiddenContainersWithChildren.length > 0) {
            console.warn(
              "[Design AI] Stage 2 hiding containers with children:",
              hiddenContainersWithChildren.map((s: { nodeName?: string }) => s.nodeName)
            );

            warnings.push(
              `Stage 2 tried to hide containers: ${hiddenContainersWithChildren
                .map((s: { nodeName?: string }) => s.nodeName)
                .join(", ")}`
            );

            // Force containers to visible to prevent hiding children
            for (const spec of parsed.nodes) {
              const isHiddenContainer = hiddenContainersWithChildren.some(
                (h: { nodeId?: string }) => h.nodeId === spec.nodeId
              );
              if (isHiddenContainer) {
                spec.visible = true;
              }
            }

            console.log(
              "[Design AI] Forced dangerous containers to visible. Fixed:",
              hiddenContainersWithChildren.map((s: { nodeName?: string }) => s.nodeName)
            );
          }
        }
      } catch (parseError) {
        // Don't fail the whole operation if validation fails, just log
        console.warn("[Design AI] Could not validate Stage 2 container visibility:", parseError);
      }
    }

    return {
      success: true,
      specs: parsed,
      ...(warnings.length > 0 ? { warnings } : {})
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to parse Stage 2 response: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * Validates and parses Stage 3 response.
 */
export function parseStage3Response(response: string): {
  success: boolean;
  evaluation?: import("../types/design-types.js").DesignEvaluation;
  error?: string;
} {
  try {
    const jsonStr = extractJsonFromResponse(response);
    const parsed = JSON.parse(jsonStr);

    // Validate required fields
    if (typeof parsed.passed !== "boolean") {
      return { success: false, error: "Missing or invalid passed boolean" };
    }

    return { success: true, evaluation: parsed };
  } catch (error) {
    return {
      success: false,
      error: `Failed to parse Stage 3 response: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}
