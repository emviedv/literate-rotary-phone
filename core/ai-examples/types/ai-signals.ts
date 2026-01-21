/**
 * Type definitions for AI analysis response structures.
 * These types define the schema for assistant messages in few-shot examples.
 */

/**
 * Universal 7-role taxonomy for compositional layout analysis.
 * Handles diverse content: people, mockups, charts, lists, and mixed media.
 */
export type SemanticRole =
  // Primary focal
  | 'subject'
  // Branding
  | 'branding'
  // Typography
  | 'typography'
  // Interactive
  | 'action'
  // Structural
  | 'container' | 'component'
  // Background
  | 'environment'
  // Catch-all
  | 'unknown';

/** Node role assignment with confidence score */
export interface NodeRoleAssignment {
  readonly nodeId: string;
  readonly role: SemanticRole;
  readonly confidence: number; // 0.0 to 1.0
}

/** Focal point identification within a node */
export interface FocalPoint {
  readonly nodeId: string;
  readonly x: number; // 0.0 to 1.0, relative position
  readonly y: number; // 0.0 to 1.0, relative position
  readonly confidence: number; // 0.0 to 1.0
}

/** QA signal severity levels */
export type QASeverity = 'error' | 'warn' | 'info';

/** Valid QA signal codes for design quality assessment */
export type QASignalCode =
  | 'SAFE_AREA_RISK' | 'CTA_PLACEMENT_RISK' | 'OVERLAY_CONFLICT'
  | 'THUMBNAIL_LEGIBILITY' | 'CONTENT_DENSITY_MISMATCH' | 'ASPECT_MISMATCH'
  | 'TEXT_TOO_SMALL_ACCESSIBLE' | 'COLOR_CONTRAST_INSUFFICIENT' | 'INSUFFICIENT_TOUCH_TARGETS'
  | 'MISSING_CTA' | 'UNCERTAIN_ROLES' | 'HEADING_HIERARCHY_BROKEN' | 'TYPOGRAPHY_INCONSISTENCY';

/** Quality assurance signal for design issues */
export interface QASignal {
  readonly code: QASignalCode;
  readonly severity: QASeverity;
  readonly message: string;
  readonly confidence?: number; // 0.0 to 1.0
}

/** Face region detection for human subjects */
export interface FaceRegion {
  readonly nodeId: string;
  readonly x: number; // 0.0 to 1.0, relative position
  readonly y: number; // 0.0 to 1.0, relative position
  readonly width: number; // 0.0 to 1.0, relative size
  readonly height: number; // 0.0 to 1.0, relative size
  readonly confidence: number; // 0.0 to 1.0
}

/** Complete AI signals response */
export interface AISignals {
  readonly roles: readonly NodeRoleAssignment[];
  readonly focalPoints: readonly FocalPoint[];
  readonly qa: readonly QASignal[];
  readonly faceRegions: readonly FaceRegion[];
}