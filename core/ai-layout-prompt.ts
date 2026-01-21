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

/**
 * Builds the layout prompt with injected vision facts.
 * The facts are presented as IMMUTABLE CONSTRAINTS that cannot be questioned.
 */
export function buildLayoutPromptWithFacts(facts: VisionFacts): string {
  const faceSummary = formatFaceFactsForPrompt(facts);

  return `You are the ${PLUGIN_NAME} Layout Engineer. You receive VERIFIED visual facts and produce FREESTYLE positioning recommendations.

## IMMUTABLE VISUAL FACTS (Pre-verified - DO NOT question or override)
${faceSummary}

## YOUR MISSION
Using the verified facts above, generate FREESTYLE positioning for ALL 17 target formats.
**CRITICAL: Your response MUST contain exactly 17 layoutAdvice entries - one per target. Each entry MUST have positioning for EVERY visible node.**

## 1. FREESTYLE POSITIONING (Per-Node Decisions)
For EACH target, provide explicit positioning for EVERY visible node:
- **anchor:** 9-point grid (top-left, top-center, top-right, center-left, center, center-right, bottom-left, bottom-center, bottom-right, fill)
- **visible:** Show (true) or hide (false) this node for this target
- **offset:** Pixel offsets from anchor point or safe area
- **text:** For text nodes: targetFontSize, maxLines, textAlign
- **rationale:** MUST start with "Face at [X,Y]." or "No face." then explain positioning

## 2. THE REPULSION LAW (Mandatory)
The subject occupancy fact above is a PHYSICAL WALL. Typography is REPELLED from it.
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
For EVERY one of the 17 target entries, your positioning rationale MUST begin with:
"${facts.faceRegions.length > 0
    ? `Face at [${facts.faceRegions[0]?.x.toFixed(2)}, ${facts.faceRegions[0]?.y.toFixed(2)}]. `
    : "No face detected. "}"

This forces you to re-calculate spatial logic for each target.

## 7. OUTPUT SCHEMA
Exactly 17 entries. Use the verified facts above - do not re-detect them.

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
      "positioning": {
        "NODE_ID": {
          "visible": boolean,
          "anchor": "top-left"|"center-right"|"bottom-center"|etc,
          "offset": { "top": number, "left": number, "fromSafeArea": boolean },
          "text": { "targetFontSize": number, "maxLines": number, "textAlign": "left"|"center" },
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
5. ✓ Do I have EXACTLY 17 entries?
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
  facts: VisionFacts
): string {
  return `## Frame Content Summary
${frameSummary}

## Verified Vision Facts (Use these - do not re-analyze)
Subject Occupancy: ${facts.subjectOccupancy}
Face Count: ${facts.faceRegions.length}
${facts.faceRegions.map((f, i) =>
    `Face ${i + 1}: center (${f.x.toFixed(2)}, ${f.y.toFixed(2)}), size ${(f.width * 100).toFixed(0)}%x${(f.height * 100).toFixed(0)}%`
  ).join("\n")}

Please generate FREESTYLE positioning recommendations for all 17 targets using these verified facts.
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
