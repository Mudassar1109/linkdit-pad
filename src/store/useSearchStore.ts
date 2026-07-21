import { create } from "zustand";

interface SearchResult {
  line: number;
  content: string;
  matchStart: number;
  matchEnd: number;
}

interface SearchState {
  query: string;
  replaceText: string;
  isRegex: boolean;
  caseSensitive: boolean;
  wholeWord: boolean;
  isVisible: boolean;
  results: SearchResult[];
  currentIndex: number;

  setQuery: (query: string) => void;
  setReplaceText: (replaceText: string) => void;
  setIsRegex: (isRegex: boolean) => void;
  setCaseSensitive: (caseSensitive: boolean) => void;
  setWholeWord: (wholeWord: boolean) => void;
  setIsVisible: (isVisible: boolean) => void;
  setResults: (results: SearchResult[]) => void;
  setCurrentIndex: (currentIndex: number) => void;
}

export const useSearchStore = create<SearchState>((set) => ({
  query: "",
  replaceText: "",
  isRegex: false,
  caseSensitive: false,
  wholeWord: false,
  isVisible: false,
  results: [],
  currentIndex: 0,

  setQuery: (query) => set({ query }),
  setReplaceText: (replaceText) => set({ replaceText }),
  setIsRegex: (isRegex) => set({ isRegex }),
  setCaseSensitive: (caseSensitive) => set({ caseSensitive }),
  setWholeWord: (wholeWord) => set({ wholeWord }),
  setIsVisible: (isVisible) => set({ isVisible }),
  setResults: (results) => set({ results, currentIndex: 0 }),
  setCurrentIndex: (currentIndex) => set({ currentIndex }),
}));
