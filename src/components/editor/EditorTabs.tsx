import { useCallback, useRef, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Plus, FileText, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useEditorStore } from "@/store/useEditorStore";
import {
  ContextMenu, ContextMenuTrigger, ContextMenuContent,
  ContextMenuItem, ContextMenuSeparator
} from "@/components/ui/context-menu";

export function EditorTabs() {
  const { tabs, groups, activeGroupId, setActiveTab, closeTab, openTab } = useEditorStore();
  const group = groups[activeGroupId];
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

  const handleClose = useCallback((e: React.MouseEvent, tabId: string) => {
    e.stopPropagation();
    const tab = tabs[tabId];
    if (tab?.meta.isDirty && !window.confirm(`"${tab.meta.title}" has unsaved changes. Close anyway?`)) return;
    closeTab(tabId);
  }, [closeTab, tabs]);

  const handleDuplicate = useCallback((tabId: string) => {
    const tab = tabs[tabId];
    if (tab) openTab({ content: tab.content, mode: tab.mode });
  }, [tabs, openTab]);

  const handleCloseOthers = useCallback((tabId: string) => {
    const tabIds = group?.tabIds || [];
    const hasDirty = tabIds.some((id) => id !== tabId && tabs[id]?.meta.isDirty);
    if (hasDirty && !window.confirm("Close other tabs with unsaved changes?")) return;
    for (const id of tabIds) {
      if (id !== tabId) closeTab(id);
    }
  }, [group?.tabIds, closeTab, tabs]);

  const handleCloseAll = useCallback(() => {
    const tabIds = group?.tabIds || [];
    const hasDirty = tabIds.some((id) => tabs[id]?.meta.isDirty);
    if (hasDirty && !window.confirm("Close all tabs with unsaved changes?")) return;
    for (const id of [...tabIds]) closeTab(id);
  }, [group?.tabIds, closeTab, tabs]);

  if (!group) return null;

  const tabIds = group.tabIds;

  return (
    <div className="relative flex h-9 items-center border-b border-border bg-card/40 shrink-0">
      {canScrollLeft && (
        <button
          onClick={() => scrollBy(-1)}
          className="absolute left-0 z-10 h-full w-6 flex items-center justify-center bg-gradient-to-r from-card/90 to-transparent text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft size={14} />
        </button>
      )}
      <div
        ref={scrollRef}
        className="flex h-full flex-1 items-center overflow-x-auto scrollbar-none"
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
                    className={cn(
                      "group flex h-full shrink-0 cursor-pointer items-center gap-1.5 border-r border-border px-3 text-sm select-none",
                      "transition-colors duration-75",
                      isActive
                        ? "bg-background text-foreground border-b-2 border-b-primary"
                        : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                    )}
                    style={{ minWidth: 100, maxWidth: 180 }}
                  >
                    <FileText size={13} className="shrink-0 text-muted-foreground/60" />
                    <span className="truncate max-w-[100px]">{tab.meta.title}</span>
                    {tab.meta.isDirty && (
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                    )}
                    <button
                      aria-label={`Close ${tab.meta.title}`}
                      onClick={(e) => handleClose(e, tabId)}
                      className={cn(
                        "ml-auto shrink-0 rounded-sm p-0.5 text-muted-foreground/40 hover:text-foreground",
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
          className="absolute right-10 z-10 h-full w-6 flex items-center justify-center bg-gradient-to-l from-card/90 to-transparent text-muted-foreground hover:text-foreground"
        >
          <ChevronRight size={14} />
        </button>
      )}
      <Button
        variant="ghost"
        size="icon"
        aria-label="New tab"
        onClick={() => openTab()}
        className="h-full w-9 shrink-0 rounded-none text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        <Plus size={15} />
      </Button>
    </div>
  );
}
