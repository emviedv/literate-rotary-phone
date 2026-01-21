/**
 * Segment 1 of the iframe controller script.
 */
export const UI_SCRIPT_PART1 = /* js */ `

    (function () {
      const selectionLabel = document.getElementById("selectionLabel");
      const targetList = document.getElementById("targetList");
      const targetSummary = document.getElementById("targetSummary");
      const safeAreaSlider = document.getElementById("safeAreaSlider");
      const safeAreaValue = document.getElementById("safeAreaValue");
      const safeAreaPresets = document.getElementById("safeAreaPresets");
      const safeAreaPresetLabel = document.getElementById("safeAreaPresetLabel");
      const generateButton = document.getElementById("generateButton");
      const statusMessage = document.getElementById("statusMessage");
      const aiStatusText = document.getElementById("aiStatusText");
      const refreshAiButton = document.getElementById("refreshAiButton");
      const copySelectionButton = document.getElementById("copySelectionButton");
      const lastRunSection = document.getElementById("lastRunSection");
      const lastRunContent = document.getElementById("lastRunContent");
      const resultsSection = document.getElementById("resultsSection");
      const resultsContainer = document.getElementById("resultsContainer");
      const aiSection = document.getElementById("aiSection");
      const aiEmpty = document.getElementById("aiEmpty");
      const aiRoles = document.getElementById("aiRoles");
      const aiQa = document.getElementById("aiQa");
      const aiQaSummary = document.getElementById("aiQaSummary");
      const layoutSection = document.getElementById("layoutSection");
      const layoutStatus = document.getElementById("layoutStatus");
      const layoutContainer = document.getElementById("layoutContainer");
      const buildInfo = document.getElementById("buildInfo");

      const debugSection = document.getElementById("debugSection");
      const debugLogOutput = document.getElementById("debugLogOutput");
      const copyDebugLogButton = document.getElementById("copyDebugLogButton");
      const designTikTokButton = document.getElementById("designTikTokButton");
      const designTikTokStatus = document.getElementById("designTikTokStatus");

      const LAYOUT_CONFIDENCE_THRESHOLD = 0.65;
      const QA_CONFIDENCE_THRESHOLD = 0.35;
      let availableTargets = [];
      let selectedTargetIds = new Set();
      let selectionReady = false;
      let isBusy = false;
      let layoutSelections = {};
      let aiConfigured = false;
      let aiStatusState = "missing-key";
      let aiErrorMessage = "";
      let aiUsingDefaultKey = false;
      let latestSelectionState = null;
      let isDesigning = false;

      if (!(targetList instanceof HTMLElement)) {
        throw new Error("Target list element missing.");
      }
      if (!(targetSummary instanceof HTMLElement)) {
        throw new Error("Target summary element missing.");
      }
      if (!(safeAreaSlider instanceof HTMLInputElement)) {
        throw new Error("Safe area slider missing.");
      }
      if (!(copySelectionButton instanceof HTMLButtonElement)) {
        throw new Error("Copy selection button missing.");
      }

      function createChip(text, tone = "") {
        const chip = document.createElement("span");
        chip.className = "ai-chip" + (tone ? " " + tone : "");
        chip.textContent = text;
        return chip;
      }

      function buildSelectionDebugPayload() {
        return JSON.stringify(
          {
            selection: latestSelectionState,
            selectedTargetIds: Array.from(selectedTargetIds),
            safeAreaRatio: Number(safeAreaSlider.value),
            layoutSelections: { ...layoutSelections },
            ai: {
              configured: aiConfigured,
              status: aiStatusState,
              usingDefaultKey: aiUsingDefaultKey,
              error: aiErrorMessage || undefined
            }
          },
          null,
          2
        );
      }

      async function copyTextToClipboard(text) {
        // Primary path: async clipboard API
        if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
          try {
            await navigator.clipboard.writeText(text);
            return { ok: true, method: "clipboard" };
          } catch (error) {
            console.debug("Clipboard writeText failed, falling back", error);
          }
        }

        // Fallback: hidden textarea + execCommand
        const textarea = document.createElement("textarea");
        textarea.value = text;
        textarea.setAttribute("readonly", "");
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        textarea.setSelectionRange(0, text.length);
        let success = false;
        try {
          success = document.execCommand("copy");
        } catch (error) {
          console.debug("execCommand copy failed", error);
        }
        document.body.removeChild(textarea);
        return { ok: success, method: "textarea" };
      }

      function renderTargets(targets) {
        availableTargets = targets;
        targetList.innerHTML = "";
        
        targets.forEach((target) => {
          const item = document.createElement("div");
          item.className = "target-item";
          item.role = "option";
          item.setAttribute("aria-selected", "false");
          item.dataset.id = target.id;
          
          const preview = document.createElement("div");
          preview.className = "target-preview";
          // Calculate aspect ratio for preview
          const maxDim = 24;
          const ratio = target.width / target.height;
          let w, h;
          if (ratio > 1) {
            w = maxDim;
            h = maxDim / ratio;
          } else {
            h = maxDim;
            w = maxDim * ratio;
          }
          preview.style.width = w + "px";
          preview.style.height = h + "px";
          
          const label = document.createElement("div");
          label.className = "target-info";
          const name = document.createElement("div");
          name.className = "target-name";
          name.textContent = target.label;
          const dim = document.createElement("div");
          dim.className = "target-dim";
          dim.textContent = \`\${target.width} × \${target.height}\`;
          
          label.appendChild(name);
          label.appendChild(dim);
          
          const check = document.createElement("div");
          check.className = "target-check";
          check.innerHTML = \`<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M10 3L4.5 8.5L2 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>\`;

          item.appendChild(preview);
          item.appendChild(label);
          item.appendChild(check);
          
          item.addEventListener("click", () => toggleTarget(target.id));
          
          targetList.appendChild(item);
        });
        
        // Initial auto-select all if not set? No, wait for selection update
      }
      
      function toggleTarget(id) {
        if (selectedTargetIds.has(id)) {
          selectedTargetIds.delete(id);
        } else {
          selectedTargetIds.add(id);
        }
        updateTargetVisuals();
        updateGenerateState();
      }
      
      function updateTargetVisuals() {
        const items = targetList.querySelectorAll(".target-item");
        items.forEach(item => {
          const id = item.dataset.id;
          if (selectedTargetIds.has(id)) {
            item.classList.add("selected");
            item.setAttribute("aria-selected", "true");
          } else {
            item.classList.remove("selected");
            item.setAttribute("aria-selected", "false");
          }
        });
      }

      const safeAreaPresetButtons =
        safeAreaPresets instanceof HTMLElement
          ? Array.from(safeAreaPresets.querySelectorAll("button[data-safe-area-preset]")).filter((button) =>
              button instanceof HTMLButtonElement
            )
          : [];

      const SAFE_AREA_PRESET_TOLERANCE = 0.0005;

      function updateSafeAreaValue() {
        const value = Number(safeAreaSlider.value);
        const percent = Math.round(value * 100);
        safeAreaValue.textContent = String(percent) + "%";
        // Persistence
        try {
          localStorage.setItem("biblioscale_safe_area", String(value));
        } catch (e) {}
      }
      
      // Load persistence
      try {
        const saved = localStorage.getItem("biblioscale_safe_area");
        if (saved) {
          const val = Number(saved);
          if (!isNaN(val)) {
            safeAreaSlider.value = String(val);
          }
        }
      } catch (e) {}

      function updateSafeAreaPresetDisplay() {
        if (!safeAreaPresetLabel || safeAreaPresetButtons.length === 0) {
          return;
        }
        const currentValue = Number(safeAreaSlider.value);
        let matchedLabel = "";
        safeAreaPresetButtons.forEach((button) => {
          const presetValue = Number(button.getAttribute("data-value") || "0");
          const isMatch = Math.abs(presetValue - currentValue) < SAFE_AREA_PRESET_TOLERANCE;
          button.classList.toggle("active", isMatch);
          if (isMatch) {
            matchedLabel = button.getAttribute("data-label") || button.textContent?.trim() || "";
          }
        });
        const percent = Math.round(currentValue * 100);
        safeAreaPresetLabel.textContent = matchedLabel ? matchedLabel + " (" + percent + "%)" : "Custom (" + percent + "%)";
      }


      function getSelectedTargetIds() {
        return Array.from(selectedTargetIds);
      }

      function updateTargetSummary(ids) {
        if (availableTargets.length === 0) {
          targetSummary.textContent = "No targets available.";
          return;
        }
        if (ids.length === 0) {
          targetSummary.textContent = "No targets selected.";
          return;
        }
        if (ids.length === availableTargets.length) {
          targetSummary.textContent = "All targets selected.";
          return;
        }
        if (ids.length <= 3) {
          const labels = availableTargets
            .filter((target) => ids.includes(target.id))
            .map((target) => target.label);
          targetSummary.textContent = labels.join(", ");
          return;
        }
        targetSummary.textContent = \`\${ids.length} targets selected.\`;
      }

      function updateGenerateState() {
        const ids = getSelectedTargetIds();
        // Generate button is permanently disabled - feature removed, use TikTok Design instead
        generateButton.disabled = true;
        updateTargetSummary(ids);
      }
      
      function autoSelectTargets(width, height) {
        if (!width || !height) return;
        
        const newSelection = new Set();
        // Default to selecting all targets to ensure users see all possibilities.
        availableTargets.forEach(target => {
          newSelection.add(target.id);
        });
        
        selectedTargetIds = newSelection;
        updateTargetVisuals();
        updateGenerateState();
      }

      function updateAiStatusDisplay() {
        let text = "";
        if (aiStatusState === "fetching") {
          text = "Analyzing selection with AI…";
        } else if (aiStatusState === "missing-key" || !aiConfigured) {
          text = "AI key is missing from this build. Contact an admin to enable AI analysis.";
        } else if (aiStatusState === "error") {
          text = aiErrorMessage || "AI request failed. Try again.";
        } else if (!selectionReady) {
          text = aiUsingDefaultKey
            ? "Built-in AI key ready. Select a frame to analyze."
            : "Select a frame to request AI analysis.";
        } else if (aiUsingDefaultKey) {
          text = "AI ready via built-in key. Run analysis to refresh insights.";
        } else {
          text = "AI ready. Click Run AI analysis to refresh insights.";
        }

        if (aiStatusState === "error" || aiStatusState === "missing-key") {
          aiStatusText.classList.add("error");
        } else {
          aiStatusText.classList.remove("error");
        }

        aiStatusText.textContent = text;
        refreshAiButton.disabled =
          isBusy || !selectionReady || aiStatusState === "missing-key" || aiStatusState === "fetching";
      }

      function updateDebugControls() {
        copySelectionButton.disabled = isBusy || !selectionReady || !latestSelectionState;
      }

      function updateDesignTikTokButton() {
        if (!designTikTokButton) return;
        designTikTokButton.disabled = isBusy || !selectionReady || !aiConfigured || aiStatusState === "missing-key" || isDesigning;
        if (isDesigning) {
          designTikTokButton.textContent = "Designing...";
          designTikTokButton.classList.add("designing");
        } else {
          designTikTokButton.innerHTML = \`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M9 12C9 13.3807 7.88071 14.5 6.5 14.5C5.11929 14.5 4 13.3807 4 12C4 10.6193 5.11929 9.5 6.5 9.5C7.88071 9.5 9 10.6193 9 12Z" fill="currentColor"/>
            <path d="M16 8.5V15.5C16 17.9853 13.9853 20 11.5 20C9.01472 20 7 17.9853 7 15.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            <path d="M16 8.5C17.933 8.5 19.5 6.933 19.5 5C19.5 5 19.5 5 19.5 5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            <path d="M16 8.5V4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
          Design for TikTok\`;
          designTikTokButton.classList.remove("designing");
        }
      }

      function setDesigningState(active, message) {
        isDesigning = active;
        updateDesignTikTokButton();
        if (designTikTokStatus) {
          designTikTokStatus.textContent = message || "";
          designTikTokStatus.className = "design-status";
        }
      }

      function setDesignSuccess(message) {
        isDesigning = false;
        updateDesignTikTokButton();
        if (designTikTokStatus) {
          designTikTokStatus.textContent = message || "TikTok design created!";
          designTikTokStatus.className = "design-status success";
        }
      }

      function setDesignError(message) {
        isDesigning = false;
        updateDesignTikTokButton();
        if (designTikTokStatus) {
          designTikTokStatus.textContent = message || "Design failed.";
          designTikTokStatus.className = "design-status error";
        }
      }
`;
