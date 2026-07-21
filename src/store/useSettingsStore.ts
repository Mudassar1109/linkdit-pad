import { create } from "zustand";
import type { AppSettings, EditorSettings, AppearanceSettings, GeneralSettings, ShortcutConfig } from "@/types/settings";

const DEFAULT_SHORTCUTS: ShortcutConfig[] = [
  { key: "n", ctrl: true, command: "file.new", label: "New File" },
  { key: "o", ctrl: true, command: "file.open", label: "Open File" },
  { key: "s", ctrl: true, command: "file.save", label: "Save" },
  { key: "s", ctrl: true, shift: true, command: "file.saveAs", label: "Save As" },
  { key: "p", ctrl: true, command: "file.print", label: "Print" },
  { key: "z", ctrl: true, command: "edit.undo", label: "Undo" },
  { key: "y", ctrl: true, command: "edit.redo", label: "Redo" },
  { key: "x", ctrl: true, command: "edit.cut", label: "Cut" },
  { key: "c", ctrl: true, command: "edit.copy", label: "Copy" },
  { key: "v", ctrl: true, command: "edit.paste", label: "Paste" },
  { key: "a", ctrl: true, command: "edit.selectAll", label: "Select All" },
  { key: "f", ctrl: true, command: "search.find", label: "Find" },
  { key: "h", ctrl: true, command: "search.replace", label: "Replace" },
  { key: "b", ctrl: true, command: "format.bold", label: "Bold" },
  { key: "i", ctrl: true, command: "format.italic", label: "Italic" },
  { key: "u", ctrl: true, command: "format.underline", label: "Underline" },
  { key: "k", ctrl: true, command: "format.strikethrough", label: "Strikethrough" },
  { key: "p", ctrl: true, shift: true, command: "commandPalette.open", label: "Command Palette" },
  { key: "d", ctrl: true, shift: true, command: "editor.duplicateLine", label: "Duplicate Line" },
  { key: "/", ctrl: true, command: "editor.toggleComment", label: "Toggle Comment" },
  { key: "ArrowUp", ctrl: true, alt: true, command: "editor.moveLineUp", label: "Move Line Up" },
  { key: "ArrowDown", ctrl: true, alt: true, command: "editor.moveLineDown", label: "Move Line Down" },
  { key: "b", ctrl: true, shift: true, command: "sidebar.toggle", label: "Toggle Sidebar" },
  { key: "`", ctrl: true, command: "terminal.toggle", label: "Toggle Terminal" },
];

const DEFAULT_EDITOR: EditorSettings = {
  fontSize: 16,
  fontFamily: "Segoe UI Variable Text",
  lineHeight: 1.7,
  letterSpacing: 0,
  tabSize: 4,
  wordWrap: true,
  lineNumbers: true,
  minimap: false,
  autoSave: true,
  autoSaveDelay: 3000,
  spellCheck: true,
  defaultMode: "plain",
  smoothCursor: true,
  currentLineHighlight: true,
  bracketPair: true,
  formatOnSave: false,
};

const DEFAULT_APPEARANCE: AppearanceSettings = {
  themeMode: "system",
  accentColor: "#2563EB",
  cornerRadius: 14,
  animationSpeed: "normal",
  sidebarWidth: 280,
  showStatusBar: true,
  showMinimap: false,
  uiFont: "Segoe UI Variable",
  editorFont: "Segoe UI Variable Text",
  monoFont: "Cascadia Code",
};

const DEFAULT_GENERAL: GeneralSettings = {
  language: "en",
  autoUpdate: true,
  telemetry: false,
  startupBehavior: "new-document",
};

interface SettingsState extends AppSettings {
  isOpen: boolean;
  setGeneral: (general: Partial<GeneralSettings>) => void;
  setAppearance: (appearance: Partial<AppearanceSettings>) => void;
  setEditor: (editor: Partial<EditorSettings>) => void;
  setShortcuts: (shortcuts: ShortcutConfig[]) => void;
  resetSettings: () => void;
  open: () => void;
  close: () => void;
  toggle: () => void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  isOpen: false,
  general: DEFAULT_GENERAL,
  appearance: DEFAULT_APPEARANCE,
  editor: DEFAULT_EDITOR,
  shortcuts: DEFAULT_SHORTCUTS,

  setGeneral: (general) => set((s) => ({ general: { ...s.general, ...general } })),
  setAppearance: (appearance) => set((s) => ({ appearance: { ...s.appearance, ...appearance } })),
  setEditor: (editor) => set((s) => ({ editor: { ...s.editor, ...editor } })),
  setShortcuts: (shortcuts) => set({ shortcuts }),
  resetSettings: () => set({ general: DEFAULT_GENERAL, appearance: DEFAULT_APPEARANCE, editor: DEFAULT_EDITOR, shortcuts: DEFAULT_SHORTCUTS }),
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
  toggle: () => set((s) => ({ isOpen: !s.isOpen })),
}));
