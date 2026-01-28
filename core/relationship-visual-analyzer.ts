/**
 * Visual Relationship Analysis
 *
 * Detects sophisticated visual relationships in design compositions:
 * - Layering hierarchy (depth through overlap and z-index patterns)
 * - Visual weight distribution (size, contrast, color-based importance)
 * - Contrast relationships (color, size, weight, texture contrasts)
 * - Scale relationships (proportional sizing systems)
 */

import { debugFixLog } from "./debug.js";
import { getFrameRelativeBounds } from "./proximity-spatial-analysis.js";
import type {
  VisualRelationship,
  LayeringHierarchy,
  VisualWeightDistribution,
  // ContrastRelationship, // For future contrast analysis
  ScaleRelationship,
  ElementVisualProperties,
  NormalizedPoint
  // NormalizedBounds // For future bounds analysis
} from "../types/design-relationships.js";

// ============================================================================
// Configuration
// ============================================================================

interface VisualAnalysisConfig {
  readonly contrastThreshold: number; // Min contrast ratio to be significant
  readonly scaleSimilarityThreshold: number; // Similarity threshold for scale groups
  readonly weightCalculationDepth: number; // Max depth for weight calculations
  readonly minimumLayerSeparation: number; // Min z-separation for layer detection
  readonly confidenceThreshold: number; // Min confidence to include relationship
}

const DEFAULT_VISUAL_CONFIG: VisualAnalysisConfig = {
  contrastThreshold: 1.5,
  scaleSimilarityThreshold: 0.15,
  weightCalculationDepth: 3,
  minimumLayerSeparation: 0.1,
  confidenceThreshold: 0.4
};

// ============================================================================
// Visual Property Extraction
// ============================================================================

/**
 * Extracts comprehensive visual properties from frame elements
 */
function extractElementVisualProperties(frame: FrameNode): ElementVisualProperties[] {
  const frameAbsoluteBounds = frame.absoluteBoundingBox;
  if (!frameAbsoluteBounds) {
    debugFixLog("Frame missing absolute bounds for visual analysis");
    return [];
  }

  const elements: ElementVisualProperties[] = [];

  function processNode(node: SceneNode, depth: number = 0): void {
    if (node.visible === false || depth > 5) return; // Limit recursion depth

    const bounds = getFrameRelativeBounds(node, frameAbsoluteBounds!);
    if (!bounds || bounds.width < 1 || bounds.height < 1) return;

    const normalizedBounds = {
      left: bounds.x / frameAbsoluteBounds!.width,
      top: bounds.y / frameAbsoluteBounds!.height,
      right: (bounds.x + bounds.width) / frameAbsoluteBounds!.width,
      bottom: (bounds.y + bounds.height) / frameAbsoluteBounds!.height
    };

    const area = (normalizedBounds.right - normalizedBounds.left) *
                 (normalizedBounds.bottom - normalizedBounds.top);

    // Extract color and visual properties
    const visualProps: ElementVisualProperties = {
      elementId: node.id,
      bounds: normalizedBounds,
      area,
      ...extractColorProperties(node),
      ...extractTextProperties(node)
    };

    elements.push(visualProps);

    // Process children
    if ("children" in node) {
      for (const child of node.children) {
        processNode(child, depth + 1);
      }
    }
  }

  processNode(frame);
  return elements;
}

/**
 * Extracts color properties from a node
 */
function extractColorProperties(node: SceneNode): Partial<ElementVisualProperties> {
  try {
    let fillColor: string | undefined;
    // let strokeColor: string | undefined; // For future stroke analysis

    // Extract fill color from various node types
    if ("fills" in node && Array.isArray(node.fills)) {
      const solidFill = node.fills.find(fill =>
        fill.type === "SOLID" && fill.visible !== false
      );
      if (solidFill && solidFill.type === "SOLID") {
        fillColor = rgbToHex(solidFill.color);
      }
    }

    // Extract stroke color
    if ("strokes" in node && Array.isArray(node.strokes)) {
      const solidStroke = node.strokes.find(stroke =>
        stroke.type === "SOLID" && stroke.visible !== false
      );
      if (solidStroke && solidStroke.type === "SOLID") {
        // strokeColor = rgbToHex(solidStroke.color); // For future stroke analysis
      }
    }

    // Convert to HSL for better analysis
    if (fillColor) {
      const hsl = hexToHsl(fillColor);
      return {
        colorHue: hsl.h,
        colorSaturation: hsl.s,
        colorLightness: hsl.l
      };
    }

    return {};
  } catch (error) {
    debugFixLog("Error extracting color properties", { nodeId: node.id, error: String(error) });
    return {};
  }
}

/**
 * Extracts text properties from text nodes
 */
