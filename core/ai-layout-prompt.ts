/**
 * AI Layout Prompt with Fact Injection
 *
 * This prompt is designed for the second phase of the two-phase AI request.
 * It receives "hard facts" from the vision analysis phase and uses them as
 * immutable constraints for layout decisions.
 *
 * FREESTYLE POSITIONING MODE:
 * AI provides per-node positioning directly - no pattern abstraction.
 * The key innovation: face regions are GIVEN to this prompt, not detected by it.
 * This prevents the layout reasoning from "hallucinating away" inconvenient faces.
 */

import type { VisionFacts, VisionFaceRegion } from "./ai-vision-prompt.js";
import { PLUGIN_NAME } from "./plugin-constants.js";
import { VARIANT_TARGETS, type VariantTarget } from "../types/targets.js";

/**
 * Builds the layout prompt with injected vision facts.
 * The facts are presented as IMMUTABLE CONSTRAINTS that cannot be questioned.
 */
export function buildLayoutPromptWithFacts(
  facts: VisionFacts,
  targets: readonly VariantTarget[] = VARIANT_TARGETS
): string {
  const faceSummary = formatFaceFactsForPrompt(facts);
  const targetCount = targets.length;

  return `You are the ${PLUGIN_NAME} Layout Engineer. You receive VERIFIED visual facts and produce FREESTYLE positioning recommendations.

## IMMUTABLE VISUAL FACTS (Pre-verified - DO NOT question or override)
${faceSummary}

## YOUR MISSION
Using the verified facts above, generate FREESTYLE positioning for ALL ${targetCount} target formats.
**CRITICAL REQUIREMENTS:**
1. **COMPLETENESS:** Your response MUST contain exactly ${targetCount} layoutAdvice entries.
2. **100% COVERAGE:** Each entry MUST have positioning for EVERY node listed in the summary. **DO NOT OMIT ANY NODES.**
3. **CONTAINERS:** Nodes marked "isDirectChild": true are your layout blocks. You MUST provide explicit sizing/alignment for them (e.g. "grow": 1 or "mode": "fill"). If you ignore them, the entire layout will fail to adapt.
4. **TEXT:** Provide explicit "targetFontSize" for all text. We now apply this directly.

## 1. FREESTYLE POSITIONING (Per-Node Decisions)
For EACH target, provide explicit positioning for EVERY node:
- **visible:** Show (true) or hide (false) this node. **If false, you MUST still provide an entry with visible:false.**
- **anchor:** 9-point grid (top-left, top-center, top-right, center-left, center, center-right, bottom-left, bottom-center, bottom-right, fill)
- **offset:** Pixel offsets from anchor point or safe area
- **size:** "mode": "fill" (stretches to container), "fixed" (explicit px), or "auto" (hug content).
- **text:** For text nodes: targetFontSize (MUST specify), maxLines, textAlign
- **containerAlignment:** "grow": 1 (flex fill), "counter": alignment on cross-axis.
- **rationale:** MUST start with "Face at [X,Y]." or "No face." then explain positioning

## 2. CRITICAL RULES
- **HIERARCHY:** Sizing a child is useless if its parent container is the wrong size. You MUST size containers ("isDirectChild": true) to match the target format.
- **BACKGROUNDS:** You MUST include positioning for background images/patterns. Set "size": { "mode": "fill" } and "image": { "fit": "cover" } so they bleed to edges.
- **FLEXIBILITY:** Use "containerAlignment": { "grow": 1 } for elements that should expand to fill empty space (spacers, text bodies).
- **THE REPULSION LAW:** The subject occupancy fact is a PHYSICAL WALL. Typography is REPELLED from it.
${facts.subjectOccupancy === "left" ? "- Subject is LEFT: All text MUST anchor RIGHT (center-right, top-right, bottom-right)" :
  facts.subjectOccupancy === "right" ? "- Subject is RIGHT: All text MUST anchor LEFT (center-left, top-left, bottom-left)" :
  facts.subjectOccupancy === "center" ? "- Subject is CENTER: Text MUST be TOP or BOTTOM with 20% offset from center" :
  "- No subject detected: Use standard centered layouts"}

## 3. FACE EXCLUSION ZONES (Mandatory)
${facts.faceRegions.length > 0
    ? `You have ${facts.faceRegions.length} verified face region(s). For EVERY target:
- Calculate if text box would overlap any face region
- If overlap > 0%: Nudge text anchor to achieve 0% overlap
- The rationale MUST state: "Face at [X,Y]. Text anchored to [opposite side]."
- NEVER position text such that its bounding box intersects face bounds`
    : "No faces detected. Standard layout rules apply."}

## 4. DIMENSIONAL VETOES (Height-based rules)
| Target Height | Subject Rule | Text Rule |
| :--- | :--- | :--- |
| **< 115px** | visible: false (Always hide photos) | Max 1 line, textTreatment: "single-line" |
| **115px - 350px** | SIDE-ANCHOR only | Max 2 lines, no center overlays |
| **> 350px** | Normal positioning | Full text stack allowed |

## 5. TOPOLOGY MANDATES (Aspect Ratio Rules)
- **Extreme Vertical (Ratio < 0.6):** MUST use \`suggestedLayoutMode: "VERTICAL"\`. (TikTok/Reels)
- **Extreme Horizontal (Ratio > 2.0):** MUST use \`suggestedLayoutMode: "HORIZONTAL"\`. (Web Banners)
- **Square/Standard:** Use best fit for content.

## 6. ANCHORED MEMORY PROTOCOL
For EVERY one of the ${targetCount} target entries, your positioning rationale MUST begin with:
"${facts.faceRegions.length > 0
    ? `Face at [${facts.faceRegions[0]?.x.toFixed(2)}, ${facts.faceRegions[0]?.y.toFixed(2)}]. `
    : "No face detected. "}"

This forces you to re-calculate spatial logic for each target.

## 7. OUTPUT SCHEMA
Exactly ${targetCount} entries. Use the verified facts above - do not re-detect them.

\`\`\`json
{
  "signals": {
    "intent": "${facts.intent}",
    "roles": [{ "nodeId": string, "role": "subject"|"branding"|"typography"|"action"|"container"|"component"|"environment"|"unknown", "confidence": number }],
    "faceRegions": ${JSON.stringify(facts.faceRegions.map(f => ({
      nodeId: "vision-detected",
      x: f.x,
      y: f.y,
      width: f.width,
      height: f.height,
      confidence: f.confidence
    })))},
    "subjectOccupancy": "${facts.subjectOccupancy}"
  },
  "layoutAdvice": {
    "entries": [{
      "targetId": "string",
      "suggestedLayoutMode": "HORIZONTAL"|"VERTICAL"|"NONE",
      "restructure": { "drop": ["nodeId"], "textTreatment": "single-line"|"wrap" },
      "containerOverrides": {
        "itemSpacing": number,
        "padding": { "top": number, "right": number, "bottom": number, "left": number },
        "primaryAxisAlignItems": "MIN"|"CENTER"|"MAX"|"SPACE_BETWEEN",
        "counterAxisAlignItems": "MIN"|"CENTER"|"MAX"
      },
      "positioning": {
        "NODE_ID": {
          "visible": boolean,
          "// OPTIMIZATION": "If visible is false, OMIT the rest.",
          "anchor": "top-left"|"center-right"|"bottom-center"|etc,
          "offset": { "top": number, "left": number, "fromSafeArea": boolean },
          "size": { "mode": "auto"|"fixed"|"fill", "width": number, "height": number },
          "text": { "targetFontSize": number, "maxLines": number, "textAlign": "left"|"center" },
          "image": { "fit": "cover"|"contain", "allowBleed": boolean, "bleedAnchor": "left"|"right"|"top"|"bottom" },
          "containerAlignment": { "grow": 0|1, "counter": "start"|"center"|"end"|"stretch" },
          "rationale": "${facts.faceRegions.length > 0 ? "Face at [X,Y]. " : "No face. "}[explain positioning]"
        }
      }
    }]
  }
}
\`\`\`

## VERIFICATION CHECKLIST (Before outputting)
1. ✓ Did I use the GIVEN face regions (not re-detect them)?
2. ✓ Does EVERY positioning rationale mention the face/subject location?
3. ✓ Is text ALWAYS on the opposite side from the subject?
4. ✓ Are subjects hidden for targets < 115px tall?
5. ✓ Do I have EXACTLY ${targetCount} entries?
6. ✓ Does EVERY entry have positioning for EVERY visible node?
7. ✓ Did I include suggestedLayoutMode for each entry?`;
}

