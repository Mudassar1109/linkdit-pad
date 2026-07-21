import { useEffect } from "react";
import { useSettingsStore } from "@/store/useSettingsStore";

type ShortcutHandler = Record<string, () => void>;

export function useKeyboardShortcuts(handlers: ShortcutHandler) {
  const shortcuts = useSettingsStore((s) => s.shortcuts);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || (e.target as HTMLElement)?.isContentEditable) {
        if (e.key === "Escape") {
          const handler = handlers["commandPalette.open"];
          handler?.();
          return;
        }
        if (e.ctrlKey || e.metaKey) {
          for (const sc of shortcuts) {
            if (sc.ctrl === e.ctrlKey && sc.shift === !!e.shiftKey && sc.alt === !!e.altKey && sc.key.toLowerCase() === e.key.toLowerCase()) {
              e.preventDefault();
              handlers[sc.command]?.();
              return;
            }
          }
        }
        return;
      }

      for (const sc of shortcuts) {
        if (sc.ctrl === e.ctrlKey && sc.shift === !!e.shiftKey && sc.alt === !!e.altKey && sc.key.toLowerCase() === e.key.toLowerCase()) {
          e.preventDefault();
          e.stopPropagation();
          handlers[sc.command]?.();
          return;
        }
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [shortcuts, handlers]);
}
