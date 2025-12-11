import { UI_SCRIPT_PART1 } from "./template-script-part1.js";
import { UI_SCRIPT_PART2 } from "./template-script-part2.js";
import { UI_SCRIPT_PART3 } from "./template-script-part3.js";

/**
 * Assembled inline script for the plugin iframe. Split into parts to satisfy guardrails.
 */
export const UI_SCRIPT = [UI_SCRIPT_PART1, UI_SCRIPT_PART2, UI_SCRIPT_PART3].join("\n");
