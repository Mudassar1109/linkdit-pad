import type { AccentId, ThemeId } from "@/types/theme";

export interface ThemePalette {
  /** Chrome + surfaces */
  background: string;
  foreground: string;
  card: string;
  "card-foreground": string;
  popover: string;
  "popover-foreground": string;
  surface: string;
  "surface-raised": string;
  sidebar: string;
  toolbar: string;
  muted: string;
  "muted-foreground": string;
  "secondary-foreground": string;
  border: string;
  input: string;
  success: string;
  warning: string;
  danger: string;
  /** Editor */
  "editor-bg": string;
  "editor-text": string;
  "editor-selection": string;
  "code-bg": string;
  /** Accent foreground (text on accent surfaces in this theme) */
  "accent-foreground": string;
}

export interface ThemeDefinition {
  id: ThemeId;
  previewMode: "light" | "dark";
  palette: { light: ThemePalette; dark: ThemePalette };
}

export interface AccentTone {
  primary: string;
  "primary-foreground": string;
  ring: string;
  selection: string;
  "accent-hover": string;
  "accent-active": string;
  accent: string;
  accent2: string;
}

export interface AccentDefinition {
  id: AccentId;
  name: string;
  hex: string;
  light: AccentTone;
  dark: AccentTone;
}

/** All values are HSL triplets (h s% l%), matching the CSS custom properties. */
export const THEMES: ThemeDefinition[] = [
  {
    id: "midnight",
    previewMode: "dark",
    palette: {
      light: {
        background: "222 45% 97%",
        foreground: "226 30% 16%",
        card: "0 0% 100%",
        "card-foreground": "226 30% 16%",
        popover: "0 0% 100%",
        "popover-foreground": "226 30% 16%",
        surface: "0 0% 100%",
        "surface-raised": "222 60% 99%",
        sidebar: "222 38% 95%",
        toolbar: "222 50% 98%",
        muted: "222 28% 93%",
        "muted-foreground": "224 16% 44%",
        "secondary-foreground": "224 18% 38%",
        border: "221 26% 88%",
        input: "221 26% 88%",
        success: "160 84% 38%",
        warning: "38 92% 50%",
        danger: "0 84% 60%",
        "editor-bg": "222 45% 97%",
        "editor-text": "226 30% 16%",
        "editor-selection": "221 83% 53%",
        "code-bg": "223 28% 94%",
        "accent-foreground": "0 0% 100%",
      },
      dark: {
        background: "228 45% 7%",
        foreground: "214 38% 94%",
        card: "229 40% 10%",
        "card-foreground": "214 38% 94%",
        popover: "229 36% 12%",
        "popover-foreground": "214 38% 94%",
        surface: "229 40% 10%",
        "surface-raised": "229 38% 13%",
        sidebar: "228 50% 7%",
        toolbar: "228 42% 9%",
        muted: "228 30% 13%",
        "muted-foreground": "218 18% 66%",
        "secondary-foreground": "218 18% 74%",
        border: "228 28% 20%",
        input: "228 28% 20%",
        success: "160 78% 48%",
        warning: "41 88% 56%",
        danger: "356 80% 64%",
        "editor-bg": "228 45% 7%",
        "editor-text": "214 38% 94%",
        "editor-selection": "217 91% 60%",
        "code-bg": "229 42% 10%",
        "accent-foreground": "228 45% 9%",
      },
    },
  },
  {
    id: "obsidian",
    previewMode: "dark",
    palette: {
      light: {
        background: "255 16% 97%",
        foreground: "260 18% 14%",
        card: "0 0% 100%",
        "card-foreground": "260 18% 14%",
        popover: "0 0% 100%",
        "popover-foreground": "260 18% 14%",
        surface: "0 0% 100%",
        "surface-raised": "255 24% 99%",
        sidebar: "255 18% 95%",
        toolbar: "255 22% 98%",
        muted: "255 20% 93%",
        "muted-foreground": "258 10% 44%",
        "secondary-foreground": "258 12% 38%",
        border: "257 14% 88%",
        input: "257 14% 88%",
        success: "158 80% 38%",
        warning: "38 88% 48%",
        danger: "0 80% 60%",
        "editor-bg": "255 16% 97%",
        "editor-text": "260 18% 14%",
        "editor-selection": "262 76% 58%",
        "code-bg": "256 18% 94%",
        "accent-foreground": "0 0% 100%",
      },
      dark: {
        background: "254 26% 6%",
        foreground: "258 32% 94%",
        card: "254 24% 9%",
        "card-foreground": "258 32% 94%",
        popover: "254 22% 11%",
        "popover-foreground": "258 32% 94%",
        surface: "254 24% 9%",
        "surface-raised": "254 24% 13%",
        sidebar: "254 34% 6%",
        toolbar: "254 28% 8%",
        muted: "253 20% 13%",
        "muted-foreground": "256 14% 64%",
        "secondary-foreground": "256 16% 72%",
        border: "254 18% 20%",
        input: "254 18% 20%",
        success: "158 76% 47%",
        warning: "38 90% 55%",
        danger: "356 82% 64%",
        "editor-bg": "254 26% 6%",
        "editor-text": "258 32% 94%",
        "editor-selection": "262 76% 64%",
        "code-bg": "255 26% 10%",
        "accent-foreground": "254 30% 8%",
      },
    },
  },
  {
    id: "slate",
    previewMode: "dark",
    palette: {
      light: {
        background: "210 20% 97%",
        foreground: "215 25% 15%",
        card: "0 0% 100%",
        "card-foreground": "215 25% 15%",
        popover: "0 0% 100%",
        "popover-foreground": "215 25% 15%",
        surface: "0 0% 100%",
        "surface-raised": "210 40% 99%",
        sidebar: "212 18% 95%",
        toolbar: "210 30% 98%",
        muted: "212 16% 93%",
        "muted-foreground": "215 12% 44%",
        "secondary-foreground": "215 14% 38%",
        border: "214 16% 88%",
        input: "214 16% 88%",
        success: "158 78% 38%",
        warning: "38 88% 48%",
        danger: "0 80% 60%",
        "editor-bg": "210 20% 97%",
        "editor-text": "215 25% 15%",
        "editor-selection": "190 90% 40%",
        "code-bg": "212 20% 94%",
        "accent-foreground": "0 0% 100%",
      },
      dark: {
        background: "217 16% 7%",
        foreground: "213 16% 94%",
        card: "217 14% 10%",
        "card-foreground": "213 16% 94%",
        popover: "217 16% 13%",
        "popover-foreground": "213 16% 94%",
        surface: "217 14% 10%",
        "surface-raised": "217 16% 13%",
        sidebar: "217 18% 6%",
        toolbar: "217 15% 9%",
        muted: "216 12% 13%",
        "muted-foreground": "215 10% 66%",
        "secondary-foreground": "215 12% 74%",
        border: "216 10% 20%",
        input: "216 10% 20%",
        success: "158 74% 47%",
        warning: "38 88% 56%",
        danger: "356 80% 64%",
        "editor-bg": "217 16% 7%",
        "editor-text": "213 16% 94%",
        "editor-selection": "190 90% 55%",
        "code-bg": "217 18% 10%",
        "accent-foreground": "217 16% 8%",
      },
    },
  },
  {
    id: "arctic",
    previewMode: "light",
    palette: {
      light: {
        background: "222 24% 98%",
        foreground: "225 20% 14%",
        card: "0 0% 100%",
        "card-foreground": "225 20% 14%",
        popover: "0 0% 100%",
        "popover-foreground": "225 20% 14%",
        surface: "0 0% 100%",
        "surface-raised": "0 0% 100%",
        sidebar: "220 20% 97%",
        toolbar: "222 30% 99%",
        muted: "225 18% 95%",
        "muted-foreground": "224 12% 46%",
        "secondary-foreground": "224 12% 40%",
        border: "225 16% 90%",
        input: "225 16% 90%",
        success: "160 84% 39%",
        warning: "38 92% 50%",
        danger: "0 84% 60%",
        "editor-bg": "222 24% 98%",
        "editor-text": "225 20% 14%",
        "editor-selection": "221 83% 53%",
        "code-bg": "225 20% 96%",
        "accent-foreground": "0 0% 100%",
      },
      dark: {
        background: "228 32% 6%",
        foreground: "212 26% 94%",
        card: "228 26% 9%",
        "card-foreground": "212 26% 94%",
        popover: "228 24% 11%",
        "popover-foreground": "212 26% 94%",
        surface: "228 26% 9%",
        "surface-raised": "228 24% 12%",
        sidebar: "228 30% 8%",
        toolbar: "228 32% 10%",
        muted: "228 22% 13%",
        "muted-foreground": "220 12% 64%",
        "secondary-foreground": "218 14% 72%",
        border: "228 20% 18%",
        input: "228 20% 18%",
        success: "161 84% 47%",
        warning: "41 94% 56%",
        danger: "358 84% 66%",
        "editor-bg": "228 32% 6%",
        "editor-text": "212 26% 94%",
        "editor-selection": "219 90% 60%",
        "code-bg": "228 28% 10%",
        "accent-foreground": "228 47% 9%",
      },
    },
  },
  {
    id: "paper",
    previewMode: "light",
    palette: {
      light: {
        background: "40 33% 96%",
        foreground: "32 30% 18%",
        card: "45 40% 99%",
        "card-foreground": "32 30% 18%",
        popover: "45 40% 99%",
        "popover-foreground": "32 30% 18%",
        surface: "45 40% 99%",
        "surface-raised": "42 45% 97%",
        sidebar: "38 30% 94%",
        toolbar: "42 38% 97%",
        muted: "40 24% 92%",
        "muted-foreground": "34 14% 46%",
        "secondary-foreground": "34 16% 40%",
        border: "38 22% 87%",
        input: "38 22% 87%",
        success: "150 50% 40%",
        warning: "30 85% 46%",
        danger: "4 70% 58%",
        "editor-bg": "43 45% 96%",
        "editor-text": "32 30% 16%",
        "editor-selection": "38 92% 50%",
        "code-bg": "40 30% 93%",
        "accent-foreground": "0 0% 100%",
      },
      dark: {
        background: "30 20% 9%",
        foreground: "36 25% 90%",
        card: "30 16% 12%",
        "card-foreground": "36 25% 90%",
        popover: "32 18% 15%",
        "popover-foreground": "36 25% 90%",
        surface: "30 16% 12%",
        "surface-raised": "32 18% 15%",
        sidebar: "30 24% 8%",
        toolbar: "30 18% 11%",
        muted: "31 14% 15%",
        "muted-foreground": "34 12% 62%",
        "secondary-foreground": "34 14% 70%",
        border: "32 12% 22%",
        input: "32 12% 22%",
        success: "150 50% 45%",
        warning: "34 90% 55%",
        danger: "8 70% 62%",
        "editor-bg": "28 22% 10%",
        "editor-text": "36 25% 90%",
        "editor-selection": "34 92% 55%",
        "code-bg": "32 20% 12%",
        "accent-foreground": "30 24% 9%",
      },
    },
  },
  {
    id: "forest",
    previewMode: "dark",
    palette: {
      light: {
        background: "152 24% 96%",
        foreground: "156 25% 14%",
        card: "0 0% 100%",
        "card-foreground": "156 25% 14%",
        popover: "0 0% 100%",
        "popover-foreground": "156 25% 14%",
        surface: "0 0% 100%",
        "surface-raised": "150 40% 98%",
        sidebar: "152 22% 94%",
        toolbar: "151 32% 97%",
        muted: "152 18% 92%",
        "muted-foreground": "155 12% 42%",
        "secondary-foreground": "155 14% 36%",
        border: "151 15% 86%",
        input: "151 15% 86%",
        success: "160 70% 36%",
        warning: "38 92% 50%",
        danger: "0 82% 60%",
        "editor-bg": "152 24% 96%",
        "editor-text": "156 25% 14%",
        "editor-selection": "158 84% 39%",
        "code-bg": "153 20% 93%",
        "accent-foreground": "0 0% 100%",
      },
      dark: {
        background: "160 30% 7%",
        foreground: "150 22% 94%",
        card: "158 26% 9%",
        "card-foreground": "150 22% 94%",
        popover: "158 26% 12%",
        "popover-foreground": "150 22% 94%",
        surface: "158 26% 9%",
        "surface-raised": "158 26% 12%",
        sidebar: "162 32% 6%",
        toolbar: "160 28% 8%",
        muted: "157 20% 13%",
        "muted-foreground": "152 12% 66%",
        "secondary-foreground": "152 14% 74%",
        border: "156 16% 19%",
        input: "156 16% 19%",
        success: "158 74% 46%",
        warning: "40 90% 55%",
        danger: "2 80% 63%",
        "editor-bg": "160 30% 7%",
        "editor-text": "150 22% 94%",
        "editor-selection": "161 84% 47%",
        "code-bg": "158 28% 10%",
        "accent-foreground": "158 30% 8%",
      },
    },
  },
];

