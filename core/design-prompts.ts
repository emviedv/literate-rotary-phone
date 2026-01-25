/**
 * Design Prompts for TikTok AI-Driven Design Feature
 *
 * Three-stage prompt system:
 * - Stage 1: Vision Analysis - Extract visual facts and create design plan
 * - Stage 2: Detailed Specification - Node-by-node positioning specs
 * - Stage 3: Evaluation - Verify the generated design (optional)
 */

import { TIKTOK_CONSTRAINTS } from "../types/design-types.js";
import { USE_STRUCTURED_OUTPUTS } from "./design-schemas.js";

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
- **Bottom 8%**: DANGER ZONE - TikTok overlays like, comment, share buttons, caption text, and progress bar here. No important content should be placed here.
- **Top 4%**: CAUTION ZONE - Status bar, close button, and follow button appear here. Avoid placing key messaging here.
- **Safe Content Area**: Keep critical content between 8% and 92% from top

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
- Hide brand logos (trust your visual analysis to identify them, not just node names)
- Crop faces or key product images
- Place important content in the danger zones
- **Hide containers (FRAME/GROUP) that have important children** (see visibility rules below)
- **Place text flush against frame edges** — ALL text needs minimum 40px padding from left, right, and top edges

## CRITICAL: Fill the Vertical Canvas Intentionally

The TikTok canvas is TALL (1920px). Your safe content area spans from y=154 to y=1766 — that's **1612px of prime real estate**.

Most source designs are only 400-600px tall. **If you place them as-is, you waste 50%+ of the canvas.** This creates the "copy-paste" look we must avoid.

### The #1 Mistake to Avoid
❌ Content clustered in one spot with massive empty space above or below
❌ Original proportions preserved exactly — this wastes the vertical canvas
❌ Uniform scaling (everything 1.5x) — feels stretched, not designed

### The Creative Transformation Process

**Step 1: Classify Content Type**
- **Visual-heavy:** Has prominent photo, device mockup, illustration, person → Hero visual should LEAD
- **Text-heavy:** Has numbered lists, feature bullets, text-first messaging → Headline should LEAD

**Step 2: Identify the Dominant Element**
- Visual-heavy designs: The hero image/mockup is your dominant element
- Text-heavy designs: The headline/title is your dominant element

**Step 3: Apply Strategic Scaling**
Scale elements DIFFERENTLY based on their role — this creates hierarchy:

| Element Type | Visual-Heavy Design | Text-Heavy Design |
|--------------|---------------------|-------------------|
| Dominant (hero OR headline) | Scale hero to 400-500px tall | Scale headline 1.8-2.5x |
| Supporting elements | Scale 1.2-1.5x | Scale 1.3-1.5x |
| Tertiary (branding, small text) | Scale 1.0-1.2x | Scale 1.0-1.2x |

**Step 4: Expand Spacing Dramatically**
After scaling, SPREAD elements through the vertical space:
- Use 60-120px gaps between logical groups (not 20-30px)
- Content should span from approximately y=154 to y=1766
- The viewer's eye should travel DOWN the full composition

### Target: 80-90% Safe Area Utilization
- Safe area = 1612px vertical space
- Your content should occupy **1290-1450px** of that space
- If your final layout is under 1200px tall, you haven't transformed enough — scale up!

### Mental Model
Think: "I'm not fitting content INTO TikTok — I'm DESIGNING for TikTok."
The vertical format is an opportunity for bold, impactful composition, not a constraint to work around.

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

