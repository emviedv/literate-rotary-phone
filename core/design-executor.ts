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
import { applyProximityAutoLayout } from "./proximity-auto-layout.js";
import {
  buildNodeMap,
  buildVariantNodeMap,
  findNodeByName,
} from "./node-map-builder.js";
import {
  enforceEdgePadding,
  enforceSafeAreas,
} from "./edge-enforcement.js";
import {
  collectAtomicInstanceIds,
  collectAtomicGroupChildren,
  detachAllInstances,
} from "./instance-management.js";
import {
  applyNodeSpec,
  reorderChildrenByZIndex,
} from "./spec-applicator.js";

declare const figma: PluginAPI;

// ============================================================================
// Orphaned Container Handling
// ============================================================================

/**
 * Checks if a node has visible styling that would create artifacts
 * when left orphaned (stroke, visible fill, etc.)
 */
function hasVisibleContainerStyling(node: SceneNode): boolean {
  if (!("strokes" in node) && !("fills" in node)) return false;

  const frameNode = node as FrameNode;

  // Check for visible strokes
  if ("strokes" in frameNode && Array.isArray(frameNode.strokes)) {
    const strokes = frameNode.strokes as readonly Paint[];
    if (strokes.some(s => s.visible !== false)) {
      return true;
    }
  }

  // Check for visible solid/gradient fills (not image fills, which are content)
  if ("fills" in frameNode && Array.isArray(frameNode.fills)) {
    const fills = frameNode.fills as readonly Paint[];
    if (fills.some(f => f.visible !== false && f.type !== "IMAGE")) {
      return true;
    }
  }

  return false;
}

/**
 * Hides containers that have visible styling but no visible children.
 * Prevents visual artifacts from orphaned container frames.
 */
