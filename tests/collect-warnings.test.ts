import { AI_SIGNALS_KEY, ROLE_KEY } from "../core/plugin-constants.js";
import type { VariantTarget } from "../types/targets.js";
import type { AiSignals } from "../types/ai-signals.js";
import type { VariantWarning } from "../types/messages.js";

declare const process: { exit: (code: number) => void };

type CoreExports = typeof import("../core/main.js");

let collectWarnings: CoreExports["collectWarnings"] | undefined;
let combineChildBounds: CoreExports["combineChildBounds"] | undefined;

type BoundingBox = { x: number; y: number; width: number; height: number };
type MockNode = {
  readonly id: string;
  readonly name: string;
  readonly type: "FRAME" | "RECTANGLE";
  readonly absoluteBoundingBox: BoundingBox;
  readonly children?: readonly MockNode[];
  readonly width?: number;
  readonly height?: number;
  readonly getPluginData?: (key: string) => string;
};

type MockFrame = MockNode & {
  readonly children: readonly MockNode[];
  readonly width: number;
  readonly height: number;
  readonly getPluginData: (key: string) => string;
};

function runTest(name: string, fn: () => void): void {
  try {
    fn();
    console.log(`✅ ${name}`);
  } catch (error) {
    console.error(`❌ ${name}`);
    console.error(error);
    process.exit(1);
  }
}

function installFigmaMock(): void {
  const pluginData = new Map<string, string>();
  (globalThis as any).figma = {
    root: {
      children: [],
      appendChild: () => {},
      getPluginData: (key: string) => pluginData.get(key) ?? "",
      setPluginData: (key: string, value: string) => {
        pluginData.set(key, value);
      }
    },
    showUI: () => {},
    on: () => {},
    ui: {
      postMessage: () => {},
      onmessage: null
    },
    currentPage: {
      selection: []
    },
    clientStorage: {
      getAsync: async () => "",
      setAsync: async () => {},
      deleteAsync: async () => {}
    },
    createPage: () => ({ type: "PAGE", name: "page", children: [], appendChild: () => {} }),
    createFrame: () => ({ type: "FRAME", children: [] }),
    createRectangle: () => ({ type: "RECTANGLE" }),
    getNodeById: () => null,
    notify: () => {},
    viewport: { scrollAndZoomIntoView: () => {} }
  };
}

async function loadCore(): Promise<void> {
  if (collectWarnings && combineChildBounds) {
    return;
  }
  installFigmaMock();
  const core = await import("../core/main.js");
  collectWarnings = core.collectWarnings;
  combineChildBounds = core.combineChildBounds;
}

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

function makeTarget(width: number, height: number, id: string = "test-target"): VariantTarget {
  return {
    id,
    label: id,
    description: id,
    width,
    height
  };
}

function makeFrame(bounds: BoundingBox, children: readonly MockNode[] = [], pluginData: Record<string, string> = {}): MockFrame {
  return {
    id: "frame-1",
    name: "Frame",
    type: "FRAME",
    width: bounds.width,
    height: bounds.height,
    absoluteBoundingBox: bounds,
    children,
    getPluginData: (key: string) => pluginData[key] ?? ""
  };
}

function makeChild(id: string, bounds: BoundingBox, options?: { readonly overlay?: boolean }): MockNode {
  const pluginData: Record<string, string> = {};
  if (options?.overlay) {
    pluginData[ROLE_KEY] = "overlay";
  }
  return {
    id,
    name: id,
    type: "RECTANGLE",
    absoluteBoundingBox: bounds,
    children: [],
    width: bounds.width,
    height: bounds.height,
    getPluginData: Object.keys(pluginData).length > 0 ? (key: string) => pluginData[key] ?? "" : undefined
  };
}

function withAiSignals(signals: AiSignals, frame: MockFrame): MockFrame {
  return makeFrame(frame.absoluteBoundingBox, frame.children, {
    ...(signals ? { [AI_SIGNALS_KEY]: JSON.stringify(signals) } : {})
  });
}

function boundsFromWarnings(warnings: readonly VariantWarning[], code: VariantWarning["code"]): VariantWarning | undefined {
  return warnings.find((warning) => warning.code === code);
}

async function main(): Promise<void> {
  await loadCore();

  runTest("collectWarnings flags safe area breach and misalignment", () => {
    const target = makeTarget(400, 400);
    const content = makeChild("content", { x: -40, y: 0, width: 320, height: 220 });
    const frame = makeFrame({ x: 0, y: 0, width: 400, height: 400 }, [content]);

    const warnings = collectWarnings!(frame as unknown as FrameNode, target, 0.05);

    assert(boundsFromWarnings(warnings, "OUTSIDE_SAFE_AREA") !== undefined, "Expected safe area warning when content exceeds insets.");
    assert(boundsFromWarnings(warnings, "MISALIGNED") !== undefined, "Expected misalignment warning when content is offset.");
  });

  runTest("collectWarnings leverages AI QA signals as contract warnings", () => {
    const target = makeTarget(400, 400);
    const content = makeChild("content", { x: 100, y: 100, width: 200, height: 200 });
    const aiSignals: AiSignals = {
      roles: [],
      focalPoints: [],
      qa: [{ code: "TEXT_OVERLAP", severity: "warn", confidence: 0.9, message: "Crowded text" }]
    };
    const frame = withAiSignals(aiSignals, makeFrame({ x: 0, y: 0, width: 400, height: 400 }, [content]));

    const warnings = collectWarnings!(frame as unknown as FrameNode, target, 0.1);
    const aiWarning = boundsFromWarnings(warnings, "AI_TEXT_OVERLAP");

    assert(aiWarning !== undefined, "Expected AI QA warning to be surfaced.");
    assert(aiWarning?.severity === "warn", "Expected AI warning severity to match input.");
  });

  runTest("collectWarnings applies platform-specific safe area contract (TikTok)", () => {
    const target = makeTarget(1080, 1920, "tiktok-vertical");
    const content = makeChild("content", { x: 0, y: 0, width: 1000, height: 1900 });
    const frame = makeFrame({ x: 0, y: 0, width: 1080, height: 1920 }, [content]);

    const warnings = collectWarnings!(frame as unknown as FrameNode, target, 0);
    assert(boundsFromWarnings(warnings, "OUTSIDE_SAFE_AREA") !== undefined, "Expected safe area warning using TikTok inset overrides.");
  });

  runTest("combineChildBounds ignores overlays and full-bleed backgrounds", () => {
    const overlay = makeChild("overlay", { x: 0, y: 0, width: 100, height: 100 }, { overlay: true });
    const background = makeChild("background", { x: 0, y: 0, width: 195, height: 98 });
    const focal = makeChild("focal", { x: 25, y: 10, width: 50, height: 40 });
    const nested = makeChild("nested", { x: 60, y: 60, width: 30, height: 30 });
    const nestedFrame = makeFrame({ x: 50, y: 50, width: 100, height: 100 }, [nested]);
    const frame = makeFrame(
      { x: 0, y: 0, width: 200, height: 100 },
      [overlay, background, focal, nestedFrame]
    );

    const bounds = combineChildBounds!(frame as unknown as FrameNode);

    assert(bounds !== null, "Expected combined bounds from non-ignored children.");
    assert(bounds?.x === 25 && bounds.y === 10, "Expected overlay and background nodes to be ignored when computing min bounds.");
    assert(bounds?.width === 125 && bounds.height === 140, "Expected bounds to span focal and nested frame content.");
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
