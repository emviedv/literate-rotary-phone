/**
 * Central registry for AI few-shot examples.
 * This module aggregates examples from all categories and provides
 * the same interface as the original ai-few-shot-examples.ts file.
 */

import type { ChatMessage } from './types/chat-message.js';
import { ALL_ORIGINAL_EXAMPLES } from './categories/all-original-examples.js';
import { validateMessageArray, type ValidationResult } from './builders/validation.js';

/**
 * Registry class for managing AI few-shot examples
 */
class ExampleRegistryImpl {
  private readonly allMessages: readonly ChatMessage[];

  constructor() {
    // Use the complete original examples array to ensure exact compatibility
    this.allMessages = [...ALL_ORIGINAL_EXAMPLES];

    // Validate the aggregated messages during construction
    this.validateRegistry();
  }

  /**
   * Get all training messages (backwards compatible)
   */
  public getAllMessages(): readonly ChatMessage[] {
    return this.allMessages;
  }

  /**
   * Get messages filtered by category
   */
  public getMessagesByCategory(category: string): readonly ChatMessage[] {
    const categoryRanges = {
      'simple-cards': { start: 0, end: 6 },        // Examples 1-3 (pairs 0-5)
      'complex-layouts': { start: 6, end: 18 },    // Examples 4-9 (pairs 6-17)
      'advanced-cases': { start: 18, end: 22 },    // Examples 10-11 (pairs 18-21)
      'quality-assurance': { start: 22, end: 26 }, // Examples 10-11 duplicate (pairs 22-25)
      'common-mistakes': { start: 26, end: 34 }    // Negative examples (pairs 26-33, 4 mistake pairs)
    };

    const range = categoryRanges[category as keyof typeof categoryRanges];
    if (!range) {
      throw new Error(`Unknown category: ${category}. Available: ${Object.keys(categoryRanges).join(', ')}`);
    }

    return this.allMessages.slice(range.start, range.end);
  }

  /**
   * Get all available categories
   */
  public getCategories(): readonly string[] {
    return [
      'simple-cards',      // Basic layouts (Examples 1-3)
      'complex-layouts',   // Sophisticated designs (Examples 4-9)
      'advanced-cases',    // Multi-target scenarios (Examples 10-11)
      'quality-assurance', // Edge cases and QA (Examples 10-11 duplicates)
      'common-mistakes'    // Negative examples showing wrong→right patterns
    ];
  }

  /**
   * Validate registry consistency and structure
   */
  public validateRegistry(): ValidationResult {
    const validation = validateMessageArray(this.allMessages);

    if (!validation.isValid) {
      console.warn('Registry validation failed:', validation.errors);
    }

    if (validation.warnings.length > 0) {
      console.info('Registry validation warnings:', validation.warnings);
    }

    return validation;
  }

  /**
   * Get registry statistics
   */
  public getStats() {
    const userMessages = this.allMessages.filter(msg => msg.role === 'user');
    const assistantMessages = this.allMessages.filter(msg => msg.role === 'assistant');

    return {
      totalMessages: this.allMessages.length,
      trainingPairs: userMessages.length,
      userMessages: userMessages.length,
      assistantMessages: assistantMessages.length,
      categories: this.getCategories().length
    };
  }
}

/**
 * Singleton registry instance
 */
export const ExampleRegistry = new ExampleRegistryImpl();

/**
 * Main export for backwards compatibility with original ai-few-shot-examples.ts
 * This maintains the exact same interface as the original file.
 */
export const FEW_SHOT_MESSAGES: readonly ChatMessage[] = ExampleRegistry.getAllMessages();

/**
 * Re-export the ChatMessage type for backwards compatibility
 */
export type { ChatMessage } from './types/chat-message.js';