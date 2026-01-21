/**
 * Type definitions for example builder patterns and AI response structures.
 * These types enable type-safe construction of few-shot training examples.
 */

import { AISignals } from './ai-signals.js';
import { LayoutAdvice } from './layout-advice.js';
import { FrameAnalysisInput } from './frame-analysis.js';
import { ChatMessage } from './chat-message.js';

/** Complete AI analysis response structure */
export interface AIAnalysisResponse {
  readonly signals: AISignals;
  readonly layoutAdvice: LayoutAdvice;
}

/** Training pair consisting of user input and expected AI response */
export interface TrainingPair {
  readonly userMessage: ChatMessage;
  readonly assistantMessage: ChatMessage;
  readonly input: FrameAnalysisInput;
  readonly response: AIAnalysisResponse;
}

/** Example metadata for organization and filtering */
export interface ExampleMetadata {
  readonly id: string;
  readonly name: string;
  readonly category: string;
  readonly difficulty: 'simple' | 'moderate' | 'complex';
  readonly targetFormats: readonly string[];
  readonly featuredConcepts: readonly string[]; // e.g., ['platform-safe-zones', 'accessibility', 'face-detection']
}

/** Builder interface for constructing training examples */
export interface ExampleBuilder {
  /** Set the example metadata */
  withMetadata(metadata: ExampleMetadata): ExampleBuilder;

  /** Set the frame analysis input */
  withFrameInput(input: FrameAnalysisInput): ExampleBuilder;

  /** Set the AI analysis response */
  withAIResponse(response: AIAnalysisResponse): ExampleBuilder;

  /** Build the complete training pair */
  build(): TrainingPair;
}

/** Registry interface for managing example collections */
export interface ExampleRegistry {
  /** Get all training pairs */
  getAllPairs(): readonly ChatMessage[];

  /** Get pairs filtered by category */
  getPairsByCategory(category: string): readonly ChatMessage[];

  /** Get pairs filtered by target format */
  getPairsByTarget(targetId: string): readonly ChatMessage[];

  /** Get example metadata */
  getMetadata(): readonly ExampleMetadata[];

  /** Validate registry consistency */
  validate(): void;
}