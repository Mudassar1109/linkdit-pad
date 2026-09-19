import { useEffect, useRef, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { TitleBar } from "@/components/layout/TitleBar";
import { Toolbar, openFile, saveFile, saveFileAs } from "@/components/layout/Toolbar";
import { FileOpenBridge } from "@/components/FileOpenBridge";
import { Sidebar } from "@/components/layout/Sidebar";
import { StatusBar } from "@/components/layout/StatusBar";
import { EditorTabs } from "@/components/editor/EditorTabs";
import { EditorSurface } from "@/components/editor/EditorSurface";
import { DocumentOutlinePanel } from "@/components/layout/DocumentOutlinePanel";
import { VersionHistoryDialog } from "@/components/features/VersionHistoryDialog";
import { BackupRecoveryDialog } from "@/components/features/BackupRecoveryDialog";
import { LockPasswordDialog } from "@/components/features/LockPasswordDialog";
import { CommandPalette } from "@/components/features/CommandPalette";
import { SearchReplace } from "@/components/features/SearchReplace";
import { SettingsPanel } from "@/components/features/SettingsPanel";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Toaster } from "@/components/ui/toast";
import { TooltipProvider } from "@/components/ui/tooltip";
import { RecoveryDialog } from "@/components/ui/recovery-dialog";
import { useThemeStore } from "@/store/useThemeStore";
import { useEditorStore } from "@/store/useEditorStore";
import { useCommandPaletteStore } from "@/store/useCommandPaletteStore";
import { useSearchStore } from "@/store/useSearchStore";
import { useSettingsStore } from "@/store/useSettingsStore";
import { useConfirmStore } from "@/store/useConfirmStore";
import { useFontStore } from "@/store/useFontStore";
import { useOutlineStore } from "@/store/useOutlineStore";
import { useAutoSave } from "@/hooks/useAutoSave";
import { useSyncRecentFiles } from "@/hooks/useSyncRecentFiles";
import { useVersionCapture } from "@/hooks/useVersionCapture";
import { useAutoBackup } from "@/hooks/useAutoBackup";
import { addBookmarkAtCursor } from "@/lib/bookmarks";
import type { EditorTab } from "@/types/editor";
import {
  saveSession,
  loadSession,
  clearSession,
  saveCrashRecovery,
  loadCrashRecovery,
  clearCrashRecovery,
  clearAllRecoveryData,
  hasRecoveryData,
  isCleanExit,
  clearCleanExit,
} from "@/lib/sessionStore";

