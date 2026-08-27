import { useEffect, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import PairingInviteCard from "../components/pairing/PairingInviteCard";
import { api, ApiError } from "../lib/api";
import { useAuth } from "../lib/auth-context";
import { PAIRING_THEMES } from "../lib/pairing-themes";
import type { Pairing as PairingType, PairingInvitation } from "../lib/types";

export default function Pairing() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [pairings, setPairings] = useState<PairingType[]>([]);
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [theme, setTheme] = useState("minimal");
  const [invitation, setInvitation] = useState<PairingInvitation | null>(null);
  const [creating, setCreating] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);

  function load() {
    api.get<PairingType[]>("/pairing").then(setPairings).catch(() => {});
  }
  useEffect(load, []);

  async function createInvitation() {
    setCreating(true);
    setInviteError(null);
    try {
      const inv = await api.post<PairingInvitation>("/pairing/invitations", { theme });
      setInvitation(inv);
    } catch (err) {
      setInviteError(err instanceof ApiError ? err.message : t("pairing.invite.error"));
    } finally {
      setCreating(false);
    }
  }

  async function sendRequest(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    try {
      await api.post("/pairing/request", { recipient_email: email });
      setMessage(t("pairing.sendRequest.sent"));
      setEmail("");
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("pairing.sendRequest.error"));
    }
  }

  async function respond(id: string, action: "accept" | "decline") {
    await api.post(`/pairing/${id}/${action}`);
    load();
  }

  async function end(id: string) {
    if (!confirm(t("pairing.endConfirm"))) return;
    await api.post(`/pairing/${id}/end`);
    load();
  }

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="font-display text-2xl font-semibold text-ink">{t("pairing.title")}</h1>
      <p className="mt-1 text-sm text-ink-muted">{t("pairing.subtitle")}</p>

      <Card className="mt-6">
        <h2 className="font-display text-lg font-semibold text-ink">{t("pairing.invite.title")}</h2>
        <p className="mt-1 text-xs text-ink-faint">{t("pairing.invite.hint")}</p>

        {!invitation ? (
          <div className="mt-4 flex flex-col gap-4">
            <div>
              <p className="mb-2 text-sm font-medium text-ink-muted">{t("pairing.invite.themeLabel")}</p>
              <div className="flex flex-wrap gap-2">
                {PAIRING_THEMES.map((th) => (
                  <button
                    key={th.id}
                    type="button"
                    onClick={() => setTheme(th.id)}
                    className={`rounded-full border px-3 py-1.5 text-sm ${
                      theme === th.id ? "border-forest bg-forest-soft text-forest" : "border-border text-ink-muted hover:bg-ivory"
                    }`}
                  >
                    {th.corner && <span className="mr-1">{th.corner}</span>}
                    {t(`pairing.invite.themes.${th.id}`, th.id)}
                  </button>
                ))}
              </div>
            </div>
            {inviteError && <p className="text-sm text-error">{inviteError}</p>}
            <Button type="button" onClick={createInvitation} disabled={creating} className="self-start">
              {creating ? t("pairing.invite.creating") : t("pairing.invite.generate")}
            </Button>
          </div>
        ) : (
          <div className="mt-4 flex flex-col items-center gap-4">
            <PairingInviteCard invitation={invitation} creatorName={user?.preferred_name || user?.first_name || ""} />
            <button type="button" onClick={() => setInvitation(null)} className="text-sm text-ink-faint hover:text-ink">
              {t("pairing.invite.startOver")}
            </button>
          </div>
        )}
      </Card>

      <Card className="mt-6">
        <h2 className="font-display text-lg font-semibold text-ink">{t("pairing.sendRequest.title")}</h2>
        <form onSubmit={sendRequest} className="mt-3 flex gap-2">
          <div className="flex-1">
            <Input type="email" required placeholder={t("pairing.sendRequest.placeholder")} value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <Button type="submit">{t("pairing.sendRequest.send")}</Button>
        </form>
        {message && <p className="mt-2 text-sm text-success">{message}</p>}
        {error && <p className="mt-2 text-sm text-error">{error}</p>}
      </Card>

      <div className="mt-6 flex flex-col gap-3">
        {pairings.map((p) => (
          <Card key={p.id} className="flex items-center justify-between">
            <div>
              <p className="text-sm text-ink">
                {p.other_user_name}{" "}
                <span className="text-ink-faint">
                  {p.direction === "incoming" && p.status === "pending" ? t("pairing.incomingRequest") : ""}
                </span>
              </p>
              <p className="text-xs capitalize text-ink-faint">{t(`pairing.status.${p.status}`, { defaultValue: p.status })}</p>
            </div>
            <div className="flex gap-2">
              {p.status === "pending" && p.direction === "incoming" && (
                <>
                  <Button size="sm" onClick={() => respond(p.id, "accept")}>{t("pairing.acceptRequest")}</Button>
                  <Button size="sm" variant="ghost" onClick={() => respond(p.id, "decline")}>{t("pairing.decline")}</Button>
                </>
              )}
              {p.status === "accepted" && (
                <Button size="sm" variant="danger" onClick={() => end(p.id)}>{t("pairing.endPairing")}</Button>
              )}
            </div>
          </Card>
        ))}
        {pairings.length === 0 && <p className="text-center text-sm text-ink-faint">{t("pairing.emptyState")}</p>}
      </div>
    </div>
  );
}
