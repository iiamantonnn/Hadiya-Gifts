import { useState, type FormEvent } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import AuthLayout from "../components/layout/AuthLayout";
import { Input } from "../components/ui/Input";
import Button from "../components/ui/Button";
import { api, ApiError } from "../lib/api";
import { useAuth } from "../lib/auth-context";
import type { User } from "../lib/types";

export default function VerifyEmail() {
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
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResend() {
    setError(null);
    setResendMessage(null);
    try {
      await api.post("/auth/resend-code", { email });
      setResendMessage("A new code has been sent.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not resend the code.");
    }
  }

  return (
    <AuthLayout title="Verify your email" subtitle="Enter the 6-digit code we sent you.">
      <form onSubmit={handleVerify} className="flex flex-col gap-4">
        <Input label="Email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        <Input
          label="Verification code" required inputMode="numeric" maxLength={6}
          value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
        />

        {error && <p className="rounded-[var(--radius-control)] bg-error-soft px-4 py-3 text-sm text-error">{error}</p>}
        {resendMessage && <p className="text-sm text-success">{resendMessage}</p>}

        <Button type="submit" disabled={submitting} className="mt-2 w-full">
          {submitting ? "Verifying..." : "Verify"}
        </Button>
        <button type="button" onClick={handleResend} className="text-sm font-medium text-forest">
          Resend code
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-ink-muted">
        Wrong email? <Link to="/register" className="font-medium text-forest">Start over</Link>
      </p>
    </AuthLayout>
  );
}
