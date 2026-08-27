import i18n from "i18next";
import { initReactI18next } from "react-i18next";

const modules = import.meta.glob("./locales/*/*.json", { eager: true }) as Record<string, { default: Record<string, unknown> }>;

const resources: Record<string, { translation: Record<string, unknown> }> = {};

for (const path in modules) {
  const match = path.match(/\.\/locales\/([a-z]+)\/([a-zA-Z]+)\.json$/);
  if (!match) continue;
  const [, lang, domain] = match;
  resources[lang] = resources[lang] || { translation: {} };
  resources[lang].translation[domain] = modules[path].default;
}

export const SUPPORTED_LANGUAGES = [
  { code: "en", label: "English", dir: "ltr" },
  { code: "ru", label: "Русский", dir: "ltr" },
  { code: "hy", label: "Հայերեն", dir: "ltr" },
  { code: "ar", label: "العربية", dir: "rtl" },
  { code: "zh", label: "中文", dir: "ltr" },
] as const;

export type LanguageCode = (typeof SUPPORTED_LANGUAGES)[number]["code"];

function getInitialLanguage(): LanguageCode {
  const stored = localStorage.getItem("hadiya_locale");
  if (stored && SUPPORTED_LANGUAGES.some((l) => l.code === stored)) return stored as LanguageCode;
  return "en";
}

const initialLang = getInitialLanguage();

i18n.use(initReactI18next).init({
  resources,
  lng: initialLang,
  fallbackLng: "en",
  interpolation: { escapeValue: false },
});

export function setAppLanguage(code: LanguageCode) {
  i18n.changeLanguage(code);
  localStorage.setItem("hadiya_locale", code);
  const dir = SUPPORTED_LANGUAGES.find((l) => l.code === code)?.dir || "ltr";
  document.documentElement.dir = dir;
  document.documentElement.lang = code;
}

setAppLanguage(initialLang);

export default i18n;
