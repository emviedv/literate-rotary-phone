/**
 * Frame summarization for AI analysis.
 * Transforms Figma frame nodes into structured JSON summaries
 * suitable for AI model consumption.
 */

declare const figma: PluginAPI;

/**
 * Enhanced analysis configuration for improved frame understanding.
 * Expanded from 24 to 60 nodes with intelligent priority-based selection.
 */
export const ENHANCED_ANALYSIS_CONFIG = {
  MAX_NODES_TOTAL: 60,        // Up from 24 (150% increase)
  CHUNK_SIZE: 20,             // Process in manageable chunks
  CHUNK_OVERLAP: 4,           // Maintain context between chunks
  MAX_DEPTH: 8,               // Deep nesting analysis (vs current BFS limit)
  PRIORITY_WEIGHTS: {
    TEXT_NODES: 1.0,          // Capture all text for typography analysis
    INTERACTIVE: 0.9,         // CTAs, buttons, links
    IMAGES: 0.8,              // Visual content
    AUTO_LAYOUT: 0.7,         // Layout containers
    DECORATIVE: 0.3           // Lowest priority
  }
} as const;

/**
 * Legacy constant for backwards compatibility.
 * @deprecated Use ENHANCED_ANALYSIS_CONFIG.MAX_NODES_TOTAL instead
 */
export const MAX_SUMMARY_NODES = ENHANCED_ANALYSIS_CONFIG.MAX_NODES_TOTAL;

/**
 * Summary of a Figma frame for AI analysis.
 */
export interface FrameSummary {
  readonly id: string;
  readonly name: string;
  readonly size: {
    readonly width: number;
    readonly height: number;
  };
  readonly childCount: number;
  readonly nodes: readonly NodeSummary[];
}

/**
 * Summary of a single node within a frame.
 * All positions are relative to the frame origin.
 */
export interface NodeSummary {
  readonly id: string;
  readonly name: string;
  readonly type: SceneNode["type"];
  readonly rel: {
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
  };
  readonly text?: string;
  readonly fontSize?: number | "mixed";
  readonly fontWeight?: string;
  readonly fillType?: string;
  readonly layoutMode?: AutoLayoutMixin["layoutMode"];
  readonly primaryAxisAlignItems?: AutoLayoutMixin["primaryAxisAlignItems"];
  readonly counterAxisAlignItems?: AutoLayoutMixin["counterAxisAlignItems"];
  readonly zIndex?: number;
  readonly opacity?: number;
  readonly dominantColor?: string;
}

/**
 * Node priority calculation for intelligent analysis selection.
 * Prioritizes nodes by analysis value, not just BFS order.
 */
export interface NodePriority {
  readonly nodeId: string;
  readonly node: SceneNode;
  readonly type: SceneNode["type"];
  readonly priority: number;
  readonly reason: "large-text" | "interactive" | "visual-focal" | "layout-container" | "decorative";
  readonly depth: number;
}

/**
 * Analysis chunk for processing large frames in manageable pieces.
 */
export interface AnalysisChunk {
  readonly nodes: readonly NodePriority[];
  readonly totalPriority: number;
  readonly analysisContext: string;
  readonly chunkIndex: number;
}

/**
 * Enhanced frame summary with analysis metadata.
 */
export interface EnhancedFrameSummary extends FrameSummary {
  readonly analysisDepth: {
    readonly nodesCaptured: number;
    readonly totalNodes: number;
    readonly depthReached: number;
    readonly priorityScore: number;
  };
  readonly chunks?: readonly AnalysisChunk[];
}

/**
 * Calculates analysis priority for a node based on its properties and content.
 * Higher priority nodes are more important for AI analysis.
 */
