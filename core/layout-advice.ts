import type { LayoutAdvice, LayoutAdviceEntry, LayoutPatternOption } from "../types/layout-advice.js";
import type { LayoutPatternId } from "../types/layout-patterns.js";
import { isPatternPreferredForTarget } from "../types/layout-patterns.js";
import { debugFixLog } from "./debug.js";
import { LAYOUT_ADVICE_KEY, LEGACY_LAYOUT_ADVICE_KEY } from "./plugin-constants.js";

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

function normalizeEntry(entry: unknown): LayoutAdviceEntry | null {
  if (!entry || typeof entry !== "object") {
    return null;
  }
  const targetId = (entry as { targetId?: unknown }).targetId;
  if (typeof targetId !== "string") {
    return null;
  }
  const options = Array.isArray((entry as { options?: unknown[] }).options)
    ? (entry as { options: unknown[] }).options
    : [];

  const normalizedOptions = options
    .map((option) => normalizeOption(option))
    .filter((option): option is LayoutPatternOption => Boolean(option));

  if (normalizedOptions.length === 0) {
    return null;
  }

  const selectedId = (entry as { selectedId?: unknown }).selectedId;
  const rawMode = (entry as { suggestedLayoutMode?: unknown }).suggestedLayoutMode;
  const suggestedLayoutMode =
    rawMode === "HORIZONTAL" || rawMode === "VERTICAL" || rawMode === "NONE" ? rawMode : undefined;
  const backgroundNodeId = (entry as { backgroundNodeId?: unknown }).backgroundNodeId;

  return {
    targetId,
    selectedId: typeof selectedId === "string" ? selectedId : undefined,
    suggestedLayoutMode,
    backgroundNodeId: typeof backgroundNodeId === "string" ? backgroundNodeId : undefined,
    options: normalizedOptions
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
 * Computes effective confidence with pattern affinity boosting.
 * When AI suggests a pattern that's in the target's preferred list, boost confidence.
 */
function computeEffectiveConfidence(
  baseConfidence: number,
  patternId: string | undefined,
  targetId: string
): number {
  if (!patternId) {
    return baseConfidence;
  }

  // Boost confidence if pattern is in target's preferred list
  if (isPatternPreferredForTarget(patternId as LayoutPatternId, targetId)) {
    return Math.min(baseConfidence + AFFINITY_BOOST, 1.0);
  }

  return baseConfidence;
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
export function autoSelectLayoutPattern(
  advice: LayoutAdvice | null,
  targetId: string,
  options?: { minConfidence?: number; preferAI?: boolean }
): AutoSelectedPattern | null {
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

  // Apply affinity boosting
  const effectiveConfidence = computeEffectiveConfidence(baseConfidence, candidate?.id, targetId);
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
