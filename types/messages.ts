import type { VariantTarget } from "./targets";

export interface SelectionState {
  readonly selectionOk: boolean;
  readonly selectionName?: string;
  readonly error?: string;
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
  readonly code: "OUTSIDE_SAFE_AREA" | "MISALIGNED";
  readonly severity: "info" | "warn";
  readonly message: string;
}

export interface VariantResult {
  readonly targetId: string;
  readonly nodeId: string;
  readonly warnings: readonly VariantWarning[];
}

export interface GenerationCompletePayload {
  readonly runId: string;
  readonly results: readonly VariantResult[];
}

export type ToUIMessage =
  | { readonly type: "init"; readonly payload: InitMessage }
  | { readonly type: "selection-update"; readonly payload: SelectionState }
  | { readonly type: "status"; readonly payload: { readonly status: "running" | "idle" } }
  | { readonly type: "generation-complete"; readonly payload: GenerationCompletePayload }
  | { readonly type: "error"; readonly payload: { readonly message: string } };

export type ToCoreMessage =
  | { readonly type: "request-initial-state" }
  | {
      readonly type: "generate-variants";
      readonly payload: {
        readonly targetIds: readonly string[];
        readonly safeAreaRatio: number;
      };
    };