export function calculateNodePriority(
  node: SceneNode,
  frameArea: number,
  depth: number
): NodePriority {
  let priority = 0;
  let reason: NodePriority["reason"] = "decorative";

  // Text nodes - highest priority
  if (node.type === "TEXT") {
    priority += ENHANCED_ANALYSIS_CONFIG.PRIORITY_WEIGHTS.TEXT_NODES;
    const textNode = node as TextNode;

    if (textNode.fontSize && typeof textNode.fontSize === "number") {
      if (textNode.fontSize > 24) {
        priority += 0.5; // Headlines
        reason = "large-text";
      }
    }

    if (textNode.fontName && textNode.fontName !== figma.mixed) {
      const fontName = textNode.fontName as FontName;
      if (fontName.style.includes("Bold") || fontName.style.includes("Black")) {
        priority += 0.3; // Bold emphasis
      }
    }

    if (textNode.characters && textNode.characters.length > 50) {
      priority += 0.2; // Body content
    }
  }

  // Interactive elements
  if (isInteractiveNode(node)) {
    priority += ENHANCED_ANALYSIS_CONFIG.PRIORITY_WEIGHTS.INTERACTIVE;
    reason = "interactive";

    if (isPrimaryCTA(node)) {
      priority += 0.4; // Primary CTA boost
    }
  }

  // Visual content
  if (hasImageFills(node)) {
    priority += ENHANCED_ANALYSIS_CONFIG.PRIORITY_WEIGHTS.IMAGES;
    reason = "visual-focal";

    if ("absoluteBoundingBox" in node && node.absoluteBoundingBox) {
      const nodeArea = node.absoluteBoundingBox.width * node.absoluteBoundingBox.height;
      if (nodeArea > frameArea * 0.3) {
        priority += 0.3; // Large images
      }
    }
  }

  // Layout containers
  if ("layoutMode" in node && node.layoutMode && node.layoutMode !== "NONE") {
    priority += ENHANCED_ANALYSIS_CONFIG.PRIORITY_WEIGHTS.AUTO_LAYOUT;
    reason = "layout-container";

    if ("children" in node && node.children.length > 3) {
      priority += 0.2; // Complex containers
    }
  }

  // Size-based boost
  if ("absoluteBoundingBox" in node && node.absoluteBoundingBox) {
    const nodeArea = node.absoluteBoundingBox.width * node.absoluteBoundingBox.height;
    const areaRatio = nodeArea / frameArea;
    if (areaRatio > 0.1) {
      priority += Math.min(areaRatio * 0.5, 0.3);
    }
  }

  // Depth penalty (prefer top-level elements)
  priority *= Math.max(0.1, 1 - depth * 0.1);

  return {
    nodeId: node.id,
    node,
    type: node.type,
    priority,
    reason,
    depth
  };
}

/**
 * Creates analysis chunks from prioritized nodes for manageable processing.
 */
export function createAnalysisChunks(nodes: NodePriority[]): AnalysisChunk[] {
  // Sort by priority (high to low)
  const sortedNodes = nodes.sort((a, b) => b.priority - a.priority);

  const chunks: AnalysisChunk[] = [];
  let currentChunk: NodePriority[] = [];

  for (const node of sortedNodes.slice(0, ENHANCED_ANALYSIS_CONFIG.MAX_NODES_TOTAL)) {
    currentChunk.push(node);

    // Create chunk when at capacity
    if (currentChunk.length === ENHANCED_ANALYSIS_CONFIG.CHUNK_SIZE) {
      chunks.push({
        nodes: currentChunk,
        totalPriority: currentChunk.reduce((sum, n) => sum + n.priority, 0),
        analysisContext: determineChunkContext(currentChunk),
        chunkIndex: chunks.length
      });

      // Start new chunk with overlap from previous
      const overlap = currentChunk.slice(-ENHANCED_ANALYSIS_CONFIG.CHUNK_OVERLAP);
      currentChunk = overlap;
    }
  }

  // Handle remaining nodes
  if (currentChunk.length > ENHANCED_ANALYSIS_CONFIG.CHUNK_OVERLAP) {
    chunks.push({
      nodes: currentChunk,
      totalPriority: currentChunk.reduce((sum, n) => sum + n.priority, 0),
      analysisContext: determineChunkContext(currentChunk),
      chunkIndex: chunks.length
    });
  }

  return chunks;
}

/**
 * Determines the primary analysis context for a chunk of nodes.
 */
function determineChunkContext(nodes: NodePriority[]): string {
  const textCount = nodes.filter(n => n.type === "TEXT").length;
  const imageCount = nodes.filter(n => hasImageFills(n.node)).length;
  const interactiveCount = nodes.filter(n => isInteractiveNode(n.node)).length;
  const containerCount = nodes.filter(n => "children" in n.node).length;

  if (textCount > nodes.length * 0.6) return "text-heavy";
  if (imageCount > nodes.length * 0.4) return "visual-content";
  if (interactiveCount > 0) return "interactive-elements";
  if (containerCount > nodes.length * 0.5) return "layout-structure";
  return "mixed-content";
}

/**
 * Helper function to detect interactive nodes (buttons, CTAs).
 */
