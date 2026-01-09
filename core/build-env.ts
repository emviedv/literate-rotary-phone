declare const __SCALERESIZER_DEFAULT_AI_KEY__: string;
declare const __BIBLIOSCALE_DEFAULT_AI_KEY__: string; // Backwards compatibility

export const DEFAULT_AI_API_KEY: string =
  typeof __SCALERESIZER_DEFAULT_AI_KEY__ !== "undefined" ? __SCALERESIZER_DEFAULT_AI_KEY__ :
  typeof __BIBLIOSCALE_DEFAULT_AI_KEY__ !== "undefined" ? __BIBLIOSCALE_DEFAULT_AI_KEY__ : "";
export const HAS_DEFAULT_AI_API_KEY = DEFAULT_AI_API_KEY.length > 0;
