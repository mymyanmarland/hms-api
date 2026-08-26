"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import prisma from "@/lib/prisma";
import { requireAdminOrThrow, type AdminActor } from "@/lib/admin-auth";
import {
  createGroupBookingSchema,
  updateGroupBookingSchema,
  addToGroupSchema,
  removeFromGroupSchema,
  listGroupBookingsQuerySchema,
  groupBookingIdSchema,
  receiveDepositSchema,
  type CreateGroupBookingInput,
  type UpdateGroupBookingInput,
  type AddToGroupInput,
  type RemoveFromGroupInput,
  type ListGroupBookingsQuery,
  type GroupBookingIdInput,
  type ReceiveDepositInput,
} from "@/lib/validations/group-booking";
import type { ActionResponse } from "@/app/actions/password-reset";

// ============================================
// TYPES
// ============================================

export type GroupBookingRow = {
  id: string;
  groupName: string;
  groupType: "CORPORATE" | "WEDDING" | "TOUR" | "SPORTS" | "GOVERNMENT" | "OTHER";
  groupCode: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string | null;
  contactCompany: string | null;
  roomsBlocked: number;
  roomsConfirmed: number;
  discountPercent: string;
  depositRequired: boolean;
  depositAmount: string | null;
  depositReceived: string;
  status: string;
  createdAt: string;
};

export type GroupBookingDetails = {
  id: string;
  groupName: string;
  groupType: string;
  groupCode: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string | null;
  contactCompany: string | null;
  roomsBlocked: number;
  roomsConfirmed: number;
  discountPercent: string;
  discountNotes: string | null;
  depositRequired: boolean;
  depositAmount: string | null;
  depositReceived: string;
  depositDueDate: string | null;
  depositReceivedAt: string | null;
  bookingCutoffDate: string | null;
  releaseDate: string | null;
  notes: string | null;
  internalNotes: string | null;
  arrivalInfo: string | null;
  departureInfo: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  childBookings: GroupChildBooking[];
};

export type GroupChildBooking = {
  id: string;
  confirmationCode: string;
  status: string;
  guestFirstName: string;
  guestLastName: string;
  guestEmail: string;
  roomNumber: string | null;
  roomTypeName: string | null;
  checkInDate: string;
  checkOutDate: string;
  totalAmount: string;
  createdAt: string;
};

export type GroupBookingsListResponse = {
  data: GroupBookingRow[];
  nextCursor: string | null;
  total: number;
};

// ============================================
// HELPERS
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