function extractTextProperties(node: SceneNode): Partial<ElementVisualProperties> {
  if (node.type !== "TEXT") return {};

  try {
    return {
      fontSize: typeof node.fontSize === "number" ? node.fontSize : undefined,
      fontWeight: typeof node.fontWeight === "string" ? node.fontWeight : undefined
    };
  } catch (error) {
    debugFixLog("Error extracting text properties", { nodeId: node.id, error: String(error) });
    return {};
  }
}

/**
 * Converts RGB color to hex string
 */
function rgbToHex(rgb: RGB): string {
  const r = Math.round(rgb.r * 255);
  const g = Math.round(rgb.g * 255);
  const b = Math.round(rgb.b * 255);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

/**
 * Converts hex color to HSL
 */
function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h: number, s: number;
  const l = (max + min) / 2;

  if (max === min) {
    h = s = 0; // achromatic
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
      default: h = 0;
    }
    h /= 6;
  }

  return { h: h * 360, s, l };
}

// ============================================================================
// Layering Hierarchy Detection
// ============================================================================

/**
 * Detects layering hierarchy through overlap analysis
 */
function detectLayeringHierarchy(
  elements: ElementVisualProperties[],
  config: VisualAnalysisConfig = DEFAULT_VISUAL_CONFIG
): LayeringHierarchy | null {
  if (elements.length < 2) return null;

  const layers = calculateDepthLayers(elements, config);

  if (layers.length < 2) return null;

  const confidence = calculateLayeringConfidence(layers, elements.length);

  if (confidence >= config.confidenceThreshold) {
    return {
      type: 'layering',
      layers,
      confidence
    };
  }

  return null;
}

/**
 * Calculates depth layers based on overlap patterns and visual cues
 */
function calculateDepthLayers(
  elements: ElementVisualProperties[],
  config: VisualAnalysisConfig
): LayeringHierarchy['layers'] {
  const depthMap = new Map<string, number>();

  // Calculate base depth scores
  for (const element of elements) {
    let depthScore = 0;

    // Factor 1: Size (smaller elements often in foreground)
    depthScore += (1 - element.area) * 0.3;

    // Factor 2: Position (elements higher up often in foreground)
    const centerY = (element.bounds.top + element.bounds.bottom) / 2;
    depthScore += (1 - centerY) * 0.2;

    // Factor 3: Contrast/Saturation (more vivid = foreground)
    if (element.colorSaturation !== undefined) {
      depthScore += element.colorSaturation * 0.3;
    }

    // Factor 4: Text elements typically foreground
    if (element.fontSize !== undefined) {
      depthScore += 0.4;
    }

    depthMap.set(element.elementId, depthScore);
  }

  // Group elements into discrete layers
  const sortedElements = Array.from(depthMap.entries()).sort((a, b) => a[1] - b[1]);
  const layers: {
    depth: number;
    elementIds: string[];
  }[] = [];
  let currentLayer: string[] = [];
  let currentDepth = 0;
  let lastScore = -1;

  for (const [elementId, score] of sortedElements) {
    if (lastScore >= 0 && Math.abs(score - lastScore) > config.minimumLayerSeparation) {
      if (currentLayer.length > 0) {
        layers.push({ depth: currentDepth, elementIds: currentLayer });
        currentLayer = [];
        currentDepth++;
      }
    }

    currentLayer.push(elementId);
    lastScore = score;
  }

  if (currentLayer.length > 0) {
    layers.push({ depth: currentDepth, elementIds: currentLayer });
  }

  return layers;
}

/**
 * Calculates confidence for layering hierarchy
 */
function calculateLayeringConfidence(
  layers: LayeringHierarchy['layers'],
  totalElements: number
): number {
  const layerCount = layers.length;
  const layerBalance = calculateLayerBalance(layers, totalElements);

  // More layers = more sophisticated hierarchy
  const layerScore = Math.min(1, layerCount / 4);

  // Better distribution = higher confidence
  const distributionScore = layerBalance;

  return layerScore * 0.6 + distributionScore * 0.4;
}

/**
 * Calculates how well-balanced the layer distribution is
 */
function calculateLayerBalance(layers: LayeringHierarchy['layers'], totalElements: number): number {
  if (layers.length === 0) return 0;

  const idealElementsPerLayer = totalElements / layers.length;
  let totalDeviation = 0;

  for (const layer of layers) {
    const deviation = Math.abs(layer.elementIds.length - idealElementsPerLayer) / idealElementsPerLayer;
    totalDeviation += deviation;
  }

  const avgDeviation = totalDeviation / layers.length;
  return Math.max(0, 1 - avgDeviation);
}

// ============================================================================
// Visual Weight Distribution
// ============================================================================

/**
 * Analyzes visual weight distribution across elements
 */
