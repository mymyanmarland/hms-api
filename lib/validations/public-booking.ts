import { z } from "zod";

/**
 * Validation schemas for the public Direct Booking Engine.
 *
 * These schemas are imported by both the server actions
 * (`app/actions/public-booking.ts`) and the client forms (under
 * `app/(public)/book/_components/`) so all three sides stay in sync.
 */

const isoDate = z
  .string()
  .min(1, "Date is required")
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format");

const todayIso = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format")
  .refine(
    (value) => value >= new Date().toISOString().slice(0, 10),
    "Check-in date cannot be in the past",
  );

/**
 * Server-side schema — accepts whatever the action caller sends (could be
 * a string from a URL search param), then coerces numeric fields.
 */
export const searchAvailabilitySchema = z
  .object({
    checkIn: todayIso,
    checkOut: isoDate,
    adults: z.coerce.number().int("Adults must be an integer").min(1, "At least one adult").max(6, "No more than 6 guests"),
    children: z.coerce
      .number()
      .int("Children must be an integer")
      .min(0, "Children cannot be negative")
      .max(6, "No more than 6 children")
      .default(0),
  })
  .refine((data) => data.checkOut > data.checkIn, {
    path: ["checkOut"],
    message: "Check-out must be after check-in",
  });

export type SearchAvailabilityInput = z.infer<typeof searchAvailabilitySchema>;

/**
 * Strict form-side schema used by `react-hook-form` — values are
 * concrete `number`s so the resolver output narrows cleanly.
 */
export const searchAvailabilityFormSchema = z.object({
  checkIn: todayIso,
  checkOut: isoDate,
  adults: z.number().int().min(1).max(6),
  children: z.number().int().min(0).max(6),
});

export type SearchAvailabilityFormValues = z.infer<
  typeof searchAvailabilityFormSchema
>;

/**
 * Booking-creation payload. Either a specific `roomId` (when the guest
 * already picked one on the calendar) or a `roomTypeId` (when the widget
 * lets the server auto-assign the first available room of that type).
 */
export const directBookingSchema = z
  .object({
    roomTypeId: z.string().trim().min(1, "Room type is required"),
    roomId: z.string().trim().min(1).optional(),
    checkIn: todayIso,
    checkOut: isoDate,
    adults: z.number().int().min(1).max(6),
    children: z.number().int().min(0).max(6),
    guestFirstName: z
      .string()
      .trim()
      .min(1, "First name is required")
      .max(60, "First name is too long"),
    guestLastName: z
      .string()
      .trim()
      .min(1, "Last name is required")
      .max(60, "Last name is too long"),
    guestEmail: z
      .string()
      .trim()
      .toLowerCase()
      .email("Please enter a valid email address"),
    guestPhone: z
      .string()
      .trim()
      .min(7, "Phone number looks too short")
      .max(32, "Phone number is too long")
      .optional()
      .or(z.literal("")),
    specialRequests: z
      .string()
      .trim()
      .max(500, "Notes are too long")
      .optional()
      .or(z.literal("")),
    paymentMethod: z.enum(["CARD", "CASH"]).optional().default("CARD"),
  })
  .refine((data) => data.checkOut > data.checkIn, {
    path: ["checkOut"],
    message: "Check-out must be after check-in",
  });

export type DirectBookingInput = z.infer<typeof directBookingSchema>;
