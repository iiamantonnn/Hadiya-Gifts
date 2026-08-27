import { useEffect, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { api, ApiError } from "../lib/api";
import type { Pairing as PairingType } from "../lib/types";

export default function Pairing() {
  const { t } = useTranslation();
  const [pairings, setPairings] = useState<PairingType[]>([]);
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function load() {
    api.get<PairingType[]>("/pairing").then(setPairings).catch(() => {});
  }
  useEffect(load, []);

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
              <p className="text-sm text-ink">{p.direction === "incoming" ? t("pairing.incomingRequest") : t("pairing.requestSent")}</p>
              <p className="text-xs capitalize text-ink-faint">{t(`pairing.status.${p.status}`, { defaultValue: p.status })}</p>
            </div>
            <div className="flex gap-2">
              {p.status === "pending" && p.direction === "incoming" && (
                <>
                  <Button size="sm" onClick={() => respond(p.id, "accept")}>{t("pairing.accept")}</Button>
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
