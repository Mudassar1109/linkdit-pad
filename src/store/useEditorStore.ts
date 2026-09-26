import { create } from "zustand";
import { generateId } from "@/lib/utils";
import type { EditorTab, TabGroup, EditorMode, SplitState, EditorPane } from "@/types/editor";
import { useRecentFilesStore } from "@/store/useRecentFilesStore";

export interface PersistedState extends Partial<SplitState> {
  tabs: Record<string, EditorTab>;
  groups: Record<string, TabGroup>;
  activeGroupId: string;
  sidebarVisible: boolean;
}

interface EditorState extends PersistedState {
  splitRatio: number;
  splitMode: SplitState["splitMode"];
  secondaryTabId: SplitState["secondaryTabId"];
  activePane: SplitState["activePane"];
  /** Per-pane, per-document independent edit buffers used while split is active.
      Each pane's editor reads and writes its own buffer so typing in one pane
      can never mutate the other pane's editor (or shared tab) state. */
  splitPaneContent: {
    primary: Record<string, string>;
    secondary: Record<string, string>;
  };
  openTab: (partial?: Partial<EditorTab>) => string;
  closeTab: (tabId: string) => void;
  setActiveTab: (groupId: string, tabId: string) => void;
  updateContent: (tabId: string, content: string) => void;
  updatePaneContent: (pane: EditorPane, tabId: string, content: string) => void;
  seedPaneContent: (pane: EditorPane, tabId: string) => void;
  promotePaneContent: (pane: EditorPane, tabId: string) => void;
  commitFocusedPaneToTab: () => void;
  setMode: (tabId: string, mode: EditorMode) => void;
  renameTab: (tabId: string, title: string) => void;
  togglePin: (tabId: string) => void;
  toggleBookmark: (tabId: string) => void;
  markSaved: (tabId: string, filePath: string | null) => void;
  toggleSidebar: () => void;
  restoreSession: (state: PersistedState) => void;
  splitEditor: (direction: "right" | "down") => void;
  setSecondaryTab: (tabId: string) => void;
  closeSplit: () => void;
  setActivePane: (pane: EditorPane) => void;
  setSplitRatio: (ratio: number) => void;
}

const DEFAULT_GROUP_ID = "group-main";

function createEmptyTab(overrides?: Partial<EditorTab>): EditorTab {
  const id = generateId();
  const now = new Date().toISOString();
  return {
    meta: {
      id,
      title: "Untitled",
      filePath: null,
      language: null,
      direction: "ltr",
      createdAt: now,
      updatedAt: now,
      isPinned: false,
      isBookmarked: false,
      isDirty: false,
    },
    mode: "rich",
    content: "",
    scrollPosition: 0,
    cursorPosition: 0,
    groupId: DEFAULT_GROUP_ID,
    ...overrides,
  };
}

