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
  readonly isDirectChild?: boolean;
  /** ID of the parent node (for understanding containment hierarchy) */
  readonly parentId?: string;
  /** Whether this node has children (FRAME, GROUP, etc.) */
  readonly hasChildren?: boolean;
  /** Number of direct children (helps AI understand container complexity) */
  readonly childCount?: number;
  /**
   * Inferred semantic role based on position, size, fills, and content.
   * Helps AI identify nodes even when names are generic ("Frame 82930").
   */
  readonly inferredRole?: InferredRole;
  /**
   * True if this node is a Figma component instance (type: "INSTANCE").
   * Component instances are atomic units - their children should NOT be
   * repositioned independently.
   */
  readonly isComponentInstance?: boolean;
  /**
   * True if this node's direct parent has active auto-layout (layoutMode !== "NONE").
   * Nodes with this flag should NOT receive explicit position specs - they flow
   * with their parent container automatically.
   */
  readonly inAutoLayoutParent?: boolean;
}

/**
 * Semantic roles inferred from node properties.
 * Used to help AI identify nodes with generic names.
 */
export type InferredRole =
  | "hero-image"      // Large image dominating the frame
  | "background"      // Full-bleed or near-full background element
  | "logo"            // Small element in corners, likely branding
  | "headline"        // Large, prominent text
  | "subheadline"     // Medium text, secondary to headline
  | "body-text"       // Smaller text, paragraph content
  | "cta-button"      // Interactive element, likely a button
  | "icon"            // Small decorative or functional element
  | "card"            // Container with mixed content
  | "container"       // Layout wrapper grouping elements
  | "decorative"      // Background shapes, dividers, accents
  | "photo"           // Image content (not hero-sized)
  | "mockup"          // Device frame or product display
  | "unknown";        // Cannot determine role

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
  // Track parent IDs for hierarchy awareness
  const allNodes: Array<NodePriority & { parentId?: string; parentIsAutoLayout?: boolean }> = [];
  // Track whether parent has auto-layout (frame root has layoutMode)
  const frameIsAutoLayout = frame.layoutMode !== "NONE";
  const queue: Array<{ node: SceneNode; depth: number; parentId?: string; parentIsAutoLayout?: boolean }> =
    frame.children.map(child => ({ node: child, depth: 0, parentId: frame.id, parentIsAutoLayout: frameIsAutoLayout }));

  let maxDepthReached = 0;
  let totalNodesVisited = 0;

  while (queue.length > 0) {
    const { node, depth, parentId, parentIsAutoLayout } = queue.shift()!;
    totalNodesVisited++;

    if (!node.visible || depth > ENHANCED_ANALYSIS_CONFIG.MAX_DEPTH) {
      continue;
    }

    maxDepthReached = Math.max(maxDepthReached, depth);

    // Calculate priority for this node
    const priorityData = calculateNodePriority(node, frameArea, depth);
    allNodes.push({ ...priorityData, parentId, parentIsAutoLayout });

    // Add children to queue for deeper analysis
    // Determine if this node is an auto-layout container for its children
    const nodeIsAutoLayout = "layoutMode" in node && node.layoutMode !== "NONE";
    if ("children" in node && depth < ENHANCED_ANALYSIS_CONFIG.MAX_DEPTH) {
      for (const child of node.children) {
        queue.push({ node: child, depth: depth + 1, parentId: node.id, parentIsAutoLayout: nodeIsAutoLayout });
      }
    }
  }

  // Create analysis chunks for complex frames
  const chunks = allNodes.length > ENHANCED_ANALYSIS_CONFIG.CHUNK_SIZE
    ? createAnalysisChunks(allNodes)
    : undefined;

  // Select top priority nodes for summary
  const sortedNodes = allNodes.sort((a, b) => b.priority - a.priority);
  const selectedNodes = sortedNodes.slice(0, ENHANCED_ANALYSIS_CONFIG.MAX_NODES_TOTAL);

  // CRITICAL: Ensure all direct children are included if they aren't already
  // This prevents the AI from "forgetting" containers that define the layout structure
  const capturedIds = new Set(selectedNodes.map(n => n.nodeId));
  
  for (const nodePriority of allNodes) {
    if (nodePriority.depth === 0 && !capturedIds.has(nodePriority.nodeId)) {
      selectedNodes.push(nodePriority);
      capturedIds.add(nodePriority.nodeId);
    }
  }

  // Convert to node summaries
  const nodes: NodeSummary[] = selectedNodes
    .map((priorityNode, index) =>
      describeNode(priorityNode.node, originX, originY, index, priorityNode.depth === 0, priorityNode.parentId, frame.width, frame.height, priorityNode.parentIsAutoLayout))
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
  // Track parent IDs for hierarchy awareness and auto-layout status
  const frameIsAutoLayout = frame.layoutMode !== "NONE";
  const queue: Array<{ node: SceneNode; parentId: string; parentIsAutoLayout: boolean }> =
    frame.children.map(child => ({ node: child, parentId: frame.id, parentIsAutoLayout: frameIsAutoLayout }));
  let zIndex = 0;

  while (queue.length > 0 && nodes.length < MAX_SUMMARY_NODES) {
    const item = queue.shift();
    if (!item || !item.node.visible) {
      continue;
    }
    const { node, parentId, parentIsAutoLayout } = item;
    const isDirectChild = node.parent?.id === frame.id;
    const description = describeNode(node, originX, originY, zIndex, isDirectChild, parentId, frame.width, frame.height, parentIsAutoLayout);
    zIndex++;
    if (description) {
      nodes.push(description);
    }
    if ("children" in node) {
      // Determine if this node is auto-layout for its children
      const nodeIsAutoLayout = "layoutMode" in node && node.layoutMode !== "NONE";
      queue.push(...node.children.map(child => ({ node: child, parentId: node.id, parentIsAutoLayout: nodeIsAutoLayout })));
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
 * Infers a semantic role for a node based on its properties.
 * Uses position, size, fill type, text content, and structural signals.
 *
 * This helps the AI identify nodes even when they have generic names
 * like "Frame 82930" or "Rectangle 1".
 */
function inferRole(
  node: SceneNode,
  bounds: { x: number; y: number; width: number; height: number },
  frameWidth: number,
  frameHeight: number,
  hasImageFill: boolean,
  hasSolidFill: boolean
): InferredRole {
  const nodeArea = bounds.width * bounds.height;
  const frameArea = frameWidth * frameHeight;
  const areaRatio = nodeArea / frameArea;

  // Normalized position (0-1 range)
  const centerX = (bounds.x + bounds.width / 2) / frameWidth;
  const centerY = (bounds.y + bounds.height / 2) / frameHeight;

  // Check name for hints (even generic names sometimes have clues)
  const nameLower = node.name.toLowerCase();

  // ─────────────────────────────────────────────────────────────────────────
  // TEXT NODES - classify by size and position
  // ─────────────────────────────────────────────────────────────────────────
  if (node.type === "TEXT") {
    const textNode = node as TextNode;
    const fontSize = typeof textNode.fontSize === "number" ? textNode.fontSize : 16;

    if (fontSize >= 32 || (fontSize >= 24 && centerY < 0.4)) {
      return "headline";
    }
    if (fontSize >= 18 && fontSize < 32) {
      return "subheadline";
    }
    return "body-text";
  }

  // ─────────────────────────────────────────────────────────────────────────
  // NAME-BASED HINTS (explicit naming overrides heuristics)
  // ─────────────────────────────────────────────────────────────────────────
  if (nameLower.includes("logo") || nameLower.includes("brand")) {
    return "logo";
  }
  if (nameLower.includes("button") || nameLower.includes("cta")) {
    return "cta-button";
  }
  if (nameLower.includes("hero")) {
    return "hero-image";
  }
  if (nameLower.includes("background") || nameLower.includes("bg")) {
    return "background";
  }
  if (nameLower.includes("mockup") || nameLower.includes("device") ||
      nameLower.includes("iphone") || nameLower.includes("phone")) {
    return "mockup";
  }
  if (nameLower.includes("icon")) {
    return "icon";
  }
  if (nameLower.includes("card")) {
    return "card";
  }

  // ─────────────────────────────────────────────────────────────────────────
  // IMAGE FILLS - classify by size and position
  // ─────────────────────────────────────────────────────────────────────────
  if (hasImageFill) {
    // Large image covering significant area = hero
    if (areaRatio > 0.4) {
      return "hero-image";
    }
    // Medium-sized image
    if (areaRatio > 0.1) {
      return "photo";
    }
    // Small image in corner = likely logo
    if (areaRatio < 0.05 && (centerY < 0.2 || centerY > 0.8) &&
        (centerX < 0.25 || centerX > 0.75)) {
      return "logo";
    }
    return "photo";
  }

  // ─────────────────────────────────────────────────────────────────────────
  // SOLID FILLS - classify by size and position
  // ─────────────────────────────────────────────────────────────────────────
  if (hasSolidFill) {
    // Full-bleed or near-full = background
    if (areaRatio > 0.8) {
      return "background";
    }
    // Small, centered horizontally, in bottom half = likely CTA button
    if (areaRatio < 0.1 && centerX > 0.3 && centerX < 0.7 && centerY > 0.5) {
      // Check if it has children (text inside = button)
      if ("children" in node && (node as FrameNode).children.length > 0) {
        const hasTextChild = (node as FrameNode).children.some(c => c.type === "TEXT");
        if (hasTextChild) {
          return "cta-button";
        }
      }
    }
    // Small element = decorative or icon
    if (areaRatio < 0.02) {
      return bounds.width < 50 && bounds.height < 50 ? "icon" : "decorative";
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // CONTAINERS - frames/groups with children
  // ─────────────────────────────────────────────────────────────────────────
  if ("children" in node) {
    const children = (node as FrameNode | GroupNode).children;

    if (children.length === 0) {
      return areaRatio > 0.5 ? "background" : "decorative";
    }

    // Has mixed content (text + images) = card
    const hasText = children.some(c => c.type === "TEXT");
    const hasImage = children.some(c =>
      "fills" in c && Array.isArray(c.fills) &&
      (c.fills as readonly Paint[]).some(f => f.type === "IMAGE")
    );

    if (hasText && hasImage && areaRatio < 0.5) {
      return "card";
    }

    // Large container with children = layout container
    if (areaRatio > 0.3) {
      return "container";
    }

    // Small container = card or component
    return children.length > 2 ? "card" : "container";
  }

  // ─────────────────────────────────────────────────────────────────────────
  // FALLBACK - pure shapes
  // ─────────────────────────────────────────────────────────────────────────
  if (node.type === "RECTANGLE" || node.type === "ELLIPSE") {
    if (areaRatio > 0.5) return "background";
    if (areaRatio < 0.02) return "decorative";
  }

  return "unknown";
}

/**
 * Extracts relevant properties from a Figma node for AI analysis.
 * Captures: position, text content, typography, fills, colors, layout, opacity,
 * and parent-child relationship info (parentId, hasChildren, childCount).
 */
function describeNode(
  node: SceneNode,
  originX: number,
  originY: number,
  zIndex: number,
  isDirectChild: boolean = false,
  parentId?: string,
  frameWidth: number = 1920,
  frameHeight: number = 1080,
  parentIsAutoLayout: boolean = false
): NodeSummary | null {
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

  // Calculate parent-child relationship info
  const hasChildren = "children" in node && Array.isArray(node.children) && node.children.length > 0;
  const childCount = hasChildren ? (node as ChildrenMixin).children.length : undefined;

  // Infer semantic role from node properties
  const relBounds = {
    x: bounds.x - originX,
    y: bounds.y - originY,
    width: bounds.width,
    height: bounds.height
  };
  const inferredRole = inferRole(
    node,
    relBounds,
    frameWidth,
    frameHeight,
    fillType === "IMAGE",
    fillType === "SOLID"
  );

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
    ...(isDirectChild ? { isDirectChild: true } : {}),
    ...(parentId ? { parentId } : {}),
    ...(hasChildren ? { hasChildren: true } : {}),
    ...(childCount !== undefined ? { childCount } : {}),
    ...(inferredRole !== "unknown" ? { inferredRole } : {}),
    ...(node.type === "INSTANCE" ? { isComponentInstance: true } : {}),
    ...(parentIsAutoLayout ? { inAutoLayoutParent: true } : {}),
    ...layoutDetails
  };
}

/**
 * Rounds a number to 2 decimal places for cleaner JSON output.
 */
function round(value: number): number {
  return Math.round(value * 100) / 100;
}