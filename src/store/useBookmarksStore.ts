import { create } from "zustand";
import { generateId } from "@/lib/utils";
import { useI18nStore } from "@/store/useI18nStore";
import type { Bookmark } from "@/types/bookmarks";
import { adjustPlainBookmarks, plainLineCols } from "@/lib/bookmarkPositions";

const STORAGE_KEY = "linkdit-pad-bookmarks";

/**
 * Set while the editor itself pushes position updates into the store
 * (rich editor sync / plain textarea diff). Subscribers use this to avoid
 * echoing updates back into the editor.
 */
let editorDrivenUpdate = false;

export function isEditorDrivenUpdate(): boolean {
  return editorDrivenUpdate;
}

function load(): Record<string, Bookmark[]> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        const out: Record<string, Bookmark[]> = {};
        for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
          if (Array.isArray(value)) {
            out[key] = (value as Bookmark[]).filter(
              (b) => b && typeof b === "object" && typeof b.id === "string" && typeof b.name === "string"
            );
          }
        }
        return out;
      }
    }
  } catch {}
  return {};
}

function persist(bookmarks: Record<string, Bookmark[]>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bookmarks));
  } catch {}
}

export interface BookmarkPositionUpdate {
  id: string;
  position: number;
  lineNumber: number;
  charPosition: number;
}

interface BookmarksState {
  bookmarks: Record<string, Bookmark[]>;
  activeBookmarkId: string | null;
  addBookmark: (fileId: string, position: number, lineNumber: number, charPosition: number, name?: string) => void;
  renameBookmark: (fileId: string, id: string, name: string) => void;
  removeBookmark: (fileId: string, id: string) => void;
  moveBookmark: (fileId: string, fromId: string, toId: string) => void;
  updatePositionsFromEditor: (fileId: string, updates: BookmarkPositionUpdate[]) => void;
  adjustForPlainEdit: (fileId: string, oldText: string, newText: string) => void;
  setActiveBookmark: (id: string | null) => void;
  pruneMissing: (validFileIds: Set<string>) => void;
  removeFileBookmarks: (fileId: string) => void;
  restoreFileBookmarks: (fileId: string, bookmarks: Bookmark[]) => void;
}

