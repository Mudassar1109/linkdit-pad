import { useState, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Home, Clock, Bookmark, Search, Trash2,
  Command, Settings, Info, ChevronLeft, ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import { useSettingsStore } from "@/store/useSettingsStore";
import { useCommandPaletteStore } from "@/store/useCommandPaletteStore";
import { useAboutStore } from "@/store/useAboutStore";
import { useI18n } from "@/store/useI18nStore";
import { RecentDocuments } from "@/components/documents/RecentDocuments";
import { BookmarksPanel } from "@/components/bookmarks/BookmarksPanel";
import { SearchPanel } from "@/components/search/SearchPanel";
import { TrashPanel } from "@/components/trash/TrashPanel";

interface SidebarNavItem {
  id: string;
  labelKey: string;
  icon: React.ElementType;
  view?: string;
  action?: () => void;
  tooltipKey?: string;
}

const DOC_NAV: SidebarNavItem[] = [
  { id: "home", labelKey: "sidebar.home", icon: Home, view: "recent" },
  { id: "recent", labelKey: "sidebar.recent", icon: Clock, view: "history" },
  { id: "bookmarks", labelKey: "sidebar.bookmarks", icon: Bookmark, view: "bookmarks" },
  { id: "search", labelKey: "sidebar.search", icon: Search, view: "search" },
  { id: "trash", labelKey: "sidebar.trash", icon: Trash2, view: "trash" },
];

const SYS_NAV: SidebarNavItem[] = [
  {
    id: "tools",
    labelKey: "sidebar.tools",
    icon: Command,
    action: () => useCommandPaletteStore.getState().toggle(),
    tooltipKey: "sidebar.commandPaletteTooltip",
  },
  {
    id: "settings",
    labelKey: "sidebar.settings",
    icon: Settings,
    action: () => useSettingsStore.getState().toggle(),
  },
  {
    id: "about",
    labelKey: "sidebar.about",
    icon: Info,
    action: () => useAboutStore.getState().open(),
  },
];

const MIN_WIDTH = 430;
const MAX_WIDTH = 640;
const LEFT_NAV_WIDTH = 176; // w-44
const RAIL_WIDTH = 48; // w-12

function NavItemButton({
  item,
  isActive,
  onSelect,
  collapsed,
}: {
  item: SidebarNavItem;
  isActive: boolean;
  onSelect: () => void;
  collapsed: boolean;
}) {
  const Icon = item.icon;
  const { t } = useI18n();
  const label = t(item.labelKey);
  const tooltip = item.tooltipKey ? t(item.tooltipKey) : label;
  if (collapsed) {
    return (
      <Tooltip key={item.id}>
        <TooltipTrigger asChild>
          <button
            aria-label={label}
            onClick={onSelect}
            data-active={isActive}
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-lg transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              isActive
                ? "bg-primary/15 text-primary shadow-glow-sm"
                : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
            )}
          >
            <Icon size={16} />
          </button>
        </TooltipTrigger>
        <TooltipContent side="right">{tooltip}</TooltipContent>
      </Tooltip>
    );
  }
  return (
    <Tooltip key={item.id}>
      <TooltipTrigger asChild>
        <button
          onClick={onSelect}
          data-active={isActive}
          aria-current={isActive ? "page" : undefined}
          className={cn(
            "group flex w-full items-center gap-2.5 rounded-lg px-2.5 py-[7px] text-[13px] font-medium",
            "transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            "text-left",
            isActive
              ? "bg-gradient-to-r from-primary/15 to-primary/5 text-primary shadow-glow-sm ring-1 ring-inset ring-primary/20"
              : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
          )}
        >
          <Icon
            size={16}
            className={cn(
              "shrink-0 transition-colors duration-150",
              isActive ? "text-primary" : "text-muted-foreground/70 group-hover:text-foreground"
            )}
          />
          <span className="truncate">{label}</span>
          {isActive && (
            <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary shadow-glow-sm" aria-hidden />
          )}
        </button>
      </TooltipTrigger>
      <TooltipContent side="right">{tooltip}</TooltipContent>
    </Tooltip>
  );
}

