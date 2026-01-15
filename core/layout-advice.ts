import type {
  LayoutAdvice,
  LayoutAdviceEntry,
  LayoutPatternOption,
  TransformationFeasibility,
  RestructurePlan,
  ElementPositioning,
  LayoutWarning
} from "../types/layout-advice.js";
import type { LayoutPatternId } from "../types/layout-patterns.js";
import { isPatternPreferredForTarget } from "../types/layout-patterns.js";
import { debugFixLog } from "./debug.js";
import { LAYOUT_ADVICE_KEY, LEGACY_LAYOUT_ADVICE_KEY } from "./plugin-constants.js";
import { getCalibratedAffinityWeight } from "./ai-confidence-calibration.js";
import type { TargetId } from "../types/targets.js";

type PluginDataNode = Pick<FrameNode, "getPluginData">;

/**
 * Tiered confidence thresholds for layout pattern selection.
 * These tiers determine how AI suggestions are applied.
 */
export const CONFIDENCE_TIERS = {
  /** High confidence: auto-apply pattern with full confidence */
  HIGH: 0.85,
  /** Medium confidence: auto-apply but flag for potential review */
  MEDIUM: 0.65,
  /** Low confidence: use as hint but blend with deterministic fallback */
  LOW: 0.45,
  /** Reject threshold: below this, ignore AI suggestion entirely */
  REJECT: 0.45
} as const;

/** Confidence boost when AI pattern matches target's preferred patterns */
const AFFINITY_BOOST = 0.1;

export interface AutoSelectedPattern {
  readonly patternId?: string;
  readonly patternLabel?: string;
  readonly confidence?: number;
  readonly fallback: boolean;
  /** True when confidence is in MEDIUM tier - suggestion applied but may need review */
  readonly lowConfidence?: boolean;
  /** True when AI hint was used but blended with deterministic approach */
  readonly aiHint?: boolean;
  /** Confidence tier classification */
  readonly tier?: "high" | "medium" | "low" | "reject";
}

const toNumber = (value: unknown): number | undefined => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
};

function clampScore(value: number | undefined): number | undefined {
  if (value === undefined) {
    return undefined;
  }
  const normalized = value > 1 && value <= 100 ? value / 100 : value;
  return Math.min(Math.max(normalized, 0), 1);
}

function normalizeOption(option: unknown): LayoutPatternOption | null {
  if (!option || typeof option !== "object") {
    return null;
  }

  const rawId = (option as { id?: unknown; patternId?: unknown }).id ?? (option as { patternId?: unknown }).patternId;
  const rawLabel = (option as { label?: unknown; name?: unknown }).label ?? (option as { name?: unknown }).name;

  if (typeof rawId !== "string" || typeof rawLabel !== "string") {
    return null;
  }

  const id = rawId;
  const label = rawLabel;

  const optionDescription = (option as { description?: unknown }).description;
  const description: string = typeof optionDescription === "string" ? optionDescription : "";

  const score =
    clampScore(toNumber((option as { score?: unknown }).score)) ??
    clampScore(toNumber((option as { confidence?: unknown }).confidence)) ??
    clampScore(toNumber((option as { probability?: unknown }).probability));

  return {
    id,
    label,
    description,
    score: typeof score === "number" && Number.isFinite(score) ? score : undefined
  };
}

/**
 * Normalizes the feasibility object from AI response.
 */
function normalizeFeasibility(raw: unknown): TransformationFeasibility | undefined {
  if (!raw || typeof raw !== "object") {
    return undefined;
  }
  const obj = raw as Record<string, unknown>;

  return {
    achievable: typeof obj.achievable === "boolean" ? obj.achievable : true,
    requiresRestructure: typeof obj.requiresRestructure === "boolean" ? obj.requiresRestructure : false,
    predictedFill: clampScore(toNumber(obj.predictedFill)) ?? 1.0,  // Default to 100% fill if not specified
    uniformScaleResult: typeof obj.uniformScaleResult === "string" ? obj.uniformScaleResult : undefined
  };
}

/**
 * Normalizes the restructure plan from AI response.
 */
