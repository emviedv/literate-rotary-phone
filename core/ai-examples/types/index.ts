/**
 * Centralized exports for all AI example type definitions.
 * This module provides a single import point for all typing information
 * used in the AI few-shot example system.
 */

// Core message types
export type { ChatMessage } from './chat-message.js';

// Frame analysis input types
export type {
  NodeRelativePosition,
  FrameNode,
  FrameSize,
  AnalysisFrame,
  TargetFormat,
  FrameAnalysisInput
} from './frame-analysis.js';

// AI signals response types
export type {
  SemanticRole,
  NodeRoleAssignment,
  FocalPoint,
  QASeverity,
  QASignalCode,
  QASignal,
  FaceRegion,
  AISignals
} from './ai-signals.js';

// Layout advice types
export type {
  LayoutMode,
  LayoutPatternId,
  LayoutFeasibility,
  ContentRestructure,
  NodePositioning,
  LayoutAdviceEntry,
  LayoutAdvice
} from './layout-advice.js';

// Builder and registry types
export type {
  AIAnalysisResponse,
  TrainingPair,
  ExampleMetadata,
  ExampleBuilder,
  ExampleRegistry
} from './example-builder.js';