export type ThemeMode = "light" | "dark" | "system";

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
