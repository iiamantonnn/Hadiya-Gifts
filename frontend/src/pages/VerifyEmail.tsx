import { useEffect, useRef, useState, type FormEvent } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import AuthLayout from "../components/layout/AuthLayout";
import { Input } from "../components/ui/Input";
import Button from "../components/ui/Button";
import { api, ApiError } from "../lib/api";
import { useAuth } from "../lib/auth-context";
import { consumePendingInvite } from "../lib/pending-invite";
import type { User } from "../lib/types";

export default function VerifyEmail() {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const state = location.state as { email?: string; code?: string } | null;
  const initialEmail = state?.email || "";
  const initialCode = state?.code || "";

  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState(initialCode);
  const [error, setError] = useState<string | null>(null);
  const [resendMessage, setResendMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const autoSubmitted = useRef(false);

  async function verify(emailValue: string, codeValue: string) {
    setError(null);
    setSubmitting(true);
    try {
      const user = await api.post<User>("/auth/verify-email", { email: emailValue, code: codeValue });
      setUser(user);
      const pendingInvite = consumePendingInvite();
      navigate(pendingInvite ? `/pair/${pendingInvite}` : "/dashboard");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("common.somethingWentWrong"));
    } finally {
      setSubmitting(false);
    }
  }

  function handleVerify(e: FormEvent) {
    e.preventDefault();
    verify(email, code);
  }

  useEffect(() => {
    // No real email provider is configured - registration hands the code
    // back directly (see Register.tsx), so this finishes automatically
    // instead of leaving the user stuck waiting for an email that never arrives.
    if (initialCode && !autoSubmitted.current) {
      autoSubmitted.current = true;
      verify(initialEmail, initialCode);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleResend() {
    setError(null);
    setResendMessage(null);
    try {
      const result = await api.post<{ dev_verification_code?: string }>("/auth/resend-code", { email });
      if (result.dev_verification_code) setCode(result.dev_verification_code);
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
