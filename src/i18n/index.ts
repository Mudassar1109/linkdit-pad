import type { TranslationDict } from "./translate";
import { translate } from "./translate";
import { DEFAULT_LANGUAGE_CODE, getLanguageInfo, isSupportedLanguage } from "./languages";

import en from "./translations/en";
import ur from "./translations/ur";
import zhCN from "./translations/zh-CN";
import es from "./translations/es";
import hi from "./translations/hi";
import ar from "./translations/ar";
import pt from "./translations/pt";
import ru from "./translations/ru";
import ja from "./translations/ja";
import de from "./translations/de";
import fr from "./translations/fr";
import ko from "./translations/ko";
import it from "./translations/it";
import tr from "./translations/tr";
import id from "./translations/id";
import vi from "./translations/vi";
import bn from "./translations/bn";

export const DICTIONARIES: Record<string, TranslationDict> = {
  en,
  ur,
  "zh-CN": zhCN,
  es,
  hi,
  ar,
  pt,
  ru,
  ja,
  de,
  fr,
  ko,
  it,
  tr,
  id,
  vi,
  bn,
};

export function normalizeLanguage(code: string | null | undefined): string {
  if (code && isSupportedLanguage(code)) return code;
  return DEFAULT_LANGUAGE_CODE;
}

export function applyLocaleToDocument(code: string): void {
  const info = getLanguageInfo(code);
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("lang", info.locale);
  document.documentElement.setAttribute("dir", info.direction);
}

export interface TranslateFn {
  (key: string, vars?: Record<string, string | number>): string;
}

export function makeTranslator(language: string): TranslateFn {
  return (key, vars) => {
    const dict = DICTIONARIES[language] ?? DICTIONARIES[DEFAULT_LANGUAGE_CODE];
    const out = translate(language, key, vars, {
      primary: dict,
      fallback: DICTIONARIES[DEFAULT_LANGUAGE_CODE],
    });
    if (out === key && typeof import.meta !== "undefined" && import.meta.env?.DEV) {
      console.warn(`[i18n] missing translation key "${key}" for "${language}" — raw key would be shown`);
    }
    return out;
  };
}

export function formatNumber(language: string, value: number): string {
  const info = getLanguageInfo(language);
  try {
    return new Intl.NumberFormat(info.locale).format(value);
  } catch {
    return String(value);
  }
}

export function formatDate(language: string, date: string | number | Date): string {
  const info = getLanguageInfo(language);
  try {
    return new Intl.DateTimeFormat(info.locale, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(date));
  } catch {
    return new Date(date).toLocaleString();
  }
}

export function collectKeys(dict: TranslationDict, prefix = ""): string[] {
  const out: string[] = [];
  for (const [key, value] of Object.entries(dict)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === "string") {
      out.push(path);
    } else if (typeof value === "object") {
      if (
        ("other" in value && typeof value.other === "string") ||
        ("one" in value || "zero" in value)
      ) {
        out.push(path);
      } else {
        out.push(...collectKeys(value as TranslationDict, path));
      }
    }
  }
  return out;
}

export function validateTranslations(): { missing: Record<string, string[]>; extra: string[] } {
  const enKeys = new Set(collectKeys(DICTIONARIES[DEFAULT_LANGUAGE_CODE]));
  const missing: Record<string, string[]> = {};
  const extra: string[] = [];

  for (const [code, dict] of Object.entries(DICTIONARIES)) {
    if (code === DEFAULT_LANGUAGE_CODE) continue;
    const keys = new Set(collectKeys(dict));
    const missingKeys = [...enKeys].filter((k) => !keys.has(k));
    if (missingKeys.length > 0) missing[code] = missingKeys;
    for (const k of keys) {
      if (!enKeys.has(k) && !extra.includes(k)) extra.push(k);
    }
  }
  return { missing, extra };
}