/**
 * Role Resolver
 *
 * Unified role resolution system with clear precedence rules.
 * Eliminates conflicts between 3 competing role systems:
 * - AI Roles (7-role taxonomy from ai-signals.ts)
 * - Element Roles (4 patterns from layout-constants.ts: LOGO, ICON, BADGE, BUTTON)
 * - Plugin Roles (3 roles from node-roles.ts: overlay, subject, environment)
 *
 * PRECEDENCE ORDER (highest to lowest):
 * 1. AI-assigned role (from cached plugin data, highest confidence)
 * 2. Plugin data role (explicit marking, normalized to taxonomy)
 * 3. Name-based heuristic (pattern matching on node name)
 * 4. Structural inference (size, fill type, layer position)
 */

import type { AiRole } from "../types/ai-signals.js";
import { ROLE_KEY, LEGACY_ROLE_KEY } from "./plugin-constants.js";
import { ELEMENT_ROLE_PATTERNS } from "./layout-constants.js";

/**
 * Maps element sub-roles to the unified 7-role taxonomy.
 * LOGO/ICON/BADGE/BUTTON from layout-constants → branding/component/action
 */
const ELEMENT_ROLE_TO_TAXONOMY: Record<string, AiRole> = {
  LOGO: "branding",
  ICON: "component",
  BADGE: "component",
  BUTTON: "action",
};

/**
 * Maps legacy plugin data roles to the unified taxonomy.
 */
const LEGACY_ROLE_TO_TAXONOMY: Record<string, AiRole> = {
  // Legacy names
  hero: "subject",
  hero_bleed: "subject",
  hero_image: "subject",
  background: "environment",
  bg: "environment",
  backdrop: "environment",
  // Overlay is special - not part of 7-role taxonomy but handled separately
  overlay: "environment",
  // Direct mappings that may already be in new format
  subject: "subject",
  branding: "branding",
  typography: "typography",
  action: "action",
  container: "container",
  component: "component",
  environment: "environment",
  unknown: "unknown",
};

/**
 * Name patterns for heuristic role detection.
 * Order matters: more specific patterns should come first.
 */
const NAME_ROLE_PATTERNS: Array<{ pattern: RegExp; role: AiRole }> = [
  // Branding
  { pattern: /\blogo\b/i, role: "branding" },
  { pattern: /\bbrand\b/i, role: "branding" },
  { pattern: /\bmark\b/i, role: "branding" },

  // Action
  { pattern: /\bbutton\b/i, role: "action" },
  { pattern: /\bbtn\b/i, role: "action" },
  { pattern: /\bcta\b/i, role: "action" },

  // Typography
  { pattern: /\btitle\b/i, role: "typography" },
  { pattern: /\bheading\b/i, role: "typography" },
  { pattern: /\bsubtitle\b/i, role: "typography" },
  { pattern: /\bcaption\b/i, role: "typography" },
  { pattern: /\blabel\b/i, role: "typography" },

  // Subject
  { pattern: /\bhero\b/i, role: "subject" },
  { pattern: /\bimage\b/i, role: "subject" },
  { pattern: /\bphoto\b/i, role: "subject" },
  { pattern: /\bmockup\b/i, role: "subject" },
  { pattern: /\bdevice\b/i, role: "subject" },

  // Environment
  { pattern: /\bbackground\b/i, role: "environment" },
  { pattern: /\bbg\b/i, role: "environment" },
  { pattern: /\bbackdrop\b/i, role: "environment" },

  // Component
  { pattern: /\bicon\b/i, role: "component" },
  { pattern: /\bbadge\b/i, role: "component" },
  { pattern: /\bchip\b/i, role: "component" },
  { pattern: /\btag\b/i, role: "component" },
  { pattern: /\bavatar\b/i, role: "component" },
  { pattern: /\brating\b/i, role: "component" },

  // Container
  { pattern: /\bcard\b/i, role: "container" },
  { pattern: /\bframe\b/i, role: "container" },
  { pattern: /\bbox\b/i, role: "container" },
  { pattern: /\bcontainer\b/i, role: "container" },
];

/**
 * Node interface for role resolution.
 * Minimal interface to support both real Figma nodes and test mocks.
 */
export interface RoleResolvableNode {
  readonly name: string;
  readonly type: string;
  readonly width?: number;
  readonly height?: number;
  getPluginData?: (key: string) => string;
  fills?: readonly Paint[];
}

/**
 * Result of role resolution with precedence tracking.
 */
export interface ResolvedRole {
  readonly role: AiRole;
  readonly source: "ai" | "plugin-data" | "name-heuristic" | "structural" | "unknown";
  readonly confidence: number;
}

