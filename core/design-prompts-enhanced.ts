/**
 * Enhanced Design Prompts with Relationship-Aware Instructions
 *
 * Enhanced versions of design prompts that include relationship constraints
 * from the relationship detection system, enabling sophisticated design preservation.
 */

import { TIKTOK_CONSTRAINTS } from "../types/design-types.js";
import type { RelationshipConstraints } from "../types/design-relationships.js";

// ============================================================================
// Enhanced Stage 1 Prompt with Relationship Context
// ============================================================================

/**
 * Builds enhanced Stage 1 prompt with relationship constraints
 */
export function buildStage1PromptWithRelationships(
  nodeTreeJson: string,
  relationshipConstraints?: RelationshipConstraints
): string {
  const basePrompt = `## Task: Analyze this marketing frame and create a TikTok design plan

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
   - Are there face regions that must be preserved?

3. **Typography Hierarchy**
   - Headlines, subheadings, body text, captions
   - What's the reading order and visual flow?
   - Which text has the strongest visual weight?

4. **Content Organization**
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
- How does contrast guide attention?`;

  // Add relationship constraints if available
  if (relationshipConstraints && relationshipConstraints.constraints.length > 0) {
    const relationshipSection = buildRelationshipConstraintSection(relationshipConstraints);
    return basePrompt + "\n\n" + relationshipSection + "\n\n" + getStage1ClosingPrompt();
  }

  return basePrompt + "\n\n" + getStage1ClosingPrompt();
}

/**
 * Builds the relationship constraint section for Stage 1 prompt
 */
function buildRelationshipConstraintSection(constraints: RelationshipConstraints): string {
  const criticalConstraints = constraints.constraints.filter(c => c.priority === 'critical');
  const highConstraints = constraints.constraints.filter(c => c.priority === 'high');

  let section = `---

## STEP 2.5: SOPHISTICATED DESIGN RELATIONSHIPS DETECTED

Advanced analysis has identified sophisticated design relationships in this composition that must be preserved during TikTok transformation:

### Preservation Requirements
The following design relationships have been detected and MUST be maintained while adapting to 9:16 format:

`;

  // Add critical constraints
  if (criticalConstraints.length > 0) {
    section += `#### CRITICAL RELATIONSHIPS (Must Preserve):\n`;
    for (const constraint of criticalConstraints.slice(0, 3)) { // Top 3 critical
      section += `- **${constraint.subtype}**: ${constraint.description}\n`;
      section += `  - Preservation Rule: ${constraint.preservationRule}\n`;
      if (constraint.involvedElements.length > 0) {
        section += `  - Elements: ${constraint.involvedElements.slice(0, 4).join(', ')}${constraint.involvedElements.length > 4 ? '...' : ''}\n`;
      }
      section += `\n`;
    }
  }

  // Add high priority constraints
  if (highConstraints.length > 0) {
    section += `#### HIGH PRIORITY RELATIONSHIPS (Strongly Preserve):\n`;
    for (const constraint of highConstraints.slice(0, 2)) { // Top 2 high
      section += `- **${constraint.subtype}**: ${constraint.description}\n`;
      section += `  - Preservation Rule: ${constraint.preservationRule}\n`;
      section += `\n`;
    }
  }

  // Add adaptation strategy
  section += `### Adaptation Strategy\n`;
  section += `- **Primary Strategy**: ${constraints.adaptationGuidance.primaryStrategy}\n`;
  section += `- **Fallback Strategy**: ${constraints.adaptationGuidance.fallbackStrategy}\n`;
  section += `- **Critical Constraints**: ${constraints.adaptationGuidance.criticalConstraintCount}\n`;

  section += `\n**IMPORTANT**: Your design plan must explicitly address how these relationships will be preserved in the vertical TikTok format. These are not suggestions - they are requirements based on sophisticated compositional analysis.`;

  return section;
}

/**
 * Gets the closing part of Stage 1 prompt
 */
function getStage1ClosingPrompt(): string {
  return `---

## STEP 3: STRATEGIC PLANNING

Based on your visual inventory and design analysis, create a strategic plan:

### Design Strategy
- What's your overall approach for this transformation?
- Which elements need repositioning vs. resizing?
- How will you preserve the marketing message while optimizing for TikTok?

### Layout Zones
Plan your vertical layout using these zones:
- **Top 15%**: Status bar area - avoid key content
- **Hook Zone (15-35%)**: Attention-grabbing content
- **Main Content (35-65%)**: Primary messaging
- **Bottom 35%**: TikTok UI overlay - avoid important elements

### Adaptation Notes
- Which relationships between elements are most important to preserve?
- How will you handle text legibility in the vertical format?
- What's your strategy for maintaining visual hierarchy?

Output your analysis as structured JSON following the provided schema.`;
}

