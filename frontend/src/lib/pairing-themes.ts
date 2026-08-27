export interface PairingTheme {
  id: string;
  bgFrom: string;
  bgTo: string;
  border: string;
  corner: string; // decorative glyph/emoji placed at the card's corners - never over the QR itself
  qrDark: string;
}

// Every color here is one of the app's existing design tokens (see index.css)
// so a themed invite still reads as unmistakably Hadiya, never off-brand.
export const PAIRING_THEMES: PairingTheme[] = [
  { id: "minimal", bgFrom: "#FAF6EF", bgTo: "#FFFFFF", border: "#E5DFD3", corner: "", qrDark: "#1B3A2B" },
  { id: "elegant", bgFrom: "#F5EEE0", bgTo: "#FAF6EF", border: "#C9A66B", corner: "✦", qrDark: "#1B3A2B" },
  { id: "heart", bgFrom: "#FBEDED", bgTo: "#FAF6EF", border: "#D98C8C", corner: "❤️", qrDark: "#1B3A2B" },
  { id: "birthday", bgFrom: "#F5EEE0", bgTo: "#FBEDED", border: "#C9A66B", corner: "🎉", qrDark: "#1B3A2B" },
  { id: "anniversary", bgFrom: "#F5EEE0", bgTo: "#FAF6EF", border: "#C9A66B", corner: "💐", qrDark: "#1B3A2B" },
  { id: "valentine", bgFrom: "#FBEDED", bgTo: "#F5D8D8", border: "#C06B6B", corner: "💘", qrDark: "#1B3A2B" },
  { id: "christmas", bgFrom: "#E9F0EB", bgTo: "#FAF6EF", border: "#1B3A2B", corner: "🎄", qrDark: "#1B3A2B" },
  { id: "seasonal", bgFrom: "#F5EEE0", bgTo: "#FBEDED", border: "#C9A66B", corner: "🍂", qrDark: "#1B3A2B" },
];

export function getTheme(id: string): PairingTheme {
  return PAIRING_THEMES.find((t) => t.id === id) || PAIRING_THEMES[0];
}
