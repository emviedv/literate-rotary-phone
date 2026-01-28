import { trackEvent } from "../core/telemetry.js";
import { resetDebugFlag } from "../core/debug.js";

declare const process: { env: Record<string, string | undefined> };

// Mock process.env
if (typeof process === "undefined") {
  (globalThis as any).process = { env: {} };
}

function testCase(name: string, fn: () => void) {
  try {
    resetDebugFlag(); // Reset before test
    fn();
    console.log(`✅ ${name}`);
  } catch (error) {
    console.error(`❌ ${name}`);
    throw error;
  }
}

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

testCase("trackEvent logs to console when DEBUG_FIX is enabled", () => {
  const originalLog = console.log;
  let loggedMessage = "";
  let loggedData: any = null;

  console.log = (msg: string, data: any) => {
    loggedMessage = msg;
    loggedData = data;
  };

  try {
    process.env.DEBUG_FIX = "1";
    trackEvent("TARGET_SELECTED", { targetId: "test-target" });

    // debugFixLog uses "[ScaleResizer][frame-detach]" prefix and prepends "Telemetry: " to event name
    assert(loggedMessage === "[ScaleResizer][frame-detach] Telemetry: TARGET_SELECTED", "Message should match event name with prefix");
    assert(loggedData.targetId === "test-target", "Properties should be passed through");

  } finally {
    console.log = originalLog;
    delete process.env.DEBUG_FIX;
  }
});

testCase("trackEvent does NOT log when DEBUG_FIX is disabled", () => {
  const originalLog = console.log;
  let callCount = 0;

  console.log = () => {
    callCount++;
  };

  try {
    delete process.env.DEBUG_FIX;
    trackEvent("VARIANT_GENERATED", { success: true });

    assert(callCount === 0, "Console log should not be called when debug is off");

  } finally {
    console.log = originalLog;
  }
});
