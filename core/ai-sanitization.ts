/**
 * AI response sanitization and validation.
 * Normalizes AI-generated signals to ensure consistent data formats
 * and valid vocabulary across roles, QA codes, and confidence values.
 */

import type { AiFaceRegion, AiFocalPoint, AiQaSignal, AiRole, AiRoleEvidence, AiSignals } from "../types/ai-signals.js";

/**
 * Valid semantic role vocabulary for node classification.
 * Roles are categorized by: visual hierarchy, typography, interactive, content, and structural.
 */
export const VALID_ROLES: readonly AiRole[] = [
  // Visual hierarchy
  "logo",
  "hero_image",
  "hero_bleed",
  "secondary_image",
  "background",
  // Typography hierarchy
  "title",
  "subtitle",
  "body",
  "caption",
  // Interactive/Action
  "cta",
  "cta_secondary",
  // Content elements
  "badge",
  "icon",
  "list",
  "feature_item",
  "testimonial",
  "price",
  "rating",
  // Structural
  "divider",
  "container",
  "decorative",
  "unknown"
] as const;

/**
 * Valid QA signal codes for quality warnings.
 * Includes both general signals and target-specific signals.
 */
export const VALID_QA_CODES: readonly AiQaSignal["code"][] = [
  // Existing signals
  "LOW_CONTRAST",
  "LOGO_TOO_SMALL",
  "TEXT_OVERLAP",
  "UNCERTAIN_ROLES",
  "SALIENCE_MISALIGNED",
  "SAFE_AREA_RISK",
  "GENERIC",
  "EXCESSIVE_TEXT",
  "MISSING_CTA",
  "ASPECT_MISMATCH",
  // Target-specific signals
  "TEXT_TOO_SMALL_FOR_TARGET",
  "CONTENT_DENSITY_MISMATCH",
  "THUMBNAIL_LEGIBILITY",
  "OVERLAY_CONFLICT",
  "CTA_PLACEMENT_RISK",
  "HIERARCHY_UNCLEAR",
  "VERTICAL_OVERFLOW_RISK",
  "HORIZONTAL_OVERFLOW_RISK",
  "PATTERN_MISMATCH",
  // Accessibility signals (8 new)
  "COLOR_CONTRAST_INSUFFICIENT",
  "TEXT_TOO_SMALL_ACCESSIBLE",
  "INSUFFICIENT_TOUCH_TARGETS",
  "HEADING_HIERARCHY_BROKEN",
  "POOR_FOCUS_INDICATORS",
  "MOTION_SENSITIVITY_RISK",
  "MISSING_ALT_EQUIVALENT",
  "POOR_READING_ORDER",
  // Design quality signals (6 new)
  "TYPOGRAPHY_INCONSISTENCY",
  "COLOR_HARMONY_POOR",
  "SPACING_INCONSISTENCY",
  "VISUAL_WEIGHT_IMBALANCED",
  "BRAND_CONSISTENCY_WEAK",
  "CONTENT_HIERARCHY_FLAT"
] as const;

/**
 * Sanitizes raw AI response into validated AiSignals.
 * Filters invalid entries, normalizes casing, and clamps confidence values.
 * @returns undefined if no valid entries remain after sanitization
 */
export function sanitizeAiSignals(raw: unknown): AiSignals | undefined {
  if (!raw || typeof raw !== "object") {
    return undefined;
  }
  const roles = Array.isArray((raw as { roles?: unknown[] }).roles)
    ? (raw as { roles: unknown[] }).roles
        .map((entry) => sanitizeRole(entry))
        .filter((entry): entry is AiRoleEvidence => Boolean(entry))
    : [];
  const focalPoints = Array.isArray((raw as { focalPoints?: unknown[] }).focalPoints)
    ? (raw as { focalPoints: unknown[] }).focalPoints
        .map((entry) => sanitizeFocal(entry))
        .filter((entry): entry is AiFocalPoint => Boolean(entry))
    : [];
  const qa = Array.isArray((raw as { qa?: unknown[] }).qa)
    ? (raw as { qa: unknown[] }).qa.map((entry) => sanitizeQa(entry)).filter((entry): entry is AiQaSignal => Boolean(entry))
    : [];
  const faceRegions = Array.isArray((raw as { faceRegions?: unknown[] }).faceRegions)
    ? (raw as { faceRegions: unknown[] }).faceRegions
        .map((entry) => sanitizeFaceRegion(entry))
        .filter((entry): entry is AiFaceRegion => Boolean(entry))
    : [];

  if (roles.length === 0 && focalPoints.length === 0 && qa.length === 0 && faceRegions.length === 0) {
    return undefined;
  }

  return {
    roles,
    focalPoints,
    qa,
    ...(faceRegions.length > 0 ? { faceRegions } : {})
  };
}

