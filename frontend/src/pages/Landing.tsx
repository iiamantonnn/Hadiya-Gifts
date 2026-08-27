import { useTranslation } from "react-i18next";
import Button from "../components/ui/Button";

export default function Landing() {
  const { t } = useTranslation();
  return (
    <div className="flex min-h-screen flex-col bg-ivory">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6">
        <span className="font-display text-2xl font-semibold text-forest">Hadiya</span>
        <div className="flex gap-3">
          <Button href="/login" variant="ghost" size="sm">{t("common.logIn")}</Button>
          <Button href="/register" variant="primary" size="sm">{t("common.createAccount")}</Button>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center px-6 py-16 text-center">
        <h1 className="font-display text-5xl font-semibold leading-tight text-ink sm:text-6xl">
          {t("misc.landing.headline")}
        </h1>
        <p className="mt-6 max-w-xl text-lg text-ink-muted">
          {t("misc.landing.description")}
        </p>
        <div className="mt-10 flex flex-col gap-3 sm:flex-row">
          <Button href="/register" size="lg">{t("misc.landing.createAccountCta")}</Button>
          <Button href="/login" variant="ghost" size="lg">{t("misc.landing.alreadyHaveAccount")}</Button>
        </div>
      </main>

      <footer className="border-t border-border py-6 text-center text-sm text-ink-faint">
        {t("misc.landing.footerTagline")}
      </footer>
    </div>
  );
}