/**
 * Formats the vision facts into a clear, constraint-like format for the prompt.
 */
function formatFaceFactsForPrompt(facts: VisionFacts): string {
  const lines: string[] = [];

  lines.push(`### Subject Analysis (Confidence: ${(facts.confidence * 100).toFixed(0)}%)`);
  lines.push(`- **Intent:** ${facts.intent}`);
  lines.push(`- **Subject Type:** ${facts.subjectType}`);
  lines.push(`- **Subject Occupancy:** ${facts.subjectOccupancy.toUpperCase()}`);

  if (facts.faceRegions.length === 0) {
    lines.push(`\n### Face Detection: NONE`);
    lines.push(`No faces were detected in this frame.`);
  } else {
    lines.push(`\n### Face Detection: ${facts.faceRegions.length} face(s) found`);
    for (let i = 0; i < facts.faceRegions.length; i++) {
      const face = facts.faceRegions[i];
      const horizontalPosition = face.x < 0.4 ? "LEFT" : face.x > 0.6 ? "RIGHT" : "CENTER";
      const verticalPosition = face.y < 0.4 ? "TOP" : face.y > 0.6 ? "BOTTOM" : "MIDDLE";

      lines.push(`- **Face ${i + 1}:** Center at (${face.x.toFixed(2)}, ${face.y.toFixed(2)})`);
      lines.push(`  - Position: ${horizontalPosition} ${verticalPosition}`);
      lines.push(`  - Size: ${(face.width * 100).toFixed(0)}% x ${(face.height * 100).toFixed(0)}% of frame`);
      lines.push(`  - Confidence: ${(face.confidence * 100).toFixed(0)}%`);
    }
  }

  return lines.join("\n");
}