export const useEditorStore = create<EditorState>((set, get) => ({
  tabs: {},
  groups: {
    [DEFAULT_GROUP_ID]: {
      id: DEFAULT_GROUP_ID,
      tabIds: [],
      activeTabId: null,
      splitDirection: null,
    },
  },
  activeGroupId: DEFAULT_GROUP_ID,
  sidebarVisible: true,
  splitMode: "none",
  secondaryTabId: null,
  activePane: "primary",
  splitRatio: 0.5,
  splitPaneContent: { primary: {}, secondary: {} },

  openTab: (partial) => {
    const tab = createEmptyTab(partial);
    set((state) => {
      const group = state.groups[tab.groupId] ?? state.groups[DEFAULT_GROUP_ID];
      return {
        tabs: { ...state.tabs, [tab.meta.id]: tab },
        groups: {
          ...state.groups,
          [group.id]: {
            ...group,
            tabIds: [...group.tabIds, tab.meta.id],
            activeTabId: tab.meta.id,
          },
        },
      };
    });
    return tab.meta.id;
  },

  closeTab: (tabId) => {
    set((state) => {
      const { [tabId]: _removed, ...rest } = state.tabs;
      const groups = { ...state.groups };
      for (const key of Object.keys(groups)) {
        const g = groups[key];
        if (g.tabIds.includes(tabId)) {
          const tabIds = g.tabIds.filter((id) => id !== tabId);
          const activeTabId =
            g.activeTabId === tabId ? tabIds[tabIds.length - 1] ?? null : g.activeTabId;
          groups[key] = { ...g, tabIds, activeTabId };
        }
      }
      return { tabs: rest, groups };
    });
  },

  setActiveTab: (groupId, tabId) => {
    set((state) => ({
      groups: {
        ...state.groups,
        [groupId]: { ...state.groups[groupId], activeTabId: tabId },
      },
    }));
  },

  updateContent: (tabId, content) => {
    set((state) => {
      const tab = state.tabs[tabId];
      if (!tab) return state;
      // No-op writes (e.g. a pane buffer seeding/promoting identical content)
      // must not mark the document dirty or churn subscribers.
      if (tab.content === content) return state;
      // External content updates (loading/restoring) invalidate any per-pane
      // snapshot so open split editors re-bind to the authoritative content.
      const clearBuffer = (paneBuf: Record<string, string>): Record<string, string> => {
        if (!(tabId in paneBuf)) return paneBuf;
        const next = { ...paneBuf };
        delete next[tabId];
        return next;
      };
      return {
        tabs: {
          ...state.tabs,
          [tabId]: {
            ...tab,
            content,
            meta: { ...tab.meta, isDirty: true, updatedAt: new Date().toISOString() },
          },
        },
        splitPaneContent: {
          primary: clearBuffer(state.splitPaneContent.primary),
          secondary: clearBuffer(state.splitPaneContent.secondary),
        },
      };
    });
  },

  // While split mode is active, pane edits go ONLY into that pane's private
  // buffer so the other pane (which shares the same document) never sees them.
  updatePaneContent: (pane, tabId, content) => {
    const s = get();
    if (s.splitMode === "none") {
      s.updateContent(tabId, content);
      return;
    }
    set((state) => ({
      splitPaneContent: {
        ...state.splitPaneContent,
        [pane]: { ...state.splitPaneContent[pane], [tabId]: content },
      },
    }));
  },

  // Snapshot the tab's current content into a pane's buffer. Used when both
  // panes reference the same document so each gets an independent view.
  seedPaneContent: (pane, tabId) => {
    set((state) => {
      const tab = state.tabs[tabId];
      if (!tab) return state;
      const buf = state.splitPaneContent[pane];
      if (tabId in buf) return state;
      return {
        splitPaneContent: {
          ...state.splitPaneContent,
          [pane]: { ...buf, [tabId]: tab.content },
        },
      };
    });
  },

  // Write a pane's buffer back into the shared tab document (authoritative).
  promotePaneContent: (pane, tabId) => {
    const s = get();
    const html = s.splitPaneContent[pane]?.[tabId];
    if (html == null) return;
    s.updateContent(tabId, html);
  },

  // Commit the currently focused pane's edits to its tab so save/versioning/
  // backups/persistence pick up the latest split-mode content.
  commitFocusedPaneToTab: () => {
    const s = get();
    if (s.splitMode === "none") return;
    const tabId =
      s.activePane === "secondary"
        ? s.secondaryTabId
        : s.groups[s.activeGroupId]?.activeTabId;
    if (tabId) s.promotePaneContent(s.activePane, tabId);
  },

  setMode: (tabId, mode) => {
    set((state) => {
      const tab = state.tabs[tabId];
      if (!tab) return state;
      return { tabs: { ...state.tabs, [tabId]: { ...tab, mode } } };
    });
  },

  renameTab: (tabId, title) => {
    set((state) => {
      const tab = state.tabs[tabId];
      if (!tab) return state;
      return {
        tabs: { ...state.tabs, [tabId]: { ...tab, meta: { ...tab.meta, title } } },
      };
    });
    useRecentFilesStore.getState().rename(tabId, title);
  },

  togglePin: (tabId) => {
    set((state) => {
      const tab = state.tabs[tabId];
      if (!tab) return state;
      return {
        tabs: {
          ...state.tabs,
          [tabId]: { ...tab, meta: { ...tab.meta, isPinned: !tab.meta.isPinned } },
        },
      };
    });
    useRecentFilesStore.getState().togglePin(tabId);
  },

  toggleBookmark: (tabId) => {
    set((state) => {
      const tab = state.tabs[tabId];
      if (!tab) return state;
      return {
        tabs: {
          ...state.tabs,
          [tabId]: { ...tab, meta: { ...tab.meta, isBookmarked: !tab.meta.isBookmarked } },
        },
      };
    });
    useRecentFilesStore.getState().toggleBookmark(tabId);
  },

  markSaved: (tabId, filePath) => {
    set((state) => {
      const tab = state.tabs[tabId];
      if (!tab) return state;
      return {
        tabs: {
          ...state.tabs,
          [tabId]: {
            ...tab,
            meta: { ...tab.meta, filePath, isDirty: false, updatedAt: new Date().toISOString() },
          },
        },
      };
    });
  },

  toggleSidebar: () => set((s) => ({ sidebarVisible: !s.sidebarVisible })),

  splitEditor: (direction) =>
    set((state) => {
      const activeTabId = state.groups[state.activeGroupId]?.activeTabId;
      if (!activeTabId) return state;
      const group = state.groups[state.activeGroupId];
      const candidates = (group?.tabIds ?? []).filter((id) => id !== activeTabId);
      const secondary = candidates.length > 0 ? candidates[0] : activeTabId;
      return {
        splitMode: direction,
        secondaryTabId: secondary,
        activePane: "primary",
      };
    }),

  setSecondaryTab: (tabId) => set({ secondaryTabId: tabId }),

  closeSplit: () => {
    const s = get();
    const primaryTabId = s.groups[s.activeGroupId]?.activeTabId;
    if (primaryTabId) s.promotePaneContent("primary", primaryTabId);
    set({
      splitMode: "none",
      secondaryTabId: null,
      activePane: "primary",
      splitPaneContent: { primary: {}, secondary: {} },
    });
  },

  setActivePane: (pane) => {
    const s = get();
    if (s.splitMode !== "none") {
      const tabId =
        pane === "secondary" ? s.secondaryTabId : s.groups[s.activeGroupId]?.activeTabId;
      if (tabId) s.promotePaneContent(pane, tabId);
    }
    set({ activePane: pane });
  },

  setSplitRatio: (ratio) => set({ splitRatio: Math.min(0.8, Math.max(0.2, ratio)) }),

  restoreSession: (state) => {
    const clean = dedupeSession(state);
    set({
      tabs: clean.tabs,
      groups: clean.groups,
      activeGroupId: clean.activeGroupId,
      sidebarVisible: clean.sidebarVisible,
      splitMode: clean.splitMode ?? "none",
      secondaryTabId: clean.secondaryTabId ?? null,
      activePane: clean.activePane ?? "primary",
      splitPaneContent: { primary: {}, secondary: {} },
    });
  },
}));

