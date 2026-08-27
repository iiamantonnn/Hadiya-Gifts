import { useState, type FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import AuthLayout from "../components/layout/AuthLayout";
import { Input } from "../components/ui/Input";
import { PasswordInput } from "../components/ui/PasswordInput";
import Button from "../components/ui/Button";
import { api, ApiError } from "../lib/api";

export default function Register() {
  const { t } = useTranslation();
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
      setError(t("auth.passwordsDoNotMatch"));
      return;
    }
    if (fields.password.length < 8) {
      setError(t("auth.passwordTooShort"));
      return;
    }

    setSubmitting(true);
    try {
      const result = await api.post<{ dev_verification_code?: string }>("/auth/register", {
        ...fields,
        phone: fields.phone || undefined,
        date_of_birth: fields.date_of_birth || undefined,
        username: fields.username || undefined,
      });
      // No real email provider is configured - the backend hands the code
      // back directly instead of only mailing it, so registration works
      // without needing a real inbox.
      navigate("/verify-email", { state: { email: fields.email, code: result.dev_verification_code } });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("common.somethingWentWrong"));
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout title={t("auth.registerTitle")} subtitle={t("auth.dobPrivacyNote")}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3">
          <Input label={t("auth.firstName")} required value={fields.first_name} onChange={(e) => set("first_name", e.target.value)} />
          <Input label={t("auth.lastName")} required value={fields.last_name} onChange={(e) => set("last_name", e.target.value)} />
        </div>
        <Input label={t("common.email")} type="email" required value={fields.email} onChange={(e) => set("email", e.target.value)} />
        <Input label={t("auth.phoneOptional")} type="tel" value={fields.phone} onChange={(e) => set("phone", e.target.value)} />
        <Input label={t("auth.dobOptional")} type="date" value={fields.date_of_birth} onChange={(e) => set("date_of_birth", e.target.value)} />
        <Input label={t("auth.usernameOptional")} value={fields.username} onChange={(e) => set("username", e.target.value)} />
        <PasswordInput label={t("common.password")} required minLength={8} value={fields.password} onChange={(e) => set("password", e.target.value)} hint={t("auth.passwordHint")} />
        <PasswordInput label={t("common.confirmPassword")} required value={fields.confirm_password} onChange={(e) => set("confirm_password", e.target.value)} />

        {error && <p className="rounded-[var(--radius-control)] bg-error-soft px-4 py-3 text-sm text-error">{error}</p>}

        <Button type="submit" disabled={submitting} className="mt-2 w-full">
          {submitting ? t("auth.creatingAccount") : t("common.createAccount")}
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-ink-muted">
        {t("auth.alreadyHaveAccount")} <Link to="/login" className="font-medium text-forest">{t("common.logIn")}</Link>
      </p>
    </AuthLayout>
  );
}