function hideOrphanedStyledContainers(frame: FrameNode): void {
  const queue: SceneNode[] = [...frame.children];

  while (queue.length > 0) {
    const node = queue.shift()!;

    if ("children" in node) {
      const frameNode = node as FrameNode;

      // Check if this is a styled container with no visible children
      if (hasVisibleContainerStyling(frameNode)) {
        const visibleChildren = frameNode.children.filter(c => c.visible);
        if (visibleChildren.length === 0) {
          frameNode.visible = false;
          debugFixLog("Hiding empty styled container", {
            nodeId: frameNode.id,
            nodeName: frameNode.name,
            reason: "Container has visible styling but no visible children"
          });
          continue; // Don't recurse into hidden container
        }
      }

      // Recurse into children
      queue.push(...frameNode.children);
    }
  }
}

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

  // Log initial frame properties after cloning
  debugFixLog("FRAME_CLONED", {
    width: variant.width,
    height: variant.height,
    frameId: variant.id,
    frameName: variant.name,
    layoutMode: variant.layoutMode,
    constraints: {
      horizontal: variant.constraints?.horizontal || "NONE",
      vertical: variant.constraints?.vertical || "NONE"
    },
    parent: variant.parent?.type || "none",
    locked: variant.locked,
    visible: variant.visible
  });

  // PROXIMITY-BASED AUTO-LAYOUT: Apply proximity grouping BEFORE scaling
  // This prevents collisions by grouping nearby elements into auto-layout containers
  try {
    const proximityResult = await applyProximityAutoLayout(variant, {
      proximityThreshold: 50,
      enableDebugLogging: true,
      fillVerticalSpace: true  // Make vertical containers fill TikTok frame height
    });
    debugFixLog("Proximity-based auto-layout applied", {
      groupsCreated: proximityResult.groupsCreated,
      elementsGrouped: proximityResult.elementsGrouped,
      elementsSkipped: proximityResult.elementsSkipped,
      processingTimeMs: proximityResult.processingTimeMs,
      success: proximityResult.success
    });

    if (proximityResult.errors.length > 0) {
      debugFixLog("Proximity processing had errors", {
        errors: proximityResult.errors.slice(0, 3) // Log first 3 errors
      });
    }

    // Log frame dimensions after proximity processing
    debugFixLog("FRAME_AFTER_PROXIMITY", {
      width: variant.width,
      height: variant.height,
      frameId: variant.id,
      proximitySuccess: proximityResult.success,
      groupsCreated: proximityResult.groupsCreated
    });

  } catch (proximityError) {
    debugFixLog("Proximity processing failed with exception", {
      error: proximityError instanceof Error ? proximityError.message : String(proximityError)
    });

    // Log frame dimensions after proximity error
    debugFixLog("FRAME_AFTER_PROXIMITY_ERROR", {
      width: variant.width,
      height: variant.height,
      frameId: variant.id
    });

    // Continue with normal processing - proximity is enhancement, not requirement
  }

  // Ensure frame's image fills use cover behavior (prevents skewing on resize)
  if (Array.isArray(variant.fills)) {
    const fills = variant.fills as Paint[];
    const hasImageFill = fills.some((f) => f.type === "IMAGE");
    if (hasImageFill) {
      variant.fills = fills.map((fill) =>
        fill.type === "IMAGE"
          ? { ...fill, scaleMode: "FILL" as const }
          : fill
      );
      debugFixLog("Set image fill scaleMode to FILL for cover behavior", {
        frameId: variant.id,
        frameName: variant.name
      });
    }
  }

  // Log initial dimensions before resize
  debugFixLog("FRAME_RESIZE_BEFORE", {
    width: variant.width,
    height: variant.height,
    targetWidth: CONSTRAINTS.WIDTH,
    targetHeight: CONSTRAINTS.HEIGHT,
    frameId: variant.id,
    frameName: variant.name,
    layoutMode: variant.layoutMode,
    constraints: {
      horizontal: variant.constraints?.horizontal || "NONE",
      vertical: variant.constraints?.vertical || "NONE"
    }
  });

  // Resize to TikTok dimensions
  variant.resizeWithoutConstraints(CONSTRAINTS.WIDTH, CONSTRAINTS.HEIGHT);

  // Log actual dimensions after resize
  debugFixLog("FRAME_RESIZE_AFTER", {
    width: variant.width,
    height: variant.height,
    targetWidth: CONSTRAINTS.WIDTH,
    targetHeight: CONSTRAINTS.HEIGHT,
    frameId: variant.id,
    frameName: variant.name,
    resizeSuccessful: variant.width === CONSTRAINTS.WIDTH && variant.height === CONSTRAINTS.HEIGHT
  });

  // Break auto-layout for aggressive repositioning
  if (variant.layoutMode !== "NONE") {
    debugFixLog("Breaking auto-layout for manual positioning", {
      originalMode: variant.layoutMode
    });
    variant.layoutMode = "NONE";
  }

  // 1. Build node map FIRST (before any modifications)
  // This ensures source→variant mapping works while trees are structurally identical
  const nodeMap = buildNodeMap(sourceFrame, variant);
  debugFixLog("Node map built", {
    mappedNodes: Object.keys(nodeMap).length
  });

  // 2. Identify atomic instances BEFORE detachment
  // This preserves component boundaries for mockups, illustrations, device frames
  const atomicInstanceIds = collectAtomicInstanceIds(variant);
  if (atomicInstanceIds.size > 0) {
    debugFixLog("Atomic instances identified (will preserve)", {
      count: atomicInstanceIds.size
    });
  }

  // 3. Detach non-atomic instances to allow repositioning of their children
  // Atomic instances (mockups, etc.) are preserved to keep their structure
  const detachCount = detachAllInstances(variant, atomicInstanceIds);
  if (detachCount > 0) {
    debugFixLog("Detached non-atomic instances for repositioning", { detachCount });
  }

  // 4. Identify children of atomic groups (after detachment is fine)
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

  // Hide orphaned containers with visible styling but no visible children
  // This prevents visual artifacts when children are repositioned outside their parent
  hideOrphanedStyledContainers(variant);

  // Reorder children based on zIndex values from specs
  // Pass atomicGroupChildIds so we skip reordering atomic children (preserve their z-order)
  reorderChildrenByZIndex(variant, nodeMap, specs.nodes, atomicGroupChildIds);

  // Enforce edge padding for all text (catches nested text in containers)
  enforceEdgePadding(variant);

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
