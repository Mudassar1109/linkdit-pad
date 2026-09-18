import { useCallback, useRef, useState } from "react";
import { Clock, FileText, Pin, Trash2, Bookmark, Pencil, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEditorStore } from "@/store/useEditorStore";
import { useRecentFilesStore } from "@/store/useRecentFilesStore";
import { moveTabToTrash } from "@/lib/trash";
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
} from "@/components/ui/context-menu";
import type { EditorTab } from "@/types/editor";

export type DocView = "recent" | "pinned" | "history";

interface RecentDocumentsProps {
  view?: DocView;
}

export function RecentDocuments({ view = "recent" }: RecentDocumentsProps) {
  const tabs = useEditorStore((s) => s.tabs);
  const openTab = useEditorStore((s) => s.openTab);
  const setActiveTab = useEditorStore((s) => s.setActiveTab);
  const closeTab = useEditorStore((s) => s.closeTab);
  const renameTab = useEditorStore((s) => s.renameTab);
  const togglePin = useEditorStore((s) => s.togglePin);
  const toggleBookmark = useEditorStore((s) => s.toggleBookmark);
  const activeGroupId = useEditorStore((s) => s.activeGroupId);
  const removeRecent = useRecentFilesStore((s) => s.remove);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const renameInputRef = useRef<HTMLInputElement>(null);
  const cancelRenameRef = useRef(false);

  const docs = Object.values(tabs)
    .filter((t) => {
      if (view === "pinned") return t.meta.isPinned;
      return true;
    })
    .sort((a, b) => {
      if (view === "recent" && a.meta.isPinned !== b.meta.isPinned) return a.meta.isPinned ? -1 : 1;
      return new Date(b.meta.updatedAt).getTime() - new Date(a.meta.updatedAt).getTime();
    })
    .slice(0, 50);

  const handleOpen = useCallback((tab: EditorTab) => {
    setActiveTab(activeGroupId, tab.meta.id);
  }, [activeGroupId, setActiveTab]);

  const handleNew = useCallback(() => {
    openTab();
  }, [openTab]);

  const handleMoveToTrash = useCallback((tab: EditorTab) => {
    moveTabToTrash(tab);
  }, []);

  const handleRenameStart = useCallback((id: string) => {
    const tab = tabs[id];
    if (!tab) return;
    setRenamingId(id);
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

  const handleRenameEnd = useCallback((id: string) => {
    if (cancelRenameRef.current) {
      cancelRenameRef.current = false;
      setRenamingId(null);
      return;
    }
    const tab = tabs[id];
    const val = renameValue.trim();
    if (tab && val && val !== tab.meta.title) {
      renameTab(id, val);
    }
    setRenamingId(null);
  }, [renameValue, renameTab, tabs]);

  const handleRenameCancel = useCallback(() => {
    cancelRenameRef.current = true;
    setRenamingId(null);
  }, []);

  const handleRenameKeyDown = useCallback((e: React.KeyboardEvent, id: string) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleRenameEnd(id);
    } else if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      handleRenameCancel();
    }
  }, [handleRenameEnd, handleRenameCancel]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto py-2">
        {docs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground px-4 text-center gap-3">
            <FileText size={32} strokeWidth={1.5} />
            <p className="text-sm">No recent documents</p>
            <button
              onClick={handleNew}
              className="text-xs text-primary hover:underline"
            >
              Create a new document
            </button>
          </div>
        ) : (
          <div className="space-y-0.5 px-2">
            <div className="flex items-center justify-between px-2 py-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Recent
              </span>
              <span className="text-[10px] text-muted-foreground">
                {docs.length}
              </span>
            </div>
            {docs.map((tab) => (
              <ContextMenu key={tab.meta.id}>
                <ContextMenuTrigger asChild>
                  <button
                    onClick={() => handleOpen(tab)}
                    className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm hover:bg-muted/60 transition-colors group"
                  >
                    <FileText size={14} className="shrink-0 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      {renamingId === tab.meta.id ? (
                        <input
                          ref={renameInputRef}
                          value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value)}
                          onBlur={() => handleRenameEnd(tab.meta.id)}
                          onKeyDown={(e) => handleRenameKeyDown(e, tab.meta.id)}
                          onClick={(e) => e.stopPropagation()}
                          onDoubleClick={(e) => e.stopPropagation()}
                          className="w-full rounded border border-border bg-background px-1 py-0.5 text-sm text-foreground outline-none"
                          autoFocus
                        />
                      ) : (
                        <div
                          className="truncate text-foreground/90"
                          onDoubleClick={(e) => { e.stopPropagation(); handleRenameStart(tab.meta.id); }}
                        >
                          {tab.meta.isBookmarked && (
                            <Bookmark size={10} className="inline mr-1 text-primary fill-primary" />
                          )}
                          {tab.meta.title}
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                        <Clock size={10} />
                        <span className="truncate">
                          {tab.meta.isPinned ? "Pinned" : formatRelativeTime(tab.meta.updatedAt)}
                        </span>
                      </div>
                    </div>
                    <div className="hidden group-hover:flex items-center gap-0.5 shrink-0">
                      <button
                        onClick={(e) => { e.stopPropagation(); togglePin(tab.meta.id); }}
                        className={cn(
                          "h-6 w-6 flex items-center justify-center rounded hover:bg-muted",
                          tab.meta.isPinned ? "text-primary" : "text-muted-foreground hover:text-foreground"
                        )}
                        title={tab.meta.isPinned ? "Unpin" : "Pin"}
                      >
                        <Pin size={12} />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); closeTab(tab.meta.id); removeRecent(tab.meta.id); }}
                        className="h-6 w-6 flex items-center justify-center rounded hover:bg-muted text-muted-foreground hover:text-danger"
                        title="Remove from Recent"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  </button>
                </ContextMenuTrigger>
                <ContextMenuContent>
                  <ContextMenuItem onClick={() => handleOpen(tab)}>
                    <FileText size={14} /> Open
                  </ContextMenuItem>
                  <ContextMenuItem onClick={() => handleRenameStart(tab.meta.id)}>
                    <Pencil size={14} /> Rename
                  </ContextMenuItem>
                  <ContextMenuSeparator />
                  <ContextMenuItem onClick={() => { togglePin(tab.meta.id); }}>
                    <Pin size={14} /> {tab.meta.isPinned ? "Unpin" : "Pin"}
                  </ContextMenuItem>
                  <ContextMenuItem onClick={() => { toggleBookmark(tab.meta.id); }}>
                    <Bookmark size={14} /> {tab.meta.isBookmarked ? "Remove Bookmark" : "Bookmark"}
                  </ContextMenuItem>
                  <ContextMenuSeparator />
                  <ContextMenuItem onClick={() => { handleMoveToTrash(tab); }}>
                    <Trash2 size={14} /> Move to Trash
                  </ContextMenuItem>
                </ContextMenuContent>
              </ContextMenu>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function formatRelativeTime(dateStr: string): string {
  const now = Date.now();
  const date = new Date(dateStr).getTime();
  const diff = now - date;

  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}