function isInteractiveNode(node: SceneNode): boolean {
  // Check name patterns that suggest interactivity
  const name = node.name.toLowerCase();
  return name.includes("button") ||
         name.includes("cta") ||
         name.includes("click") ||
         name.includes("link") ||
         (node.type === "RECTANGLE" && ("fills" in node) && hasButtonLikeFills(node));
}

/**
 * Helper function to detect primary CTA elements.
 */
function isPrimaryCTA(node: SceneNode): boolean {
  const name = node.name.toLowerCase();
  return name.includes("primary") ||
         name.includes("main") ||
         name.includes("cta") ||
         name.includes("get started") ||
         name.includes("sign up");
}

/**
 * Helper function to detect image fills.
 */
function hasImageFills(node: SceneNode): boolean {
  if (!("fills" in node) || !Array.isArray(node.fills)) return false;
  return (node.fills as readonly Paint[]).some(fill => fill.type === "IMAGE");
}

/**
 * Helper function to detect button-like fills (solid colors with specific properties).
 */
function hasButtonLikeFills(node: SceneNode): boolean {
  if (!("fills" in node) || !Array.isArray(node.fills)) return false;
  const fills = node.fills as readonly Paint[];

  // Look for solid fills with non-neutral colors (buttons often have brand colors)
  return fills.some(fill => {
    if (fill.type !== "SOLID") return false;
    const solidFill = fill as SolidPaint;
    const { r, g, b } = solidFill.color;

    // Detect non-grayscale colors (likely brand colors used in buttons)
    const isGrayscale = Math.abs(r - g) < 0.1 && Math.abs(g - b) < 0.1;
    return !isGrayscale && (r > 0.1 || g > 0.1 || b > 0.1);
  });
}

/**
 * Enhanced frame summarization with priority-based node selection.
 * Captures up to 60 nodes using intelligent priority weighting.
 * All node positions are calculated relative to the frame origin.
 */
export function summarizeFrameEnhanced(frame: FrameNode): EnhancedFrameSummary {
  const frameBounds = frame.absoluteBoundingBox;
  const originX = frameBounds?.x ?? 0;
  const originY = frameBounds?.y ?? 0;
  const frameArea = frame.width * frame.height;

  // Collect all visible nodes with priority calculation
  const allNodes: NodePriority[] = [];
  const queue: Array<{ node: SceneNode; depth: number }> =
    frame.children.map(child => ({ node: child, depth: 0 }));

  let maxDepthReached = 0;
  let totalNodesVisited = 0;

  while (queue.length > 0) {
    const { node, depth } = queue.shift()!;
    totalNodesVisited++;

    if (!node.visible || depth > ENHANCED_ANALYSIS_CONFIG.MAX_DEPTH) {
      continue;
    }

    maxDepthReached = Math.max(maxDepthReached, depth);

    // Calculate priority for this node
    const priorityData = calculateNodePriority(node, frameArea, depth);
    allNodes.push(priorityData);

    // Add children to queue for deeper analysis
    if ("children" in node && depth < ENHANCED_ANALYSIS_CONFIG.MAX_DEPTH) {
      for (const child of node.children) {
        queue.push({ node: child, depth: depth + 1 });
      }
    }
  }

  // Create analysis chunks for complex frames
  const chunks = allNodes.length > ENHANCED_ANALYSIS_CONFIG.CHUNK_SIZE
    ? createAnalysisChunks(allNodes)
    : undefined;

  // Select top priority nodes for summary
  const selectedNodes = allNodes
    .sort((a, b) => b.priority - a.priority)
    .slice(0, ENHANCED_ANALYSIS_CONFIG.MAX_NODES_TOTAL);

  // Convert to node summaries
  const nodes: NodeSummary[] = selectedNodes
    .map((priorityNode, index) =>
      describeNode(priorityNode.node, originX, originY, index))
    .filter((summary): summary is NodeSummary => summary !== null);

  const totalPriority = selectedNodes.reduce((sum, node) => sum + node.priority, 0);

  return {
    id: frame.id,
    name: frame.name,
    size: {
      width: Math.round(frame.width),
      height: Math.round(frame.height)
    },
    childCount: frame.children.length,
    nodes,
    analysisDepth: {
      nodesCaptured: nodes.length,
      totalNodes: totalNodesVisited,
      depthReached: maxDepthReached,
      priorityScore: totalPriority
    },
    chunks
  };
}