export function Sidebar() {
  const { t } = useI18n();
  const [activeView, setActiveView] = useState("recent");
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);
  const [width, setWidth] = useState(
    Math.max(MIN_WIDTH, useSettingsStore.getState().appearance.sidebarWidth)
  );
  const isResizing = useRef(false);

  const startResize = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isResizing.current = true;
    const startX = e.clientX;
    const startWidth = width;

    const handleMouseMove = (ev: MouseEvent) => {
      if (!isResizing.current) return;
      const newWidth = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, startWidth + (ev.clientX - startX)));
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

  const handleSelect = useCallback(
    (item: SidebarNavItem) => {
      if (item.action) {
        item.action();
        return;
      }
      if (item.view) setActiveView(item.view);
    },
    []
  );

  const navRender = (collapsed: boolean) => (
    <div className={cn("flex flex-col", collapsed ? "items-center gap-1 py-2" : "gap-0.5 p-2")}>
      {DOC_NAV.map((item) => (
        <NavItemButton
          key={item.id}
          item={item}
          collapsed={collapsed}
          isActive={item.view === activeView}
          onSelect={() => handleSelect(item)}
        />
      ))}
      <Separator className={cn("my-1.5", collapsed ? "w-6" : "w-full")} />
      {SYS_NAV.map((item) => (
        <NavItemButton
          key={item.id}
          item={item}
          collapsed={collapsed}
          isActive={false}
          onSelect={() => handleSelect(item)}
        />
      ))}
    </div>
  );

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
        return null;
    }
  };

  const activeLabel = DOC_NAV.find((n) => n.view === activeView)?.labelKey
    ? t(DOC_NAV.find((n) => n.view === activeView)?.labelKey ?? "sidebar.documents")
    : t("sidebar.documents");

  const asideWidth = rightCollapsed
    ? (leftCollapsed ? RAIL_WIDTH : LEFT_NAV_WIDTH) + RAIL_WIDTH
    : width;

  return (
    <motion.aside
      initial={{ width: asideWidth, opacity: 1 }}
      animate={{ width: asideWidth }}
      transition={{ duration: 0.2, ease: "easeInOut" }}
      className="flex h-full min-h-0 shrink-0 overflow-hidden border-r border-border bg-sidebar"
    >
      {!leftCollapsed ? (
        <nav className="flex w-44 shrink-0 flex-col overflow-y-auto border-r border-border bg-sidebar">
          <div className="flex h-10 shrink-0 items-center justify-between border-b border-border px-2.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {t("sidebar.navigation")}
            </span>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={t("sidebar.collapseLeft")}
                  className="h-6 w-6"
                  onClick={() => setLeftCollapsed(true)}
                >
                  <ChevronLeft size={13} />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">{t("sidebar.collapseLeftTooltip")}</TooltipContent>
            </Tooltip>
          </div>
          {navRender(false)}
        </nav>
      ) : (
        <nav className="flex w-12 shrink-0 flex-col items-center gap-0.5 overflow-y-auto border-r border-border bg-sidebar py-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                aria-label={t("sidebar.expandLeft")}
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                onClick={() => setLeftCollapsed(false)}
              >
                <ChevronRight size={14} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">{t("sidebar.expandLeftTooltip")}</TooltipContent>
          </Tooltip>
          {navRender(true)}
        </nav>
      )}

      {rightCollapsed ? (
        <div className="flex w-12 shrink-0 flex-col items-center gap-2 border-r border-border bg-sidebar py-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                aria-label={t("sidebar.expandPanel")}
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                onClick={() => setRightCollapsed(false)}
              >
                <ChevronRight size={14} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">{t("sidebar.expandPanelTooltip")}</TooltipContent>
          </Tooltip>
        </div>
      ) : (
        <div className="flex flex-1 flex-col min-w-0 min-h-0 overflow-hidden">
          <div className="flex h-10 shrink-0 items-center justify-between border-b border-border px-3">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {activeLabel}
            </span>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={t("sidebar.collapsePanel")}
                  className="h-6 w-6"
                  onClick={() => setRightCollapsed(true)}
                >
                  <ChevronLeft size={13} />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">{t("sidebar.collapsePanelTooltip")}</TooltipContent>
            </Tooltip>
          </div>
          <div className="flex-1 min-h-0">{renderActiveView()}</div>
        </div>
      )}

      <div
        className="w-[3px] cursor-col-resize bg-transparent hover:bg-primary/40 active:bg-primary/60 transition-colors shrink-0"
        onMouseDown={startResize}
      />
    </motion.aside>
  );
}