import { DEBUG_KEY, LEGACY_DEBUG_KEY } from "./plugin-constants.js";

declare const figma: PluginAPI | undefined;
declare const process: { env?: Record<string, string | undefined> } | undefined;
// These are replaced by esbuild at compile time
declare const __DEBUG_FIX__: string | undefined;
declare const __DEBUG_FIX_TRACE__: string | undefined;

type DebugContext = Record<string, unknown>;
type LogHandler = (message: string) => void;

let logHandler: LogHandler | null = null;

export function setLogHandler(handler: LogHandler): void {
  logHandler = handler;
  traceDebugLog("log-handler-registered", { handlerAttached: Boolean(logHandler) });
}

function isDebugTraceEnabled(): boolean {
  if (typeof __DEBUG_FIX_TRACE__ !== "undefined" && __DEBUG_FIX_TRACE__ === "1") {
    return true;
  }
  if (typeof process !== "undefined" && process?.env?.DEBUG_FIX_TRACE === "1") {
    return true;
  }
  if (typeof globalThis !== "undefined") {
    const traceFlag = (globalThis as { DEBUG_FIX_TRACE?: string | undefined }).DEBUG_FIX_TRACE;
    if (traceFlag === "1") {
      return true;
    }
  }
  return false;
}

function traceDebugFlag(reason: string, context: DebugContext): void {
  if (!isDebugTraceEnabled()) {
    return;
  }
  console.info("[ScaleResizer][debug-flag]", { reason, ...context });
}

function traceDebugLog(reason: string, context: DebugContext): void {
  if (!isDebugTraceEnabled()) {
    return;
  }
  console.info("[ScaleResizer][debug-log]", { reason, ...context });
}

function computeDebugFlag(): boolean {
  const buildValue = typeof __DEBUG_FIX__ !== "undefined" ? __DEBUG_FIX__ : undefined;
  if (buildValue !== undefined) {
    traceDebugFlag("build-define-resolved", { buildValue });
    return buildValue === "1";
  }

  const envValue = typeof process !== "undefined" ? process?.env?.DEBUG_FIX : undefined;

  if (envValue !== undefined) {
    traceDebugFlag("env-resolved", { envValue });
    return envValue === "1";
  }

  if (typeof figma !== "undefined") {
    try {
      const rootValue = figma.root.getPluginData(DEBUG_KEY);
      const legacyValue = figma.root.getPluginData(LEGACY_DEBUG_KEY);
      if (rootValue === "1" || legacyValue === "1") {
        traceDebugFlag("figma-root-enabled", { rootValue, legacyValue });
        return true;
      }
      traceDebugFlag("figma-root-disabled", { rootValue, legacyValue });
    } catch {
      // Ignore access issues (tests and non-plugin contexts)
      traceDebugFlag("figma-root-error", { error: "plugin data unavailable" });
    }
  }

  if (typeof globalThis !== "undefined") {
    const debugFlag = (globalThis as { DEBUG_FIX?: string | undefined }).DEBUG_FIX;
    if (debugFlag === "1") {
      traceDebugFlag("global-enabled", { debugFlag });
      return true;
    }
    traceDebugFlag("global-disabled", { debugFlag });
  }

  traceDebugFlag("debug-disabled", { envValue });
  return false;
}

export function isDebugFixEnabled(): boolean {
  const computed = computeDebugFlag();
  traceDebugLog("flag-evaluated", { computed });
  return computed;
}

export function resetDebugFlag(): void {
  traceDebugLog("flag-reset-noop", { note: "computeDebugFlag now evaluated per call" });
}

function log(prefix: string, message: string, context?: DebugContext): void {
  if (!isDebugFixEnabled()) {
    traceDebugLog("log-suppressed-debug-disabled", {
      prefix,
      message,
      hasContext: Boolean(context),
      handlerAttached: Boolean(logHandler)
    });
    return;
  }

  traceDebugLog("log-dispatch", {
    prefix,
    message,
    hasContext: Boolean(context),
    handlerAttached: Boolean(logHandler)
  });

  const logMessage = `${prefix} ${message}`;
  if (context) {
    console.log(logMessage, context);
    if (logHandler) {
      logHandler(`${logMessage}\n${JSON.stringify(context, null, 2)}`);
    }
    return;
  }

  console.log(logMessage);
  if (logHandler) {
    logHandler(logMessage);
  }
}

export function debugFixLog(message: string, context?: DebugContext): void {
  log("[ScaleResizer][frame-detach]", message, context);
}

export function debugAutoLayoutLog(message: string, context?: DebugContext): void {
  log("[ScaleResizer][auto-layout]", message, context);
}

export function debugPerformanceLog(message: string, context?: DebugContext): void {
  log("[ScaleResizer][performance]", message, context);
}
