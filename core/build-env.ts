declare const __BIBLIOSCALE_DEFAULT_AI_KEY__: string;

export const DEFAULT_AI_API_KEY: string = typeof __BIBLIOSCALE_DEFAULT_AI_KEY__ !== "undefined" ? __BIBLIOSCALE_DEFAULT_AI_KEY__ : "";
export const HAS_DEFAULT_AI_API_KEY = DEFAULT_AI_API_KEY.length > 0;
