export interface User {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  preferred_name: string | null;
  username: string | null;
  profile_photo_url: string | null;
  email_verified: boolean;
  locale: string | null;
}

export interface Flower {
  id: string;
  name: string;
  description: string;
  price_cents: number;
  images: string[];
  flower_type: string;
  colors: string[];
  sizes: string[];
  occasions: string[];
  recommended_relationships: string[];
  available: boolean;
  care_instructions: string;
  water_instructions: string;
  stem_instructions: string;
  placement_instructions: string;
  avoid_notes: string;
  estimated_lifespan_text: string;
}

export interface Person {
  id: string;
  name: string;
  relationship_type: string;
  birthday: string | null;
  favorite_flowers: string[];
  favorite_colors: string[];
  notes: string | null;
  is_favorite: boolean;
}

export interface ImportantDateItem {
  id: string;
  date_type: string;
  custom_label: string | null;
  occurs_on: string;
  recurring: boolean;
  reminder_offsets_days: number[];
}

export interface UpcomingEvent {
  person_id: string;
  person_name: string;
  label: string;
  days_until: number;
}

export interface WishlistItem {
  id: string;
  person_id: string | null;
  product_name: string;
  marketplace: string | null;
  url: string | null;
  sku: string | null;
  model: string | null;
  size: string | null;
  color: string | null;
  material: string | null;
  image_url: string | null;
  notes: string | null;
}

export interface Address {
  id: string;
  label: string;
  line1: string;
  line2: string | null;
  city: string;
  region: string | null;
  postal_code: string | null;
  country: string;
  is_default: boolean;
}

export interface DeliveryWindow {
  start: string;
  end: string;
  bookable: boolean;
}

export interface GiftHistoryEntry {
  id: string;
  flower: { id: string; name: string; images: string[] };
  occasion: string | null;
  status: string;
  delivery_date: string;
  price_cents: number;
  is_anonymous: boolean;
  sender_name: string | null;
  recipient_name: string | null;
  message: string | null;
  has_voice_message: boolean;
  created_at: string;
  wishlist_gift: { id: string; product_name: string; image_url: string | null } | null;
}

export interface OrderDetail {
  id: string;
  direction: "sent" | "received";
  flower: Flower;
  sender_name: string | null;
  recipient_name: string | null;
  occasion: string | null;
  delivery_date: string;
  delivery_window_start: string;
  delivery_window_end: string;
  is_anonymous: boolean;
  status: string;
  price_cents: number;
  card: { card_type: string; text: string | null; ai_generated: boolean } | null;
  voice_message_url: string | null;
  wishlist_gift: {
    id: string;
    product_name: string;
    image_url: string | null;
    marketplace: string | null;
    notes: string | null;
  } | null;
  gift_token: string | null;
}

export interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  read: boolean;
  created_at: string;
}

export interface Passkey {
  id: string;
  nickname: string | null;
  created_at: string;
}

export interface Pairing {
  id: string;
  status: string;
  direction: "incoming" | "outgoing";
  other_user_id: string;
  created_at: string;
}