/**
 * Creates a structured summary of a Figma frame for AI analysis.
 * Uses BFS traversal to capture up to MAX_SUMMARY_NODES visible nodes.
 * All node positions are calculated relative to the frame origin.
 *
 * @deprecated Use summarizeFrameEnhanced for better analysis quality
 */
export function summarizeFrame(frame: FrameNode): FrameSummary {
  const frameBounds = frame.absoluteBoundingBox;
  const originX = frameBounds?.x ?? 0;
  const originY = frameBounds?.y ?? 0;

  const nodes: NodeSummary[] = [];
  const queue: SceneNode[] = [...frame.children];
  let zIndex = 0;

  while (queue.length > 0 && nodes.length < MAX_SUMMARY_NODES) {
    const node = queue.shift();
    if (!node || !node.visible) {
      continue;
    }
    const description = describeNode(node, originX, originY, zIndex);
    zIndex++;
    if (description) {
      nodes.push(description);
    }
    if ("children" in node) {
      queue.push(...node.children);
    }
  }

  return {
    id: frame.id,
    name: frame.name,
    size: {
      width: Math.round(frame.width),
      height: Math.round(frame.height)
    },
    childCount: frame.children.length,
    nodes
  };
}

/**
 * Extracts relevant properties from a Figma node for AI analysis.
 * Captures: position, text content, typography, fills, colors, layout, opacity.
 */
function describeNode(node: SceneNode, originX: number, originY: number, zIndex: number): NodeSummary | null {
  if (!("absoluteBoundingBox" in node) || !node.absoluteBoundingBox) {
    return null;
  }
  const bounds = node.absoluteBoundingBox;
  const isText = node.type === "TEXT";
  const text = isText
    ? (node as TextNode).characters
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 160)
    : undefined;

  let fontSize: number | "mixed" | undefined;
  let fontWeight: string | undefined;

  if (isText) {
    const tNode = node as TextNode;
    fontSize = tNode.fontSize === figma.mixed ? "mixed" : Math.round(tNode.fontSize as number);
    fontWeight = tNode.fontName === figma.mixed ? "mixed" : (tNode.fontName as FontName).style;
  }

  let fillType: string | undefined;
  let dominantColor: string | undefined;
  if ("fills" in node && Array.isArray(node.fills)) {
    const fills = node.fills as readonly Paint[];
    if (fills.some((f) => f.type === "IMAGE")) {
      fillType = "IMAGE";
    } else if (fills.some((f) => f.type === "SOLID")) {
      fillType = "SOLID";
      // Extract dominant color from first visible solid fill
      const solidFill = fills.find((f) => f.type === "SOLID" && f.visible !== false) as SolidPaint | undefined;
      if (solidFill) {
        const c = solidFill.color;
        const r = Math.round(c.r * 255).toString(16).padStart(2, "0");
        const g = Math.round(c.g * 255).toString(16).padStart(2, "0");
        const b = Math.round(c.b * 255).toString(16).padStart(2, "0");
        dominantColor = `#${r}${g}${b}`;
      }
    } else if (fills.length > 0) {
      fillType = "OTHER";
    }
  }

  // Extract opacity
  let opacity: number | undefined;
  if ("opacity" in node && typeof node.opacity === "number" && node.opacity < 1) {
    opacity = round(node.opacity);
  }

  const layoutDetails =
    "layoutMode" in node && node.layoutMode && node.layoutMode !== "NONE"
      ? {
          layoutMode: node.layoutMode,
          primaryAxisAlignItems: node.primaryAxisAlignItems,
          counterAxisAlignItems: node.counterAxisAlignItems
        }
      : {};

  return {
    id: node.id,
    name: node.name || node.type,
    type: node.type,
    rel: {
      x: round(bounds.x - originX),
      y: round(bounds.y - originY),
      width: round(bounds.width),
      height: round(bounds.height)
    },
    zIndex,
    ...(text ? { text } : {}),
    ...(fontSize !== undefined ? { fontSize } : {}),
    ...(fontWeight ? { fontWeight } : {}),
    ...(fillType ? { fillType } : {}),
    ...(dominantColor ? { dominantColor } : {}),
    ...(opacity !== undefined ? { opacity } : {}),
    ...layoutDetails
  };
}

/**
 * Rounds a number to 2 decimal places for cleaner JSON output.
 */
function round(value: number): number {
  return Math.round(value * 100) / 100;
}
