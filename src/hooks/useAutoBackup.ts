import { useEffect } from "react";
import { useBackupStore } from "@/store/useBackupStore";
import { useEditorStore } from "@/store/useEditorStore";

export function useAutoBackup() {
  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;

    const apply = () => {
      const { settings } = useBackupStore.getState();
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
      if (!settings.enabled) return;
      const minute = 60 * 1000;
      const intervalMs = (settings.intervalMinutes || 15) * minute;
      timer = setInterval(() => {
        const tabCount = Object.keys(useEditorStore.getState().tabs).length;
        if (tabCount > 0) useBackupStore.getState().runBackup();
      }, intervalMs);
    };

    apply();

    const startupTimer = setTimeout(() => {
      const { settings, lastBackupAt } = useBackupStore.getState();
      if (settings.enabled) {
        if (!lastBackupAt || Date.now() - lastBackupAt > (settings.intervalMinutes || 15) * 60 * 1000) {
          const tabCount = Object.keys(useEditorStore.getState().tabs).length;
          if (tabCount > 0) useBackupStore.getState().runBackup();
        }
      }
    }, 8000);

    const unsub = useBackupStore.subscribe((state, prev) => {
      if (
        state.settings.enabled !== prev.settings.enabled ||
        state.settings.intervalMinutes !== prev.settings.intervalMinutes
      ) {
        apply();
      }
    });

    const flush = () => {
      const { settings } = useBackupStore.getState();
      if (settings.enabled) useBackupStore.getState().runBackup();
    };
    window.addEventListener("beforeunload", flush);

    return () => {
      if (timer) clearInterval(timer);
      clearTimeout(startupTimer);
      unsub();
      window.removeEventListener("beforeunload", flush);
    };
  }, []);
}