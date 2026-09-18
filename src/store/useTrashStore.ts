import { create } from "zustand";
import type { TrashEntry } from "@/types/trash";

const STORAGE_KEY = "linkdit-pad-trash";

function load(): TrashEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.filter(
          (e) =>
            e && typeof e === "object" && typeof e.id === "string" && typeof e.title === "string"
        );
      }
    }
  } catch {}
  return [];
}

function persist(entries: TrashEntry[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {}
}

interface TrashState {
  entries: TrashEntry[];
  add: (entry: TrashEntry) => void;
  remove: (ids: string[]) => void;
  clear: () => void;
}

export const useTrashStore = create<TrashState>((set) => ({
  entries: load(),

  add: (entry) =>
    set((s) => {
      const next = [entry, ...s.entries.filter((e) => e.id !== entry.id)];
      persist(next);
      return { entries: next };
    }),

  remove: (ids) =>
    set((s) => {
      const idSet = new Set(ids);
      const next = s.entries.filter((e) => !idSet.has(e.id));
      persist(next);
      return { entries: next };
    }),

  clear: () => {
    persist([]);
    set({ entries: [] });
  },
}));