function analyzeVisualWeight(
  elements: ElementVisualProperties[],
  config: VisualAnalysisConfig = DEFAULT_VISUAL_CONFIG
): VisualWeightDistribution | null {
  if (elements.length === 0) return null;

  const weightMap: {
    elementId: string;
    weight: number;
    weightFactors: ('size' | 'color' | 'position' | 'contrast')[];
  }[] = [];
  let totalWeight = 0;
  let weightedX = 0;
  let weightedY = 0;

  for (const element of elements) {
    const weight = calculateElementWeight(element, elements);
    const weightFactors = identifyWeightFactors(element, elements);

    weightMap.push({
      elementId: element.elementId,
      weight,
      weightFactors: weightFactors as ('size' | 'contrast' | 'color' | 'position')[]
    });

    totalWeight += weight;
    const centerX = (element.bounds.left + element.bounds.right) / 2;
    const centerY = (element.bounds.top + element.bounds.bottom) / 2;
    weightedX += centerX * weight;
    weightedY += centerY * weight;
  }

  const totalBalance: NormalizedPoint = {
    x: weightedX / totalWeight,
    y: weightedY / totalWeight
  };

  const confidence = calculateWeightConfidence(weightMap, totalBalance);

  if (confidence >= config.confidenceThreshold) {
    return {
      type: 'weight',
      weightMap,
      totalBalance,
      confidence
    };
  }

  return null;
}

/**
 * Calculates visual weight for an element
 */
function calculateElementWeight(
  element: ElementVisualProperties,
  allElements: ElementVisualProperties[]
): number {
  let weight = 0;

  // Size factor (larger = heavier)
  weight += element.area * 0.4;

  // Contrast factor (higher contrast = heavier)
  if (element.colorLightness !== undefined) {
    const contrastFromMiddle = Math.abs(element.colorLightness - 0.5) * 2;
    weight += contrastFromMiddle * 0.2;
  }

  // Saturation factor (more saturated = heavier)
  if (element.colorSaturation !== undefined) {
    weight += element.colorSaturation * 0.2;
  }

  // Text factor (text draws attention)
  if (element.fontSize !== undefined) {
    const relativeSize = element.fontSize / 100; // Normalize typical font sizes
    weight += Math.min(0.3, relativeSize) * 0.2;
  }

  return Math.min(1, weight); // Cap at 1.0
}

/**
 * Identifies factors contributing to element's visual weight
 */
function identifyWeightFactors(
  element: ElementVisualProperties,
  allElements: ElementVisualProperties[]
): VisualWeightDistribution['weightMap'][0]['weightFactors'] {
  const factors: Array<'size' | 'contrast' | 'color' | 'position'> = [];

  // Size factor
  const avgArea = allElements.reduce((sum, el) => sum + el.area, 0) / allElements.length;
  if (element.area > avgArea * 1.2) {
    factors.push('size');
  }

  // Contrast factor
  if (element.colorLightness !== undefined) {
    const contrastFromMiddle = Math.abs(element.colorLightness - 0.5);
    if (contrastFromMiddle > 0.3) {
      factors.push('contrast');
    }
  }

  // Color factor
  if (element.colorSaturation !== undefined && element.colorSaturation > 0.6) {
    factors.push('color');
  }

  // Position factor (elements in certain positions naturally carry more weight)
  const centerX = (element.bounds.left + element.bounds.right) / 2;
  const centerY = (element.bounds.top + element.bounds.bottom) / 2;

  if (centerX > 0.3 && centerX < 0.7 && centerY > 0.2 && centerY < 0.6) {
    factors.push('position'); // Center region has positional weight
  }

  return factors;
}

/**
 * Calculates confidence for weight distribution analysis
 */
function calculateWeightConfidence(
  weightMap: VisualWeightDistribution['weightMap'],
  balance: NormalizedPoint
): number {
  // Weight variation (more variation = more interesting hierarchy)
  const weights = weightMap.map(w => w.weight);
  const avgWeight = weights.reduce((sum, w) => sum + w, 0) / weights.length;
  const weightVariance = weights.reduce((sum, w) => sum + Math.abs(w - avgWeight), 0) / weights.length;

  const varianceScore = Math.min(1, weightVariance * 3);

  // Balance position (not perfectly centered = more dynamic)
  const centerDeviation = Math.abs(balance.x - 0.5) + Math.abs(balance.y - 0.5);
  const balanceScore = Math.min(1, centerDeviation * 2);

  return varianceScore * 0.7 + balanceScore * 0.3;
}

// ============================================================================
// Scale Relationship Detection
// ============================================================================

/**
 * Detects scale relationships between elements
 */
