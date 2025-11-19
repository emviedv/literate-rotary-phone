import { rmSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import * as esbuild from "esbuild";

const outdir = "dist";
const watchMode = process.argv.includes("--watch");

const buildOptions = {
  bundle: true,
  entryPoints: ["core/main.ts"],
  outfile: path.join(outdir, "main.js"),
  platform: "browser",
  format: "esm",
  target: ["es2017"],
  sourcemap: true,
  logLevel: "info",
  metafile: false,
  color: true,
  treeShaking: true,
  mainFields: ["module", "main"]
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
