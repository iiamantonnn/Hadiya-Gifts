import { useState, type FormEvent } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import AuthLayout from "../components/layout/AuthLayout";
import { Input } from "../components/ui/Input";
import Button from "../components/ui/Button";
import { api, ApiError } from "../lib/api";

export default function ResetPassword() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get("token") || "";

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    setSubmitting(true);
    try {
      await api.post("/auth/reset-password", { token, new_password: newPassword, confirm_password: confirmPassword });
      navigate("/login");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
      setSubmitting(false);
    }
  }

  if (!token) {
    return (
      <AuthLayout title="Invalid link">
        <p className="text-sm text-ink-muted">This reset link is missing its token.</p>
        <Link to="/forgot-password" className="mt-4 inline-block font-medium text-forest">Request a new one</Link>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Choose a new password">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input label="New password" type="password" required minLength={8} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
        <Input label="Confirm password" type="password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
        {error && <p className="rounded-[var(--radius-control)] bg-error-soft px-4 py-3 text-sm text-error">{error}</p>}
        <Button type="submit" disabled={submitting} className="w-full">
          {submitting ? "Updating..." : "Update password"}
        </Button>
      </form>
    </AuthLayout>
  );
}
