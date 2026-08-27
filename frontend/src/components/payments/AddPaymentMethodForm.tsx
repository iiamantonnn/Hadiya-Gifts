import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import Button from "../ui/Button";
import { Input, Select } from "../ui/Input";
import { api, ApiError } from "../../lib/api";
import { detectCardBrand, last4Of, isValidCardNumber, isValidCvv } from "../../lib/payments";
import type { PaymentMethod } from "../../lib/types";

interface Props {
  onAdded: (pm: PaymentMethod) => void;
}

export default function AddPaymentMethodForm({ onAdded }: Props) {
  const { t } = useTranslation();
  const [methodType, setMethodType] = useState<"card" | "google_pay" | "apple_pay">("card");
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function addWallet(type: "google_pay" | "apple_pay") {
    setSubmitting(true);
    setError(null);
    try {
      const pm = await api.post<PaymentMethod>("/payment-methods", { method_type: type });
      onAdded(pm);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("settings.paymentMethods.saveError"));
    } finally {
      setSubmitting(false);
    }
  }

  async function addCard(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const [mm, yy] = expiry.split("/").map((s) => s.trim());
    const expMonth = Number(mm);
    const expYear = yy ? Number(yy.length === 2 ? `20${yy}` : yy) : NaN;
    if (!isValidCardNumber(cardNumber) || !isValidCvv(cvv) || !expMonth || expMonth < 1 || expMonth > 12 || !expYear) {
      setError(t("settings.paymentMethods.invalidCard"));
      return;
    }

    setSubmitting(true);
    try {
      // Only brand + last4 ever leave this form - the full number and CVV
      // are never included in the request body.
      const pm = await api.post<PaymentMethod>("/payment-methods", {
        method_type: "card",
        brand: detectCardBrand(cardNumber),
        last4: last4Of(cardNumber),
        exp_month: expMonth,
        exp_year: expYear,
      });
      setCardNumber("");
      setExpiry("");
      setCvv("");
      onAdded(pm);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("settings.paymentMethods.saveError"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <Select label={t("settings.paymentMethods.typeLabel")} value={methodType} onChange={(e) => setMethodType(e.target.value as typeof methodType)}>
        <option value="card">{t("settings.paymentMethods.typeCard")}</option>
        <option value="google_pay">{t("settings.paymentMethods.typeGooglePay")}</option>
        <option value="apple_pay">{t("settings.paymentMethods.typeApplePay")}</option>
      </Select>

      {methodType === "card" ? (
        <form onSubmit={addCard} className="flex flex-col gap-3">
          <Input
            label={t("settings.paymentMethods.cardNumber")} inputMode="numeric" autoComplete="cc-number"
            placeholder="4242 4242 4242 4242" value={cardNumber} onChange={(e) => setCardNumber(e.target.value)}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input label={t("settings.paymentMethods.expiry")} autoComplete="cc-exp" placeholder="MM/YY" value={expiry} onChange={(e) => setExpiry(e.target.value)} />
            <Input label={t("settings.paymentMethods.cvv")} inputMode="numeric" autoComplete="cc-csc" placeholder="123" value={cvv} onChange={(e) => setCvv(e.target.value)} />
          </div>
          {error && <p className="text-sm text-error">{error}</p>}
          <Button type="submit" variant="ghost" className="self-start" disabled={submitting}>{t("settings.paymentMethods.addCard")}</Button>
        </form>
      ) : (
        <div className="flex flex-col gap-3">
          {error && <p className="text-sm text-error">{error}</p>}
          <Button type="button" variant="ghost" className="self-start" disabled={submitting} onClick={() => addWallet(methodType)}>
            {t("settings.paymentMethods.add")}
          </Button>
        </div>
      )}
      <p className="text-xs text-ink-faint">{t("settings.paymentMethods.demoNote")}</p>
    </div>
  );
}
