import { create } from "zustand";
import { useEditorStore } from "@/store/useEditorStore";
import { useEditorBridge } from "@/store/useEditorBridge";
import { searchText, type SearchOptions, type TextMatch } from "@/lib/textSearch";
import { htmlToPlainText } from "@/lib/htmlToText";

const HISTORY_KEY = "linkdit-pad-search-history";
const MAX_HISTORY = 20;

export interface DocSearchMatch extends TextMatch {
  fileId: string;
  title: string;
  /** Source text used for this file (live editor text or stored content). */
  sourceText: string;
}

function loadHistory(): string[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.filter((h) => typeof h === "string").slice(0, MAX_HISTORY);
    }
  } catch {}
  return [];
}

function persistHistory(history: string[]): void {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  } catch {}
}

/** Extracts plain searchable text for a tab, preferring the live editor state. */
function textForTab(fileId: string, content: string, mode: string): string {
  const activeTab = useEditorStore.getState().tabs[
    useEditorStore.getState().groups[useEditorStore.getState().activeGroupId]?.activeTabId ?? ""
  ];
  const editor = useEditorBridge.getState().editor;
  if (activeTab && activeTab.meta.id === fileId) {
    if (editor) {
      try {
        return editor.state.doc.textContent;
      } catch {}
    }
  }
  const isRich =
    (mode !== "plain" && mode !== "code") || /<[a-z][\s\S]*>/i.test(content);
  return isRich ? htmlToPlainText(content) : content;
}

interface SidebarSearchState {
  query: string;
  isRegex: boolean;
  caseSensitive: boolean;
  wholeWord: boolean;
  history: string[];
  results: DocSearchMatch[];
  totalMatches: number;
  matchedDocs: number;
  isSearching: boolean;
  lastQuery: string;

  setQuery: (query: string) => void;
  setIsRegex: (v: boolean) => void;
  setCaseSensitive: (v: boolean) => void;
  setWholeWord: (v: boolean) => void;
  runSearch: () => void;
  clearSearch: () => void;
  pushHistory: (query: string) => void;
  clearHistory: () => void;
}

export const useSidebarSearchStore = create<SidebarSearchState>((set, get) => ({
  query: "",
  isRegex: false,
  caseSensitive: false,
  wholeWord: false,
  history: loadHistory(),
  results: [],
  totalMatches: 0,
  matchedDocs: 0,
  isSearching: false,
  lastQuery: "",

  setQuery: (query) => set({ query }),

  setIsRegex: (v) => set({ isRegex: v }),
  setCaseSensitive: (v) => set({ caseSensitive: v }),
  setWholeWord: (v) => set({ wholeWord: v }),

  runSearch: () => {
    const s = get();
    const query = s.query.trim();
    if (!query) {
      set({ results: [], totalMatches: 0, matchedDocs: 0, isSearching: false, lastQuery: "" });
      return;
    }
    set({ isSearching: true });
    // Run on the next tick so the UI can paint the spinner before heavy work.
    setTimeout(() => {
      const opts: SearchOptions = {
        isRegex: s.isRegex,
        caseSensitive: s.caseSensitive,
        wholeWord: s.wholeWord,
      };
      const tabs = useEditorStore.getState().tabs;
      const results: DocSearchMatch[] = [];
      for (const tab of Object.values(tabs)) {
        const sourceText = textForTab(tab.meta.id, tab.content, tab.mode);
        const matches = searchText(sourceText, query, opts, 100);
        for (const m of matches) {
          results.push({ ...m, fileId: tab.meta.id, title: tab.meta.title, sourceText });
        }
        if (results.length >= 500) break;
      }
      const seen = new Set<string>();
      for (const r of results) seen.add(r.fileId);
      set({
        results,
        totalMatches: results.length,
        matchedDocs: seen.size,
        isSearching: false,
        lastQuery: query,
      });
    }, 0);
  },

  clearSearch: () => set({ query: "", results: [], totalMatches: 0, matchedDocs: 0, lastQuery: "" }),

  pushHistory: (query) => {
    const q = query.trim();
    if (!q) return;
    const history = [q, ...get().history.filter((h) => h !== q)].slice(0, MAX_HISTORY);
    persistHistory(history);
    set({ history });
  },

  clearHistory: () => {
    persistHistory([]);
    set({ history: [] });
  },
}));