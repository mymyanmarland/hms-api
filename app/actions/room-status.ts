"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import prisma from "@/lib/prisma";
import { requireAdminOrThrow, type AdminActor } from "@/lib/admin-auth";
import type { ActionResponse } from "@/app/actions/password-reset";
import {
  updateRoomStatusSchema,
  getRoomStatusHistorySchema,
  listRoomsWithStatusSchema,
  type UpdateRoomStatusInput,
  type GetRoomStatusHistoryInput,
  type ListRoomsWithStatusInput,
} from "@/lib/validations/room-status";

// ============================================
// TYPES
// ============================================

export type RoomWithDetails = {
  id: string;
  number: string;
  floor: number;
  status: "AVAILABLE" | "OCCUPIED" | "DIRTY" | "CLEANING" | "MAINTENANCE" | "OUT_OF_ORDER";
  notes: string | null;
  roomTypeId: string;
  roomType: {
    id: string;
    name: string;
    basePrice: string;
    bedConfig: string | null;
  };
  currentGuest: {
    bookingId: string;
    guestName: string;
    checkOutDate: string | null;
  } | null;
};

export type RoomStatusHistoryEntry = {
  id: string;
  status: string;
  notes: string | null;
  changedAt: string;
  changedBy: string | null;
};

export type HousekeepingSummary = {
  totalRooms: number;
  available: number;
  occupied: number;
  dirty: number;
  cleaning: number;
  maintenance: number;
  outOfOrder: number;
  outOfService: number;
};

// ============================================
// ACTIONS
// ============================================

function flattenZodErrors(
  errors: Record<string, string[] | undefined>,
): Record<string, string[]> {
  const result: Record<string, string[]> = {};
  for (const [key, value] of Object.entries(errors)) {
    if (value && value.length > 0) {
      result[key] = value;
    }
  }
  return result;
}

export async function listRoomsWithStatusAction(
  input: ListRoomsWithStatusInput,
): Promise<ActionResponse<{ rooms: RoomWithDetails[]; summary: HousekeepingSummary }>> {
  try {
    const actor = await requireAdminOrThrow();
  } catch {
    return { success: false, error: "Authentication required" };
  }

  const parsed = listRoomsWithStatusSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      fieldErrors: flattenZodErrors(parsed.error.flatten().fieldErrors),
    };
  }

  try {
    // Build where clause
    const where: Record<string, unknown> = {};

    if (parsed.data.floor !== undefined) {
      where.floor = parsed.data.floor;
    }

    if (parsed.data.roomTypeId) {
      where.roomTypeId = parsed.data.roomTypeId;
    }

    if (parsed.data.status !== "ALL") {
      where.status = parsed.data.status;
    }

    // Fetch rooms with room type and current guest info
    const rooms = await prisma.room.findMany({
      where,
      include: {
        roomType: {
          select: {
            id: true,
            name: true,
            basePrice: true,
            bedConfig: true,
          },
        },
        bookingRooms: {
          where: {
            booking: {
              status: "CHECKED_IN",
            },
          },
          select: {
            booking: {
              select: {
                id: true,
                guestFirstName: true,
                guestLastName: true,
                checkOutDate: true,
              },
            },
          },
          take: 1,
        },
      },
      orderBy: [
        { floor: "asc" },
        { number: "asc" },
      ],
    });

    // Compute summary from all rooms (ignoring filters for summary counts)
    const allRooms = await prisma.room.findMany({
      select: { status: true },
    });

    const summary: HousekeepingSummary = {
      totalRooms: allRooms.length,
      available: allRooms.filter((r) => r.status === "AVAILABLE").length,
      occupied: allRooms.filter((r) => r.status === "OCCUPIED").length,
      dirty: allRooms.filter((r) => r.status === "DIRTY").length,
      cleaning: allRooms.filter((r) => r.status === "CLEANING").length,
      maintenance: allRooms.filter((r) => r.status === "MAINTENANCE").length,
      outOfOrder: allRooms.filter((r) => r.status === "OUT_OF_ORDER").length,
      outOfService: allRooms.filter((r) =>
        ["MAINTENANCE", "OUT_OF_ORDER", "CLEANING"].includes(r.status)
      ).length,
    };

    const formattedRooms: RoomWithDetails[] = rooms.map((room) => ({
      id: room.id,
      number: room.number,
      floor: room.floor,
      status: room.status,
      notes: room.notes,
      roomTypeId: room.roomTypeId,
      roomType: {
        id: room.roomType.id,
        name: room.roomType.name,
        basePrice: room.roomType.basePrice.toString(),
        bedConfig: room.roomType.bedConfig,
      },
      currentGuest: room.bookingRooms[0]
        ? {
            bookingId: room.bookingRooms[0].booking.id,
            guestName: `${room.bookingRooms[0].booking.guestFirstName} ${room.bookingRooms[0].booking.guestLastName}`,
            checkOutDate: room.bookingRooms[0].booking.checkOutDate?.toISOString().split("T")[0] ?? null,
          }
        : null,
    }));

    return {
      success: true,
      data: { rooms: formattedRooms, summary },
    };
  } catch (error) {
    console.error("listRoomsWithStatusAction error:", error);
    return { success: false, error: "Failed to load rooms" };
  }
}

