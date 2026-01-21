/**
 * Main entry point for AI few-shot examples system.
 * This module provides both the new modular interface and
 * backwards compatibility with the original ai-few-shot-examples.ts file.
 */

// Main registry exports (backwards compatible)
export { FEW_SHOT_MESSAGES, ExampleRegistry } from './registry.js';
export type { ChatMessage } from './types/chat-message.js';

// Type system exports
export type * from './types/index.js';

// Category-specific exports (for advanced usage)
export { SIMPLE_CARD_EXAMPLES } from './categories/simple-cards.js';
export { EXTREME_TRANSFORM_EXAMPLES } from './categories/extreme-transforms.js';
export { COMMON_MISTAKE_EXAMPLES } from './categories/common-mistakes.js';

// Builder utilities exports
export * from './builders/frame-builder.js';
export * from './builders/validation.js';