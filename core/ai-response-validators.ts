/**
 * AI Response Validators for Design Feature
 *
 * This module contains all validation logic for parsing and validating
 * AI responses from the three-stage design process.
 *
 * Extracted from design-prompts.ts to separate concerns:
 * - Prompt building (what we ASK the AI) stays in design-prompts.ts
 * - Response validation (what we GET BACK) lives here
 *
 * Common validation patterns:
 * - Container visibility: Prevent hiding containers with important children
 * - neverHide protection: Enforce protection list from vision analysis
 * - Instance children filtering: Remove specs for INSTANCE node children
 */

import type {
  DesignPlan,
  DesignSpecs,
  DesignEvaluation
} from "../types/design-types.js";
import { USE_STRUCTURED_OUTPUTS } from "./design-schemas.js";

// ============================================================================
// Types for Node Tree Validation
// ============================================================================

/**
 * Minimal node shape for validation purposes.
 * Matches the node tree structure passed to AI.
 */
export interface NodeTreeNode {
  id: string;
  name?: string;
  type?: string;
  hasChildren?: boolean;
  childCount?: number;
  parentId?: string;
  isComponentInstance?: boolean;
}

/**
 * Node tree structure from AI context.
 */
export interface NodeTree {
  nodes: NodeTreeNode[];
}

/**
 * Spec structure for validation (subset of NodeSpec).
 */
export interface NodeSpecForValidation {
  nodeId: string;
  nodeName?: string;
  visible?: boolean;
  position?: { x: number; y: number } | null;
  size?: { width: number; height: number } | null;
}

// ============================================================================
// JSON Extraction Helper
// ============================================================================

/**
 * Extracts JSON from AI response, handling markdown code blocks.
 */
export function extractJsonFromResponse(response: string): string {
  // Try to extract from code block first
  const codeBlockMatch = response.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (codeBlockMatch?.[1]) {
    return codeBlockMatch[1].trim();
  }

  // Try to find JSON object directly
  const jsonMatch = response.match(/\{[\s\S]*\}/);
  if (jsonMatch?.[0]) {
    return jsonMatch[0].trim();
  }

  return response.trim();
}

// ============================================================================
// Common Validation Helpers
// ============================================================================

/**
 * Builds an efficient lookup map from node tree for quick name/id matching.
 */
export function buildNodeLookupMap(
  nodeTree: NodeTree
): Map<string, NodeTreeNode> {
  const map = new Map<string, NodeTreeNode>();
  for (const node of nodeTree.nodes) {
    // Index by id
    map.set(node.id, node);
    // Also index by name for name-based lookups
    if (node.name) {
      map.set(node.name, node);
    }
  }
  return map;
}

/**
 * Validates that containers with children aren't hidden.
 * Returns list of containers that should NOT be hidden.
 *
 * @param hideList - List of node names/ids to hide
 * @param nodeTree - The node tree for parent-child validation
 * @returns Names of containers that have children and shouldn't be hidden
 */
export function validateContainerVisibility(
  hideList: string[],
  nodeTree: NodeTree
): string[] {
  const hiddenContainersWithChildren: string[] = [];

  for (const hideName of hideList) {
    // Find the node by name or id
    const node = nodeTree.nodes.find(
      (n) => n.name === hideName || n.id === hideName
    );
    // Check if it's a container with children
    if (node && node.hasChildren === true && (node.childCount ?? 0) > 0) {
      hiddenContainersWithChildren.push(hideName);
    }
  }

  return hiddenContainersWithChildren;
}

/**
 * Enforces neverHide protection by removing protected elements from hide list.
 * Mutates the hide array and returns list of violations found.
 *
 * @param neverHide - Protected elements that must never be hidden
 * @param hide - Array of elements to hide (will be mutated)
 * @returns List of violations that were auto-corrected
 */
