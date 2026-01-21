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

  // CRITICAL: Identify atomic instances BEFORE detachment
  // This preserves component boundaries for mockups, illustrations, device frames
  const atomicInstanceIds = collectAtomicInstanceIds(variant);
  if (atomicInstanceIds.size > 0) {
    debugFixLog("Atomic instances identified (will preserve)", {
      count: atomicInstanceIds.size
    });
  }

  // Detach non-atomic instances to allow repositioning of their children
  // Atomic instances (mockups, etc.) are preserved to keep their structure
  const detachCount = detachAllInstances(variant, atomicInstanceIds);
  if (detachCount > 0) {
    debugFixLog("Detached non-atomic instances for repositioning", { detachCount });
  }

  // Build node map for fast lookup
  const nodeMap = buildNodeMap(sourceFrame, variant);

  debugFixLog("Node map built", {
    mappedNodes: Object.keys(nodeMap).length
  });

  // Identify children of atomic groups (mockups, illustrations, etc.)
  // These should NOT be repositioned independently - they move with their parent
  // Now includes both preserved instances AND frame-based atomic groups
  const atomicGroupChildIds = collectAtomicGroupChildren(variant);
  if (atomicGroupChildIds.size > 0) {
    debugFixLog("Atomic group children identified (will skip repositioning)", {
      count: atomicGroupChildIds.size
    });
  }

  // Load fonts for text nodes
  await loadFontsForFrame(variant, fontCache);

  // Track containers that have been repositioned
  // Children of repositioned containers should NOT have their positions overridden
  // (they already moved with the parent)
  const repositionedContainerIds = new Set<string>();

  // Apply each node spec
  for (const spec of specs.nodes) {
    // Diagnostic: Log each spec before application
    debugFixLog("Processing spec", {
      nodeId: spec.nodeId,
      nodeName: spec.nodeName,
      visible: spec.visible,
      hasPosition: !!spec.position,
      position: spec.position,
      hasSize: !!spec.size
    });
    try {
      const targetNode = nodeMap[spec.nodeId];

      if (!targetNode) {
        // Try finding by name as fallback
        const foundByName = findNodeByName(variant, spec.nodeName);
        if (foundByName) {
          // Check if this node's parent was repositioned
          // If so, skip position override (child already moved with parent)
          if (spec.position && foundByName.parent && repositionedContainerIds.has(foundByName.parent.id)) {
            debugFixLog("Skipping position spec for child of repositioned container", {
              nodeId: spec.nodeId,
              nodeName: spec.nodeName,
              parentId: foundByName.parent.id,
              parentName: foundByName.parent.name
            });
            // Still apply other spec properties (visibility, size) but NOT position
            const specWithoutPosition = { ...spec, position: undefined };
            const isAtomicChild = atomicGroupChildIds.has(foundByName.id);
            const isAtomicInstance = atomicInstanceIds.has(foundByName.id);
            applyNodeSpec(foundByName, specWithoutPosition, isAtomicChild, isAtomicInstance);
            appliedSpecs++;
            continue;
          }

          // Check if this is a child of an atomic group OR is an atomic instance itself
          const isAtomicChild = atomicGroupChildIds.has(foundByName.id);
          const isAtomicInstance = atomicInstanceIds.has(foundByName.id);
          applyNodeSpec(foundByName, spec, isAtomicChild, isAtomicInstance);

          // Track if this was a container that got repositioned
          if (spec.position && "children" in foundByName && (foundByName as FrameNode).children.length > 0) {
            repositionedContainerIds.add(foundByName.id);
            debugFixLog("Tracked repositioned container", {
              nodeId: foundByName.id,
              nodeName: foundByName.name,
              childCount: (foundByName as FrameNode).children.length
            });
          }

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

      // Check if this node's parent was repositioned
      // If so, skip position override (child already moved with parent)
      if (spec.position && targetNode.parent && repositionedContainerIds.has(targetNode.parent.id)) {
        debugFixLog("Skipping position spec for child of repositioned container", {
          nodeId: spec.nodeId,
          nodeName: spec.nodeName,
          parentId: targetNode.parent.id,
          parentName: targetNode.parent.name
        });
        // Still apply other spec properties (visibility, size) but NOT position
        const specWithoutPosition = { ...spec, position: undefined };
        const isAtomicChild = atomicGroupChildIds.has(targetNode.id);
        const isAtomicInstance = atomicInstanceIds.has(targetNode.id);
        applyNodeSpec(targetNode, specWithoutPosition, isAtomicChild, isAtomicInstance);
        appliedSpecs++;
        continue;
      }

      // Check if this is a child of an atomic group OR is an atomic instance itself
      const isAtomicChild = atomicGroupChildIds.has(targetNode.id);
      const isAtomicInstance = atomicInstanceIds.has(targetNode.id);
      applyNodeSpec(targetNode, spec, isAtomicChild, isAtomicInstance);

      // Track if this was a container that got repositioned
      if (spec.position && "children" in targetNode && (targetNode as FrameNode).children.length > 0) {
        repositionedContainerIds.add(targetNode.id);
        debugFixLog("Tracked repositioned container", {
          nodeId: targetNode.id,
          nodeName: targetNode.name,
          childCount: (targetNode as FrameNode).children.length
        });
      }

      appliedSpecs++;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      errors.push(`Failed to apply spec for ${spec.nodeName}: ${message}`);
      skippedSpecs++;
    }
  }

  // Reorder children based on zIndex values from specs
  // Pass atomicGroupChildIds so we skip reordering atomic children (preserve their z-order)
  reorderChildrenByZIndex(variant, nodeMap, specs.nodes, atomicGroupChildIds);

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
// Evaluation Adjustment Application
// ============================================================================

/**
 * Result from applying evaluation adjustments.
 */
export interface AdjustmentResult {
  readonly applied: number;
  readonly skipped: number;
  readonly errors: readonly string[];
}

/**
 * Applies evaluation adjustments directly to an existing variant.
 *
 * This is called after Stage 3 evaluation identifies issues.
 * Unlike createDesignVariant which clones and transforms, this
 * modifies nodes in-place based on adjustment specs.
 *
 * @param variant - The TikTok variant frame to adjust
 * @param adjustments - NodeSpec array with corrective changes
 * @param fontCache - Font cache for text modifications
 * @returns Result with counts of applied/skipped adjustments
 */
export async function applyEvaluationAdjustments(
  variant: FrameNode,
  adjustments: readonly NodeSpec[],
  fontCache: Set<string>
): Promise<AdjustmentResult> {
  const errors: string[] = [];
  let applied = 0;
  let skipped = 0;

  if (adjustments.length === 0) {
    return { applied: 0, skipped: 0, errors: [] };
  }

  debugFixLog("Applying evaluation adjustments", {
    variantId: variant.id,
    adjustmentCount: adjustments.length
  });

  // Build a map of all nodes in the variant by ID
  const variantNodeMap = buildVariantNodeMap(variant);

  // Load fonts in case text changes are needed
  await loadFontsForFrame(variant, fontCache);

  // Identify atomic group children (should not be repositioned)
  const atomicGroupChildIds = collectAtomicGroupChildren(variant);

  // Identify atomic instances (should not be resized)
  const atomicInstanceIds = collectAtomicInstanceIds(variant);

  for (const adjustment of adjustments) {
    try {
      // Find node in variant - adjustments reference variant node IDs
      let targetNode = variantNodeMap.get(adjustment.nodeId);

      // Fallback to name search if ID not found
      if (!targetNode) {
        targetNode = findNodeByName(variant, adjustment.nodeName) ?? undefined;
      }

      if (!targetNode) {
        debugFixLog("Node not found for adjustment", {
          nodeId: adjustment.nodeId,
          nodeName: adjustment.nodeName
        });
        skipped++;
        continue;
      }

      // Check if this is a child of an atomic group OR is an atomic instance itself
      const isAtomicChild = atomicGroupChildIds.has(targetNode.id);
      const isAtomicInstance = atomicInstanceIds.has(targetNode.id);

      // Apply the adjustment spec
      applyNodeSpec(targetNode, adjustment, isAtomicChild, isAtomicInstance);
      applied++;

      debugFixLog("Adjustment applied", {
        nodeId: adjustment.nodeId,
        nodeName: adjustment.nodeName,
        visible: adjustment.visible,
        position: adjustment.position,
        size: adjustment.size
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      errors.push(`Failed to apply adjustment for ${adjustment.nodeName}: ${message}`);
      skipped++;
    }
  }

  debugFixLog("Evaluation adjustments complete", {
    applied,
    skipped,
    errorCount: errors.length
  });

  return { applied, skipped, errors };
}

/**
 * Builds a map of all nodes in a variant frame by their IDs.
 * Unlike buildNodeMap which maps source→clone, this maps variant IDs→nodes.
 */
function buildVariantNodeMap(frame: FrameNode): Map<string, SceneNode> {
  const map = new Map<string, SceneNode>();
  const queue: SceneNode[] = [frame];

  while (queue.length > 0) {
    const node = queue.shift()!;
    map.set(node.id, node);

    if ("children" in node) {
      queue.push(...(node as FrameNode | GroupNode).children);
    }
  }

  return map;
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
 * @param isAtomicChild - If true, skip ALL modifications (child of atomic group like iPhone mockup)
 * @param isAtomicInstance - If true, skip size/scale changes but allow position (the instance itself)
 */
function applyNodeSpec(
  node: SceneNode,
  spec: NodeSpec,
  isAtomicChild: boolean = false,
  isAtomicInstance: boolean = false
): void {
  // CRITICAL: Skip ALL modifications for atomic group children
  // They must maintain their exact state relative to parent - including visibility,
  // size, scale, and position. Modifying any of these breaks component integrity
  // (e.g., separating phone bezel from screen, changing z-order of mockup parts)
  if (isAtomicChild) {
    debugFixLog("Skipping ALL spec application for atomic group child", {
      nodeId: spec.nodeId,
      nodeName: spec.nodeName,
      reason: "Child of atomic group - preserving complete state"
    });
    return; // Early exit - no changes at all
  }

  // Handle visibility (only for non-atomic children now)
  if (!spec.visible) {
    node.visible = false;
    return;
  }

  node.visible = true;

  // Apply position - only break auto-layout if position change is significant
  // Position is safe for atomic instances (moves the whole component)
  if (spec.position) {
    // SAFEGUARD: Check if parent is auto-layout - if so, skip position to preserve flow
    // This catches cases where the AI mistakenly provides positions for auto-layout children
    const parentIsAutoLayout = node.parent &&
      "layoutMode" in node.parent &&
      (node.parent as FrameNode).layoutMode !== "NONE";

    if (parentIsAutoLayout) {
      debugFixLog("Skipping position for auto-layout child", {
        nodeId: spec.nodeId,
        nodeName: spec.nodeName,
        parentLayoutMode: (node.parent as FrameNode).layoutMode,
        reason: "Child of auto-layout container - position would break flow"
      });
      // Don't apply position - let it flow with parent
    } else {
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
  }

  // Apply size - SKIP for atomic instances, PRESERVE ASPECT RATIO for images
  if (spec.size && "resize" in node) {
    if (isAtomicInstance) {
      debugFixLog("Skipping size change for atomic instance", {
        nodeId: spec.nodeId,
        nodeName: spec.nodeName,
        requestedSize: spec.size,
        reason: "Resizing component instance breaks internal structure"
      });
    } else {
      // Check if this node has an image fill - images need proportional scaling
      const isImage = hasImageFill(node);

      let targetWidth = spec.size.width;
      let targetHeight = spec.size.height;

      if (isImage && "width" in node && "height" in node) {
        // Preserve aspect ratio for images - calculate proportional size
        const frameNode = node as FrameNode;
        const originalAspect = frameNode.width / frameNode.height;

        // Use the larger scale factor to determine final size
        // This ensures the image fits approximately where AI wanted it (cover behavior)
        const scaleByWidth = spec.size.width / frameNode.width;
        const scaleByHeight = spec.size.height / frameNode.height;
        const scale = Math.max(scaleByWidth, scaleByHeight);

        targetWidth = frameNode.width * scale;
        targetHeight = frameNode.height * scale;

        debugFixLog("Preserving image aspect ratio", {
          nodeId: spec.nodeId,
          nodeName: spec.nodeName,
          original: { w: frameNode.width, h: frameNode.height, aspect: originalAspect },
          specSize: spec.size,
          scale,
          adjusted: { w: targetWidth, h: targetHeight }
        });
      }

      try {
        (node as FrameNode).resize(targetWidth, targetHeight);
      } catch {
        // Try resizeWithoutConstraints
        try {
          if ("resizeWithoutConstraints" in node) {
            (node as FrameNode).resizeWithoutConstraints(targetWidth, targetHeight);
          }
        } catch (error) {
          debugFixLog("Failed to resize node", {
            nodeId: spec.nodeId,
            error: error instanceof Error ? error.message : String(error)
          });
        }
      }
    }
  }

  // Apply scale factor (if size not explicitly set) - SKIP for atomic instances
  if (spec.scaleFactor && spec.scaleFactor !== 1.0 && !spec.size) {
    if (isAtomicInstance) {
      debugFixLog("Skipping scale factor for atomic instance", {
        nodeId: spec.nodeId,
        nodeName: spec.nodeName,
        requestedScale: spec.scaleFactor,
        reason: "Scaling component instance breaks internal structure"
      });
    } else {
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
 *
 * @param variant - The variant frame whose children will be reordered
 * @param nodeMap - Map from source node IDs to cloned nodes in variant
 * @param specs - Array of node specifications with optional zIndex values
 * @param atomicGroupChildIds - Set of node IDs that are children of atomic groups (skip reordering)
 */
function reorderChildrenByZIndex(
  variant: FrameNode,
  nodeMap: NodeMap,
  specs: readonly NodeSpec[],
  atomicGroupChildIds: Set<string>
): void {
  // Get specs with zIndex, filter to visible nodes only, and skip atomic group children
  // Atomic children must not be reordered - they must maintain their z-order within
  // the atomic group (e.g., phone bezel must stay in front of screen content)
  const specsWithZIndex = specs
    .filter((s) => s.visible !== false && s.zIndex !== undefined)
    .filter((s) => {
      const node = nodeMap[s.nodeId];
      if (node && atomicGroupChildIds.has(node.id)) {
        debugFixLog("Skipping z-index reorder for atomic group child", {
          nodeId: s.nodeId,
          nodeName: s.nodeName,
          reason: "Child of atomic group - preserving layer order"
        });
        return false;
      }
      return true;
    })
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

/**
 * Checks if a node contains an image fill that should preserve aspect ratio.
 * Image nodes should not be arbitrarily stretched - they need proportional scaling.
 */
function hasImageFill(node: SceneNode): boolean {
  if (!("fills" in node)) return false;
  const fills = node.fills as readonly Paint[] | undefined;
  return fills?.some((f) => f.type === "IMAGE") ?? false;
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
 * Recursively detaches component instances in a frame tree, EXCEPT for
 * instances identified as atomic groups (mockups, illustrations, device frames).
 *
 * This converts non-atomic instances to regular frames, allowing their children
 * to be repositioned freely (Figma locks instance children by default).
 *
 * Atomic instances are preserved intact to maintain their component boundaries.
 *
 * @param frame - The frame to process
 * @param atomicInstanceIds - Set of instance IDs to skip (detected atomic groups)
 * @returns Number of instances detached
 */
function detachAllInstances(frame: FrameNode, atomicInstanceIds: Set<string> = new Set()): number {
  let detachCount = 0;

  // Process children in reverse order since detachment may affect indices
  // Use a queue-based approach for the tree traversal
  const nodesToProcess: SceneNode[] = [...frame.children];

  while (nodesToProcess.length > 0) {
    const node = nodesToProcess.shift()!;

    // Check if this is an instance that can be detached
    if (node.type === "INSTANCE") {
      // Skip detaching if this instance is an atomic group (mockup, illustration, etc.)
      // This preserves the component boundary so children stay together
      if (atomicInstanceIds.has(node.id)) {
        debugFixLog("Preserving atomic instance (not detaching)", {
          nodeId: node.id,
          nodeName: node.name,
          reason: "Component instance is atomic group - preserving structure"
        });
        // Still process children of atomic instances in case there are nested non-atomic instances
        if ("children" in node) {
          nodesToProcess.push(...(node as InstanceNode).children);
        }
        continue;
      }

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
 * Collects IDs of all atomic instances (INSTANCE nodes that are atomic groups).
 * This must run BEFORE detachAllInstances() so we know which instances to preserve.
 *
 * @param frame - The root frame to scan
 * @returns Set of instance node IDs that should NOT be detached
 */
function collectAtomicInstanceIds(frame: FrameNode): Set<string> {
  const atomicIds = new Set<string>();

  function scanForAtomicInstances(node: SceneNode): void {
    // Check if this instance is an atomic group (mockup, device, illustration)
    if (node.type === "INSTANCE" && isAtomicGroup(node)) {
      atomicIds.add(node.id);
      debugFixLog("Found atomic instance (will preserve)", {
        nodeId: node.id,
        nodeName: node.name
      });
      // Don't recurse into atomic instances - they're fully protected
      return;
    }

    // Recurse into containers
    if ("children" in node) {
      for (const child of (node as FrameNode | GroupNode | InstanceNode).children) {
        scanForAtomicInstances(child);
      }
    }
  }

  for (const child of frame.children) {
    scanForAtomicInstances(child);
  }

  return atomicIds;
}

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
