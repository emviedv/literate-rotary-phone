/**
 * Single-file run command: npx jest --runInBand client/src/__tests__/unit/ui-template.spec.ts
 */
import { JSDOM } from "jsdom";
import { UI_TEMPLATE } from "../../../../ui/template";

type PluginMessage = { readonly pluginMessage: { readonly type: string; readonly payload?: unknown } };

const TARGET_FIXTURES = [
  { id: "hero", label: "Web Hero", width: 1440, height: 600 },
  { id: "thumb", label: "Thumbnail", width: 640, height: 360 }
];

function createUi() {
  const messages: PluginMessage[] = [];
  const originalPostMessageRef: { current?: typeof window.parent.postMessage } = {};
  const dom = new JSDOM(UI_TEMPLATE, {
    runScripts: "dangerously",
    url: "https://example.com",
    beforeParse(window) {
      originalPostMessageRef.current = window.parent.postMessage.bind(window.parent);
      window.parent.postMessage = ((message: PluginMessage) => {
        messages.push(message);
      }) as typeof window.parent.postMessage;
    }
  });
  const { window } = dom;
  const originalPostMessage = originalPostMessageRef.current ?? window.parent.postMessage;
  const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

  return {
    dom,
    window,
    document: window.document,
    messages,
    restore: () => (window.parent.postMessage = originalPostMessage),
    flush
  };
}

function dispatchInit(window: Window, payload: Record<string, unknown>) {
  const event = new window.MessageEvent("message", {
    data: { pluginMessage: { type: "init", payload } }
  });
  window.dispatchEvent(event);
}

describe("ui/template.ts", () => {
  test("requests initial state, then renders an accessible multiselect listbox on init", async () => {
    const { window, document, messages, flush, restore } = createUi();
    await flush();
    expect(messages[0]).toEqual({ pluginMessage: { type: "request-initial-state" } });

    dispatchInit(window, {
      selectionOk: true,
      selectionWidth: 100,
      selectionHeight: 100,
      aiConfigured: true,
      aiStatus: "idle",
      aiSignals: { roles: [], qa: [] },
      layoutAdvice: { entries: [] },
      targets: TARGET_FIXTURES,
      selectionName: "Frame 1"
    });
    await flush();

    const targetList = document.getElementById("targetList");
    expect(targetList?.getAttribute("role")).toBe("listbox");
    expect(targetList?.getAttribute("aria-multiselectable")).toBe("true");

    const items = Array.from(document.querySelectorAll(".target-item"));
    expect(items).toHaveLength(TARGET_FIXTURES.length);
    items.forEach((item) => {
      const roleValue = item.getAttribute("role") ?? (item as unknown as { role?: string }).role;
      expect(roleValue).toBe("option");
      expect(item.getAttribute("aria-selected")).toBe("false");
    });

    const summary = document.getElementById("targetSummary");
    expect(summary?.textContent).toBe("No targets selected.");
    const generateButton = document.getElementById("generateButton") as HTMLButtonElement;
    expect(generateButton.disabled).toBe(true);
    restore();
  });

  test.each([
    { value: "0.04", label: "Tight (4%)" },
    { value: "0.12", label: "Roomy (12%)" }
  ])("updates safe area display and preset label for preset value %s", async ({ value, label }) => {
    const { window, document, flush, restore } = createUi();
    await flush();
    dispatchInit(window, {
      selectionOk: true,
      selectionWidth: 100,
      selectionHeight: 100,
      aiConfigured: true,
      aiStatus: "idle",
      aiSignals: { roles: [], qa: [] },
      layoutAdvice: { entries: [] },
      targets: TARGET_FIXTURES
    });
    await flush();

    const slider = document.getElementById("safeAreaSlider") as HTMLInputElement;
    const presetLabel = document.getElementById("safeAreaPresetLabel");
    const pills = Array.from(document.querySelectorAll(".preset-pill"));

    slider.value = value;
    slider.dispatchEvent(new window.Event("input", { bubbles: true }));

    const percent = Math.round(Number(value) * 100) + "%";
    expect(document.getElementById("safeAreaValue")?.textContent).toBe(percent);
    expect(presetLabel?.textContent).toBe(label);
    const activeCount = pills.filter((pill) => pill.classList.contains("active")).length;
    expect(activeCount).toBe(1);
    restore();
  });

  test("sends generate-variants payload and guards the empty-target edge case", async () => {
    const { window, document, messages, flush, restore } = createUi();
    await flush();
    dispatchInit(window, {
      selectionOk: true,
      selectionWidth: 100,
      selectionHeight: 100,
      selectionName: "Frame 1",
      aiConfigured: true,
      aiStatus: "idle",
      aiSignals: { roles: [], qa: [] },
      layoutAdvice: { entries: [] },
      targets: TARGET_FIXTURES
    });
    await flush();

    const targetItems = Array.from(document.querySelectorAll(".target-item"));
    targetItems[0].dispatchEvent(new window.Event("click", { bubbles: true }));

    const slider = document.getElementById("safeAreaSlider") as HTMLInputElement;
    slider.value = "0.12";
    slider.dispatchEvent(new window.Event("input", { bubbles: true }));

    const generateButton = document.getElementById("generateButton") as HTMLButtonElement;
    expect(generateButton.disabled).toBe(false);
    generateButton.dispatchEvent(new window.Event("click", { bubbles: true }));

    const lastMessage = messages[messages.length - 1];
    expect(lastMessage).toEqual({
      pluginMessage: {
        type: "generate-variants",
        payload: {
          targetIds: ["hero"],
          safeAreaRatio: 0.12,
          layoutPatterns: {}
        }
      }
    });

    // Edge-case contract: when targets are missing the control stays disabled and summarizes state.
    dispatchInit(window, {
      selectionOk: true,
      aiConfigured: true,
      aiStatus: "idle",
      aiSignals: { roles: [], qa: [] },
      layoutAdvice: { entries: [] },
      targets: []
    });
    await flush();

    const summary = document.getElementById("targetSummary");
    const generateButtonAfter = document.getElementById("generateButton") as HTMLButtonElement;
    expect(summary?.textContent).toBe("No targets available.");
    expect(generateButtonAfter.disabled).toBe(true);
    restore();
  });
});
