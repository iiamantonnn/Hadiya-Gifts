import { useState, type FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import AuthLayout from "../components/layout/AuthLayout";
import Card from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import Button from "../components/ui/Button";
import { useAuth } from "../lib/auth-context";
import { ApiError } from "../lib/api";
import { loginWithPasskey } from "../lib/webauthn";
import { browserSupportsWebAuthn } from "@simplewebauthn/browser";

const DEMO_EMAIL = "alex.israelyan@hadiya.demo";
const DEMO_PASSWORD = "HadiyaDemo123!";

export default function Login() {
  const navigate = useNavigate();
  const { login, setUser } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [demoSubmitting, setDemoSubmitting] = useState(false);

  async function performLogin(loginEmail: string, loginPassword: string, remember: boolean) {
    setError(null);
    try {
      await login(loginEmail, loginPassword, remember);
      navigate("/dashboard");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
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

  async function handlePasskey() {
    setError(null);
    try {
      const user = await loginWithPasskey(email || undefined);
      setUser(user);
      navigate("/dashboard");
    } catch {
      setError("Passkey sign-in didn't work. Try your password instead.");
    }
  }

  return (
    <AuthLayout title="Welcome back">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input label="Email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        <Input label="Password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />

        <div className="flex items-center justify-between text-sm">
          <label className="flex items-center gap-2 text-ink-muted">
            <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} className="h-4 w-4 rounded border-border" />
            Remember me
          </label>
          <Link to="/forgot-password" className="font-medium text-forest">Forgot password?</Link>
        </div>

        {error && <p className="rounded-[var(--radius-control)] bg-error-soft px-4 py-3 text-sm text-error">{error}</p>}

        <Button type="submit" disabled={submitting} className="w-full">
          {submitting ? "Signing in..." : "Log In"}
        </Button>

        {browserSupportsWebAuthn() && (
          <Button type="button" variant="ghost" onClick={handlePasskey} className="w-full">
            Use Face ID, Touch ID, or Windows Hello
          </Button>
        )}
      </form>
      <p className="mt-6 text-center text-sm text-ink-muted">
        New to Hadiya? <Link to="/register" className="font-medium text-forest">Create an account</Link>
      </p>

      <Card className="mt-8">
        <h2 className="font-display text-base font-semibold text-ink">Demo Account</h2>
        <p className="mt-1 text-sm text-ink-muted">For presenters - sign in instantly with a preloaded demo account.</p>
        <dl className="mt-3 flex flex-col gap-1 text-sm">
          <div className="flex gap-2">
            <dt className="text-ink-faint">Email</dt>
            <dd className="font-medium text-ink">{DEMO_EMAIL}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="text-ink-faint">Password</dt>
            <dd className="font-medium text-ink">{DEMO_PASSWORD}</dd>
          </div>
        </dl>
        <Button
          type="button"
          variant="ghost"
          onClick={handleDemoLogin}
          disabled={demoSubmitting}
          className="mt-4 w-full"
        >
          {demoSubmitting ? "Signing in..." : "Use Demo Account"}
        </Button>
      </Card>
    </AuthLayout>
  );
}