## CRITICAL: Component Instances (type: "INSTANCE")
In the node tree, any node with \`type: "INSTANCE"\` is a **Figma component instance**.

**Component instances are ALWAYS atomic units:**
- They were intentionally created/used by the designer as reusable elements
- Examples: buttons, cards, icons, mockups, badges, avatars, navigation items
- Their children are locked by design - they move together as one piece

**Rules for component instances:**
1. **Position the INSTANCE node only** - children move with it automatically
2. **NEVER provide separate specs for children of INSTANCE nodes**
3. **Check parentId** - if a node's parentId points to an INSTANCE, skip it entirely
4. This applies to ALL instances, not just mockups - buttons, cards, icons, everything

**How to identify INSTANCE children:**
- Look for \`isComponentInstance: true\` flag on any node
- Check any node's \`parentId\` - if that parent has \`type: "INSTANCE"\`, skip the node
- Nodes inside component instances should NOT appear in your output specs

**Example - WRONG:**
\`\`\`json
{ "nodeId": "123:456", "nodeName": "Button", "type": "INSTANCE", "position": {...} }
{ "nodeId": "123:457", "nodeName": "Button Text", "parentId": "123:456", "position": {...} }  // ❌ Parent is INSTANCE!
\`\`\`

**Example - CORRECT:**
\`\`\`json
{ "nodeId": "123:456", "nodeName": "Button", "type": "INSTANCE", "position": {...} }
// Children of Button instance are OMITTED - they stay in their relative positions
\`\`\`

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

## STEP 1: VISUAL INVENTORY (What do you literally SEE?)

**CRITICAL: Analyze the IMAGE FIRST, before reading the node tree.**

Look at the actual pixels and describe what you see. The node tree metadata (names like "Container", "Frame", "Text") can be misleading — a node named "Text" might visually BE a logo. Trust your eyes.

### Visual Element Scan
For each distinct visual element you can see, identify:

1. **Logos & Brand Marks** (CRITICAL - these must NEVER be hidden)
   - **Wordmarks**: Company name as stylized text (Google, Coca-Cola, FedEx)
   - **Lettermarks/Monograms**: Initials (HBO, IBM, LV, CC, H&M)
   - **Symbols/Pictorial**: Recognizable icons (Apple, Twitter bird, Target bullseye)
   - **Abstract marks**: Geometric shapes representing brand (Nike swoosh, Pepsi circle, Airbnb)
   - **Combination marks**: Symbol + text together (Burger King, Adidas, Lacoste)
   - **Emblems**: Badge/seal style (Starbucks, Harley-Davidson, NFL)
   - Look for: corners, headers, footers, watermarks, small graphics that repeat brand colors
   - Note: Logos are often component instances with generic names like "Text", "Icon", or "Frame"

2. **Hero/Primary Subject**
   - What's the main visual? (product photo, person, illustration, mockup)
   - Where is it positioned? What percentage of the frame does it occupy?

3. **Text Content** (ALL text is sacred in marketing)
   - Headlines: What's the main message?
   - Prices/Values: Any monetary values or discounts (these are conversion-critical)
     - Currency symbols: $, €, £, ¥, ₹, ₩, R$, kr, CHF, A$, C$, etc.
     - Formats: "$99", "€49.99", "£100", "¥1,000", "50% off", "2 for 1", "Save $20", "From $X/mo"
     - Look for: numbers near currency symbols, percentage signs, strikethrough prices
   - Body copy: Supporting text
   - CTAs: Buttons or action text (look for: "Shop Now", "Buy Now", "Get Started", "Learn More", "Sign Up", "Subscribe", "Download", "Try Free", "Book Now", "Contact Us", arrow icons with text, high-contrast colored rectangles with text inside)

4. **Supporting Visuals**
   - Secondary images, icons, decorative elements
   - Background colors/gradients

### Visual Relationships
- What elements are visually grouped together? (proximity, shared background, alignment)
- What's the visual hierarchy? (size, contrast, position)
- Which elements form a "card" or "container" visually, even if the node tree doesn't show it?

---

## STEP 2: DESIGN SYSTEM ANALYSIS

Now that you've inventoried what you SEE, analyze the design system:

### Composition & Flow
- Where does the eye naturally flow?
- What's the primary focal point?
- Is the composition balanced or intentionally asymmetrical?

### Layout Logic
- What's the organizational structure? (grid, stack, free-form)
- How does whitespace guide attention?
- Which spatial relationships are intentional?

### Typography Hierarchy
- What's the type scale? (sizes, weights)
- How does text spacing reinforce hierarchy?

### Color System
- What color relationships are important?
- How does contrast guide attention?

### Design Intent
- What's the primary message/goal?
- Why is content arranged this way?

---

## STEP 3: PROTECTION LIST (What must NEVER be hidden?)

Based on your visual analysis, identify elements that are SACRED and must remain visible:

1. **All logos and brand marks** — even if named generically
2. **All prices and values** — any currency ($, €, £, ¥, ₹, etc.), percentages, discounts, "From $X", strikethrough prices
3. **All headlines** — the core message
4. **All CTAs** — buttons, action text ("Shop Now", "Get Started", "Sign Up", "Download", "Try Free", "Book Now"), arrow icons paired with text, high-contrast rectangles with text
5. **The primary subject** — hero image, product, person

These go in the \`neverHide\` array in your output.

---

## STEP 4: TRANSFORMATION PLANNING

Now plan how to adapt this for TikTok vertical format...

### Content Classification (Required)
Before planning positions, you MUST classify:
1. **Content Type**: Is this visual-heavy or text-heavy?
2. **Dominant Element**: Which element should occupy the most vertical space?
3. **Scaling Strategy**: How will you scale elements to fill 70-80% of the safe area?

This classification drives your entire transformation strategy.

### Your Task
1. **Complete the Visual Inventory**: Describe what you literally SEE (logos, prices, headlines, subject)
2. **Build the neverHide list**: Sacred elements that must remain visible no matter what
3. **Document design analysis**: Layout logic, typography, composition
4. **Plan the transformation**: How to reorganize for vertical format
5. **Define layout zones**: Where should each type of content go
6. **Respect edge padding**: ALL text must have 40px minimum from frame edges (left, right, top)

**IMPORTANT**: The \`hide\` array must NEVER contain anything from \`neverHide\`. Cross-check before outputting.

**IMPORTANT**: Text flush against edges looks unprofessional. When planning positions, ensure text containers start at x ≥ 40, not x = 0.

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

### CRITICAL: Atomic Groups (Mockups & Illustrations)
Some containers are **atomic visual units** that must move as one piece:
- **Device mockups**: iPhone, Android, tablet frames with screen content
- **Illustrations**: Vector artwork, graphics, diagrams
- **Screenshots**: Device screenshots with frames/bezels

**Rules for atomic groups:**
1. Position the PARENT container only - children move with it
2. Do NOT provide separate positioning for children inside mockups
3. If you see a "phone", "device", "mockup", "illustration" container, treat it as ONE element
4. The bezel and screen content are NOT separate elements - they are one unit

**Example - WRONG:**
\`\`\`
"iPhone Frame": { position: { x: 200, y: 400 } }
"Screen Content": { position: { x: 180, y: 350 } }  // ❌ This tears apart the mockup!
\`\`\`

**Example - CORRECT:**
\`\`\`
"iPhone Mockup": { position: { x: 200, y: 400 } }  // ✓ Position the parent only
// Children omitted - they stay in their relative positions within the mockup
\`\`\`

### CRITICAL Constraints (enforced after generation)
These rules are validated after AI generation - violations will be auto-corrected:

1. **neverHide protection**: Items in "hide" array must NOT appear in "neverHide" array
2. **Container visibility**: NEVER hide containers (FRAME/GROUP with children) containing text/images
3. **Component instances**: INSTANCE node children must not be repositioned independently

### Output
Respond with valid JSON matching the stage1_design_plan schema. The schema is provided to the API.

Remember: The node tree gives you names and structure, but YOUR EYES tell you what's actually important. A node named "Text" might be a logo. A node named "Container" might hold the entire value proposition. Trust vision over metadata.`;
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
For each node in the tree, specify how it should be handled. **Only include position for nodes that need repositioning** - text nodes inside auto-layout containers often don't need explicit positions.
1. **Visibility**: Should it be visible?
2. **Position**: Where should it be placed? **Omit for nodes that fit naturally in their container's flow.**
3. **Size**: What dimensions should it have?
4. **Z-order**: What's its stacking order? Use the layer ranges below.

