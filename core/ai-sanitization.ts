/**
 * AI response sanitization and validation.
 * Normalizes AI-generated signals to ensure consistent data formats
 * and valid vocabulary across roles, QA codes, and confidence values.
 */

import type { AiCollisionZone, AiFaceRegion, AiFocalPoint, AiIntent, AiQaCode, AiQaSignal, AiRole, AiRoleEvidence, AiSignals, AiSubjectOccupancy, ConsolidatedQaCode } from "../types/ai-signals.js";

/**
 * Universal 7-role vocabulary for compositional layout analysis.
 * Handles diverse content: people, mockups, charts, lists, and mixed media.
 */
export const VALID_ROLES: readonly AiRole[] = [
  // Primary focal
  "subject",
  // Branding
  "branding",
  // Typography
  "typography",
  // Interactive
  "action",
  // Structural
  "container",
  "component",
  // Background
  "environment",
  // Catch-all
  "unknown"
] as const;

/**
 * Maps legacy/verbose roles to the universal taxonomy.
 * Ensures backwards compatibility and handles AI responses using old role names.
 */
const ROLE_NORMALIZATION_MAP: Record<string, AiRole> = {
  // Visual hierarchy → subject
  hero: "subject",
  hero_image: "subject",
  hero_bleed: "subject",
  image: "subject",
  secondary_image: "subject",

  // Branding mappings
  logo: "branding",

  // Typography mappings
  heading: "typography",
  text: "typography",
  title: "typography",
  subtitle: "typography",
  body: "typography",
  caption: "typography",

  // Interactive mappings
  cta: "action",
  cta_secondary: "action",

  // Structural mappings
  decorative: "container",
  badge: "component",
  icon: "component",
  divider: "container",

  // Content → component
  list: "component",
  feature_item: "component",
  testimonial: "component",
  rating: "component",
  price: "component",

  // Background
  background: "environment"
};

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
 * Maps granular AI QA codes to consolidated codes for downstream processing.
 * Reduces 28 overlapping codes to 15 distinct actionable signals.
 *
 * Codes not in this map pass through unchanged (already distinct).
 */
const QA_CODE_CONSOLIDATION_MAP: Partial<Record<AiQaCode, ConsolidatedQaCode>> = {
  // Contrast and color harmony → CONTRAST_ISSUE
  "LOW_CONTRAST": "CONTRAST_ISSUE",
  "COLOR_CONTRAST_INSUFFICIENT": "CONTRAST_ISSUE",
  "COLOR_HARMONY_POOR": "CONTRAST_ISSUE",

  // Text sizing and legibility → TEXT_SIZE_ISSUE
  "TEXT_TOO_SMALL_FOR_TARGET": "TEXT_SIZE_ISSUE",
  "TEXT_TOO_SMALL_ACCESSIBLE": "TEXT_SIZE_ISSUE",
  "THUMBNAIL_LEGIBILITY": "TEXT_SIZE_ISSUE",

  // Hierarchy and reading order → HIERARCHY_ISSUE
  "HIERARCHY_UNCLEAR": "HIERARCHY_ISSUE",
  "CONTENT_HIERARCHY_FLAT": "HIERARCHY_ISSUE",
  "HEADING_HIERARCHY_BROKEN": "HIERARCHY_ISSUE",
  "POOR_READING_ORDER": "HIERARCHY_ISSUE",

  // Overflow risks → OVERFLOW_RISK
  "VERTICAL_OVERFLOW_RISK": "OVERFLOW_RISK",
  "HORIZONTAL_OVERFLOW_RISK": "OVERFLOW_RISK",
};

/**
 * Consolidates a granular QA code to its canonical form.
 * Returns the consolidated code if a mapping exists, otherwise returns the original code.
 */
export function consolidateQaCode(code: AiQaCode | ConsolidatedQaCode): ConsolidatedQaCode {
  // If it's already a consolidated code, return as-is
  if (isConsolidatedCode(code)) {
    return code;
  }
  return QA_CODE_CONSOLIDATION_MAP[code as AiQaCode] ?? (code as ConsolidatedQaCode);
}

/**
 * Type guard to check if a code is already a consolidated code.
 */
function isConsolidatedCode(code: string): code is ConsolidatedQaCode {
  const consolidatedCodes = ["CONTRAST_ISSUE", "TEXT_SIZE_ISSUE", "HIERARCHY_ISSUE", "OVERFLOW_RISK"];
  return consolidatedCodes.includes(code);
}

/**
 * Consolidates an array of QA signals, removing duplicates after consolidation.
 * Preserves the highest severity and first message for each consolidated code.
 */
export function consolidateQaSignals(signals: readonly AiQaSignal[]): AiQaSignal[] {
  const consolidated = new Map<ConsolidatedQaCode, AiQaSignal>();

  for (const signal of signals) {
    const consolidatedCode = consolidateQaCode(signal.code);
    const existing = consolidated.get(consolidatedCode);

    if (!existing) {
      // First occurrence: store with consolidated code
      consolidated.set(consolidatedCode, {
        ...signal,
        code: consolidatedCode,
      });
    } else {
      // Merge: keep higher severity, first message
      const severityRank = { error: 3, warn: 2, info: 1 };
      if (severityRank[signal.severity] > severityRank[existing.severity]) {
        consolidated.set(consolidatedCode, {
          ...existing,
          severity: signal.severity,
        });
      }
    }
  }

  return Array.from(consolidated.values());
}

