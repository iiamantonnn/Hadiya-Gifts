import type { PaymentMethod } from "./types";

export type CardBrand = "visa" | "mastercard" | "amex" | "other";

// Card data never leaves this module as anything but brand + last4 - the
// full number and CVV are only ever used here, transiently, to derive those.
export function detectCardBrand(number: string): CardBrand {
  const digits = number.replace(/\D/g, "");
  if (/^4/.test(digits)) return "visa";
  if (/^5[1-5]/.test(digits) || /^2(2[2-9]|[3-6]\d|7[01])/.test(digits)) return "mastercard";
  if (/^3[47]/.test(digits)) return "amex";
  return "other";
}

export function last4Of(number: string): string {
  return number.replace(/\D/g, "").slice(-4);
}

export function isValidCardNumber(number: string): boolean {
  const digits = number.replace(/\D/g, "");
  return digits.length >= 13 && digits.length <= 19;
}

export function isValidCvv(cvv: string): boolean {
  return /^\d{3,4}$/.test(cvv);
}

const BRAND_LABELS: Record<CardBrand, string> = { visa: "Visa", mastercard: "Mastercard", amex: "Amex", other: "Card" };

export function paymentMethodLabel(pm: Pick<PaymentMethod, "method_type" | "brand" | "last4">): string {
  if (pm.method_type === "google_pay") return "Google Pay";
  if (pm.method_type === "apple_pay") return "Apple Pay";
  const brand = BRAND_LABELS[(pm.brand as CardBrand) || "other"];
  return `${brand} •••• ${pm.last4 || "----"}`;
}
