import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import AuthLayout from "../components/layout/AuthLayout";
import { Input } from "../components/ui/Input";
import Button from "../components/ui/Button";
import { api } from "../lib/api";

export default function ForgotPassword() {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [devResetUrl, setDevResetUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      // No real email provider is configured - the backend hands the reset
      // link back directly instead of only mailing it.
      const result = await api.post<{ dev_reset_url?: string | null }>("/auth/forgot-password", { email });
      setDevResetUrl(result.dev_reset_url || null);
    } finally {
      setSent(true);
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout title={t("auth.forgotPasswordTitle")} subtitle={t("auth.forgotPasswordSubtitle")}>
      {sent ? (
        <div className="flex flex-col gap-3">
          <p className="rounded-[var(--radius-control)] bg-forest-soft px-4 py-3 text-sm text-forest">
            {t("auth.resetLinkSentMessage")}
          </p>
          {devResetUrl && (
            <Link to={devResetUrl.replace(/^https?:\/\/[^/]+/, "")} className="break-all text-sm font-medium text-forest underline">
              {devResetUrl}
            </Link>
          )}
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input label={t("common.email")} type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          <Button type="submit" disabled={submitting} className="w-full">
            {submitting ? t("auth.sending") : t("auth.sendResetLink")}
          </Button>
        </form>
      )}
      <p className="mt-6 text-center text-sm text-ink-muted">
        <Link to="/login" className="font-medium text-forest">{t("auth.backToLogin")}</Link>
      </p>
    </AuthLayout>
  );
}
