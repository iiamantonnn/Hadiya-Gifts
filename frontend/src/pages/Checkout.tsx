import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import { Input, Select, Textarea } from "../components/ui/Input";
import VoiceRecorder from "../components/checkout/VoiceRecorder";
import { api, ApiError } from "../lib/api";
import { formatPrice } from "../lib/format";
import { todayDateStr } from "../lib/date-helpers";
import type { Person, Flower, Address, DeliveryWindow } from "../lib/types";

const OCCASIONS = ["birthday", "anniversary", "friendship", "thank_you", "congratulations", "romantic", "sympathy", "just_because", "other"];
const STEP_KEYS = ["recipient", "bouquet", "occasion", "delivery", "address", "privacy", "cardVoice", "review"];

function label(v: string) {
  return v.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());
}

export default function Checkout() {
  const { t } = useTranslation();
  const [params] = useSearchParams();

  const [step, setStep] = useState(0);
  const [people, setPeople] = useState<Person[]>([]);
  const [flowers, setFlowers] = useState<Flower[]>([]);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [windows, setWindows] = useState<DeliveryWindow[]>([]);

  const [recipientId, setRecipientId] = useState(params.get("person_id") || "");
  const [flowerId, setFlowerId] = useState(params.get("flower_id") || "");
  const [size, setSize] = useState("");
  const [color, setColor] = useState("");
  const [occasion, setOccasion] = useState("");
  const [deliveryDate, setDeliveryDate] = useState(todayDateStr());
  const [window_, setWindow] = useState<{ start: string; end: string } | null>(null);
  const [addressId, setAddressId] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [cardType, setCardType] = useState<"none" | "physical" | "digital" | "both">("digital");
  const [cardText, setCardText] = useState("");
  const [aiGenerate, setAiGenerate] = useState(false);
  const [voiceBlob, setVoiceBlob] = useState<Blob | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState<{ id: string; gift_token: string } | null>(null);

  const flower = flowers.find((f) => f.id === flowerId) || null;
  const recipient = people.find((p) => p.id === recipientId) || null;
  const address = addresses.find((a) => a.id === addressId) || null;

  function occasionLabel(o: string) {
    return t(`checkout.occasions.${o}`, { defaultValue: label(o) });
  }

  useEffect(() => {
    api.get<Person[]>("/people").then(setPeople).catch(() => {});
    api.get<Flower[]>("/flowers").then(setFlowers).catch(() => {});
    api.get<Address[]>("/users/me/addresses").then((rows) => {
      setAddresses(rows);
      const def = rows.find((a) => a.is_default);
      if (def) setAddressId(def.id);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!deliveryDate) return;
    api.get<DeliveryWindow[]>(`/orders/delivery-windows?for_date=${deliveryDate}`).then(setWindows).catch(() => setWindows([]));
    setWindow(null);
  }, [deliveryDate]);

  function next() { setStep((s) => Math.min(s + 1, STEP_KEYS.length - 1)); }
  function back() { setStep((s) => Math.max(s - 1, 0)); }

  async function handleConfirm() {
    if (!recipientId || !flowerId || !window_ || !addressId) {
      setError(t("checkout.errors.completeAllSteps"));
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const order = await api.post<{ id: string; gift_token: string }>("/orders", {
        recipient_person_id: recipientId,
        flower_id: flowerId,
        size: size || undefined,
        color: color || undefined,
        occasion: occasion || undefined,
        delivery_date: deliveryDate,
        delivery_window_start: window_.start,
        delivery_window_end: window_.end,
        address_id: addressId,
        is_anonymous: isAnonymous,
        card: { card_type: cardType, text: cardText || undefined, ai_generate: aiGenerate },
      });

      if (voiceBlob) {
        const form = new FormData();
        form.append("file", voiceBlob, "voice.webm");
        await api.postForm(`/orders/${order.id}/voice-message`, form).catch(() => {
          // Order already placed - a failed voice upload shouldn't block confirmation.
        });
      }

      setConfirmed(order);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("common.somethingWentWrong"));
    } finally {
      setSubmitting(false);
    }
  }

  if (confirmed) {
    return (
      <div className="mx-auto max-w-lg text-center">
        <h1 className="font-display text-3xl font-semibold text-ink">{t("checkout.confirmed.heading")}</h1>
        <p className="mt-3 text-ink-muted">{t("checkout.confirmed.body")}</p>
        <Card className="mt-6">
          <p className="break-all font-mono text-sm text-forest">{window.location.origin}/gift/{confirmed.gift_token}</p>
        </Card>
        <div className="mt-6 flex justify-center gap-3">
          <Button href="/gift-history">{t("checkout.confirmed.viewHistory")}</Button>
          <Button href="/dashboard" variant="ghost">{t("checkout.confirmed.backToDashboard")}</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl">
      <div className="mb-6 flex flex-wrap gap-1 text-xs text-ink-faint">
        {STEP_KEYS.map((key, i) => (
          <span key={key} className={`rounded-full px-2.5 py-1 ${i === step ? "bg-forest text-white" : i < step ? "bg-forest-soft text-forest" : "bg-ivory"}`}>
            {t(`checkout.steps.${key}`)}
          </span>
        ))}
      </div>

      <Card>
        {step === 0 && (
          <div className="flex flex-col gap-4">
            <h2 className="font-display text-xl font-semibold text-ink">{t("checkout.step0.heading")}</h2>
            {people.length === 0 ? (
              <p className="text-sm text-ink-muted">{t("checkout.step0.addPeopleFirst")}</p>
            ) : (
              <Select value={recipientId} onChange={(e) => setRecipientId(e.target.value)}>
                <option value="">{t("checkout.step0.choosePerson")}</option>
                {people.map((p) => <option key={p.id} value={p.id}>{p.name} - {p.relationship_type}</option>)}
              </Select>
            )}
          </div>
        )}

        {step === 1 && (
          <div className="flex flex-col gap-4">
            <h2 className="font-display text-xl font-semibold text-ink">{t("checkout.step1.heading")}</h2>
            <Select value={flowerId} onChange={(e) => { setFlowerId(e.target.value); setSize(""); setColor(""); }}>
              <option value="">{t("checkout.step1.heading")}</option>
              {flowers.map((f) => <option key={f.id} value={f.id}>{f.name} - {formatPrice(f.price_cents)}</option>)}
            </Select>
            {flower && (
              <div className="grid grid-cols-2 gap-3">
                <Select label={t("checkout.step1.sizeLabel")} value={size} onChange={(e) => setSize(e.target.value)}>
                  <option value="">{t("checkout.any")}</option>
                  {flower.sizes.map((s) => <option key={s} value={s}>{label(s)}</option>)}
                </Select>
                <Select label={t("checkout.step1.colorLabel")} value={color} onChange={(e) => setColor(e.target.value)}>
                  <option value="">{t("checkout.any")}</option>
                  {flower.colors.map((c) => <option key={c} value={c}>{label(c)}</option>)}
                </Select>
              </div>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="flex flex-col gap-4">
            <h2 className="font-display text-xl font-semibold text-ink">{t("checkout.step2.heading")}</h2>
            <Select value={occasion} onChange={(e) => setOccasion(e.target.value)}>
              <option value="">{t("checkout.step2.choosePlaceholder")}</option>
              {OCCASIONS.map((o) => <option key={o} value={o}>{occasionLabel(o)}</option>)}
            </Select>
          </div>
        )}

        {step === 3 && (
          <div className="flex flex-col gap-4">
            <h2 className="font-display text-xl font-semibold text-ink">{t("checkout.step3.heading")}</h2>
            <Input label={t("checkout.step3.deliveryDateLabel")} type="date" min={todayDateStr()} value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} />
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {windows.map((w) => (
                <button
                  key={w.start}
                  type="button"
                  disabled={!w.bookable}
                  onClick={() => setWindow(w)}
                  className={`rounded-[var(--radius-control)] border px-3 py-2 font-mono text-sm ${
                    !w.bookable ? "cursor-not-allowed opacity-40" :
                    window_?.start === w.start ? "border-forest bg-forest-soft text-forest" : "border-border text-ink hover:bg-ivory"
                  }`}
                >
                  {w.start} - {w.end}
                </button>
              ))}
            </div>
            <p className="text-xs text-ink-faint">{t("checkout.step3.hoursNotice")}</p>
          </div>
        )}

        {step === 4 && (
          <div className="flex flex-col gap-4">
            <h2 className="font-display text-xl font-semibold text-ink">{t("checkout.step4.heading")}</h2>
            {addresses.length === 0 ? (
              <p className="text-sm text-ink-muted">{t("checkout.step4.addAddressFirst")}</p>
            ) : (
              <Select value={addressId} onChange={(e) => setAddressId(e.target.value)}>
                <option value="">{t("checkout.step4.choosePlaceholder")}</option>
                {addresses.map((a) => <option key={a.id} value={a.id}>{a.label} - {a.line1}, {a.city}</option>)}
              </Select>
            )}
          </div>
        )}

        {step === 5 && (
          <div className="flex flex-col gap-4">
            <h2 className="font-display text-xl font-semibold text-ink">{t("checkout.step5.heading")}</h2>
            <label className="flex items-center gap-3 text-sm text-ink">
              <input type="checkbox" checked={!isAnonymous} onChange={(e) => setIsAnonymous(!e.target.checked)} className="h-5 w-5" />
              {t("checkout.step5.consent", { name: recipient?.name || t("checkout.step5.them") })}
            </label>
            {isAnonymous && <p className="text-xs text-ink-faint">{t("checkout.step5.anonymousNote")}</p>}
          </div>
        )}

        {step === 6 && (
          <div className="flex flex-col gap-4">
            <h2 className="font-display text-xl font-semibold text-ink">{t("checkout.step6.heading")}</h2>
            <Select label={t("checkout.step6.cardLabel")} value={cardType} onChange={(e) => setCardType(e.target.value as typeof cardType)}>
              <option value="none">{t("checkout.cardType.none")}</option>
              <option value="physical">{t("checkout.cardType.physical")}</option>
              <option value="digital">{t("checkout.cardType.digital")}</option>
              <option value="both">{t("checkout.cardType.both")}</option>
            </Select>
            {cardType !== "none" && (
              <>
                <Textarea label={t("checkout.step6.messageLabel")} value={cardText} onChange={(e) => setCardText(e.target.value)} placeholder={t("checkout.step6.messagePlaceholder")} />
                <label className="flex items-center gap-2 text-sm text-ink-muted">
                  <input type="checkbox" checked={aiGenerate} onChange={(e) => setAiGenerate(e.target.checked)} className="h-4 w-4" />
                  {t("checkout.step6.aiSuggest")} {cardText && t("checkout.step6.aiSuggestReplace")}
                </label>
              </>
            )}
            <VoiceRecorder onChange={setVoiceBlob} />
          </div>
        )}

        {step === 7 && (
          <div className="flex flex-col gap-3 text-sm">
            <h2 className="font-display text-xl font-semibold text-ink">{t("checkout.review.heading")}</h2>
            <p><span className="text-ink-muted">{t("checkout.review.to")}</span> {recipient?.name}</p>
            <p><span className="text-ink-muted">{t("checkout.review.bouquet")}</span> {flower?.name} {flower && `(${formatPrice(flower.price_cents)})`}</p>
            <p><span className="text-ink-muted">{t("checkout.review.occasion")}</span> {occasion ? occasionLabel(occasion) : t("checkout.notSet")}</p>
            <p><span className="text-ink-muted">{t("checkout.review.delivery")}</span> {deliveryDate} {window_ && `${window_.start}-${window_.end}`}</p>
            <p><span className="text-ink-muted">{t("checkout.review.address")}</span> {address ? `${address.line1}, ${address.city}` : t("checkout.notSet")}</p>
            <p><span className="text-ink-muted">{t("checkout.review.from")}</span> {isAnonymous ? t("checkout.review.anonymous") : t("checkout.review.visibleToRecipient")}</p>
            {error && <p className="text-error">{error}</p>}
            <Button onClick={handleConfirm} disabled={submitting} className="mt-2 w-full">
              {submitting ? t("checkout.review.sending") : t("checkout.review.confirmGift")}
            </Button>
          </div>
        )}

        <div className="mt-6 flex justify-between">
          <Button variant="ghost" onClick={back} disabled={step === 0}>{t("checkout.back")}</Button>
          {step < STEP_KEYS.length - 1 && <Button onClick={next}>{t("checkout.next")}</Button>}
        </div>
      </Card>
    </div>
  );
}
