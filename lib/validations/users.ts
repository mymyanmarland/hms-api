import { z } from "zod";

export const userIdSchema = z.object({
  userId: z.string().min(1, "User id is required"),
});

export const updateUserSchema = z.object({
  userId: z.string().min(1, "User id is required"),
  name: z
    .string()
    .min(1, "Name is required")
    .max(120, "Name is too long"),
  email: z
    .string()
    .min(1, "Email is required")
    .email("Please enter a valid email address"),
});

export const userStatusFilter = z.enum(["all", "active", "inactive"]);

export const listUsersQuerySchema = z.object({
  search: z
    .string()
    .trim()
    .max(120, "Search is too long")
    .optional(),
  status: userStatusFilter.default("all"),
  cursor: z.string().trim().min(1).optional(),
  limit: z
    .coerce.number()
    .int("Limit must be an integer")
    .min(1, "Limit must be at least 1")
    .max(50, "Limit cannot exceed 50")
    .default(10),
});

export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type UserIdInput = z.infer<typeof userIdSchema>;
export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;
export type UserStatusFilter = z.infer<typeof userStatusFilter>;
