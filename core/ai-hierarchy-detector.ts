/**
 * Typography hierarchy detection for enhanced AI frame analysis.
 * Analyzes font scales, semantic roles, and consistency patterns
 * to provide deeper understanding of text structure.
 */

declare const figma: PluginAPI;

/**
 * Typography hierarchy analysis result.
 */
export interface TypographyHierarchy {
  readonly scale: "major-second" | "minor-third" | "major-third" | "perfect-fourth" | "custom";
  readonly baseSize: number;
  readonly levels: readonly TypographyLevel[];
  readonly problems: readonly TypographyProblem[];
}

/**
 * Individual typography level in the hierarchy.
 */
export interface TypographyLevel {
  readonly fontSize: number;
  readonly fontWeight: number;
  readonly role: "display" | "h1" | "h2" | "h3" | "h4" | "body" | "caption" | "label";
  readonly usage: readonly string[]; // Node IDs using this level
  readonly instances: number; // Number of nodes using this level
  readonly consistency: number; // 0-1 how consistently this level is used
}

/**
 * Typography hierarchy problems detected.
 */
export interface TypographyProblem {
  readonly type: "font-size-gap" | "weight-inconsistency" | "hierarchy-skip" | "insufficient-contrast";
  readonly nodeIds: readonly string[];
  readonly severity: "low" | "medium" | "high";
  readonly description: string;
}

/**
 * Typography scale ratios for common design systems.
 */
const TYPOGRAPHY_SCALES = {
  "major-second": 1.125,   // 9:8
  "minor-third": 1.2,      // 6:5
  "major-third": 1.25,     // 5:4
  "perfect-fourth": 1.333, // 4:3
} as const;

/**
 * Analyzes typography hierarchy across all text nodes in a frame.
 * Detects font scales, semantic roles, and consistency issues.
 */
export function analyzeTypographyHierarchy(textNodes: TextNode[]): TypographyHierarchy {
  if (textNodes.length === 0) {
    return {
      scale: "custom",
      baseSize: 16,
      levels: [],
      problems: []
    };
  }

  // Group text nodes by font properties
  const textGroups = groupByFontProperties(textNodes);

  // Sort by fontSize (largest to smallest)
  const sortedGroups = textGroups.sort((a, b) => b.fontSize - a.fontSize);

  // Detect if following a consistent scale
  const fontSizes = sortedGroups.map(g => g.fontSize);
  const detectedScale = detectTypographicScale(fontSizes);
  const baseSize = findBaseSize(sortedGroups);

  // Assign semantic roles based on size relationships and usage patterns
  const levels = sortedGroups.map((group, index) => ({
    fontSize: group.fontSize,
    fontWeight: group.fontWeight,
    role: inferTextRole(group, index, sortedGroups),
    usage: group.nodeIds,
    instances: group.nodeIds.length,
    consistency: calculateUsageConsistency(group, textNodes)
  }));

  // Identify hierarchy problems
  const problems = detectHierarchyProblems(levels, textNodes);

  return {
    scale: detectedScale,
    baseSize,
    levels,
    problems
  };
}

/**
 * Groups text nodes by font size and weight for hierarchy analysis.
 */
function groupByFontProperties(textNodes: TextNode[]): Array<{
  fontSize: number;
  fontWeight: number;
  nodeIds: string[];
  totalCharacters: number;
  averageCharacterLength: number;
}> {
  const groups = new Map<string, {
    fontSize: number;
    fontWeight: number;
    nodeIds: string[];
    characters: string[];
  }>();

  for (const node of textNodes) {
    // Handle mixed fonts by taking the dominant size/weight
    const fontSize = node.fontSize === figma.mixed ? 16 : Math.round(node.fontSize as number);
    const fontWeight = node.fontName === figma.mixed ? 400 : getFontWeight(node.fontName as FontName);

    const key = `${fontSize}-${fontWeight}`;

    if (!groups.has(key)) {
      groups.set(key, {
        fontSize,
        fontWeight,
        nodeIds: [],
        characters: []
      });
    }

    const group = groups.get(key)!;
    group.nodeIds.push(node.id);
    group.characters.push(node.characters);
  }

  return Array.from(groups.values()).map(group => ({
    fontSize: group.fontSize,
    fontWeight: group.fontWeight,
    nodeIds: group.nodeIds,
    totalCharacters: group.characters.join('').length,
    averageCharacterLength: group.characters.reduce((sum, chars) => sum + chars.length, 0) / group.characters.length
  }));
}

/**
 * Attempts to detect a consistent typographic scale from font sizes.
 */
