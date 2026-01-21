import type {
  LayoutAdvice,
  LayoutAdviceEntry,
  LayoutPatternOption,
  TransformationFeasibility,
  RestructurePlan,
  ElementPositioning,
  LayoutWarning,
  AnchorRegion,
  ConstraintBehavior,
  EdgeOffset,
  SizeSpec,
  TextDirective,
  ImageDirective,
  ContainerAlignment,
  SpacingSpec,
  NodeWarning,
  PositioningMap
} from "../types/layout-advice.js";
import { debugFixLog } from "./debug.js";
import { LAYOUT_ADVICE_KEY, LEGACY_LAYOUT_ADVICE_KEY } from "./plugin-constants.js";

type PluginDataNode = Pick<FrameNode, "getPluginData">;

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

// ============================================================================
// Positioning Normalization (Comprehensive Schema)
// ============================================================================

const VALID_ANCHORS: readonly AnchorRegion[] = [
  "top-left", "top-center", "top-right",
  "center-left", "center", "center-right",
  "bottom-left", "bottom-center", "bottom-right",
  "fill"
];

const LEGACY_REGION_TO_ANCHOR: Record<string, AnchorRegion> = {
  "left": "center-left",
  "center": "center",
  "right": "center-right",
  "top": "top-center",
  "bottom": "bottom-center",
  "fill": "fill"
};

/**
 * Normalizes constraint behavior from AI response.
 */
function normalizeConstraints(raw: unknown): ConstraintBehavior | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const obj = raw as Record<string, unknown>;

  const validHorizontal = ["left", "right", "center", "stretch", "scale"];
  const validVertical = ["top", "bottom", "center", "stretch", "scale"];

  const horizontal = validHorizontal.includes(obj.horizontal as string)
    ? obj.horizontal as ConstraintBehavior["horizontal"]
    : "center";
  const vertical = validVertical.includes(obj.vertical as string)
    ? obj.vertical as ConstraintBehavior["vertical"]
    : "center";

  return { horizontal, vertical };
}

/**
 * Normalizes edge offset from AI response.
 */
function normalizeOffset(raw: unknown): EdgeOffset | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const obj = raw as Record<string, unknown>;

  const result: EdgeOffset = {};
  if (typeof obj.left === "number") (result as { left?: number }).left = obj.left;
  if (typeof obj.right === "number") (result as { right?: number }).right = obj.right;
  if (typeof obj.top === "number") (result as { top?: number }).top = obj.top;
  if (typeof obj.bottom === "number") (result as { bottom?: number }).bottom = obj.bottom;
  if (typeof obj.fromSafeArea === "boolean") (result as { fromSafeArea?: boolean }).fromSafeArea = obj.fromSafeArea;

  return Object.keys(result).length > 0 ? result : undefined;
}

/**
 * Normalizes size specification from AI response.
 */
function normalizeSizeSpec(raw: unknown): SizeSpec | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const obj = raw as Record<string, unknown>;

  // Handle legacy string format
  if (typeof raw === "string") {
    const mode = raw === "auto" || raw === "fixed" || raw === "fill" ? raw : "auto";
    return { mode };
  }

  const validModes = ["auto", "fixed", "fill", "hug", "scale-proportional"];
  const mode = validModes.includes(obj.mode as string)
    ? obj.mode as SizeSpec["mode"]
    : "auto";

  const result: SizeSpec = { mode };

  if (typeof obj.width === "number" && obj.width > 0) (result as { width?: number }).width = obj.width;
  if (typeof obj.height === "number" && obj.height > 0) (result as { height?: number }).height = obj.height;
  if (typeof obj.minWidth === "number" && obj.minWidth > 0) (result as { minWidth?: number }).minWidth = obj.minWidth;
  if (typeof obj.maxWidth === "number" && obj.maxWidth > 0) (result as { maxWidth?: number }).maxWidth = obj.maxWidth;
  if (typeof obj.minHeight === "number" && obj.minHeight > 0) (result as { minHeight?: number }).minHeight = obj.minHeight;
  if (typeof obj.maxHeight === "number" && obj.maxHeight > 0) (result as { maxHeight?: number }).maxHeight = obj.maxHeight;
  if (typeof obj.scaleFactor === "number" && obj.scaleFactor > 0 && obj.scaleFactor <= 10) {
    (result as { scaleFactor?: number }).scaleFactor = obj.scaleFactor;
  }

  return result;
}

/**
 * Normalizes text directive from AI response.
 */
