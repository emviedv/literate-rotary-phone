/**
 * Raw UI CSS for the plugin iframe.
 */
export const UI_STYLE = /* css */ `
    :root {
      color-scheme: light dark;
    }
    * {
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
      font-size: 13px;
      line-height: 1.4;
      margin: 0;
      padding: 0;
      background: var(--figma-color-bg, #f7f9fc);
      color: var(--figma-color-text, #101828);
    }
    main {
      padding: 16px 16px 24px 16px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    header {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    h1 {
      font-size: 16px;
      font-weight: 600;
      margin: 0;
    }
    p {
      margin: 0;
    }
    .section {
      background: var(--figma-color-bg-secondary, #ffffff);
      border: 1px solid var(--figma-color-border, rgba(16, 24, 40, 0.1));
      border-radius: 10px;
      padding: 12px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .section h2 {
      margin: 0;
      font-size: 13px;
      font-weight: 600;
      color: var(--figma-color-text-secondary, #475467);
    }
    .targets {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .targets select {
      width: 100%;
      border-radius: 8px;
      border: 1px solid var(--figma-color-border, rgba(16, 24, 40, 0.16));
      padding: 6px 8px;
      background: var(--figma-color-bg-tertiary, rgba(16, 24, 40, 0.02));
      font: inherit;
      color: inherit;
      min-height: 120px;
    }
    .targets select:focus {
      outline: none;
      box-shadow: 0 0 0 2px rgba(51, 92, 255, 0.24);
      border-color: var(--figma-color-bg-brand, #335cff);
    }
    .targets-help,
    .targets-summary {
      font-size: 12px;
      margin: 0;
    }
    .targets-help {
      color: var(--figma-color-text-secondary, #475467);
    }
    .targets-summary {
      color: var(--figma-color-text, #101828);
      font-weight: 600;
    }
    .targets-list {
      display: flex;
      flex-direction: column;
      gap: 4px;
      max-height: 240px;
      overflow-y: auto;
      border: 1px solid var(--figma-color-border, rgba(16, 24, 40, 0.16));
      border-radius: 8px;
      background: var(--figma-color-bg-tertiary, rgba(16, 24, 40, 0.02));
    }
    .target-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 8px 12px;
      cursor: pointer;
      transition: background 0.1s;
      border-bottom: 1px solid var(--figma-color-border, rgba(16, 24, 40, 0.05));
    }
    .target-item:last-child {
      border-bottom: none;
    }
    .target-item:hover {
      background: rgba(16, 24, 40, 0.04);
    }
    .target-item.selected {
      background: rgba(51, 92, 255, 0.08);
    }
    .target-preview {
      background: var(--figma-color-icon-secondary, #8a93a0);
      border-radius: 2px;
    }
    .target-item.selected .target-preview {
      background: var(--figma-color-bg-brand, #335cff);
    }
    .target-info {
      flex: 1;
    }
    .target-name {
      font-weight: 500;
      font-size: 12px;
    }
    .target-dim {
      font-size: 11px;
      color: var(--figma-color-text-secondary, #475467);
    }
    .target-check {
      color: var(--figma-color-bg-brand, #335cff);
      opacity: 0;
      transition: opacity 0.1s;
    }
    .target-item.selected .target-check {
      opacity: 1;
    }
    .safe-area-control {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .safe-area-control input[type="range"] {
      width: 100%;
    }
    .safe-area-value {
      font-variant-numeric: tabular-nums;
      font-weight: 600;
    }
    .safe-area-presets {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .safe-area-presets-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 12px;
      color: var(--figma-color-text-secondary, #475467);
    }
    .safe-area-preset-label {
      font-weight: 600;
      color: var(--figma-color-text, #101828);
    }
    .preset-pills {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }
    .preset-pill {
      border: 1px solid var(--figma-color-border, rgba(16, 24, 40, 0.16));
      border-radius: 999px;
      background: transparent;
      color: var(--figma-color-text, #101828);
      padding: 4px 10px;
      font-size: 12px;
      cursor: pointer;
      transition: background 0.16s ease-in-out, color 0.16s ease-in-out, border-color 0.16s ease-in-out;
    }
    .preset-pill.active {
      background: rgba(51, 92, 255, 0.12);
      border-color: rgba(51, 92, 255, 0.32);
      color: var(--figma-color-text, #101828);
    }
    .preset-hint {
      font-size: 12px;
      margin: 0;
      color: var(--figma-color-text-secondary, #475467);
    }
    input[type="password"],
    input[type="text"] {
      width: 100%;
      border-radius: 8px;
      border: 1px solid var(--figma-color-border, rgba(16, 24, 40, 0.16));
      padding: 8px 10px;
      background: var(--figma-color-bg-tertiary, rgba(16, 24, 40, 0.02));
      font: inherit;
      color: inherit;
    }
    button {
      border: none;
      border-radius: 8px;
      padding: 10px 12px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      background: var(--figma-color-bg-brand, #335cff);
      color: var(--figma-color-text-onbrand, #ffffff);
      transition: background 0.16s ease-in-out;
    }
    button[disabled] {
      background: var(--figma-color-bg-disabled, #d0d5dd);
      color: var(--figma-color-text-disabled, #98a2b3);
      cursor: not-allowed;
    }
    button.secondary {
      background: transparent;
      border: 1px solid var(--figma-color-border, rgba(16, 24, 40, 0.2));
      color: var(--figma-color-text, #101828);
    }
    .button-row {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }
    .status {
      font-size: 12px;
      color: var(--figma-color-text-secondary, #475467);
      min-height: 18px;
    }
    .status.error {
      color: #b42318;
    }
    ul {
      margin: 0;
      padding-left: 18px;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .ai-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 8px;
      flex-wrap: wrap;
    }
    .ai-title {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .warning {
      padding: 6px 8px;
      border-radius: 8px;
      background: rgba(250, 176, 5, 0.12);
      color: #7a3b00;
    }
    .warning.warn {
      color: #ffffff;
    }
    .warning.info {
      background: rgba(16, 156, 241, 0.12);
      color: #0f3b78;
    }
    .last-run {
      font-size: 12px;
      color: var(--figma-color-text-secondary, #475467);
    }
    .result-item {
      display: flex;
      flex-direction: column;
      gap: 4px;
      padding: 8px;
      border: 1px solid rgba(16, 24, 40, 0.1);
      border-radius: 8px;
      background: var(--figma-color-bg-tertiary, rgba(16, 24, 40, 0.04));
      color: #ffffff;
    }
    .result-item strong {
      font-size: 12px;
    }
    .ai-row {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }
    .ai-chip {
      padding: 4px 8px;
      border-radius: 999px;
      background: rgba(16, 24, 40, 0.06);
      font-size: 12px;
      color: var(--figma-color-text-secondary, #475467);
    }
    .ai-chip.info {
      background: rgba(16, 156, 241, 0.14);
      color: #0f3b78;
    }
    .ai-chip.success {
      background: rgba(34, 197, 94, 0.14);
      color: #166534;
    }
    .ai-chip.warn {
      background: rgba(250, 176, 5, 0.16);
      color: #7a3b00;
    }
    .ai-qa {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .ai-qa-item {
      font-size: 12px;
      padding: 6px 8px;
      border-radius: 8px;
      border: 1px solid rgba(16, 24, 40, 0.08);
      background: var(--figma-color-bg-tertiary, rgba(16, 24, 40, 0.04));
      color: var(--figma-color-text, #101828);
    }
    .ai-qa-item.warn {
      border-color: rgba(250, 176, 5, 0.45);
      background: rgba(250, 176, 5, 0.12);
    }
    .ai-qa-item.info {
      border-color: rgba(16, 156, 241, 0.35);
      background: rgba(16, 156, 241, 0.08);
    }
    .ai-qa-item.error {
      border-color: rgba(191, 38, 38, 0.35);
      background: rgba(191, 38, 38, 0.12);
    }
    .ai-qa-title {
      font-weight: 600;
      text-transform: capitalize;
    }
    .ai-qa-meta {
      font-size: 12px;
      color: var(--figma-color-text-secondary, #475467);
      margin-top: 4px;
    }
    .layout-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .layout-row {
      display: flex;
      flex-direction: column;
      gap: 4px;
      padding: 8px;
      border: 1px solid rgba(16, 24, 40, 0.08);
      border-radius: 8px;
      background: var(--figma-color-bg-tertiary, rgba(16, 24, 40, 0.02));
    }
    .layout-row label {
      display: flex;
      justify-content: space-between;
      gap: 6px;
      font-size: 12px;
      color: var(--figma-color-text, #101828);
    }
    .layout-meta {
      font-size: 12px;
      color: var(--figma-color-text-secondary, #475467);
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      align-items: center;
    }
    .layout-row select {
      width: 100%;
      border-radius: 8px;
      border: 1px solid var(--figma-color-border, rgba(16, 24, 40, 0.16));
      padding: 6px 8px;
      background: var(--figma-color-bg-tertiary, rgba(16, 24, 40, 0.02));
      font: inherit;
      color: inherit;
    }
  
`;
