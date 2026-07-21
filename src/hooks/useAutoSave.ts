import { useEffect, useRef } from "react";
import { useEditorStore } from "@/store/useEditorStore";

export function useAutoSave() {
  const tabs = useEditorStore((s) => s.tabs);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const dirtyTabs = Object.values(tabs).filter((t) => t.meta.isDirty && t.meta.filePath);
    if (dirtyTabs.length === 0) return;

    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(() => {
      for (const tab of dirtyTabs) {
        if (tab.meta.filePath) {
          localStorage.setItem(`autosave:${tab.meta.filePath}`, tab.content);
        }
      }
    }, 3000);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [tabs]);
}
