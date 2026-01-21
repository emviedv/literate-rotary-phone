/**
 * Segment 3 of the iframe controller script.
 */
export const UI_SCRIPT_PART3 = /* js */ `
            : "No QA alerts above " + thresholdPercent + "% confidence.";
          aiQaSummary.textContent =
            suppressedQa > 0
              ? thresholdText + " Filtered " + suppressedQa + " low-confidence checks."
              : thresholdText;
        }

        if (hasRoles) {
          aiSignals.roles.slice(0, 8).forEach((role) => {
            const chip = document.createElement("span");
            chip.className = "ai-chip";
            const confidence = Math.round((role.confidence ?? 0) * 100);
            chip.textContent = role.role.replace("_", " ") + " - " + confidence + "%";
            aiRoles.appendChild(chip);
          });
        }

        if (hasQa) {
          filteredQa.forEach((qa) => {
            const item = document.createElement("div");
            item.className = "ai-qa-item " + (qa.severity === "info" ? "info" : qa.severity === "error" ? "error" : "warn");
            const title = document.createElement("div");
            title.className = "ai-qa-title";
            title.textContent = qa.code.replace(/_/g, " ").toLowerCase();
            item.appendChild(title);
            const meta = document.createElement("div");
            meta.className = "ai-qa-meta";
            const confidenceText =
              qa.confidence !== undefined ? Math.round(qa.confidence * 100) + "% confidence" : "Confidence not provided";
            const severityTone = qa.severity === "info" ? "info" : "warn";
            const severityLabel = qa.severity === "error" ? "Critical" : qa.severity === "info" ? "Info" : "Warning";
            meta.appendChild(createChip(severityLabel, severityTone));
            const confidenceSpan = document.createElement("span");
            confidenceSpan.textContent = confidenceText;
            meta.appendChild(confidenceSpan);
            item.appendChild(meta);
            if (qa.message) {
              const detail = document.createElement("div");
              detail.style.color = "var(--figma-color-text-secondary, #475467)";
              detail.style.marginTop = "2px";
              detail.textContent = qa.message;
              item.appendChild(detail);
            }
            aiQa.appendChild(item);
          });
        }
      }

      function requestAiRefresh() {
        if (!selectionReady) {
          statusMessage.textContent = "Select a frame before running AI analysis.";
          return;
        }
        if (!aiConfigured || aiStatusState === "missing-key") {
          statusMessage.textContent = "AI key is not available in this build. Contact an admin.";
          return;
        }
        parent.postMessage({ pluginMessage: { type: "refresh-ai" } }, "*");
        statusMessage.textContent = "Requesting AI insights…";
      }

      refreshAiButton.addEventListener("click", requestAiRefresh);
      copySelectionButton.addEventListener("click", copySelectionJson);

      async function copyDebugLog() {
        if (!debugLogOutput || !debugLogOutput.textContent) {
          statusMessage.textContent = "No debug log to copy.";
          return;
        }
        try {
          const result = await copyTextToClipboard(debugLogOutput.textContent);
          if (result.ok) {
            statusMessage.textContent = result.method === "clipboard"
              ? "Debug log copied to clipboard."
              : "Debug log copied (fallback).";
          } else {
            statusMessage.textContent = "Copy failed. Clipboard is blocked.";
          }
        } catch (error) {
          console.error("Copy debug log failed", error);
          statusMessage.textContent = "Copy failed. See console.";
        }
      }

      if (copyDebugLogButton) {
        copyDebugLogButton.addEventListener("click", copyDebugLog);
      }

      async function copySelectionJson() {
        if (!selectionReady || !latestSelectionState) {
          statusMessage.textContent = "Select a frame to copy debug JSON.";
          return;
        }
        const payload = buildSelectionDebugPayload();
        try {
          const result = await copyTextToClipboard(payload);
          if (result.ok) {
            statusMessage.textContent =
              result.method === "clipboard"
                ? "Selection JSON copied to clipboard."
                : "Selection JSON copied (fallback).";
          } else {
            statusMessage.textContent = "Copy failed. Clipboard is blocked.";
          }
        } catch (error) {
          console.error("Copy selection JSON failed", error);
          statusMessage.textContent = "Copy failed. See console.";
        }
      }

      window.onmessage = (event) => {
        const message = event.data.pluginMessage;
        if (!message) {
          return;
        }
        switch (message.type) {
          case "init": {
            if (message.payload.buildTimestamp && buildInfo) {
              const date = new Date(message.payload.buildTimestamp);
              buildInfo.textContent = "Build: " + date.toLocaleTimeString();
            }
            if (message.payload.debugEnabled && debugSection && debugLogOutput) {
              debugSection.hidden = false;
              debugLogOutput.textContent = "Debug mode enabled. Waiting for logs...\\n\\n";
            }
            renderTargets(message.payload.targets);
            applySelectionState({
              selectionOk: message.payload.selectionOk,
              selectionName: message.payload.selectionName,
              error: message.payload.error,
              aiSignals: message.payload.aiSignals,
              layoutAdvice: message.payload.layoutAdvice,
              aiConfigured: message.payload.aiConfigured,
              aiStatus: message.payload.aiStatus,
              aiError: message.payload.aiError
            });
            if (message.payload.lastRun) {
              lastRunSection.hidden = false;
              lastRunContent.textContent = formatLastRun(message.payload.lastRun);
            } else {
              lastRunSection.hidden = true;
              lastRunContent.textContent = "";
            }
            resultsSection.hidden = true;
            break;
          }
          case "status":
            if (message.payload.status === "running") {
              setBusy(true, "Generating variants…");
            } else {
              setBusy(false, selectionReady ? "Ready to generate variants." : "Select a single frame to begin.");
            }
            break;
          case "generation-complete":
            setBusy(false, "Variants created.");
            resultsSection.hidden = false;
            renderResults(message.payload.results);
            break;
          case "selection-update":
            applySelectionState(message.payload);
            break;
          case "error":
            setBusy(false, message.payload.message || "Something went wrong.");
            break;
          case "debug-log": {
            if (debugSection && debugLogOutput) {
              debugSection.hidden = false;
              debugLogOutput.textContent += message.payload.message + "\\n";
              debugLogOutput.scrollTop = debugLogOutput.scrollHeight;
            }
            break;
          }
          default:
            console.warn("Unhandled UI message", message);
        }
      };

      updateSafeAreaValue();
      updateAiStatusDisplay();
      updateDebugControls();
      parent.postMessage({ pluginMessage: { type: "request-initial-state" } }, "*");
    })();
  
`;
