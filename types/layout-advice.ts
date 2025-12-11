export interface LayoutPatternOption {
  readonly id: string;
  readonly label: string;
  readonly description: string;
  readonly score?: number;
}

export interface LayoutAdviceEntry {
  readonly targetId: string;
  readonly selectedId?: string;
  readonly suggestedLayoutMode?: "HORIZONTAL" | "VERTICAL" | "NONE";
  readonly backgroundNodeId?: string;
  readonly options: readonly LayoutPatternOption[];
}

export interface LayoutAdvice {
  readonly entries: readonly LayoutAdviceEntry[];
}
