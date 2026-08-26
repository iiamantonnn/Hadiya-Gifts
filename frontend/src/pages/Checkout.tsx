import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import { Input, Select, Textarea } from "../components/ui/Input";
import VoiceRecorder from "../components/checkout/VoiceRecorder";
import { api, ApiError } from "../lib/api";
import { formatPrice } from "../lib/format";
import { todayDateStr } from "../lib/date-helpers";
import type { Person, Flower, Address, DeliveryWindow } from "../lib/types";

const OCCASIONS = ["birthday", "anniversary", "friendship", "thank_you", "congratulations", "romantic", "sympathy", "just_because", "other"];
const STEPS = ["Recipient", "Bouquet", "Occasion", "Delivery", "Address", "Privacy", "Card & Voice", "Review"];

function label(v: string) {
  return v.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());
}

export default function Checkout() {
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

  function next() { setStep((s) => Math.min(s + 1, STEPS.length - 1)); }
  function back() { setStep((s) => Math.max(s - 1, 0)); }

  async function handleConfirm() {
    if (!recipientId || !flowerId || !window_ || !addressId) {
      setError("Please complete every step before confirming.");
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
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (confirmed) {
    return (
      <div className="mx-auto max-w-lg text-center">
        <h1 className="font-display text-3xl font-semibold text-ink">Your gift is on its way to becoming real</h1>
        <p className="mt-3 text-ink-muted">We'll take care of the rest. Here's the private gift page - share it however you'd like, or let the recipient discover it.</p>
        <Card className="mt-6">
          <p className="break-all font-mono text-sm text-forest">{window.location.origin}/gift/{confirmed.gift_token}</p>
        </Card>
        <div className="mt-6 flex justify-center gap-3">
          <Button href="/gift-history">View gift history</Button>
          <Button href="/dashboard" variant="ghost">Back to dashboard</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl">
      <div className="mb-6 flex flex-wrap gap-1 text-xs text-ink-faint">
        {STEPS.map((s, i) => (
          <span key={s} className={`rounded-full px-2.5 py-1 ${i === step ? "bg-forest text-white" : i < step ? "bg-forest-soft text-forest" : "bg-ivory"}`}>
            {s}
          </span>
        ))}
      </div>

      <Card>
        {step === 0 && (
          <div className="flex flex-col gap-4">
            <h2 className="font-display text-xl font-semibold text-ink">Who is this for?</h2>
            {people.length === 0 ? (
              <p className="text-sm text-ink-muted">Add someone to My People first.</p>
            ) : (
              <Select value={recipientId} onChange={(e) => setRecipientId(e.target.value)}>
                <option value="">Choose a person</option>
                {people.map((p) => <option key={p.id} value={p.id}>{p.name} - {p.relationship_type}</option>)}
              </Select>
            )}
          </div>
        )}

        {step === 1 && (
          <div className="flex flex-col gap-4">
            <h2 className="font-display text-xl font-semibold text-ink">Choose a bouquet</h2>
            <Select value={flowerId} onChange={(e) => { setFlowerId(e.target.value); setSize(""); setColor(""); }}>
              <option value="">Choose a bouquet</option>
              {flowers.map((f) => <option key={f.id} value={f.id}>{f.name} - {formatPrice(f.price_cents)}</option>)}
            </Select>
            {flower && (
              <div className="grid grid-cols-2 gap-3">
                <Select label="Size" value={size} onChange={(e) => setSize(e.target.value)}>
                  <option value="">Any</option>
                  {flower.sizes.map((s) => <option key={s} value={s}>{label(s)}</option>)}
                </Select>
                <Select label="Color" value={color} onChange={(e) => setColor(e.target.value)}>
                  <option value="">Any</option>
                  {flower.colors.map((c) => <option key={c} value={c}>{label(c)}</option>)}
                </Select>
              </div>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="flex flex-col gap-4">
            <h2 className="font-display text-xl font-semibold text-ink">What's the occasion?</h2>
            <Select value={occasion} onChange={(e) => setOccasion(e.target.value)}>
              <option value="">Choose an occasion</option>
              {OCCASIONS.map((o) => <option key={o} value={o}>{label(o)}</option>)}
            </Select>
          </div>
        )}

        {step === 3 && (
          <div className="flex flex-col gap-4">
            <h2 className="font-display text-xl font-semibold text-ink">When should it arrive?</h2>
            <Input label="Delivery date" type="date" min={todayDateStr()} value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} />
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
            <p className="text-xs text-ink-faint">Deliveries are only scheduled between 6am and 11pm, for our couriers' safety.</p>
          </div>
        )}

        {step === 4 && (
          <div className="flex flex-col gap-4">
            <h2 className="font-display text-xl font-semibold text-ink">Delivery address</h2>
            {addresses.length === 0 ? (
              <p className="text-sm text-ink-muted">Add a delivery address in Settings first.</p>
            ) : (
              <Select value={addressId} onChange={(e) => setAddressId(e.target.value)}>
                <option value="">Choose an address</option>
                {addresses.map((a) => <option key={a.id} value={a.id}>{a.label} - {a.line1}, {a.city}</option>)}
              </Select>
            )}
          </div>
        )}

        {step === 5 && (
          <div className="flex flex-col gap-4">
            <h2 className="font-display text-xl font-semibold text-ink">Show my identity?</h2>
            <label className="flex items-center gap-3 text-sm text-ink">
              <input type="checkbox" checked={!isAnonymous} onChange={(e) => setIsAnonymous(!e.target.checked)} className="h-5 w-5" />
              Yes, let {recipient?.name || "them"} know it's from me
            </label>
            {isAnonymous && <p className="text-xs text-ink-faint">Your identity will be hidden from the recipient - it's never hidden from you.</p>}
          </div>
        )}

        {step === 6 && (
          <div className="flex flex-col gap-4">
            <h2 className="font-display text-xl font-semibold text-ink">A card, a message, a voice</h2>
            <Select label="Card" value={cardType} onChange={(e) => setCardType(e.target.value as typeof cardType)}>
              <option value="none">No card</option>
              <option value="physical">Physical card</option>
              <option value="digital">Digital message</option>
              <option value="both">Both</option>
            </Select>
            {cardType !== "none" && (
              <>
                <Textarea label="Message" value={cardText} onChange={(e) => setCardText(e.target.value)} placeholder="Write something, or let Hadiya suggest one." />
                <label className="flex items-center gap-2 text-sm text-ink-muted">
                  <input type="checkbox" checked={aiGenerate} onChange={(e) => setAiGenerate(e.target.checked)} className="h-4 w-4" />
                  Let AI suggest a message {cardText && "(will replace your text)"}
                </label>
              </>
            )}
            <VoiceRecorder onChange={setVoiceBlob} />
          </div>
        )}

        {step === 7 && (
          <div className="flex flex-col gap-3 text-sm">
            <h2 className="font-display text-xl font-semibold text-ink">Review</h2>
            <p><span className="text-ink-muted">To:</span> {recipient?.name}</p>
            <p><span className="text-ink-muted">Bouquet:</span> {flower?.name} {flower && `(${formatPrice(flower.price_cents)})`}</p>
            <p><span className="text-ink-muted">Occasion:</span> {occasion ? label(occasion) : "-"}</p>
            <p><span className="text-ink-muted">Delivery:</span> {deliveryDate} {window_ && `${window_.start}-${window_.end}`}</p>
            <p><span className="text-ink-muted">Address:</span> {address ? `${address.line1}, ${address.city}` : "-"}</p>
            <p><span className="text-ink-muted">From:</span> {isAnonymous ? "Anonymous" : "Visible to recipient"}</p>
            {error && <p className="text-error">{error}</p>}
            <Button onClick={handleConfirm} disabled={submitting} className="mt-2 w-full">
              {submitting ? "Sending..." : "Confirm gift"}
            </Button>
          </div>
        )}

        <div className="mt-6 flex justify-between">
          <Button variant="ghost" onClick={back} disabled={step === 0}>Back</Button>
          {step < STEPS.length - 1 && <Button onClick={next}>Next</Button>}
        </div>
      </Card>
    </div>
  );
}
