import { useCallback } from "react";
import { Clock, FileText, Pin, Trash2 } from "lucide-react";
import { useEditorStore } from "@/store/useEditorStore";
import type { EditorTab } from "@/types/editor";

export function RecentDocuments() {
  const tabs = useEditorStore((s) => s.tabs);
  const openTab = useEditorStore((s) => s.openTab);
  const setActiveTab = useEditorStore((s) => s.setActiveTab);
  const activeGroupId = useEditorStore((s) => s.activeGroupId);

  const recentDocs = Object.values(tabs)
    .sort((a, b) => new Date(b.meta.updatedAt).getTime() - new Date(a.meta.updatedAt).getTime())
    .slice(0, 20);

  const handleOpen = useCallback((tab: EditorTab) => {
    setActiveTab(activeGroupId, tab.meta.id);
  }, [activeGroupId, setActiveTab]);

  const handleNew = useCallback(() => {
    openTab();
  }, [openTab]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto py-2">
        {recentDocs.length === 0 ? (
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
                {recentDocs.length}
              </span>
            </div>
            {recentDocs.map((tab) => (
              <button
                key={tab.meta.id}
                onClick={() => handleOpen(tab)}
                className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm hover:bg-muted/60 transition-colors group"
              >
                <FileText size={14} className="shrink-0 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <div className="truncate text-foreground/90">
                    {tab.meta.title}
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                    <Clock size={10} />
                    <span className="truncate">
                      {formatRelativeTime(tab.meta.updatedAt)}
                    </span>
                  </div>
                </div>
                <div className="hidden group-hover:flex items-center gap-0.5 shrink-0">
                  <button
                    onClick={(e) => { e.stopPropagation(); }}
                    className="h-6 w-6 flex items-center justify-center rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                    title="Pin"
                  >
                    <Pin size={12} />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); }}
                    className="h-6 w-6 flex items-center justify-center rounded hover:bg-muted text-muted-foreground hover:text-danger"
                    title="Remove from recent"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </button>
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
