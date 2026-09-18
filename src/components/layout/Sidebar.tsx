import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Clock, Pin, Bookmark, History, Search,
  Trash2, ChevronLeft, ChevronRight,
  FileText
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import { useSettingsStore } from "@/store/useSettingsStore";
import { RecentDocuments } from "@/components/documents/RecentDocuments";
import { BookmarksPanel } from "@/components/bookmarks/BookmarksPanel";
import { SearchPanel } from "@/components/search/SearchPanel";
import { TrashPanel } from "@/components/trash/TrashPanel";

interface SidebarNavItem {
  id: string;
  label: string;
  icon: React.ElementType;
}

const NAV_ITEMS: SidebarNavItem[] = [
  { id: "recent", label: "Recent", icon: Clock },
  { id: "pinned", label: "Pinned", icon: Pin },
  { id: "bookmarks", label: "Bookmarks", icon: Bookmark },
  { id: "history", label: "History", icon: History },
  { id: "search", label: "Search", icon: Search },
  { id: "trash", label: "Trash", icon: Trash2 },
];

export function Sidebar() {
  const [activeView, setActiveView] = useState("recent");
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [width, setWidth] = useState(useSettingsStore.getState().appearance.sidebarWidth);
  const isResizing = useRef(false);

  const startResize = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isResizing.current = true;
    const startX = e.clientX;
    const startWidth = width;

    const handleMouseMove = (ev: MouseEvent) => {
      if (!isResizing.current) return;
      const newWidth = Math.max(200, Math.min(400, startWidth + (ev.clientX - startX)));
      setWidth(newWidth);
      useSettingsStore.getState().setAppearance({ sidebarWidth: newWidth });
    };

    const handleMouseUp = () => {
      isResizing.current = false;
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  }, [width]);

  const renderActiveView = () => {
    switch (activeView) {
      case "recent":
      case "pinned":
      case "history":
        return <RecentDocuments view={activeView as "recent" | "pinned" | "history"} />;
      case "bookmarks":
        return <BookmarksPanel />;
      case "search":
        return <SearchPanel />;
      case "trash":
        return <TrashPanel />;
      default:
        return (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-4 text-center">
            <div className="rounded-full bg-muted p-3 mb-3">
              {(() => {
                const item = NAV_ITEMS.find((n) => n.id === activeView);
                const Icon = item?.icon || FileText;
                return <Icon size={24} />;
              })()}
            </div>
            <p className="text-sm font-medium">No content yet</p>
            <p className="text-xs mt-1">This view is coming soon</p>
          </div>
        );
    }
  };

  return (
    <AnimatePresence>
      {!isCollapsed ? (
        <motion.aside
          initial={{ width, opacity: 1 }}
          exit={{ width: 0, opacity: 0, overflow: "hidden" }}
          animate={{ width }}
          transition={{ duration: 0.2, ease: "easeInOut" }}
          className="flex h-full border-r border-border bg-card/40"
        >
          <div className="flex w-10 flex-col items-center gap-0.5 border-r border-border py-2 bg-muted/20 shrink-0">
            {NAV_ITEMS.map((item) => (
              <Tooltip key={item.id}>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setActiveView(item.id)}
                    data-active={activeView === item.id}
                    className={cn(
                      "h-7 w-7 transition-colors",
                      activeView === item.id
                        ? "bg-muted text-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <item.icon size={14} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">{item.label}</TooltipContent>
              </Tooltip>
            ))}
            <div className="mt-auto flex flex-col items-center gap-0.5">
              <Separator className="mb-1 w-5" />
            </div>
          </div>

          <div className="flex flex-1 flex-col min-w-0">
            <div className="flex h-9 items-center justify-between px-3 border-b border-border shrink-0">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                {NAV_ITEMS.find((n) => n.id === activeView)?.label || "Documents"}
              </span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5"
                    onClick={() => setIsCollapsed(true)}
                  >
                    <ChevronLeft size={12} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">Collapse Sidebar</TooltipContent>
              </Tooltip>
            </div>
            <div className="flex-1 min-h-0">
              {renderActiveView()}
            </div>
          </div>

          <div
            className="w-[3px] cursor-col-resize bg-transparent hover:bg-primary/30 active:bg-primary/50 transition-colors shrink-0"
            onMouseDown={startResize}
          />
        </motion.aside>
      ) : (
        <motion.div
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 40, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ duration: 0.2, ease: "easeInOut" }}
          className="flex h-full flex-col items-center gap-0.5 border-r border-border py-2 bg-card/40 shrink-0"
        >
          {NAV_ITEMS.slice(0, 5).map((item) => (
            <Tooltip key={item.id}>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => { setActiveView(item.id); setIsCollapsed(false); }}
                  className="h-7 w-7 text-muted-foreground hover:text-foreground"
                >
                  <item.icon size={14} />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">{item.label}</TooltipContent>
            </Tooltip>
          ))}
          <div className="mt-auto">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-foreground"
                  onClick={() => setIsCollapsed(false)}
                >
                  <ChevronRight size={12} />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">Expand Sidebar</TooltipContent>
            </Tooltip>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
