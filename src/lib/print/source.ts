/**
 * Print source collection (source.ts).
 *
 * Captures the CURRENT in-memory state of the focused document so printing
 * never requires a save. Ordering intentionally mirrors the shared save
 * pipeline (src/lib/saveDocument.ts): the focused split-pane buffer is
 * promoted to its tab first, then the focused tab is resolved, then rich
 * content is read from the live Tiptap editor. Selection is captured as real
 * ProseMirror HTML (not plain text) so "Print selection" output looks like the
 * selection looks.
 */
import { DOMSerializer } from "@tiptap/pm/model";
import { getFocusedPaneTabId, useEditorStore } from "@/store/useEditorStore";
import { useEditorBridge } from "@/store/useEditorBridge";
import type { PrintSource } from "./render";

export interface CollectedPrintSource {
  source: PrintSource;
  tabId: string;
  title: string;
  direction: "ltr" | "rtl";
}

function serializeFragment(content: Parameters<DOMSerializer["serializeFragment"]>[0]): string {
  const serializer = DOMSerializer.fromSchema(useEditorBridge.getState().editor!.schema);
  const frag = serializer.serializeFragment(content);
  const wrap = document.createElement("div");
  wrap.appendChild(frag);
  return wrap.innerHTML;
}

/**
 * Resolves the current document to print. Returns null when no tab is focused
 * (nothing to print) — callers show a toast and bail.
 */
export function collectPrintSource(): CollectedPrintSource | null {
  const store = useEditorStore.getState();
  store.commitFocusedPaneToTab();

  const tabId = getFocusedPaneTabId(store);
  if (!tabId) return null;
  const tab = store.tabs[tabId];
  if (!tab) return null;

  const editor = useEditorBridge.getState().editor;
  const mode = tab.mode === "plain" || tab.mode === "code" ? (tab.mode as "plain" | "code") : "rich";
  const content = mode === "rich" ? (editor?.getHTML() ?? tab.content) : tab.content;
  const isRich = mode === "rich" ? true : /<[a-z][\s\S]*>/i.test(content);

  const direction = tab.meta.direction === "rtl" ? "rtl" : "ltr";
  const title = tab.meta.title?.trim() || "Untitled";

  let selectionHtml: string | null = null;
  let hasSelection = false;
  if (mode === "rich" && editor) {
    const { from, to } = editor.state.selection;
    hasSelection = from !== to && !editor.state.selection.empty;
    if (hasSelection) {
      try {
        selectionHtml = serializeFragment(editor.state.doc.slice(from, to).content);
      } catch {
        selectionHtml = null;
        hasSelection = false;
      }
    }
  }

  const source: PrintSource = {
    mode: isRich ? "rich" : "plain",
    html: isRich ? content : null,
    text: isRich ? null : content,
    title,
    direction,
    hasSelection,
    selectionHtml,
  };

  return { source, tabId, title, direction };
}