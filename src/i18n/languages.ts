export interface LanguageInfo {
  code: string;
  name: string;
  nativeName: string;
  direction: "ltr" | "rtl";
  locale: string;
}

export const LANGUAGES: LanguageInfo[] = [
  { code: "en", name: "English", nativeName: "English", direction: "ltr", locale: "en" },
  { code: "ur", name: "Urdu", nativeName: "اردو", direction: "rtl", locale: "ur" },
  { code: "zh-CN", name: "Chinese (Simplified)", nativeName: "中文（简体）", direction: "ltr", locale: "zh-CN" },
  { code: "es", name: "Spanish", nativeName: "Español", direction: "ltr", locale: "es" },
  { code: "hi", name: "Hindi", nativeName: "हिन्दी", direction: "ltr", locale: "hi" },
  { code: "ar", name: "Arabic", nativeName: "العربية", direction: "rtl", locale: "ar" },
  { code: "pt", name: "Portuguese", nativeName: "Português", direction: "ltr", locale: "pt" },
  { code: "ru", name: "Russian", nativeName: "Русский", direction: "ltr", locale: "ru" },
  { code: "ja", name: "Japanese", nativeName: "日本語", direction: "ltr", locale: "ja" },
  { code: "de", name: "German", nativeName: "Deutsch", direction: "ltr", locale: "de" },
  { code: "fr", name: "French", nativeName: "Français", direction: "ltr", locale: "fr" },
  { code: "ko", name: "Korean", nativeName: "한국어", direction: "ltr", locale: "ko" },
  { code: "it", name: "Italian", nativeName: "Italiano", direction: "ltr", locale: "it" },
  { code: "tr", name: "Turkish", nativeName: "Türkçe", direction: "ltr", locale: "tr" },
  { code: "id", name: "Indonesian", nativeName: "Bahasa Indonesia", direction: "ltr", locale: "id" },
  { code: "vi", name: "Vietnamese", nativeName: "Tiếng Việt", direction: "ltr", locale: "vi" },
  { code: "bn", name: "Bengali", nativeName: "বাংলা", direction: "ltr", locale: "bn" },
];

export const DEFAULT_LANGUAGE_CODE = "en";

export function getLanguageInfo(code: string): LanguageInfo {
  return LANGUAGES.find((l) => l.code === code) ?? LANGUAGES[0];
}

export function isSupportedLanguage(code: string): boolean {
  return LANGUAGES.some((l) => l.code === code);
}