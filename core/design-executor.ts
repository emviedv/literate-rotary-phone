/**
 * Design Executor
 *
 * Applies AI-generated design specifications to Figma nodes.
 * Creates TikTok variant by cloning source frame and applying positioning.
 */

import { debugFixLog } from "./debug.js";
import type { DesignSpecs, NodeSpec } from "../types/design-types.js";
import { TIKTOK_CONSTRAINTS as CONSTRAINTS } from "../types/design-types.js";
import { isAtomicGroup } from "./element-classification.js";

declare const figma: PluginAPI;

// ============================================================================
// Types
// ============================================================================

interface ExecutionResult {
  readonly success: boolean;
  readonly variant?: FrameNode;
  readonly appliedSpecs: number;
  readonly skippedSpecs: number;
  readonly errors: readonly string[];
}

interface NodeMap {
  readonly [sourceId: string]: SceneNode;
}

// ============================================================================
// Main Execution Function
// ============================================================================

/**
 * Creates a TikTok variant by cloning the source frame and applying AI specs.
 */
export async function createDesignVariant(
  sourceFrame: FrameNode,
  specs: DesignSpecs,
  fontCache: Set<string>
): Promise<ExecutionResult> {
  const errors: string[] = [];
  let appliedSpecs = 0;
  let skippedSpecs = 0;

  debugFixLog("Starting design variant creation", {
    sourceId: sourceFrame.id,
    sourceName: sourceFrame.name,
    specCount: specs.nodes.length
  });

  // Clone the source frame
  const variant = sourceFrame.clone();
  variant.name = `TikTok • ${sourceFrame.name}`;

  // Resize to TikTok dimensions
  variant.resizeWithoutConstraints(CONSTRAINTS.WIDTH, CONSTRAINTS.HEIGHT);

  // Break auto-layout for aggressive repositioning
  if (variant.layoutMode !== "NONE") {
    debugFixLog("Breaking auto-layout for manual positioning", {
      originalMode: variant.layoutMode
    });
    variant.layoutMode = "NONE";
  }

  // Detach all instances to allow repositioning of their children
  const detachCount = detachAllInstances(variant);
  if (detachCount > 0) {
    debugFixLog("Detached instances for repositioning", { detachCount });
  }

  // Build node map for fast lookup
  const nodeMap = buildNodeMap(sourceFrame, variant);

  debugFixLog("Node map built", {
    mappedNodes: Object.keys(nodeMap).length
  });

  // Identify children of atomic groups (mockups, illustrations, etc.)
  // These should NOT be repositioned independently - they move with their parent
  const atomicGroupChildIds = collectAtomicGroupChildren(variant);
  if (atomicGroupChildIds.size > 0) {
    debugFixLog("Atomic group children identified (will skip repositioning)", {
      count: atomicGroupChildIds.size
    });
  }

  // Load fonts for text nodes
  await loadFontsForFrame(variant, fontCache);

  // Apply each node spec
  for (const spec of specs.nodes) {
    try {
      const targetNode = nodeMap[spec.nodeId];

      if (!targetNode) {
        // Try finding by name as fallback
        const foundByName = findNodeByName(variant, spec.nodeName);
        if (foundByName) {
          // Check if this is a child of an atomic group
          const isAtomicChild = atomicGroupChildIds.has(foundByName.id);
          applyNodeSpec(foundByName, spec, isAtomicChild);
          appliedSpecs++;
        } else {
          debugFixLog("Node not found for spec", {
            nodeId: spec.nodeId,
            nodeName: spec.nodeName
          });
          skippedSpecs++;
        }
        continue;
      }

      // Check if this is a child of an atomic group
      const isAtomicChild = atomicGroupChildIds.has(targetNode.id);
      applyNodeSpec(targetNode, spec, isAtomicChild);
      appliedSpecs++;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      errors.push(`Failed to apply spec for ${spec.nodeName}: ${message}`);
      skippedSpecs++;
    }
  }

  // Reorder children based on zIndex values from specs
  reorderChildrenByZIndex(variant, nodeMap, specs.nodes);

  // Apply safe area enforcement
  enforceSafeAreas(variant);

  debugFixLog("Design variant creation complete", {
    variantId: variant.id,
    appliedSpecs,
    skippedSpecs,
    errorCount: errors.length
  });

  return {
    success: errors.length === 0,
    variant,
    appliedSpecs,
    skippedSpecs,
    errors
  };
}

// ============================================================================
// Node Map Building
// ============================================================================

/**
 * Builds a map from source node IDs to corresponding cloned nodes.
 */
