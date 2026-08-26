import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../lib/api";

interface PublicGift {
  flower: {
    name: string; images: string[]; care_instructions: string; water_instructions: string;
    stem_instructions: string; placement_instructions: string; avoid_notes: string; estimated_lifespan_text: string;
  };
  occasion: string | null;
  sender_name: string | null;
  message: string | null;
  voice_message_url: string | null;
  status: string;
}

export default function GiftPage() {
  const { token } = useParams();
  const [gift, setGift] = useState<PublicGift | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    api.get<PublicGift>(`/gift/${token}`).then(setGift).catch(() => setError("This gift page could not be found."));
  }, [token]);

  if (error) {
    return <div className="flex min-h-screen items-center justify-center bg-ivory text-ink-muted">{error}</div>;
  }
  if (!gift) {
    return <div className="flex min-h-screen items-center justify-center bg-ivory text-ink-faint">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-ivory px-6 py-10">
      <div className="mx-auto max-w-lg">
        <p className="text-center font-display text-lg text-forest">Hadiya</p>
        <h1 className="mt-4 text-center font-display text-3xl font-semibold text-ink">
          {gift.sender_name ? `${gift.sender_name} sent you something` : "Someone sent you something"}
        </h1>

        {gift.flower.images[0] && (
          <div className="mt-6 aspect-[4/5] overflow-hidden rounded-[var(--radius-card)] bg-forest-soft">
            <img src={gift.flower.images[0]} alt={gift.flower.name} className="h-full w-full object-cover" />
          </div>
        )}

        <p className="mt-4 text-center font-display text-xl text-ink">{gift.flower.name}</p>

        {gift.message && (
          <div className="mt-6 rounded-[var(--radius-card)] border border-border bg-surface p-6 text-center">
            <p className="text-ink">{gift.message}</p>
          </div>
        )}

        {gift.voice_message_url && (
          <div className="mt-6">
            <p className="mb-2 text-center text-sm text-ink-muted">A voice message for you</p>
            <audio src={gift.voice_message_url} controls className="w-full" />
          </div>
        )}

        <div className="mt-8 rounded-[var(--radius-card)] border border-border bg-surface p-6">
          <h2 className="font-display text-lg font-semibold text-ink">Flower care</h2>
          <p className="mt-2 text-sm font-medium text-forest">{gift.flower.estimated_lifespan_text}</p>
          <dl className="mt-3 flex flex-col gap-2 text-sm text-ink-muted">
            <div><dt className="inline font-medium text-ink">Water: </dt><dd className="inline">{gift.flower.water_instructions}</dd></div>
            <div><dt className="inline font-medium text-ink">Stems: </dt><dd className="inline">{gift.flower.stem_instructions}</dd></div>
            <div><dt className="inline font-medium text-ink">Placement: </dt><dd className="inline">{gift.flower.placement_instructions}</dd></div>
            <div><dt className="inline font-medium text-ink">Avoid: </dt><dd className="inline">{gift.flower.avoid_notes}</dd></div>
          </dl>
        </div>
      </div>
    </div>
  );
}
