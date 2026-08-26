import { z } from "zod";

export const groupTypeEnum = z.enum([
  "CORPORATE",
  "WEDDING",
  "TOUR",
  "SPORTS",
  "GOVERNMENT",
  "OTHER",
]);

export const createGroupBookingSchema = z.object({
  groupName: z
    .string()
    .trim()
    .min(1, "Group name is required")
    .max(200, "Group name is too long"),

  groupType: groupTypeEnum,

  // Contact person
  contactName: z
    .string()
    .trim()
    .min(1, "Contact name is required")
    .max(120, "Contact name is too long"),
  contactEmail: z
    .string()
    .min(1, "Contact email is required")
    .email("Please enter a valid email address"),
  contactPhone: z
    .string()
    .trim()
    .min(7, "Phone number looks too short")
    .max(32, "Phone number is too long")
    .optional(),
  contactCompany: z
    .string()
    .trim()
    .max(200, "Company name is too long")
    .optional(),

  // Block reservation settings
  roomsBlocked: z
    .number()
    .int("Rooms must be an integer")
    .min(1, "At least 1 room is required")
    .max(100, "Cannot block more than 100 rooms"),

  // Discount settings
  discountPercent: z
    .number()
    .min(0, "Discount cannot be negative")
    .max(100, "Discount cannot exceed 100%"),
  discountNotes: z
    .string()
    .trim()
    .max(500, "Discount notes are too long")
    .optional(),

  // Deposit settings
  depositRequired: z.boolean(),
  depositAmount: z
    .number()
    .nonnegative("Deposit amount cannot be negative")
    .optional(),
  depositDueDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format")
    .optional(),

  // Booking window/cut-off
  bookingCutoffDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format")
    .optional(),
  releaseDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format")
    .optional(),

  // Notes
  notes: z
    .string()
    .trim()
    .max(1000, "Notes are too long")
    .optional(),
  internalNotes: z
    .string()
    .trim()
    .max(2000, "Internal notes are too long")
    .optional(),

  // Arrival/departure info
  arrivalInfo: z
    .string()
    .trim()
    .max(500, "Arrival info is too long")
    .optional(),
  departureInfo: z
    .string()
    .trim()
    .max(500, "Departure info is too long")
    .optional(),
});

export const updateGroupBookingSchema = z.object({
  groupBookingId: z.string().min(1, "Group booking ID is required"),

  groupName: z
    .string()
    .trim()
    .min(1, "Group name is required")
    .max(200, "Group name is too long")
    .optional(),

  groupType: groupTypeEnum.optional(),

  // Contact person
  contactName: z
    .string()
    .trim()
    .min(1, "Contact name is required")
    .max(120, "Contact name is too long")
    .optional(),
  contactEmail: z
    .string()
    .email("Please enter a valid email address")
    .optional(),
  contactPhone: z
    .string()
    .trim()
    .min(7, "Phone number looks too short")
    .max(32, "Phone number is too long")
    .optional(),
  contactCompany: z
    .string()
    .trim()
    .max(200, "Company name is too long")
    .optional(),

  // Block reservation settings
  roomsBlocked: z
    .number()
    .int("Rooms must be an integer")
    .min(1, "At least 1 room is required")
    .max(100, "Cannot block more than 100 rooms")
    .optional(),

  // Discount settings
  discountPercent: z
    .number()
    .min(0, "Discount cannot be negative")
    .max(100, "Discount cannot exceed 100%")
    .optional(),
  discountNotes: z
    .string()
    .trim()
    .max(500, "Discount notes are too long")
    .optional(),

  // Deposit settings
  depositRequired: z.boolean().optional(),
  depositAmount: z
    .number()
    .nonnegative("Deposit amount cannot be negative")
    .optional(),
  depositReceived: z
    .number()
    .nonnegative("Deposit received cannot be negative")
    .optional(),
  depositDueDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format")
    .optional(),

  // Booking window/cut-off
  bookingCutoffDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format")
    .optional(),
  releaseDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format")
    .optional(),

  // Notes
  notes: z
    .string()
    .trim()
    .max(1000, "Notes are too long")
    .optional(),
  internalNotes: z
    .string()
    .trim()
    .max(2000, "Internal notes are too long")
    .optional(),

  // Arrival/departure info
  arrivalInfo: z
    .string()
    .trim()
    .max(500, "Arrival info is too long")
    .optional(),
  departureInfo: z
    .string()
    .trim()
    .max(500, "Departure info is too long")
    .optional(),

  // Status
  status: z.enum(["ACTIVE", "COMPLETED", "CANCELLED"]).optional(),
});

export const addToGroupSchema = z.object({
  bookingId: z.string().min(1, "Booking ID is required"),
  groupBookingId: z.string().min(1, "Group booking ID is required"),
  overrideDiscount: z.boolean().default(false),
});

export const removeFromGroupSchema = z.object({
  bookingId: z.string().min(1, "Booking ID is required"),
  reason: z
    .string()
    .trim()
    .min(1, "Reason is required")
    .max(500, "Reason is too long")
    .optional(),
});

export const listGroupBookingsQuerySchema = z.object({
  search: z
    .string()
    .trim()
    .max(200, "Search is too long")
    .optional(),
  groupType: groupTypeEnum.optional(),
  status: z
    .enum(["ALL", "ACTIVE", "COMPLETED", "CANCELLED"])
    .default("ALL"),
  cursor: z.string().trim().min(1).optional(),
  limit: z
    .coerce
    .number()
    .int("Limit must be an integer")
    .min(1, "Limit must be at least 1")
    .max(50, "Limit cannot exceed 50")
    .default(10),
});

export const groupBookingIdSchema = z.object({
  groupBookingId: z.string().min(1, "Group booking ID is required"),
});

export const receiveDepositSchema = z.object({
  groupBookingId: z.string().min(1, "Group booking ID is required"),
  amount: z
    .number()
    .positive("Amount must be positive"),
  paymentMethod: z.enum([
    "CASH",
    "CREDIT_CARD",
    "DEBIT_CARD",
    "BANK_TRANSFER",
  ]),
  reference: z
    .string()
    .trim()
    .max(100, "Reference is too long")
    .optional(),
});

export type GroupType = z.infer<typeof groupTypeEnum>;
export type CreateGroupBookingInput = z.infer<typeof createGroupBookingSchema>;
export type UpdateGroupBookingInput = z.infer<typeof updateGroupBookingSchema>;
export type AddToGroupInput = z.infer<typeof addToGroupSchema>;
export type RemoveFromGroupInput = z.infer<typeof removeFromGroupSchema>;
export type ListGroupBookingsQuery = z.infer<typeof listGroupBookingsQuerySchema>;
export type GroupBookingIdInput = z.infer<typeof groupBookingIdSchema>;
export type ReceiveDepositInput = z.infer<typeof receiveDepositSchema>;
