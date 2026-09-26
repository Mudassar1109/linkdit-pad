import { LANGUAGES } from "./languages";

export interface PluralForms {
  zero?: string;
  one?: string;
  two?: string;
  few?: string;
  many?: string;
  other: string;
}

export interface TranslationDict {
  [key: string]: string | PluralForms | TranslationDict;
}

export type TranslationValue = string | PluralForms | TranslationDict;

export interface TranslationVars {
  [name: string]: string | number;
}

function lookup(
  dict: TranslationDict,
  path: string[]
): TranslationValue | undefined {
  let current: TranslationValue = dict;
  for (const segment of path) {
    if (typeof current !== "object" || current === null) return undefined;
    current = (current as TranslationDict)[segment];
  }
  return current;
}

function pluralCategory(locale: string, count: number): string {
  const abs = Math.abs(count);
  if (locale === "ru") {
    const mod10 = abs % 10;
    const mod100 = abs % 100;
    if (mod10 === 1 && mod100 !== 11) return "one";
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return "few";
    return "many";
  }
  if (locale === "ar") {
    const mod100 = abs % 100;
    if (abs === 0) return "zero";
    if (abs === 1) return "one";
    if (abs === 2) return "two";
    if (mod100 >= 3 && mod100 <= 10) return "few";
    if (mod100 >= 11 && mod100 <= 99) return "many";
    return "other";
  }
  return abs === 1 ? "one" : "other";
}

function resolvePlural(
  forms: PluralForms,
  locale: string,
  count: number
): string {
  const category = pluralCategory(locale, count);
  return forms[category as keyof PluralForms] ?? forms.other;
}

function interpolate(
  template: string,
  vars?: TranslationVars
): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (match, name) => {
    const value = vars[name];
    return value === undefined || value === null ? match : String(value);
  });
}

export interface TranslateOptions {
  fallback?: TranslationDict;
}

export function translate(
  language: string,
  key: string,
  vars?: TranslationVars,
  dictionaries?: {
    primary: TranslationDict;
    fallback: TranslationDict;
  }
): string {
  const langInfo = LANGUAGES.find((l) => l.code === language);
  const locale = langInfo?.locale ?? "en";
  const primary = dictionaries?.primary;
  const fallback = dictionaries?.fallback;
  const path = key.split(".");

  const primaryValue = primary ? lookup(primary, path) : undefined;
  const resolved = primaryValue ?? (fallback ? lookup(fallback, path) : undefined);
  if (resolved === undefined) return key;

  if (typeof resolved === "string") {
    return interpolate(resolved, vars);
  }

  if ("other" in resolved && typeof resolved.other === "string") {
    const count = typeof vars?.count === "number" ? vars.count : undefined;
    if (count === undefined) return resolved.other;
    return interpolate(resolvePlural(resolved as PluralForms, locale, count), vars);
  }

  return key;
}