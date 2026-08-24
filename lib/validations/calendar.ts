import { z } from "zod";

const isoDate = z
  .string()
  .min(1, "Date is required")
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format");

export const calendarViewQuerySchema = z.object({
  from: isoDate.optional(),
  roomTypeId: z.string().trim().min(1).optional(),
  floor: z.coerce.number().int().min(0).max(200).optional(),
  status: z
    .union([
      z.literal("ALL"),
      z.literal("TENTATIVE"),
      z.literal("CONFIRMED"),
      z.literal("CHECKED_IN"),
      z.literal("CHECKED_OUT"),
      z.literal("CANCELLED"),
      z.literal("NO_SHOW"),
    ])
    .default("ALL"),
});

export type CalendarViewQuery = z.infer<typeof calendarViewQuerySchema>;

const calendarBookingSource = z.enum([
  "DIRECT",
  "WALK_IN",
  "PHONE",
  "OTA",
  "CORPORATE",
  "GROUP",
]);

export const createBookingFromCalendarSchema = z
  .object({
    roomId: z.string().min(1, "Room is required"),
    checkInDate: isoDate,
    checkOutDate: isoDate,
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
      .min(1, "Email is required")
      .email("Please enter a valid email address"),
    guestPhone: z
      .string()
      .trim()
      .min(7, "Phone number looks too short")
      .max(32, "Phone number is too long")
      .optional(),
    adults: z
      .number()
      .int("Adults must be an integer")
      .min(1, "At least one adult is required")
      .max(6, "Adults cannot exceed 6"),
    children: z
      .number()
      .int("Children must be an integer")
      .min(0, "Children cannot be negative")
      .max(6, "Children cannot exceed 6"),
    source: calendarBookingSource,
    notes: z
      .string()
      .trim()
      .max(500, "Notes are too long")
      .optional(),
  })
  .refine((data) => data.checkOutDate > data.checkInDate, {
    path: ["checkOutDate"],
    message: "Check-out must be after check-in",
  });

export type CreateBookingFromCalendarInput = z.infer<
  typeof createBookingFromCalendarSchema
>;