function normalizeRestructure(raw: unknown): RestructurePlan | undefined {
  if (!raw || typeof raw !== "object") {
    return undefined;
  }
  const obj = raw as Record<string, unknown>;

  // Normalize string arrays
  const normalizeStringArray = (arr: unknown): readonly string[] => {
    if (!Array.isArray(arr)) return [];
    return arr.filter((item): item is string => typeof item === "string");
  };

  const contentPriority = normalizeStringArray(obj.contentPriority);
  const keepRequired = normalizeStringArray(obj.keepRequired);

  // If no content priority or keep required, skip
  if (contentPriority.length === 0 && keepRequired.length === 0) {
    return undefined;
  }

  const drop = normalizeStringArray(obj.drop);
  const arrangement = obj.arrangement === "horizontal" || obj.arrangement === "vertical" || obj.arrangement === "stacked"
    ? obj.arrangement
    : undefined;
  const textTreatment = obj.textTreatment === "single-line" || obj.textTreatment === "wrap" || obj.textTreatment === "truncate"
    ? obj.textTreatment
    : undefined;

  return {
    contentPriority,
    drop: drop.length > 0 ? drop : undefined,
    keepRequired,
    arrangement,
    textTreatment
  };
}

/**
 * Normalizes the positioning map from AI response.
 */
function normalizePositioning(raw: unknown): Readonly<Record<string, ElementPositioning>> | undefined {
  if (!raw || typeof raw !== "object") {
    return undefined;
  }
  const result: Record<string, ElementPositioning> = {};
  const obj = raw as Record<string, unknown>;

  for (const [nodeId, posRaw] of Object.entries(obj)) {
    if (!posRaw || typeof posRaw !== "object") continue;
    const pos = posRaw as Record<string, unknown>;

    const region = pos.region;
    if (region !== "left" && region !== "center" && region !== "right" &&
        region !== "top" && region !== "bottom" && region !== "fill") {
      continue;
    }

    const size = pos.size === "auto" || pos.size === "fixed" || pos.size === "fill"
      ? pos.size
      : undefined;

    const maxLines = typeof pos.maxLines === "number" && pos.maxLines > 0
      ? Math.floor(pos.maxLines)
      : undefined;

    result[nodeId] = { region, size, maxLines };
  }

  return Object.keys(result).length > 0 ? result : undefined;
}

/**
 * Normalizes warnings array from AI response.
 */
function normalizeWarnings(raw: unknown): readonly LayoutWarning[] | undefined {
  if (!Array.isArray(raw)) {
    return undefined;
  }

  const warnings: LayoutWarning[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const obj = item as Record<string, unknown>;

    const code = obj.code;
    const message = obj.message;
    const severity = obj.severity;

    if (typeof code !== "string" || typeof message !== "string") continue;
    if (severity !== "info" && severity !== "warn" && severity !== "error") continue;

    warnings.push({ code, message, severity });
  }

  return warnings.length > 0 ? warnings : undefined;
}

function normalizeEntry(entry: unknown): LayoutAdviceEntry | null {
  if (!entry || typeof entry !== "object") {
    return null;
  }
  const targetId = (entry as { targetId?: unknown }).targetId;
  if (typeof targetId !== "string") {
    return null;
  }

  const selectedId = (entry as { selectedId?: unknown }).selectedId;
  const rawMode = (entry as { suggestedLayoutMode?: unknown }).suggestedLayoutMode;
  const suggestedLayoutMode =
    rawMode === "HORIZONTAL" || rawMode === "VERTICAL" || rawMode === "NONE" ? rawMode : undefined;
  const backgroundNodeId = (entry as { backgroundNodeId?: unknown }).backgroundNodeId;
  const description = (entry as { description?: unknown }).description;

  // Normalize new fields for transformation intelligence
  const feasibility = normalizeFeasibility((entry as { feasibility?: unknown }).feasibility);
  const restructure = normalizeRestructure((entry as { restructure?: unknown }).restructure);
  const positioning = normalizePositioning((entry as { positioning?: unknown }).positioning);
  const warnings = normalizeWarnings((entry as { warnings?: unknown }).warnings);

  // Try to get options array first
  const options = Array.isArray((entry as { options?: unknown[] }).options)
    ? (entry as { options: unknown[] }).options
    : [];

  let normalizedOptions = options
    .map((option) => normalizeOption(option))
    .filter((option): option is LayoutPatternOption => Boolean(option));

  // If no options but we have a selectedId and score, create an option from the entry itself
  // This handles the simpler format: {targetId, selectedId, score, description, suggestedLayoutMode}
  if (normalizedOptions.length === 0 && typeof selectedId === "string") {
    const score = clampScore(toNumber((entry as { score?: unknown }).score));
    const patternLabel = selectedId
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");

    normalizedOptions = [
      {
        id: selectedId,
        label: patternLabel,
        description: typeof description === "string" ? description : "",
        score
      }
    ];
  }

  if (normalizedOptions.length === 0) {
    return null;
  }

  return {
    targetId,
    selectedId: typeof selectedId === "string" ? selectedId : undefined,
    suggestedLayoutMode,
    backgroundNodeId: typeof backgroundNodeId === "string" ? backgroundNodeId : undefined,
    options: normalizedOptions,
    description: typeof description === "string" ? description : undefined,
    // New fields for transformation intelligence
    feasibility,
    restructure,
    positioning,
    warnings
  };
}