export function useActiveTab(): EditorTab | undefined {
  const { tabs, groups, activeGroupId } = useEditorStore();
  const activeTabId = groups[activeGroupId]?.activeTabId;
  return activeTabId ? tabs[activeTabId] : undefined;
}

export function getFocusedPaneTabId(state: ReturnType<typeof useEditorStore.getState>): string | null {
  if (
    state.splitMode !== "none" &&
    state.activePane === "secondary" &&
    state.secondaryTabId &&
    state.tabs[state.secondaryTabId]
  ) {
    return state.secondaryTabId;
  }
  return state.groups[state.activeGroupId]?.activeTabId ?? null;
}

function isBlankStartupUntitled(tab: EditorTab): boolean {
  return (
    tab.meta.title === "Untitled" &&
    !tab.meta.filePath &&
    !tab.meta.isDirty &&
    !tab.meta.isPinned &&
    !tab.meta.isBookmarked &&
    (!tab.content || tab.content.trim() === "")
  );
}

export function dedupeSession(state: PersistedState): PersistedState {
  const tabs: Record<string, EditorTab> = {};
  const keep = new Set<string>();
  let keptBlank = false;

  for (const id of Object.keys(state.tabs)) {
    const tab = state.tabs[id];
    if (isBlankStartupUntitled(tab)) {
      if (keptBlank) continue;
      keptBlank = true;
    }
    keep.add(id);
    tabs[id] = tab;
  }

  const groups: Record<string, TabGroup> = {};
  for (const g of Object.values(state.groups)) {
    const tabIds = g.tabIds.filter((id) => keep.has(id));
    groups[g.id] = {
      ...g,
      tabIds,
      activeTabId:
        g.activeTabId && keep.has(g.activeTabId)
          ? g.activeTabId
          : (tabIds[tabIds.length - 1] ?? null),
    };
  }

  const activeGroupId =
    state.activeGroupId in groups ? state.activeGroupId : Object.keys(groups)[0] ?? "group-main";
  let secondaryTabId = state.secondaryTabId;
  if (secondaryTabId && !keep.has(secondaryTabId)) secondaryTabId = null;

  return {
    tabs,
    groups,
    activeGroupId,
    sidebarVisible: state.sidebarVisible,
    splitMode: state.splitMode,
    secondaryTabId,
    activePane: state.activePane,
  };
}

// DEV-ONLY test handle (removed before release): expose the real editor store
// for the CDP harness, since dynamic imports resolve a duplicate module instance.
if (import.meta.env?.DEV || (globalThis as unknown as { __LPD_TEST?: boolean }).__LPD_TEST) {
  (globalThis as unknown as { __estore?: unknown }).__estore = useEditorStore;
}
