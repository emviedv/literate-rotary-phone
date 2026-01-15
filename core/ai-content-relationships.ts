/**
 * Content relationship mapping and spatial proximity analysis.
 * Detects logical groupings and relationships between design elements
 * to understand content structure and preserve spatial relationships.
 */

import type { ContentRelationship } from "../types/ai-signals.js";

/**
 * Proximity thresholds for relationship detection.
 */
const PROXIMITY_CONFIG = {
  TEXT_IMAGE_THRESHOLD: 120,    // Max distance for text-image pairing (px)
  FEATURE_GROUP_THRESHOLD: 80,  // Max distance for feature grouping (px)
  CTA_GROUP_THRESHOLD: 60,      // Max distance for CTA grouping (px)
  ALIGNMENT_THRESHOLD: 0.7,     // Min alignment score (0-1)
  MIN_CONFIDENCE: 0.6           // Min confidence to report relationship
} as const;

/**
 * Detects content relationships and spatial groupings in a frame.
 * Analyzes proximity, alignment, and visual patterns to identify logical groups.
 */
export function detectContentRelationships(
  nodes: readonly SceneNode[],
  frameWidth: number,
  frameHeight: number
): readonly ContentRelationship[] {
  const relationships: ContentRelationship[] = [];
  const frameBounds = { x: 0, y: 0, width: frameWidth, height: frameHeight };

  // Find text-image pairs (common in marketing content)
  const textImagePairs = findTextImagePairs(nodes, frameBounds);
  relationships.push(...textImagePairs);

  // Find feature groupings (3-4 items with similar layout)
  const featureGroups = findFeatureGroups(nodes, frameBounds);
  relationships.push(...featureGroups);

  // Find CTA groupings (primary + secondary buttons)
  const ctaGroups = findCTAGroups(nodes, frameBounds);
  relationships.push(...ctaGroups);

  // Find list item patterns
  const listItems = findListItems(nodes, frameBounds);
  relationships.push(...listItems);

  // Find testimonial blocks
  const testimonialBlocks = findTestimonialBlocks(nodes, frameBounds);
  relationships.push(...testimonialBlocks);

  // Sort by reading order
  return relationships
    .filter(rel => rel.confidence >= PROXIMITY_CONFIG.MIN_CONFIDENCE)
    .sort((a, b) => a.readingOrder - b.readingOrder);
}

/**
 * Finds text-image pairs based on spatial proximity and alignment.
 */
function findTextImagePairs(
  nodes: readonly SceneNode[],
  frame: { width: number; height: number }
): ContentRelationship[] {
  const textNodes = nodes.filter(n => n.type === "TEXT" && n.visible);
  const imageNodes = nodes.filter(n => hasImageFills(n) && n.visible);
  const pairs: ContentRelationship[] = [];

  for (const textNode of textNodes) {
    for (const imageNode of imageNodes) {
      const textBounds = getNodeBounds(textNode);
      const imageBounds = getNodeBounds(imageNode);

      if (!textBounds || !imageBounds) continue;

      const distance = calculateDistance(textBounds, imageBounds);
      const alignment = checkAlignment(textBounds, imageBounds);

      if (distance <= PROXIMITY_CONFIG.TEXT_IMAGE_THRESHOLD &&
          alignment >= PROXIMITY_CONFIG.ALIGNMENT_THRESHOLD) {

        const confidence = calculatePairConfidence(textBounds, imageBounds, distance, alignment);
        const primaryNode = determinePrimaryNode(textNode, imageNode);
        const bounds = calculateBoundingBox([textBounds, imageBounds]);
        const visualWeight = calculateCombinedWeight(textBounds, imageBounds, frame);
        const readingOrder = calculateReadingOrder(textBounds, frame);

        pairs.push({
          type: "text-image-pair",
          nodeIds: [textNode.id, imageNode.id],
          primaryNode,
          bounds,
          confidence,
          visualWeight,
          readingOrder
        });
      }
    }
  }

  return pairs;
}

/**
 * Finds feature groupings (typically 3-4 similar elements in a row/grid).
 */
