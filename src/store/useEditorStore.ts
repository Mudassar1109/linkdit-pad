import { create } from "zustand";
import { generateId } from "@/lib/utils";
import type { EditorTab, TabGroup, EditorMode } from "@/types/editor";

interface EditorState {
  tabs: Record<string, EditorTab>;
  groups: Record<string, TabGroup>;
  activeGroupId: string;
  sidebarVisible: boolean;

  openTab: (partial?: Partial<EditorTab>) => string;
  closeTab: (tabId: string) => void;
  setActiveTab: (groupId: string, tabId: string) => void;
  updateContent: (tabId: string, content: string) => void;
  setMode: (tabId: string, mode: EditorMode) => void;
  renameTab: (tabId: string, title: string) => void;
  markSaved: (tabId: string, filePath: string | null) => void;
  toggleSidebar: () => void;
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

export const useEditorStore = create<EditorState>((set) => ({
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
      return {
        tabs: {
          ...state.tabs,
          [tabId]: {
            ...tab,
            content,
            meta: { ...tab.meta, isDirty: true, updatedAt: new Date().toISOString() },
          },
        },
      };
    });
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
}));

export function useActiveTab(): EditorTab | undefined {
  const { tabs, groups, activeGroupId } = useEditorStore();
  const activeTabId = groups[activeGroupId]?.activeTabId;
  return activeTabId ? tabs[activeTabId] : undefined;
}
