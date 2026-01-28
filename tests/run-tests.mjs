import { spawn } from "node:child_process";
import { readdirSync, rmSync, statSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const buildDir = path.join(projectRoot, "build-tests");

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: "inherit", cwd: projectRoot, shell: false });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${command} ${args.join(" ")} exited with code ${code}`));
      }
    });
  });
}

async function main() {
  rmSync(buildDir, { recursive: true, force: true });
  await run("npx", ["tsc", "--project", "tsconfig.tests.json"]);
  try {
    const testsDir = path.join(buildDir, "tests");

    // Recursively find all .test.js files
    function findTestFiles(dir) {
      const results = [];
      const entries = readdirSync(dir);
      for (const entry of entries) {
        const fullPath = path.join(dir, entry);
        const stat = statSync(fullPath);
        if (stat.isDirectory()) {
          results.push(...findTestFiles(fullPath));
        } else if (entry.endsWith(".test.js")) {
          results.push(fullPath);
        }
      }
      return results;
    }

    const testFiles = findTestFiles(testsDir).sort();

    for (const file of testFiles) {
      await run("node", [file]);
    }
  } finally {
    rmSync(buildDir, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
