/**
 * Booking utility helpers — confirmation codes and price formatting.
 */

import { Prisma } from "@/app/generated/prisma/client";

/**
 * Generate a human-readable confirmation code in the format:
 *   HMS-{year}-{6-char-suffix}
 * The suffix uses uppercase letters and digits (excluding confusing
 * characters like 0/O and 1/I) to aid phone/email transcription.
 */
export function generateConfirmationCode(): string {
  const year = new Date().getUTCFullYear();
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let suffix = "";
  for (let i = 0; i < 6; i += 1) {
    suffix += chars[Math.floor(Math.random() * chars.length)];
  }
  return `HMS-${year}-${suffix}`;
}

/**
 * Format a monetary amount (number, string, or Prisma Decimal) as a
 * locale-aware USD string without cents when the amount is whole dollars.
 *
 * Used throughout the public booking UI so prices look clean (e.g. "$150"
 * instead of "$150.00" for whole-dollar room rates).
 */
export function formatBookingAmount(
  amount: number | string | Prisma.Decimal,
): string {
  const num = typeof amount === "string" ? parseFloat(amount) : Number(amount);
  const formatted = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(num);
  return formatted;
}
