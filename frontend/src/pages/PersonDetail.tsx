import { useEffect, useState, type FormEvent } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Sheet from "../components/ui/Sheet";
import { Input, Select } from "../components/ui/Input";
import { api, ApiError } from "../lib/api";
import type { Person, ImportantDateItem, WishlistItem } from "../lib/types";

const DATE_TYPES = ["birthday", "anniversary", "met", "graduation", "mothers_day", "friendship", "custom"];

export default function PersonDetail() {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const [person, setPerson] = useState<Person | null>(null);
  const [dates, setDates] = useState<ImportantDateItem[]>([]);
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
  const [dateSheetOpen, setDateSheetOpen] = useState(false);
  const [dateForm, setDateForm] = useState({ date_type: "custom", custom_label: "", occurs_on: "" });
  const [error, setError] = useState<string | null>(null);

  function load() {
    if (!id) return;
    api.get<Person[]>("/people").then((all) => setPerson(all.find((p) => p.id === id) || null));
    api.get<WishlistItem[]>(`/wishlist?person_id=${id}`).then(setWishlist).catch(() => {});
  }

  useEffect(load, [id]);
  useEffect(() => {
    if (person) setDates((person as unknown as { important_dates?: ImportantDateItem[] }).important_dates || []);
  }, [person]);

  async function toggleFavorite() {
    if (!person) return;
    await api.patch(`/people/${person.id}`, { ...person, is_favorite: !person.is_favorite });
    load();
  }

  async function addDate(e: FormEvent) {
    e.preventDefault();
    if (!id) return;
    setError(null);
    try {
      await api.post(`/people/${id}/dates`, { ...dateForm, reminder_offsets_days: [7, 3, 1, 0] });
      setDateForm({ date_type: "custom", custom_label: "", occurs_on: "" });
      setDateSheetOpen(false);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("people.addDateError"));
    }
  }

  async function removeDate(dateId: string) {
    await api.delete(`/people/dates/${dateId}`);
    load();
  }

  async function removePerson() {
    if (!id || !confirm(t("people.confirmRemovePerson", { name: person?.name }))) return;
    await api.delete(`/people/${id}`);
    navigate("/people");
  }

  if (!person) return <p className="text-center text-ink-faint">{t("common.loading")}</p>;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold text-ink">{person.name}</h1>
          <p className="capitalize text-ink-muted">{t(`people.relationshipTypes.${person.relationship_type}`, person.relationship_type)}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={toggleFavorite}>
            {person.is_favorite ? t("people.favorited") : t("people.favorite")}
          </Button>
          <Button size="sm" onClick={() => navigate(`/checkout?person_id=${person.id}`)}>{t("people.sendGift")}</Button>
        </div>
      </div>

      {(person.favorite_flowers.length > 0 || person.favorite_colors.length > 0 || person.notes) && (
        <Card>
          {person.favorite_flowers.length > 0 && <p className="text-sm text-ink-muted"><span className="font-medium text-ink">{t("people.favoriteFlowersLabel")}</span> {person.favorite_flowers.join(", ")}</p>}
          {person.favorite_colors.length > 0 && <p className="mt-1 text-sm text-ink-muted"><span className="font-medium text-ink">{t("people.favoriteColorsLabel")}</span> {person.favorite_colors.join(", ")}</p>}
          {person.notes && <p className="mt-1 text-sm text-ink-muted"><span className="font-medium text-ink">{t("people.notesLabel")}</span> {person.notes}</p>}
        </Card>
      )}

      <Card>
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-ink">{t("people.importantDatesTitle")}</h2>
          <Button variant="ghost" size="sm" onClick={() => setDateSheetOpen(true)}>{t("people.addDateTrigger")}</Button>
        </div>
        {dates.length === 0 ? (
          <p className="mt-3 text-sm text-ink-faint">{t("people.noDatesYet")}</p>
        ) : (
          <ul className="mt-3 flex flex-col gap-2">
            {dates.map((d) => (
              <li key={d.id} className="flex items-center justify-between text-sm">
                <span className="text-ink">{d.date_type === "custom" ? d.custom_label : t(`people.dateTypes.${d.date_type}`, d.date_type.replace("_", " "))} - {d.occurs_on}</span>
                <button onClick={() => removeDate(d.id)} className="text-ink-faint hover:text-error">{t("people.remove")}</button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <h2 className="font-display text-lg font-semibold text-ink">{t("people.wishlistTitle")}</h2>
        {wishlist.length === 0 ? (
          <p className="mt-3 text-sm text-ink-faint">{t("people.emptyWishlist")}</p>
        ) : (
          <ul className="mt-3 flex flex-col gap-2">
            {wishlist.map((item) => (
              <li key={item.id} className="text-sm text-ink">{item.product_name}{item.marketplace && ` - ${item.marketplace}`}</li>
            ))}
          </ul>
        )}
      </Card>

      <button onClick={removePerson} className="self-start text-sm text-ink-faint hover:text-error">
        {t("people.removeFromMyPeople")}
      </button>

      <Sheet open={dateSheetOpen} onClose={() => setDateSheetOpen(false)} title={t("people.addDateSheetTitle")}>
        <form onSubmit={addDate} className="flex flex-col gap-4">
          <Select label={t("people.dateTypeLabel")} value={dateForm.date_type} onChange={(e) => setDateForm({ ...dateForm, date_type: e.target.value })}>
            {DATE_TYPES.map((dt) => <option key={dt} value={dt}>{t(`people.dateTypes.${dt}`, dt.replace("_", " "))}</option>)}
          </Select>
          {dateForm.date_type === "custom" && (
            <Input label={t("people.customLabelLabel")} required value={dateForm.custom_label} onChange={(e) => setDateForm({ ...dateForm, custom_label: e.target.value })} />
          )}
          <Input label={t("people.dateLabel")} type="date" required value={dateForm.occurs_on} onChange={(e) => setDateForm({ ...dateForm, occurs_on: e.target.value })} />
          {error && <p className="text-sm text-error">{error}</p>}
          <Button type="submit" className="w-full">{t("people.addDateSubmit")}</Button>
        </form>
      </Sheet>
    </div>
  );
}
