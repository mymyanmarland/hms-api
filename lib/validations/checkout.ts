import { z } from "zod";

export const checkOutQuerySchema = z.object({
  date: z
    .string()
    .min(1, "Date is required")
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format")
    .optional(),
  status: z
    .enum(["ALL", "CHECKED_IN", "PENDING_PAYMENT", "READY_TO_CHECKOUT"])
    .default("ALL"),
});

export const processCheckOutSchema = z.object({
  bookingId: z.string().min(1, "Booking ID is required"),

  // Checkout details
  departureTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Time must be in HH:mm format")
    .optional(),

  // Key return
  roomKeysReturned: z.boolean().default(true),

  // Payment if needed
  paymentMethod: z
    .enum([
      "CASH",
      "CREDIT_CARD",
      "DEBIT_CARD",
      "BANK_TRANSFER",
      "CORPORATE_ACCOUNT",
      "GIFT_CARD",
      "LOYALTY_POINTS",
      "COMP",
    ])
    .optional(),
  paymentAmount: z
    .number()
    .nonnegative("Payment amount cannot be negative")
    .optional(),

  // Feedback
  feedbackRequested: z.boolean().default(true),

  // Early/late checkout charges
  earlyCheckout: z.boolean().default(false),
  lateCheckout: z.boolean().default(false),
  checkoutCharges: z
    .number()
    .nonnegative("Checkout charges cannot be negative")
    .default(0),

  // Additional info
  notes: z
    .string()
    .trim()
    .max(500, "Notes are too long")
    .optional(),
});

export const getCheckOutDetailsSchema = z.object({
  bookingId: z.string().min(1, "Booking ID is required"),
});

export const addCheckoutChargeSchema = z.object({
  bookingId: z.string().min(1, "Booking ID is required"),
  chargeType: z.enum([
    "EARLY_CHECK_IN",
    "LATE_CHECK_OUT",
    "EXTRA_BED",
    "PET_FEE",
    "OTHER",
  ]),
  description: z
    .string()
    .trim()
    .min(1, "Description is required")
    .max(200, "Description is too long"),
  amount: z
    .number()
    .positive("Amount must be positive"),
});

export const cancelCheckOutSchema = z.object({
  bookingId: z.string().min(1, "Booking ID is required"),
  reason: z
    .string()
    .trim()
    .min(1, "Reason is required for cancellation")
    .max(500, "Reason is too long"),
});

export type CheckOutQuery = z.infer<typeof checkOutQuerySchema>;
export type ProcessCheckOutInput = z.infer<typeof processCheckOutSchema>;
export type GetCheckOutDetailsInput = z.infer<typeof getCheckOutDetailsSchema>;
export type AddCheckoutChargeInput = z.infer<typeof addCheckoutChargeSchema>;
export type CancelCheckOutInput = z.infer<typeof cancelCheckOutSchema>;
