import { create } from "zustand";
import type { AppearanceSettings, ThemeMode } from "@/types/theme";

const STORAGE_KEY = "linkdit-pad-theme-mode";

const DEFAULT_APPEARANCE: AppearanceSettings = {
  themeMode: "system",
  accent: { id: "blue", name: "Blue", value: "#2563EB" },
  fonts: {
    uiFont: "Segoe UI Variable",
    editorFont: "Segoe UI Variable Text",
    monoFont: "Cascadia Code",
    urduFont: "Noto Nastaliq Urdu",
    fontSize: 16,
    lineHeight: 1.7,
    letterSpacing: 0,
  },
  animationSpeed: "normal",
  cornerRadius: 14,
};

interface ThemeState extends AppearanceSettings {
  resolvedMode: "light" | "dark";
  setThemeMode: (mode: ThemeMode) => void;
  setAccent: (accent: AppearanceSettings["accent"]) => void;
  applyResolvedMode: () => void;
}

function resolveSystemPreference(): "light" | "dark" {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function loadPersistedTheme(): ThemeMode {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "light" || stored === "dark" || stored === "system") return stored;
  } catch {}
  return "system";
}

function applyThemeClass(mode: "light" | "dark") {
  const root = document.documentElement;
  root.classList.add("theme-transition");
  root.classList.toggle("dark", mode === "dark");
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      root.classList.remove("theme-transition");
    });
  });
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  ...DEFAULT_APPEARANCE,
  themeMode: loadPersistedTheme(),
  resolvedMode: resolveSystemPreference(),

  setThemeMode: (mode) => {
    set({ themeMode: mode });
    try {
      localStorage.setItem(STORAGE_KEY, mode);
    } catch {}
    get().applyResolvedMode();
  },

  setAccent: (accent) => set({ accent }),

  applyResolvedMode: () => {
    const { themeMode } = get();
    const resolved = themeMode === "system" ? resolveSystemPreference() : themeMode;
    set({ resolvedMode: resolved });
    applyThemeClass(resolved);
  },
}));
