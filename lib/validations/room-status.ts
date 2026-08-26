import { z } from "zod";

export const ROOM_STATUSES = [
  "AVAILABLE",
  "OCCUPIED",
  "DIRTY",
  "CLEANING",
  "MAINTENANCE",
  "OUT_OF_ORDER",
] as const;

export type RoomStatus = (typeof ROOM_STATUSES)[number];

export const updateRoomStatusSchema = z.object({
  roomId: z.string().min(1, "Room ID is required"),

  status: z.enum(ROOM_STATUSES, {
    message: "Please select a new status",
  }),

  notes: z
    .string()
    .trim()
    .max(500, "Notes are too long")
    .optional()
    .or(z.literal("")),
});

export const getRoomStatusHistorySchema = z.object({
  roomId: z.string().min(1, "Room ID is required"),
  limit: z
    .coerce
    .number()
    .int()
    .min(1)
    .max(50)
    .default(20)
    .optional(),
});

export const listRoomsWithStatusSchema = z.object({
  floor: z.coerce.number().int().min(0).optional(),
  roomTypeId: z.string().optional(),
  status: z
    .enum(["ALL", ...ROOM_STATUSES])
    .default("ALL"),
});

export type UpdateRoomStatusInput = z.infer<typeof updateRoomStatusSchema>;
export type GetRoomStatusHistoryInput = z.infer<typeof getRoomStatusHistorySchema>;
export type ListRoomsWithStatusInput = z.infer<typeof listRoomsWithStatusSchema>;