export function enforceNeverHideProtection(
  neverHide: string[],
  hide: string[]
): string[] {
  const protectedSet = new Set(neverHide.map((n) => n.toLowerCase()));
  const violations = hide.filter((name) =>
    protectedSet.has(name.toLowerCase())
  );

  if (violations.length > 0) {
    // Remove protected elements from hide list (mutates array)
    const indicesToRemove = new Set<number>();
    hide.forEach((name, index) => {
      if (protectedSet.has(name.toLowerCase())) {
        indicesToRemove.add(index);
      }
    });

    // Remove in reverse order to maintain indices
    const sortedIndices = Array.from(indicesToRemove).sort((a, b) => b - a);
    for (const index of sortedIndices) {
      hide.splice(index, 1);
    }
  }

  return violations;
}

/**
 * Filters out specs for children of INSTANCE nodes.
 * Component instances are atomic - their children shouldn't be repositioned.
 *
 * @param specs - Array of node specs
 * @param nodeTree - The node tree for parent lookups
 * @returns Object with filtered specs and list of removed spec names
 */
export function filterInstanceChildren(
  specs: NodeSpecForValidation[],
  nodeTree: NodeTree
): { filtered: NodeSpecForValidation[]; removed: string[] } {
  // Build set of INSTANCE node ids
  const instanceIds = new Set(
    nodeTree.nodes
      .filter((n) => n.type === "INSTANCE" || n.isComponentInstance === true)
      .map((n) => n.id)
  );

  if (instanceIds.size === 0) {
    return { filtered: specs, removed: [] };
  }

  const filtered: NodeSpecForValidation[] = [];
  const removed: string[] = [];

  for (const spec of specs) {
    // Find this node in the tree to check its parentId
    const treeNode = nodeTree.nodes.find((n) => n.id === spec.nodeId);

    // If the node's parent is an INSTANCE, filter it out
    if (treeNode?.parentId && instanceIds.has(treeNode.parentId)) {
      removed.push(spec.nodeName || spec.nodeId);
    } else {
      filtered.push(spec);
    }
  }

  return { filtered, removed };
}

/**
 * Validates visual inventory has required fields populated.
 * Returns warnings for missing or empty fields.
 */
export function validateVisualInventory(
  visualInventory: unknown
): string[] {
  const warnings: string[] = [];

  if (!visualInventory || typeof visualInventory !== "object") {
    warnings.push(
      "AI did not provide visual inventory - may miss logos, prices, or other critical elements"
    );
    return warnings;
  }

  const vi = visualInventory as Record<string, unknown>;

  // Check for logo identification
  if (!Array.isArray(vi.logos) || vi.logos.length === 0) {
    warnings.push("No logos identified - verify manually that no branding is hidden");
  }

  // Check for primary subject
  if (!vi.primarySubject || (typeof vi.primarySubject === "string" && vi.primarySubject.trim() === "")) {
    warnings.push("No primary subject identified - focal point may be unclear");
  }

  return warnings;
}

/**
 * Validates design analysis has required fields populated.
 * Returns warnings for missing or incomplete analysis.
 */
export function validateDesignAnalysis(
  designAnalysis: unknown
): string[] {
  const warnings: string[] = [];

  if (!designAnalysis || typeof designAnalysis !== "object") {
    warnings.push(
      "AI did not provide design analysis - transformation may not understand design intent"
    );
    return warnings;
  }

  const analysis = designAnalysis as Record<string, unknown>;
  const requiredFields = [
    "visualFocal",
    "compositionalFlow",
    "layoutLogic",
    "designIntent"
  ];

  const missingFields = requiredFields.filter(
    (field) => !analysis[field] || (typeof analysis[field] === "string" && analysis[field].trim() === "")
  );

  if (missingFields.length > 0) {
    warnings.push(
      `Incomplete design analysis - missing: ${missingFields.join(", ")}`
    );
  }

  // Check for criticalRelationships
  if (
    !Array.isArray(analysis.criticalRelationships) ||
    analysis.criticalRelationships.length === 0
  ) {
    warnings.push(
      "No 'criticalRelationships' identified - layout dependencies may be broken"
    );
  }

  return warnings;
}

