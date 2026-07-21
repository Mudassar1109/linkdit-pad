import { create } from "zustand";

export interface FontEntry {
  family: string;
  category: "english" | "urdu" | "arabic" | "monospace" | "handwriting" | "serif" | "sans-serif" | "display" | "other";
  source: "system" | "google" | "imported";
  isVariable?: boolean;
}

interface FontState {
  systemFonts: FontEntry[];
  googleFonts: FontEntry[];
  importedFonts: FontEntry[];
  recentFonts: string[];
  favoriteFonts: string[];
  isLoading: boolean;
  error: string | null;
  detectSystemFonts: () => Promise<void>;
  loadGoogleFont: (family: string) => Promise<void>;
  addRecentFont: (family: string) => void;
  toggleFavoriteFont: (family: string) => void;
  isFavorite: (family: string) => boolean;
  getAllFonts: () => FontEntry[];
  getFilteredFonts: (category: string, search: string) => FontEntry[];
}

export const useFontStore = create<FontState>((set, get) => ({
  systemFonts: [],
  googleFonts: [],
  importedFonts: [],
  recentFonts: [],
  favoriteFonts: [],
  isLoading: false,
  error: null,

  detectSystemFonts: async () => {
    set({ isLoading: true, error: null });
    try {
      const families = new Set<string>();

      if ("queryLocalFonts" in navigator) {
        try {
          const fonts: FontEntry[] = [];
          const iter = await (navigator as any).queryLocalFonts();
          for (const font of iter) {
            const name = font.family;
            if (!families.has(name)) {
              families.add(name);
              fonts.push({
                family: name,
                category: categorizeFont(name),
                source: "system",
              });
            }
          }
          set({ systemFonts: fonts, isLoading: false });
          return;
        } catch {
        }
      }

      await document.fonts.ready;
      const fontSet = document.fonts;
      for (const fontFace of fontSet.values()) {
        const name = fontFace.family.replace(/["']/g, "");
        if (!families.has(name)) {
          families.add(name);
        }
      }

      if (families.size === 0) {
        set({
          systemFonts: getFallbackFonts(),
          isLoading: false,
        });
        return;
      }

      const fonts: FontEntry[] = [];
      for (const name of families) {
        fonts.push({
          family: name,
          category: categorizeFont(name),
          source: "system",
        });
      }
      fonts.sort((a, b) => a.family.localeCompare(b.family));
      set({ systemFonts: fonts, isLoading: false });
    } catch (err) {
      set({ systemFonts: getFallbackFonts(), isLoading: false, error: null });
    }
  },

  loadGoogleFont: async (family: string) => {
    const encoded = family.replace(/\s+/g, "+");
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = `https://fonts.googleapis.com/css2?family=${encoded}:wght@400;700&display=swap`;
    document.head.appendChild(link);
    await document.fonts.ready;

    set((s) => {
      const existing = s.googleFonts.find((f) => f.family === family);
      if (existing) return s;
      return {
        googleFonts: [
          ...s.googleFonts,
          { family, category: categorizeFont(family), source: "google" },
        ],
      };
    });
  },

  addRecentFont: (family) => {
    set((s) => {
      const recent = [family, ...s.recentFonts.filter((f) => f !== family)].slice(0, 10);
      return { recentFonts: recent };
    });
  },

  toggleFavoriteFont: (family) => {
    set((s) => {
      const isFav = s.favoriteFonts.includes(family);
      return {
        favoriteFonts: isFav
          ? s.favoriteFonts.filter((f) => f !== family)
          : [...s.favoriteFonts, family],
      };
    });
  },

  isFavorite: (family) => get().favoriteFonts.includes(family),

  getAllFonts: () => {
    const s = get();
    return [...s.systemFonts, ...s.googleFonts, ...s.importedFonts];
  },

  getFilteredFonts: (category: string, search: string) => {
    const all = get().getAllFonts();
    return all.filter((f) => {
      if (category !== "all" && f.category !== category) return false;
      if (search && !f.family.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  },
}));

function categorizeFont(name: string): FontEntry["category"] {
  const lower = name.toLowerCase();

  const urduKeywords = ["urdu", "nastaliq", "nastaleeq", "nafees", "noori", "mehr", "alvi", "pak", "jameel"];
  const arabicKeywords = ["arabic", "kufi", "naskh", "amiri", "quran", "thuluth", "diwani"];
  const monoKeywords = ["mono", "code", "console", "courier", "terminal", "hack", "fira code", "jetbrains"];
  const handwritingKeywords = ["hand", "script", "cursive", "brush", "ink", "pen", "calligraphy", "comic"];
  const serifKeywords = ["serif", "times", "georgia", "palatino", "garamond", "bookman", "caslon", "bodoni", "cambria", "constantia"];

  if (urduKeywords.some((k) => lower.includes(k))) return "urdu";
  if (arabicKeywords.some((k) => lower.includes(k))) return "arabic";
  if (monoKeywords.some((k) => lower.includes(k))) return "monospace";
  if (handwritingKeywords.some((k) => lower.includes(k))) return "handwriting";
  if (serifKeywords.some((k) => lower.includes(k))) return "serif";
  if (lower.includes("sans") || lower.includes("segoe") || lower.includes("arial") || lower.includes("calibri") || lower.includes("tahoma") || lower.includes("verdana") || lower.includes("helvetica") || lower.includes("franklin") || lower.includes("impact")) return "sans-serif";
  if (lower.includes("display") || lower.includes("stencil") || lower.includes("fantasy")) return "display";

  return "other";
}

function getFallbackFonts(): FontEntry[] {
  return [
    { family: "Arial", category: "sans-serif", source: "system" },
    { family: "Calibri", category: "sans-serif", source: "system" },
    { family: "Cambria", category: "serif", source: "system" },
    { family: "Candara", category: "sans-serif", source: "system" },
    { family: "Cascadia Code", category: "monospace", source: "system" },
    { family: "Comic Sans MS", category: "handwriting", source: "system" },
    { family: "Consolas", category: "monospace", source: "system" },
    { family: "Constantia", category: "serif", source: "system" },
    { family: "Corbel", category: "sans-serif", source: "system" },
    { family: "Courier New", category: "monospace", source: "system" },
    { family: "Ebrima", category: "sans-serif", source: "system" },
    { family: "Franklin Gothic Medium", category: "sans-serif", source: "system" },
    { family: "Gabriola", category: "handwriting", source: "system" },
    { family: "Gadugi", category: "sans-serif", source: "system" },
    { family: "Georgia", category: "serif", source: "system" },
    { family: "Impact", category: "sans-serif", source: "system" },
    { family: "Ink Free", category: "handwriting", source: "system" },
    { family: "Javanese Text", category: "serif", source: "system" },
    { family: "Leelawadee UI", category: "sans-serif", source: "system" },
    { family: "Lucida Console", category: "monospace", source: "system" },
    { family: "Lucida Sans Unicode", category: "sans-serif", source: "system" },
    { family: "Microsoft Sans Serif", category: "sans-serif", source: "system" },
    { family: "Microsoft YaHei", category: "sans-serif", source: "system" },
    { family: "Microsoft Yi Baiti", category: "serif", source: "system" },
    { family: "MingLiU", category: "serif", source: "system" },
    { family: "Modern No. 20", category: "serif", source: "system" },
    { family: "Mongolian Baiti", category: "serif", source: "system" },
    { family: "MS Gothic", category: "sans-serif", source: "system" },
    { family: "MS明朝", category: "serif", source: "system" },
    { family: "MV Boli", category: "handwriting", source: "system" },
    { family: "Myanmar Text", category: "sans-serif", source: "system" },
    { family: "Nirmala UI", category: "sans-serif", source: "system" },
    { family: "Noto Nastaliq Urdu", category: "urdu", source: "system" },
    { family: "Palatino Linotype", category: "serif", source: "system" },
    { family: "Segoe UI", category: "sans-serif", source: "system" },
    { family: "Segoe UI Variable", category: "sans-serif", source: "system" },
    { family: "Segoe UI Variable Text", category: "sans-serif", source: "system" },
    { family: "Segoe UI Emoji", category: "other", source: "system" },
    { family: "Sitka", category: "serif", source: "system" },
    { family: "Tahoma", category: "sans-serif", source: "system" },
    { family: "Times New Roman", category: "serif", source: "system" },
    { family: "Trebuchet MS", category: "sans-serif", source: "system" },
    { family: "Verdana", category: "sans-serif", source: "system" },
    { family: "Webdings", category: "other", source: "system" },
    { family: "Wingdings", category: "other", source: "system" },
    { family: "Jameel Noori Nastaleeq", category: "urdu", source: "system" },
    { family: "Nafees Nastaleeq", category: "urdu", source: "system" },
    { family: "Pak Nastaleeq", category: "urdu", source: "system" },
    { family: "Mehr Nastaleeq", category: "urdu", source: "system" },
    { family: "Alvi Nastaleeq", category: "urdu", source: "system" },
  ];
}
