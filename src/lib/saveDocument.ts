import { getFocusedPaneTabId, useEditorStore } from "@/store/useEditorStore";
import { useEditorBridge } from "@/store/useEditorBridge";
import { getFormatFromPath, prepareContentForSave, type DocumentFormat } from "@/lib/fileFormats";

/**
 * Shared document-save pipeline used by BOTH the manual Save flow (File > Save,
 * Ctrl+S) and Auto Save. Keeping one implementation ensures auto-save produces
 * byte-for-byte the same output as a manual save (.ldp serialization and
 * metadata included), and that split-view commits the focused pane through the
 * exact same path as normal Save.
 */

export type SaveOutcome =
  | { status: "no-tab" }
  | { status: "not-dirty"; tabId: string }
  | { status: "no-path"; tabId: string; title: string }
  | { status: "saved"; tabId: string; title: string; path: string }
  | {
      status: "error";
      tabId: string;
      title: string;
      path: string;
      output: string;
      format: DocumentFormat;
      message: string;
      error: unknown;
    };

export interface SaveFocusedOptions {
  /** When true, skip saving if the focused tab has no unsaved changes. */
  requireDirty?: boolean;
}

/**
 * Serializes every write to disk so two saves (e.g. an in-flight auto-save and a
 * manual Ctrl+S) can never overlap on the same file.
 */
let writeQueue: Promise<unknown> = Promise.resolve();

function enqueue<T>(run: () => Promise<T>): Promise<T> {
  const next = writeQueue.then(run);
  writeQueue = next.catch(() => undefined);
  return next;
}

export async function saveFocusedDocument(options: SaveFocusedOptions = {}): Promise<SaveOutcome> {
  // Same first step as normal Save: while split view is active this promotes the
  // focused pane's private buffer into the shared tab document (and marks the tab
  // dirty when the content actually changed).
  useEditorStore.getState().commitFocusedPaneToTab();

  const state = useEditorStore.getState();
  const tabId = getFocusedPaneTabId(state);
  if (!tabId) return { status: "no-tab" };
  const tab = state.tabs[tabId];
  if (!tab) return { status: "no-tab" };

  if (options.requireDirty && !tab.meta.isDirty) return { status: "not-dirty", tabId };

  // Rich content lives inside the focused pane's Tiptap editor, so read from the
  // live editor exactly like normal Save. Plain/code/markdown content lives on the
  // tab (already updated by commitFocusedPaneToTab above) so no editor is needed.
  const editor = useEditorBridge.getState().editor;
  const content = tab.mode === "rich" ? (editor?.getHTML() ?? tab.content) : tab.content;

  // Never auto Save As / create a file when the document has no path.
  if (!tab.meta.filePath) return { status: "no-path", tabId, title: tab.meta.title };

  const path = tab.meta.filePath;
  const title = tab.meta.title;
  const format = getFormatFromPath(path);
  const output = prepareContentForSave(content, tab.mode, title, format);

  try {
    await enqueue(async () => {
      const { writeTextFile } = await import("@tauri-apps/plugin-fs");
      await writeTextFile(path, output);
    });
    state.markSaved(tabId, path);
    return { status: "saved", tabId, title, path };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : typeof error === "string"
          ? error
          : String(error);
    return { status: "error", tabId, title, path, output, format, message, error };
  }
}