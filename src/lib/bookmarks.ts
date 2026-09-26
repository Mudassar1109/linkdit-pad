import { useBookmarksStore } from "@/store/useBookmarksStore";
import { useEditorStore } from "@/store/useEditorStore";
import { useEditorBridge } from "@/store/useEditorBridge";
import { useI18nStore } from "@/store/useI18nStore";
import { docPositionsForCharOffsets, plainLineCol } from "@/lib/bookmarkPositions";
import type { Bookmark } from "@/types/bookmarks";

const plainTargets = new Map<string, HTMLTextAreaElement>();

export function registerPlainTarget(fileId: string, el: HTMLTextAreaElement | null): void {
  if (el) plainTargets.set(fileId, el);
  else plainTargets.delete(fileId);
}

export function getPlainTarget(fileId: string): HTMLTextAreaElement | null {
  return plainTargets.get(fileId) ?? null;
}

/**
 * Adds a bookmark for the active document at the current cursor position.
 * For the rich editor the cursor is a ProseMirror position which we convert to
 * a character offset; for plain/code documents we use the textarea selection.
 */
export function addBookmarkAtCursor(name?: string): void {
  const store = useEditorStore.getState();
  const activeTabId = store.groups[store.activeGroupId]?.activeTabId;
  const tab = activeTabId ? store.tabs[activeTabId] : undefined;
  if (!tab) return;

  const bookmarkStore = useBookmarksStore.getState();
  const existing = bookmarkStore.bookmarks[tab.meta.id] ?? [];

  const editor = useEditorBridge.getState().editor;
  let position = 0;
  let lineNumber = 1;
  let charPosition = 0;
  let lineText = "";

  if (editor) {
    const from = editor.state.selection.from;
    const before = editor.state.doc.textBetween(0, from);
    position = before.length;
    lineNumber = (before.match(/\n/g) ?? []).length + 1;
    charPosition = position - before.lastIndexOf("\n") - 1;
    const after = editor.state.doc.textBetween(from, editor.state.doc.content.size);
    const nl = after.indexOf("\n");
    lineText = before.slice(before.lastIndexOf("\n") + 1) + (nl === -1 ? after : after.slice(0, nl));
  } else {
    const el = getPlainTarget(tab.meta.id);
    if (el) {
      position = el.selectionStart ?? 0;
      const before = el.value.slice(0, position);
      lineNumber = (before.match(/\n/g) ?? []).length + 1;
      charPosition = position - before.lastIndexOf("\n") - 1;
      const after = el.value.slice(position);
      const nl = after.indexOf("\n");
      lineText = before.slice(before.lastIndexOf("\n") + 1) + (nl === -1 ? after : after.slice(0, nl));
    }
  }

  const fallback =
    lineText.trim().slice(0, 40) ||
    useI18nStore.getState().t("panels.bookmarks.defaultName", { count: existing.length + 1 });
  bookmarkStore.addBookmark(tab.meta.id, position, lineNumber, charPosition, name?.trim() || fallback);
}

/** Moves the editor cursor to a bookmark and scrolls it into view. */
export function goToBookmark(bm: Bookmark): void {
  const store = useEditorStore.getState();
  const tab = store.tabs[bm.fileId];
  if (!tab) return;

  const group = store.groups[store.activeGroupId];
  if (group && group.activeTabId !== bm.fileId) {
    store.setActiveTab(store.activeGroupId, bm.fileId);
  }

  setTimeout(() => {
    const editor = useEditorBridge.getState().editor;
    if (editor) {
      const resolved = docPositionsForCharOffsets(editor.state.doc, [bm.position]);
      const pos = resolved.length > 0 ? resolved[0] : editor.state.doc.content.size;
      editor.chain().focus().setTextSelection(pos).scrollIntoView().run();
    } else {
      const el = getPlainTarget(bm.fileId);
      if (el) {
        const p = Math.max(0, Math.min(bm.position, el.value.length));
        el.setSelectionRange(p, p);
        el.focus();
      }
    }
    useBookmarksStore.getState().setActiveBookmark(bm.id);
  }, 0);
}

/** Highlights the bookmark whose line contains the given cursor offset (plain editor). */
export function updatePlainActive(fileId: string, text: string, cursorPos: number): void {
  const bookmarkStore = useBookmarksStore.getState();
  const list = bookmarkStore.bookmarks[fileId] ?? [];
  if (list.length === 0) {
    bookmarkStore.setActiveBookmark(null);
    return;
  }
  const { line } = plainLineCol(text, cursorPos);
  let best: string | null = null;
  let bestDist = Infinity;
  for (const b of list) {
    if (b.lineNumber === line) {
      const d = Math.abs(b.position - cursorPos);
      if (d < bestDist) {
        bestDist = d;
        best = b.id;
      }
    }
  }
  bookmarkStore.setActiveBookmark(best);
}