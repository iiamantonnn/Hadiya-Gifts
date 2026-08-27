import { useState, type FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import AuthLayout from "../components/layout/AuthLayout";
import Card from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { PasswordInput } from "../components/ui/PasswordInput";
import Button from "../components/ui/Button";
import { useAuth } from "../lib/auth-context";
import { ApiError } from "../lib/api";
import { loginWithPasskey } from "../lib/webauthn";
import { consumePendingInvite } from "../lib/pending-invite";
import { browserSupportsWebAuthn } from "@simplewebauthn/browser";

const DEMO_EMAIL = "alex.israelyan@hadiya.demo";
const DEMO_PASSWORD = "HadiyaDemo123!";

export default function Login() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { login, setUser } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [demoSubmitting, setDemoSubmitting] = useState(false);
  const [passwordRevealed, setPasswordRevealed] = useState(false);
  const [revealing, setRevealing] = useState(false);

  async function performLogin(loginEmail: string, loginPassword: string, remember: boolean) {
    setError(null);
    try {
      await login(loginEmail, loginPassword, remember);
      const pendingInvite = consumePendingInvite();
      navigate(pendingInvite ? `/pair/${pendingInvite}` : "/dashboard");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("common.somethingWentWrong"));
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await performLogin(email, password, rememberMe);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDemoLogin() {
    setEmail(DEMO_EMAIL);
    setPassword(DEMO_PASSWORD);
    setDemoSubmitting(true);
    try {
      await performLogin(DEMO_EMAIL, DEMO_PASSWORD, true);
    } finally {
      setDemoSubmitting(false);
    }
  }

  async function handleRevealPassword() {
    if (passwordRevealed) {
      setPasswordRevealed(false);
      return;
    }
    const platformAvailable =
      typeof PublicKeyCredential !== "undefined" &&
      (await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable().catch(() => false));
    if (!browserSupportsWebAuthn() || !platformAvailable) {
      setPasswordRevealed(true);
      return;
    }
    setRevealing(true);
    try {
      await loginWithPasskey(DEMO_EMAIL);
      setPasswordRevealed(true);
    } catch {
      setPasswordRevealed(true); // graceful fallback: WebAuthn unavailable/no credential/cancelled -> reveal anyway rather than leaving a presenter stuck
    } finally {
      setRevealing(false);
    }
  }

  async function handlePasskey() {
    setError(null);
    try {
      const user = await loginWithPasskey(email || undefined);
      setUser(user);
      const pendingInvite = consumePendingInvite();
      navigate(pendingInvite ? `/pair/${pendingInvite}` : "/dashboard");
    } catch {
      setError(t("auth.passkeyError"));
    }
  }

  return (
    <AuthLayout title={t("auth.loginTitle")}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input label={t("common.email")} type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        <PasswordInput label={t("common.password")} required value={password} onChange={(e) => setPassword(e.target.value)} />

        <div className="flex items-center justify-between text-sm">
          <label className="flex items-center gap-2 text-ink-muted">
            <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} className="h-4 w-4 rounded border-border" />
            {t("common.rememberMe")}
          </label>
          <Link to="/forgot-password" className="font-medium text-forest">{t("common.forgotPassword")}</Link>
        </div>

        {error && <p className="rounded-[var(--radius-control)] bg-error-soft px-4 py-3 text-sm text-error">{error}</p>}

        <Button type="submit" disabled={submitting} className="w-full">
          {submitting ? t("auth.signingIn") : t("common.logIn")}
        </Button>

        {browserSupportsWebAuthn() && (
          <div className="flex flex-col items-center gap-1.5">
            <Button type="button" variant="ghost" onClick={handlePasskey} className="w-full">
              {t("common.loginWithWindowsHello")}
            </Button>
            <p className="text-xs text-ink-faint">{t("auth.passkeyHint")}</p>
          </div>
        )}
      </form>
      <p className="mt-6 text-center text-sm text-ink-muted">
        {t("auth.newToHadiya")} <Link to="/register" className="font-medium text-forest">{t("common.createAccount")}</Link>
      </p>

      <Card className="mt-8">
        <h2 className="font-display text-base font-semibold text-ink">{t("common.demoAccount")}</h2>
        <p className="mt-1 text-sm text-ink-muted">{t("auth.demoAccountHint")}</p>
        <dl className="mt-3 flex flex-col gap-1 text-sm">
          <div className="flex gap-2">
            <dt className="text-ink-faint">{t("common.name")}</dt>
            <dd className="font-medium text-ink">Alex Israelyan</dd>
          </div>
          <div className="flex gap-2">
            <dt className="text-ink-faint">{t("common.email")}</dt>
            <dd className="font-medium text-ink">{DEMO_EMAIL}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="text-ink-faint">{t("common.password")}</dt>
            <dd className="font-medium text-ink">{passwordRevealed ? DEMO_PASSWORD : "••••••••••••"}</dd>
            <button
              type="button"
              onClick={handleRevealPassword}
              disabled={revealing}
              className="text-xs font-medium text-forest hover:underline disabled:opacity-50"
            >
              {passwordRevealed ? t("common.hidePassword") : revealing ? t("auth.verifying") : t("common.showPassword")}
            </button>
          </div>
        </dl>
        <Button
          type="button"
          variant="ghost"
          onClick={handleDemoLogin}
          disabled={demoSubmitting}
          className="mt-4 w-full"
        >
          {demoSubmitting ? t("auth.signingIn") : t("common.useDemoAccount")}
        </Button>
      </Card>
    </AuthLayout>
  );
}
