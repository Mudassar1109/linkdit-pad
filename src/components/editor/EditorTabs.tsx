import { useCallback, useRef, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Plus, FileText, ChevronLeft, ChevronRight, Trash2, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useEditorStore } from "@/store/useEditorStore";
import { useLockStore } from "@/store/useLockStore";
import { useConfirmStore } from "@/store/useConfirmStore";
import { saveFile } from "@/components/layout/Toolbar";
import { moveTabToTrash } from "@/lib/trash";
import {
  ContextMenu, ContextMenuTrigger, ContextMenuContent,
  ContextMenuItem, ContextMenuSeparator
} from "@/components/ui/context-menu";

export function EditorTabs() {
  const { tabs, groups, activeGroupId, setActiveTab, closeTab, openTab, renameTab } = useEditorStore();
  const group = groups[activeGroupId];
  const lockLocks = useLockStore((s) => s.locks);
  const unlockedIds = useLockStore((s) => s.unlockedIds);
  const isTabLocked = useCallback((tabId: string) => !!lockLocks[tabId] && !unlockedIds.includes(tabId), [lockLocks, unlockedIds]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 0);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 1);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    checkScroll();
    el.addEventListener("scroll", checkScroll);
    const obs = new ResizeObserver(checkScroll);
    obs.observe(el);
    return () => {
      el.removeEventListener("scroll", checkScroll);
      obs.disconnect();
    };
  }, [checkScroll, group?.tabIds.length]);

  const scrollBy = useCallback((dir: number) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * 150, behavior: "smooth" });
  }, []);

  const handleClose = useCallback(async (e: React.MouseEvent, tabId: string) => {
    e.stopPropagation();
    const tab = tabs[tabId];
    if (tab?.meta.isDirty) {
      const action = await useConfirmStore.getState().show(
        `"${tab.meta.title}" has unsaved changes. Save before closing?`
      );
      if (action === "cancel") return;
      if (action === "save") {
        await saveFile();
      }
    }
    closeTab(tabId);
  }, [closeTab, tabs]);

  const handleDuplicate = useCallback((tabId: string) => {
    const tab = tabs[tabId];
    if (tab) openTab({ content: tab.content, mode: tab.mode });
  }, [tabs, openTab]);

  const handleCloseOthers = useCallback(async (tabId: string) => {
    const tabIds = group?.tabIds || [];
    const hasDirty = tabIds.some((id) => id !== tabId && tabs[id]?.meta.isDirty);
    if (hasDirty) {
      const action = await useConfirmStore.getState().show(
        "Close other tabs with unsaved changes?"
      );
      if (action !== "discard") return;
    }
    for (const id of tabIds) {
      if (id !== tabId) closeTab(id);
    }
  }, [group?.tabIds, closeTab, tabs]);

  const handleCloseAll = useCallback(async () => {
    const tabIds = group?.tabIds || [];
    const hasDirty = tabIds.some((id) => tabs[id]?.meta.isDirty);
    if (hasDirty) {
      const action = await useConfirmStore.getState().show(
        "Close all tabs with unsaved changes?"
      );
      if (action !== "discard") return;
    }
    for (const id of [...tabIds]) closeTab(id);
  }, [group?.tabIds, closeTab, tabs]);

  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const renameInputRef = useRef<HTMLInputElement>(null);
  const cancelRenameRef = useRef(false);

  const startRename = useCallback((tabId: string) => {
    const tab = tabs[tabId];
    if (!tab) return;
    setRenamingId(tabId);
    setRenameValue(tab.meta.title);
    cancelRenameRef.current = false;
    requestAnimationFrame(() => {
      const el = renameInputRef.current;
      if (el) {
        el.focus();
        el.select();
      }
    });
  }, [tabs]);

  const commitRename = useCallback((tabId: string) => {
    if (cancelRenameRef.current) {
      cancelRenameRef.current = false;
      setRenamingId(null);
      return;
    }
    const tab = tabs[tabId];
    const val = renameValue.trim();
    if (tab && val && val !== tab.meta.title) {
      renameTab(tabId, val);
    }
    setRenamingId(null);
  }, [renameValue, renameTab, tabs]);

  const cancelRename = useCallback(() => {
    cancelRenameRef.current = true;
    setRenamingId(null);
  }, []);

  const handleRenameKeyDown = useCallback((e: React.KeyboardEvent, tabId: string) => {
    if (e.key === "Enter") {
      e.preventDefault();
      commitRename(tabId);
    } else if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      cancelRename();
    }
  }, [commitRename, cancelRename]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "F2") return;
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) return;
      if (renamingId) return;
      const state = useEditorStore.getState();
      const activeTabId = state.groups[state.activeGroupId]?.activeTabId;
      if (activeTabId && state.tabs[activeTabId]) {
        e.preventDefault();
        startRename(activeTabId);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [renamingId, startRename]);

  const activeTitle = group?.activeTabId && tabs[group.activeTabId] ? tabs[group.activeTabId].meta.title : null;
  useEffect(() => {
    if (activeTitle) document.title = `${activeTitle} — LinkDit Pad`;
  }, [activeTitle]);

  if (!group) return null;

  const tabIds = group.tabIds;

  return (
    <div className="relative flex h-10 shrink-0 items-end gap-1 border-b border-border/80 bg-card/40 px-2 pt-1.5">
      {canScrollLeft && (
        <button
          onClick={() => scrollBy(-1)}
          className="absolute bottom-0 left-0 z-10 h-[34px] w-6 flex items-center justify-center bg-gradient-to-r from-card/90 to-transparent text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft size={14} />
        </button>
      )}
      <div
        ref={scrollRef}
        className="flex h-full flex-1 items-end gap-1 overflow-x-auto scrollbar-none"
      >
        <AnimatePresence initial={false}>
          {tabIds.map((tabId) => {
            const tab = tabs[tabId];
            if (!tab) return null;
            const isActive = group.activeTabId === tabId;

            return (
              <ContextMenu key={tabId}>
                <ContextMenuTrigger>
                  <motion.div
                    layout
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: "auto" }}
                    exit={{ opacity: 0, width: 0 }}
                    transition={{ duration: 0.15 }}
                    onClick={() => setActiveTab(activeGroupId, tabId)}
                    onDoubleClick={(e) => { e.stopPropagation(); startRename(tabId); }}
                    className={cn(
                      "group relative flex h-[34px] shrink-0 cursor-pointer items-center gap-1.5 rounded-t-lg px-2.5 text-sm select-none",
                      "transition-all duration-150 border border-b-0",
                      isActive
                        ? "border-border bg-background text-foreground shadow-inset-card"
                        : "border-transparent bg-muted/30 text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                    )}
                    style={{ minWidth: 108, maxWidth: 190 }}
                  >
                    {isActive && (
                      <span
                        className="absolute inset-x-0 top-0 h-[2px] rounded-t-lg bg-gradient-to-r from-primary via-accent to-accent2 shadow-glow-sm"
                        aria-hidden
                      />
                    )}
                    <FileText
                      size={13}
                      className={cn(
                        "shrink-0 transition-colors",
                        isActive ? "text-primary" : "text-muted-foreground/60"
                      )}
                    />
                    {renamingId === tabId ? (
                      <input
                        ref={renameInputRef}
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onBlur={() => commitRename(tabId)}
                        onKeyDown={(e) => handleRenameKeyDown(e, tabId)}
                        onClick={(e) => e.stopPropagation()}
                        onDoubleClick={(e) => e.stopPropagation()}
                        autoFocus
                        className="w-[120px] shrink-0 rounded border border-border bg-background px-1 py-0.5 text-xs text-foreground outline-none"
                      />
                    ) : (
                      <span className="truncate max-w-[100px]">{tab.meta.title}</span>
                    )}
                    {isTabLocked(tabId) && (
                      <Lock size={10} className="shrink-0 text-muted-foreground/70" aria-label="Document is locked" />
                    )}
                    {tab.meta.isDirty && (
                      <span
                        className={cn(
                          "h-1.5 w-1.5 shrink-0 rounded-full",
                          isActive ? "bg-primary shadow-glow-sm" : "bg-warning"
                        )}
                      />
                    )}
                    <button
                      aria-label={`Close ${tab.meta.title}`}
                      onClick={(e) => handleClose(e, tabId)}
                      className={cn(
                        "ml-auto shrink-0 rounded-md p-0.5 text-muted-foreground/50 transition-colors",
                        "hover:bg-danger/15 hover:text-danger",
                        isActive ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                      )}
                    >
                      <X size={11} />
                    </button>
                  </motion.div>
                </ContextMenuTrigger>
                <ContextMenuContent>
                  <ContextMenuItem onClick={() => closeTab(tabId)}>Close</ContextMenuItem>
                  <ContextMenuItem onClick={() => handleCloseOthers(tabId)}>Close Others</ContextMenuItem>
                  <ContextMenuItem onClick={handleCloseAll}>Close All</ContextMenuItem>
                  <ContextMenuSeparator />
                  <ContextMenuItem onClick={() => { const tab = tabs[tabId]; if (tab) moveTabToTrash(tab); }}>
                    <Trash2 size={14} /> Move to Trash
                  </ContextMenuItem>
                  <ContextMenuSeparator />
                  <ContextMenuItem onClick={() => startRename(tabId)}>Rename</ContextMenuItem>
                  <ContextMenuItem onClick={() => handleDuplicate(tabId)}>Duplicate</ContextMenuItem>
                </ContextMenuContent>
              </ContextMenu>
            );
          })}
        </AnimatePresence>
      </div>
      {canScrollRight && (
        <button
          onClick={() => scrollBy(1)}
          className="absolute bottom-0 right-10 z-10 h-[34px] w-6 flex items-center justify-center bg-gradient-to-l from-card/90 to-transparent text-muted-foreground hover:text-foreground"
        >
          <ChevronRight size={14} />
        </button>
      )}
      <Button
        variant="ghost"
        size="icon"
        aria-label="New tab"
        onClick={() => openTab()}
        className="mb-0.5 h-[30px] w-8 shrink-0 self-center rounded-lg text-muted-foreground transition-colors hover:bg-primary/15 hover:text-primary"
      >
        <Plus size={15} />
      </Button>
    </div>
  );
}