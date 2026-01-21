/**
 * Dynamic prompt engineering for context-aware AI analysis.
 * Generates intelligent prompts based on detected layout structure,
 * typography hierarchy, content relationships, and target specifications.
 */

import type { LayoutStructureAnalysis, ContentRelationship, ColorThemeAnalysis } from "../types/ai-signals.js";
import type { TypographyHierarchy } from "./ai-hierarchy-detector.js";
import type { GridDetectionResult } from "./ai-layout-grid-detector.js";

/**
 * Enhanced AI request with structural analysis context.
 */
export interface EnhancedAiRequest {
  // Visual component (unchanged)
  readonly image: string; // Base64 PNG export at 1024px max

  // Enhanced structural component
  readonly structuralAnalysis: {
    readonly layoutStructure?: LayoutStructureAnalysis;
    readonly typographyHierarchy?: TypographyHierarchy;
    readonly contentRelationships?: readonly ContentRelationship[];
    readonly gridSystem?: GridDetectionResult;
    readonly colorTheme?: ColorThemeAnalysis;
    readonly analysisMetadata: {
      readonly nodesCaptured: number;
      readonly totalNodes: number;
      readonly depthReached: number;
      readonly priorityScore: number;
    };
  };

  // Context-aware prompt
  readonly prompt: string; // Dynamically generated based on structural findings
}

/**
 * Generates context-aware prompts based on enhanced frame understanding.
 * Adapts the AI analysis guidance based on detected layout patterns,
 * typography hierarchy, and content relationships.
 */
export function generateContextAwarePrompt(
  structuralAnalysis: EnhancedAiRequest["structuralAnalysis"],
  targetId?: string
): string {
  let prompt = getEnhancedSystemPrompt();

  // Add grid-specific context
  if (structuralAnalysis.gridSystem?.hasGridSystem) {
    prompt += generateGridContext(structuralAnalysis.gridSystem);
  }

  // Add typography hierarchy context
  if (structuralAnalysis.typographyHierarchy) {
    prompt += generateTypographyContext(structuralAnalysis.typographyHierarchy);
  }

  // Add content relationship context
  if (structuralAnalysis.contentRelationships && structuralAnalysis.contentRelationships.length > 0) {
    prompt += generateRelationshipContext(structuralAnalysis.contentRelationships);
  }

  // Add color theme context
  if (structuralAnalysis.colorTheme) {
    prompt += generateColorContext(structuralAnalysis.colorTheme);
  }

  // Add analysis depth context
  prompt += generateAnalysisDepthContext(structuralAnalysis.analysisMetadata);

  // Add target-specific context if provided
  if (targetId) {
    prompt += generateTargetSpecificContext(targetId, structuralAnalysis);
  }

  return prompt;
}

/**
 * Enhanced system prompt with structural analysis capabilities.
 */
