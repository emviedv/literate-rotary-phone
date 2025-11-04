import { rm } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { spawn } from "node:child_process";

async function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: "inherit", shell: false, ...options });
    child.on("close", (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`${command} ${args.join(" ")} exited with code ${code ?? "null"}`));
    });
    child.on("error", (error) => reject(error));
  });
}

async function main() {
  const root = process.cwd();
  const buildDir = path.join(root, "build-tests");

  await rm(buildDir, { recursive: true, force: true });

  await run("npx", ["tsc", "-p", "tsconfig.tests.json"]);
  await run("node", [path.join(buildDir, "tests/layout-positions.test.js")]);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
