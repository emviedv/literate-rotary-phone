async function runTestCase(name: string, fn: () => Promise<void>): Promise<void> {
  // Save original process.env and globalThis to restore them later
  const originalEnv = { ...process.env };
  const originalGlobalThis = { ...globalThis };

  try {
    await fn();
    console.log(`✅ ${name}`);
  } catch (error) {
    console.error(`❌ ${name}`);
    console.error(error);
    // Re-throw to make the test runner fail
    throw error;
  } finally {
    // Restore environment after each test case
    process.env = originalEnv;
    // @ts-ignore
    globalThis = { ...originalGlobalThis };
  }
}

function assertEqual<T>(actual: T, expected: T, message: string): void {
  if (actual !== expected) {
    throw new Error(`${message}\nExpected: ${expected}\nReceived: ${actual}`);
  }
}

async function main() {
  await runTestCase("Debug Flag: should return false when no debug flags are set", async () => {
    const { isDebugFixEnabled } = await import(`../core/debug.js?v=${Date.now()}`);
    assertEqual(isDebugFixEnabled(), false, "Expected debug to be disabled by default.");
  });

  await runTestCase('Debug Flag: should return true when process.env.DEBUG_FIX is "1"', async () => {
    process.env.DEBUG_FIX = '1';
    const { isDebugFixEnabled } = await import(`../core/debug.js?v=${Date.now()}`);
    assertEqual(isDebugFixEnabled(), true, "Expected debug to be enabled via process.env.");
  });

  await runTestCase('Debug Flag: should return false when process.env.DEBUG_FIX is "0"', async () => {
    process.env.DEBUG_FIX = '0';
    const { isDebugFixEnabled } = await import(`../core/debug.js?v=${Date.now()}`);
    assertEqual(isDebugFixEnabled(), false, "Expected debug to be disabled via process.env.");
  });

  await runTestCase('Debug Flag: should handle buggy double-quoted value', async () => {
    // This test simulates the bug from the old build script
    process.env.DEBUG_FIX = '"1"'; // The buggy value produced by JSON.stringify("1")
    const { isDebugFixEnabled } = await import(`../core/debug.js?v=${Date.now()}`);
    assertEqual(isDebugFixEnabled(), false, "Expected double-quoted value to fail the check.");
  });

  await runTestCase('Debug Flag: should fall back to globalThis if process.env is not set', async () => {
    // @ts-ignore
    delete process.env.DEBUG_FIX;
    (globalThis as any).DEBUG_FIX = '1';
    const { isDebugFixEnabled } = await import(`../core/debug.js?v=${Date.now()}`);
    assertEqual(isDebugFixEnabled(), true, "Expected debug to be enabled via globalThis.");
  });

  await runTestCase('Debug Flag: should prioritize process.env over globalThis', async () => {
    process.env.DEBUG_FIX = '0';
    (globalThis as any).DEBUG_FIX = '1';
    const { isDebugFixEnabled } = await import(`../core/debug.js?v=${Date.now()}`);
    assertEqual(isDebugFixEnabled(), false, "Expected process.env to take priority over globalThis.");
  });
}

main().catch(err => {
  process.exit(1);
});