export function normalizeLayoutAdvice(raw: unknown): LayoutAdvice | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const entries = Array.isArray((raw as { entries?: unknown[] }).entries)
    ? (raw as { entries: unknown[] }).entries
    : [];

  const normalizedEntries = entries
    .map((entry) => normalizeEntry(entry))
    .filter((entry): entry is LayoutAdviceEntry => Boolean(entry));

  if (normalizedEntries.length === 0) {
    return null;
  }

  return { entries: normalizedEntries };
}

export function readLayoutAdvice(node: PluginDataNode, key: string = LAYOUT_ADVICE_KEY): LayoutAdvice | null {
  const candidateKeys = key === LAYOUT_ADVICE_KEY ? [LAYOUT_ADVICE_KEY, LEGACY_LAYOUT_ADVICE_KEY] : [key];

  for (const candidate of candidateKeys) {
    let raw: string | null = null;
    try {
      raw = node.getPluginData(candidate);
    } catch {
      continue;
    }
    if (!raw) {
      continue;
    }
    try {
      const parsed = JSON.parse(raw) as LayoutAdvice;
      const normalized = normalizeLayoutAdvice(parsed);
      debugFixLog("layout advice parsed", {
        entries: normalized?.entries?.length ?? 0
      });
      return normalized;
    } catch (error) {
      debugFixLog("layout advice parse failed", { error: error instanceof Error ? error.message : String(error) });
    }
  }

  return null;
}

export function resolvePatternLabel(
  advice: LayoutAdvice | null,
  targetId: string,
  patternId: string | undefined
): string | undefined {
  if (!advice || !patternId) {
    return undefined;
  }
  const entry = advice.entries.find((item) => item.targetId === targetId);
  const match = entry?.options.find((option) => option.id === patternId);
  return match?.label;
}

/**
 * Computes effective confidence with adaptive pattern affinity adjustment.
 * Uses machine learning to adjust confidence based on historical user feedback.
 */
async function computeEffectiveConfidence(
  baseConfidence: number,
  patternId: string | undefined,
  targetId: string
): Promise<number> {
  if (!patternId) {
    return baseConfidence;
  }

  try {
    // Get calibrated affinity weight based on historical user feedback
    const calibratedWeight = await getCalibratedAffinityWeight(
      targetId as TargetId,
      patternId as LayoutPatternId
    );

    // Apply calibrated weight instead of fixed boost
    const adjustedConfidence = baseConfidence + calibratedWeight;

    // Also apply traditional preferred pattern boost for fallback
    if (isPatternPreferredForTarget(patternId as LayoutPatternId, targetId)) {
      const traditionalBoost = Math.max(0, AFFINITY_BOOST - Math.abs(calibratedWeight));
      return Math.min(adjustedConfidence + traditionalBoost, 1.0);
    }

    return Math.max(0, Math.min(adjustedConfidence, 1.0));
  } catch (error) {
    debugFixLog("Failed to get calibrated affinity weight, using fallback", {
      error: error instanceof Error ? error.message : String(error),
      patternId,
      targetId
    });

    // Fallback to original logic if calibration fails
    if (isPatternPreferredForTarget(patternId as LayoutPatternId, targetId)) {
      return Math.min(baseConfidence + AFFINITY_BOOST, 1.0);
    }
    return baseConfidence;
  }
}

