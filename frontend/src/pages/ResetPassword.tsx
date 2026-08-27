import { useState, type FormEvent } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import AuthLayout from "../components/layout/AuthLayout";
import { PasswordInput } from "../components/ui/PasswordInput";
import Button from "../components/ui/Button";
import { api, ApiError } from "../lib/api";

export default function ResetPassword() {
  const { t } = useTranslation();
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
      setError(t("auth.passwordsDoNotMatch"));
      return;
    }
    setSubmitting(true);
    try {
      await api.post("/auth/reset-password", { token, new_password: newPassword, confirm_password: confirmPassword });
      navigate("/login");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("common.somethingWentWrong"));
      setSubmitting(false);
    }
  }

  if (!token) {
    return (
      <AuthLayout title={t("auth.invalidLinkTitle")}>
        <p className="text-sm text-ink-muted">{t("auth.invalidLinkMessage")}</p>
        <Link to="/forgot-password" className="mt-4 inline-block font-medium text-forest">{t("auth.requestNewLink")}</Link>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title={t("auth.chooseNewPasswordTitle")}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <PasswordInput label={t("auth.newPassword")} required minLength={8} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
        <PasswordInput label={t("common.confirmPassword")} required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
        {error && <p className="rounded-[var(--radius-control)] bg-error-soft px-4 py-3 text-sm text-error">{error}</p>}
        <Button type="submit" disabled={submitting} className="w-full">
          {submitting ? t("auth.updating") : t("auth.updatePassword")}
        </Button>
      </form>
    </AuthLayout>
  );
}