function normalizeTextDirective(raw: unknown): TextDirective | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const obj = raw as Record<string, unknown>;

  const result: TextDirective = {};

  if (typeof obj.maxLines === "number" && obj.maxLines > 0) {
    (result as { maxLines?: number }).maxLines = Math.floor(obj.maxLines);
  }
  if (typeof obj.maxChars === "number" && obj.maxChars > 0) {
    (result as { maxChars?: number }).maxChars = Math.floor(obj.maxChars);
  }
  if (obj.truncation === "ellipsis" || obj.truncation === "clip" || obj.truncation === "fade") {
    (result as { truncation?: TextDirective["truncation"] }).truncation = obj.truncation;
  }
  if (typeof obj.minFontSize === "number" && obj.minFontSize > 0) {
    (result as { minFontSize?: number }).minFontSize = obj.minFontSize;
  }
  if (typeof obj.targetFontSize === "number" && obj.targetFontSize > 0) {
    (result as { targetFontSize?: number }).targetFontSize = obj.targetFontSize;
  }
  if (typeof obj.lineHeight === "number" && obj.lineHeight > 0) {
    (result as { lineHeight?: number }).lineHeight = obj.lineHeight;
  }
  if (obj.textAlign === "left" || obj.textAlign === "center" || obj.textAlign === "right" || obj.textAlign === "justify") {
    (result as { textAlign?: TextDirective["textAlign"] }).textAlign = obj.textAlign;
  }
  if (typeof obj.alternateText === "string" && obj.alternateText.length > 0) {
    (result as { alternateText?: string }).alternateText = obj.alternateText;
  }

  return Object.keys(result).length > 0 ? result : undefined;
}

/**
 * Normalizes image directive from AI response.
 */
function normalizeImageDirective(raw: unknown): ImageDirective | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const obj = raw as Record<string, unknown>;

  const validFits = ["cover", "contain", "fill", "none"];
  const fit = validFits.includes(obj.fit as string)
    ? obj.fit as ImageDirective["fit"]
    : "cover";

  const result: ImageDirective = { fit };

  // Crop focus
  if (obj.cropFocus && typeof obj.cropFocus === "object") {
    const cf = obj.cropFocus as Record<string, unknown>;
    if (typeof cf.x === "number" && typeof cf.y === "number") {
      (result as { cropFocus?: { x: number; y: number } }).cropFocus = {
        x: Math.max(0, Math.min(1, cf.x)),
        y: Math.max(0, Math.min(1, cf.y))
      };
    }
  }

  if (typeof obj.allowBleed === "boolean") {
    (result as { allowBleed?: boolean }).allowBleed = obj.allowBleed;
  }

  const validBleedAnchors = ["left", "right", "top", "bottom"];
  if (validBleedAnchors.includes(obj.bleedAnchor as string)) {
    (result as { bleedAnchor?: ImageDirective["bleedAnchor"] }).bleedAnchor = obj.bleedAnchor as ImageDirective["bleedAnchor"];
  }

  return result;
}

/**
 * Normalizes container alignment from AI response.
 */
function normalizeContainerAlignment(raw: unknown): ContainerAlignment | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const obj = raw as Record<string, unknown>;

  const result: ContainerAlignment = {};

  const validPrimary = ["start", "center", "end", "space-between", "space-around"];
  const validCounter = ["start", "center", "end", "stretch", "baseline"];

  if (validPrimary.includes(obj.primary as string)) {
    (result as { primary?: ContainerAlignment["primary"] }).primary = obj.primary as ContainerAlignment["primary"];
  }
  if (validCounter.includes(obj.counter as string)) {
    (result as { counter?: ContainerAlignment["counter"] }).counter = obj.counter as ContainerAlignment["counter"];
  }
  if (typeof obj.grow === "number" && obj.grow >= 0) {
    (result as { grow?: number }).grow = obj.grow;
  }

  return Object.keys(result).length > 0 ? result : undefined;
}

/**
 * Normalizes spacing specification from AI response.
 */
function normalizeSpacingSpec(raw: unknown): SpacingSpec | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const obj = raw as Record<string, unknown>;

  const result: SpacingSpec = {};

  if (typeof obj.before === "number") (result as { before?: number }).before = obj.before;
  if (typeof obj.after === "number") (result as { after?: number }).after = obj.after;

  if (obj.padding && typeof obj.padding === "object") {
    const pad = obj.padding as Record<string, unknown>;
    const padding: SpacingSpec["padding"] = {};
    if (typeof pad.top === "number") (padding as { top?: number }).top = pad.top;
    if (typeof pad.right === "number") (padding as { right?: number }).right = pad.right;
    if (typeof pad.bottom === "number") (padding as { bottom?: number }).bottom = pad.bottom;
    if (typeof pad.left === "number") (padding as { left?: number }).left = pad.left;
    if (Object.keys(padding).length > 0) {
      (result as { padding?: SpacingSpec["padding"] }).padding = padding;
    }
  }

  return Object.keys(result).length > 0 ? result : undefined;
}

/**
 * Normalizes node-specific warnings from AI response.
 */
