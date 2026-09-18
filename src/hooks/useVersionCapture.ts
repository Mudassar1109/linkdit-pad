import { useEffect } from "react";
import { useEditorStore } from "@/store/useEditorStore";
import { useVersionHistoryStore, flushVersionCapture } from "@/store/useVersionHistoryStore";
import type { EditorTab } from "@/types/editor";

const CAPTURE_DEBOUNCE_MS = 4000;

export function useVersionCapture() {
  useEffect(() => {
    const timers: Record<string, ReturnType<typeof setTimeout>> = {};

    const schedule = (tabId: string) => {
      if (timers[tabId]) clearTimeout(timers[tabId]);
      timers[tabId] = setTimeout(() => {
        const tab = useEditorStore.getState().tabs[tabId];
        if (tab) useVersionHistoryStore.getState().capture(tabId, tab as EditorTab);
        delete timers[tabId];
      }, CAPTURE_DEBOUNCE_MS);
    };

    const unsub = useEditorStore.subscribe((state, prev) => {
      for (const id of Object.keys(state.tabs)) {
        const cur = state.tabs[id];
        const before = prev.tabs?.[id];
        if (!before || cur.content === before.content) continue;
        schedule(id);
      }
    });

    const flush = () => {
      useEditorStore.getState().commitFocusedPaneToTab();
      flushVersionCapture();
    };
    window.addEventListener("beforeunload", flush);

    return () => {
      unsub();
      window.removeEventListener("beforeunload", flush);
      for (const id of Object.keys(timers)) clearTimeout(timers[id]);
    };
  }, []);
}