/**
 * Valid intent values for compositional classification (VERSION 8+).
 */
const VALID_INTENTS: readonly AiIntent[] = ["Subject-Dominant", "Information-Dominant", "Grid-Repeat"] as const;

/**
 * Valid subject occupancy zones (VERSION 9+).
 */
const VALID_OCCUPANCY: readonly AiSubjectOccupancy[] = ["left", "right", "center"] as const;

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
  const rawQa = Array.isArray((raw as { qa?: unknown[] }).qa)
    ? (raw as { qa: unknown[] }).qa.map((entry) => sanitizeQa(entry)).filter((entry): entry is AiQaSignal => Boolean(entry))
    : [];
  // Apply consolidation to reduce 28 overlapping codes to 15 distinct signals
  const qa = consolidateQaSignals(rawQa);
  const faceRegions = Array.isArray((raw as { faceRegions?: unknown[] }).faceRegions)
    ? (raw as { faceRegions: unknown[] }).faceRegions
        .map((entry) => sanitizeFaceRegion(entry))
        .filter((entry): entry is AiFaceRegion => Boolean(entry))
    : [];
  const collisionZones = Array.isArray((raw as { collisionZones?: unknown[] }).collisionZones)
    ? (raw as { collisionZones: unknown[] }).collisionZones
        .map((entry) => sanitizeCollisionZone(entry))
        .filter((entry): entry is AiCollisionZone => Boolean(entry))
    : [];

  // Sanitize intent (VERSION 8+)
  const rawIntent = (raw as { intent?: unknown }).intent;
  const intent = typeof rawIntent === "string" && VALID_INTENTS.includes(rawIntent as AiIntent)
    ? (rawIntent as AiIntent)
    : undefined;

  // Sanitize subjectOccupancy (VERSION 9+)
  const rawOccupancy = (raw as { subjectOccupancy?: unknown }).subjectOccupancy;
  const subjectOccupancy = typeof rawOccupancy === "string" && VALID_OCCUPANCY.includes(rawOccupancy as AiSubjectOccupancy)
    ? (rawOccupancy as AiSubjectOccupancy)
    : undefined;

  // VERSION 8+ may not include focalPoints or qa - allow signals with just roles/faceRegions/intent
  if (roles.length === 0 && focalPoints.length === 0 && qa.length === 0 && faceRegions.length === 0 && !intent && !subjectOccupancy) {
    return undefined;
  }

  return {
    roles,
    ...(focalPoints.length > 0 ? { focalPoints } : {}),
    ...(qa.length > 0 ? { qa } : {}),
    ...(faceRegions.length > 0 ? { faceRegions } : {}),
    ...(intent ? { intent } : {}),
    ...(collisionZones.length > 0 ? { collisionZones } : {}),
    ...(subjectOccupancy ? { subjectOccupancy } : {})
  };
}

/**
 * Sanitizes a role entry from AI response.
 * Normalizes camelCase to snake_case, maps legacy roles to new taxonomy,
 * and validates against VALID_ROLES.
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

  // Normalize casing (camelCase → snake_case, trim, lowercase)
  const snakeCaseRole = role
    .trim()
    .replace(/([a-z])([A-Z])/g, "$1_$2")
    .replace(/[\s-]+/g, "_")
    .toLowerCase();

  // Apply legacy role mapping if needed
  const mappedRole = (ROLE_NORMALIZATION_MAP[snakeCaseRole] ?? snakeCaseRole) as AiRole;

  // Validate against simplified taxonomy
  if (!VALID_ROLES.includes(mappedRole)) {
    return null;
  }

  const confidence = clampToUnit((entry as { confidence?: unknown }).confidence);
  return {
    nodeId,
    role: mappedRole,
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
 * Sanitizes a collision zone entry from AI response (VERSION 8+).
 * Validates bounds and clamps coordinates to 0-1 range.
 */
function sanitizeCollisionZone(entry: unknown): AiCollisionZone | null {
  if (!entry || typeof entry !== "object") {
    return null;
  }
  const rawX = (entry as { x?: unknown }).x;
  const rawY = (entry as { y?: unknown }).y;
  const rawW = (entry as { w?: unknown }).w;
  const rawH = (entry as { h?: unknown }).h;

  if (typeof rawX !== "number" || typeof rawY !== "number" ||
      typeof rawW !== "number" || typeof rawH !== "number") {
    return null;
  }

  // Validate reasonable zone dimensions (min 1%, max 100% of frame)
  const w = Math.min(Math.max(rawW, 0.01), 1);
  const h = Math.min(Math.max(rawH, 0.01), 1);

  return {
    x: clampValue(rawX),
    y: clampValue(rawY),
    w,
    h
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
