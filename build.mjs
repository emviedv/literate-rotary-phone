import { rmSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import * as esbuild from "esbuild";

const buildTimestamp = new Date().toISOString();
const outdir = "dist";
const watchMode = process.argv.includes("--watch");
const defaultAiKey =
  process.env.SCALERESIZER_DEFAULT_OPENAI_KEY ??
  process.env.BIBLIOSCALE_DEFAULT_OPENAI_KEY ??
  process.env.BIBLIO_DEFAULT_OPENAI_KEY ??
  "";

const envDebugRaw =
  process.env.SCALERESIZER_DEBUG_FIX ??
  process.env.BIBLIOSCALE_DEBUG_FIX ??
  process.env.DEBUG_FIX ??
  process.env.debug_fix;
const envDebug = envDebugRaw === "1" ? "1" : envDebugRaw === "0" ? "0" : null;
const inferredDev = watchMode || process.env.NODE_ENV === "development";
const debugFixDefault = envDebug ?? (inferredDev ? "1" : undefined);

const debugBanner = `
if (typeof globalThis !== "undefined" && typeof globalThis.DEBUG_FIX === "undefined") {
  globalThis.DEBUG_FIX = ${JSON.stringify(debugFixDefault)};
}
`;

const defines = {
  __SCALERESIZER_DEFAULT_AI_KEY__: JSON.stringify(defaultAiKey),
  __BIBLIOSCALE_DEFAULT_AI_KEY__: JSON.stringify(defaultAiKey), // Backwards compatibility
  __BUILD_TIMESTAMP__: JSON.stringify(buildTimestamp),
  __DEBUG_FIX__: '"' + debugFixDefault + '"'
};

if (process.env.DEBUG_FIX_TRACE) {
  defines.__DEBUG_FIX_TRACE__ = '"' + process.env.DEBUG_FIX_TRACE + '"';
}

const buildOptions = {
  bundle: true,
  entryPoints: ["core/main.ts"],
  outfile: path.join(outdir, "main.js"),
  platform: "browser",
  format: "iife",
  target: ["es2017"],
  sourcemap: true,
  logLevel: "info",
  metafile: false,
  color: true,
  treeShaking: true,
  mainFields: ["module", "main"],
  banner: {
    js: debugBanner
  },
  define: defines
};

async function clean() {
  rmSync(outdir, { recursive: true, force: true });
}

async function build() {
  await clean();
  if (watchMode) {
    const context = await esbuild.context(buildOptions);
    await context.watch();
    console.log("👀 Watching for changes… (Ctrl+C to stop)");
  } else {
    await esbuild.build(buildOptions);
    console.log("✅ Build complete");
  }
}

build().catch((error) => {
  console.error(error);
  process.exit(1);
});
