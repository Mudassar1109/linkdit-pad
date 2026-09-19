import { openFileRaw } from "@/components/layout/Toolbar";
import { useEditorStore } from "@/store/useEditorStore";
import { useToastStore } from "@/store/useToastStore";

export function isLdpPath(path: string): boolean {
  return path.toLowerCase().endsWith(".ldp");
}

export function pathEquals(a: string, b: string): boolean {
  const norm = (p: string) => p.replace(/\\/g, "/").toLowerCase().replace(/\/+$/, "");
  return norm(a) === norm(b);
}

/**
 * Opens a `.ldp` document delivered by the operating system (double-click on
 * an associated file, a command-line argument, or a drag-and-drop onto the
 * window).
 *
 * Behavior:
 * - If the file is already open in a tab, that tab is activated instead of
 *   duplicating it (unsaved changes in the tab are preserved).
 * - Otherwise the file is read (via the Rust `open_document` command, with a
 *   plugin-fs fallback) and routed through the same `openFileRaw` loader used
 *   by File > Open, so corrupted documents surface the existing styled
 *   "corrupted document" message instead of raw JSON.
 * - Failures never replace or discard the active document.
 */
export async function openLdpPath(path: string): Promise<void> {
  const state = useEditorStore.getState();
  const existing = Object.values(state.tabs).find(
    (tab) => tab.meta.filePath != null && pathEquals(tab.meta.filePath, path),
  );
  if (existing) {
    state.setActiveTab(existing.groupId ?? "group-main", existing.meta.id);
    return;
  }

  let raw: string;
  try {
    const { invoke } = await import("@tauri-apps/api/core");
    raw = await invoke<string>("open_document", { path });
  } catch {
    try {
      const { readTextFile } = await import("@tauri-apps/plugin-fs");
      raw = await readTextFile(path);
    } catch {
      useToastStore.getState().show("error", `Could not open file: ${path}`);
      return;
    }
  }

  await openFileRaw(raw, path);
}