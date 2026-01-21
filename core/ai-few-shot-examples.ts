/**
 * Few-shot examples for AI frame analysis.
 * These examples train the AI model to correctly classify node roles,
 * identify focal points, generate QA signals, and recommend layout patterns.
 *
 * This file now uses the modular AI examples system while maintaining
 * backwards compatibility with existing code.
 */

// Export from the new modular system
export { FEW_SHOT_MESSAGES, type ChatMessage } from './ai-examples/registry.js';