function detectScaleRelationships(
  elements: ElementVisualProperties[],
  config: VisualAnalysisConfig = DEFAULT_VISUAL_CONFIG
): ScaleRelationship | null {
  if (elements.length < 3) return null;

  const scaleGroups = groupElementsByScale(elements, config);

  if (scaleGroups.length < 2) return null;

  const confidence = calculateScaleConfidence(scaleGroups, elements.length);

  if (confidence >= config.confidenceThreshold) {
    return {
      type: 'scale',
      scaleGroups,
      confidence
    };
  }

  return null;
}

/**
 * Groups elements by similar scale/size
 */
function groupElementsByScale(
  elements: ElementVisualProperties[],
  config: VisualAnalysisConfig
): ScaleRelationship['scaleGroups'] {
  const groups: { elementIds: string[]; scaleRatio: number; scaleType: 'golden' | 'fibonacci' | 'modular' | 'proportional' }[] = [];
  const threshold = config.scaleSimilarityThreshold;

  for (const element of elements) {
    let foundGroup = false;

    for (const group of groups) {
      const representativeElement = elements.find(e => e.elementId === group.elementIds[0]);
      if (!representativeElement) continue;

      const sizeDifference = Math.abs(element.area - representativeElement.area);
      const relativeDifference = sizeDifference / Math.max(element.area, representativeElement.area);

      if (relativeDifference <= threshold) {
        (group.elementIds as string[]).push(element.elementId);
        // Recalculate scale ratio
        const groupElements = group.elementIds.map((id: string) => elements.find((e: ElementVisualProperties) => e.elementId === id)!);
        const areas = groupElements.map((e: ElementVisualProperties) => e.area);
        (group as { scaleRatio: number }).scaleRatio = Math.max(...areas) / Math.min(...areas);
        foundGroup = true;
        break;
      }
    }

    if (!foundGroup) {
      groups.push({
        elementIds: [element.elementId],
        scaleRatio: 1.0,
        scaleType: 'proportional' // Will be refined later
      });
    }
  }

  // Classify scale types and filter to significant groups
  return groups
    .filter(group => group.elementIds.length >= 2)
    .map(group => ({
      ...group,
      scaleType: classifyScaleType(group.scaleRatio)
    }));
}

/**
 * Classifies the type of scale relationship
 */
function classifyScaleType(ratio: number): ScaleRelationship['scaleGroups'][0]['scaleType'] {
  if (Math.abs(ratio - 1.618) < 0.1) return 'golden';
  if (Math.abs(ratio - 1.5) < 0.1 || Math.abs(ratio - 2.0) < 0.1) return 'proportional';
  if (ratio > 2.0) return 'modular';
  return 'proportional';
}

/**
 * Calculates confidence for scale relationships
 */
function calculateScaleConfidence(
  scaleGroups: ScaleRelationship['scaleGroups'],
  totalElements: number
): number {
  const groupCoverage = scaleGroups.reduce((sum, group) => sum + group.elementIds.length, 0) / totalElements;
  const groupCount = Math.min(1, scaleGroups.length / 3);

  return groupCoverage * 0.6 + groupCount * 0.4;
}

// ============================================================================
// Main Visual Analysis Function
// ============================================================================

/**
 * Performs complete visual relationship analysis on a frame
 */
export function analyzeVisualRelationships(
  frame: FrameNode,
  config: Partial<VisualAnalysisConfig> = {}
): VisualRelationship[] {
  const fullConfig = { ...DEFAULT_VISUAL_CONFIG, ...config };
  const startTime = Date.now();

  debugFixLog("Starting visual relationship analysis", {
    frameId: frame.id,
    frameName: frame.name
  });

  try {
    // Extract visual properties
    const elements = extractElementVisualProperties(frame);

    if (elements.length < 2) {
      debugFixLog("Insufficient elements for visual analysis", { elementCount: elements.length });
      return [];
    }

    const relationships: VisualRelationship[] = [];

    // Detect layering hierarchy
    const layering = detectLayeringHierarchy(elements, fullConfig);
    if (layering) relationships.push(layering);

    // Analyze visual weight distribution
    const weight = analyzeVisualWeight(elements, fullConfig);
    if (weight) relationships.push(weight);

    // Detect scale relationships
    const scale = detectScaleRelationships(elements, fullConfig);
    if (scale) relationships.push(scale);

    const processingTime = Date.now() - startTime;

    debugFixLog("Visual relationship analysis complete", {
      relationships: relationships.length,
      layering: layering ? 1 : 0,
      weight: weight ? 1 : 0,
      scale: scale ? 1 : 0,
      processingTimeMs: processingTime
    });

    return relationships;

  } catch (error) {
    debugFixLog("Error in visual relationship analysis", { error: String(error) });
    return [];
  }
}