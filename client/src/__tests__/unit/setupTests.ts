/**
 * Single-file run command for dependent specs: npx jest --runInBand <spec-path>
 */
import { TextDecoder, TextEncoder } from "node:util";

if (typeof (globalThis as { TextEncoder?: typeof TextEncoder }).TextEncoder === "undefined") {
  (globalThis as { TextEncoder: typeof TextEncoder }).TextEncoder = TextEncoder;
}

if (typeof (globalThis as { TextDecoder?: typeof TextDecoder }).TextDecoder === "undefined") {
  (globalThis as { TextDecoder: typeof TextDecoder }).TextDecoder = TextDecoder;
}
