/**
 * Leaderboard Kill-Switch: Auto-hide subject/hero nodes for small targets.
 *
 * When targets have height < 110px, human subjects and hero images
 * become unrecognizable and detract from the design. This module
 * provides a deterministic safety net that hides these elements
 * regardless of AI recommendations.
 *
 * Integration point: After applyLayoutAdaptation, before adaptNestedFrames
 */

import type { VariantTarget } from "../types/targets.js";
import type { AiSignals } from "../types/ai-signals.js";
import { ROLE_KEY, LEGACY_ROLE_KEY } from "./plugin-constants.js";
import { debugFixLog } from "./debug.js";

/**
 * Configuration for the kill-switch behavior.
 */
export const KILL_SWITCH_CONFIG = {
  /** Target height threshold below which subjects are hidden (px) */
  HEIGHT_THRESHOLD: 110,
  /** Roles that should be hidden for small targets */
  ROLES_TO_HIDE: ["subject", "hero_image", "hero_bleed", "hero"] as const
} as const;

export type KillSwitchRole = (typeof KILL_SWITCH_CONFIG.ROLES_TO_HIDE)[number];

/**
 * Result of applying the kill-switch.
 */
export interface KillSwitchResult {
  /** Whether the kill-switch was activated */
  readonly activated: boolean;
  /** IDs of nodes that were hidden */
  readonly hiddenNodeIds: readonly string[];
  /** Target height that triggered (or did not trigger) the switch */
  readonly targetHeight: number;
  /** The threshold used for comparison */
  readonly threshold: number;
}

/**
 * Returns the role stored on a node via plugin data.
 * Checks both current and legacy keys for backwards compatibility.
 */
function getNodeRole(node: SceneNode): string | null {
  if (!("getPluginData" in node) || typeof node.getPluginData !== "function") {
    return null;
  }
  try {
    const role = node.getPluginData(ROLE_KEY);
    if (role) return role;
    // Fallback to legacy key
    return node.getPluginData(LEGACY_ROLE_KEY) || null;
  } catch {
    return null;
  }
}

/**
 * Recursively finds all nodes with roles that should be hidden.
 */
function findNodesWithRoles(
  node: SceneNode,
  rolesToFind: readonly string[]
): SceneNode[] {
  const matches: SceneNode[] = [];

  const role = getNodeRole(node);
  if (role && rolesToFind.includes(role)) {
    matches.push(node);
  }

  // Recurse into children for container types
  if ("children" in node) {
    for (const child of node.children) {
      matches.push(...findNodesWithRoles(child, rolesToFind));
    }
  }

  return matches;
}

/**
 * Determines if the kill-switch should activate for a given target.
 */
export function shouldActivateKillSwitch(
  target: VariantTarget,
  config: typeof KILL_SWITCH_CONFIG = KILL_SWITCH_CONFIG
): boolean {
  return target.height < config.HEIGHT_THRESHOLD;
}

/**
 * Applies the leaderboard kill-switch to hide subject/hero elements
 * on targets with height below the threshold.
 *
 * This is a deterministic safety net that runs after AI analysis
 * to ensure small targets (like 728x90 leaderboards) don't display
 * unrecognizable human subjects.
 *
 * @param frame The variant frame to process
 * @param target The target dimensions
 * @param _signals Optional AI signals (unused but available for future expansion)
 * @param config Optional configuration override
 * @returns Result indicating whether switch activated and which nodes were hidden
 */
export function applyLeaderboardKillSwitch(
  frame: FrameNode,
  target: VariantTarget,
  _signals: AiSignals | null = null,
  config: typeof KILL_SWITCH_CONFIG = KILL_SWITCH_CONFIG
): KillSwitchResult {
  const activated = shouldActivateKillSwitch(target, config);

  if (!activated) {
    debugFixLog("kill-switch not activated", {
      targetId: target.id,
      targetHeight: target.height,
      threshold: config.HEIGHT_THRESHOLD,
      reason: "height above threshold"
    });

    return {
      activated: false,
      hiddenNodeIds: [],
      targetHeight: target.height,
      threshold: config.HEIGHT_THRESHOLD
    };
  }

  // Find all nodes with subject/hero roles
  const nodesToHide = findNodesWithRoles(frame, [...config.ROLES_TO_HIDE]);
  const hiddenNodeIds: string[] = [];

  for (const node of nodesToHide) {
    // Skip already-hidden nodes to avoid double-processing
    if (!node.visible) {
      debugFixLog("kill-switch skipped already-hidden node", {
        nodeId: node.id,
        nodeName: node.name,
        role: getNodeRole(node)
      });
      continue;
    }

    node.visible = false;
    hiddenNodeIds.push(node.id);

    debugFixLog("kill-switch hid node", {
      nodeId: node.id,
      nodeName: node.name,
      role: getNodeRole(node),
      targetId: target.id
    });
  }

  debugFixLog("kill-switch applied", {
    targetId: target.id,
    targetHeight: target.height,
    threshold: config.HEIGHT_THRESHOLD,
    nodesFound: nodesToHide.length,
    nodesHidden: hiddenNodeIds.length,
    hiddenIds: hiddenNodeIds
  });

  return {
    activated: true,
    hiddenNodeIds,
    targetHeight: target.height,
    threshold: config.HEIGHT_THRESHOLD
  };
}

/**
 * Checks if a specific target ID is known to benefit from the kill-switch.
 * Currently only display-leaderboard (728x90) triggers this.
 */
export function isKillSwitchTarget(targetId: string): boolean {
  // Known targets that trigger kill-switch based on their dimensions
  const KNOWN_KILL_SWITCH_TARGETS = ["display-leaderboard"] as const;
  return KNOWN_KILL_SWITCH_TARGETS.includes(targetId as (typeof KNOWN_KILL_SWITCH_TARGETS)[number]);
}
