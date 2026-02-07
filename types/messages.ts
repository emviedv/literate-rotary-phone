/**
 * Plugin ↔ UI Message Protocol
 *
 * Messages flow bidirectionally between the Figma main thread and the UI iframe.
 * The main thread has Figma API access; the UI has DOM/browser APIs.
 */

// Messages from UI to Plugin (main thread)
export type UIToPluginMessage =
  | { type: "GENERATE_TIKTOK" }
  | { type: "CANCEL" }
  | { type: "SET_API_KEY"; apiKey: string };

// Messages from Plugin to UI
export type PluginToUIMessage =
  | { type: "SELECTION_CHANGED"; hasValidSelection: boolean; frameName?: string }
  | { type: "GENERATION_STARTED" }
  | { type: "GENERATION_PROGRESS"; stage: string; detail?: string }
  | { type: "GENERATION_COMPLETE"; variantId: string; variantName: string }
  | { type: "GENERATION_ERROR"; error: string }
  | { type: "API_KEY_STATUS"; hasKey: boolean };

// Union type for all messages
export type PluginMessage = UIToPluginMessage | PluginToUIMessage;