function findFeatureGroups(
  nodes: readonly SceneNode[],
  frame: { width: number; height: number }
): ContentRelationship[] {
  const groups: ContentRelationship[] = [];
  const containerNodes = nodes.filter(n => "children" in n && n.visible);

  for (const container of containerNodes) {
    const children = (container as any).children as readonly SceneNode[];
    if (children.length < 3 || children.length > 6) continue;

    // Check if children are similar in size and spacing
    const childBounds = children
      .map(child => getNodeBounds(child))
      .filter((bounds): bounds is NonNullable<typeof bounds> => bounds !== null);

    if (childBounds.length !== children.length) continue;

    const similarity = calculateGroupSimilarity(childBounds);
    const spacing = calculateGroupSpacing(childBounds);

    if (similarity >= 0.7 && spacing.consistency >= 0.6) {
      const confidence = (similarity + spacing.consistency) / 2;
      const bounds = calculateBoundingBox(childBounds);
      const visualWeight = calculateGroupWeight(childBounds, frame);
      const readingOrder = calculateReadingOrder(bounds, frame);

      groups.push({
        type: "feature-trio",
        nodeIds: children.map(child => child.id),
        primaryNode: children[0].id, // First child as primary
        bounds,
        confidence,
        visualWeight,
        readingOrder
      });
    }
  }

  return groups;
}

/**
 * Finds CTA groupings (primary and secondary action buttons).
 */
function findCTAGroups(
  nodes: readonly SceneNode[],
  frame: { width: number; height: number }
): ContentRelationship[] {
  const groups: ContentRelationship[] = [];
  const ctaNodes = nodes.filter(n => isPotentialCTA(n) && n.visible);

  if (ctaNodes.length < 2) return groups;

  // Find groups of 2-3 CTAs that are close together
  for (let i = 0; i < ctaNodes.length; i++) {
    for (let j = i + 1; j < ctaNodes.length; j++) {
      const cta1Bounds = getNodeBounds(ctaNodes[i]);
      const cta2Bounds = getNodeBounds(ctaNodes[j]);

      if (!cta1Bounds || !cta2Bounds) continue;

      const distance = calculateDistance(cta1Bounds, cta2Bounds);
      const alignment = checkAlignment(cta1Bounds, cta2Bounds);

      if (distance <= PROXIMITY_CONFIG.CTA_GROUP_THRESHOLD &&
          alignment >= PROXIMITY_CONFIG.ALIGNMENT_THRESHOLD) {

        // Check for third CTA nearby
        const nearbyNodes = [ctaNodes[i], ctaNodes[j]];
        for (let k = 0; k < ctaNodes.length; k++) {
          if (k === i || k === j) continue;

          const cta3Bounds = getNodeBounds(ctaNodes[k]);
          if (!cta3Bounds) continue;

          const dist1 = calculateDistance(cta1Bounds, cta3Bounds);
          const dist2 = calculateDistance(cta2Bounds, cta3Bounds);

          if (dist1 <= PROXIMITY_CONFIG.CTA_GROUP_THRESHOLD * 1.5 ||
              dist2 <= PROXIMITY_CONFIG.CTA_GROUP_THRESHOLD * 1.5) {
            nearbyNodes.push(ctaNodes[k]);
          }
        }

        const confidence = calculateGroupConfidence(nearbyNodes.map(n => getNodeBounds(n)!), alignment);
        const bounds = calculateBoundingBox(nearbyNodes.map(n => getNodeBounds(n)!));
        const visualWeight = calculateGroupWeight(nearbyNodes.map(n => getNodeBounds(n)!), frame);
        const readingOrder = calculateReadingOrder(bounds, frame);

        // Determine primary CTA (usually the one with primary styling)
        const primaryNode = determinePrimaryCTA(nearbyNodes);

        groups.push({
          type: "cta-group",
          nodeIds: nearbyNodes.map(n => n.id),
          primaryNode,
          bounds,
          confidence,
          visualWeight,
          readingOrder
        });

        break; // Avoid duplicate groupings
      }
    }
  }

  return groups;
}

/**
 * Finds list item patterns (repeated similar elements).
 */