// ============================================================================
// Stage 1 Parser
// ============================================================================

/**
 * Validates and parses Stage 1 response.
 * Optionally validates container visibility decisions against the node tree.
 *
 * @param response - The raw AI response string
 * @param nodeTreeJson - Optional node tree JSON for container validation
 */
export function parseStage1Response(
  response: string,
  nodeTreeJson?: string
): {
  success: boolean;
  plan?: DesignPlan;
  error?: string;
  warnings?: string[];
} {
  try {
    // With structured outputs, response is guaranteed valid JSON with correct structure
    // Keep extractJsonFromResponse for legacy mode (feature flag = false)
    const jsonStr = USE_STRUCTURED_OUTPUTS ? response : extractJsonFromResponse(response);
    const parsed = JSON.parse(jsonStr);

    // Structural validation only needed in legacy mode (schema handles it in structured mode)
    if (!USE_STRUCTURED_OUTPUTS) {
      if (!parsed.designStrategy || typeof parsed.designStrategy !== "string") {
        return { success: false, error: "Missing or invalid designStrategy" };
      }
      if (!parsed.elements || typeof parsed.elements !== "object") {
        return { success: false, error: "Missing or invalid elements object" };
      }
      if (!Array.isArray(parsed.elements.keep)) {
        return { success: false, error: "Missing or invalid elements.keep array" };
      }
    }

    const warnings: string[] = [];

    // Validate visual inventory
    const visualInventoryWarnings = validateVisualInventory(parsed.visualInventory);
    if (visualInventoryWarnings.length > 0) {
      console.warn(
        "[Design AI] WARNING: Visual inventory issues:",
        visualInventoryWarnings
      );
      warnings.push(...visualInventoryWarnings);
    } else {
      // Log info about prices (not a warning - not all designs have prices)
      const vi = parsed.visualInventory;
      if (!Array.isArray(vi?.prices) || vi.prices.length === 0) {
        console.log("[Design AI] No prices identified in visual inventory");
      }
    }

    // Validate neverHide list
    if (!Array.isArray(parsed.neverHide) || parsed.neverHide.length === 0) {
      console.warn(
        "[Design AI] WARNING: No 'neverHide' elements identified - critical elements may be hidden"
      );
      warnings.push(
        "No 'neverHide' list provided - logos, prices, and CTAs may be incorrectly hidden"
      );
    } else {
      console.log(`[Design AI] Protected elements (neverHide): ${parsed.neverHide.join(", ")}`);
    }

    // Cross-check: elements.hide should not contain anything from neverHide
    if (Array.isArray(parsed.neverHide) && Array.isArray(parsed.elements?.hide)) {
      const violations = enforceNeverHideProtection(
        parsed.neverHide,
        parsed.elements.hide
      );

      if (violations.length > 0) {
        console.warn(
          "[Design AI] CONFLICT: 'hide' list contains protected elements:",
          violations
        );
        warnings.push(`Protected elements incorrectly in hide list: ${violations.join(", ")}`);
        console.log("[Design AI] Auto-removed protected elements from hide list");
      }
    }

    // Validate design analysis
    const analysisWarnings = validateDesignAnalysis(parsed.designAnalysis);
    if (analysisWarnings.length > 0) {
      console.warn("[Design AI] WARNING: Design analysis issues:", analysisWarnings);
      warnings.push(...analysisWarnings);
    }

    // Validate container visibility decisions if node tree is provided
    if (nodeTreeJson && Array.isArray(parsed.elements?.hide) && parsed.elements.hide.length > 0) {
      try {
        const nodeTree: NodeTree = JSON.parse(nodeTreeJson);
        if (nodeTree.nodes && Array.isArray(nodeTree.nodes)) {
          const hiddenContainersWithChildren = validateContainerVisibility(
            parsed.elements.hide,
            nodeTree
          );

          if (hiddenContainersWithChildren.length > 0) {
            console.warn(
              "[Design AI] WARNING: AI wants to hide containers with children:",
              hiddenContainersWithChildren
            );
            warnings.push(
              `Hiding containers with children may hide important content: ${hiddenContainersWithChildren.join(", ")}`
            );

            // Remove dangerous containers from the hide list
            parsed.elements.hide = parsed.elements.hide.filter(
              (name: string) => !hiddenContainersWithChildren.includes(name)
            );

            console.log(
              "[Design AI] Removed dangerous containers from hide list. Remaining:",
              parsed.elements.hide
            );
          }
        }
      } catch (parseError) {
        // Don't fail the whole operation if validation fails, just log
        console.warn("[Design AI] Could not validate container visibility:", parseError);
      }
    }

    return {
      success: true,
      plan: parsed,
      ...(warnings.length > 0 ? { warnings } : {})
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to parse Stage 1 response: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

// ============================================================================
// Stage 2 Parser
// ============================================================================

/**
 * Validates and parses Stage 2 response.
 * Optionally validates container visibility decisions against the node tree.
 *
 * @param response - The raw AI response string
 * @param nodeTreeJson - Optional node tree JSON for container validation
 */
export function parseStage2Response(
  response: string,
  nodeTreeJson?: string
): {
  success: boolean;
  specs?: DesignSpecs;
  error?: string;
  warnings?: string[];
} {
  try {
    // With structured outputs, response is guaranteed valid JSON with correct structure
    const jsonStr = USE_STRUCTURED_OUTPUTS ? response : extractJsonFromResponse(response);
    const parsed = JSON.parse(jsonStr);

    // Structural validation only needed in legacy mode
    if (!USE_STRUCTURED_OUTPUTS) {
      if (!parsed.plan || typeof parsed.plan !== "object") {
        return { success: false, error: "Missing or invalid plan object" };
      }
      if (!Array.isArray(parsed.nodes)) {
        return { success: false, error: "Missing or invalid nodes array" };
      }

      // Validate each node has required fields
      for (const node of parsed.nodes) {
        if (!node.nodeId || typeof node.nodeId !== "string") {
          return { success: false, error: `Node missing nodeId: ${JSON.stringify(node)}` };
        }
        if (typeof node.visible !== "boolean") {
          return { success: false, error: `Node ${node.nodeId} missing visible boolean` };
        }
      }
    }

    const warnings: string[] = [];

    // Validate container visibility in node specs if node tree is provided
    if (nodeTreeJson && Array.isArray(parsed.nodes)) {
      try {
        const nodeTree: NodeTree = JSON.parse(nodeTreeJson);
        if (nodeTree.nodes && Array.isArray(nodeTree.nodes)) {
          // Find specs that hide containers with children
          const hiddenContainersWithChildren = parsed.nodes.filter(
            (spec: NodeSpecForValidation) => {
              if (spec.visible !== false) return false;

              // Find the corresponding node in the tree
              const treeNode = nodeTree.nodes.find(
                (n) => n.id === spec.nodeId || n.name === spec.nodeName
              );

              // Check if it's a container with children
              return treeNode && treeNode.hasChildren === true && (treeNode.childCount ?? 0) > 0;
            }
          );

          if (hiddenContainersWithChildren.length > 0) {
            console.warn(
              "[Design AI] Stage 2 hiding containers with children:",
              hiddenContainersWithChildren.map((s: NodeSpecForValidation) => s.nodeName)
            );

            warnings.push(
              `Stage 2 tried to hide containers: ${hiddenContainersWithChildren
                .map((s: NodeSpecForValidation) => s.nodeName)
                .join(", ")}`
            );

            // Force containers to visible to prevent hiding children
            for (const spec of parsed.nodes) {
              const isHiddenContainer = hiddenContainersWithChildren.some(
                (h: NodeSpecForValidation) => h.nodeId === spec.nodeId
              );
              if (isHiddenContainer) {
                spec.visible = true;
              }
            }

            console.log(
              "[Design AI] Forced dangerous containers to visible. Fixed:",
              hiddenContainersWithChildren.map((s: NodeSpecForValidation) => s.nodeName)
            );
          }

          // Filter out specs for children of INSTANCE nodes
          const { filtered, removed } = filterInstanceChildren(parsed.nodes, nodeTree);

          if (removed.length > 0) {
            console.warn(
              `[Design AI] Filtering ${removed.length} specs for INSTANCE children:`,
              removed
            );
            warnings.push(
              `Filtered ${removed.length} specs for component instance children: ${removed.slice(0, 5).join(", ")}${removed.length > 5 ? "..." : ""}`
            );
            parsed.nodes = filtered;
          }

          // Enforce neverHide list from Stage 1 vision analysis
          const neverHideList: string[] = parsed.plan?.neverHide || [];

          if (neverHideList.length > 0) {
            const protectedSet = new Set(neverHideList.map((n: string) => n.toLowerCase()));

            // Find specs that try to hide protected elements
            const violatingSpecs = parsed.nodes.filter(
              (spec: NodeSpecForValidation) => {
                if (spec.visible !== false) return false;

                const nameMatch = spec.nodeName && protectedSet.has(spec.nodeName.toLowerCase());
                const idMatch = spec.nodeId && protectedSet.has(spec.nodeId.toLowerCase());

                return nameMatch || idMatch;
              }
            );

            if (violatingSpecs.length > 0) {
              console.warn(
                "[Design AI] Stage 2 trying to hide protected elements from neverHide list:",
                violatingSpecs.map((s: NodeSpecForValidation) => s.nodeName)
              );

              warnings.push(
                `Stage 2 tried to hide protected elements: ${violatingSpecs.map((s: NodeSpecForValidation) => s.nodeName).join(", ")}`
              );

              // Force protected elements to be visible
              for (const spec of parsed.nodes) {
                const nameMatch = spec.nodeName && protectedSet.has(spec.nodeName.toLowerCase());
                const idMatch = spec.nodeId && protectedSet.has(spec.nodeId.toLowerCase());

                if ((nameMatch || idMatch) && spec.visible === false) {
                  spec.visible = true;
                }
              }

              console.log(
                "[Design AI] Enforced neverHide protection, forced visible:",
                violatingSpecs.map((s: NodeSpecForValidation) => s.nodeName)
              );
            }
          } else {
            console.warn("[Design AI] No neverHide list in plan - cannot enforce element protection");
          }
        }
      } catch (parseError) {
        // Don't fail the whole operation if validation fails, just log
        console.warn("[Design AI] Could not validate Stage 2 container visibility:", parseError);
      }
    }

    return {
      success: true,
      specs: parsed,
      ...(warnings.length > 0 ? { warnings } : {})
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to parse Stage 2 response: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

// ============================================================================
// Stage 3 Parser
// ============================================================================

/**
 * Validates and parses Stage 3 response.
 */
export function parseStage3Response(response: string): {
  success: boolean;
  evaluation?: DesignEvaluation;
  error?: string;
} {
  try {
    // With structured outputs, response is guaranteed valid JSON with correct structure
    const jsonStr = USE_STRUCTURED_OUTPUTS ? response : extractJsonFromResponse(response);
    const parsed = JSON.parse(jsonStr);

    // Structural validation only needed in legacy mode
    if (!USE_STRUCTURED_OUTPUTS) {
      if (typeof parsed.passed !== "boolean") {
        return { success: false, error: "Missing or invalid passed boolean" };
      }
    }

    return { success: true, evaluation: parsed };
  } catch (error) {
    return {
      success: false,
      error: `Failed to parse Stage 3 response: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}
