import { create } from "zustand";
import type { AccentId, ThemeId, ThemeMode } from "@/types/theme";

const MODE_KEY = "linkdit-pad-theme-mode";
const THEME_KEY = "linkdit-pad-theme";
const ACCENT_KEY = "linkdit-pad-accent";

const MODES: readonly ThemeMode[] = ["light", "dark", "system"];
const THEMES: readonly ThemeId[] = ["midnight", "obsidian", "slate", "arctic", "paper", "forest"];
const ACCENTS: readonly AccentId[] = ["blue", "purple", "cyan", "green", "orange", "pink"];

interface ThemeState {
  themeMode: ThemeMode;
  themeId: ThemeId;
  accentId: AccentId;
  resolvedMode: "light" | "dark";
  setThemeMode: (mode: ThemeMode) => void;
  setTheme: (id: ThemeId) => void;
  setAccent: (id: AccentId) => void;
  applyResolvedMode: () => void;
}

function resolveSystemPreference(): "light" | "dark" {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function load<T extends string>(key: string, allowed: readonly T[], fallback: T): T {
  try {
    const stored = localStorage.getItem(key);
    if (stored && (allowed as readonly string[]).includes(stored)) return stored as T;
  } catch {}
  return fallback;
}

function applyThemeToDom(themeId: ThemeId, accentId: AccentId, resolved: "light" | "dark") {
  const root = document.documentElement;
  root.classList.add("theme-transition");
  root.setAttribute("data-theme", themeId);
  root.setAttribute("data-accent", accentId);
  root.classList.toggle("dark", resolved === "dark");
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      root.classList.remove("theme-transition");
    });
  });
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  themeMode: load(MODE_KEY, MODES, "system"),
  themeId: load(THEME_KEY, THEMES, "arctic"),
  accentId: load(ACCENT_KEY, ACCENTS, "blue"),
  resolvedMode: resolveSystemPreference(),

  setThemeMode: (mode) => {
    set({ themeMode: mode });
    try {
      localStorage.setItem(MODE_KEY, mode);
    } catch {}
    get().applyResolvedMode();
  },

  setTheme: (id) => {
    set({ themeId: id });
    try {
      localStorage.setItem(THEME_KEY, id);
    } catch {}
    const { resolvedMode } = get();
    applyThemeToDom(id, get().accentId, resolvedMode);
  },

  setAccent: (id) => {
    set({ accentId: id });
    try {
      localStorage.setItem(ACCENT_KEY, id);
    } catch {}
    const { resolvedMode } = get();
    applyThemeToDom(get().themeId, id, resolvedMode);
  },

  applyResolvedMode: () => {
    const { themeMode, themeId, accentId } = get();
    const resolved = themeMode === "system" ? resolveSystemPreference() : themeMode;
    set({ resolvedMode: resolved });
    applyThemeToDom(themeId, accentId, resolved);
  },
}));