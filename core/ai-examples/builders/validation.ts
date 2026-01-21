/**
 * Validation utilities for AI few-shot examples.
 * These functions ensure type safety and structural consistency
 * of training data before it's used for AI model training.
 */

import type {
  // ChatMessage,
  // FrameAnalysisInput,
  // AIAnalysisResponse,
  SemanticRole,
  QASignalCode,
  LayoutPatternId,
  LayoutMode
} from '../types/index.js';

/** Validation result with detailed error information */
export interface ValidationResult {
  readonly isValid: boolean;
  readonly errors: readonly string[];
  readonly warnings: readonly string[];
}

/**
 * Universal 7-role taxonomy for compositional layout analysis.
 * Must match AI service expectations in types/ai-signals.ts.
 */
const VALID_SEMANTIC_ROLES: readonly SemanticRole[] = [
  // Primary focal
  'subject',
  // Branding
  'branding',
  // Typography
  'typography',
  // Interactive
  'action',
  // Structural
  'container', 'component',
  // Background
  'environment',
  // Catch-all
  'unknown'
];

/**
 * Legacy roles that are still accepted for backwards compatibility.
 * These will be normalized to new roles at runtime by ai-sanitization.ts.
 * This allows existing few-shot examples to work during the transition.
 */
const LEGACY_ROLE_ALIASES: readonly string[] = [
  // Old visual roles → subject
  'hero', 'hero_image', 'hero_bleed', 'image', 'secondary_image',
  // Old branding → branding
  'logo',
  // Old typography → typography
  'heading', 'text', 'title', 'subtitle', 'body', 'caption',
  // Old interactive → action
  'cta', 'cta_secondary',
  // Old structural → container/component
  'decorative', 'badge', 'icon', 'divider',
  // Old content → component
  'list', 'testimonial', 'feature_item', 'rating', 'price',
  // Old background → environment
  'background'
];

/** Combined valid roles including legacy aliases */
const ALL_VALID_ROLES: readonly string[] = [
  ...VALID_SEMANTIC_ROLES,
  ...LEGACY_ROLE_ALIASES
];

/** Valid QA signal codes (must match AI service expectations) */
const VALID_QA_CODES: readonly QASignalCode[] = [
  'SAFE_AREA_RISK', 'CTA_PLACEMENT_RISK', 'OVERLAY_CONFLICT',
  'THUMBNAIL_LEGIBILITY', 'CONTENT_DENSITY_MISMATCH', 'ASPECT_MISMATCH',
  'TEXT_TOO_SMALL_ACCESSIBLE', 'COLOR_CONTRAST_INSUFFICIENT', 'INSUFFICIENT_TOUCH_TARGETS',
  'MISSING_CTA', 'UNCERTAIN_ROLES', 'HEADING_HIERARCHY_BROKEN', 'TYPOGRAPHY_INCONSISTENCY'
];

/** Valid layout pattern IDs */
const VALID_LAYOUT_PATTERNS: readonly LayoutPatternId[] = [
  'vertical-stack', 'horizontal-stack', 'centered-stack',
  'split-left', 'split-right', 'horizontal-split',
  'layered-hero', 'layered-gradient',
  'hero-first', 'text-first',
  'compact-vertical', 'preserve-layout', 'banner-spread'
];

/** Valid layout modes */
const VALID_LAYOUT_MODES: readonly LayoutMode[] = ['NONE', 'HORIZONTAL', 'VERTICAL'];

/**
 * Validates a chat message structure
 */
export function validateChatMessage(message: any): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!message || typeof message !== 'object') {
    errors.push('Message must be an object');
    return { isValid: false, errors, warnings };
  }

  if (!message.role || !['system', 'user', 'assistant'].includes(message.role)) {
    errors.push('Message must have valid role (system, user, or assistant)');
  }

  if (!message.content || typeof message.content !== 'string') {
    errors.push('Message must have content as string');
  }

  if (message.name !== undefined && typeof message.name !== 'string') {
    errors.push('Message name field must be string when present');
  }

  return { isValid: errors.length === 0, errors, warnings };
}

/**
 * Validates frame analysis input structure
 */