function findListItems(
  nodes: readonly SceneNode[],
  frame: { width: number; height: number }
): ContentRelationship[] {
  const items: ContentRelationship[] = [];

  // Look for repeated patterns in layout
  const groupedBySize = groupNodesBySimilarSize(nodes);

  for (const sizeGroup of groupedBySize) {
    if (sizeGroup.nodes.length < 3) continue;

    const bounds = sizeGroup.nodes
      .map(n => getNodeBounds(n))
      .filter((b): b is NonNullable<typeof b> => b !== null);

    if (bounds.length !== sizeGroup.nodes.length) continue;

    // Check if they're arranged in a list-like pattern (vertical or horizontal)
    const isVerticalList = checkVerticalListPattern(bounds);
    const isHorizontalList = checkHorizontalListPattern(bounds);

    if (isVerticalList || isHorizontalList) {
      const confidence = sizeGroup.similarity * (isVerticalList ? 0.9 : 0.8);
      const groupBounds = calculateBoundingBox(bounds);
      const visualWeight = calculateGroupWeight(bounds, frame);
      const readingOrder = calculateReadingOrder(groupBounds, frame);

      items.push({
        type: "list-item",
        nodeIds: sizeGroup.nodes.map(n => n.id),
        primaryNode: sizeGroup.nodes[0].id,
        bounds: groupBounds,
        confidence,
        visualWeight,
        readingOrder
      });
    }
  }

  return items;
}

/**
 * Finds testimonial blocks (quote + attribution patterns).
 */
function findTestimonialBlocks(
  nodes: readonly SceneNode[],
  frame: { width: number; height: number }
): ContentRelationship[] {
  const testimonials: ContentRelationship[] = [];
  const textNodes = nodes.filter(n => n.type === "TEXT" && n.visible);

  // Look for quote-like text patterns
  for (const textNode of textNodes) {
    const text = (textNode as TextNode).characters;
    const isQuote = text.includes('"') || text.includes('"') || text.includes('"') ||
                    text.length > 50; // Long text might be testimonial

    if (!isQuote) continue;

    const textBounds = getNodeBounds(textNode);
    if (!textBounds) continue;

    // Look for nearby attribution text or image (author)
    const nearbyNodes = nodes.filter(n => {
      if (n === textNode || !n.visible) return false;

      const bounds = getNodeBounds(n);
      if (!bounds) return false;

      const distance = calculateDistance(textBounds, bounds);
      return distance <= 100; // Close enough to be attribution
    });

    if (nearbyNodes.length > 0) {
      const allNodes = [textNode, ...nearbyNodes];
      const allBounds = allNodes
        .map(n => getNodeBounds(n))
        .filter((b): b is NonNullable<typeof b> => b !== null);

      const confidence = 0.7; // Moderate confidence for testimonial detection
      const bounds = calculateBoundingBox(allBounds);
      const visualWeight = calculateGroupWeight(allBounds, frame);
      const readingOrder = calculateReadingOrder(bounds, frame);

      testimonials.push({
        type: "testimonial-block",
        nodeIds: allNodes.map(n => n.id),
        primaryNode: textNode.id, // Quote text is primary
        bounds,
        confidence,
        visualWeight,
        readingOrder
      });
    }
  }

  return testimonials;
}

/**
 * Helper Functions
 */

function getNodeBounds(node: SceneNode): { x: number; y: number; width: number; height: number } | null {
  if (!("absoluteBoundingBox" in node) || !node.absoluteBoundingBox) {
    return null;
  }

  const bounds = node.absoluteBoundingBox;
  return {
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height
  };
}

function hasImageFills(node: SceneNode): boolean {
  if (!("fills" in node) || !Array.isArray(node.fills)) return false;
  return (node.fills as readonly any[]).some(fill => fill.type === "IMAGE");
}

function calculateDistance(
  bounds1: { x: number; y: number; width: number; height: number },
  bounds2: { x: number; y: number; width: number; height: number }
): number {
  // Calculate center-to-center distance
  const center1 = { x: bounds1.x + bounds1.width / 2, y: bounds1.y + bounds1.height / 2 };
  const center2 = { x: bounds2.x + bounds2.width / 2, y: bounds2.y + bounds2.height / 2 };

  return Math.sqrt(
    Math.pow(center2.x - center1.x, 2) + Math.pow(center2.y - center1.y, 2)
  );
}

function checkAlignment(
  bounds1: { x: number; y: number; width: number; height: number },
  bounds2: { x: number; y: number; width: number; height: number }
): number {
  const tolerance = 10; // px

  // Check horizontal alignment
  const topAlign = Math.abs(bounds1.y - bounds2.y) <= tolerance;
  const middleAlign = Math.abs(
    (bounds1.y + bounds1.height / 2) - (bounds2.y + bounds2.height / 2)
  ) <= tolerance;
  const bottomAlign = Math.abs(
    (bounds1.y + bounds1.height) - (bounds2.y + bounds2.height)
  ) <= tolerance;

  // Check vertical alignment
  const leftAlign = Math.abs(bounds1.x - bounds2.x) <= tolerance;
  const centerAlign = Math.abs(
    (bounds1.x + bounds1.width / 2) - (bounds2.x + bounds2.width / 2)
  ) <= tolerance;
  const rightAlign = Math.abs(
    (bounds1.x + bounds1.width) - (bounds2.x + bounds2.width)
  ) <= tolerance;

  let alignmentScore = 0;
  if (topAlign || middleAlign || bottomAlign) alignmentScore += 0.5;
  if (leftAlign || centerAlign || rightAlign) alignmentScore += 0.5;

  return alignmentScore;
}

