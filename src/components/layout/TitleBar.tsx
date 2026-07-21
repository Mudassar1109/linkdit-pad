import { useEffect, useState } from "react";
import { Minus, Square, X, Copy } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEditorStore } from "@/store/useEditorStore";
import type { Window as TauriWindow } from "@tauri-apps/api/window";

/**
 * Frameless custom title bar. Talks to the Tauri window API when running
 * inside the desktop shell; degrades gracefully to a static bar in the
 * browser during `vite dev` so the UI can still be iterated on quickly.
 */
export function TitleBar() {
  const [isMaximized, setIsMaximized] = useState(false);
  const [appWindow, setAppWindow] = useState<TauriWindow | null>(null);

  useEffect(() => {
    let disposed = false;
    import("@tauri-apps/api/window")
      .then(({ getCurrentWindow }) => {
        if (disposed) return;
        const win = getCurrentWindow();
        setAppWindow(win);
        win.isMaximized().then(setIsMaximized);
        const unlisten = win.onResized(() => win.isMaximized().then(setIsMaximized));
        return () => {
          unlisten.then((f) => f());
        };
      })
      .catch(() => {
        // Running outside Tauri (browser dev mode) — no-op.
      });
    return () => {
      disposed = true;
    };
  }, []);

  const handleClose = () => {
    const { tabs } = useEditorStore.getState();
    const hasDirty = Object.values(tabs).some((t) => t.meta.isDirty);
    if (hasDirty && !window.confirm("You have unsaved changes. Close anyway?")) return;
    if (appWindow) {
      appWindow.close();
    } else {
      window.close();
    }
  };

  return (
    <header
      data-tauri-drag-region
      className="flex h-10 select-none items-center justify-between glass-surface"
    >
      <div data-tauri-drag-region className="flex items-center gap-2 px-3 text-sm font-medium">
        <div className="h-4 w-4 rounded-sm bg-primary" aria-hidden />
        <span>LinkDit Pad</span>
      </div>

      <div className="flex h-full">
        <TitleBarButton label="Minimize" onClick={() => appWindow?.minimize()}>
          <Minus size={14} />
        </TitleBarButton>
        <TitleBarButton
          label={isMaximized ? "Restore" : "Maximize"}
          onClick={() => appWindow?.toggleMaximize()}
        >
          {isMaximized ? <Copy size={12} /> : <Square size={12} />}
        </TitleBarButton>
        <TitleBarButton label="Close" danger onClick={handleClose}>
          <X size={14} />
        </TitleBarButton>
      </div>
    </header>
  );
}

function TitleBarButton({
  children,
  onClick,
  label,
  danger,
}: {
  children: React.ReactNode;
  onClick: () => void;
  label: string;
  danger?: boolean;
}) {
  return (
    <button
      aria-label={label}
      onClick={onClick}
      className={cn(
        "flex h-full w-11 items-center justify-center text-foreground/70 transition-colors",
        danger ? "hover:bg-danger hover:text-white" : "hover:bg-muted"
      )}
    >
      {children}
    </button>
  );
}