function getEnhancedSystemPrompt(): string {
  return `You are analyzing a marketing design frame with both visual and structural context.

## OUTPUT FORMAT
Return ONLY valid JSON with this exact structure:
{
  "signals": {
    "roles": [{"nodeId", "role", "confidence"}],
    "focalPoints": [{"nodeId", "x", "y", "confidence"}],
    "qa": [{"code", "severity", "message", "confidence"}],
    "faceRegions": [{"nodeId", "x", "y", "width", "height", "confidence"}]
  },
  "layoutAdvice": {
    "entries": [{
      "targetId": "string",
      "selectedId": "pattern-id",
      "score": 0.0-1.0,
      "suggestedLayoutMode": "HORIZONTAL"|"VERTICAL"|"NONE",
      "backgroundNodeId": "node-id",
      "description": "rationale",
      "restructure": { "drop": ["nodeId"], "textTreatment": "single-line"|"wrap" },
      "positioning": {
        "EVERY_NODE_ID": {
          "visible": true|false,
          "anchor": "top-left"|"top-center"|"top-right"|"center-left"|"center"|"center-right"|"bottom-left"|"bottom-center"|"bottom-right"|"fill",
          "offset": { "top": number, "left": number, "right": number, "bottom": number, "fromSafeArea": boolean },
          "size": { "mode": "auto"|"fixed"|"fill", "width": number, "height": number },
          "text": { "targetFontSize": number, "maxLines": number, "textAlign": "left"|"center"|"right" },
          "image": { "fit": "cover"|"contain", "allowBleed": boolean, "bleedAnchor": "left"|"right"|"top"|"bottom" },
          "rationale": "Face at [X,Y]. [Positioning explanation]"
        }
      }
    }]
  }
}

## FRAME ANALYSIS DATA
You will receive:
1. **Visual Image**: PNG export of the frame for visual pattern recognition
2. **Structural Analysis**: Detailed breakdown of layout, typography, content relationships
3. **Grid System**: Column structure, spacing, alignment patterns (if detected)
4. **Typography Hierarchy**: Font scales, semantic roles, consistency metrics
5. **Content Relationships**: Spatial groupings, reading order, visual weight

## ENHANCED ROLE CLASSIFICATION
Use both visual cues AND structural data for role assignment:

**Visual Indicators** (from image):
- Position, color, visual prominence
- Face detection for portraits
- Image content and composition
- Overall visual balance

**Structural Indicators** (from analysis):
- Typography hierarchy position (H1, H2, body, etc.)
- Grid position and spanning
- Content relationship membership
- Color palette role assignment

**Combined Analysis Examples:**
- Large text + top grid position + highest font size = likely "title"
- Button-like visual + CTA color + end of reading flow = likely "cta"
- Image fill + large area + hero grid position = likely "hero_image"

## LAYOUT PATTERN RECOMMENDATIONS
Consider structural context when suggesting patterns:

**Grid-Aware Patterns:**
- For 12-column grids: prefer "split-left", "split-right", "banner-spread"
- For single-column: prefer "vertical-stack", "centered-stack"
- For manual layouts: prefer "preserve-layout" unless clear grid detected

**Hierarchy-Aware Patterns:**
- Strong typography hierarchy: leverage "text-first", "hero-first" patterns
- Weak hierarchy: suggest "compact-vertical" with typography improvements
- Complex hierarchy: recommend "preserve-layout" to maintain relationships

**Relationship-Aware Patterns:**
- Text-image pairs detected: prefer "split-left/right" patterns
- Feature trios: suggest "horizontal-stack" or "banner-spread"
- CTA groupings: ensure patterns preserve button prominence

## QA SIGNALS WITH CONTEXT
Enhanced QA analysis using structural understanding:

**Typography QA:**
- Check font size hierarchy consistency against detected scale
- Validate contrast ratios using color theme analysis
- Flag hierarchy skips (H1 → H3) from typography analysis

**Layout QA:**
- Grid alignment warnings from grid system analysis
- Content density issues from relationship analysis
- Reading flow disruption warnings

**Target-Specific QA:**
- Grid adaptation warnings for extreme aspect ratios
- Typography scaling warnings based on hierarchy analysis
- Content relationship preservation alerts
`;
}

/**
 * Generates grid-specific context for the AI prompt.
 */
function generateGridContext(gridSystem: GridDetectionResult): string {
  return `

## GRID CONTEXT
This design uses a **${gridSystem.gridType}** with ${gridSystem.columnCount} columns and ${gridSystem.gutterWidth}px gutters. Elements are ${gridSystem.alignment}-aligned with ${(gridSystem.confidence * 100).toFixed(0)}% confidence.

**Grid-Aware Directives:**
- **MUST** respect the ${gridSystem.columnCount}-column structure for main content.
- **MUST** align key elements (Logo, CTA) to the detected grid lines.
- Note gutter consistency: ${gridSystem.gutterWidth > 0 ? `${gridSystem.gutterWidth}px gaps detected` : 'irregular spacing'}
- Grid confidence: ${gridSystem.confidence >= 0.8 ? 'HIGH - strong grid structure' : gridSystem.confidence >= 0.6 ? 'MEDIUM - some grid patterns' : 'LOW - weak grid structure'}

**Layout Pattern Guidance:**
${gridSystem.gridType === "12-column" ?
  '- Favor "split-left", "split-right", or "banner-spread" patterns that work with 12-column structure' :
  gridSystem.gridType === "flex" ?
  '- Consider "horizontal-stack" or flexible patterns that adapt to content flow' :
  '- Be cautious with rigid patterns; "preserve-layout" may be safer'
}`;
}

/**
 * Generates typography hierarchy context for the AI prompt.
 */
