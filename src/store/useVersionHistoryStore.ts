import { create } from "zustand";
import { generateId } from "@/lib/utils";
import type { EditorTab } from "@/types/editor";
import { useEditorStore } from "@/store/useEditorStore";

export interface VersionEntry {
  id: string;
  tabId: string;
  title: string;
  content: string;
  mode: string;
  createdAt: string;
  charCount: number;
  source: "auto" | "manual" | "pre-restore";
}

const STORAGE_KEY = "linkdit-pad-version-history";
const MAX_VERSIONS_PER_TAB = 25;
const MIN_CHANGE_CHARS = 8;

const lastCaptured: Record<string, { content: string; charCount: number }> = {};

function load(): Record<string, VersionEntry[]> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        const result: Record<string, VersionEntry[]> = {};
        for (const k of Object.keys(parsed)) {
          if (Array.isArray(parsed[k])) result[k] = parsed[k];
        }
        return result;
      }
    }
  } catch {}
  return {};
}

function persist(map: Record<string, VersionEntry[]>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {}
}

interface VersionHistoryState {
  versions: Record<string, VersionEntry[]>;
  isOpen: boolean;
  open: () => void;
  close: () => void;
  capture: (tabId: string, tab: EditorTab) => void;
  forceCapture: (tabId: string, tab: EditorTab) => void;
  restoreVersion: (tabId: string, versionId: string) => boolean;
  deleteVersion: (tabId: string, versionId: string) => void;
  clearTabVersions: (tabId: string) => void;
}

export const useVersionHistoryStore = create<VersionHistoryState>((set, get) => ({
  versions: load(),
  isOpen: false,
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),

  capture: (tabId, tab) => {
    const content = tab.content ?? "";
    const charCount = content.length;
    if (charCount === 0) return;
    const prev = lastCaptured[tabId];
    if (prev && prev.content === content) return;
    if (prev && Math.abs(charCount - prev.charCount) < MIN_CHANGE_CHARS) return;
    lastCaptured[tabId] = { content, charCount };

    const entry: VersionEntry = {
      id: generateId(),
      tabId,
      title: tab.meta.title,
      content,
      mode: tab.mode,
      createdAt: new Date().toISOString(),
      charCount,
      source: "auto",
    };
    set((s) => {
      const list = [entry, ...(s.versions[tabId] ?? [])].slice(0, MAX_VERSIONS_PER_TAB);
      const next = { ...s.versions, [tabId]: list };
      persist(next);
      return { versions: next };
    });
  },

  forceCapture: (tabId, tab) => {
    const content = tab.content ?? "";
    const charCount = content.length;
    const entry: VersionEntry = {
      id: generateId(),
      tabId,
      title: tab.meta.title,
      content,
      mode: tab.mode,
      createdAt: new Date().toISOString(),
      charCount,
      source: "auto",
    };
    lastCaptured[tabId] = { content, charCount };
    set((s) => {
      const list = [entry, ...(s.versions[tabId] ?? [])].slice(0, MAX_VERSIONS_PER_TAB);
      const next = { ...s.versions, [tabId]: list };
      persist(next);
      return { versions: next };
    });
  },

  restoreVersion: (tabId, versionId) => {
    const list = get().versions[tabId] ?? [];
    const v = list.find((e) => e.id === versionId);
    const tab = useEditorStore.getState().tabs[tabId];
    if (!v || !tab) return false;

    const current: VersionEntry = {
      id: generateId(),
      tabId,
      title: tab.meta.title,
      content: tab.content,
      mode: tab.mode,
      createdAt: new Date().toISOString(),
      charCount: tab.content.length,
      source: "pre-restore",
    };
    set((s) => {
      const list2 = [current, ...(s.versions[tabId] ?? [])].slice(0, MAX_VERSIONS_PER_TAB);
      const next = { ...s.versions, [tabId]: list2 };
      persist(next);
      return { versions: next };
    });
    lastCaptured[tabId] = { content: v.content, charCount: v.charCount };

    useEditorStore.getState().updateContent(tabId, v.content);
    return true;
  },

  deleteVersion: (tabId, versionId) => {
    set((s) => {
      const list = s.versions[tabId] ?? [];
      const nextList = list.filter((e) => e.id !== versionId);
      const next = { ...s.versions, [tabId]: nextList };
      persist(next);
      return { versions: next };
    });
  },

  clearTabVersions: (tabId) => {
    set((s) => {
      const next = { ...s.versions };
      delete next[tabId];
      persist(next);
      return { versions: next };
    });
  },
}));

export function flushVersionCapture(): void {
  const { tabs } = useEditorStore.getState();
  const store = useVersionHistoryStore.getState();
  for (const id of Object.keys(tabs)) {
    const prev = lastCaptured[id];
    if (!prev || prev.content !== tabs[id].content) {
      store.capture(id, tabs[id]);
    }
  }
}