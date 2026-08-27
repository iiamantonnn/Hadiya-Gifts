// Used only by the pairing-acceptance flow (PairingAccept.tsx) - My People
// keeps its own separate, untouched relationship list.
export const RELATIONSHIP_TYPES = [
  "friend", "partner", "husband", "wife", "mother", "father", "sister", "brother", "colleague", "other",
];

export const RELATIONSHIP_EMOJI: Record<string, string> = {
  friend: "👥", partner: "💞", husband: "🤵", wife: "❤️", mother: "👩",
  father: "👨", sister: "👧", brother: "👦", colleague: "🧑‍💼", other: "🔗",
};

export function relationshipEmoji(type: string): string {
  return RELATIONSHIP_EMOJI[type] || "🔗";
}
