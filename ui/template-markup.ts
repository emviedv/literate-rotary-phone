/**
 * Static HTML markup for the plugin iframe body (without script).
 */
export const UI_MARKUP = /* html */ `
  <main>
    <header>
      <h1>Product Landing</h1>
      <p id="selectionLabel" class="status">Select a single frame to begin.</p>
      <p id="buildInfo" class="status" style="font-size: 10px;"></p>
    </header>

    <section class="section" id="aiSection" hidden>
      <div class="ai-header">
        <div class="ai-title">
          <h2>AI signals</h2>
          <p id="aiStatusText" class="status">AI analysis is built into this plugin. Select a frame to analyze.</p>
        </div>
        <div class="button-row">
          <button id="refreshAiButton" class="secondary">Run AI analysis</button>
          <button id="copySelectionButton" class="secondary" title="Copy current selection JSON for debugging.">
            Copy selection JSON
          </button>
        </div>
      </div>
      <div id="aiEmpty" class="status">No AI signals found on selection.</div>
      <div id="aiRoles" class="ai-row" role="list"></div>
      <div id="aiQa" class="ai-qa" role="list"></div>
      <p id="aiQaSummary" class="status"></p>
    </section>

    <section class="section" id="layoutSection" hidden>
      <h2>Layout patterns</h2>
      <p class="status" id="layoutStatus">AI-suggested patterns per target.</p>
      <div id="layoutContainer" class="layout-list"></div>
    </section>

    <section class="section">
      <h2 id="targetSection">Targets</h2>
      <div id="targetList" class="targets-list" role="listbox" aria-multiselectable="true" aria-labelledby="targetSection"></div>
      <p id="targetSummary" class="targets-summary" style="margin-top: 8px;"></p>
    </section>

    <section class="section">
      <h2>Safe area</h2>
      <div class="safe-area-control">
        <label for="safeAreaSlider" style="display: flex; justify-content: space-between; align-items: center;">
          <span>Safe area inset</span>
          <span class="safe-area-value" id="safeAreaValue">8%</span>
        </label>
        <input id="safeAreaSlider" type="range" min="0" max="0.2" step="0.01" value="0.08" />
      </div>
      <div class="safe-area-presets">
        <div class="safe-area-presets-header">
          <span>Presets</span>
          <span class="safe-area-preset-label" id="safeAreaPresetLabel">Balanced (8%)</span>
        </div>
        <div class="preset-pills" id="safeAreaPresets">
          <button type="button" class="preset-pill" data-safe-area-preset="tight" data-label="Tight" data-value="0.04">
            Tight · 4%
          </button>
          <button type="button" class="preset-pill active" data-safe-area-preset="balanced" data-label="Balanced" data-value="0.08">
            Balanced · 8%
          </button>
          <button type="button" class="preset-pill" data-safe-area-preset="roomy" data-label="Roomy" data-value="0.12">
            Roomy · 12%
          </button>
        </div>
      </div>
      <p class="preset-hint">Adjusts the inset used for QA overlays and safe-area checks. Presets snap to brand policies; use the slider for custom ratios.</p>
    </section>

    <button id="generateButton" disabled>Generate variants</button>
    <p id="statusMessage" class="status">Select a single frame to begin.</p>

    <section class="section last-run" id="lastRunSection" hidden>
      <h2>Last run</h2>
      <p id="lastRunContent"></p>
    </section>

    <section class="section" id="resultsSection" hidden>
      <h2>Results</h2>
      <div id="resultsContainer" style="display: flex; flex-direction: column; gap: 8px;"></div>
    </section>

    <section class="section" id="debugSection" hidden>
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
        <h2 style="margin: 0;">Debug Log</h2>
        <button id="copyDebugLogButton" class="secondary" style="padding: 4px 8px; font-size: 11px;">Copy Log</button>
      </div>
      <pre id="debugLogOutput" style="max-height: 200px; overflow-y: auto; background: var(--figma-color-bg-tertiary, #eee); color: var(--figma-color-text-secondary, #333); padding: 8px; border-radius: 4px; white-space: pre-wrap; word-wrap: break-word;"></pre>
    </section>
  </main>

  
`;
