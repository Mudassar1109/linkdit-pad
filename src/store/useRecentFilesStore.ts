import { create } from "zustand";
import type { RecentFileEntry } from "@/types/editor";

const STORAGE_KEY = "linkdit-pad-recent-files";
const MAX_RECENT = 50;

function load(): RecentFileEntry[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored) as RecentFileEntry[];
  } catch {}
  return [];
}

function persist(entries: RecentFileEntry[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {}
}

interface RecentFilesState {
  entries: RecentFileEntry[];
  addOrUpdate: (entry: Omit<RecentFileEntry, "lastOpenedAt">) => void;
  remove: (id: string) => void;
  rename: (id: string, title: string) => void;
  togglePin: (id: string) => void;
  toggleBookmark: (id: string) => void;
}

export const useRecentFilesStore = create<RecentFilesState>((set) => ({
  entries: load(),

  addOrUpdate: (entry) =>
    set((s) => {
      const now = new Date().toISOString();
      const filtered = s.entries.filter((e) => e.id !== entry.id);
      const next: RecentFileEntry[] = [
        { ...entry, lastOpenedAt: now },
        ...filtered,
      ].slice(0, MAX_RECENT);
      persist(next);
      return { entries: next };
    }),

  remove: (id) =>
    set((s) => {
      const next = s.entries.filter((e) => e.id !== id);
      persist(next);
      return { entries: next };
    }),

  rename: (id, title) =>
    set((s) => {
      const next = s.entries.map((e) => (e.id === id ? { ...e, title } : e));
      persist(next);
      return { entries: next };
    }),

  togglePin: (id) =>
    set((s) => {
      const next = s.entries.map((e) => (e.id === id ? { ...e, isPinned: !e.isPinned } : e));
      persist(next);
      return { entries: next };
    }),

  toggleBookmark: (id) =>
    set((s) => {
      const next = s.entries.map((e) => (e.id === id ? { ...e, isBookmarked: !e.isBookmarked } : e));
      persist(next);
      return { entries: next };
    }),
}));
