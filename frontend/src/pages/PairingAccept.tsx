import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Button from "../components/ui/Button";
import { Select } from "../components/ui/Input";
import { api, ApiError } from "../lib/api";
import { useAuth } from "../lib/auth-context";
import { setPendingInvite } from "../lib/pending-invite";
import { getTheme } from "../lib/pairing-themes";
import { RELATIONSHIP_TYPES, relationshipEmoji } from "../lib/relationships";
import type { InvitationPreview, Pairing } from "../lib/types";

export default function PairingAccept() {
  const { token } = useParams();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const [preview, setPreview] = useState<InvitationPreview | null>(null);
  const [relationshipType, setRelationshipType] = useState("friend");
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Pairing | null>(null);

  useEffect(() => {
    if (!token) return;
    api.get<InvitationPreview>(`/pairing/invitations/${token}`).then(setPreview).catch(() => setPreview({ valid: false }));
  }, [token]);

  function goAuth(path: "/login" | "/register") {
    if (token) setPendingInvite(token);
    navigate(path);
  }

  async function handleAccept() {
    if (!token) return;
    setAccepting(true);
    setError(null);
    try {
      const pairing = await api.post<Pairing>(`/pairing/invitations/${token}/accept`, { relationship_type: relationshipType });
      setResult(pairing);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("common.somethingWentWrong"));
    } finally {
      setAccepting(false);
    }
  }

  if (preview === null || authLoading) {
    return <div className="flex min-h-screen items-center justify-center bg-ivory text-ink-faint">{t("common.loading")}</div>;
  }

  if (!preview.valid) {
    const message =
      preview.reason === "expired" ? t("pairing.accept.expired") :
      preview.reason === "used" ? t("pairing.accept.used") :
      t("pairing.accept.notFound");
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-ivory px-6 text-center">
        <p className="font-display text-xl text-ink">{message}</p>
        <Button href="/dashboard">{t("pairing.accept.goHome")}</Button>
      </div>
    );
  }

  const theme = getTheme(preview.theme || "minimal");

  if (result) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-ivory px-6 text-center">
        <p className="text-4xl">{relationshipEmoji(relationshipType)}</p>
        <h1 className="font-display text-2xl font-semibold text-ink">{t("pairing.accept.successHeading", { name: preview.creator_name })}</h1>
        <p className="text-sm text-ink-muted">{t("pairing.accept.privacyReminder")}</p>
        <Button href="/people">{t("pairing.accept.goToPeople")}</Button>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-ivory px-6 py-10">
      <div
        className="w-full max-w-sm rounded-[var(--radius-card)] border-2 p-6 text-center"
        style={{ background: `linear-gradient(to bottom, ${theme.bgFrom}, ${theme.bgTo})`, borderColor: theme.border }}
      >
        {theme.corner && <p className="text-2xl" aria-hidden="true">{theme.corner}</p>}
        <h1 className="mt-2 font-display text-xl font-semibold text-ink">
          {t("pairing.accept.headline", { name: preview.creator_name })}
        </h1>

        {!user ? (
          <div className="mt-6 flex flex-col gap-3">
            <p className="text-sm text-ink-muted">{t("pairing.accept.loginPrompt")}</p>
            <Button type="button" onClick={() => goAuth("/login")} className="w-full">{t("pairing.accept.logIn")}</Button>
            <Button type="button" variant="ghost" onClick={() => goAuth("/register")} className="w-full">{t("pairing.accept.createAccount")}</Button>
          </div>
        ) : (
          <div className="mt-6 flex flex-col gap-4 text-left">
            <Select label={t("pairing.accept.relationshipQuestion")} value={relationshipType} onChange={(e) => setRelationshipType(e.target.value)}>
              {RELATIONSHIP_TYPES.map((r) => (
                <option key={r} value={r}>{relationshipEmoji(r)} {t(`people.relationshipTypes.${r}`, r)}</option>
              ))}
            </Select>
            <p className="text-xs text-ink-faint">{t("pairing.accept.privacyReminder")}</p>
            {error && <p className="text-sm text-error">{error}</p>}
            <Button type="button" onClick={handleAccept} disabled={accepting} className="w-full">
              {accepting ? t("pairing.accept.accepting") : t("pairing.accept.accept")}
            </Button>
          </div>
        )}

        <p className="mt-6 text-xs text-ink-faint">
          <Link to="/dashboard" className="underline">{t("pairing.accept.notNow")}</Link>
        </p>
      </div>
    </div>
  );
}
