import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Sheet from "../components/ui/Sheet";
import { Input, Select } from "../components/ui/Input";
import { api, ApiError } from "../lib/api";
import type { Person } from "../lib/types";

const RELATIONSHIP_TYPES = ["mother", "father", "sister", "brother", "friend", "partner", "spouse", "colleague", "grandmother", "grandfather", "other"];

export default function People() {
  const [people, setPeople] = useState<Person[]>([]);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", relationship_type: "friend", birthday: "" });

  function load() {
    api.get<Person[]>("/people").then(setPeople).catch(() => {});
  }

  useEffect(load, []);

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api.post("/people", { ...form, birthday: form.birthday || undefined });
      setForm({ name: "", relationship_type: "friend", birthday: "" });
      setOpen(false);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not add this person.");
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-semibold text-ink">My People</h1>
        <Button size="sm" onClick={() => setOpen(true)}>Add Person</Button>
      </div>

      {people.length === 0 ? (
        <p className="mt-8 text-center text-sm text-ink-faint">
          Add the people who matter, and Hadiya will help you remember what matters to them.
        </p>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {people.map((person) => (
            <Link key={person.id} to={`/people/${person.id}`}>
              <Card className="transition-shadow hover:shadow-[var(--shadow-lift)]">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-ink">{person.name}</p>
                  {person.is_favorite && <span className="text-rose">♥</span>}
                </div>
                <p className="mt-1 text-sm capitalize text-ink-muted">{person.relationship_type}</p>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <Sheet open={open} onClose={() => setOpen(false)} title="Add a person">
        <form onSubmit={handleAdd} className="flex flex-col gap-4">
          <Input label="Name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Select label="Relationship" value={form.relationship_type} onChange={(e) => setForm({ ...form, relationship_type: e.target.value })}>
            {RELATIONSHIP_TYPES.map((r) => <option key={r} value={r}>{r[0].toUpperCase() + r.slice(1)}</option>)}
          </Select>
          <Input label="Birthday (optional)" type="date" value={form.birthday} onChange={(e) => setForm({ ...form, birthday: e.target.value })} />
          {error && <p className="text-sm text-error">{error}</p>}
          <Button type="submit" className="w-full">Add</Button>
        </form>
      </Sheet>
    </div>
  );
}
