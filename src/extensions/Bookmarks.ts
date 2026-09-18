import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Node } from "@tiptap/pm/model";
import { useBookmarksStore, isEditorDrivenUpdate } from "@/store/useBookmarksStore";
import { computeDocCharInfo, docPositionsForCharOffsets, type DocCharInfo } from "@/lib/bookmarkPositions";
import type { Bookmark } from "@/types/bookmarks";

export const BOOKMARK_SYNC_META = "linkditPadBookmarkSync";

interface SyncPayload {
  charOffsets: Record<string, number>;
}

interface BookmarksPluginState {
  /** bookmarkId -> ProseMirror document position */
  positions: Record<string, number>;
}

const pluginKey = new PluginKey<BookmarksPluginState>("linkditBookmarks");

function charOffsetsToPositions(doc: Node, charOffsets: Record<string, number>): Record<string, number> {
  const ids = Object.keys(charOffsets);
  if (ids.length === 0) return {};
  const resolved = docPositionsForCharOffsets(doc, ids.map((id) => charOffsets[id]));
  const positions: Record<string, number> = {};
  ids.forEach((id, i) => {
    positions[id] = resolved[i];
  });
  return positions;
}

function computeActive(
  list: Bookmark[],
  targets: number[],
  infos: Map<number, DocCharInfo>,
  cursorInfo: DocCharInfo | null
): string | null {
  let best: string | null = null;
  let bestDist = Infinity;
  list.forEach((b, i) => {
    const info = infos.get(targets[i]);
    if (info && cursorInfo && info.line === cursorInfo.line) {
      const d = Math.abs(info.offset - cursorInfo.offset);
      if (d < bestDist) {
        bestDist = d;
        best = b.id;
      }
    }
  });
  return best;
}

/**
 * Keeps bookmark positions in sync inside the rich editor.
 *
 * - Every transaction maps the stored ProseMirror positions through the
 *   transaction mapping, so bookmarks automatically follow edits above them.
 * - `view.update` writes the derived character offsets / line numbers back into
 *   the zustand store (guarded, so that it never echoes back into the editor).
 * - Panel-driven store changes (add / remove / restore) are pushed into the
 *   editor through the `BOOKMARK_SYNC_META` transaction.
 */
export const Bookmarks = Extension.create({
  name: "linkditBookmarks",

  addOptions() {
    return { fileId: "" };
  },

  addStorage() {
    return { unsub: undefined as (() => void) | undefined };
  },

  onCreate() {
    const fileId = this.options.fileId;
    if (!fileId) return;
    const editor = this.editor;

    const refreshActive = () => {
      if (!editor || !editor.state) return;
      const list = useBookmarksStore.getState().bookmarks[fileId];
      if (!list || list.length === 0) {
        useBookmarksStore.getState().setActiveBookmark(null);
        return;
      }
      const state = pluginKey.getState(editor.state);
      const targets = list.map((b) => state?.positions[b.id] ?? editor.state.doc.content.size);
      const { infos, cursorInfo } = computeDocCharInfo(editor.state.doc, targets, editor.state.selection.from);
      useBookmarksStore.getState().setActiveBookmark(computeActive(list, targets, infos, cursorInfo));
    };

    const syncToEditor = () => {
      if (!editor || !editor.state) return;
      const list = useBookmarksStore.getState().bookmarks[fileId];
      const charOffsets: Record<string, number> = {};
      if (list) {
        for (const b of list) charOffsets[b.id] = b.position;
      }
      editor.view.dispatch(
        editor.state.tr.setMeta(BOOKMARK_SYNC_META, { charOffsets } satisfies SyncPayload)
      );
    };

    refreshActive();

    (this as unknown as { storage: { unsub?: (() => void) | undefined } }).storage.unsub =
      useBookmarksStore.subscribe((state, prev) => {
        if (isEditorDrivenUpdate()) return;
        const list = state.bookmarks[fileId];
        const prevList = prev?.bookmarks?.[fileId];
        if (list === prevList) return;
        const sig = (l?: Bookmark[]) => (l ?? []).map((b) => `${b.id}:${b.position}`).join("|");
        if (sig(list) === sig(prevList)) return;
        syncToEditor();
      });
  },

  onDestroy() {
    (this as unknown as { storage: { unsub?: (() => void) | undefined } }).storage.unsub?.();
  },

  addProseMirrorPlugins() {
    const fileId = this.options.fileId;

    return [
      new Plugin<BookmarksPluginState>({
        key: pluginKey,
        state: {
          init: (_, state) => {
            const list = useBookmarksStore.getState().bookmarks[fileId] ?? [];
            const charOffsets: Record<string, number> = {};
            for (const b of list) charOffsets[b.id] = b.position;
            return { positions: charOffsetsToPositions(state.doc, charOffsets) };
          },
          apply: (tr, value, _oldState, newState) => {
            const sync = tr.getMeta(BOOKMARK_SYNC_META) as SyncPayload | undefined;
            if (sync) {
              return { positions: charOffsetsToPositions(newState.doc, sync.charOffsets) };
            }
            if (!tr.docChanged || !value) return value;
            const positions: Record<string, number> = {};
            for (const [id, p] of Object.entries(value.positions)) {
              const res = tr.mapping.mapResult(p);
              positions[id] = res.deleted ? Math.min(p, res.pos) : res.pos;
            }
            return { positions };
          },
        },
        view: (_view) => ({
          update: (v, prevState) => {
            const docChanged = prevState.doc !== v.state.doc;
            const selectionChanged = !prevState.selection.eq(v.state.selection);
            if (!docChanged && !selectionChanged) return;

            const list = useBookmarksStore.getState().bookmarks[fileId] ?? [];
            if (list.length === 0) return;

            const state = pluginKey.getState(v.state) as BookmarksPluginState | undefined;
            const targets = list.map((b) => state?.positions[b.id] ?? v.state.doc.content.size);
            const { infos, cursorInfo } = computeDocCharInfo(v.state.doc, targets, v.state.selection.from);

            if (docChanged) {
              const updates = list.map((b, i) => {
                const info = infos.get(targets[i]);
                return {
                  id: b.id,
                  position: info ? info.offset : b.position,
                  lineNumber: info ? info.line : b.lineNumber,
                  charPosition: info ? info.col : b.charPosition,
                };
              });
              useBookmarksStore.getState().updatePositionsFromEditor(fileId, updates);
            }

            if (selectionChanged) {
              useBookmarksStore
                .getState()
                .setActiveBookmark(computeActive(list, targets, infos, cursorInfo));
            }
          },
        }),
      }),
    ];
  },
});