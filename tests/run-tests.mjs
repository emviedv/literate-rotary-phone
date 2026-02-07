/**
 * Test Runner
 *
 * Runs Jest tests if they exist, otherwise exits successfully.
 */

import { execSync } from 'child_process';
import { readdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Check if there are any test files
const testFiles = readdirSync(__dirname).filter(f =>
  f.endsWith('.test.ts') || f.endsWith('.test.js') || f.endsWith('.spec.ts') || f.endsWith('.spec.js')
);

if (testFiles.length === 0) {
  console.log('No test files found. Skipping tests.');
  process.exit(0);
}

// Run Jest
try {
  execSync('npx jest --passWithNoTests', {
    stdio: 'inherit',
    cwd: join(__dirname, '..')
  });
} catch (error) {
  process.exit(1);
}
