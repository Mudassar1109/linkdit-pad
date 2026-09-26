export type ThemeMode = "light" | "dark" | "system";

export type ThemeId = "midnight" | "obsidian" | "slate" | "arctic" | "paper" | "forest";

export type AccentId = "blue" | "purple" | "cyan" | "green" | "orange" | "pink";

export interface AccentColor {
  id: string;
  name: string;
  value: string; // hex
}

export interface FontConfig {
  uiFont: string;
  editorFont: string;
  monoFont: string;
  urduFont: string;
  fontSize: number;
  lineHeight: number;
  letterSpacing: number;
}

export interface AppearanceSettings {
  themeMode: ThemeMode;
  accent: AccentColor;
  fonts: FontConfig;
  animationSpeed: "off" | "reduced" | "normal" | "fast";
  cornerRadius: number;
}
