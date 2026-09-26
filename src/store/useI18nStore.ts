import { create } from "zustand";
import {
  makeTranslator,
  normalizeLanguage,
  applyLocaleToDocument,
  type TranslateFn,
} from "@/i18n";
import { getLanguageInfo } from "@/i18n/languages";
import { useSettingsStore } from "./useSettingsStore";

interface I18nState {
  language: string;
  dir: "ltr" | "rtl";
  t: TranslateFn;
  setLanguage: (code: string) => void;
}

function initialLanguage(): string {
  return normalizeLanguage(useSettingsStore.getState().general.language);
}

export const useI18nStore = create<I18nState>((set) => {
  const language = initialLanguage();
  applyLocaleToDocument(language);
  return {
    language,
    dir: getLanguageInfo(language).direction,
    t: makeTranslator(language),
    setLanguage: (code) => {
      const normalized = normalizeLanguage(code);
      useSettingsStore.getState().setGeneral({ language: normalized });
      applyLocaleToDocument(normalized);
      const t = makeTranslator(normalized);
      set({ language: normalized, dir: getLanguageInfo(normalized).direction, t });
    },
  };
});

export function useI18n() {
  return useI18nStore();
}