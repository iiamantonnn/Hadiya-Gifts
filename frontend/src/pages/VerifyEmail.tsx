import { useState, type FormEvent } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import AuthLayout from "../components/layout/AuthLayout";
import { Input } from "../components/ui/Input";
import Button from "../components/ui/Button";
import { api, ApiError } from "../lib/api";
import { useAuth } from "../lib/auth-context";
import type { User } from "../lib/types";

export default function VerifyEmail() {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const initialEmail = (location.state as { email?: string } | null)?.email || "";

  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [resendMessage, setResendMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleVerify(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const user = await api.post<User>("/auth/verify-email", { email, code });
      setUser(user);
      navigate("/dashboard");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("common.somethingWentWrong"));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResend() {
    setError(null);
    setResendMessage(null);
    try {
      await api.post("/auth/resend-code", { email });
      setResendMessage(t("auth.codeSentMessage"));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("auth.resendError"));
    }
  }

  return (
    <AuthLayout title={t("auth.verifyEmailTitle")} subtitle={t("auth.verifyEmailSubtitle")}>
      <form onSubmit={handleVerify} className="flex flex-col gap-4">
        <Input label={t("common.email")} type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        <Input
          label={t("auth.verificationCode")} required inputMode="numeric" maxLength={6}
          value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
        />

        {error && <p className="rounded-[var(--radius-control)] bg-error-soft px-4 py-3 text-sm text-error">{error}</p>}
        {resendMessage && <p className="text-sm text-success">{resendMessage}</p>}

        <Button type="submit" disabled={submitting} className="mt-2 w-full">
          {submitting ? t("auth.verifying") : t("auth.verify")}
        </Button>
        <button type="button" onClick={handleResend} className="text-sm font-medium text-forest">
          {t("auth.resendCode")}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-ink-muted">
        {t("auth.wrongEmail")} <Link to="/register" className="font-medium text-forest">{t("auth.startOver")}</Link>
      </p>
    </AuthLayout>
  );
}
