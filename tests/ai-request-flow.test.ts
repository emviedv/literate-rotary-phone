type UIMessageHandler = ((message: any) => Promise<void> | void) | null;

const pluginData = new Map<string, string>();
const nodesById = new Map<string, MockFrame>();

let selectionHandler: (() => void) | null = null;
let uiHandler: UIMessageHandler = null;
let fetchCalls = 0;
let fetchResolvers: (() => void)[] = [];
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
  fetchResolvers = [];
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
                signals: {
                  roles: [{ nodeId: "test-node", role: "typography", confidence: 0.9 }],
                  focalPoints: [{ nodeId: "test-node", x: 0.5, y: 0.5, confidence: 0.8 }],
                  qa: []
                },
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
      // Collect all resolvers so we can resolve multiple concurrent fetches
      fetchResolvers.push(() =>
        resolve({
          ok: true,
          status: 200,
          statusText: "OK",
          json: async () => ({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    signals: {
                      roles: [{ nodeId: "test-node", role: "typography", confidence: 0.9 }],
                      focalPoints: [{ nodeId: "test-node", x: 0.5, y: 0.5, confidence: 0.8 }],
                      qa: []
                    },
                    layoutAdvice: { entries: [] }
                  })
                }
              }
            ]
          }),
          text: async () => ""
        })
      );
    });
}

function resolveAllFetches(): void {
  for (const resolver of fetchResolvers) {
    resolver();
  }
  fetchResolvers = [];
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
  // Flush multiple rounds of microtasks to handle async operations
  // in the error recovery system (dynamic imports, structural analysis, etc.)
  for (let i = 0; i < 10; i++) {
    await Promise.resolve();
  }
  // Add a small delay to ensure async dynamic imports complete
  await new Promise(resolve => setTimeout(resolve, 50));
  // Flush again after timeout
  for (let i = 0; i < 10; i++) {
    await Promise.resolve();
  }
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
    // Two-phase AI architecture + error recovery may make multiple requests.
    // The key invariant: refresh triggers AI, selection change doesn't.
    assert(fetchCalls > 0, `Expected AI fetch after refresh, received ${fetchCalls}`);
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

    // Two-phase AI + error recovery may start multiple requests
    assert(fetchCalls > 0, `Expected AI fetch to start, received ${fetchCalls}`);

    // Simulate deletion before AI response resolves
    frame.removed = true;
    nodesById.delete(frame.id);
    (globalThis as any).figma.currentPage.selection = [];

    // Resolve all pending fetches (error recovery may have started multiple)
    resolveAllFetches();
    await refreshPromise;

    // Clearing old data writes empty strings before the fetch starts (when frame is valid).
    // The key invariant: no actual AI results (non-empty values) should be written for a removed frame.
    const hasNonEmptyData = Array.from(pluginData.values()).some(v => v !== "");
    assert(!hasNonEmptyData, "AI results should not be written for a removed frame");
  });
}

main();