/**
 * Sanitizes a role entry from AI response.
 * Normalizes camelCase to snake_case and validates against VALID_ROLES.
 */
function sanitizeRole(entry: unknown): AiRoleEvidence | null {
  if (!entry || typeof entry !== "object") {
    return null;
  }
  const nodeId = (entry as { nodeId?: unknown }).nodeId;
  const role = (entry as { role?: unknown }).role;
  if (typeof nodeId !== "string" || typeof role !== "string") {
    return null;
  }

  const normalizedRole = role
    .trim()
    .replace(/([a-z])([A-Z])/g, "$1_$2")
    .replace(/[\s-]+/g, "_")
    .toLowerCase() as AiRole;
  if (!VALID_ROLES.includes(normalizedRole)) {
    return null;
  }

  const confidence = clampToUnit((entry as { confidence?: unknown }).confidence);
  return {
    nodeId,
    role: normalizedRole,
    confidence: confidence ?? 0.5
  };
}

/**
 * Sanitizes a focal point entry from AI response.
 * Clamps coordinates to 0-1 range.
 */
function sanitizeFocal(entry: unknown): AiFocalPoint | null {
  if (!entry || typeof entry !== "object") {
    return null;
  }
  const nodeId = (entry as { nodeId?: unknown }).nodeId;
  const rawX = (entry as { x?: unknown }).x;
  const rawY = (entry as { y?: unknown }).y;
  if (typeof rawX !== "number" || typeof rawY !== "number") {
    return null;
  }
  return {
    nodeId: typeof nodeId === "string" ? nodeId : "",
    x: clampValue(rawX),
    y: clampValue(rawY),
    confidence: clampToUnit((entry as { confidence?: unknown }).confidence) ?? 0.5
  };
}

/**
 * Sanitizes a face region entry from AI response.
 * Validates dimensions (3%-80% of frame) and clamps coordinates.
 */
function sanitizeFaceRegion(entry: unknown): AiFaceRegion | null {
  if (!entry || typeof entry !== "object") {
    return null;
  }
  const nodeId = (entry as { nodeId?: unknown }).nodeId;
  const rawX = (entry as { x?: unknown }).x;
  const rawY = (entry as { y?: unknown }).y;
  const rawWidth = (entry as { width?: unknown }).width;
  const rawHeight = (entry as { height?: unknown }).height;

  if (typeof rawX !== "number" || typeof rawY !== "number" ||
      typeof rawWidth !== "number" || typeof rawHeight !== "number") {
    return null;
  }

  // Validate reasonable face dimensions (min 3%, max 80% of frame)
  const width = Math.min(Math.max(rawWidth, 0.03), 0.8);
  const height = Math.min(Math.max(rawHeight, 0.03), 0.8);

  return {
    nodeId: typeof nodeId === "string" ? nodeId : "",
    x: clampValue(rawX),
    y: clampValue(rawY),
    width,
    height,
    confidence: clampToUnit((entry as { confidence?: unknown }).confidence) ?? 0.5
  };
}

/**
 * Sanitizes a QA signal entry from AI response.
 * Normalizes code to uppercase and validates against VALID_QA_CODES.
 */
function sanitizeQa(entry: unknown): AiQaSignal | null {
  if (!entry || typeof entry !== "object") {
    return null;
  }
  const code = (entry as { code?: unknown }).code;
  if (typeof code !== "string") {
    return null;
  }
  const normalizedCode = code.trim().toUpperCase() as AiQaSignal["code"];
  if (!VALID_QA_CODES.includes(normalizedCode)) {
    return null;
  }
  const severityRaw = (entry as { severity?: unknown }).severity;
  const severity = severityRaw === "info" ? "info" : severityRaw === "error" ? "error" : "warn";
  const message = (entry as { message?: unknown }).message;
  return {
    code: normalizedCode,
    severity,
    message: typeof message === "string" ? message : undefined,
    confidence: clampToUnit((entry as { confidence?: unknown }).confidence)
  };
}

/**
 * Parses and normalizes confidence values to 0-1 range.
 * Handles: numbers (84 → 0.84), percentage strings ("76%" → 0.76), decimals (0.5 → 0.5).
 * @returns undefined for invalid/NaN inputs
 */
export function clampToUnit(value: unknown): number | undefined {
  const parsed = typeof value === "number" ? value : typeof value === "string" ? Number.parseFloat(value) : NaN;
  if (!Number.isFinite(parsed)) {
    return undefined;
  }
  const normalized = parsed > 1 && parsed <= 100 ? parsed / 100 : parsed;
  return Math.min(Math.max(normalized, 0), 1);
}

/**
 * Clamps a numeric value to 0-1 range.
 */
function clampValue(value: number): number {
  return Math.min(Math.max(value, 0), 1);
}
