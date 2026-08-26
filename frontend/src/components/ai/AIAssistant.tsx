import { useState, type FormEvent } from "react";
import Card from "../ui/Card";
import Button from "../ui/Button";
import FlowerCard from "../flowers/FlowerCard";
import { api, ApiError } from "../../lib/api";
import type { Flower } from "../../lib/types";

interface AskResponse {
  message: string;
  source: "gemini" | "fallback";
  flowers: Flower[];
}

const SUGGESTIONS = [
  "What flowers should I send my mother for her birthday?",
  "A good bouquet under $50?",
  "Something appropriate for an anniversary?",
];

export default function AIAssistant() {
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AskResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function ask(q: string) {
    if (!q.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const response = await api.post<AskResponse>("/ai/ask", { question: q });
      setResult(response);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "The assistant is unavailable right now.");
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    ask(question);
  }

  return (
    <Card className="border-forest/20 bg-gradient-to-br from-forest-soft to-surface">
      <div className="flex items-center gap-2">
        <span className="text-xl">✦</span>
        <h2 className="font-display text-lg font-semibold text-ink">Hadiya Assistant</h2>
      </div>
      <p className="mt-1 text-sm text-ink-muted">Ask for a recommendation - I'll only suggest what's actually in the catalog.</p>

      <form onSubmit={handleSubmit} className="mt-4 flex gap-2">
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="What should I send my sister for her birthday?"
          className="flex-1 rounded-[var(--radius-control)] border border-border bg-surface px-4 py-2.5 text-sm focus:border-forest focus:outline-none"
        />
        <Button type="submit" disabled={loading} size="md">{loading ? "Thinking..." : "Ask"}</Button>
      </form>

      {!result && !loading && (
        <div className="mt-3 flex flex-wrap gap-2">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => { setQuestion(s); ask(s); }}
              className="rounded-full border border-border bg-surface px-3 py-1.5 text-xs text-ink-muted hover:border-forest hover:text-forest"
              type="button"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {error && <p className="mt-4 text-sm text-error">{error}</p>}

      {result && (
        <div className="mt-4">
          <p className="rounded-[var(--radius-control)] bg-surface p-4 text-sm text-ink">{result.message}</p>
          {result.flowers.length > 0 && (
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {result.flowers.map((f) => <FlowerCard key={f.id} flower={f} />)}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
