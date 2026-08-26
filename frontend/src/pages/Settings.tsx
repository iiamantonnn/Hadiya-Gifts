import { useEffect, useState, type FormEvent } from "react";
import { browserSupportsWebAuthn } from "@simplewebauthn/browser";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import { Input, Select } from "../components/ui/Input";
import { api, ApiError } from "../lib/api";
import { useAuth } from "../lib/auth-context";
import { registerPasskey } from "../lib/webauthn";
import type { Address, Passkey } from "../lib/types";

const EMPTY_ADDRESS = { label: "", line1: "", line2: "", city: "", region: "", postal_code: "", country: "", is_default: false };

export default function Settings() {
  const { user, refreshUser } = useAuth();
  const [preferredName, setPreferredName] = useState(user?.preferred_name || "");
  const [phone, setPhone] = useState("");
  const [profileMessage, setProfileMessage] = useState<string | null>(null);

  const [dobVisibility, setDobVisibility] = useState("only_me");
  const [privacyMessage, setPrivacyMessage] = useState<string | null>(null);

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [addressForm, setAddressForm] = useState(EMPTY_ADDRESS);
  const [addressError, setAddressError] = useState<string | null>(null);

  const [passkeys, setPasskeys] = useState<Passkey[]>([]);
  const [passkeyMessage, setPasskeyMessage] = useState<string | null>(null);

  function loadAddresses() {
    api.get<Address[]>("/users/me/addresses").then(setAddresses).catch(() => {});
  }
  function loadPasskeys() {
    api.get<Passkey[]>("/webauthn/passkeys").then(setPasskeys).catch(() => {});
  }
  useEffect(() => { loadAddresses(); loadPasskeys(); }, []);

  async function saveProfile(e: FormEvent) {
    e.preventDefault();
    await api.patch("/users/me", { preferred_name: preferredName || undefined, phone: phone || undefined });
    setProfileMessage("Saved.");
    refreshUser();
  }

  async function savePrivacy(e: FormEvent) {
    e.preventDefault();
    await api.patch("/users/me/privacy", { dob_visibility: dobVisibility });
    setPrivacyMessage("Saved.");
  }

  async function addAddress(e: FormEvent) {
    e.preventDefault();
    setAddressError(null);
    try {
      await api.post("/users/me/addresses", addressForm);
      setAddressForm(EMPTY_ADDRESS);
      loadAddresses();
    } catch (err) {
      setAddressError(err instanceof ApiError ? err.message : "Could not save this address.");
    }
  }

  async function removeAddress(id: string) {
    await api.delete(`/users/me/addresses/${id}`);
    loadAddresses();
  }

  async function addPasskey() {
    setPasskeyMessage(null);
    try {
      await registerPasskey();
      setPasskeyMessage("Passkey added.");
      loadPasskeys();
    } catch {
      setPasskeyMessage("Couldn't add a passkey on this device.");
    }
  }

  async function removePasskey(id: string) {
    await api.delete(`/webauthn/passkeys/${id}`);
    loadPasskeys();
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8">
      <h1 className="font-display text-2xl font-semibold text-ink">Settings</h1>

      <Card>
        <h2 className="font-display text-lg font-semibold text-ink">Profile</h2>
        <form onSubmit={saveProfile} className="mt-4 flex flex-col gap-4">
          <Input label="Preferred name" placeholder={user?.first_name} value={preferredName} onChange={(e) => setPreferredName(e.target.value)} hint="What Hadiya calls you on the dashboard." />
          <Input label="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
          {profileMessage && <p className="text-sm text-success">{profileMessage}</p>}
          <Button type="submit" variant="ghost" className="self-start">Save</Button>
        </form>
      </Card>

      <Card>
        <h2 className="font-display text-lg font-semibold text-ink">Privacy</h2>
        <form onSubmit={savePrivacy} className="mt-4 flex flex-col gap-4">
          <Select label="Who can see my date of birth" value={dobVisibility} onChange={(e) => setDobVisibility(e.target.value)}>
            <option value="only_me">Only me</option>
            <option value="paired">My paired person</option>
            <option value="selected">Selected people</option>
            <option value="everyone">Everyone</option>
          </Select>
          {privacyMessage && <p className="text-sm text-success">{privacyMessage}</p>}
          <Button type="submit" variant="ghost" className="self-start">Save</Button>
        </form>
      </Card>

      <Card>
        <h2 className="font-display text-lg font-semibold text-ink">Delivery addresses</h2>
        <p className="mt-1 text-xs text-ink-faint">Never shown publicly - only used for delivery.</p>
        <ul className="mt-4 flex flex-col gap-2">
          {addresses.map((a) => (
            <li key={a.id} className="flex items-center justify-between rounded-[var(--radius-control)] border border-border p-3 text-sm">
              <span>{a.label} - {a.line1}, {a.city} {a.is_default && <span className="text-forest">(default)</span>}</span>
              <button onClick={() => removeAddress(a.id)} className="text-ink-faint hover:text-error">Remove</button>
            </li>
          ))}
        </ul>
        <form onSubmit={addAddress} className="mt-4 flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <Input label="Label" required value={addressForm.label} onChange={(e) => setAddressForm({ ...addressForm, label: e.target.value })} placeholder="Home" />
            <Input label="City" required value={addressForm.city} onChange={(e) => setAddressForm({ ...addressForm, city: e.target.value })} />
          </div>
          <Input label="Address line" required value={addressForm.line1} onChange={(e) => setAddressForm({ ...addressForm, line1: e.target.value })} />
          <div className="grid grid-cols-3 gap-3">
            <Input label="Region" value={addressForm.region} onChange={(e) => setAddressForm({ ...addressForm, region: e.target.value })} />
            <Input label="Postal code" value={addressForm.postal_code} onChange={(e) => setAddressForm({ ...addressForm, postal_code: e.target.value })} />
            <Input label="Country" required value={addressForm.country} onChange={(e) => setAddressForm({ ...addressForm, country: e.target.value })} />
          </div>
          <label className="flex items-center gap-2 text-sm text-ink-muted">
            <input type="checkbox" checked={addressForm.is_default} onChange={(e) => setAddressForm({ ...addressForm, is_default: e.target.checked })} className="h-4 w-4" />
            Set as default
          </label>
          {addressError && <p className="text-sm text-error">{addressError}</p>}
          <Button type="submit" variant="ghost" className="self-start">Add address</Button>
        </form>
      </Card>

      {browserSupportsWebAuthn() && (
        <Card>
          <h2 className="font-display text-lg font-semibold text-ink">Passkey / Biometric login</h2>
          <p className="mt-1 text-xs text-ink-faint">Use Face ID, Touch ID, Windows Hello, or your device's secure authentication.</p>
          <ul className="mt-4 flex flex-col gap-2">
            {passkeys.map((p) => (
              <li key={p.id} className="flex items-center justify-between rounded-[var(--radius-control)] border border-border p-3 text-sm">
                <span>{p.nickname || "Passkey"} - added {new Date(p.created_at).toLocaleDateString()}</span>
                <button onClick={() => removePasskey(p.id)} className="text-ink-faint hover:text-error">Remove</button>
              </li>
            ))}
          </ul>
          {passkeyMessage && <p className="mt-3 text-sm text-ink-muted">{passkeyMessage}</p>}
          <Button variant="ghost" className="mt-4" onClick={addPasskey}>Add a passkey</Button>
        </Card>
      )}
    </div>
  );
}
