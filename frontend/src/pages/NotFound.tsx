import { useTranslation } from "react-i18next";
import Button from "../components/ui/Button";

export default function NotFound() {
  const { t } = useTranslation();
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-ivory text-center">
      <h1 className="font-display text-3xl text-ink">{t("misc.notFound.title")}</h1>
      <p className="text-ink-muted">{t("misc.notFound.message")}</p>
      <Button href="/dashboard">{t("misc.notFound.goHome")}</Button>
    </div>
  );
}