function buildNodeMap(sourceFrame: FrameNode, clonedFrame: FrameNode): NodeMap {
  const map: { [key: string]: SceneNode } = {};

  // Walk both trees in parallel
  const sourceQueue: SceneNode[] = [sourceFrame];
  const clonedQueue: SceneNode[] = [clonedFrame];

  while (sourceQueue.length > 0 && clonedQueue.length > 0) {
    const sourceNode = sourceQueue.shift()!;
    const clonedNode = clonedQueue.shift()!;

    map[sourceNode.id] = clonedNode;

    if ("children" in sourceNode && "children" in clonedNode) {
      // Traverse children in order
      for (let i = 0; i < sourceNode.children.length; i++) {
        if (i < clonedNode.children.length) {
          sourceQueue.push(sourceNode.children[i]);
          clonedQueue.push(clonedNode.children[i]);
        }
      }
    }
  }

  return map;
}

/**
 * Finds a node by name within a frame tree.
 */
function findNodeByName(frame: FrameNode, name: string): SceneNode | null {
  const queue: SceneNode[] = [...frame.children];

  while (queue.length > 0) {
    const node = queue.shift()!;
    if (node.name === name) {
      return node;
    }
    if ("children" in node) {
      queue.push(...node.children);
    }
  }

  return null;
}

// ============================================================================
// Spec Application
// ============================================================================

/**
 * Threshold for position changes that warrant breaking auto-layout.
 * If the AI-specified position is within this threshold of the node's current
 * position, we skip repositioning entirely to preserve auto-layout flow.
 */
const POSITION_CHANGE_THRESHOLD = 10; // pixels

/**
 * Determines if a position change is significant enough to break auto-layout.
 * Returns true if the target position differs from current by more than threshold.
 */
function shouldBreakAutoLayout(
  node: SceneNode,
  targetPos: { x: number; y: number }
): boolean {
  const dx = Math.abs(node.x - targetPos.x);
  const dy = Math.abs(node.y - targetPos.y);
  return dx > POSITION_CHANGE_THRESHOLD || dy > POSITION_CHANGE_THRESHOLD;
}

/**
 * Applies a single node specification to a Figma node.
 *
 * @param node - The Figma node to modify
 * @param spec - The specification from AI
 * @param isAtomicChild - If true, skip repositioning (child of atomic group like iPhone mockup)
 */