/**
 * Resolves the role for a node using unified precedence rules.
 *
 * @param node - The node to resolve role for
 * @param aiRoleOverride - Optional AI-assigned role (from signals cache)
 * @param aiConfidence - Confidence of AI role (default 0.8)
 * @returns Resolved role with source and confidence
 */
export function resolveRole(
  node: RoleResolvableNode,
  aiRoleOverride?: AiRole,
  aiConfidence: number = 0.8
): ResolvedRole {
  // Priority 1: AI-assigned role (highest confidence)
  if (aiRoleOverride && isValidTaxonomyRole(aiRoleOverride)) {
    return {
      role: aiRoleOverride,
      source: "ai",
      confidence: aiConfidence,
    };
  }

  // Priority 2: Plugin data role (explicit marking)
  const pluginRole = getPluginDataRole(node);
  if (pluginRole) {
    const normalizedRole = LEGACY_ROLE_TO_TAXONOMY[pluginRole.toLowerCase()];
    if (normalizedRole && isValidTaxonomyRole(normalizedRole)) {
      return {
        role: normalizedRole,
        source: "plugin-data",
        confidence: 0.7,
      };
    }
  }

  // Priority 3: Name-based heuristic
  const nameRole = resolveRoleFromName(node.name);
  if (nameRole) {
    return {
      role: nameRole,
      source: "name-heuristic",
      confidence: 0.5,
    };
  }

  // Priority 4: Structural inference
  const structuralRole = resolveRoleFromStructure(node);
  if (structuralRole) {
    return {
      role: structuralRole,
      source: "structural",
      confidence: 0.3,
    };
  }

  // Default: unknown
  return {
    role: "unknown",
    source: "unknown",
    confidence: 0,
  };
}

/**
 * Checks if a role is valid in the 7-role taxonomy.
 */
function isValidTaxonomyRole(role: string): role is AiRole {
  const validRoles: readonly AiRole[] = [
    "subject",
    "branding",
    "typography",
    "action",
    "container",
    "component",
    "environment",
    "unknown",
  ];
  return validRoles.includes(role as AiRole);
}

/**
 * Gets role from plugin data (current or legacy key).
 */
function getPluginDataRole(node: RoleResolvableNode): string | null {
  if (!node.getPluginData || typeof node.getPluginData !== "function") {
    return null;
  }
  try {
    const role = node.getPluginData(ROLE_KEY);
    if (role) return role;
    const legacyRole = node.getPluginData(LEGACY_ROLE_KEY);
    if (legacyRole) return legacyRole;
  } catch {
    // Plugin data may not be accessible
  }
  return null;
}

/**
 * Resolves role from node name using pattern matching.
 */
function resolveRoleFromName(name: string): AiRole | null {
  // Check element role patterns first (LOGO, ICON, etc.)
  for (const [role, pattern] of Object.entries(ELEMENT_ROLE_PATTERNS)) {
    if (pattern.test(name)) {
      return ELEMENT_ROLE_TO_TAXONOMY[role] ?? null;
    }
  }

  // Check general name patterns
  for (const { pattern, role } of NAME_ROLE_PATTERNS) {
    if (pattern.test(name)) {
      return role;
    }
  }

  return null;
}

/**
 * Resolves role from structural characteristics.
 */
function resolveRoleFromStructure(node: RoleResolvableNode): AiRole | null {
  // TEXT nodes are typography
  if (node.type === "TEXT") {
    return "typography";
  }

  // Check for image/video fills (likely subject or environment)
  if (node.fills && Array.isArray(node.fills)) {
    const fills = node.fills as readonly Paint[];
    const hasImageFill = fills.some(
      (f) => f.type === "IMAGE" || f.type === "VIDEO"
    );
    if (hasImageFill) {
      // Small images are likely subjects/components, large ones are environments
      if (node.width && node.height && node.width < 200 && node.height < 200) {
        return "component";
      }
      return "subject";
    }
  }

  // Small frames/groups are likely components
  if (
    (node.type === "FRAME" || node.type === "GROUP") &&
    node.width &&
    node.height &&
    node.width < 100 &&
    node.height < 100
  ) {
    return "component";
  }

  return null;
}

/**
 * Maps an element role (LOGO, ICON, etc.) to the taxonomy.
 * Useful for backward compatibility with getElementRole().
 */
export function elementRoleToTaxonomy(elementRole: string): AiRole {
  return ELEMENT_ROLE_TO_TAXONOMY[elementRole.toUpperCase()] ?? "component";
}

/**
 * Checks if a role should be exempt from safe area constraints.
 * These elements are allowed to extend beyond frame bounds.
 */
export function isSafeAreaExempt(role: AiRole): boolean {
  return role === "subject" || role === "environment";
}
