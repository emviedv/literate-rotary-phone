/**
 * Type definitions for AI frame analysis input structures.
 * These types define the schema for user messages in few-shot examples.
 */

/** Relative positioning and dimensions for a node within its parent frame */
export interface NodeRelativePosition {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/** Frame node structure used in AI analysis examples */
export interface FrameNode {
  readonly id: string;
  readonly name: string;
  readonly type: string;
  readonly rel: NodeRelativePosition;

  // Optional fields that may be present depending on node type
  readonly fillType?: string;
  readonly text?: string;
  readonly fontSize?: number;
  readonly fontWeight?: string;
  readonly fontFamily?: string;
  readonly fill?: string;
  readonly dominantColor?: string;
  readonly opacity?: number;
  readonly layoutMode?: string;
}

/** Frame dimensions structure */
export interface FrameSize {
  readonly width: number;
  readonly height: number;
}

/** Complete frame structure for AI analysis */
export interface AnalysisFrame {
  readonly id: string;
  readonly name: string;
  readonly size: FrameSize;
  readonly childCount: number;
  readonly nodes: readonly FrameNode[];
}

/** Target format specification for variant generation */
export interface TargetFormat {
  readonly id: string;
  readonly width: number;
  readonly height: number;
  readonly label: string;
}

/** Complete AI frame analysis input structure */
export interface FrameAnalysisInput {
  readonly frame: AnalysisFrame;
  readonly targets: readonly TargetFormat[];
}