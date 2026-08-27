import { useEffect, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { browserSupportsWebAuthn } from "@simplewebauthn/browser";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import { Input, Select } from "../components/ui/Input";
import AddPaymentMethodForm from "../components/payments/AddPaymentMethodForm";
import { api, ApiError } from "../lib/api";
import { useAuth } from "../lib/auth-context";
import { registerPasskey } from "../lib/webauthn";
import { paymentMethodLabel } from "../lib/payments";
import type { Address, Passkey, PaymentMethod } from "../lib/types";

const EMPTY_ADDRESS = { label: "", address_type: "home", line1: "", line2: "", city: "", region: "", postal_code: "", country: "", is_default: false };

export default function Settings() {
  const { t } = useTranslation();
  const { user, refreshUser } = useAuth();
  const [preferredName, setPreferredName] = useState(user?.preferred_name || "");
  const [phone, setPhone] = useState("");
  const [profileMessage, setProfileMessage] = useState<string | null>(null);

  const [dobVisibility, setDobVisibility] = useState("only_me");
  const [privacyMessage, setPrivacyMessage] = useState<string | null>(null);

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [addressForm, setAddressForm] = useState(EMPTY_ADDRESS);
  const [addressError, setAddressError] = useState<string | null>(null);
  const [revealedAddresses, setRevealedAddresses] = useState<Set<string>>(new Set());

  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);

  const [passkeys, setPasskeys] = useState<Passkey[]>([]);
  const [passkeyMessage, setPasskeyMessage] = useState<string | null>(null);

  function loadAddresses() {
    api.get<Address[]>("/users/me/addresses").then(setAddresses).catch(() => {});
  }
  function loadPaymentMethods() {
    api.get<PaymentMethod[]>("/payment-methods").then(setPaymentMethods).catch(() => {});
  }
  function loadPasskeys() {
    api.get<Passkey[]>("/webauthn/passkeys").then(setPasskeys).catch(() => {});
  }
  useEffect(() => { loadAddresses(); loadPaymentMethods(); loadPasskeys(); }, []);

  function toggleReveal(id: string) {
    setRevealedAddresses((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  async function saveProfile(e: FormEvent) {
    e.preventDefault();
    await api.patch("/users/me", { preferred_name: preferredName || undefined, phone: phone || undefined });
    setProfileMessage(t("settings.saved"));
    refreshUser();
  }

  async function savePrivacy(e: FormEvent) {
    e.preventDefault();
    await api.patch("/users/me/privacy", { dob_visibility: dobVisibility });
    setPrivacyMessage(t("settings.saved"));
  }

  async function addAddress(e: FormEvent) {
    e.preventDefault();
    setAddressError(null);
    try {
      await api.post("/users/me/addresses", addressForm);
      setAddressForm(EMPTY_ADDRESS);
      loadAddresses();
    } catch (err) {
      setAddressError(err instanceof ApiError ? err.message : t("settings.addresses.saveError"));
    }
  }

  async function removeAddress(id: string) {
    await api.delete(`/users/me/addresses/${id}`);
    loadAddresses();
  }

  async function removePaymentMethod(id: string) {
    await api.delete(`/payment-methods/${id}`);
    loadPaymentMethods();
  }

  async function addPasskey() {
    setPasskeyMessage(null);
    try {
      await registerPasskey();
      setPasskeyMessage(t("settings.passkeys.added"));
      loadPasskeys();
    } catch {
      setPasskeyMessage(t("settings.passkeys.addFailed"));
    }
  }

  async function removePasskey(id: string) {
    await api.delete(`/webauthn/passkeys/${id}`);
    loadPasskeys();
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8">
      <h1 className="font-display text-2xl font-semibold text-ink">{t("settings.title")}</h1>

      <Card>
        <h2 className="font-display text-lg font-semibold text-ink">{t("settings.profile.title")}</h2>
        <form onSubmit={saveProfile} className="mt-4 flex flex-col gap-4">
          <Input label={t("settings.profile.preferredName")} placeholder={user?.first_name} value={preferredName} onChange={(e) => setPreferredName(e.target.value)} hint={t("settings.profile.preferredNameHint")} />
          <Input label={t("settings.profile.phone")} value={phone} onChange={(e) => setPhone(e.target.value)} />
          {profileMessage && <p className="text-sm text-success">{profileMessage}</p>}
          <Button type="submit" variant="ghost" className="self-start">{t("common.save")}</Button>
        </form>
      </Card>

      <Card>
        <h2 className="font-display text-lg font-semibold text-ink">{t("settings.privacy.title")}</h2>
        <form onSubmit={savePrivacy} className="mt-4 flex flex-col gap-4">
          <Select label={t("settings.privacy.dobVisibility")} value={dobVisibility} onChange={(e) => setDobVisibility(e.target.value)}>
            <option value="only_me">{t("settings.privacy.onlyMe")}</option>
            <option value="paired">{t("settings.privacy.paired")}</option>
            <option value="selected">{t("settings.privacy.selected")}</option>
            <option value="everyone">{t("settings.privacy.everyone")}</option>
          </Select>
          {privacyMessage && <p className="text-sm text-success">{privacyMessage}</p>}
          <Button type="submit" variant="ghost" className="self-start">{t("common.save")}</Button>
        </form>
      </Card>

      <Card>
        <h2 className="font-display text-lg font-semibold text-ink">{t("settings.addresses.title")}</h2>
        <p className="mt-1 text-xs text-ink-faint">{t("settings.addresses.hint")}</p>
        <ul className="mt-4 flex flex-col gap-2">
          {addresses.map((a) => {
            const revealed = revealedAddresses.has(a.id);
            return (
              <li key={a.id} className="flex items-center justify-between rounded-[var(--radius-control)] border border-border p-3 text-sm">
                <span>
                  {revealed
                    ? t("settings.addresses.entry", { label: a.label, line1: a.line1, city: a.city })
                    : `${a.label} - ${t("settings.addresses.masked")}`}{" "}
                  {a.is_default && <span className="text-forest">{t("settings.addresses.default")}</span>}
                </span>
                <span className="flex gap-3">
                  <button onClick={() => toggleReveal(a.id)} className="text-ink-faint hover:text-forest">
                    {revealed ? t("settings.addresses.hide") : t("settings.addresses.show")}
                  </button>
                  <button onClick={() => removeAddress(a.id)} className="text-ink-faint hover:text-error">{t("settings.addresses.remove")}</button>
                </span>
              </li>
            );
          })}
        </ul>
        <p className="mt-3 text-xs text-ink-faint">{t("settings.addresses.privacyNote")}</p>
        <form onSubmit={addAddress} className="mt-4 flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <Input label={t("settings.addresses.label")} required value={addressForm.label} onChange={(e) => setAddressForm({ ...addressForm, label: e.target.value })} placeholder={t("settings.addresses.labelPlaceholder")} />
            <Select label={t("settings.addresses.type")} value={addressForm.address_type} onChange={(e) => setAddressForm({ ...addressForm, address_type: e.target.value })}>
              <option value="home">{t("settings.addresses.typeHome")}</option>
              <option value="work">{t("settings.addresses.typeWork")}</option>
              <option value="other">{t("settings.addresses.typeOther")}</option>
            </Select>
          </div>
          <Input label={t("settings.addresses.city")} required value={addressForm.city} onChange={(e) => setAddressForm({ ...addressForm, city: e.target.value })} />
          <Input label={t("settings.addresses.addressLine")} required value={addressForm.line1} onChange={(e) => setAddressForm({ ...addressForm, line1: e.target.value })} />
          <div className="grid grid-cols-3 gap-3">
            <Input label={t("settings.addresses.region")} value={addressForm.region} onChange={(e) => setAddressForm({ ...addressForm, region: e.target.value })} />
            <Input label={t("settings.addresses.postalCode")} value={addressForm.postal_code} onChange={(e) => setAddressForm({ ...addressForm, postal_code: e.target.value })} />
            <Input label={t("settings.addresses.country")} required value={addressForm.country} onChange={(e) => setAddressForm({ ...addressForm, country: e.target.value })} />
          </div>
          <label className="flex items-center gap-2 text-sm text-ink-muted">
            <input type="checkbox" checked={addressForm.is_default} onChange={(e) => setAddressForm({ ...addressForm, is_default: e.target.checked })} className="h-4 w-4" />
            {t("settings.addresses.setDefault")}
          </label>
          {addressError && <p className="text-sm text-error">{addressError}</p>}
          <Button type="submit" variant="ghost" className="self-start">{t("settings.addresses.add")}</Button>
        </form>
      </Card>

      <Card>
        <h2 className="font-display text-lg font-semibold text-ink">{t("settings.paymentMethods.title")}</h2>
        <p className="mt-1 text-xs text-ink-faint">{t("settings.paymentMethods.hint")}</p>
        <ul className="mt-4 flex flex-col gap-2">
          {paymentMethods.map((pm) => (
            <li key={pm.id} className="flex items-center justify-between rounded-[var(--radius-control)] border border-border p-3 text-sm">
              <span>{paymentMethodLabel(pm)} {pm.is_default && <span className="text-forest">{t("settings.paymentMethods.default")}</span>}</span>
              <button onClick={() => removePaymentMethod(pm.id)} className="text-ink-faint hover:text-error">{t("settings.paymentMethods.remove")}</button>
            </li>
          ))}
          {paymentMethods.length === 0 && <p className="text-sm text-ink-faint">{t("settings.paymentMethods.empty")}</p>}
        </ul>
        <div className="mt-4">
          <AddPaymentMethodForm onAdded={() => loadPaymentMethods()} />
        </div>
      </Card>

      {browserSupportsWebAuthn() && (
        <Card>
          <h2 className="font-display text-lg font-semibold text-ink">{t("settings.passkeys.title")}</h2>
          <p className="mt-1 text-xs text-ink-faint">{t("settings.passkeys.hint")}</p>
          <ul className="mt-4 flex flex-col gap-2">
            {passkeys.map((p) => (
              <li key={p.id} className="flex items-center justify-between rounded-[var(--radius-control)] border border-border p-3 text-sm">
                <span>{t("settings.passkeys.entry", { name: p.nickname || t("settings.passkeys.defaultName"), date: new Date(p.created_at).toLocaleDateString() })}</span>
                <button onClick={() => removePasskey(p.id)} className="text-ink-faint hover:text-error">{t("settings.passkeys.remove")}</button>
              </li>
            ))}
          </ul>
          {passkeyMessage && <p className="mt-3 text-sm text-ink-muted">{passkeyMessage}</p>}
          <Button variant="ghost" className="mt-4" onClick={addPasskey}>{t("settings.passkeys.add")}</Button>
        </Card>
      )}
    </div>
  );
}