### Z-Index Layer System
Use these ranges for consistent stacking:
| Layer | Z-Index | Content |
|-------|---------|---------|
| Background | 1-10 | Full-bleed images, gradients, background shapes |
| Content | 11-30 | Hero images, product photos, illustrations, mockups |
| Text | 31-50 | Headlines, body copy, captions, prices |
| Interactive | 51-70 | CTAs, buttons, links |
| Branding | 71-90 | Logos, brand marks, watermarks |
| Overlay | 91-100 | Badges, stickers, "NEW" tags, floating elements |

**Example**: A design with background image (z:5), product photo (z:20), headline (z:35), price (z:40), CTA button (z:60), and logo (z:80).

### Positioning Guidelines
- Use pixel values for the ${TIKTOK_CONSTRAINTS.WIDTH}×${TIKTOK_CONSTRAINTS.HEIGHT} target frame
- Remember: Bottom 8% is danger zone (y > ${Math.round(TIKTOK_CONSTRAINTS.HEIGHT * 0.92)})
- Remember: Top 4% is caution zone (y < ${Math.round(TIKTOK_CONSTRAINTS.HEIGHT * 0.08)})
- Center horizontally when appropriate (x = ${Math.round((TIKTOK_CONSTRAINTS.WIDTH - 100) / 2)} for 100px-wide element)