function calculatePairConfidence(
  textBounds: { width: number; height: number },
  imageBounds: { width: number; height: number },
  distance: number,
  alignment: number
): number {
  // Base confidence on distance (closer = higher confidence)
  const distanceScore = Math.max(0, 1 - distance / PROXIMITY_CONFIG.TEXT_IMAGE_THRESHOLD);

  // Boost confidence for good alignment
  const alignmentBonus = alignment * 0.3;

  // Boost confidence for appropriate size relationship
  const sizeRatio = Math.min(textBounds.width, textBounds.height) /
                   Math.min(imageBounds.width, imageBounds.height);
  const sizeBonus = sizeRatio > 0.3 && sizeRatio < 3.0 ? 0.2 : 0;

  return Math.min(distanceScore + alignmentBonus + sizeBonus, 1.0);
}

function determinePrimaryNode(textNode: SceneNode, imageNode: SceneNode): string {
  const textBounds = getNodeBounds(textNode);
  const imageBounds = getNodeBounds(imageNode);

  if (!textBounds || !imageBounds) return textNode.id;

  // Primary is usually the larger element
  const textArea = textBounds.width * textBounds.height;
  const imageArea = imageBounds.width * imageBounds.height;

  return imageArea > textArea ? imageNode.id : textNode.id;
}

function calculateBoundingBox(
  bounds: readonly { x: number; y: number; width: number; height: number }[]
): { x: number; y: number; width: number; height: number } {
  if (bounds.length === 0) return { x: 0, y: 0, width: 0, height: 0 };

  const left = Math.min(...bounds.map(b => b.x));
  const top = Math.min(...bounds.map(b => b.y));
  const right = Math.max(...bounds.map(b => b.x + b.width));
  const bottom = Math.max(...bounds.map(b => b.y + b.height));

  return {
    x: left,
    y: top,
    width: right - left,
    height: bottom - top
  };
}

function calculateCombinedWeight(
  textBounds: { width: number; height: number },
  imageBounds: { width: number; height: number },
  frame: { width: number; height: number }
): number {
  const totalArea = (textBounds.width * textBounds.height) +
                   (imageBounds.width * imageBounds.height);
  const frameArea = frame.width * frame.height;

  return Math.min(totalArea / frameArea, 1.0);
}

function calculateReadingOrder(
  bounds: { x: number; y: number; width: number; height: number },
  frame: { width: number; height: number }
): number {
  // Simple reading order based on position (top-left to bottom-right)
  const normalizedX = bounds.x / frame.width;
  const normalizedY = bounds.y / frame.height;

  // Weight Y more heavily than X for reading order
  return normalizedY * 100 + normalizedX * 10;
}

function isPotentialCTA(node: SceneNode): boolean {
  const name = node.name.toLowerCase();
  return name.includes("button") ||
         name.includes("cta") ||
         name.includes("action") ||
         name.includes("submit") ||
         name.includes("buy") ||
         name.includes("get") ||
         name.includes("start");
}

function calculateGroupSimilarity(
  bounds: readonly { width: number; height: number }[]
): number {
  if (bounds.length < 2) return 0;

  const avgWidth = bounds.reduce((sum, b) => sum + b.width, 0) / bounds.length;
  const avgHeight = bounds.reduce((sum, b) => sum + b.height, 0) / bounds.length;

  const widthVariance = bounds.reduce((sum, b) => sum + Math.abs(b.width - avgWidth), 0) / bounds.length;
  const heightVariance = bounds.reduce((sum, b) => sum + Math.abs(b.height - avgHeight), 0) / bounds.length;

  // Higher similarity = lower variance relative to average size
  const widthSimilarity = Math.max(0, 1 - widthVariance / avgWidth);
  const heightSimilarity = Math.max(0, 1 - heightVariance / avgHeight);

  return (widthSimilarity + heightSimilarity) / 2;
}

