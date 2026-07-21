/**
 * LinkDit Pad — core editor domain types.
 * These types are the contract between the UI layer, the Zustand
 * store, and the Rust/Tauri backend (file system + SQLite).
 */

export type EditorMode =
  | "plain"
  | "rich"
  | "markdown"
  | "code"
  | "reading"
  | "focus"
  | "zen"
  | "typewriter";

export type TextDirection = "ltr" | "rtl";

export interface DocumentMeta {
  id: string;
  title: string;
  /** Absolute path on disk, or null for an unsaved buffer. */
  filePath: string | null;
  language: string | null;
  direction: TextDirection;
  createdAt: string;
  updatedAt: string;
  isPinned: boolean;
  isDirty: boolean;
}

export interface EditorTab {
  meta: DocumentMeta;
  mode: EditorMode;
  content: string;
  scrollPosition: number;
  cursorPosition: number;
  groupId: string;
}

export interface TabGroup {
  id: string;
  tabIds: string[];
  activeTabId: string | null;
  splitDirection: "horizontal" | "vertical" | null;
}

export interface RecentFileEntry {
  path: string;
  title: string;
  lastOpenedAt: string;
  isPinned: boolean;
}
