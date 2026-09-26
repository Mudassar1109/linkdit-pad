import { useEffect, useState, useCallback } from "react";
import { Minus, Square, X, Copy, Sun, Moon, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEditorStore } from "@/store/useEditorStore";
import { useConfirmStore } from "@/store/useConfirmStore";
import { useSettingsStore } from "@/store/useSettingsStore";
import { useThemeStore } from "@/store/useThemeStore";
import { saveFile } from "./Toolbar";
import { markCleanExit } from "@/lib/sessionStore";
import appLogo from "../../../src-tauri/icons/32 × 32 px.png";
import type { Window as TauriWindow } from "@tauri-apps/api/window";
import { useI18n } from "@/store/useI18nStore";

/**
 * Frameless custom title bar. Talks to the Tauri window API when running
 * inside the desktop shell; degrades gracefully to a static bar in the
 * browser during `vite dev` so the UI can still be iterated on quickly.
 */
export function TitleBar() {
  const { t } = useI18n();
  const [isMaximized, setIsMaximized] = useState(false);
  const [appWindow, setAppWindow] = useState<TauriWindow | null>(null);
  const resolvedMode = useThemeStore((s) => s.resolvedMode);
  const setThemeMode = useThemeStore((s) => s.setThemeMode);
  const toggleSettings = useSettingsStore((s) => s.toggle);

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

  const handleClose = useCallback(async () => {
    const store = useEditorStore.getState();
    const hasDirty = Object.values(store.tabs).some((t) => t.meta.isDirty);
    if (hasDirty) {
      const action = await useConfirmStore.getState().show(
        t("dialogs.confirm.unsavedBeforeClose")
      );
      if (action === "cancel") return;
      if (action === "save") {
        await saveFile();
      }
    }
    markCleanExit();
    if (appWindow) {
      appWindow.close();
    } else {
      window.close();
    }
  }, [appWindow]);

  return (
    <header
      data-tauri-drag-region
      className="flex h-10 select-none items-center justify-between glass-surface border-b border-border/80"
    >
      <div data-tauri-drag-region className="flex items-center gap-2.5 px-3">
        <img
          src={appLogo}
          alt=""
          aria-hidden
          draggable={false}
          className="h-[18px] w-[18px] rounded-[5px] object-contain shadow-glow-sm"
        />
        <span className="text-sm font-semibold tracking-tight">{t("titlebar.appName")}</span>
        <span className="hidden h-3 w-px bg-border/80 md:block" aria-hidden />
        <span className="hidden text-[11px] font-medium text-muted-foreground md:block">
          {t("titlebar.tagline")}
        </span>
      </div>

      <div className="flex h-full">
        <TitleBarButton label={t("titlebar.toggleTheme")} onClick={() => setThemeMode(resolvedMode === "dark" ? "light" : "dark")}>
          {resolvedMode === "dark" ? <Sun size={14} /> : <Moon size={14} />}
        </TitleBarButton>
        <TitleBarButton label={t("titlebar.settings")} onClick={() => toggleSettings()}>
          <Settings size={14} />
        </TitleBarButton>
        <div className="mx-1 self-center h-4 w-px bg-border/80" aria-hidden />
        <TitleBarButton label={t("titlebar.minimize")} onClick={() => appWindow?.minimize()}>
          <Minus size={14} />
        </TitleBarButton>
        <TitleBarButton
          label={isMaximized ? t("titlebar.restore") : t("titlebar.maximize")}
          onClick={() => appWindow?.toggleMaximize()}
        >
          {isMaximized ? <Copy size={12} /> : <Square size={12} />}
        </TitleBarButton>
        <TitleBarButton label={t("titlebar.close")} danger onClick={handleClose}>
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
