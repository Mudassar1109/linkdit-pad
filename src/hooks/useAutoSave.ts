import { useEffect, useRef } from "react";
import { getFocusedPaneTabId, useEditorStore } from "@/store/useEditorStore";
import { useSettingsStore } from "@/store/useSettingsStore";
import { useToastStore } from "@/store/useToastStore";
import { useAutosaveStore } from "@/store/useAutosaveStore";
import { useI18nStore } from "@/store/useI18nStore";
import { saveFocusedDocument } from "@/lib/saveDocument";

/**
 * Auto Save: after the configured idle delay, saves the CURRENT (focused) document
 * to its EXISTING file path on disk using the same save pipeline as File > Save
 * (shared via saveFocusedDocument in src/lib/saveDocument.ts).
 *
 * - Documents that have never been saved (no file path) are NEVER written to an
 *   arbitrary location; they stay dirty and the user uses normal Save / Save As.
 * - Only documents with actual unsaved changes are saved.
 * - Split view: the focused pane is committed to its tab and saved through the
 *   identical commit logic used by manual Save.
 */
export function useAutoSave() {
  const tabs = useEditorStore((s) => s.tabs);
  const splitMode = useEditorStore((s) => s.splitMode);
  const activePane = useEditorStore((s) => s.activePane);
  const secondaryTabId = useEditorStore((s) => s.secondaryTabId);
  const autoSaveEnabled = useSettingsStore((s) => s.editor.autoSave);
  const autoSaveDelay = useSettingsStore((s) => s.editor.autoSaveDelay);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savingRef = useRef(false);
  const lastErrorTabRef = useRef<string | null>(null);

  // Retire the legacy localStorage-only autosave drafts. They were written under
  // "autosave:<path>" keys that nothing ever read; the feature now writes to disk.
  useEffect(() => {
    try {
      const stale: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith("autosave:")) stale.push(key);
      }
      for (const key of stale) localStorage.removeItem(key);
    } catch {
      /* ignore storage access errors */
    }
  }, []);

  useEffect(() => {
    const clearPending = () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };

    const state = useEditorStore.getState();
    const tabId = getFocusedPaneTabId(state);
    const tab = tabId ? state.tabs[tabId] : undefined;

    if (!autoSaveEnabled) {
      clearPending();
      useAutosaveStore.getState().setStatus("idle", tabId ?? null, null);
      return clearPending;
    }

    if (!tabId || !tab) {
      clearPending();
      useAutosaveStore.getState().setStatus("idle", null, null);
      return clearPending;
    }

    // Forever-unsaved document: keep it dirty, never write it somewhere arbitrary.
    if (!tab.meta.filePath) {
      clearPending();
      useAutosaveStore.getState().setStatus("idle", tabId, null);
      return clearPending;
    }

    // No unsaved changes (e.g. just manually saved or auto-saved).
    if (!tab.meta.isDirty) {
      clearPending();
      useAutosaveStore.getState().setStatus("saved", tabId, null);
      return clearPending;
    }

    clearPending();

    const fire = async () => {
      timerRef.current = null;
      // Never run two auto-saves concurrently; re-queue shortly instead.
      if (savingRef.current) {
        timerRef.current = setTimeout(fire, 500);
        return;
      }
      savingRef.current = true;
      const targetId = getFocusedPaneTabId(useEditorStore.getState());
      useAutosaveStore.getState().setStatus("saving", targetId ?? tabId, null);
      try {
        const outcome = await saveFocusedDocument({ requireDirty: true });
        if (outcome.status === "saved" || outcome.status === "not-dirty") {
          lastErrorTabRef.current = null;
          useAutosaveStore.getState().setStatus("saved", outcome.tabId, null);
        } else if (outcome.status === "no-tab") {
          useAutosaveStore.getState().setStatus("idle", null, null);
        } else if (outcome.status === "no-path") {
          // Shouldn't happen (we only schedule documents with a path), but be safe.
          useAutosaveStore.getState().setStatus("idle", outcome.tabId, null);
        } else {
          const message = outcome.message || useI18nStore.getState().t("status.autoSaveFailed");
          useAutosaveStore.getState().setStatus("error", outcome.tabId, message);
          if (lastErrorTabRef.current !== outcome.tabId) {
            lastErrorTabRef.current = outcome.tabId;
            console.error(`[Auto Save] Failed to write "${outcome.path}":`, outcome.error);
            useToastStore.getState().show("error", useI18nStore.getState().t("status.autoSaveFailedHelp", { error: message }));
          }
        }
      } finally {
        savingRef.current = false;
      }
    };

    timerRef.current = setTimeout(fire, autoSaveDelay);
    return clearPending;
  }, [tabs, splitMode, activePane, secondaryTabId, autoSaveEnabled, autoSaveDelay]);
}
