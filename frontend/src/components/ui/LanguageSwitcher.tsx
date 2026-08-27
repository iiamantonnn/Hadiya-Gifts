import { useTranslation } from "react-i18next";
import { SUPPORTED_LANGUAGES, setAppLanguage, type LanguageCode } from "../../i18n";
import { useAuth } from "../../lib/auth-context";

export default function LanguageSwitcher({ className = "" }: { className?: string }) {
  const { i18n } = useTranslation();
  const { user, updateLocale } = useAuth();
  return (
    <select
      value={i18n.language}
      onChange={(e) => {
        const code = e.target.value as LanguageCode;
        setAppLanguage(code);
        if (user) updateLocale(code);
      }}
      aria-label="Language"
      className={"rounded-[var(--radius-control)] border border-border bg-surface px-2 py-1 text-sm text-ink-muted " + className}
    >
      {SUPPORTED_LANGUAGES.map((l) => (
        <option key={l.code} value={l.code}>{l.label}</option>
      ))}
    </select>
  );
}
