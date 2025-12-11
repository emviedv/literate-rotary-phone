import { DEBUG_KEY, LEGACY_DEBUG_KEY } from "./plugin-constants.js";

declare const figma: PluginAPI | undefined;
declare const process: { env?: Record<string, string | undefined> } | undefined;

type DebugContext = Record<string, unknown>;
type LogHandler = (message: string) => void;

let logHandler: LogHandler | null = null;

export function setLogHandler(handler: LogHandler): void {
  logHandler = handler;
}

function computeDebugFlag(): boolean {
  if (typeof process !== "undefined" && process?.env?.DEBUG_FIX === "1") {
    return true;
  }

  if (typeof figma !== "undefined") {
    try {
      if (figma.root.getPluginData(DEBUG_KEY) === "1" || figma.root.getPluginData(LEGACY_DEBUG_KEY) === "1") {
        return true;
      }
    } catch {
      // Ignore access issues (tests and non-plugin contexts)
    }
  }

  if (typeof globalThis !== "undefined") {
    const debugFlag = (globalThis as { DEBUG_FIX?: string | undefined }).DEBUG_FIX;
    if (debugFlag === "1") {
      return true;
    }
  }

  return false;
}

let cachedDebugFlag: boolean | null = null;

export function isDebugFixEnabled(): boolean {
  if (cachedDebugFlag === null) {
    cachedDebugFlag = computeDebugFlag();
  }
  return cachedDebugFlag;
}

export function resetDebugFlag(): void {
  cachedDebugFlag = null;
}

function log(prefix: string, message: string, context?: DebugContext): void {
  if (!isDebugFixEnabled()) {
    return;
  }

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
  log("[BiblioScale][frame-detach]", message, context);
}

export function debugAutoLayoutLog(message: string, context?: DebugContext): void {
  log("[BiblioScale][auto-layout]", message, context);
}