// ============================================================================
// Enhanced Stage 2 Prompt with Relationship Constraints
// ============================================================================

/**
 * Builds enhanced Stage 2 prompt with relationship constraints
 */
export function buildStage2PromptWithRelationships(
  nodeTreeJson: string,
  designPlanJson: string,
  relationshipConstraints?: RelationshipConstraints
): string {
  let prompt = `## Task: Generate detailed positioning specifications for TikTok variant

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
\`\`\``;

  // Add relationship constraints if available
  if (relationshipConstraints && relationshipConstraints.constraints.length > 0) {
    prompt += "\n\n" + buildStage2RelationshipSection(relationshipConstraints);
  }

  prompt += "\n\n" + getStage2ClosingPrompt();

  return prompt;
}

/**
 * Builds relationship constraint section for Stage 2
 */
function buildStage2RelationshipSection(constraints: RelationshipConstraints): string {
  const criticalConstraints = constraints.constraints.filter(c => c.priority === 'critical');
  const highConstraints = constraints.constraints.filter(c => c.priority === 'high');

  let section = `### RELATIONSHIP PRESERVATION CONSTRAINTS

The following design relationships MUST be preserved in your positioning specifications:

`;

  // List all constraints with specific positioning guidance
  const allImportantConstraints = [...criticalConstraints, ...highConstraints].slice(0, 5);

  for (const constraint of allImportantConstraints) {
    section += `#### ${constraint.description}\n`;
    section += `- **Priority**: ${constraint.priority.toUpperCase()}\n`;
    section += `- **Rule**: ${constraint.preservationRule}\n`;

    if (constraint.geometric) {
      if (constraint.geometric.flowDirection !== undefined) {
        section += `- **Flow Direction**: ${constraint.geometric.flowDirection}°\n`;
      }
      if (constraint.geometric.alignmentAxis) {
        section += `- **Alignment**: Maintain ${constraint.geometric.alignmentAxis} alignment\n`;
      }
      if (constraint.geometric.relativePositions) {
        section += `- **Relative Positioning**: Preserve spatial relationships between elements\n`;
      }
    }

    if (constraint.involvedElements.length > 0) {
      section += `- **Elements**: ${constraint.involvedElements.slice(0, 3).join(', ')}${constraint.involvedElements.length > 3 ? ' and others' : ''}\n`;
    }

    section += `\n`;
  }

  section += `**CRITICAL**: These constraints override individual positioning preferences. When positioning elements, respect the relationships identified in the analysis above. Your positioning must maintain these sophisticated design relationships while adapting for the 9:16 vertical format.

`;

  return section;
}

/**
 * Gets the closing part of Stage 2 prompt
 */
function getStage2ClosingPrompt(): string {
  return `## Positioning Guidelines

### TikTok-Specific Requirements
- **Safe Zones**: Keep critical content between 15% and 65% from top
- **Text Legibility**: Minimum ${TIKTOK_CONSTRAINTS.MIN_TEXT_SIZE}px for all text
- **Component Integrity**: Never separate children from INSTANCE parents
- **Text Positioning**: Minimum 40px padding from frame edges

### Workflow
1. Start with critical relationship constraints
2. Position anchor elements and primary subjects first
3. Arrange text hierarchy while respecting relationship rules
4. Apply final safety checks for TikTok overlay zones

### Output Requirements
Generate precise positioning for each node that:
- Preserves all specified relationships
- Maintains text legibility
- Respects TikTok UI overlay zones
- Keeps component instances intact

Output as valid JSON matching the provided schema.`;
}

// ============================================================================
// Enhanced Stage 3 Prompt (if needed)
// ============================================================================

/**
 * Builds enhanced Stage 3 prompt with relationship validation
 */
export function buildStage3PromptWithRelationships(
  originalImageBase64: string,
  generatedImageBase64: string,
  designSpecsJson: string,
  relationshipConstraints?: RelationshipConstraints
): string {
  let prompt = `## Task: Evaluate TikTok design against original and specifications

Compare the generated TikTok variant against the original design and specifications.

### Original Design
[Original marketing frame image provided]

### Generated TikTok Variant
[Generated variant image provided]

### Applied Specifications
\`\`\`json
${designSpecsJson}
\`\`\``;

  if (relationshipConstraints && relationshipConstraints.constraints.length > 0) {
    prompt += "\n\n### Expected Relationship Preservation\n";
    prompt += "Verify that these design relationships were successfully preserved:\n\n";

    const criticalConstraints = relationshipConstraints.constraints.filter(c => c.priority === 'critical');
    for (const constraint of criticalConstraints.slice(0, 3)) {
      prompt += `- **${constraint.description}**: ${constraint.preservationRule}\n`;
    }
  }

  prompt += `\n\nEvaluate the transformation quality and provide feedback following the schema.`;

  return prompt;
}