/**
 * Builds the user message for the layout request (includes frame summary, no image needed).
 */
export function buildLayoutUserMessage(
  frameSummary: string,
  facts: VisionFacts,
  targetCount: number = 17
): string {
  return `## Frame Content Summary
${frameSummary}

## Verified Vision Facts (Use these - do not re-analyze)
Subject Occupancy: ${facts.subjectOccupancy}
Face Count: ${facts.faceRegions.length}
${facts.faceRegions.map((f, i) =>
    `Face ${i + 1}: center (${f.x.toFixed(2)}, ${f.y.toFixed(2)}), size ${(f.width * 100).toFixed(0)}%x${(f.height * 100).toFixed(0)}%`
  ).join("\n")}

Please generate FREESTYLE positioning recommendations for these ${targetCount} targets using these verified facts.
REMINDER: Each target entry MUST include positioning for EVERY visible node.`;
}

/**
 * Converts VisionFaceRegion to AiFaceRegion format for compatibility.
 */
export function visionFacesToAiFaces(
  faces: readonly VisionFaceRegion[]
): Array<{ nodeId: string; x: number; y: number; width: number; height: number; confidence: number }> {
  return faces.map((face, index) => ({
    nodeId: `vision-face-${index}`,
    x: face.x,
    y: face.y,
    width: face.width,
    height: face.height,
    confidence: face.confidence
  }));
}
