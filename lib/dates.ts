/**
 * Date utility helpers shared across the HMS API.
 */

/**
 * Convert an ISO date string ("YYYY-MM-DD") to a UTC midnight Date object.
 * Used to normalize check-in / check-out dates so that comparisons and
 * Prisma range queries are timezone-safe.
 */
export function normalizeToUtcStart(dateStr: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(year!, month! - 1, day!));
}

/**
 * Format a JS Date to an ISO date string ("YYYY-MM-DD") in UTC.
 * Safe to use for display and database comparisons regardless of the
 * server's local timezone.
 */
export function toIsoDate(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Number of nights between two ISO date strings (check-in → check-out).
 */
export function nightsBetween(checkInIso: string, checkOutIso: string): number {
  const checkIn = normalizeToUtcStart(checkInIso);
  const checkOut = normalizeToUtcStart(checkOutIso);
  return Math.round((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
}
