import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import AuthLayout from "../components/layout/AuthLayout";
import { Input } from "../components/ui/Input";
import Button from "../components/ui/Button";
import { api } from "../lib/api";

export default function ForgotPassword() {
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
    <AuthLayout title="Reset your password" subtitle="We'll email you a link to reset it.">
      {sent ? (
        <p className="rounded-[var(--radius-control)] bg-forest-soft px-4 py-3 text-sm text-forest">
          If an account exists for that email, a reset link is on its way.
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input label="Email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          <Button type="submit" disabled={submitting} className="w-full">
            {submitting ? "Sending..." : "Send reset link"}
          </Button>
        </form>
      )}
      <p className="mt-6 text-center text-sm text-ink-muted">
        <Link to="/login" className="font-medium text-forest">Back to log in</Link>
      </p>
    </AuthLayout>
  );
}
