/**
 * Type-safe builder utilities for constructing frame analysis inputs.
 * These builders ensure consistent structure and validation of example data.
 */

import type {
  FrameNode,
  NodeRelativePosition,
  AnalysisFrame,
  TargetFormat,
  FrameAnalysisInput
} from '../types/index.js';

/** Utility type that removes readonly modifiers for builder internal state */
type Mutable<T> = { -readonly [P in keyof T]: T[P] };

/** Builder for constructing frame nodes */
export class FrameNodeBuilder {
  private node: Partial<Mutable<FrameNode>> = {};

  static create(): FrameNodeBuilder {
    return new FrameNodeBuilder();
  }

  withId(id: string): FrameNodeBuilder {
    this.node.id = id;
    return this;
  }

  withName(name: string): FrameNodeBuilder {
    this.node.name = name;
    return this;
  }

  withType(type: string): FrameNodeBuilder {
    this.node.type = type;
    return this;
  }

  withPosition(rel: NodeRelativePosition): FrameNodeBuilder {
    this.node.rel = rel;
    return this;
  }

  withFillType(fillType: string): FrameNodeBuilder {
    this.node.fillType = fillType;
    return this;
  }

  withText(text: string, fontSize?: number, fontWeight?: string): FrameNodeBuilder {
    this.node.text = text;
    if (fontSize !== undefined) this.node.fontSize = fontSize;
    if (fontWeight !== undefined) this.node.fontWeight = fontWeight;
    return this;
  }

  build(): FrameNode {
    if (!this.node.id || !this.node.name || !this.node.type || !this.node.rel) {
      throw new Error('FrameNode missing required fields: id, name, type, rel');
    }
    return this.node as FrameNode;
  }
}

/** Builder for constructing analysis frames */
export class FrameBuilder {
  private frame: Partial<Mutable<AnalysisFrame>> = {
    nodes: []
  };

  static create(): FrameBuilder {
    return new FrameBuilder();
  }

  withId(id: string): FrameBuilder {
    this.frame.id = id;
    return this;
  }

  withName(name: string): FrameBuilder {
    this.frame.name = name;
    return this;
  }

  withSize(width: number, height: number): FrameBuilder {
    this.frame.size = { width, height };
    return this;
  }

  withNode(node: FrameNode): FrameBuilder {
    this.frame.nodes = [...(this.frame.nodes || []), node];
    return this;
  }

  withNodes(nodes: readonly FrameNode[]): FrameBuilder {
    this.frame.nodes = [...(this.frame.nodes || []), ...nodes];
    return this;
  }

  build(): AnalysisFrame {
    if (!this.frame.id || !this.frame.name || !this.frame.size || !this.frame.nodes) {
      throw new Error('AnalysisFrame missing required fields');
    }

    this.frame.childCount = this.frame.nodes.length;
    return this.frame as AnalysisFrame;
  }
}

/** Builder for constructing target formats */
export class TargetBuilder {
  private target: Partial<Mutable<TargetFormat>> = {};

  static create(): TargetBuilder {
    return new TargetBuilder();
  }

  withId(id: string): TargetBuilder {
    this.target.id = id;
    return this;
  }

  withDimensions(width: number, height: number): TargetBuilder {
    this.target.width = width;
    this.target.height = height;
    return this;
  }

  withLabel(label: string): TargetBuilder {
    this.target.label = label;
    return this;
  }

  build(): TargetFormat {
    if (!this.target.id || !this.target.width || !this.target.height || !this.target.label) {
      throw new Error('TargetFormat missing required fields');
    }
    return this.target as TargetFormat;
  }
}

/** Builder for constructing complete frame analysis inputs */
export class FrameInputBuilder {
  private input: Partial<Mutable<FrameAnalysisInput>> = {};

  static create(): FrameInputBuilder {
    return new FrameInputBuilder();
  }

  withFrame(frame: AnalysisFrame): FrameInputBuilder {
    this.input.frame = frame;
    return this;
  }

  withTargets(targets: readonly TargetFormat[]): FrameInputBuilder {
    this.input.targets = targets;
    return this;
  }

  withTarget(target: TargetFormat): FrameInputBuilder {
    this.input.targets = [...(this.input.targets || []), target];
    return this;
  }

  build(): FrameAnalysisInput {
    if (!this.input.frame || !this.input.targets || this.input.targets.length === 0) {
      throw new Error('FrameAnalysisInput missing required fields');
    }
    return this.input as FrameAnalysisInput;
  }
}

/** Convenience function for creating relative positions */
export function relPos(x: number, y: number, width: number, height: number): NodeRelativePosition {
  return { x, y, width, height };
}