function generateTypographyContext(typography: TypographyHierarchy): string {
  const scaleDescription = typography.scale === "custom" ? "custom scale" : `${typography.scale} scale`;
  const hierarchyLevels = typography.levels.map(level =>
    `${level.role}:${level.fontSize}px (${level.instances} uses, ${(level.consistency * 100).toFixed(0)}% consistent)`
  ).join(', ');

  let problemWarnings = '';
  if (typography.problems.length > 0) {
    const highSeverityProblems = typography.problems.filter(p => p.severity === "high");
    const mediumSeverityProblems = typography.problems.filter(p => p.severity === "medium");

    if (highSeverityProblems.length > 0) {
      problemWarnings += `\n- **CRITICAL ISSUES**: ${highSeverityProblems.map(p => p.description).join('; ')}`;
    }
    if (mediumSeverityProblems.length > 0) {
      problemWarnings += `\n- **WARNINGS**: ${mediumSeverityProblems.map(p => p.description).join('; ')}`;
    }
  }

  return `

## TYPOGRAPHY CONTEXT
Uses **${scaleDescription}** with base size ${typography.baseSize}px. Hierarchy levels: ${hierarchyLevels}.

**Typography Directives:**
- **MUST MATCH** the established hierarchy roles (H1, H2, Body) in all variants.
- **DO NOT** invent new font sizes unless scaling proportionally.
- **MAINTAIN** weight consistency: H1 is ${typography.levels.find(l => l.role === 'h1')?.fontWeight || 'variable'}.
- Scale consistency: ${typography.scale !== "custom" ? `Strong ${typography.scale} progression` : 'Custom scale - analyze for gaps'}${problemWarnings}

**Scaling Recommendations:**
${typography.levels.some(l => l.fontSize < 12) ?
  '- CAUTION: Some text already small (<12px) - watch for legibility issues in thumbnails' :
  '- Typography has good minimum sizes - should scale well to smaller targets'
}`;
}

/**
 * Generates content relationship context for the AI prompt.
 */
function generateRelationshipContext(relationships: readonly ContentRelationship[]): string {
  const relationshipSummary = relationships.map(rel =>
    `${rel.type} (confidence: ${(rel.confidence * 100).toFixed(0)}%, weight: ${(rel.visualWeight * 100).toFixed(0)}%)`
  ).join(', ');

  const textImagePairs = relationships.filter(r => r.type === "text-image-pair").length;
  const featureGroups = relationships.filter(r => r.type === "feature-trio").length;
  const ctaGroups = relationships.filter(r => r.type === "cta-group").length;

  return `

## CONTENT RELATIONSHIPS
Detected ${relationships.length} content groupings: ${relationshipSummary}.

**Relationship Directives:**
${textImagePairs > 0 ? `- **${textImagePairs} Text-Image Pairs**: MUST preserve spatial proximity. Do not separate image from its caption/heading.` : ''}
${featureGroups > 0 ? `- **${featureGroups} Feature Groups**: MUST maintain consistent spacing and alignment as a unit.` : ''}
${ctaGroups > 0 ? `- **${ctaGroups} CTA Groups**: **CRITICAL** - Keep action buttons grouped with their labels. Do not split.` : ''}

**Layout Pattern Implications:**
${textImagePairs > 0 ? '- Text-image pairs favor "split-left/right" or "hero-first" patterns' : ''}
${featureGroups > 0 ? '- Feature groups work well with "horizontal-stack" or grid-based patterns' : ''}
${ctaGroups > 0 ? '- CTA groups require patterns that preserve button hierarchy and proximity' : ''}

**Preservation Priority:**
- Reading order: Content flows from top-left to bottom-right
- Visual weight: Focus on high-weight relationships (>70% visual weight)
- Confidence: Prioritize high-confidence relationships (>80%) for layout decisions`;
}

/**
 * Generates color theme context for the AI prompt.
 */