export function validateFrameInput(input: any): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!input || typeof input !== 'object') {
    errors.push('Input must be an object');
    return { isValid: false, errors, warnings };
  }

  // Validate frame structure
  if (!input.frame) {
    errors.push('Input missing frame field');
  } else {
    if (!input.frame.id || typeof input.frame.id !== 'string') {
      errors.push('Frame must have id as string');
    }
    if (!input.frame.name || typeof input.frame.name !== 'string') {
      errors.push('Frame must have name as string');
    }
    if (!input.frame.size || typeof input.frame.size !== 'object') {
      errors.push('Frame must have size object');
    } else {
      if (typeof input.frame.size.width !== 'number' || input.frame.size.width <= 0) {
        errors.push('Frame size width must be positive number');
      }
      if (typeof input.frame.size.height !== 'number' || input.frame.size.height <= 0) {
        errors.push('Frame size height must be positive number');
      }
    }
    if (typeof input.frame.childCount !== 'number' || input.frame.childCount < 0) {
      errors.push('Frame childCount must be non-negative number');
    }
    if (!Array.isArray(input.frame.nodes)) {
      errors.push('Frame nodes must be array');
    } else {
      input.frame.nodes.forEach((node: any, index: number) => {
        if (!node.id || typeof node.id !== 'string') {
          errors.push(`Node ${index} must have id as string`);
        }
        if (!node.name || typeof node.name !== 'string') {
          errors.push(`Node ${index} must have name as string`);
        }
        if (!node.type || typeof node.type !== 'string') {
          errors.push(`Node ${index} must have type as string`);
        }
        if (!node.rel || typeof node.rel !== 'object') {
          errors.push(`Node ${index} must have rel object`);
        } else {
          ['x', 'y', 'width', 'height'].forEach(prop => {
            if (typeof node.rel[prop] !== 'number') {
              errors.push(`Node ${index} rel.${prop} must be number`);
            }
          });
        }
      });
    }
  }

  // Validate targets array
  if (!Array.isArray(input.targets)) {
    errors.push('Input must have targets as array');
  } else if (input.targets.length === 0) {
    errors.push('Input must have at least one target');
  } else {
    input.targets.forEach((target: any, index: number) => {
      if (!target.id || typeof target.id !== 'string') {
        errors.push(`Target ${index} must have id as string`);
      }
      if (typeof target.width !== 'number' || target.width <= 0) {
        errors.push(`Target ${index} width must be positive number`);
      }
      if (typeof target.height !== 'number' || target.height <= 0) {
        errors.push(`Target ${index} height must be positive number`);
      }
      if (!target.label || typeof target.label !== 'string') {
        errors.push(`Target ${index} must have label as string`);
      }
    });
  }

  return { isValid: errors.length === 0, errors, warnings };
}

/**
 * Validates AI analysis response structure
 */
export function validateAIResponse(response: any): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!response || typeof response !== 'object') {
    errors.push('Response must be an object');
    return { isValid: false, errors, warnings };
  }

  // Validate signals structure
  if (!response.signals) {
    errors.push('Response missing signals field');
  } else {
    const signals = response.signals;

    // Validate roles array
    if (!Array.isArray(signals.roles)) {
      errors.push('Signals roles must be array');
    } else {
      signals.roles.forEach((role: any, index: number) => {
        if (!role.nodeId || typeof role.nodeId !== 'string') {
          errors.push(`Role ${index} must have nodeId as string`);
        }
        if (!ALL_VALID_ROLES.includes(role.role)) {
          errors.push(`Role ${index} has invalid role: ${role.role}`);
        }
        if (typeof role.confidence !== 'number' || role.confidence < 0 || role.confidence > 1) {
          errors.push(`Role ${index} confidence must be number 0-1`);
        }
      });
    }

    // Validate focal points array
    if (!Array.isArray(signals.focalPoints)) {
      errors.push('Signals focalPoints must be array');
    } else {
      signals.focalPoints.forEach((focal: any, index: number) => {
        if (!focal.nodeId || typeof focal.nodeId !== 'string') {
          errors.push(`FocalPoint ${index} must have nodeId as string`);
        }
        if (typeof focal.x !== 'number' || focal.x < 0 || focal.x > 1) {
          errors.push(`FocalPoint ${index} x must be number 0-1`);
        }
        if (typeof focal.y !== 'number' || focal.y < 0 || focal.y > 1) {
          errors.push(`FocalPoint ${index} y must be number 0-1`);
        }
        if (typeof focal.confidence !== 'number' || focal.confidence < 0 || focal.confidence > 1) {
          errors.push(`FocalPoint ${index} confidence must be number 0-1`);
        }
      });
    }

    // Validate QA signals array
    if (!Array.isArray(signals.qa)) {
      errors.push('Signals qa must be array');
    } else {
      signals.qa.forEach((qa: any, index: number) => {
        if (!VALID_QA_CODES.includes(qa.code)) {
          errors.push(`QA ${index} has invalid code: ${qa.code}`);
        }
        if (!['error', 'warn', 'info'].includes(qa.severity)) {
          errors.push(`QA ${index} has invalid severity: ${qa.severity}`);
        }
        if (!qa.message || typeof qa.message !== 'string') {
          errors.push(`QA ${index} must have message as string`);
        }
      });
    }

    // Validate face regions array
    if (!Array.isArray(signals.faceRegions)) {
      errors.push('Signals faceRegions must be array');
    }
  }

  // Validate layout advice structure
  if (!response.layoutAdvice) {
    errors.push('Response missing layoutAdvice field');
  } else {
    if (!Array.isArray(response.layoutAdvice.entries)) {
      errors.push('LayoutAdvice entries must be array');
    } else {
      response.layoutAdvice.entries.forEach((entry: any, index: number) => {
        if (!entry.targetId || typeof entry.targetId !== 'string') {
          errors.push(`Layout entry ${index} must have targetId as string`);
        }
        if (!VALID_LAYOUT_PATTERNS.includes(entry.selectedId)) {
          errors.push(`Layout entry ${index} has invalid selectedId: ${entry.selectedId}`);
        }
        if (typeof entry.score !== 'number' || entry.score < 0 || entry.score > 1) {
          errors.push(`Layout entry ${index} score must be number 0-1`);
        }
        if (!VALID_LAYOUT_MODES.includes(entry.suggestedLayoutMode)) {
          errors.push(`Layout entry ${index} has invalid layoutMode: ${entry.suggestedLayoutMode}`);
        }
        if (!entry.description || typeof entry.description !== 'string') {
          errors.push(`Layout entry ${index} must have description as string`);
        }
      });
    }
  }

  return { isValid: errors.length === 0, errors, warnings };
}