export async function getRoomStatusHistoryAction(
  input: GetRoomStatusHistoryInput,
): Promise<ActionResponse<{ history: RoomStatusHistoryEntry[] }>> {
  try {
    const actor = await requireAdminOrThrow();
  } catch {
    return { success: false, error: "Authentication required" };
  }

  const parsed = getRoomStatusHistorySchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      fieldErrors: flattenZodErrors(parsed.error.flatten().fieldErrors),
    };
  }

  try {
    // Verify room exists
    const room = await prisma.room.findUnique({
      where: { id: parsed.data.roomId },
      select: { id: true, number: true },
    });

    if (!room) {
      return { success: false, error: "Room not found" };
    }

    const history = await prisma.roomStatusHistory.findMany({
      where: { roomId: parsed.data.roomId },
      orderBy: { changedAt: "desc" },
      take: parsed.data.limit ?? 20,
      select: {
        id: true,
        status: true,
        notes: true,
        changedAt: true,
        changedBy: true,
      },
    });

    return {
      success: true,
      data: {
        history: history.map((h) => ({
          ...h,
          changedAt: h.changedAt.toISOString(),
        })),
      },
    };
  } catch (error) {
    console.error("getRoomStatusHistoryAction error:", error);
    return { success: false, error: "Failed to load status history" };
  }
}

export async function updateRoomStatusAction(
  input: UpdateRoomStatusInput,
): Promise<ActionResponse> {
  let actor: AdminActor;
  try {
    actor = await requireAdminOrThrow();
  } catch {
    return { success: false, error: "Authentication required" };
  }

  const parsed = updateRoomStatusSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      fieldErrors: flattenZodErrors(parsed.error.flatten().fieldErrors),
    };
  }

  const { roomId, status, notes } = parsed.data;

  try {
    // Verify room exists and get current status
    const room = await prisma.room.findUnique({
      where: { id: roomId },
      select: { id: true, number: true, status: true, notes: true },
    });

    if (!room) {
      return { success: false, error: "Room not found" };
    }

    // No change needed
    if (room.status === status) {
      return { success: true };
    }

    // Update room status and create history entry in a transaction
    await prisma.$transaction(async (tx) => {
      await tx.room.update({
        where: { id: roomId },
        data: {
          status,
          notes: notes && notes.trim().length > 0 ? notes.trim() : room.notes,
        },
      });

      await tx.roomStatusHistory.create({
        data: {
          roomId,
          status,
          notes: notes && notes.trim().length > 0
            ? notes.trim()
            : `Status changed from ${room.status} to ${status}`,
          changedBy: actor.staff.id,
        },
      });
    });

    // Revalidate relevant paths
    revalidatePath("/dashboard/calendar");
    revalidatePath("/dashboard/frontdesk");
    revalidatePath("/dashboard/housekeeping");

    return { success: true };
  } catch (error) {
    console.error("updateRoomStatusAction error:", error);
    return { success: false, error: "Failed to update room status" };
  }
}