function normalizeNodeWarnings(raw: unknown): readonly NodeWarning[] | undefined {
  if (!Array.isArray(raw)) return undefined;

  const warnings: NodeWarning[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const obj = item as Record<string, unknown>;

    if (typeof obj.code !== "string" || typeof obj.message !== "string") continue;
    const severity = obj.severity === "info" || obj.severity === "warn" || obj.severity === "error"
      ? obj.severity
      : "info";

    warnings.push({ code: obj.code, message: obj.message, severity });
  }

  return warnings.length > 0 ? warnings : undefined;
}

/**
 * Normalizes a single element positioning from AI response.
 * Handles both new comprehensive schema and legacy schema.
 */
function normalizeElementPositioning(raw: unknown): ElementPositioning | null {
  if (!raw || typeof raw !== "object") return null;
  const pos = raw as Record<string, unknown>;

  // Determine anchor - handle both new 'anchor' and legacy 'region' fields
  let anchor: AnchorRegion;

  if (typeof pos.anchor === "string" && VALID_ANCHORS.includes(pos.anchor as AnchorRegion)) {
    anchor = pos.anchor as AnchorRegion;
  } else if (typeof pos.region === "string" && pos.region in LEGACY_REGION_TO_ANCHOR) {
    // Convert legacy region to new anchor format
    anchor = LEGACY_REGION_TO_ANCHOR[pos.region];
  } else {
    // Default anchor
    anchor = "center";
  }

  // Build the positioning object
  const result: ElementPositioning = { anchor };

  // Visibility and priority
  if (typeof pos.visible === "boolean") {
    (result as { visible?: boolean }).visible = pos.visible;
  }
  if (typeof pos.priority === "number" && pos.priority > 0) {
    (result as { priority?: number }).priority = Math.floor(pos.priority);
  }

  // Constraints
  const constraints = normalizeConstraints(pos.constraints);
  if (constraints) (result as { constraints?: ConstraintBehavior }).constraints = constraints;

  // Offset
  const offset = normalizeOffset(pos.offset);
  if (offset) (result as { offset?: EdgeOffset }).offset = offset;

  // Size - handle both new object format and legacy string format
  const sizeSpec = normalizeSizeSpec(pos.size);
  if (sizeSpec) (result as { size?: SizeSpec }).size = sizeSpec;

  // Container alignment
  const containerAlignment = normalizeContainerAlignment(pos.containerAlignment);
  if (containerAlignment) (result as { containerAlignment?: ContainerAlignment }).containerAlignment = containerAlignment;

  // Spacing
  const spacing = normalizeSpacingSpec(pos.spacing);
  if (spacing) (result as { spacing?: SpacingSpec }).spacing = spacing;

  // Text directive - handle both nested 'text' object and legacy 'maxLines' at root
  let textDirective = normalizeTextDirective(pos.text);
  if (!textDirective && typeof pos.maxLines === "number" && pos.maxLines > 0) {
    // Legacy maxLines at root level
    textDirective = { maxLines: Math.floor(pos.maxLines) };
  }
  if (textDirective) (result as { text?: TextDirective }).text = textDirective;

  // Image directive
  const imageDirective = normalizeImageDirective(pos.image);
  if (imageDirective) (result as { image?: ImageDirective }).image = imageDirective;

  // Node-specific warnings
  const nodeWarnings = normalizeNodeWarnings(pos.warnings);
  if (nodeWarnings) (result as { warnings?: readonly NodeWarning[] }).warnings = nodeWarnings;

  // Rationale
  if (typeof pos.rationale === "string" && pos.rationale.length > 0) {
    (result as { rationale?: string }).rationale = pos.rationale;
  }

  return result;
}

/**
 * Normalizes the positioning map from AI response.
 * Supports both new comprehensive schema and legacy schema.
 */
function normalizePositioning(raw: unknown): PositioningMap | undefined {
  if (!raw || typeof raw !== "object") {
    return undefined;
  }

  const result: Record<string, ElementPositioning> = {};
  const obj = raw as Record<string, unknown>;

  for (const [nodeId, posRaw] of Object.entries(obj)) {
    const normalized = normalizeElementPositioning(posRaw);
    if (normalized) {
      result[nodeId] = normalized;
    }
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
    // Positioning is required - provide empty object for backwards compatibility with legacy responses
    positioning: positioning ?? {},
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
 * Picks the highest-confidence layout pattern for a target.
 * Simply trusts the AI's score.
 */
export async function autoSelectLayoutPattern(
  advice: LayoutAdvice | null,
  targetId: string,
  options?: { minConfidence?: number }
): Promise<AutoSelectedPattern | null> {
  const minConfidence = options?.minConfidence ?? 0.5;

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

  debugFixLog("auto layout selection analysis", {
    targetId,
    patternId: candidate?.id,
    confidence,
    minConfidence
  });

  if (!candidate || confidence < minConfidence) {
    debugFixLog("auto layout selection rejected - confidence too low", {
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
