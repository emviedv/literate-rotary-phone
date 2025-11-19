import type { LayoutAdvice, LayoutAdviceEntry, LayoutPatternOption } from "../types/layout-advice.js";
import { debugFixLog } from "./debug.js";

type PluginDataNode = Pick<FrameNode, "getPluginData">;

const LAYOUT_KEY = "biblio-assets:layout-advice";
const DEFAULT_CONFIDENCE = 0.6;

export interface AutoSelectedPattern {
  readonly patternId?: string;
  readonly patternLabel?: string;
  readonly confidence?: number;
  readonly fallback: boolean;
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
  return {
    targetId,
    selectedId: typeof selectedId === "string" ? selectedId : undefined,
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

export function readLayoutAdvice(node: PluginDataNode, key: string = LAYOUT_KEY): LayoutAdvice | null {
  let raw: string | null = null;
  try {
    raw = node.getPluginData(key);
  } catch {
    return null;
  }
  if (!raw) {
    return null;
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
    return null;
  }
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
 * Picks the highest-confidence layout pattern for a target, falling back when AI
 * confidence is too low to safely auto-apply a pattern.
 */
export function autoSelectLayoutPattern(
  advice: LayoutAdvice | null,
  targetId: string,
  minConfidence: number = DEFAULT_CONFIDENCE
): AutoSelectedPattern | null {
  if (!advice) {
    return null;
  }
  const entry = advice.entries.find((item) => item.targetId === targetId);
  if (!entry || !Array.isArray(entry.options) || entry.options.length === 0) {
    debugFixLog("auto layout selection missing options", { targetId });
    return { fallback: true };
  }

  const sorted = [...entry.options].sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  const highest = sorted[0];
  const fromSelected = entry.selectedId
    ? entry.options.find((option) => option.id === entry.selectedId)
    : null;

  const candidate = highest ?? fromSelected ?? null;
  const confidence = candidate?.score ?? 0;
  const confidentEnough = confidence >= minConfidence;

  if (!candidate || !confidentEnough) {
    debugFixLog("auto layout selection falling back to deterministic layout", {
      targetId,
      confidence,
      minConfidence
    });
    return {
      patternId: undefined,
      patternLabel: undefined,
      confidence,
      fallback: true
    };
  }

  debugFixLog("auto layout selection succeeded", {
    targetId,
    patternId: candidate.id,
    confidence
  });

  return {
    patternId: candidate.id,
    patternLabel: candidate.label,
    confidence,
    fallback: false
  };
}
