/**
 * Type definitions for AI layout advice structures.
 * These types define layout recommendations and feasibility analysis.
 */

/** Valid layout modes for variant adaptation */
export type LayoutMode = 'NONE' | 'HORIZONTAL' | 'VERTICAL';

/** Valid layout pattern identifiers */
export type LayoutPatternId =
  | 'vertical-stack' | 'horizontal-stack' | 'centered-stack'
  | 'split-left' | 'split-right' | 'horizontal-split'
  | 'layered-hero' | 'layered-gradient'
  | 'hero-first' | 'text-first'
  | 'compact-vertical' | 'preserve-layout'
  | 'banner-spread';

/** Feasibility analysis for extreme aspect ratio transformations */
export interface LayoutFeasibility {
  readonly achievable: boolean;
  readonly requiresRestructure: boolean;
  readonly predictedFill: number; // 0.0 to 1.0, expected target coverage
  readonly uniformScaleResult: string; // Description of what uniform scaling would produce
}

/** Content restructuring plan for extreme transformations */
export interface ContentRestructure {
  readonly contentPriority: readonly string[]; // NodeIds in priority order
  readonly drop: readonly string[]; // NodeIds to remove
  readonly keepRequired: readonly string[]; // NodeIds that must be preserved
  readonly arrangement: 'horizontal' | 'vertical' | 'grid';
  readonly textTreatment: 'single-line' | 'wrap' | 'truncate';
}

/** Positioning directives for specific nodes */
export interface NodePositioning {
  readonly region: 'left' | 'center' | 'right' | 'top' | 'bottom' | 'fill';
  readonly size?: 'fixed' | 'fill' | 'fit-content';
  readonly maxLines?: number;
}

/** Layout advice entry for a specific target format */
export interface LayoutAdviceEntry {
  readonly targetId: string;
  readonly selectedId: LayoutPatternId;
  readonly score: number; // 0.0 to 1.0, confidence in recommendation
  readonly suggestedLayoutMode: LayoutMode;
  readonly description: string;
  readonly backgroundNodeId?: string; // For patterns with background elements

  // Advanced fields for extreme aspect ratio handling
  readonly feasibility?: LayoutFeasibility;
  readonly restructure?: ContentRestructure;
  readonly positioning?: Record<string, NodePositioning>; // NodeId -> positioning
}

/** Complete layout advice response */
export interface LayoutAdvice {
  readonly entries: readonly LayoutAdviceEntry[];
}