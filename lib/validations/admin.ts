import { z } from "zod";

const strongPassword = z
  .string()
  .min(12, "Password must be at least 12 characters")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/\d/, "Password must contain at least one number")
  .regex(
    /[^A-Za-z0-9]/,
    "Password must contain at least one special character",
  );

const optionalPhone = z
  .string()
  .trim()
  .min(7, "Phone number looks too short")
  .max(32, "Phone number is too long")
  .optional();

export const inviteAdminSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(120, "Name is too long"),
  email: z
    .string()
    .min(1, "Email is required")
    .email("Please enter a valid email address"),
  phone: optionalPhone,
  temporaryPassword: strongPassword,
});

export const updateAdminSchema = z.object({
  staffId: z.string().min(1, "Staff id is required"),
  userId: z.string().min(1, "User id is required"),
  name: z
    .string()
    .min(1, "Name is required")
    .max(120, "Name is too long"),
  email: z
    .string()
    .min(1, "Email is required")
    .email("Please enter a valid email address"),
  phone: optionalPhone,
  isActive: z.boolean(),
});

export const staffIdSchema = z.object({
  staffId: z.string().min(1, "Staff id is required"),
});

export const resetAdminPasswordSchema = z.object({
  staffId: z.string().min(1, "Staff id is required"),
  newPassword: strongPassword,
});

export const adminStatusFilter = z.enum(["all", "active", "inactive"]);

export const listAdminsQuerySchema = z.object({
  search: z
    .string()
    .trim()
    .max(120, "Search is too long")
    .optional(),
  status: adminStatusFilter.default("all"),
  cursor: z.string().trim().min(1).optional(),
  limit: z
    .coerce.number()
    .int("Limit must be an integer")
    .min(1, "Limit must be at least 1")
    .max(50, "Limit cannot exceed 50")
    .default(10),
});

export const listAdminAuditQuerySchema = z.object({
  cursor: z.string().trim().min(1).optional(),
  limit: z
    .coerce.number()
    .int("Limit must be an integer")
    .min(1, "Limit must be at least 1")
    .max(50, "Limit cannot exceed 50")
    .default(20),
});

export type InviteAdminInput = z.infer<typeof inviteAdminSchema>;
export type UpdateAdminInput = z.infer<typeof updateAdminSchema>;
export type StaffIdInput = z.infer<typeof staffIdSchema>;
export type ResetAdminPasswordInput = z.infer<typeof resetAdminPasswordSchema>;
export type ListAdminsQuery = z.infer<typeof listAdminsQuerySchema>;
export type ListAdminAuditQuery = z.infer<typeof listAdminAuditQuerySchema>;
export type AdminStatusFilter = z.infer<typeof adminStatusFilter>;