function generateColorContext(colorTheme: ColorThemeAnalysis): string {
  const primaryColors = colorTheme.palette.filter(c => c.usage === "primary" || c.usage === "accent");
  const brandColors = primaryColors.map(c => c.hex).join(', ');

  const contrastIssues = colorTheme.contrast.textBackgroundPairs.filter(pair => pair.wcagLevel === "fail");

  return `

## COLOR THEME CONTEXT
Color harmony: **${colorTheme.harmony.type}** (${(colorTheme.harmony.score * 100).toFixed(0)}% harmonious).
${brandColors ? `Brand colors: ${brandColors}.` : 'No clear brand colors detected.'}
Average contrast: ${colorTheme.contrast.averageContrast.toFixed(1)}:1.

**Color-Aware Analysis:**
${colorTheme.brand.hasConsistentBranding ?
  `- **Consistent branding detected**: ${colorTheme.brand.brandColorUsage} usage pattern` :
  '- **No consistent branding**: Consider brand color recommendations'
}
${contrastIssues.length > 0 ?
  `- **ACCESSIBILITY CONCERN**: ${contrastIssues.length} text elements fail WCAG contrast requirements` :
  '- **Good accessibility**: All text meets WCAG contrast standards'
}
- Color harmony is ${colorTheme.harmony.score >= 0.8 ? 'excellent' : colorTheme.harmony.score >= 0.6 ? 'good' : 'needs improvement'}

**QA Signal Guidance:**
- Flag any additional contrast issues you detect visually
- Consider color accessibility for different target contexts
- Recommend brand color consistency improvements if needed`;
}

/**
 * Generates analysis depth context for the AI prompt.
 */
function generateAnalysisDepthContext(metadata: EnhancedAiRequest["structuralAnalysis"]["analysisMetadata"]): string {
  const coveragePercent = (metadata.nodesCaptured / metadata.totalNodes * 100).toFixed(0);

  return `

## ANALYSIS DEPTH
Captured ${metadata.nodesCaptured}/${metadata.totalNodes} nodes (${coveragePercent}% coverage).
Reached depth ${metadata.depthReached}, priority score: ${metadata.priorityScore.toFixed(1)}.

**Analysis Completeness:**
${metadata.nodesCaptured >= 50 ?
  '- **Comprehensive analysis**: High node count enables detailed understanding' :
  metadata.nodesCaptured >= 30 ?
  '- **Good analysis**: Sufficient nodes for reliable insights' :
  '- **Limited analysis**: Focus on highest-priority elements only'
}
- Depth ${metadata.depthReached}: ${metadata.depthReached >= 6 ? 'Deep nesting analyzed' : 'Surface-level analysis'}
- Priority scoring: ${metadata.priorityScore >= 50 ? 'High-value content' : 'Mixed content priority'}`;
}

/**
 * Generates target-specific context for the AI prompt.
 */
function generateTargetSpecificContext(
  targetId: string,
  structuralAnalysis: EnhancedAiRequest["structuralAnalysis"]
): string {
  switch (targetId) {
    case "tiktok-vertical":
      return generateTikTokContext(structuralAnalysis);
    case "figma-thumbnail":
      return generateThumbnailContext(structuralAnalysis);
    case "youtube-cover":
      return generateYouTubeContext(structuralAnalysis);
    case "web-hero":
      return generateWebHeroContext(structuralAnalysis);
    default:
      return generateGenericTargetContext(targetId, structuralAnalysis);
  }
}

/**
 * Generates TikTok-specific analysis context.
 */
function generateTikTokContext(analysis: EnhancedAiRequest["structuralAnalysis"]): string {
  const gridColumns = analysis.gridSystem?.columnCount || 0;
  const hierarchyLevels = analysis.typographyHierarchy?.levels.length || 0;
  const relationships = analysis.contentRelationships?.length || 0;

  return `

## TIKTOK CONTEXT (1080×1920 - 9:16 vertical)
**Transformation Challenge:** ${gridColumns > 1 ? `${gridColumns} columns → single vertical stack` : 'Maintaining vertical flow'}

**Layout Adaptation:**
${analysis.gridSystem?.hasGridSystem ?
  `- Grid system (${analysis.gridSystem.gridType}) will collapse to single column` :
  '- Manual layout needs vertical flow optimization'
}
${hierarchyLevels >= 4 ?
  `- Typography hierarchy (${hierarchyLevels} levels) must remain legible at mobile scale` :
  '- Limited typography hierarchy works well for vertical format'
}
${relationships > 0 ?
  `- Content relationships (${relationships} groups) to preserve in vertical stacking` :
  '- No complex relationships to preserve'
}

**Platform Constraints:**
- **UI Exclusion Zones**: Top 108px, bottom 320px avoid text placement
- **Minimum Text**: 18px+ after scaling for mobile readability
- **Recommended Patterns**: "centered-stack", "hero-first", "vertical-stack"
- **Content Priority**: Mobile-first hierarchy, large visual impact

**QA Focus Areas:**
- Text legibility after vertical compression
- Platform UI overlap warnings
- Mobile touch target sizes (44px minimum)`;
}

