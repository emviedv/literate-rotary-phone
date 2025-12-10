import { isDebugFixEnabled } from "./debug.js";

export type TelemetryEvent =
  | "TARGET_SELECTED"
  | "VARIANT_GENERATED"
  | "QA_ALERT_DISPLAYED"
  | "LAYOUT_ADVICE_APPLIED"
  | "AI_ANALYSIS_REQUESTED"
  | "AI_ANALYSIS_COMPLETED"
  | "AI_ANALYSIS_FAILED";

export interface TelemetryProperties {
  readonly [key: string]: string | number | boolean | undefined | null | readonly string[];
}

/**
 * Tracks a discrete user action or system event.
 * Currently logs to console if debug mode is enabled.
 * In a real deployment, this would pipe to an analytics provider (e.g. Mixpanel, Segment).
 */
export function trackEvent(eventName: TelemetryEvent, properties?: TelemetryProperties): void {
  if (!isDebugFixEnabled()) {
    return;
  }

  const timestamp = new Date().toISOString();
  console.log(`[BiblioScale][Telemetry] ${eventName}`, {
    timestamp,
    ...properties
  });
}