export default function App() {
  const applyResolvedMode = useThemeStore((s) => s.applyResolvedMode);
  const openTab = useEditorStore((s) => s.openTab);
  const restoreSession = useEditorStore((s) => s.restoreSession);
  const toggleCommandPalette = useCommandPaletteStore((s) => s.toggle);
  const toggleSearch = useSearchStore((s) => s.setIsVisible);
  const settingsOpen = useSettingsStore((s) => s.isOpen);
  const closeSettings = useSettingsStore((s) => s.close);
  const sidebarVisible = useEditorStore((s) => s.sidebarVisible);
  const toggleSidebar = useEditorStore((s) => s.toggleSidebar);
  const outlineOpen = useOutlineStore((s) => s.isOpen);

  const [showRecoveryDialog, setShowRecoveryDialog] = useState(false);
  const [recoveryDocumentCount, setRecoveryDocumentCount] = useState(0);
  const initRef = useRef(false);

  useAutoSave();
  useSyncRecentFiles();
  useVersionCapture();
  useAutoBackup();

  useEffect(() => {
    applyResolvedMode();
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => applyResolvedMode();
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, [applyResolvedMode]);

  useEffect(() => {
    useFontStore.getState().restoreImportedFonts();
  }, []);

  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    const recoveryExists = hasRecoveryData();
    const clean = isCleanExit();

    if (recoveryExists && !clean) {
      const recovery = loadCrashRecovery();
      const count = recovery ? Object.keys(recovery).length : 0;
      setRecoveryDocumentCount(count);
      setShowRecoveryDialog(true);
      return;
    }

    if (recoveryExists && clean) {
      clearAllRecoveryData();
    }

    clearCleanExit();

    const session = loadSession();
    if (session && Object.keys(session.tabs).length > 0) {
      restoreSession(session);
      clearSession();
    } else {
      openTab({ content: "" });
    }
  }, [restoreSession, openTab]);

  const handleRestoreSession = () => {
    setShowRecoveryDialog(false);
    const session = loadSession();
    const recovery = loadCrashRecovery();

    const now = new Date().toISOString();

    if (recovery && Object.keys(recovery).length > 0) {
      if (session) {
        const firstGroup = Object.values(session.groups)[0];
        const targetGroupId = firstGroup?.id || "group-main";
        for (const [id, entry] of Object.entries(recovery)) {
          if (session.tabs[id]) {
            session.tabs[id].content = entry.content;
            session.tabs[id].meta.isDirty = true;
          } else {
            const tabId = id;
            session.tabs[tabId] = {
              meta: {
                id: tabId,
                title: entry.title,
                filePath: entry.filePath || null,
                language: null,
                direction: "ltr",
                createdAt: now,
                updatedAt: now,
                isPinned: false,
                isBookmarked: false,
                isDirty: true,
              },
              mode: (entry.mode as EditorTab["mode"]) || "rich",
              content: entry.content,
              scrollPosition: 0,
              cursorPosition: 0,
              groupId: targetGroupId,
            };
            if (session.groups[targetGroupId]) {
              session.groups[targetGroupId].tabIds.push(tabId);
              if (!session.groups[targetGroupId].activeTabId) {
                session.groups[targetGroupId].activeTabId = tabId;
              }
            }
          }
        }
      } else {
        const tabs: Record<string, EditorTab> = {};
        const tabIds: string[] = [];
        let firstTabId: string | null = null;
        for (const [id, entry] of Object.entries(recovery)) {
          const tabId = id;
          tabIds.push(tabId);
          if (!firstTabId) firstTabId = tabId;
          tabs[tabId] = {
            meta: {
              id: tabId,
              title: entry.title,
              filePath: entry.filePath || null,
              language: null,
              direction: "ltr",
              createdAt: now,
              updatedAt: now,
              isPinned: false,
              isBookmarked: false,
              isDirty: true,
            },
            mode: (entry.mode as EditorTab["mode"]) || "rich",
            content: entry.content,
            scrollPosition: 0,
            cursorPosition: 0,
            groupId: "group-main",
          };
        }
        restoreSession({
          tabs,
          groups: {
            "group-main": { id: "group-main", tabIds, activeTabId: firstTabId, splitDirection: null },
          },
          activeGroupId: "group-main",
          sidebarVisible: true,
        });
        clearSession();
        clearCrashRecovery();
        clearCleanExit();
        return;
      }
    }

    if (session) {
      restoreSession(session);
    }

    clearSession();
    clearCrashRecovery();
    clearCleanExit();
  };

  const handleDiscardRecovery = () => {
    setShowRecoveryDialog(false);
    clearAllRecoveryData();
    openTab({ content: "" });
  };

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const persist = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        useEditorStore.getState().commitFocusedPaneToTab();
        const { tabs, groups, activeGroupId, sidebarVisible, splitMode, secondaryTabId, activePane } = useEditorStore.getState();
        saveSession(tabs, groups, activeGroupId, sidebarVisible, { splitMode, secondaryTabId, activePane });
        saveCrashRecovery(tabs);
      }, 500);
    };
    const unsub = useEditorStore.subscribe(persist);
    return () => { unsub(); if (timer) clearTimeout(timer); };
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
          if (!tab?.meta.isDirty) {
            closeTab(activeTabId);
          } else {
            useConfirmStore.getState().show(
              `"${tab.meta.title}" has unsaved changes. Save before closing?`
            ).then((action) => {
              if (action === "save") {
                saveFile().then(() => {
                  useEditorStore.getState().closeTab(activeTabId);
                });
              } else if (action === "discard") {
                closeTab(activeTabId);
              }
            });
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
      if (ctrl && e.shiftKey && e.key === "K") { e.preventDefault(); addBookmarkAtCursor(); return; }
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
      useEditorStore.getState().commitFocusedPaneToTab();
      const { tabs, groups, activeGroupId, sidebarVisible, splitMode, secondaryTabId, activePane } = useEditorStore.getState();
      saveSession(tabs, groups, activeGroupId, sidebarVisible, { splitMode, secondaryTabId, activePane });
      saveCrashRecovery(tabs);
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
            <div className="flex flex-1 min-h-0 min-w-0">
              <div className="relative flex flex-1 flex-col min-w-0 min-h-0">
                <EditorSurface />
                <SearchReplace />
              </div>
              <AnimatePresence>
                {outlineOpen && <DocumentOutlinePanel />}
              </AnimatePresence>
            </div>
          </main>
        </div>
        <StatusBar />
        <CommandPalette />
        <SettingsPanel isOpen={settingsOpen} onClose={closeSettings} />
        <ConfirmDialog />
        <VersionHistoryDialog />
        <BackupRecoveryDialog />
        <LockPasswordDialog />
        <FileOpenBridge />
        <Toaster />
        {showRecoveryDialog && (
          <RecoveryDialog
            documentCount={recoveryDocumentCount}
            onRestore={handleRestoreSession}
            onDiscard={handleDiscardRecovery}
          />
        )}
      </div>
    </TooltipProvider>
  );
}
