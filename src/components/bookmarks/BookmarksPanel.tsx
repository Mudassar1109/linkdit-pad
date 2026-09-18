import { useEffect, useMemo, useRef, useState } from "react";
import {
  Bookmark as BookmarkIcon,
  BookmarkPlus,
  CornerDownRight,
  GripVertical,
  Pencil,
  Search,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useBookmarksStore } from "@/store/useBookmarksStore";
import { useActiveTab, useEditorStore } from "@/store/useEditorStore";
import { addBookmarkAtCursor, goToBookmark } from "@/lib/bookmarks";
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
} from "@/components/ui/context-menu";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import type { Bookmark } from "@/types/bookmarks";

interface GroupEntry {
  fileId: string;
  title: string;
  bookmarks: Bookmark[];
}

export function BookmarksPanel() {
  const tabs = useEditorStore((s) => s.tabs);
  const bookmarks = useBookmarksStore((s) => s.bookmarks);
  const activeBookmarkId = useBookmarksStore((s) => s.activeBookmarkId);
  const removeBookmark = useBookmarksStore((s) => s.removeBookmark);
  const renameBookmark = useBookmarksStore((s) => s.renameBookmark);
  const moveBookmark = useBookmarksStore((s) => s.moveBookmark);

  const activeTab = useActiveTab();

  const [query, setQuery] = useState("");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const draggingRef = useRef<string | null>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const ids = new Set(Object.keys(tabs));
    useBookmarksStore.getState().pruneMissing(ids);
  }, [tabs]);

  useEffect(() => {
    if (renamingId) {
      requestAnimationFrame(() => {
        renameInputRef.current?.focus();
        renameInputRef.current?.select();
      });
    }
  }, [renamingId]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const groups: GroupEntry[] = [];
    for (const [fileId, list] of Object.entries(bookmarks)) {
      const tab = tabs[fileId];
      if (!tab || list.length === 0) continue;
      const visible = q ? list.filter((b) => b.name.toLowerCase().includes(q)) : list;
      if (visible.length === 0) continue;
      groups.push({ fileId, title: tab.meta.title, bookmarks: visible });
    }
    groups.sort((a, b) => {
      if (activeTab && a.fileId === activeTab.meta.id) return -1;
      if (activeTab && b.fileId === activeTab.meta.id) return 1;
      return a.title.localeCompare(b.title);
    });
    return groups;
  }, [bookmarks, tabs, query, activeTab]);

  const hasAnyBookmarks = useMemo(
    () => Object.values(bookmarks).some((list) => list.length > 0),
    [bookmarks]
  );

  const commitRename = (fileId: string, id: string) => {
    const val = renameValue.trim();
    if (val) renameBookmark(fileId, id, val);
    setRenamingId(null);
  };

  const startRename = (bm: Bookmark) => {
    setRenamingId(bm.id);
    setRenameValue(bm.name);
  };

  const handleDragStart = (e: React.DragEvent, bm: Bookmark) => {
    setDraggingId(bm.id);
    draggingRef.current = bm.id;
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", bm.id);
  };

  const handleDrop = (e: React.DragEvent, fileId: string, bm: Bookmark) => {
    e.preventDefault();
    const fromId = draggingRef.current || e.dataTransfer.getData("text/plain");
    if (fromId && fromId !== bm.id) {
      const fromList = bookmarks[fileId] ?? [];
      if (fromList.some((b) => b.id === fromId)) moveBookmark(fileId, fromId, bm.id);
    }
    draggingRef.current = null;
    setDraggingId(null);
    setDragOverId(null);
  };

  const handleClick = (bm: Bookmark, e: React.MouseEvent) => {
    if (draggingRef.current) {
      e.stopPropagation();
      return;
    }
    goToBookmark(bm);
  };

  return (
    <div className="flex h-full flex-col min-h-0">
      <div className="flex items-center gap-1.5 border-b border-border px-3 py-2 shrink-0">
        <div className="relative flex-1">
          <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter bookmarks..."
            className="h-7 w-full rounded-md border border-input bg-background pl-7 pr-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => addBookmarkAtCursor()}
              disabled={!activeTab}
              className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-40 disabled:hover:bg-transparent"
              aria-label="Add bookmark at cursor"
            >
              <BookmarkPlus size={14} />
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom">Add bookmark at cursor (Ctrl+Shift+K)</TooltipContent>
        </Tooltip>
      </div>

      <div className="flex-1 overflow-y-auto py-2">
        {!hasAnyBookmarks ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 px-4 text-center text-muted-foreground">
            <BookmarkIcon size={32} strokeWidth={1.5} />
            <p className="text-sm">No bookmarks yet</p>
            <button
              onClick={() => addBookmarkAtCursor()}
              className="text-xs text-primary hover:underline"
            >
              Create First Bookmark
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 px-4 text-center text-muted-foreground">
            <Search size={24} strokeWidth={1.5} />
            <p className="text-sm">No matching bookmarks</p>
          </div>
        ) : (
          <div className="space-y-1 px-2">
            {filtered.map((group) => (
              <div key={group.fileId} className="space-y-0.5">
                <div className="flex items-center justify-between px-2 py-1">
                  <span className="truncate text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {group.title}
                  </span>
                  <span className="shrink-0 text-[10px] text-muted-foreground">
                    {group.bookmarks.length}
                  </span>
                </div>
                {group.bookmarks.map((bm) => {
                  const isActive = bm.id === activeBookmarkId;
                  const isDragging = draggingId === bm.id;
                  const isDragOver = dragOverId === bm.id;
                  return (
                    <ContextMenu key={bm.id}>
                      <ContextMenuTrigger asChild>
                        <div
                          draggable
                          onDragStart={(e) => handleDragStart(e, bm)}
                          onDragOver={(e) => {
                            if (draggingId && draggingId !== bm.id) {
                              e.preventDefault();
                              setDragOverId(bm.id);
                            }
                          }}
                          onDragLeave={() => setDragOverId((cur) => (cur === bm.id ? null : cur))}
                          onDrop={(e) => handleDrop(e, group.fileId, bm)}
                          onDragEnd={() => {
                            draggingRef.current = null;
                            setDraggingId(null);
                            setDragOverId(null);
                          }}
                          onClick={(e) => handleClick(bm, e)}
                          onDoubleClick={() => goToBookmark(bm)}
                          className={cn(
                            "group flex cursor-pointer select-none items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-sm transition-colors",
                            "hover:bg-muted/60",
                            isActive
                              ? "bg-primary/10 text-primary"
                              : "text-foreground/90",
                            isDragging && "opacity-40",
                            isDragOver && "bg-primary/10 ring-1 ring-inset ring-primary/30"
                          )}
                        >
                          <span className="shrink-0 text-muted-foreground/50 opacity-0 transition-opacity group-hover:opacity-100">
                            <GripVertical size={12} />
                          </span>
                          <BookmarkIcon
                            size={12}
                            className={cn(
                              "shrink-0",
                              isActive ? "fill-primary text-primary" : "text-muted-foreground group-hover:text-foreground"
                            )}
                          />
                          <div className="min-w-0 flex-1">
                            {renamingId === bm.id ? (
                              <input
                                ref={renameInputRef}
                                value={renameValue}
                                onChange={(e) => setRenameValue(e.target.value)}
                                onBlur={() => commitRename(group.fileId, bm.id)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    e.preventDefault();
                                    commitRename(group.fileId, bm.id);
                                  } else if (e.key === "Escape") {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setRenamingId(null);
                                  }
                                }}
                                onClick={(e) => e.stopPropagation()}
                                onDoubleClick={(e) => e.stopPropagation()}
                                className="w-full rounded border border-border bg-background px-1 py-0.5 text-sm text-foreground outline-none"
                                autoFocus
                              />
                            ) : (
                              <div className="truncate">{bm.name}</div>
                            )}
                            <div className="text-[10px] text-muted-foreground">
                              Ln {bm.lineNumber}, Col {Math.max(1, bm.charPosition + 1)}
                            </div>
                          </div>
                        </div>
                      </ContextMenuTrigger>
                      <ContextMenuContent>
                        <ContextMenuItem onClick={() => goToBookmark(bm)}>
                          <CornerDownRight size={14} /> Go To
                        </ContextMenuItem>
                        <ContextMenuItem onClick={() => startRename(bm)}>
                          <Pencil size={14} /> Rename
                        </ContextMenuItem>
                        <ContextMenuSeparator />
                        <ContextMenuItem
                          onClick={() => removeBookmark(group.fileId, bm.id)}
                          className="text-danger"
                        >
                          <Trash2 size={14} /> Delete
                        </ContextMenuItem>
                      </ContextMenuContent>
                    </ContextMenu>
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}