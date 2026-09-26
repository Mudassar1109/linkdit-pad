import { useTrashStore } from "@/store/useTrashStore";
import { useBookmarksStore } from "@/store/useBookmarksStore";
import { useEditorStore } from "@/store/useEditorStore";
import { useRecentFilesStore } from "@/store/useRecentFilesStore";
import { useToastStore } from "@/store/useToastStore";
import { useI18nStore } from "@/store/useI18nStore";
import type { TrashEntry } from "@/types/trash";
import type { EditorTab } from "@/types/editor";

/**
 * Moves a document to Trash. Everything needed to fully restore the document
 * later (all metadata, mode, content and bookmarks) is snapshotted into the
 * trash store before the tab is closed and removed from the recent list.
 */
export function moveTabToTrash(tab: EditorTab): void {
  const store = useEditorStore.getState();
  const bookmarkStore = useBookmarksStore.getState();

  const entry: TrashEntry = {
    id: tab.meta.id,
    title: tab.meta.title,
    filePath: tab.meta.filePath,
    language: tab.meta.language,
    direction: tab.meta.direction,
    createdAt: tab.meta.createdAt,
    updatedAt: tab.meta.updatedAt,
    deletedAt: new Date().toISOString(),
    isPinned: tab.meta.isPinned,
    isBookmarked: tab.meta.isBookmarked,
    mode: tab.mode,
    content: tab.content,
    groupId: tab.groupId,
    bookmarks: bookmarkStore.bookmarks[tab.meta.id] ?? [],
  };

  useTrashStore.getState().add(entry);
  bookmarkStore.removeFileBookmarks(tab.meta.id);
  store.closeTab(tab.meta.id);
  useRecentFilesStore.getState().remove(tab.meta.id);
  useToastStore.getState().show("success", useI18nStore.getState().t("toast.deleted", { title: tab.meta.title }));
}

/**
 * Restores a document from the trash back into the editor, preserving the
 * original document id, file path, creation/update timestamps, pin/bookmark
 * flags, mode, content and bookmarks.
 */
export function restoreTrashEntry(entryId: string): void {
  const trashStore = useTrashStore.getState();
  const entry = trashStore.entries.find((e) => e.id === entryId);
  if (!entry) return;

  trashStore.remove([entryId]);

  const now = new Date().toISOString();
  const tabId = useEditorStore.getState().openTab({
    meta: {
      id: entry.id,
      title: entry.title,
      filePath: entry.filePath,
      language: entry.language ?? null,
      direction: entry.direction,
      createdAt: entry.createdAt,
      updatedAt: now,
      isPinned: entry.isPinned,
      isBookmarked: entry.isBookmarked,
      isDirty: false,
    },
    mode: entry.mode,
    content: entry.content,
    groupId: entry.groupId || undefined,
  });

  if (entry.bookmarks.length > 0) {
    useBookmarksStore.getState().restoreFileBookmarks(tabId, entry.bookmarks);
  }

  useRecentFilesStore.getState().addOrUpdate({
    id: tabId,
    path: entry.filePath,
    title: entry.title,
    isPinned: entry.isPinned,
    isBookmarked: entry.isBookmarked,
  });

  useToastStore.getState().show("success", useI18nStore.getState().t("toast.restored", { title: entry.title }));
}

/** Removes a file from disk if it exists (best-effort, Tauri-only). */
async function removeFileIfExists(filePath: string): Promise<void> {
  try {
    const { remove, exists } = await import("@tauri-apps/plugin-fs");
    if (await exists(filePath)) {
      await remove(filePath);
    }
  } catch {}
}

/** Permanently deletes trash entries from disk and the trash store. */
export async function purgeTrashEntries(entries: TrashEntry[]): Promise<void> {
  const titles = entries.map((e) => e.title);
  useTrashStore.getState().remove(entries.map((e) => e.id));
  await Promise.all(
    entries
      .filter((e) => e.filePath)
      .map((e) => removeFileIfExists(e.filePath as string))
  );
  if (titles.length > 0) {
    useToastStore.getState().show("success", useI18nStore.getState().t("toast.trashed", { count: titles.length }));
  }
}

/** Empties the trash, permanently deleting every discarded document. */
export async function emptyTrash(): Promise<void> {
  const { entries } = useTrashStore.getState();
  if (entries.length === 0) return;
  useTrashStore.getState().clear();
  await Promise.all(
    entries
      .filter((e) => e.filePath)
      .map((e) => removeFileIfExists(e.filePath as string))
  );
  useToastStore.getState().show("success", useI18nStore.getState().t("toast.trashEmptied"));
}