/**
 * Validates a complete training pair (user + assistant messages)
 */
export function validateTrainingPair(userMessage: any, assistantMessage: any): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate individual messages
  const userValidation = validateChatMessage(userMessage);
  const assistantValidation = validateChatMessage(assistantMessage);

  errors.push(...userValidation.errors.map(e => `User message: ${e}`));
  errors.push(...assistantValidation.errors.map(e => `Assistant message: ${e}`));

  if (userMessage?.role !== 'user') {
    errors.push('First message in pair must be user role');
  }
  if (assistantMessage?.role !== 'assistant') {
    errors.push('Second message in pair must be assistant role');
  }

  // Validate content structure
  try {
    const userContent = JSON.parse(userMessage?.content || '{}');
    const assistantContent = JSON.parse(assistantMessage?.content || '{}');

    const inputValidation = validateFrameInput(userContent);
    const responseValidation = validateAIResponse(assistantContent);

    errors.push(...inputValidation.errors);
    errors.push(...responseValidation.errors);

    // Check that response addresses all targets from input
    if (userContent.targets && assistantContent.layoutAdvice?.entries) {
      const requestedTargets = userContent.targets.map((t: any) => t.id);
      const responseTargets = assistantContent.layoutAdvice.entries.map((e: any) => e.targetId);

      for (const target of requestedTargets) {
        if (!responseTargets.includes(target)) {
          warnings.push(`Assistant response missing advice for target: ${target}`);
        }
      }
    }
  } catch (parseError) {
    errors.push('Failed to parse JSON content in messages');
  }

  return { isValid: errors.length === 0, errors, warnings };
}

/**
 * Validates an array of training messages for consistency
 */
export function validateMessageArray(messages: readonly any[]): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!Array.isArray(messages)) {
    errors.push('Messages must be an array');
    return { isValid: false, errors, warnings };
  }

  if (messages.length === 0) {
    errors.push('Messages array must not be empty');
    return { isValid: false, errors, warnings };
  }

  if (messages.length % 2 !== 0) {
    errors.push('Messages array must have even length for user/assistant pairs');
  }

  // Validate message pairing
  for (let i = 0; i < messages.length; i += 2) {
    const userMsg = messages[i];
    const assistantMsg = messages[i + 1];

    const pairValidation = validateTrainingPair(userMsg, assistantMsg);
    errors.push(...pairValidation.errors.map(e => `Pair ${i/2 + 1}: ${e}`));
    warnings.push(...pairValidation.warnings.map(w => `Pair ${i/2 + 1}: ${w}`));
  }

  return { isValid: errors.length === 0, errors, warnings };
}