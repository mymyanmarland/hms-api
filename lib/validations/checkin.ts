import { z } from "zod";

export const checkInQuerySchema = z.object({
  date: z
    .string()
    .min(1, "Date is required")
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format")
    .optional(),
  status: z
    .enum(["ALL", "CONFIRMED", "CHECKED_IN", "PENDING_ROOM"])
    .default("ALL"),
});

export const performCheckInSchema = z.object({
  bookingId: z.string().min(1, "Booking ID is required"),

  // Room assignment
  roomId: z.string().min(1, "Room assignment is required"),

  // Digital key
  generateDigitalKey: z.boolean(),
  keyAccessLevel: z.enum(["GUEST", "STAFF", "EMERGENCY"]),
  keyValidHours: z
    .number()
    .int("Hours must be an integer")
    .min(1, "Key must be valid for at least 1 hour")
    .max(168, "Key cannot exceed 168 hours (1 week)"),

  // ID verification
  idVerified: z.boolean(),
  idDocumentType: z
    .string()
    .trim()
    .min(1, "Document type is required when ID is verified")
    .optional(),
  idDocumentNumber: z
    .string()
    .trim()
    .min(1, "Document number is required when ID is verified")
    .optional(),

  // Acknowledgments
  policiesAccepted: z.boolean(),
  privacyAccepted: z.boolean(),

  // Additional info
  notes: z
    .string()
    .trim()
    .max(500, "Notes are too long")
    .optional(),
});

export const getCheckInDetailsSchema = z.object({
  bookingId: z.string().min(1, "Booking ID is required"),
});

export const cancelCheckInSchema = z.object({
  bookingId: z.string().min(1, "Booking ID is required"),
  reason: z
    .string()
    .trim()
    .min(1, "Reason is required for cancellation")
    .max(500, "Reason is too long"),
});

export const checkInSearchSchema = z.object({
  query: z
    .string()
    .trim()
    .min(1, "Search query is required")
    .max(100, "Search query is too long")
    .optional(),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format")
    .optional(),
});

export type CheckInQuery = z.infer<typeof checkInQuerySchema>;
export type PerformCheckInInput = z.infer<typeof performCheckInSchema>;
export type GetCheckInDetailsInput = z.infer<typeof getCheckInDetailsSchema>;
export type CancelCheckInInput = z.infer<typeof cancelCheckInSchema>;
export type CheckInSearchInput = z.infer<typeof checkInSearchSchema>;
