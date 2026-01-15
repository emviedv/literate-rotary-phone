import type { VariantTarget } from "./targets.js";
import type { AiSignals } from "./ai-signals.js";
import type { LayoutAdvice } from "./layout-advice.js";

export type AiStatus = "idle" | "fetching" | "missing-key" | "error";

export interface SelectionState {
  readonly selectionOk: boolean;
  readonly selectionName?: string;
  readonly selectionWidth?: number;
  readonly selectionHeight?: number;
  readonly error?: string;
  readonly aiSignals?: AiSignals;
  readonly layoutAdvice?: LayoutAdvice;
  readonly aiConfigured?: boolean;
  readonly aiStatus?: AiStatus;
  readonly aiError?: string;
  readonly aiUsingDefaultKey?: boolean;
}

export interface LastRunSummary {
  readonly runId: string;
  readonly timestamp: number;
  readonly sourceNodeName: string;
  readonly targetIds: readonly string[];
}

export interface InitMessage extends SelectionState {
  readonly targets: readonly VariantTarget[];
  readonly lastRun?: LastRunSummary;
}

export interface VariantWarning {
  readonly code:
    | "OUTSIDE_SAFE_AREA"
    | "MISALIGNED"
    | "AI_LOW_CONTRAST"
    | "AI_LOGO_VISIBILITY"
    | "AI_TEXT_OVERLAP"
    | "AI_ROLE_UNCERTAIN"
    | "AI_SALIENCE_MISALIGNED"
    | "AI_SAFE_AREA_RISK"
    | "AI_GENERIC"
    | "AI_LAYOUT_FALLBACK";
  readonly severity: "info" | "warn";
  readonly message: string;
}

export interface VariantResult {
  readonly targetId: string;
  readonly nodeId: string;
  readonly warnings: readonly VariantWarning[];
  readonly layoutPatternId?: string;
  readonly layoutPatternLabel?: string;
  readonly layoutPatternConfidence?: number;
  readonly layoutPatternFallback?: boolean;
}

export interface GenerationCompletePayload {
  readonly runId: string;
  readonly results: readonly VariantResult[];
}

export interface CalibrationStatusPayload {
  readonly learningPhase: "initial" | "adapting" | "stable";
  readonly totalRecommendations: number;
  readonly userAcceptanceRate: number; // Percentage (0-100)
  readonly topPatterns: Array<{ pattern: string; accuracy: number }>;
  readonly topWeights: Array<{ target: string; pattern: string; weight: number }>;
  readonly message: string; // Human-readable summary
}

export type ToUIMessage =
  | { readonly type: "init"; readonly payload: InitMessage }
  | { readonly type: "selection-update"; readonly payload: SelectionState }
  | { readonly type: "status"; readonly payload: { readonly status: "running" | "idle" } }
  | { readonly type: "generation-complete"; readonly payload: GenerationCompletePayload }
  | { readonly type: "error"; readonly payload: { readonly message: string } }
  | { readonly type: "debug-log"; readonly payload: { readonly message: string } }
  | { readonly type: "calibration-status"; readonly payload: CalibrationStatusPayload };

export type ToCoreMessage =
  | { readonly type: "request-initial-state" }
  | {
      readonly type: "generate-variants";
      readonly payload: {
        readonly targetIds: readonly string[];
        readonly safeAreaRatio: number;
        readonly layoutPatterns?: Record<string, string | undefined>;
      };
    }
  | {
      readonly type: "set-ai-signals";
      readonly payload: {
        readonly signals: AiSignals;
      };
    }
  | {
      readonly type: "set-layout-advice";
      readonly payload: {
        readonly advice: LayoutAdvice;
      };
    }
  | {
      readonly type: "set-api-key";
      readonly payload: {
        readonly key: string;
      };
    }
  | {
      readonly type: "refresh-ai";
    }
  | {
      readonly type: "get-calibration-status";
    };
