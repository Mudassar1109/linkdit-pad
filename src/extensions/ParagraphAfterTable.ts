import { Extension } from "@tiptap/core";
import { Node as PMNode } from "@tiptap/pm/model";
import { Plugin, PluginKey } from "@tiptap/pm/state";

const key = new PluginKey<any>("paragraphAfterTable");

function endsWithTable(doc: PMNode): boolean {
  return doc.childCount > 0 && doc.lastChild!.type.name === "table";
}

/**
 * Ensures a real top-level paragraph always exists immediately after a table
 * that is the last block of the document.
 *
 * Tiptap's `insertTable` replaces the selection (the last paragraph) with the
 * table node, so a freshly inserted table at the end of a document leaves the
 * ProseMirror document as `[table]` — there is no following block to click or
 * to receive the ArrowDown escape. prosemirror-tables then resolves ArrowDown
 * from the last cell back inside the cell, and clicking below the table hits an
 * empty contenteditable area. This plugin creates that missing paragraph as a
 * real document node (not a CSS shim), which restores:
 *   - click-below-the-table editing,
 *   - ArrowDown escape from the last row into the paragraph below,
 *   - a stable place for normal text after the table.
 *
 * The paragraph is appended for any transaction that leaves a table as the last
 * node (insertion, paste, load). Table-in-the-middle of a document already has
 * a following block, so nothing changes there. Enter inside a cell is left
 * untouched.
 */
export const ParagraphAfterTable = Extension.create({
  name: "paragraphAfterTable",

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key,
        appendTransaction(_transactions, _oldState, newState) {
          if (!endsWithTable(newState.doc)) return null;
          const tr = newState.tr.insert(newState.doc.content.size, newState.schema.nodes.paragraph.create());
          tr.setMeta("addToHistory", false);
          tr.setMeta(key, true);
          return tr;
        },
      }),
    ];
  },
});