function detectTypographicScale(fontSizes: number[]): TypographyHierarchy["scale"] {
  if (fontSizes.length < 3) return "custom";

  // Calculate ratios between consecutive font sizes
  const ratios: number[] = [];
  for (let i = 0; i < fontSizes.length - 1; i++) {
    const ratio = fontSizes[i] / fontSizes[i + 1];
    ratios.push(ratio);
  }

  // Find the scale that best matches the ratios
  let bestMatch: TypographyHierarchy["scale"] = "custom";
  let bestScore = 0;

  for (const [scaleName, scaleRatio] of Object.entries(TYPOGRAPHY_SCALES)) {
    const score = calculateScaleMatchScore(ratios, scaleRatio);
    if (score > bestScore && score > 0.7) { // Require 70% confidence
      bestScore = score;
      bestMatch = scaleName as keyof typeof TYPOGRAPHY_SCALES;
    }
  }

  return bestMatch;
}

/**
 * Calculates how well a set of ratios matches a target scale ratio.
 */
function calculateScaleMatchScore(ratios: number[], targetRatio: number): number {
  if (ratios.length === 0) return 0;

  const tolerance = 0.1; // 10% tolerance
  let matches = 0;

  for (const ratio of ratios) {
    if (Math.abs(ratio - targetRatio) <= tolerance) {
      matches++;
    }
  }

  return matches / ratios.length;
}

/**
 * Finds the likely base font size from typography groups.
 */
function findBaseSize(groups: Array<{ fontSize: number; totalCharacters: number }>): number {
  // Base size is often the most used medium-sized font
  let maxUsage = 0;
  let baseSize = 16; // Default fallback

  for (const group of groups) {
    // Prefer fonts in the "body text" range (14-18px) with high usage
    if (group.fontSize >= 14 && group.fontSize <= 18 && group.totalCharacters > maxUsage) {
      maxUsage = group.totalCharacters;
      baseSize = group.fontSize;
    }
  }

  return baseSize;
}

/**
 * Infers semantic role for a typography group based on size and usage.
 */
function inferTextRole(
  group: { fontSize: number; fontWeight: number; averageCharacterLength: number },
  index: number,
  allGroups: Array<{ fontSize: number; fontWeight: number; averageCharacterLength: number }>
): TypographyLevel["role"] {
  const { fontSize, averageCharacterLength } = group;

  // Largest font is likely display or H1
  if (index === 0) {
    return fontSize >= 32 ? "display" : "h1";
  }

  // Very large fonts are likely headings
  if (fontSize >= 28) return "h1";
  if (fontSize >= 24) return "h2";
  if (fontSize >= 20) return "h3";
  if (fontSize >= 18) return "h4";

  // Consider usage patterns
  if (averageCharacterLength < 20) {
    // Short text suggests labels or captions
    return fontSize < 14 ? "caption" : "label";
  }

  if (averageCharacterLength > 100) {
    // Long text suggests body content
    return "body";
  }

  // Medium-length text in medium size range
  if (fontSize >= 14) return "body";
  return "caption";
}

/**
 * Calculates usage consistency for a typography group.
 */
function calculateUsageConsistency(
  group: { nodeIds: string[]; fontSize: number; fontWeight: number },
  allTextNodes: TextNode[]
): number {
  // Consistency is based on:
  // 1. How many instances use this exact size/weight combination
  // 2. Whether similar sizes are used for the same semantic purpose

  const instanceCount = group.nodeIds.length;
  const totalSimilarSizes = allTextNodes.filter(node => {
    const nodeSize = node.fontSize === figma.mixed ? 16 : Math.round(node.fontSize as number);
    return Math.abs(nodeSize - group.fontSize) <= 2; // Within 2px
  }).length;

  // High consistency if this exact combination is used frequently
  // and there aren't many similar sizes competing
  const exactUsageRatio = instanceCount / Math.max(totalSimilarSizes, 1);
  const frequencyBonus = Math.min(instanceCount / 3, 1); // Bonus for frequent use

  return Math.min(exactUsageRatio * 0.7 + frequencyBonus * 0.3, 1);
}

/**
 * Detects typography hierarchy problems and inconsistencies.
 */
function detectHierarchyProblems(
  levels: readonly TypographyLevel[],
  textNodes: TextNode[]
): readonly TypographyProblem[] {
  const problems: TypographyProblem[] = [];

  // Check for font size gaps (e.g., 32px → 16px with no intermediate sizes)
  const fontSizeGaps = findFontSizeGaps(levels);
  problems.push(...fontSizeGaps);

  // Check for weight inconsistencies within the same role
  const weightInconsistencies = findWeightInconsistencies(levels);
  problems.push(...weightInconsistencies);

  // Check for hierarchy skips (e.g., H1 → H3 without H2)
  const hierarchySkips = findHierarchySkips(levels);
  problems.push(...hierarchySkips);

  // Check for insufficient contrast (if we had color information)
  // This would require color analysis from the parent frame
  // const contrastIssues = findContrastIssues(textNodes);
  // problems.push(...contrastIssues);

  return problems;
}

