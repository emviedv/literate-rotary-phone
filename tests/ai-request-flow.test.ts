type UIMessageHandler = ((message: any) => Promise<void> | void) | null;

const pluginData = new Map<string, string>();
const nodesById = new Map<string, MockFrame>();

let selectionHandler: (() => void) | null = null;
let uiHandler: UIMessageHandler = null;
let fetchCalls = 0;
let fetchResolver: (() => void) | null = null;
let storedKey = "test-key";

type MockFrame = {
  id: string;
  type: "FRAME";
  name: string;
  width: number;
  height: number;
  absoluteBoundingBox: { x: number; y: number; width: number; height: number };
  children: any[];
  removed: boolean;
  getPluginData: (key: string) => string;
  setPluginData: (key: string, value: string) => void;
};

const frame: MockFrame = {
  id: "frame-1",
  type: "FRAME",
  name: "Mock Frame",
  width: 800,
  height: 600,
  absoluteBoundingBox: { x: 0, y: 0, width: 800, height: 600 },
  children: [],
  removed: false,
  getPluginData: (key: string) => pluginData.get(`${key}`) ?? "",
  setPluginData: (key: string, value: string) => {
    if (frame.removed) {
      throw new Error("node removed");
    }
    pluginData.set(`${key}`, value);
  }
};

nodesById.set(frame.id, frame);

function resetState(): void {
  frame.removed = false;
  pluginData.clear();
  nodesById.set(frame.id, frame);
  (globalThis as any).figma.currentPage.selection = [frame];
  fetchResolver = null;
}

function installImmediateFetch(): void {
  fetchCalls = 0;
  (globalThis as any).fetch = async () => {
    fetchCalls += 1;
    return {
      ok: true,
      status: 200,
      statusText: "OK",
      json: async () => ({
        choices: [
          {
            message: {
              content: JSON.stringify({
                signals: { roles: [], focalPoints: [], qa: [] },
                layoutAdvice: { entries: [] }
              })
            }
          }
        ]
      }),
      text: async () => ""
    };
  };
}

function installDeferredFetch(): void {
  fetchCalls = 0;
  (globalThis as any).fetch = () =>
    new Promise((resolve) => {
      fetchCalls += 1;
      fetchResolver = () =>
        resolve({
          ok: true,
          status: 200,
          statusText: "OK",
          json: async () => ({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    signals: { roles: [], focalPoints: [], qa: [] },
                    layoutAdvice: { entries: [] }
                  })
                }
              }
            ]
          }),
          text: async () => ""
        });
    });
}

// Mock figma globals expected at module load
(globalThis as any).figma = {
  root: {
    children: [],
    appendChild: () => {},
    getPluginData: () => "",
    setPluginData: () => {}
  },
  showUI: () => {},
  on: (event: string, handler: () => void) => {
    if (event === "selectionchange") {
      selectionHandler = handler;
    }
  },
  ui: {
    postMessage: () => {},
    onmessage: null as UIMessageHandler
  },
  currentPage: {
    selection: [frame]
  },
  getNodeById: (id: string) => (nodesById.has(id) ? nodesById.get(id) : null),
  clientStorage: {
    getAsync: async () => storedKey,
    setAsync: async (_key: string, value: string) => {
      storedKey = value;
    },
    deleteAsync: async () => {
      storedKey = "";
    }
  },
  notify: () => {},
  createPage: () => ({ type: "PAGE", name: "page", children: [], appendChild: () => {} }),
  createFrame: () => ({ type: "FRAME", children: [] }),
  createRectangle: () => ({ type: "RECTANGLE" }),
  viewport: { scrollAndZoomIntoView: () => {} }
};

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

async function loadPlugin(): Promise<void> {
  if (!uiHandler) {
    await import("../core/main.js");
    uiHandler = (globalThis as any).figma.ui.onmessage;
  }
}

async function flushMicrotasks(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

declare const process: { exit: (code: number) => void };
async function runTest(name: string, fn: () => Promise<void>): Promise<void> {
  try {
    await fn();
    console.log(`✅ ${name}`);
  } catch (error) {
    console.error(`❌ ${name}`);
    console.error(error);
    process.exit(1);
  }
}

async function main(): Promise<void> {
  await runTest("AI analysis only runs when refresh button is pressed", async () => {
    resetState();
    installImmediateFetch();
    await loadPlugin();

    if (!uiHandler) {
      throw new Error("UI handler not initialized");
    }

    selectionHandler?.();
    await flushMicrotasks();

    assert(fetchCalls === 0, `Expected 0 AI fetches on selection change, received ${fetchCalls}`);

    await uiHandler({ type: "refresh-ai" });
    assert(fetchCalls === 1, `Expected 1 AI fetch after refresh, received ${fetchCalls}`);
  });

  await runTest("AI write skips when frame is removed mid-flight", async () => {
    resetState();
    installDeferredFetch();
    await loadPlugin();

    if (!uiHandler) {
      throw new Error("UI handler not initialized");
    }

    const refreshPromise = uiHandler({ type: "refresh-ai" });
    await flushMicrotasks(); // ensure fetch is invoked

    assert(fetchCalls === 1, `Expected AI fetch to start, received ${fetchCalls}`);

    // Simulate deletion before AI response resolves
    frame.removed = true;
    nodesById.delete(frame.id);
    (globalThis as any).figma.currentPage.selection = [];

    fetchResolver?.();
    await refreshPromise;

    assert(pluginData.size === 0, "AI plugin data should not be written for a removed frame");
  });
}

main();
