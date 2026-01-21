/**
 * Segment 2 of the iframe controller script.
 */
export const UI_SCRIPT_PART2 = /* js */ `
      function applySelectionState(state) {
        latestSelectionState = state;
        selectionReady = state.selectionOk;
        if (selectionReady) {
          if (state.selectionName) {
            selectionLabel.textContent = "Using " + state.selectionName;
          } else {
            selectionLabel.textContent = "Ready to generate variants.";
          }
          if (!isBusy) {
            statusMessage.textContent = "Ready to generate variants.";
          }
          // Auto select targets based on new selection dimensions
          if (state.selectionWidth && state.selectionHeight) {
            autoSelectTargets(state.selectionWidth, state.selectionHeight);
          }
        } else {
          const message = state.error || "Select a single frame to begin.";
          selectionLabel.textContent = message;
          if (!isBusy) {
            statusMessage.textContent = message;
          }
        }
        aiConfigured = Boolean(state.aiConfigured);
        aiStatusState = state.aiStatus || (aiConfigured ? "idle" : "missing-key");
        aiErrorMessage = typeof state.aiError === "string" ? state.aiError : "";
        aiUsingDefaultKey = Boolean(state.aiUsingDefaultKey);
        updateAiStatusDisplay();
        renderAiSignals(state.aiSignals);
        renderLayoutAdvice(state.layoutAdvice);
        updateGenerateState();
        updateDebugControls();
        updateDesignTikTokButton();
      }

      // Removing old select event listener
      // targetSelect.addEventListener("change", ...); replaced by toggleTarget

      safeAreaSlider.addEventListener("input", () => {
        updateSafeAreaValue();
        updateSafeAreaPresetDisplay();
        if (!isBusy) {
          statusMessage.textContent = "Ready to generate variants.";
        }
      });

      if (safeAreaPresets instanceof HTMLElement) {
        safeAreaPresets.addEventListener("click", (event) => {
          const source = event.target;
          if (!(source instanceof HTMLElement)) {
            return;
          }
          const button = source.closest("button[data-safe-area-preset]");
          if (!button || !(button instanceof HTMLButtonElement)) {
            return;
          }
          const valueAttr = button.getAttribute("data-value");
          if (!valueAttr) {
            return;
          }
          const nextValue = Number(valueAttr);
          if (Number.isNaN(nextValue)) {
            return;
          }
          safeAreaSlider.value = String(nextValue);
          safeAreaSlider.dispatchEvent(new Event("input", { bubbles: true }));
        });
      }

      updateSafeAreaValue();
      updateSafeAreaPresetDisplay();

      // Generate button click handler removed - feature disabled
      // Use "Design for TikTok" instead

      function setBusy(active, message) {
        isBusy = active;
        if (active) {
          generateButton.disabled = true;
          generateButton.textContent = "Generating…";
        } else {
          generateButton.textContent = "Generate variants";
          updateGenerateState();
        }
        statusMessage.textContent = message;
        updateAiStatusDisplay();
        updateDebugControls();
      }

      function formatLastRun(lastRun) {
        const date = new Date(lastRun.timestamp);
        const formatted = date.toLocaleString(undefined, {
          hour: "2-digit",
          minute: "2-digit",
          month: "short",
          day: "numeric"
        });
        return \`\${formatted} — \${lastRun.sourceNodeName} (\${lastRun.targetIds.length} targets)\`;
      }

      function renderLayoutAdvice(advice) {
        layoutContainer.innerHTML = "";
        if (!selectionReady) {
          layoutSection.hidden = true;
          return;
        }

        const hasAdvice = advice && Array.isArray(advice.entries) && advice.entries.length > 0;
        layoutSection.hidden = false;
        if (!aiConfigured) {
          layoutStatus.textContent = "AI layout advice unavailable in this build. Contact an admin.";
        } else if (aiStatusState === "fetching") {
          layoutStatus.textContent = "Fetching AI layout patterns…";
        } else if (aiStatusState === "error") {
          layoutStatus.textContent = aiErrorMessage || "AI request failed. Using auto layout.";
        } else if (!hasAdvice) {
          layoutStatus.textContent = "Run AI analysis to populate layout patterns.";
        } else {
          layoutStatus.textContent =
            "AI-suggested patterns per target. Confident picks (≥" +
            Math.round(LAYOUT_CONFIDENCE_THRESHOLD * 100) +
            "%) auto-apply; others fall back.";
        }

        if (!hasAdvice) {
          layoutSelections = {};
          layoutContainer.innerHTML = "";
          return;
        }

        const layoutThresholdPercent = Math.round(LAYOUT_CONFIDENCE_THRESHOLD * 100);

        advice.entries.forEach((entry) => {
          const target = availableTargets.find((item) => item.id === entry.targetId);
          if (!target) return;
          const row = document.createElement("div");
          row.className = "layout-row";

          const label = document.createElement("label");
          label.textContent = target.label;
          row.appendChild(label);

          const select = document.createElement("select");
          entry.options.forEach((option) => {
            const opt = document.createElement("option");
            opt.value = option.id;
            const scoreText = option.score !== undefined ? " - " + Math.round(option.score * 100) + "%" : "";
            opt.textContent = option.label + scoreText;
            opt.title = option.description;
            select.appendChild(opt);
          });

          const sortedOptions = [...entry.options].sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
          const confidentOption = sortedOptions.find(
            (option) => typeof option.score === "number" && option.score >= LAYOUT_CONFIDENCE_THRESHOLD
          );
          const defaultChoice = layoutSelections[entry.targetId] || confidentOption?.id || entry.selectedId || entry.options[0]?.id;
          if (defaultChoice) {
            select.value = defaultChoice;
          }

          if (confidentOption?.id) {
            layoutSelections[entry.targetId] = confidentOption.id;
          } else {
            delete layoutSelections[entry.targetId];
          }

          select.addEventListener("change", () => {
            layoutSelections[entry.targetId] = select.value;
          });

          row.appendChild(select);

          const meta = document.createElement("div");
          meta.className = "layout-meta";
          const topScore = sortedOptions[0]?.score;
          if (confidentOption && typeof confidentOption.score === "number") {
            meta.appendChild(createChip("AI confident", "success"));
            const detail = document.createElement("span");
            detail.textContent =
              Math.round(confidentOption.score * 100) + "% ≥ " + layoutThresholdPercent + "% threshold";
            meta.appendChild(detail);
          } else {
            meta.appendChild(createChip("Low confidence", "warn"));
            const detail = document.createElement("span");
            const readableScore = typeof topScore === "number" ? Math.round(topScore * 100) + "%" : "No score provided";
            detail.textContent =
              readableScore + " below " + layoutThresholdPercent + "% threshold; generation will fall back unless overridden.";
            meta.appendChild(detail);
          }

          row.appendChild(meta);
          layoutContainer.appendChild(row);
        });
      }

      function renderResults(results) {
        resultsContainer.innerHTML = "";
        results.forEach((result) => {
          const target = availableTargets.find((item) => item.id === result.targetId);
          const tile = document.createElement("div");
          tile.className = "result-item";
          const heading = document.createElement("strong");
          heading.textContent = target ? target.label : result.targetId;
          tile.appendChild(heading);
          if (result.layoutPatternId) {
            const patternLine = document.createElement("span");
            patternLine.style.color = "var(--figma-color-text-secondary, #475467)";
            patternLine.style.fontSize = "12px";
            const confidenceSuffix =
              typeof result.layoutPatternConfidence === "number"
                ? " (" + Math.round(result.layoutPatternConfidence * 100) + "% AI)"
                : "";
            patternLine.textContent =
              "Layout: " + (result.layoutPatternLabel || result.layoutPatternId) + confidenceSuffix;
            tile.appendChild(patternLine);
          } else if (result.layoutPatternFallback) {
            const badge = document.createElement("span");
            badge.className = "ai-chip";
            badge.style.background = "rgba(250, 176, 5, 0.18)";
            badge.style.color = "#7a3b00";
            badge.textContent = "Deterministic layout fallback";
            tile.appendChild(badge);
          }

          if (result.warnings.length === 0) {
            const success = document.createElement("span");
            success.textContent = "No QA warnings.";
            success.style.color = "var(--figma-color-text-secondary, #475467)";
            tile.appendChild(success);
          } else {
            const list = document.createElement("ul");
            result.warnings.forEach((warning) => {
              const item = document.createElement("li");
              const badge = document.createElement("div");
              badge.className = "warning " + (warning.severity === "info" ? "info" : "warn");
              badge.textContent = warning.message;
              item.appendChild(badge);
              list.appendChild(item);
            });
            tile.appendChild(list);
          }
          resultsContainer.appendChild(tile);
        });
      }

      function renderAiSignals(aiSignals) {
        if (!selectionReady) {
          aiSection.hidden = true;
          return;
        }
        aiSection.hidden = false;
        aiRoles.innerHTML = "";
        aiQa.innerHTML = "";
        aiEmpty.hidden = false;
        if (aiQaSummary instanceof HTMLElement) {
          aiQaSummary.textContent = "";
        }

        if (!aiConfigured) {
          aiEmpty.textContent = "AI analysis is unavailable in this build. Contact an admin.";
          return;
        }
        if (aiStatusState === "fetching") {
          aiEmpty.textContent = "Analyzing selection with AI…";
          return;
        }
        if (aiStatusState === "error") {
          aiEmpty.textContent = aiErrorMessage || "AI request failed. Try again.";
          return;
        }

        const hasRoles = aiSignals && Array.isArray(aiSignals.roles) && aiSignals.roles.length > 0;
        const qaSignals = aiSignals && Array.isArray(aiSignals.qa) ? aiSignals.qa : [];
        const filteredQa = qaSignals.filter((qa) => {
          if (qa.confidence === undefined) {
            return true;
          }
          return qa.confidence >= QA_CONFIDENCE_THRESHOLD;
        });
        const suppressedQa = qaSignals.length - filteredQa.length;
        const hasQa = filteredQa.length > 0;

        if (!aiSignals || (!hasRoles && !hasQa)) {
          const thresholdPercent = Math.round(QA_CONFIDENCE_THRESHOLD * 100);
          aiEmpty.textContent =
            suppressedQa > 0
              ? "No QA alerts above " + thresholdPercent + "% confidence (" + suppressedQa + " filtered)."
              : "Run AI analysis to populate signals for this frame.";
          if (suppressedQa > 0 && aiQaSummary instanceof HTMLElement) {
            aiQaSummary.textContent =
              "Filtered " + suppressedQa + " low-confidence QA checks below " + thresholdPercent + "%.";
          }
          return;
        }

        aiEmpty.hidden = true;

        if (aiQaSummary instanceof HTMLElement) {
          const thresholdPercent = Math.round(QA_CONFIDENCE_THRESHOLD * 100);
          const thresholdText = hasQa
            ? "QA alerts \u2265 " + thresholdPercent + "% confidence."
`;
