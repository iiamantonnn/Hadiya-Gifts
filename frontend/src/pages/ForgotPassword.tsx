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
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post("/auth/forgot-password", { email });
    } finally {
      setSent(true);
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout title={t("auth.forgotPasswordTitle")} subtitle={t("auth.forgotPasswordSubtitle")}>
      {sent ? (
        <p className="rounded-[var(--radius-control)] bg-forest-soft px-4 py-3 text-sm text-forest">
          {t("auth.resetLinkSentMessage")}
        </p>
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
