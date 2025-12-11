import type { AiStatus } from "../types/messages.js";
import { DEFAULT_AI_API_KEY, HAS_DEFAULT_AI_API_KEY } from "./build-env.js";
import { debugFixLog } from "./debug.js";
import { AI_KEY_STORAGE_KEY, LEGACY_AI_KEY_STORAGE_KEY } from "./plugin-constants.js";

declare const figma: PluginAPI;

type AiState = {
  cachedAiApiKey: string | null;
  aiUsingDefaultKey: boolean;
  aiStatus: AiStatus;
  aiStatusDetail: string | null;
  aiKeyLoaded: boolean;
};

export type AiStateSnapshot = AiState & { readonly aiConfigured: boolean };

const state: AiState = {
  cachedAiApiKey: null,
  aiUsingDefaultKey: false,
  aiStatus: "missing-key",
  aiStatusDetail: null,
  aiKeyLoaded: false
};

export function getAiState(): AiStateSnapshot {
  return {
    ...state,
    aiConfigured: Boolean(state.cachedAiApiKey)
  };
}

export function getCachedAiApiKey(): string | null {
  return state.cachedAiApiKey;
}

export async function ensureAiKeyLoaded(): Promise<AiStateSnapshot> {
  if (state.aiKeyLoaded) {
    return getAiState();
  }

  const stored = await figma.clientStorage.getAsync(AI_KEY_STORAGE_KEY);
  const legacyStored = await figma.clientStorage.getAsync(LEGACY_AI_KEY_STORAGE_KEY);
  const activeValue =
    typeof stored === "string" && stored.trim().length > 0
      ? stored
      : typeof legacyStored === "string"
        ? legacyStored
        : "";
  const trimmed = typeof activeValue === "string" ? activeValue.trim() : "";
  const migratedFromLegacy =
    trimmed.length > 0 &&
    (!stored || (typeof stored === "string" && stored.trim().length === 0)) &&
    typeof legacyStored === "string" &&
    legacyStored.trim().length > 0;

  if (migratedFromLegacy) {
    await figma.clientStorage.setAsync(AI_KEY_STORAGE_KEY, trimmed);
  }

  if (trimmed.length > 0) {
    state.cachedAiApiKey = trimmed;
    state.aiUsingDefaultKey = HAS_DEFAULT_AI_API_KEY && trimmed === DEFAULT_AI_API_KEY;
  } else if (HAS_DEFAULT_AI_API_KEY) {
    state.cachedAiApiKey = DEFAULT_AI_API_KEY;
    state.aiUsingDefaultKey = true;
  } else {
    state.cachedAiApiKey = null;
    state.aiUsingDefaultKey = false;
  }

  state.aiKeyLoaded = true;
  setAiStatus(resolveStatusFromKey(), null);

  debugFixLog("ai key source resolved", {
    source: state.cachedAiApiKey ? (state.aiUsingDefaultKey ? "default" : "user-provided") : "missing",
    usingDefault: state.aiUsingDefaultKey
  });

  return getAiState();
}

export async function persistApiKey(rawKey: string): Promise<AiStateSnapshot> {
  const trimmed = rawKey.trim();

  if (trimmed.length === 0) {
    await figma.clientStorage.deleteAsync(AI_KEY_STORAGE_KEY);
    await figma.clientStorage.deleteAsync(LEGACY_AI_KEY_STORAGE_KEY);
    if (HAS_DEFAULT_AI_API_KEY) {
      state.cachedAiApiKey = DEFAULT_AI_API_KEY;
      state.aiUsingDefaultKey = true;
      state.aiStatus = "idle";
    } else {
      state.cachedAiApiKey = null;
      state.aiUsingDefaultKey = false;
      state.aiStatus = "missing-key";
    }
    state.aiStatusDetail = null;
  } else {
    await figma.clientStorage.setAsync(AI_KEY_STORAGE_KEY, trimmed);
    await figma.clientStorage.deleteAsync(LEGACY_AI_KEY_STORAGE_KEY);
    state.cachedAiApiKey = trimmed;
    state.aiUsingDefaultKey = HAS_DEFAULT_AI_API_KEY && trimmed === DEFAULT_AI_API_KEY;
    setAiStatus("idle", null);
  }

  state.aiKeyLoaded = true;
  return getAiState();
}

export function setAiStatus(aiStatus: AiStatus, aiStatusDetail: string | null = null): AiStateSnapshot {
  state.aiStatus = aiStatus;
  state.aiStatusDetail = aiStatusDetail;
  return getAiState();
}

export function resolveStatusFromKey(): AiStatus {
  return state.cachedAiApiKey ? "idle" : "missing-key";
}

export function resetAiStatus(): AiStateSnapshot {
  return setAiStatus(resolveStatusFromKey(), null);
}