### CRITICAL: Space Utilization Target
Your layout should utilize 80-90% of the safe area (1290-1450px of the 1612px available).

**Calculate your layout height:**
- Sum up element heights + gaps
- If total < 1200px, you need to scale up more aggressively
- Content should span from ~y=154 to ~y=1766, not cluster in one area

**Don't just place — DESIGN:**
- Dominant element: 40-50% of safe area
- Supporting elements: Scaled 1.2-1.5x from original
- Generous spacing between groups (60-120px)

### CRITICAL: Edge Padding for Text
**ALL text must have at least 40px padding from frame edges.** Text flush against edges looks unprofessional and may clip on some devices.
- Left edge: text x position must be ≥ 40
- Right edge: text x + width must be ≤ ${TIKTOK_CONSTRAINTS.WIDTH - 40} (1040px)
- Top edge: text y position must be ≥ 40 (unless intentionally in top UI zone)
- This applies to: headlines, body copy, prices, CTAs, URLs, taglines, watermarks
- Background images and decorative shapes CAN extend to edges (full-bleed is fine)

### Note on Images
For nodes with \`fillType: "IMAGE"\`, the system will automatically preserve the original aspect ratio when resizing. Specify approximate size/position and the image will be scaled proportionally to cover the intended area without distortion.

### CRITICAL: Skip Children of Component Instances
Before generating a spec for any node, check its \`parentId\`:
- Find the parent node in the tree
- If the parent has \`type: "INSTANCE"\` or \`isComponentInstance: true\`, **DO NOT include a spec for this node**
- Component instance children must not be repositioned independently - they move with their parent
- Only position the INSTANCE node itself, never its internal children

### CRITICAL: Preserve Auto-Layout Containers
Nodes with \`inAutoLayoutParent: true\` are inside an auto-layout container and will be positioned automatically by their parent.

**DO NOT provide position specs for these nodes.** They flow with the container.

If you need to move auto-layout content:
1. Position the PARENT container (the one with \`layoutMode: "HORIZONTAL" | "VERTICAL"\`)
2. Let children inherit that position automatically
3. Only provide visibility, size, and z-index for auto-layout children - NOT position

**Example - WRONG:**
\`\`\`json
{ "nodeId": "parent-container", "layoutMode": "VERTICAL", "position": { "x": 100, "y": 300 } }
{ "nodeId": "title-text", "inAutoLayoutParent": true, "position": { "x": 120, "y": 1400 } }  // ❌ Will break layout!
\`\`\`

**Example - CORRECT:**
\`\`\`json
{ "nodeId": "parent-container", "layoutMode": "VERTICAL", "position": { "x": 100, "y": 300 } }
{ "nodeId": "title-text", "inAutoLayoutParent": true, "visible": true }  // ✓ No position - flows with parent
\`\`\`

### CRITICAL Constraints (enforced after generation)
These rules are validated after AI generation - violations will be auto-corrected:

1. **neverHide protection**: Elements in the plan's neverHide list cannot have visible: false
2. **Container visibility**: Containers with children cannot be hidden (would hide all children)
3. **INSTANCE children filtered**: Specs for children of INSTANCE nodes will be removed
4. **Auto-layout children**: Do NOT provide position for nodes with inAutoLayoutParent: true

### Output
Respond with valid JSON matching the stage2_design_specs schema. The schema is provided to the API.

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
7. **Edge Padding**: Is ALL text at least 40px from frame edges? Text at x < 40 or x + width > 1040 is a FAIL.

### Output
Respond with valid JSON matching the stage3_evaluation schema. The schema is provided to the API.

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
    // With structured outputs, response is guaranteed valid JSON with correct structure
    // Keep extractJsonFromResponse for legacy mode (feature flag = false)
    const jsonStr = USE_STRUCTURED_OUTPUTS ? response : extractJsonFromResponse(response);
    const parsed = JSON.parse(jsonStr);

    // Structural validation only needed in legacy mode (schema handles it in structured mode)
    if (!USE_STRUCTURED_OUTPUTS) {
      if (!parsed.designStrategy || typeof parsed.designStrategy !== "string") {
        return { success: false, error: "Missing or invalid designStrategy" };
      }
      if (!parsed.elements || typeof parsed.elements !== "object") {
        return { success: false, error: "Missing or invalid elements object" };
      }
      if (!Array.isArray(parsed.elements.keep)) {
        return { success: false, error: "Missing or invalid elements.keep array" };
      }
    }

    const warnings: string[] = [];

    // CRITICAL: Validate visualInventory - this is the primary vision analysis
    if (!parsed.visualInventory || typeof parsed.visualInventory !== "object") {
      console.warn(
        "[Design AI] WARNING: AI skipped visual inventory. Vision analysis is critical for accurate transformation."
      );
      warnings.push(
        "AI did not provide visual inventory - may miss logos, prices, or other critical elements"
      );
    } else {
      const vi = parsed.visualInventory;

      // Check for logo identification
      if (!Array.isArray(vi.logos) || vi.logos.length === 0) {
        console.warn("[Design AI] WARNING: No logos identified in visual inventory");
        warnings.push("No logos identified - verify manually that no branding is hidden");
      }

      // Check for price identification (common in marketing)
      if (!Array.isArray(vi.prices) || vi.prices.length === 0) {
        // Not a warning, just info - not all designs have prices
        console.log("[Design AI] No prices identified in visual inventory");
      }

      // Check for primary subject
      if (!vi.primarySubject || vi.primarySubject.trim() === "") {
        console.warn("[Design AI] WARNING: No primary subject identified");
        warnings.push("No primary subject identified - focal point may be unclear");
      }
    }

    // CRITICAL: Validate neverHide list - elements that must remain visible
    if (!Array.isArray(parsed.neverHide) || parsed.neverHide.length === 0) {
      console.warn(
        "[Design AI] WARNING: No 'neverHide' elements identified - critical elements may be hidden"
      );
      warnings.push(
        "No 'neverHide' list provided - logos, prices, and CTAs may be incorrectly hidden"
      );
    } else {
      console.log(`[Design AI] Protected elements (neverHide): ${parsed.neverHide.join(", ")}`);
    }

    // Cross-check: elements.hide should not contain anything from neverHide
    if (Array.isArray(parsed.neverHide) && Array.isArray(parsed.elements?.hide)) {
      const protectedSet = new Set(parsed.neverHide.map((n: string) => n.toLowerCase()));
      const violations = parsed.elements.hide.filter((name: string) =>
        protectedSet.has(name.toLowerCase())
      );

      if (violations.length > 0) {
        console.warn(
          "[Design AI] CONFLICT: 'hide' list contains protected elements:",
          violations
        );
        warnings.push(`Protected elements incorrectly in hide list: ${violations.join(", ")}`);

        // Auto-fix: remove protected elements from hide list
        parsed.elements.hide = parsed.elements.hide.filter(
          (name: string) => !protectedSet.has(name.toLowerCase())
        );
        console.log("[Design AI] Auto-removed protected elements from hide list");
      }
    }

    // Validate designAnalysis is present and populated
    if (!parsed.designAnalysis || typeof parsed.designAnalysis !== "object") {
      console.warn(
        "[Design AI] WARNING: AI skipped design analysis. This may lead to poor transformation decisions."
      );
      warnings.push(
        "AI did not provide design analysis - transformation may not understand design intent"
      );
    } else {
      // Check for empty or placeholder values in critical fields
      const analysis = parsed.designAnalysis;
      const requiredFields = [
        "visualFocal",
        "compositionalFlow",
        "layoutLogic",
        "designIntent"
      ];
      const missingFields = requiredFields.filter(
        (field) => !analysis[field] || analysis[field].trim() === ""
      );

      if (missingFields.length > 0) {
        console.warn(
          "[Design AI] WARNING: Design analysis incomplete, missing:",
          missingFields
        );
        warnings.push(
          `Incomplete design analysis - missing: ${missingFields.join(", ")}`
        );
      }

      // Check for criticalRelationships
      if (
        !Array.isArray(analysis.criticalRelationships) ||
        analysis.criticalRelationships.length === 0
      ) {
        console.warn(
          "[Design AI] WARNING: No 'criticalRelationships' identified - layout dependencies may be broken"
        );
        warnings.push(
          "No 'criticalRelationships' identified - layout dependencies may be broken"
        );
      }
    }

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
    // With structured outputs, response is guaranteed valid JSON with correct structure
    const jsonStr = USE_STRUCTURED_OUTPUTS ? response : extractJsonFromResponse(response);
    const parsed = JSON.parse(jsonStr);

    // Structural validation only needed in legacy mode
    if (!USE_STRUCTURED_OUTPUTS) {
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

          // CRITICAL: Filter out specs for children of INSTANCE nodes
          // Component instances are atomic - their children should not be repositioned independently
          const instanceIds = new Set(
            nodeTree.nodes
              .filter((n: { type?: string; isComponentInstance?: boolean }) =>
                n.type === "INSTANCE" || n.isComponentInstance === true
              )
              .map((n: { id: string }) => n.id)
          );

          if (instanceIds.size > 0) {
            // Find specs targeting children of INSTANCE nodes
            const filteredSpecs: typeof parsed.nodes = [];
            const removedSpecs: string[] = [];

            for (const spec of parsed.nodes) {
              // Find this node in the tree to check its parentId
              const treeNode = nodeTree.nodes.find(
                (n: { id?: string }) => n.id === spec.nodeId
              );

              // If the node's parent is an INSTANCE, filter it out
              if (treeNode?.parentId && instanceIds.has(treeNode.parentId)) {
                removedSpecs.push(spec.nodeName || spec.nodeId);
              } else {
                filteredSpecs.push(spec);
              }
            }

            if (removedSpecs.length > 0) {
              console.warn(
                `[Design AI] Filtering ${removedSpecs.length} specs for INSTANCE children:`,
                removedSpecs
              );
              warnings.push(
                `Filtered ${removedSpecs.length} specs for component instance children: ${removedSpecs.slice(0, 5).join(", ")}${removedSpecs.length > 5 ? "..." : ""}`
              );
              parsed.nodes = filteredSpecs;
            }
          }

          // CRITICAL: Enforce neverHide list from Stage 1 vision analysis
          // This uses the AI's visual analysis rather than code-level name heuristics
          const neverHideList: string[] = parsed.plan?.neverHide || [];

          if (neverHideList.length > 0) {
            const protectedSet = new Set(neverHideList.map((n: string) => n.toLowerCase()));

            // Find specs that try to hide protected elements
            const violatingSpecs = parsed.nodes.filter(
              (spec: { nodeName?: string; nodeId?: string; visible?: boolean }) => {
                if (spec.visible !== false) return false;

                const nameMatch = spec.nodeName && protectedSet.has(spec.nodeName.toLowerCase());
                const idMatch = spec.nodeId && protectedSet.has(spec.nodeId.toLowerCase());

                return nameMatch || idMatch;
              }
            );

            if (violatingSpecs.length > 0) {
              console.warn(
                "[Design AI] Stage 2 trying to hide protected elements from neverHide list:",
                violatingSpecs.map((s: { nodeName?: string }) => s.nodeName)
              );

              warnings.push(
                `Stage 2 tried to hide protected elements: ${violatingSpecs.map((s: { nodeName?: string }) => s.nodeName).join(", ")}`
              );

              // Force protected elements to be visible
              for (const spec of parsed.nodes) {
                const nameMatch = spec.nodeName && protectedSet.has(spec.nodeName.toLowerCase());
                const idMatch = spec.nodeId && protectedSet.has(spec.nodeId.toLowerCase());

                if ((nameMatch || idMatch) && spec.visible === false) {
                  spec.visible = true;
                }
              }

              console.log(
                "[Design AI] Enforced neverHide protection, forced visible:",
                violatingSpecs.map((s: { nodeName?: string }) => s.nodeName)
              );
            }
          } else {
            console.warn("[Design AI] No neverHide list in plan - cannot enforce element protection");
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
    // With structured outputs, response is guaranteed valid JSON with correct structure
    const jsonStr = USE_STRUCTURED_OUTPUTS ? response : extractJsonFromResponse(response);
    const parsed = JSON.parse(jsonStr);

    // Structural validation only needed in legacy mode
    if (!USE_STRUCTURED_OUTPUTS) {
      if (typeof parsed.passed !== "boolean") {
        return { success: false, error: "Missing or invalid passed boolean" };
      }
    }

    return { success: true, evaluation: parsed };
  } catch (error) {
    return {
      success: false,
      error: `Failed to parse Stage 3 response: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}
