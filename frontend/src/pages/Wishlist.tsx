import { useEffect, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Sheet from "../components/ui/Sheet";
import { Input, Select } from "../components/ui/Input";
import { api, ApiError } from "../lib/api";
import type { WishlistItem, Person } from "../lib/types";

const EMPTY_FORM = {
  person_id: "", product_name: "", marketplace: "", url: "", sku: "",
  model: "", size: "", color: "", material: "", image_url: "", notes: "",
};

export default function Wishlist() {
  const { t } = useTranslation();
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [extracting, setExtracting] = useState(false);

  function load() {
    api.get<WishlistItem[]>("/wishlist").then(setItems).catch(() => {});
    api.get<Person[]>("/people").then(setPeople).catch(() => {});
  }
  useEffect(load, []);

  async function handleExtract() {
    if (!form.url) return;
    setExtracting(true);
    try {
      const meta = await api.post<{ product_name: string | null; image_url: string | null }>("/wishlist/extract-url", { url: form.url });
      setForm((prev) => ({ ...prev, product_name: meta.product_name || prev.product_name, image_url: meta.image_url || prev.image_url }));
    } catch {
      // Silent - manual entry is always available, matching the spec.
    } finally {
      setExtracting(false);
    }
  }

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api.post("/wishlist", {
        ...form,
        person_id: form.person_id || undefined,
        marketplace: form.marketplace || undefined,
        url: form.url || undefined,
      });
      setForm(EMPTY_FORM);
      setOpen(false);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("wishlist.addError"));
    }
  }

  async function remove(id: string) {
    await api.delete(`/wishlist/${id}`);
    load();
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-semibold text-ink">{t("wishlist.title")}</h1>
        <Button size="sm" onClick={() => setOpen(true)}>{t("wishlist.addItem")}</Button>
      </div>

      {items.length === 0 ? (
        <p className="mt-8 text-center text-sm text-ink-faint">{t("wishlist.emptyState")}</p>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <Card key={item.id}>
              {item.image_url && <img src={item.image_url} alt="" className="mb-3 h-32 w-full rounded-[var(--radius-control)] object-cover" />}
              <p className="font-medium text-ink">{item.product_name}</p>
              {item.marketplace && <p className="text-sm text-ink-muted">{item.marketplace}</p>}
              <div className="mt-2 flex flex-wrap gap-2 text-xs text-ink-faint">
                {item.color && <span>{item.color}</span>}
                {item.size && <span>- {item.size}</span>}
              </div>
              <div className="mt-3 flex items-center justify-between">
                {item.url && (
                  <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-forest hover:underline">
                    {t("wishlist.viewProduct")}
                  </a>
                )}
                <button onClick={() => remove(item.id)} className="text-sm text-ink-faint hover:text-error">{t("wishlist.remove")}</button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Sheet open={open} onClose={() => setOpen(false)} title={t("wishlist.addToWishlist")}>
        <form onSubmit={handleAdd} className="flex flex-col gap-4">
          <div className="flex gap-2">
            <div className="flex-1">
              <Input label={t("wishlist.productUrlLabel")} value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} />
            </div>
            <Button type="button" variant="ghost" size="md" className="mt-6" onClick={handleExtract} disabled={extracting || !form.url}>
              {extracting ? "..." : t("wishlist.fetchDetails")}
            </Button>
          </div>
          <Input label={t("wishlist.productNameLabel")} required value={form.product_name} onChange={(e) => setForm({ ...form, product_name: e.target.value })} />
          <Input label={t("wishlist.marketplaceLabel")} value={form.marketplace} onChange={(e) => setForm({ ...form, marketplace: e.target.value })} placeholder={t("wishlist.marketplacePlaceholder")} />
          <div className="grid grid-cols-2 gap-3">
            <Input label={t("wishlist.colorLabel")} value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} />
            <Input label={t("wishlist.sizeLabel")} value={form.size} onChange={(e) => setForm({ ...form, size: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label={t("wishlist.modelLabel")} value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} />
            <Input label={t("wishlist.materialLabel")} value={form.material} onChange={(e) => setForm({ ...form, material: e.target.value })} />
          </div>
          <Select label={t("wishlist.forLabel")} value={form.person_id} onChange={(e) => setForm({ ...form, person_id: e.target.value })}>
            <option value="">{t("wishlist.myself")}</option>
            {people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </Select>
          {error && <p className="text-sm text-error">{error}</p>}
          <Button type="submit" className="w-full">{t("wishlist.addToWishlist")}</Button>
        </form>
      </Sheet>
    </div>
  );
}