/**
 * Finds problematic gaps in font sizes.
 */
function findFontSizeGaps(levels: readonly TypographyLevel[]): TypographyProblem[] {
  const problems: TypographyProblem[] = [];
  const sortedLevels = [...levels].sort((a, b) => b.fontSize - a.fontSize);

  for (let i = 0; i < sortedLevels.length - 1; i++) {
    const current = sortedLevels[i];
    const next = sortedLevels[i + 1];
    const ratio = current.fontSize / next.fontSize;

    // Flag large gaps (>2x) as potential problems
    if (ratio > 2.0 && current.fontSize - next.fontSize > 8) {
      problems.push({
        type: "font-size-gap",
        nodeIds: [...current.usage, ...next.usage],
        severity: "medium",
        description: `Large gap between ${current.fontSize}px and ${next.fontSize}px (${ratio.toFixed(1)}x difference)`
      });
    }
  }

  return problems;
}

/**
 * Finds weight inconsistencies within semantic roles.
 */
function findWeightInconsistencies(levels: readonly TypographyLevel[]): TypographyProblem[] {
  const problems: TypographyProblem[] = [];
  const roleGroups = new Map<string, TypographyLevel[]>();

  // Group levels by role
  for (const level of levels) {
    if (!roleGroups.has(level.role)) {
      roleGroups.set(level.role, []);
    }
    roleGroups.get(level.role)!.push(level);
  }

  // Check each role for weight consistency
  for (const [role, roleLevels] of roleGroups) {
    if (roleLevels.length > 1) {
      const weights = roleLevels.map(l => l.fontWeight);
      const uniqueWeights = new Set(weights);

      if (uniqueWeights.size > 1) {
        const allNodeIds = roleLevels.flatMap(l => l.usage);
        problems.push({
          type: "weight-inconsistency",
          nodeIds: allNodeIds,
          severity: "low",
          description: `Inconsistent font weights for ${role}: ${Array.from(uniqueWeights).join(', ')}`
        });
      }
    }
  }

  return problems;
}

/**
 * Finds semantic hierarchy skips (e.g., H1 → H3).
 */
function findHierarchySkips(levels: readonly TypographyLevel[]): TypographyProblem[] {
  const problems: TypographyProblem[] = [];
  const headingRoles = ["h1", "h2", "h3", "h4"];
  const presentHeadings = new Set(levels.map(l => l.role).filter(role => headingRoles.includes(role)));

  // Check for skipped heading levels
  const headingNumbers = Array.from(presentHeadings).map(role => parseInt(role.replace('h', '')));
  headingNumbers.sort((a, b) => a - b);

  for (let i = 0; i < headingNumbers.length - 1; i++) {
    const current = headingNumbers[i];
    const next = headingNumbers[i + 1];

    if (next - current > 1) {
      const skippedLevels = [];
      for (let skip = current + 1; skip < next; skip++) {
        skippedLevels.push(`h${skip}`);
      }

      const currentLevel = levels.find(l => l.role === `h${current}`);
      const nextLevel = levels.find(l => l.role === `h${next}`);

      if (currentLevel && nextLevel) {
        problems.push({
          type: "hierarchy-skip",
          nodeIds: [...currentLevel.usage, ...nextLevel.usage],
          severity: "medium",
          description: `Hierarchy skip from ${currentLevel.role} to ${nextLevel.role}, missing: ${skippedLevels.join(', ')}`
        });
      }
    }
  }

  return problems;
}

/**
 * Extracts font weight from Figma FontName.
 */
function getFontWeight(fontName: FontName): number {
  const style = fontName.style.toLowerCase();

  if (style.includes('thin') || style.includes('100')) return 100;
  if (style.includes('extralight') || style.includes('200')) return 200;
  if (style.includes('light') || style.includes('300')) return 300;
  if (style.includes('medium') || style.includes('500')) return 500;
  if (style.includes('semibold') || style.includes('600')) return 600;
  if (style.includes('bold') || style.includes('700')) return 700;
  if (style.includes('extrabold') || style.includes('800')) return 800;
  if (style.includes('black') || style.includes('900')) return 900;

  // Default to regular/normal
  return 400;
}