import { useEffect } from "react";
import { AnimatePresence } from "framer-motion";
import { TitleBar } from "@/components/layout/TitleBar";
import { Toolbar, openFile, saveFile, saveFileAs } from "@/components/layout/Toolbar";
import { Sidebar } from "@/components/layout/Sidebar";
import { StatusBar } from "@/components/layout/StatusBar";
import { EditorTabs } from "@/components/editor/EditorTabs";
import { EditorSurface } from "@/components/editor/EditorSurface";
import { CommandPalette } from "@/components/features/CommandPalette";
import { SearchReplace } from "@/components/features/SearchReplace";
import { SettingsPanel } from "@/components/features/SettingsPanel";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useThemeStore } from "@/store/useThemeStore";
import { useEditorStore } from "@/store/useEditorStore";
import { useCommandPaletteStore } from "@/store/useCommandPaletteStore";
import { useSearchStore } from "@/store/useSearchStore";
import { useSettingsStore } from "@/store/useSettingsStore";
import { useAutoSave } from "@/hooks/useAutoSave";

export default function App() {
  const applyResolvedMode = useThemeStore((s) => s.applyResolvedMode);
  const openTab = useEditorStore((s) => s.openTab);
  const tabCount = useEditorStore((s) => Object.keys(s.tabs).length);
  const toggleCommandPalette = useCommandPaletteStore((s) => s.toggle);
  const toggleSearch = useSearchStore((s) => s.setIsVisible);
  const settingsOpen = useSettingsStore((s) => s.isOpen);
  const closeSettings = useSettingsStore((s) => s.close);
  const sidebarVisible = useEditorStore((s) => s.sidebarVisible);
  const toggleSidebar = useEditorStore((s) => s.toggleSidebar);

  useAutoSave();

  useEffect(() => {
    applyResolvedMode();
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => applyResolvedMode();
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, [applyResolvedMode]);

  useEffect(() => {
    if (tabCount === 0) {
      openTab({ content: "" });
    }
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const ctrl = e.ctrlKey || e.metaKey;
      const isEditorFocused = document.activeElement?.closest('[contenteditable]');

      if (ctrl && e.shiftKey && e.key === "S") { e.preventDefault(); saveFileAs(); return; }
      if (ctrl && e.key === "s") { e.preventDefault(); saveFile(); return; }
      if (ctrl && e.key === "n") { e.preventDefault(); openTab(); return; }
      if (ctrl && e.key === "o") { e.preventDefault(); openFile(); return; }
      if (ctrl && e.key === "w") {
        e.preventDefault();
        const { tabs, groups, activeGroupId, closeTab } = useEditorStore.getState();
        const activeTabId = groups[activeGroupId]?.activeTabId;
        if (activeTabId) {
          const tab = tabs[activeTabId];
          if (!tab?.meta.isDirty || window.confirm(`"${tab.meta.title}" has unsaved changes. Close anyway?`)) {
            closeTab(activeTabId);
          }
        }
        return;
      }

      if (ctrl && e.key === "b") {
        if (!isEditorFocused) {
          e.preventDefault();
          toggleSidebar();
        }
        return;
      }

      if (ctrl && e.shiftKey && e.key === "p") { e.preventDefault(); toggleCommandPalette(); return; }
      if (ctrl && e.key === "f") { e.preventDefault(); toggleSearch(true); return; }
      if (ctrl && e.key === "h") { e.preventDefault(); toggleSearch(true); return; }
      if (e.key === "Escape") { toggleCommandPalette(); return; }
      if (ctrl && e.key === ",") { e.preventDefault(); useSettingsStore.getState().toggle(); return; }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [toggleCommandPalette, toggleSearch, openTab]);

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      const { tabs } = useEditorStore.getState();
      const hasDirty = Object.values(tabs).some((t) => t.meta.isDirty);
      if (hasDirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex h-screen w-screen flex-col overflow-hidden bg-background">
        <TitleBar />
        <Toolbar />
        <div className="flex flex-1 min-h-0">
          <AnimatePresence>
            {sidebarVisible && <Sidebar />}
          </AnimatePresence>
          <main className="flex flex-1 flex-col min-w-0 min-h-0 relative">
            <EditorTabs />
            <EditorSurface />
            <SearchReplace />
          </main>
        </div>
        <StatusBar />
        <CommandPalette />
        <SettingsPanel isOpen={settingsOpen} onClose={closeSettings} />
      </div>
    </TooltipProvider>
  );
}