export const ACCENTS: AccentDefinition[] = [
  {
    id: "blue",
    name: "Blue",
    hex: "#2563EB",
    light: {
      primary: "221 83% 53%",
      "primary-foreground": "0 0% 100%",
      ring: "221 83% 53%",
      selection: "221 83% 53%",
      "accent-hover": "217 91% 48%",
      "accent-active": "221 92% 42%",
      accent: "189 94% 43%",
      accent2: "262 76% 58%",
    },
    dark: {
      primary: "219 90% 60%",
      "primary-foreground": "228 47% 9%",
      ring: "219 90% 60%",
      selection: "219 90% 60%",
      "accent-hover": "221 95% 68%",
      "accent-active": "215 100% 72%",
      accent: "190 92% 52%",
      accent2: "262 84% 68%",
    },
  },
  {
    id: "purple",
    name: "Purple",
    hex: "#8B5CF6",
    light: {
      primary: "262 83% 58%",
      "primary-foreground": "0 0% 100%",
      ring: "262 83% 58%",
      selection: "262 83% 58%",
      "accent-hover": "262 80% 52%",
      "accent-active": "262 85% 46%",
      accent: "268 70% 62%",
      accent2: "258 90% 66%",
    },
    dark: {
      primary: "262 86% 68%",
      "primary-foreground": "254 60% 10%",
      ring: "262 86% 68%",
      selection: "262 86% 68%",
      "accent-hover": "262 84% 74%",
      "accent-active": "263 95% 78%",
      accent: "268 70% 70%",
      accent2: "258 90% 74%",
    },
  },
  {
    id: "cyan",
    name: "Cyan",
    hex: "#06B6D4",
    light: {
      primary: "189 98% 36%",
      "primary-foreground": "0 0% 100%",
      ring: "189 98% 36%",
      selection: "189 98% 36%",
      "accent-hover": "191 95% 30%",
      "accent-active": "192 98% 26%",
      accent: "199 90% 50%",
      accent2: "178 92% 44%",
    },
    dark: {
      primary: "189 92% 52%",
      "primary-foreground": "191 60% 8%",
      ring: "189 92% 52%",
      selection: "189 92% 52%",
      "accent-hover": "190 94% 62%",
      "accent-active": "191 96% 70%",
      accent: "199 90% 58%",
      accent2: "178 92% 52%",
    },
  },
  {
    id: "green",
    name: "Green",
    hex: "#10B981",
    light: {
      primary: "158 84% 39%",
      "primary-foreground": "0 0% 100%",
      ring: "158 84% 39%",
      selection: "158 84% 39%",
      "accent-hover": "156 86% 33%",
      "accent-active": "155 90% 27%",
      accent: "168 70% 40%",
      accent2: "142 80% 42%",
    },
    dark: {
      primary: "161 84% 47%",
      "primary-foreground": "157 60% 8%",
      ring: "161 84% 47%",
      selection: "161 84% 47%",
      "accent-hover": "160 84% 56%",
      "accent-active": "159 90% 64%",
      accent: "168 70% 50%",
      accent2: "142 85% 52%",
    },
  },
  {
    id: "orange",
    name: "Orange",
    hex: "#F97316",
    light: {
      primary: "24 95% 50%",
      "primary-foreground": "0 0% 100%",
      ring: "24 95% 50%",
      selection: "24 95% 50%",
      "accent-hover": "24 94% 44%",
      "accent-active": "25 97% 38%",
      accent: "18 92% 52%",
      accent2: "355 90% 56%",
    },
    dark: {
      primary: "27 96% 56%",
      "primary-foreground": "24 60% 8%",
      ring: "27 96% 56%",
      selection: "27 96% 56%",
      "accent-hover": "27 96% 66%",
      "accent-active": "28 100% 74%",
      accent: "18 92% 62%",
      accent2: "355 92% 66%",
    },
  },
  {
    id: "pink",
    name: "Pink",
    hex: "#EC4899",
    light: {
      primary: "330 81% 60%",
      "primary-foreground": "0 0% 100%",
      ring: "330 81% 60%",
      selection: "330 81% 60%",
      "accent-hover": "330 78% 52%",
      "accent-active": "331 85% 46%",
      accent: "320 90% 62%",
      accent2: "280 85% 62%",
    },
    dark: {
      primary: "330 86% 68%",
      "primary-foreground": "330 60% 10%",
      ring: "330 86% 68%",
      selection: "330 86% 68%",
      "accent-hover": "330 84% 74%",
      "accent-active": "331 90% 80%",
      accent: "320 90% 70%",
      accent2: "280 88% 72%",
    },
  },
];

function find<T extends { id: string }>(list: T[], id: string, fallback: T): T {
  return list.find((item) => item.id === id) ?? fallback;
}

export function getThemeById(id: string): ThemeDefinition {
  return find(THEMES, id, THEMES[3]);
}

export function getAccentById(id: string): AccentDefinition {
  return find(ACCENTS, id, ACCENTS[0]);
}