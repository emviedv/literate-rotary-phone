import { rmSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import * as esbuild from "esbuild";

const outdir = "dist";
const watchMode = process.argv.includes("--watch");
const defaultAiKey =
  process.env.BIBLIOSCALE_DEFAULT_OPENAI_KEY ??
  process.env.BIBLIO_DEFAULT_OPENAI_KEY ??
  "";

const envDebug = process.env.BIBLIOSCALE_DEBUG_FIX ?? process.env.DEBUG_FIX;
let debugFixDefault;
if (envDebug) {
  debugFixDefault = envDebug === "1" ? "1" : "0";
} else {
  debugFixDefault = watchMode ? "1" : "0";
}

const debugBanner = `
if (typeof globalThis !== "undefined" && typeof globalThis.DEBUG_FIX === "undefined") {
  globalThis.DEBUG_FIX = ${JSON.stringify(debugFixDefault)};
}
`;

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
  define: {
    __BIBLIOSCALE_DEFAULT_AI_KEY__: JSON.stringify(defaultAiKey),
    "process.env.DEBUG_FIX": JSON.stringify(debugFixDefault)
  }
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