function calculateGroupSpacing(
  bounds: readonly { x: number; y: number; width: number; height: number }[]
): { consistency: number } {
  if (bounds.length < 2) return { consistency: 0 };

  const sortedBounds = [...bounds].sort((a, b) => a.x - b.x);
  const gaps: number[] = [];

  for (let i = 0; i < sortedBounds.length - 1; i++) {
    const gap = sortedBounds[i + 1].x - (sortedBounds[i].x + sortedBounds[i].width);
    gaps.push(gap);
  }

  if (gaps.length === 0) return { consistency: 0 };

  const avgGap = gaps.reduce((sum, gap) => sum + gap, 0) / gaps.length;
  const variance = gaps.reduce((sum, gap) => sum + Math.abs(gap - avgGap), 0) / gaps.length;

  // Lower variance = higher consistency
  const consistency = Math.max(0, 1 - variance / Math.max(avgGap, 10));

  return { consistency };
}

function calculateGroupConfidence(
  bounds: readonly { x: number; y: number; width: number; height: number }[],
  alignment: number
): number {
  const similarity = calculateGroupSimilarity(bounds);
  const spacing = calculateGroupSpacing(bounds);

  return (similarity + spacing.consistency + alignment) / 3;
}

function calculateGroupWeight(
  bounds: readonly { width: number; height: number }[],
  frame: { width: number; height: number }
): number {
  const totalArea = bounds.reduce((sum, b) => sum + (b.width * b.height), 0);
  const frameArea = frame.width * frame.height;

  return Math.min(totalArea / frameArea, 1.0);
}

function determinePrimaryCTA(nodes: readonly SceneNode[]): string {
  // Look for primary styling indicators in names
  for (const node of nodes) {
    const name = node.name.toLowerCase();
    if (name.includes("primary") || name.includes("main")) {
      return node.id;
    }
  }

  // Return first node as fallback
  return nodes[0]?.id || "";
}

function groupNodesBySimilarSize(nodes: readonly SceneNode[]): Array<{
  nodes: readonly SceneNode[];
  similarity: number;
}> {
  const groups: Array<{ nodes: SceneNode[]; avgSize: number; similarity: number }> = [];

  for (const node of nodes) {
    const bounds = getNodeBounds(node);
    if (!bounds) continue;

    const nodeSize = bounds.width * bounds.height;

    // Find existing group with similar size
    const existingGroup = groups.find(group =>
      Math.abs(group.avgSize - nodeSize) < group.avgSize * 0.3 // 30% tolerance
    );

    if (existingGroup) {
      existingGroup.nodes.push(node);
      existingGroup.avgSize = existingGroup.nodes
        .map(n => {
          const b = getNodeBounds(n);
          return b ? b.width * b.height : 0;
        })
        .reduce((sum, size) => sum + size, 0) / existingGroup.nodes.length;
    } else {
      groups.push({
        nodes: [node],
        avgSize: nodeSize,
        similarity: 1.0
      });
    }
  }

  // Calculate final similarity scores
  return groups.map(group => ({
    nodes: group.nodes,
    similarity: calculateGroupSimilarity(
      group.nodes.map(n => getNodeBounds(n)!).filter(b => b !== null)
    )
  }));
}

function checkVerticalListPattern(
  bounds: readonly { x: number; y: number; width: number; height: number }[]
): boolean {
  if (bounds.length < 3) return false;

  const sortedByY = [...bounds].sort((a, b) => a.y - b.y);

  // Check if they're stacked vertically with consistent X alignment
  const firstX = sortedByY[0].x;
  const xVariance = sortedByY
    .map(b => Math.abs(b.x - firstX))
    .reduce((sum, diff) => sum + diff, 0) / sortedByY.length;

  return xVariance < 20; // Allow some variation in X positioning
}

function checkHorizontalListPattern(
  bounds: readonly { x: number; y: number; width: number; height: number }[]
): boolean {
  if (bounds.length < 3) return false;

  const sortedByX = [...bounds].sort((a, b) => a.x - b.x);

  // Check if they're arranged horizontally with consistent Y alignment
  const firstY = sortedByX[0].y;
  const yVariance = sortedByX
    .map(b => Math.abs(b.y - firstY))
    .reduce((sum, diff) => sum + diff, 0) / sortedByX.length;

  return yVariance < 20; // Allow some variation in Y positioning
}