function applyNodeSpec(node: SceneNode, spec: NodeSpec, isAtomicChild: boolean = false): void {
  // Handle visibility
  if (!spec.visible) {
    node.visible = false;
    return;
  }

  node.visible = true;

  // Skip repositioning for children of atomic groups (mockups, illustrations)
  // These elements must stay in their relative positions within the parent
  if (isAtomicChild && spec.position) {
    debugFixLog("Skipping repositioning for atomic group child", {
      nodeId: spec.nodeId,
      nodeName: spec.nodeName,
      reason: "Child of atomic group (mockup/illustration) - preserving relative position"
    });
    // Still allow size/scale changes, just not repositioning
  }

  // Apply position - only break auto-layout if position change is significant
  // AND this is not a child of an atomic group
  if (spec.position && !isAtomicChild) {
    const needsRepositioning = shouldBreakAutoLayout(node, spec.position);

    if (needsRepositioning) {
      // Break out of auto-layout for repositioning
      if ("layoutPositioning" in node && node.layoutPositioning === "AUTO") {
        try {
          (node as FrameNode).layoutPositioning = "ABSOLUTE";
          debugFixLog("Breaking auto-layout for significant repositioning", {
            nodeId: spec.nodeId,
            nodeName: spec.nodeName,
            currentPos: { x: node.x, y: node.y },
            targetPos: spec.position
          });
        } catch {
          // Some nodes don't support this
        }
      }

      try {
        node.x = spec.position.x;
        node.y = spec.position.y;
      } catch (error) {
        debugFixLog("Failed to set position", {
          nodeId: spec.nodeId,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    } else {
      // Position change is minimal - preserve auto-layout flow
      debugFixLog("Skipping repositioning to preserve auto-layout", {
        nodeId: spec.nodeId,
        nodeName: spec.nodeName,
        currentPos: { x: node.x, y: node.y },
        targetPos: spec.position,
        deltaX: Math.abs(node.x - spec.position.x),
        deltaY: Math.abs(node.y - spec.position.y)
      });
    }
  }

  // Apply size
  if (spec.size && "resize" in node) {
    try {
      (node as FrameNode).resize(spec.size.width, spec.size.height);
    } catch {
      // Try resizeWithoutConstraints
      try {
        if ("resizeWithoutConstraints" in node) {
          (node as FrameNode).resizeWithoutConstraints(spec.size.width, spec.size.height);
        }
      } catch (error) {
        debugFixLog("Failed to resize node", {
          nodeId: spec.nodeId,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }
  }

  // Apply scale factor (if size not explicitly set)
  if (spec.scaleFactor && spec.scaleFactor !== 1.0 && !spec.size) {
    try {
      if ("width" in node && "height" in node && "resize" in node) {
        const frameNode = node as FrameNode;
        const newWidth = frameNode.width * spec.scaleFactor;
        const newHeight = frameNode.height * spec.scaleFactor;
        frameNode.resize(newWidth, newHeight);
      }
    } catch (error) {
      debugFixLog("Failed to apply scale factor", {
        nodeId: spec.nodeId,
        scaleFactor: spec.scaleFactor,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  // Handle text-specific specs
  if (node.type === "TEXT" && spec.textTruncate) {
    applyTextTruncation(node as TextNode, spec.maxLines ?? 1);
  }
}

/**
 * Truncates text to fit within line limits.
 */
function applyTextTruncation(textNode: TextNode, maxLines: number): void {
  try {
    textNode.textTruncation = "ENDING";
    textNode.maxLines = maxLines;
  } catch {
    // Not all Figma versions support these properties
    debugFixLog("Text truncation not supported", { nodeId: textNode.id });
  }
}

// ============================================================================
// Z-Index Reordering
// ============================================================================

/**
 * Reorders children of the variant frame based on zIndex values from specs.
 * Figma z-order: index 0 = backmost, last index = frontmost.
 *
 * This function collects all visible nodes that have zIndex values,
 * sorts them by zIndex (ascending), then uses insertChild to reorder
 * them within the parent frame.
 */
function reorderChildrenByZIndex(
  variant: FrameNode,
  nodeMap: NodeMap,
  specs: readonly NodeSpec[]
): void {
  // Get specs with zIndex, filter to visible nodes only
  const specsWithZIndex = specs
    .filter((s) => s.visible !== false && s.zIndex !== undefined)
    .sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0));

  if (specsWithZIndex.length === 0) return;

  // Track successfully reordered nodes
  let reorderedCount = 0;

  // Reorder: lower zIndex = earlier in children array = behind
  for (let i = 0; i < specsWithZIndex.length; i++) {
    const spec = specsWithZIndex[i];
    const node = nodeMap[spec.nodeId];

    if (node && node.parent === variant && !node.removed) {
      try {
        // insertChild moves node to specified index
        variant.insertChild(i, node);
        reorderedCount++;
      } catch (error) {
        debugFixLog("Failed to reorder node", {
          nodeId: spec.nodeId,
          nodeName: spec.nodeName,
          targetIndex: i,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }
  }

  if (reorderedCount > 0) {
    debugFixLog("Children reordered by zIndex", {
      reorderedCount,
      totalWithZIndex: specsWithZIndex.length
    });
  }
}

// ============================================================================
// Safe Area Enforcement
// ============================================================================

/**
 * Enforces TikTok safe areas by checking node positions.
 * Logs warnings but doesn't move nodes (AI should handle positioning).
 */
function enforceSafeAreas(frame: FrameNode): void {
  const bottomDangerY = CONSTRAINTS.HEIGHT * (1 - CONSTRAINTS.BOTTOM_DANGER_ZONE);
  const topCautionY = CONSTRAINTS.HEIGHT * CONSTRAINTS.TOP_CAUTION_ZONE;

  const violations: string[] = [];

  function checkNode(node: SceneNode): void {
    if (!node.visible) return;

    if ("absoluteBoundingBox" in node && node.absoluteBoundingBox) {
      const bounds = node.absoluteBoundingBox;
      const frameBounds = frame.absoluteBoundingBox;

      if (!frameBounds) return;

      // Convert to frame-relative coordinates
      const relY = bounds.y - frameBounds.y;
      const relBottom = relY + bounds.height;

      // Check bottom danger zone
      if (relBottom > bottomDangerY && node.type !== "FRAME") {
        violations.push(`${node.name} extends into bottom danger zone (y=${Math.round(relY)})`);
      }

      // Check top caution zone (only warn for important content)
      if (relY < topCautionY && isImportantContent(node)) {
        violations.push(`${node.name} is in top caution zone (y=${Math.round(relY)})`);
      }
    }

    if ("children" in node) {
      for (const child of node.children) {
        checkNode(child);
      }
    }
  }

  for (const child of frame.children) {
    checkNode(child);
  }

  if (violations.length > 0) {
    debugFixLog("Safe area violations detected", {
      count: violations.length,
      violations: violations.slice(0, 5) // Log first 5
    });
  }
}

/**
 * Determines if a node contains important content (text, images).
 */
function isImportantContent(node: SceneNode): boolean {
  if (node.type === "TEXT") return true;
  if ("fills" in node) {
    const fills = node.fills as readonly Paint[] | undefined;
    if (fills?.some((f) => f.type === "IMAGE")) return true;
  }
  return false;
}

// ============================================================================
// Font Loading
// ============================================================================

/**
 * Loads all fonts used in the frame.
 */
async function loadFontsForFrame(frame: FrameNode, cache: Set<string>): Promise<void> {
  const queue: SceneNode[] = [...frame.children];

  while (queue.length > 0) {
    const node = queue.shift()!;

    if (node.type === "TEXT") {
      const textNode = node as TextNode;
      try {
        const fonts = await textNode.getRangeAllFontNames(0, textNode.characters.length);
        for (const font of fonts) {
          const key = `${font.family}__${font.style}`;
          if (!cache.has(key)) {
            await figma.loadFontAsync(font);
            cache.add(key);
          }
        }
      } catch (error) {
        debugFixLog("Failed to load font for text node", {
          nodeId: node.id,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    if ("children" in node) {
      queue.push(...node.children);
    }
  }
}

// ============================================================================
// Instance Detachment
// ============================================================================

/**
 * Recursively detaches all component instances in a frame tree.
 * This converts instances to regular frames, allowing their children
 * to be repositioned freely (Figma locks instance children by default).
 *
 * @param frame - The frame to process
 * @returns Number of instances detached
 */
function detachAllInstances(frame: FrameNode): number {
  let detachCount = 0;

  // Process children in reverse order since detachment may affect indices
  // Use a queue-based approach for the tree traversal
  const nodesToProcess: SceneNode[] = [...frame.children];

  while (nodesToProcess.length > 0) {
    const node = nodesToProcess.shift()!;

    // Check if this is an instance that can be detached
    if (node.type === "INSTANCE") {
      try {
        const instance = node as InstanceNode;
        // detachInstance() converts the instance to a FrameNode in place
        const detached = instance.detachInstance();
        detachCount++;

        // The detached frame may have its own children to process
        if ("children" in detached) {
          nodesToProcess.push(...detached.children);
        }
      } catch (error) {
        debugFixLog("Failed to detach instance", {
          nodeId: node.id,
          nodeName: node.name,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    } else if ("children" in node) {
      // Regular frame/group - process its children
      nodesToProcess.push(...(node as FrameNode | GroupNode).children);
    }
  }

  return detachCount;
}

// ============================================================================
// Atomic Group Detection
// ============================================================================

/**
 * Collects all node IDs that are children of atomic groups.
 * Atomic groups (mockups, illustrations, device frames) should be treated as
 * single visual units - their children should NOT be repositioned independently.
 *
 * This prevents issues like iPhone mockups being torn apart when AI provides
 * separate positioning for the phone frame and screen content.
 *
 * @param frame - The root frame to scan
 * @returns Set of node IDs that are children of atomic groups
 */
function collectAtomicGroupChildren(frame: FrameNode): Set<string> {
  const atomicChildIds = new Set<string>();

  function collectChildIds(parent: SceneNode): void {
    if (!("children" in parent)) return;

    for (const child of (parent as FrameNode | GroupNode).children) {
      atomicChildIds.add(child.id);
      // Recursively collect nested children
      if ("children" in child) {
        collectChildIds(child);
      }
    }
  }

  function scanForAtomicGroups(node: SceneNode): void {
    // Check if this node is an atomic group
    if (isAtomicGroup(node)) {
      debugFixLog("Found atomic group", {
        nodeId: node.id,
        nodeName: node.name,
        type: node.type
      });
      // Collect all children of this atomic group
      collectChildIds(node);
      // Don't recurse into atomic groups - we've already collected their children
      return;
    }

    // Recurse into non-atomic containers
    if ("children" in node) {
      for (const child of (node as FrameNode | GroupNode).children) {
        scanForAtomicGroups(child);
      }
    }
  }

  // Scan all children of the root frame
  for (const child of frame.children) {
    scanForAtomicGroups(child);
  }

  return atomicChildIds;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Calculates the proportional scale factor from source to TikTok dimensions.
 */
export function calculateScaleFactor(sourceFrame: FrameNode): {
  scale: number;
  fitMode: "width" | "height" | "cover";
} {
  const widthScale = CONSTRAINTS.WIDTH / sourceFrame.width;
  const heightScale = CONSTRAINTS.HEIGHT / sourceFrame.height;

  // For TikTok, we typically want to cover (fill the frame)
  // but the AI decides individual element sizing
  const scale = Math.max(widthScale, heightScale);

  const fitMode =
    widthScale > heightScale ? "width" : heightScale > widthScale ? "height" : "cover";

  return { scale, fitMode };
}

/**
 * Gets the center point of the TikTok frame.
 */
export function getTikTokCenter(): { x: number; y: number } {
  return {
    x: CONSTRAINTS.WIDTH / 2,
    y: CONSTRAINTS.HEIGHT / 2
  };
}

/**
 * Calculates a centered position for a node of given dimensions.
 */
export function getCenteredPosition(
  width: number,
  height: number
): { x: number; y: number } {
  return {
    x: (CONSTRAINTS.WIDTH - width) / 2,
    y: (CONSTRAINTS.HEIGHT - height) / 2
  };
}