/**
 * Generates thumbnail-specific analysis context.
 */
function generateThumbnailContext(analysis: EnhancedAiRequest["structuralAnalysis"]): string {
  const legibleLevels = analysis.typographyHierarchy?.levels.filter(l => l.fontSize > 14).length || 0;
  const highWeightRelationships = analysis.contentRelationships?.filter(r => r.visualWeight > 0.7).length || 0;

  return `

## THUMBNAIL CONTEXT (480×320 - extreme scaling)
**Extreme Scaling Challenge:** Massive size reduction requires content prioritization

**Content Simplification:**
${analysis.typographyHierarchy ?
  `- Typography: Only ${legibleLevels}/${analysis.typographyHierarchy.levels.length} levels will be legible after scaling` :
  '- Typography analysis unavailable - focus on largest text elements'
}
${analysis.gridSystem?.hasGridSystem ?
  `- Grid simplification: ${analysis.gridSystem.columnCount} columns → likely single column` :
  '- No grid system detected - manual layout prioritization needed'
}
${highWeightRelationships > 0 ?
  `- Content priority: Focus on ${highWeightRelationships} high-weight relationships only` :
  '- No high-weight relationships - prioritize largest elements'
}

**Thumbnail Requirements:**
- **Essential Elements Only**: Logo, primary image, key text
- **Minimum Text Size**: 9px after scaling (thumbnail legibility threshold)
- **Recommended Patterns**: "compact-vertical", "preserve-layout" (if simple)
- **Visual Impact**: High contrast, minimal complexity

**Critical QA Checks:**
- Text readability at final size
- Element overcrowding warnings
- Essential brand element preservation`;
}

/**
 * Generates YouTube cover-specific analysis context.
 */
function generateYouTubeContext(analysis: EnhancedAiRequest["structuralAnalysis"]): string {
  return `

## YOUTUBE CONTEXT (2560×1440 - 16:9 widescreen)
**Wide Format Optimization:** Leverage horizontal space while respecting safe zones

**Platform Constraints:**
- **Safe Zone**: Center content, avoid bottom 240px on mobile
- **Aspect Advantage**: Wide format perfect for "split-left/right", "banner-spread"
- **Branding Focus**: Channel branding prominence important
- **Text Scale**: Large text works well at this size

**Layout Optimization:**
${analysis.gridSystem?.hasGridSystem ?
  '- Grid system adapts well to wide format - maintain proportions' :
  '- Manual layout can leverage full width effectively'
}
- Typography can be scaled up for impact
- Multiple content sections work well horizontally

**Recommended Patterns:** "split-left", "split-right", "banner-spread", "layered-hero"`;
}

/**
 * Generates web hero banner-specific analysis context.
 */
function generateWebHeroContext(analysis: EnhancedAiRequest["structuralAnalysis"]): string {
  return `

## WEB HERO CONTEXT (1440×600 - wide banner)
**Banner Format:** Optimized for web hero sections and landing page headers

**Layout Strengths:**
- Wide aspect ratio perfect for "banner-spread" and "split-left/right" patterns
- Good typography scaling for web readability
- Multiple content sections can be distributed horizontally
- Strong branding and CTA placement opportunities

${analysis.contentRelationships?.some(r => r.type === "text-image-pair") ?
  '- Text-image pairs work excellently in this format' : ''
}

**Recommended Patterns:** "banner-spread", "split-left", "split-right", "layered-hero"`;
}

/**
 * Generates generic target-specific context.
 */
function generateGenericTargetContext(
  targetId: string,
  analysis: EnhancedAiRequest["structuralAnalysis"]
): string {
  return `

## TARGET CONTEXT (${targetId})
Analyze this design for optimization to ${targetId} format.

**Consider:**
- Aspect ratio adaptation requirements
- Platform-specific constraints (if applicable)
- Content prioritization for target size
- Typography scaling implications
- Layout pattern suitability

**Provide target-specific QA signals for potential issues.**`;
}