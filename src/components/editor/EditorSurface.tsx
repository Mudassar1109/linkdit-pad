import { useCallback, useEffect, useMemo, useRef } from "react";
import { FileEdit, Lock, Unlock } from "lucide-react";
import { cn } from "@/lib/utils";
import { useActiveTab, useEditorStore } from "@/store/useEditorStore";
import { useLockStore } from "@/store/useLockStore";
import { RichTextEditor } from "./RichTextEditor";
import { PlainTextEditor } from "./PlainTextEditor";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import type { EditorTab, EditorPane } from "@/types/editor";

function isRichEditorFor(tab: EditorTab): boolean {
  return (
    (tab.mode !== "plain" && tab.mode !== "code") ||
    /<[a-z][\s\S]*>/i.test(tab.content)
  );
}

function EditorPaneView({
  tab,
  pane,
  locked,
  registerInBridge,
  onSetPane,
  onSwitchTab,
  tabsList,
  activePane,
}: {
  tab: EditorTab;
  pane: EditorPane;
  locked: boolean;
  registerInBridge: boolean;
  onSetPane: (pane: EditorPane) => void;
  onSwitchTab: (tabId: string) => void;
  tabsList: { id: string; title: string }[];
  activePane: EditorPane;
}) {
  // Each pane binds to its OWN content buffer while split is active. Without
  // this, two panes showing the same document would both bind to the shared
  // tab content and mirror every keystroke into each other.
  const paneContent = useEditorStore((s) => {
    if (s.splitMode === "none") return tab.content;
    return s.splitPaneContent[pane]?.[tab.meta.id] ?? tab.content;
  });

  const onChange = useCallback(
    (value: string) => useEditorStore.getState().updatePaneContent(pane, tab.meta.id, value),
    [pane, tab.meta.id]
  );

  // When both panes display the same document, snapshot the current tab
  // content into THIS pane's private buffer so the panes diverge independently
  // instead of sharing (and mirroring) one editor state.
  useEffect(() => {
    const s = useEditorStore.getState();
    if (s.splitMode === "none") return;
    const primaryTabId = s.groups[s.activeGroupId]?.activeTabId ?? null;
    const secondaryTabId = s.secondaryTabId ?? null;
    const myTabId = pane === "primary" ? primaryTabId : secondaryTabId;
    const otherTabId = pane === "primary" ? secondaryTabId : primaryTabId;
    if (!myTabId || myTabId !== tab.meta.id) return;
    if (otherTabId && otherTabId === myTabId && s.splitPaneContent[pane]?.[tab.meta.id] == null) {
      s.seedPaneContent(pane, tab.meta.id);
    }
  }, [pane, tab.meta.id]);

  const isRich = isRichEditorFor(tab);

  return (
    <div
      className="relative flex h-full min-h-0 min-w-0 flex-col"
      onMouseDown={() => onSetPane(pane)}
      data-pane={pane}
      role="group"
      aria-label={`${pane === "primary" ? "Primary" : "Secondary"} pane - ${tab.meta.title}`}
    >
      <div className="flex h-8 shrink-0 items-center gap-1 border-b border-border bg-card/40 px-2">
        <select
          value={tab.meta.id}
          onChange={(e) => onSwitchTab(e.target.value)}
          aria-label={`${pane === "primary" ? "Primary" : "Secondary"} pane document`}
          title="Switch document in this pane"
          className="h-6 min-w-0 flex-1 truncate rounded border border-input bg-background px-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        >
          {tabsList.map((t) => (
            <option key={t.id} value={t.id}>
              {t.title}
            </option>
          ))}
        </select>
        {locked ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <span
                className="flex h-5 w-5 items-center justify-center text-muted-foreground"
                aria-label="Document is locked"
              >
                <Lock size={12} />
              </span>
            </TooltipTrigger>
            <TooltipContent side="bottom">Document is locked</TooltipContent>
          </Tooltip>
        ) : (
          <Tooltip>
            <TooltipTrigger asChild>
              <span
                className={cn(
                  "flex h-5 w-5 items-center justify-center rounded text-muted-foreground/60",
                  activePane === pane ? "text-primary" : "text-muted-foreground/40"
                )}
                aria-label={activePane === pane ? "Pane is active" : "Pane is inactive"}
              >
                <Unlock size={12} />
              </span>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              {activePane === pane ? "Active pane (editing target)" : "Click to make this pane active"}
            </TooltipContent>
          </Tooltip>
        )}
      </div>

      <div className="relative flex-1 min-h-0">
        {isRich ? (
          <RichTextEditor
            content={paneContent}
            direction={tab.meta.direction}
            onChange={onChange}
            fileId={tab.meta.id}
            editable={!locked}
            registerInBridge={registerInBridge}
            key={tab.meta.id}
          />
        ) : (
          <PlainTextEditor
            content={paneContent}
            direction={tab.meta.direction}
            onChange={onChange}
            fileId={tab.meta.id}
            editable={!locked}
          />
        )}
        {locked && (
          <div className="pointer-events-none absolute inset-0 z-10 flex items-start justify-center bg-background/30 pt-10">
            <div className="flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-xs text-muted-foreground shadow-md">
              <Lock size={12} className="text-muted-foreground" />
              This document is password-protected. Use File toolbar &mdash; Document &rarr; Unlock Document to edit.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function EditorSurface() {
  const activeTab = useActiveTab();
  const tabs = useEditorStore((s) => s.tabs);
  const splitMode = useEditorStore((s) => s.splitMode);
  const secondaryTabId = useEditorStore((s) => s.secondaryTabId);
  const activePane = useEditorStore((s) => s.activePane);
  const splitRatio = useEditorStore((s) => s.splitRatio);
  const setActivePane = useEditorStore((s) => s.setActivePane);
  const setSecondaryTab = useEditorStore((s) => s.setSecondaryTab);
  const closeSplit = useEditorStore((s) => s.closeSplit);
  const setActiveTab = useEditorStore((s) => s.setActiveTab);
  const openTab = useEditorStore((s) => s.openTab);
  const lockLocks = useLockStore((s) => s.locks);
  const unlockedIds = useLockStore((s) => s.unlockedIds);

  const activeGroupId = useEditorStore((s) => s.activeGroupId);
  const dragRef = useRef<{ dir: "right" | "down"; start: number; ratio: number } | null>(null);

  const isTabLocked = useCallback(
    (tabId: string) => (lockLocks[tabId] ? !unlockedIds.includes(tabId) : false),
    [lockLocks, unlockedIds]
  );

  const secondaryTab = splitMode !== "none" && secondaryTabId ? tabs[secondaryTabId] : undefined;

  useEffect(() => {
    if (splitMode !== "none" && (!secondaryTabId || !tabs[secondaryTabId])) {
      closeSplit();
    }
  }, [splitMode, secondaryTabId, tabs, closeSplit]);

  const tabsList = useMemo(
    () => Object.values(tabs).map((t) => ({ id: t.meta.id, title: t.meta.title })),
    [tabs]
  );

  const startDrag = (e: React.MouseEvent, dir: "right" | "down") => {
    e.preventDefault();
    dragRef.current = { dir, start: dir === "right" ? e.clientX : e.clientY, ratio: splitRatio };
    const move = (ev: MouseEvent) => {
      const d = dragRef.current;
      if (!d) return;
      const delta = (d.dir === "right" ? ev.clientX : ev.clientY) - d.start;
      const host = e.currentTarget.parentElement as HTMLElement;
      const total = d.dir === "right" ? host.clientWidth : host.clientHeight;
      if (total <= 0) return;
      const next = d.ratio + delta / total;
      useEditorStore.getState().setSplitRatio(next);
    };
    const up = () => {
      dragRef.current = null;
      document.removeEventListener("mousemove", move);
      document.removeEventListener("mouseup", up);
    };
    document.addEventListener("mousemove", move);
    document.addEventListener("mouseup", up);
  };

  if (!activeTab) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 text-muted-foreground">
        <FileEdit size={40} strokeWidth={1.5} />
        <p className="text-sm">No document open</p>
        <Button size="sm" onClick={() => openTab()}>
          New document
        </Button>
      </div>
    );
  }

  if (splitMode === "none" || !secondaryTab) {
    return (
      <div className="flex-1 min-h-0">
        <EditorPaneView
          tab={activeTab}
          pane="primary"
          locked={isTabLocked(activeTab.meta.id)}
          registerInBridge={true}
          onSetPane={setActivePane}
          onSwitchTab={(tabId) => setActiveTab(activeGroupId, tabId)}
          tabsList={tabsList}
          activePane="primary"
        />
      </div>
    );
  }

  const isVertical = splitMode === "right";

  return (
    <div className={cn("flex flex-1 min-h-0 min-w-0", isVertical ? "flex-row" : "flex-col")}>
      <div
        className="flex min-h-0 min-w-0 flex-col"
        style={isVertical ? { flexBasis: `${splitRatio * 100}%`, flexGrow: 0, flexShrink: 1 } : { height: `${splitRatio * 100}%` }}
      >
        <EditorPaneView
          tab={activeTab}
          pane="primary"
          locked={isTabLocked(activeTab.meta.id)}
          registerInBridge={activePane === "primary"}
          onSetPane={setActivePane}
          onSwitchTab={(tabId) => setActiveTab(activeGroupId, tabId)}
          tabsList={tabsList}
          activePane={activePane}
        />
      </div>
      <div
        role="separator"
        aria-orientation={isVertical ? "vertical" : "horizontal"}
        aria-label="Drag to resize panes"
        title="Drag to resize panes"
        onMouseDown={(e) => startDrag(e, isVertical ? "right" : "down")}
        className={cn(
          "z-10 shrink-0 bg-border transition-colors hover:bg-primary/50",
          isVertical ? "h-full w-1 cursor-col-resize" : "h-1 w-full cursor-row-resize"
        )}
      />
      <div
        className="flex min-h-0 min-w-0 flex-col"
        style={isVertical ? { flexGrow: 1, flexShrink: 1, flexBasis: 0 } : { flexGrow: 1, flexShrink: 1, flexBasis: 0 }}
      >
        <EditorPaneView
          tab={secondaryTab}
          pane="secondary"
          locked={isTabLocked(secondaryTab.meta.id)}
          registerInBridge={activePane === "secondary"}
          onSetPane={setActivePane}
          onSwitchTab={(tabId) => setSecondaryTab(tabId)}
          tabsList={tabsList}
          activePane={activePane}
        />
      </div>
    </div>
  );
}