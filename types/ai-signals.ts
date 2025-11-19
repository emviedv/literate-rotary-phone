export type AiRole =
  | "logo"
  | "hero_image"
  | "secondary_image"
  | "title"
  | "subtitle"
  | "body"
  | "cta"
  | "badge"
  | "list"
  | "decorative"
  | "unknown";

export interface AiRoleEvidence {
  readonly nodeId: string;
  readonly role: AiRole;
  readonly confidence: number;
}

export interface AiFocalPoint {
  readonly nodeId: string;
  readonly x: number;
  readonly y: number;
  readonly confidence: number;
}

export type AiQaCode =
  | "LOW_CONTRAST"
  | "LOGO_TOO_SMALL"
  | "TEXT_OVERLAP"
  | "UNCERTAIN_ROLES"
  | "SALIENCE_MISALIGNED"
  | "SAFE_AREA_RISK"
  | "GENERIC";

export interface AiQaSignal {
  readonly code: AiQaCode;
  readonly severity: "info" | "warn" | "error";
  readonly message?: string;
  readonly confidence?: number;
}

export interface AiSignals {
  readonly roles: readonly AiRoleEvidence[];
  readonly focalPoints: readonly AiFocalPoint[];
  readonly qa: readonly AiQaSignal[];
}