export const useBookmarksStore = create<BookmarksState>((set, get) => ({
  bookmarks: load(),
  activeBookmarkId: null,

  addBookmark: (fileId, position, lineNumber, charPosition, name) => {
    const s = get();
    const list = s.bookmarks[fileId] ?? [];
    const bookmark: Bookmark = {
      id: generateId(),
      name: name?.trim() || useI18nStore.getState().t("panels.bookmarks.defaultName", { count: list.length + 1 }),
      fileId,
      position,
      lineNumber,
      charPosition,
      createdAt: new Date().toISOString(),
    };
    const next = { ...s.bookmarks, [fileId]: [...list, bookmark] };
    persist(next);
    set({ bookmarks: next, activeBookmarkId: bookmark.id });
  },

  renameBookmark: (fileId, id, name) => {
    const s = get();
    const list = s.bookmarks[fileId];
    if (!list) return;
    const trimmed = name.trim();
    if (!trimmed) return;
    const nextList = list.map((b) => (b.id === id ? { ...b, name: trimmed } : b));
    const next = { ...s.bookmarks, [fileId]: nextList };
    persist(next);
    set({ bookmarks: next });
  },

  removeBookmark: (fileId, id) => {
    const s = get();
    const list = s.bookmarks[fileId];
    if (!list) return;
    const nextList = list.filter((b) => b.id !== id);
    const next = { ...s.bookmarks, [fileId]: nextList };
    persist(next);
    set({
      bookmarks: next,
      activeBookmarkId: s.activeBookmarkId === id ? null : s.activeBookmarkId,
    });
  },

  moveBookmark: (fileId, fromId, toId) => {
    const s = get();
    const list = s.bookmarks[fileId];
    if (!list) return;
    const fromIdx = list.findIndex((b) => b.id === fromId);
    const toIdx = list.findIndex((b) => b.id === toId);
    if (fromIdx < 0 || toIdx < 0 || fromIdx === toIdx) return;
    const nextList = [...list];
    const [moved] = nextList.splice(fromIdx, 1);
    nextList.splice(toIdx, 0, moved);
    const next = { ...s.bookmarks, [fileId]: nextList };
    persist(next);
    set({ bookmarks: next });
  },

  updatePositionsFromEditor: (fileId, updates) => {
    const s = get();
    const list = s.bookmarks[fileId];
    if (!list || updates.length === 0) return;
    const byId = new Map(updates.map((u) => [u.id, u]));
    let changed = false;
    const nextList = list.map((b) => {
      const u = byId.get(b.id);
      if (!u) return b;
      if (u.position === b.position && u.lineNumber === b.lineNumber && u.charPosition === b.charPosition) return b;
      changed = true;
      return { ...b, position: u.position, lineNumber: u.lineNumber, charPosition: u.charPosition };
    });
    if (!changed) return;
    const next = { ...s.bookmarks, [fileId]: nextList };
    editorDrivenUpdate = true;
    try {
      persist(next);
      set({ bookmarks: next });
    } finally {
      editorDrivenUpdate = false;
    }
  },

  adjustForPlainEdit: (fileId, oldText, newText) => {
    if (oldText === newText) return;
    const s = get();
    const list = s.bookmarks[fileId];
    if (!list || list.length === 0) return;
    const adjusted = adjustPlainBookmarks(list, oldText, newText);
    let changed = false;
    for (let i = 0; i < list.length; i++) {
      if (adjusted[i].position !== list[i].position) {
        changed = true;
        break;
      }
    }
    if (!changed) return;
    const cols = plainLineCols(newText, adjusted.map((b) => b.position));
    const nextList = adjusted.map((b) => {
      const c = cols.get(b.position);
      return c
        ? { ...b, lineNumber: c.line, charPosition: c.charPosition }
        : { ...b, lineNumber: 1, charPosition: 0 };
    });
    const next = { ...s.bookmarks, [fileId]: nextList };
    editorDrivenUpdate = true;
    try {
      persist(next);
      set({ bookmarks: next });
    } finally {
      editorDrivenUpdate = false;
    }
  },

  setActiveBookmark: (id) => {
    const s = get();
    if (s.activeBookmarkId === id) return;
    set({ activeBookmarkId: id });
  },

  pruneMissing: (validFileIds) => {
    if (validFileIds.size === 0) return;
    const s = get();
    let changed = false;
    const next: Record<string, Bookmark[]> = {};
    for (const [fileId, list] of Object.entries(s.bookmarks)) {
      if (validFileIds.has(fileId)) next[fileId] = list;
      else changed = true;
    }
    if (!changed) return;
    const stillActive = s.activeBookmarkId
      ? Object.values(next).some((list) => list.some((b) => b.id === s.activeBookmarkId))
      : false;
    persist(next);
    set({ bookmarks: next, activeBookmarkId: stillActive ? s.activeBookmarkId : null });
  },

  removeFileBookmarks: (fileId) => {
    const s = get();
    if (!s.bookmarks[fileId]) return;
    const { [fileId]: _removed, ...next } = s.bookmarks;
    persist(next);
    set({
      bookmarks: next,
      activeBookmarkId: s.activeBookmarkId && (next[fileId] ?? []).some((b) => b.id === s.activeBookmarkId) ? s.activeBookmarkId : null,
    });
  },

  restoreFileBookmarks: (fileId, bookmarks) => {
    const s = get();
    const existing = s.bookmarks[fileId] ?? [];
    const existingIds = new Set(existing.map((b) => b.id));
    const merged = [...existing, ...bookmarks.filter((b) => !existingIds.has(b.id))];
    const next = { ...s.bookmarks, [fileId]: merged };
    persist(next);
    set({ bookmarks: next });
  },
}));