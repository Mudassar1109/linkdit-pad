import type { EditorMode } from "./editor";
import type { ThemeMode } from "./theme";

export interface ShortcutConfig {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  command: string;
  label: string;
  labelKey?: string;
}

export interface EditorSettings {
  fontSize: number;
  fontFamily: string;
  lineHeight: number;
  letterSpacing: number;
  tabSize: number;
  wordWrap: boolean;
  lineNumbers: boolean;
  minimap: boolean;
  autoSave: boolean;
  autoSaveDelay: number;
  spellCheck: boolean;
  defaultMode: EditorMode;
  smoothCursor: boolean;
  currentLineHighlight: boolean;
  bracketPair: boolean;
  formatOnSave: boolean;
}

export interface AppearanceSettings {
  themeMode: ThemeMode;
  accentColor: string;
  cornerRadius: number;
  animationSpeed: "off" | "reduced" | "normal" | "fast";
  sidebarWidth: number;
  showStatusBar: boolean;
  showMinimap: boolean;
  uiFont: string;
  editorFont: string;
  monoFont: string;
}

export interface GeneralSettings {
  language: string;
  autoUpdate: boolean;
  telemetry: boolean;
  startupBehavior: "new-document" | "restore" | "blank";
}

export interface AppSettings {
  general: GeneralSettings;
  appearance: AppearanceSettings;
  editor: EditorSettings;
  shortcuts: ShortcutConfig[];
}
