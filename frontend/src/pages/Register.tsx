import { useState, type FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import AuthLayout from "../components/layout/AuthLayout";
import { Input } from "../components/ui/Input";
import Button from "../components/ui/Button";
import { api, ApiError } from "../lib/api";

export default function Register() {
  const navigate = useNavigate();
  const [fields, setFields] = useState({
    first_name: "", last_name: "", email: "", phone: "", date_of_birth: "",
    password: "", confirm_password: "", username: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function set<K extends keyof typeof fields>(key: K, value: string) {
    setFields((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (fields.password !== fields.confirm_password) {
      setError("Passwords do not match");
      return;
    }
    if (fields.password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    setSubmitting(true);
    try {
      await api.post("/auth/register", {
        ...fields,
        phone: fields.phone || undefined,
        date_of_birth: fields.date_of_birth || undefined,
        username: fields.username || undefined,
      });
      navigate("/verify-email", { state: { email: fields.email } });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout title="Create your account" subtitle="Your date of birth stays private by default.">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3">
          <Input label="First name" required value={fields.first_name} onChange={(e) => set("first_name", e.target.value)} />
          <Input label="Last name" required value={fields.last_name} onChange={(e) => set("last_name", e.target.value)} />
        </div>
        <Input label="Email" type="email" required value={fields.email} onChange={(e) => set("email", e.target.value)} />
        <Input label="Phone (optional)" type="tel" value={fields.phone} onChange={(e) => set("phone", e.target.value)} />
        <Input label="Date of birth (optional)" type="date" value={fields.date_of_birth} onChange={(e) => set("date_of_birth", e.target.value)} />
        <Input label="Username (optional)" value={fields.username} onChange={(e) => set("username", e.target.value)} />
        <Input label="Password" type="password" required minLength={8} value={fields.password} onChange={(e) => set("password", e.target.value)} hint="At least 8 characters" />
        <Input label="Confirm password" type="password" required value={fields.confirm_password} onChange={(e) => set("confirm_password", e.target.value)} />

        {error && <p className="rounded-[var(--radius-control)] bg-error-soft px-4 py-3 text-sm text-error">{error}</p>}

        <Button type="submit" disabled={submitting} className="mt-2 w-full">
          {submitting ? "Creating account..." : "Create account"}
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-ink-muted">
        Already have an account? <Link to="/login" className="font-medium text-forest">Log in</Link>
      </p>
    </AuthLayout>
  );
}