function toIsoDate(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function normalizeToUtcStart(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00.000Z`);
}

function generateGroupCode(): string {
  const year = new Date().getUTCFullYear();
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let suffix = "";
  for (let i = 0; i < 6; i += 1) {
    suffix += chars[Math.floor(Math.random() * chars.length)];
  }
  return `GRP-${year}-${suffix}`;
}

// ============================================
// ACTIONS
// ============================================

export async function createGroupBookingAction(
  input: CreateGroupBookingInput,
): Promise<ActionResponse<{ groupBookingId: string; groupCode: string }>> {
  const parsed = createGroupBookingSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      fieldErrors: flattenZodErrors(parsed.error.flatten().fieldErrors),
    };
  }

  let actor: AdminActor;
  try {
    actor = await requireAdminOrThrow();
  } catch {
    return {
      success: false,
      error: "You do not have permission to create group bookings.",
    };
  }

  const data = parsed.data;

  try {
    let groupCode = generateGroupCode();
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const exists = await prisma.groupBooking.findUnique({
        where: { groupCode },
        select: { id: true },
      });
      if (!exists) break;
      groupCode = generateGroupCode();
    }

    const groupBooking = await prisma.groupBooking.create({
      data: {
        groupName: data.groupName,
        groupType: data.groupType,
        groupCode,
        contactName: data.contactName,
        contactEmail: data.contactEmail.toLowerCase(),
        contactPhone: data.contactPhone,
        contactCompany: data.contactCompany,
        roomsBlocked: data.roomsBlocked,
        discountPercent: data.discountPercent,
        discountNotes: data.discountNotes,
        depositRequired: data.depositRequired,
        depositAmount: data.depositAmount,
        depositDueDate: data.depositDueDate
          ? normalizeToUtcStart(data.depositDueDate)
          : null,
        bookingCutoffDate: data.bookingCutoffDate
          ? normalizeToUtcStart(data.bookingCutoffDate)
          : null,
        releaseDate: data.releaseDate
          ? normalizeToUtcStart(data.releaseDate)
          : null,
        notes: data.notes,
        internalNotes: data.internalNotes,
        arrivalInfo: data.arrivalInfo,
        departureInfo: data.departureInfo,
      },
      select: { id: true, groupCode: true },
    });

    revalidatePath("/dashboard/group-bookings");

    void actor;
    return {
      success: true,
      data: {
        groupBookingId: groupBooking.id,
        groupCode: groupBooking.groupCode,
      },
    };
  } catch (error) {
    console.error("Create group booking error:", error);
    return {
      success: false,
      error: "Failed to create group booking. Please try again.",
    };
  }
}

export async function getGroupBookingsAction(
  input: ListGroupBookingsQuery,
): Promise<ActionResponse<GroupBookingsListResponse>> {
  const parsed = listGroupBookingsQuerySchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      fieldErrors: flattenZodErrors(parsed.error.flatten().fieldErrors),
    };
  }

  let actor: AdminActor;
  try {
    actor = await requireAdminOrThrow();
  } catch {
    return {
      success: false,
      error: "You do not have permission to view group bookings.",
    };
  }

  const { search, groupType, status, cursor, limit } = parsed.data;

  try {
    const where: Record<string, unknown> = {};

    if (search) {
      where.OR = [
        { groupName: { contains: search, mode: "insensitive" } },
        { groupCode: { contains: search, mode: "insensitive" } },
        { contactName: { contains: search, mode: "insensitive" } },
        { contactEmail: { contains: search, mode: "insensitive" } },
        { contactCompany: { contains: search, mode: "insensitive" } },
      ];
    }

    if (groupType) {
      where.groupType = groupType;
    }

    if (status !== "ALL") {
      where.status = status;
    }

    const [groupBookings, total] = await Promise.all([
      prisma.groupBooking.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit + 1,
        ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
        select: {
          id: true,
          groupName: true,
          groupType: true,
          groupCode: true,
          contactName: true,
          contactEmail: true,
          contactPhone: true,
          contactCompany: true,
          roomsBlocked: true,
          roomsConfirmed: true,
          discountPercent: true,
          depositRequired: true,
          depositAmount: true,
          depositReceived: true,
          status: true,
          createdAt: true,
        },
      }),
      prisma.groupBooking.count({ where }),
    ]);

    const hasMore = groupBookings.length > limit;
    const data = hasMore ? groupBookings.slice(0, -1) : groupBookings;
    const nextCursor = hasMore ? data[data.length - 1]?.id : null;

    void actor;
    return {
      success: true,
      data: {
        data: data.map((gb) => ({
          id: gb.id,
          groupName: gb.groupName,
          groupType: gb.groupType as GroupBookingRow["groupType"],
          groupCode: gb.groupCode,
          contactName: gb.contactName,
          contactEmail: gb.contactEmail,
          contactPhone: gb.contactPhone,
          contactCompany: gb.contactCompany,
          roomsBlocked: gb.roomsBlocked,
          roomsConfirmed: gb.roomsConfirmed,
          discountPercent: gb.discountPercent.toString(),
          depositRequired: gb.depositRequired,
          depositAmount: gb.depositAmount?.toString() ?? null,
          depositReceived: gb.depositReceived.toString(),
          status: gb.status,
          createdAt: toIsoDate(gb.createdAt),
        })),
        nextCursor,
        total,
      },
    };
  } catch (error) {
    console.error("Get group bookings error:", error);
    return {
      success: false,
      error: "Failed to load group bookings. Please try again.",
    };
  }
}

export async function getGroupBookingDetailsAction(
  input: GroupBookingIdInput,
): Promise<ActionResponse<GroupBookingDetails>> {
  const parsed = groupBookingIdSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      fieldErrors: flattenZodErrors(parsed.error.flatten().fieldErrors),
    };
  }

  let actor: AdminActor;
  try {
    actor = await requireAdminOrThrow();
  } catch {
    return {
      success: false,
      error: "You do not have permission to view group booking details.",
    };
  }

  try {
    const groupBooking = await prisma.groupBooking.findUnique({
      where: { id: parsed.data.groupBookingId },
      include: {
        _count: {
          select: { bookings: true },
        },
      },
    });

    if (!groupBooking) {
      return {
        success: false,
        error: "Group booking not found.",
      };
    }

    const childBookings = await prisma.booking.findMany({
      where: { groupBookingId: parsed.data.groupBookingId },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        confirmationCode: true,
        status: true,
        guestFirstName: true,
        guestLastName: true,
        guestEmail: true,
        checkInDate: true,
        checkOutDate: true,
        totalAmount: true,
        createdAt: true,
        bookingRooms: {
          where: { isPrimary: true },
          include: {
            room: {
              select: {
                number: true,
                roomType: { select: { name: true } },
              },
            },
          },
          take: 1,
        },
      },
    });

    void actor;
    return {
      success: true,
      data: {
        id: groupBooking.id,
        groupName: groupBooking.groupName,
        groupType: groupBooking.groupType,
        groupCode: groupBooking.groupCode,
        contactName: groupBooking.contactName,
        contactEmail: groupBooking.contactEmail,
        contactPhone: groupBooking.contactPhone,
        contactCompany: groupBooking.contactCompany,
        roomsBlocked: groupBooking.roomsBlocked,
        roomsConfirmed: groupBooking.roomsConfirmed,
        discountPercent: groupBooking.discountPercent.toString(),
        discountNotes: groupBooking.discountNotes,
        depositRequired: groupBooking.depositRequired,
        depositAmount: groupBooking.depositAmount?.toString() ?? null,
        depositReceived: groupBooking.depositReceived.toString(),
        depositDueDate: groupBooking.depositDueDate
          ? toIsoDate(groupBooking.depositDueDate)
          : null,
        depositReceivedAt: groupBooking.depositReceivedAt
          ? toIsoDate(groupBooking.depositReceivedAt)
          : null,
        bookingCutoffDate: groupBooking.bookingCutoffDate
          ? toIsoDate(groupBooking.bookingCutoffDate)
          : null,
        releaseDate: groupBooking.releaseDate
          ? toIsoDate(groupBooking.releaseDate)
          : null,
        notes: groupBooking.notes,
        internalNotes: groupBooking.internalNotes,
        arrivalInfo: groupBooking.arrivalInfo,
        departureInfo: groupBooking.departureInfo,
        status: groupBooking.status,
        createdAt: toIsoDate(groupBooking.createdAt),
        updatedAt: toIsoDate(groupBooking.updatedAt),
        childBookings: childBookings.map((b) => ({
          id: b.id,
          confirmationCode: b.confirmationCode,
          status: b.status,
          guestFirstName: b.guestFirstName,
          guestLastName: b.guestLastName,
          guestEmail: b.guestEmail,
          roomNumber: b.bookingRooms[0]?.room?.number ?? null,
          roomTypeName: b.bookingRooms[0]?.room?.roomType?.name ?? null,
          checkInDate: toIsoDate(b.checkInDate),
          checkOutDate: toIsoDate(b.checkOutDate),
          totalAmount: b.totalAmount.toString(),
          createdAt: toIsoDate(b.createdAt),
        })),
      },
    };
  } catch (error) {
    console.error("Get group booking details error:", error);
    return {
      success: false,
      error: "Failed to load group booking details. Please try again.",
    };
  }
}

export async function updateGroupBookingAction(
  input: UpdateGroupBookingInput,
): Promise<ActionResponse<{ groupBookingId: string }>> {
  const parsed = updateGroupBookingSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      fieldErrors: flattenZodErrors(parsed.error.flatten().fieldErrors),
    };
  }

  let actor: AdminActor;
  try {
    actor = await requireAdminOrThrow();
  } catch {
    return {
      success: false,
      error: "You do not have permission to update group bookings.",
    };
  }

  const { groupBookingId, ...updateData } = parsed.data;

  try {
    const existing = await prisma.groupBooking.findUnique({
      where: { id: groupBookingId },
    });

    if (!existing) {
      return {
        success: false,
        error: "Group booking not found.",
      };
    }

    await prisma.groupBooking.update({
      where: { id: groupBookingId },
      data: {
        ...(updateData.groupName && { groupName: updateData.groupName }),
        ...(updateData.groupType && { groupType: updateData.groupType }),
        ...(updateData.contactName && { contactName: updateData.contactName }),
        ...(updateData.contactEmail && {
          contactEmail: updateData.contactEmail.toLowerCase(),
        }),
        ...(updateData.contactPhone !== undefined && {
          contactPhone: updateData.contactPhone,
        }),
        ...(updateData.contactCompany !== undefined && {
          contactCompany: updateData.contactCompany,
        }),
        ...(updateData.roomsBlocked && { roomsBlocked: updateData.roomsBlocked }),
        ...(updateData.discountPercent !== undefined && {
          discountPercent: updateData.discountPercent,
        }),
        ...(updateData.discountNotes !== undefined && {
          discountNotes: updateData.discountNotes,
        }),
        ...(updateData.depositRequired !== undefined && {
          depositRequired: updateData.depositRequired,
        }),
        ...(updateData.depositAmount !== undefined && {
          depositAmount: updateData.depositAmount,
        }),
        ...(updateData.depositReceived !== undefined && {
          depositReceived: updateData.depositReceived,
        }),
        ...(updateData.depositDueDate && {
          depositDueDate: normalizeToUtcStart(updateData.depositDueDate),
        }),
        ...(updateData.bookingCutoffDate && {
          bookingCutoffDate: normalizeToUtcStart(updateData.bookingCutoffDate),
        }),
        ...(updateData.releaseDate && {
          releaseDate: normalizeToUtcStart(updateData.releaseDate),
        }),
        ...(updateData.notes !== undefined && { notes: updateData.notes }),
        ...(updateData.internalNotes !== undefined && {
          internalNotes: updateData.internalNotes,
        }),
        ...(updateData.arrivalInfo !== undefined && {
          arrivalInfo: updateData.arrivalInfo,
        }),
        ...(updateData.departureInfo !== undefined && {
          departureInfo: updateData.departureInfo,
        }),
        ...(updateData.status && { status: updateData.status }),
      },
    });

    revalidatePath("/dashboard/group-bookings");

    void actor;
    return {
      success: true,
      data: { groupBookingId },
    };
  } catch (error) {
    console.error("Update group booking error:", error);
    return {
      success: false,
      error: "Failed to update group booking. Please try again.",
    };
  }
}

export async function addToGroupAction(
  input: AddToGroupInput,
): Promise<ActionResponse<{ bookingId: string; groupBookingId: string }>> {
  const parsed = addToGroupSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      fieldErrors: flattenZodErrors(parsed.error.flatten().fieldErrors),
    };
  }

  let actor: AdminActor;
  try {
    actor = await requireAdminOrThrow();
  } catch {
    return {
      success: false,
      error: "You do not have permission to add bookings to groups.",
    };
  }

  try {
    const [booking, groupBooking] = await Promise.all([
      prisma.booking.findUnique({
        where: { id: parsed.data.bookingId },
        include: {
          guest: { select: { id: true } },
        },
      }),
      prisma.groupBooking.findUnique({
        where: { id: parsed.data.groupBookingId },
      }),
    ]);

    if (!booking) {
      return {
        success: false,
        error: "Booking not found.",
      };
    }

    if (!groupBooking) {
      return {
        success: false,
        error: "Group booking not found.",
      };
    }

    if (groupBooking.status !== "ACTIVE") {
      return {
        success: false,
        error: "Cannot add bookings to an inactive group.",
      };
    }

    if (booking.groupBookingId) {
      return {
        success: false,
        error: "Booking is already part of a group.",
      };
    }

    await prisma.$transaction(async (tx) => {
      await tx.booking.update({
        where: { id: booking.id },
        data: {
          isGroupBooking: true,
          groupName: groupBooking.groupName,
          groupBookingId: groupBooking.id,
          ...(parsed.data.overrideDiscount &&
            groupBooking.discountPercent.toNumber() > 0 && {
              // Recalculate with discount
              discounts: booking.subtotal.mul(groupBooking.discountPercent).div(100),
            }),
        },
      });

      await tx.groupBooking.update({
        where: { id: groupBooking.id },
        data: {
          roomsConfirmed: { increment: 1 },
        },
      });
    });

    revalidatePath("/dashboard/group-bookings");
    revalidatePath("/dashboard/calendar");

    void actor;
    return {
      success: true,
      data: {
        bookingId: booking.id,
        groupBookingId: groupBooking.id,
      },
    };
  } catch (error) {
    console.error("Add to group error:", error);
    return {
      success: false,
      error: "Failed to add booking to group. Please try again.",
    };
  }
}

export async function removeFromGroupAction(
  input: RemoveFromGroupInput,
): Promise<ActionResponse<{ bookingId: string }>> {
  const parsed = removeFromGroupSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      fieldErrors: flattenZodErrors(parsed.error.flatten().fieldErrors),
    };
  }

  let actor: AdminActor;
  try {
    actor = await requireAdminOrThrow();
  } catch {
    return {
      success: false,
      error: "You do not have permission to remove bookings from groups.",
    };
  }

  try {
    const booking = await prisma.booking.findUnique({
      where: { id: parsed.data.bookingId },
    });

    if (!booking) {
      return {
        success: false,
        error: "Booking not found.",
      };
    }

    if (!booking.groupBookingId) {
      return {
        success: false,
        error: "Booking is not part of any group.",
      };
    }

    if (booking.status === "CHECKED_IN") {
      return {
        success: false,
        error: "Cannot remove a checked-in booking from a group.",
      };
    }

    await prisma.$transaction(async (tx) => {
      await tx.booking.update({
        where: { id: booking.id },
        data: {
          isGroupBooking: false,
          groupName: null,
          groupBookingId: null,
          discounts: 0,
          totalAmount: booking.subtotal,
        },
      });

      await tx.groupBooking.update({
        where: { id: booking.groupBookingId ?? "" },
        data: {
          roomsConfirmed: { decrement: 1 },
        },
      });
    });

    revalidatePath("/dashboard/group-bookings");
    revalidatePath("/dashboard/calendar");

    void actor;
    return {
      success: true,
      data: { bookingId: booking.id },
    };
  } catch (error) {
    console.error("Remove from group error:", error);
    return {
      success: false,
      error: "Failed to remove booking from group. Please try again.",
    };
  }
}

export async function receiveDepositAction(
  input: ReceiveDepositInput,
): Promise<ActionResponse<{ groupBookingId: string; newDepositReceived: string }>> {
  const parsed = receiveDepositSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      fieldErrors: flattenZodErrors(parsed.error.flatten().fieldErrors),
    };
  }

  let actor: AdminActor;
  try {
    actor = await requireAdminOrThrow();
  } catch {
    return {
      success: false,
      error: "You do not have permission to record deposits.",
    };
  }

  try {
    const groupBooking = await prisma.groupBooking.findUnique({
      where: { id: parsed.data.groupBookingId },
    });

    if (!groupBooking) {
      return {
        success: false,
        error: "Group booking not found.",
      };
    }

    const newDepositReceived =
      Number(groupBooking.depositReceived) + parsed.data.amount;

    await prisma.groupBooking.update({
      where: { id: parsed.data.groupBookingId },
      data: {
        depositReceived: newDepositReceived,
        depositReceivedAt: new Date(),
      },
    });

    revalidatePath("/dashboard/group-bookings");

    void actor;
    return {
      success: true,
      data: {
        groupBookingId: groupBooking.id,
        newDepositReceived: newDepositReceived.toString(),
      },
    };
  } catch (error) {
    console.error("Receive deposit error:", error);
    return {
      success: false,
      error: "Failed to record deposit. Please try again.",
    };
  }
}

export async function deleteGroupBookingAction(
  input: GroupBookingIdInput,
): Promise<ActionResponse<{ groupBookingId: string }>> {
  const parsed = groupBookingIdSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      fieldErrors: flattenZodErrors(parsed.error.flatten().fieldErrors),
    };
  }

  let actor: AdminActor;
  try {
    actor = await requireAdminOrThrow();
  } catch {
    return {
      success: false,
      error: "You do not have permission to delete group bookings.",
    };
  }

  try {
    const groupBooking = await prisma.groupBooking.findUnique({
      where: { id: parsed.data.groupBookingId },
      include: {
        _count: {
          select: { bookings: true },
        },
      },
    });

    if (!groupBooking) {
      return {
        success: false,
        error: "Group booking not found.",
      };
    }

    if (groupBooking._count.bookings > 0) {
      return {
        success: false,
        error: "Cannot delete group with associated bookings. Remove all bookings first.",
      };
    }

    await prisma.groupBooking.delete({
      where: { id: parsed.data.groupBookingId },
    });

    revalidatePath("/dashboard/group-bookings");

    void actor;
    return {
      success: true,
      data: { groupBookingId: parsed.data.groupBookingId },
    };
  } catch (error) {
    console.error("Delete group booking error:", error);
    return {
      success: false,
      error: "Failed to delete group booking. Please try again.",
    };
  }
}
