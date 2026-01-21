import type { VariantTarget } from "./targets.js";

export type AiStatus = "idle" | "fetching" | "missing-key" | "error";

export interface SelectionState {
  readonly selectionOk: boolean;
  readonly selectionName?: string;
  readonly selectionWidth?: number;
  readonly selectionHeight?: number;
  readonly error?: string;
  // Legacy fields kept for UI compatibility (always undefined now)
  readonly aiSignals?: unknown;
  readonly layoutAdvice?: unknown;
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
  readonly debugEnabled?: boolean;
  readonly buildTimestamp?: string;
}

export interface DesignStatusPayload {
  readonly stage: "analyzing" | "planning" | "specifying" | "executing" | "evaluating";
  readonly message: string;
}

export interface DesignCompletePayload {
  readonly pageId: string;
  readonly nodeId: string;
  readonly variantName: string;
}

export type ToUIMessage =
  | { readonly type: "init"; readonly payload: InitMessage }
  | { readonly type: "selection-update"; readonly payload: SelectionState }
  | { readonly type: "status"; readonly payload: { readonly status: "running" | "idle" } }
  | { readonly type: "error"; readonly payload: { readonly message: string } }
  | { readonly type: "debug-log"; readonly payload: { readonly message: string } }
  | { readonly type: "design-status"; readonly payload: DesignStatusPayload }
  | { readonly type: "design-complete"; readonly payload: DesignCompletePayload }
  | { readonly type: "design-error"; readonly payload: { readonly message: string } };

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
        readonly signals: unknown;
      };
    }
  | {
      readonly type: "set-layout-advice";
      readonly payload: {
        readonly advice: unknown;
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
      readonly type: "design-for-tiktok";
    };