/**
 * Determines the confidence tier for a given confidence value.
 */
function getConfidenceTier(confidence: number): "high" | "medium" | "low" | "reject" {
  if (confidence >= CONFIDENCE_TIERS.HIGH) {
    return "high";
  }
  if (confidence >= CONFIDENCE_TIERS.MEDIUM) {
    return "medium";
  }
  if (confidence >= CONFIDENCE_TIERS.LOW) {
    return "low";
  }
  return "reject";
}

/**
 * Picks the highest-confidence layout pattern for a target using tiered confidence.
 *
 * Confidence tiers:
 * - HIGH (≥0.85): Auto-apply with full confidence
 * - MEDIUM (≥0.65): Auto-apply but flag for potential review
 * - LOW (≥0.45): Use as hint but blend with deterministic fallback
 * - REJECT (<0.45): Ignore AI suggestion entirely
 *
 * Pattern affinity boosting: When AI suggests a pattern that's in the target's
 * preferred list (from PATTERN_AFFINITY), confidence is boosted by 0.1.
 */
export async function autoSelectLayoutPattern(
  advice: LayoutAdvice | null,
  targetId: string,
  options?: { minConfidence?: number; preferAI?: boolean }
): Promise<AutoSelectedPattern | null> {
  const minConfidence = options?.minConfidence ?? CONFIDENCE_TIERS.MEDIUM;

  if (!advice) {
    return null;
  }
  const entry = advice.entries.find((item) => item.targetId === targetId);
  if (!entry || !Array.isArray(entry.options) || entry.options.length === 0) {
    debugFixLog("auto layout selection missing options", { targetId });
    return { fallback: true, tier: "reject" };
  }

  const sorted = [...entry.options].sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  const highest = sorted[0];
  const fromSelected = entry.selectedId
    ? entry.options.find((option) => option.id === entry.selectedId)
    : null;

  const candidate = highest ?? fromSelected ?? null;
  const baseConfidence = candidate?.score ?? 0;

  // Apply adaptive affinity adjustment based on user feedback
  const effectiveConfidence = await computeEffectiveConfidence(baseConfidence, candidate?.id, targetId);
  const tier = getConfidenceTier(effectiveConfidence);

  debugFixLog("auto layout selection confidence analysis", {
    targetId,
    patternId: candidate?.id,
    baseConfidence,
    effectiveConfidence,
    tier,
    affinityBoosted: effectiveConfidence > baseConfidence
  });

  // Handle each tier
  if (tier === "reject" || !candidate) {
    debugFixLog("auto layout selection rejected - confidence too low", {
      targetId,
      effectiveConfidence,
      minConfidence
    });
    return {
      patternId: undefined,
      patternLabel: undefined,
      confidence: effectiveConfidence,
      fallback: true,
      tier: "reject"
    };
  }

  if (tier === "low") {
    // Use AI as hint but signal that deterministic blending is recommended
    debugFixLog("auto layout selection using AI hint with fallback blend", {
      targetId,
      patternId: candidate.id,
      effectiveConfidence
    });
    return {
      patternId: candidate.id,
      patternLabel: candidate.label,
      confidence: effectiveConfidence,
      fallback: true,
      aiHint: true,
      tier: "low"
    };
  }

  if (tier === "medium") {
    // Apply but flag for potential review
    debugFixLog("auto layout selection succeeded with medium confidence", {
      targetId,
      patternId: candidate.id,
      effectiveConfidence
    });
    return {
      patternId: candidate.id,
      patternLabel: candidate.label,
      confidence: effectiveConfidence,
      fallback: false,
      lowConfidence: true,
      tier: "medium"
    };
  }

  // High confidence - apply with full confidence
  debugFixLog("auto layout selection succeeded with high confidence", {
    targetId,
    patternId: candidate.id,
    effectiveConfidence
  });

  return {
    patternId: candidate.id,
    patternLabel: candidate.label,
    confidence: effectiveConfidence,
    fallback: false,
    tier: "high"
  };
}
