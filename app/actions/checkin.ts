"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import prisma from "@/lib/prisma";
import { requireAdminOrThrow, type AdminActor } from "@/lib/admin-auth";
import {
  checkInQuerySchema,
  performCheckInSchema,
  getCheckInDetailsSchema,
  cancelCheckInSchema,
  type CheckInQuery,
  type PerformCheckInInput,
  type GetCheckInDetailsInput,
  type CancelCheckInInput,
} from "@/lib/validations/checkin";
import type { ActionResponse } from "@/app/actions/password-reset";

// ============================================
// TYPES
// ============================================

export type ArrivalBooking = {
  id: string;
  confirmationCode: string;
  status: "TENTATIVE" | "CONFIRMED" | "CHECKED_IN" | "CHECKED_OUT" | "CANCELLED" | "NO_SHOW";
  source: "DIRECT" | "WALK_IN" | "PHONE" | "OTA" | "CORPORATE" | "GROUP";
  guestFirstName: string;
  guestLastName: string;
  guestEmail: string;
  guestPhone: string | null;
  adults: number;
  children: number;
  checkInDate: string;
  checkOutDate: string;
  totalAmount: string;
  specialRequests: string | null;
  roomId: string | null;
  roomNumber: string | null;
  roomTypeName: string | null;
  actualCheckIn: string | null;
};

export type CheckInDetails = {
  booking: {
    id: string;
    confirmationCode: string;
    status: string;
    source: string;
    guestFirstName: string;
    guestLastName: string;
    guestEmail: string;
    guestPhone: string | null;
    adults: number;
    children: number;
    infants: number;
    checkInDate: string;
    checkOutDate: string;
    totalAmount: string;
    specialRequests: string | null;
    internalNotes: string | null;
  };
  guest: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string | null;
    nationality: string | null;
    idType: string | null;
    idNumber: string | null;
    isVip: boolean;
  } | null;
  room: {
    id: string;
    number: string;
    floor: number;
    status: string;
    roomType: {
      id: string;
      name: string;
      basePrice: string;
      maxOccupancy: number;
    };
  } | null;
  folio: {
    id: string;
    folioNumber: string;
    balance: string;
  } | null;
  existingCheckIn: {
    id: string;
    checkedInAt: string;
    keyCardNumber: string | null;
  } | null;
};

export type AvailableRoom = {
  id: string;
  number: string;
  floor: number;
  status: string;
  roomType: {
    id: string;
    name: string;
    basePrice: string;
    maxOccupancy: number;
  };
};

export type CheckInResult = {
  bookingId: string;
  confirmationCode: string;
  checkInId: string;
  keyCardNumber: string | null;
  digitalKeyId: string | null;
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

function generateKeyCardNumber(): string {
  const chars = "0123456789";
  let number = "";
  for (let i = 0; i < 8; i += 1) {
    number += chars[Math.floor(Math.random() * chars.length)];
  }
  return `KC-${number}`;
}

function generateDigitalKeyNumber(roomNumber: string): string {
  const chars = "0123456789";
  let suffix = "";
  for (let i = 0; i < 6; i += 1) {
    suffix += chars[Math.floor(Math.random() * chars.length)];
  }
  return `DK-${roomNumber}-${suffix}`;
}

// ============================================
// ACTIONS
// ============================================

export async function getArrivalsAction(
  input: CheckInQuery,
): Promise<ActionResponse<{ arrivals: ArrivalBooking[]; date: string }>> {
  const parsed = checkInQuerySchema.safeParse(input);
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
      error: "You do not have permission to view arrivals.",
    };
  }

  const today = new Date();
  const targetDate = parsed.data.date
    ? normalizeToUtcStart(parsed.data.date)
    : today;
  const targetDateIso = toIsoDate(targetDate);

  const dayStart = normalizeToUtcStart(targetDateIso);
  const dayEnd = new Date(dayStart);
  dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);

  try {
    const statusFilter = parsed.data.status;

    const bookings = await prisma.bookingRoom.findMany({
      where: {
        booking: {
          checkInDate: {
            gte: dayStart,
            lt: dayEnd,
          },
          ...(statusFilter !== "ALL" && statusFilter !== "PENDING_ROOM"
            ? { status: statusFilter }
            : statusFilter === "PENDING_ROOM"
              ? {
                  status: "CONFIRMED",
                  bookingRooms: {
                    none: { roomId: { not: undefined } },
                  },
                }
              : { status: { in: ["CONFIRMED", "TENTATIVE"] } }),
        },
      },
      orderBy: { booking: { checkInDate: "asc" } },
      select: {
        roomId: true,
        room: {
          select: {
            number: true,
            roomType: { select: { name: true } },
          },
        },
        booking: {
          select: {
            id: true,
            confirmationCode: true,
            status: true,
            source: true,
            guestFirstName: true,
            guestLastName: true,
            guestEmail: true,
            guestPhone: true,
            adults: true,
            children: true,
            checkInDate: true,
            checkOutDate: true,
            totalAmount: true,
            specialRequests: true,
            actualCheckIn: true,
          },
        },
      },
    });

    const arrivals: ArrivalBooking[] = bookings.map((br) => ({
      id: br.booking.id,
      confirmationCode: br.booking.confirmationCode,
      status: br.booking.status,
      source: br.booking.source,
      guestFirstName: br.booking.guestFirstName,
      guestLastName: br.booking.guestLastName,
      guestEmail: br.booking.guestEmail,
      guestPhone: br.booking.guestPhone,
      adults: br.booking.adults,
      children: br.booking.children,
      checkInDate: toIsoDate(br.booking.checkInDate),
      checkOutDate: toIsoDate(br.booking.checkOutDate),
      totalAmount: br.booking.totalAmount.toString(),
      specialRequests: br.booking.specialRequests,
      roomId: br.roomId,
      roomNumber: br.room?.number ?? null,
      roomTypeName: br.room?.roomType.name ?? null,
      actualCheckIn: br.booking.actualCheckIn
        ? toIsoDate(br.booking.actualCheckIn)
        : null,
    }));

    void actor;
    return {
      success: true,
      data: { arrivals, date: targetDateIso },
    };
  } catch (error) {
    console.error("Get arrivals error:", error);
    return {
      success: false,
      error: "Failed to load arrivals. Please try again.",
    };
  }
}

export async function getCheckInDetailsAction(
  input: GetCheckInDetailsInput,
): Promise<ActionResponse<CheckInDetails>> {
  const parsed = getCheckInDetailsSchema.safeParse(input);
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
      error: "You do not have permission to view check-in details.",
    };
  }

  try {
    const booking = await prisma.booking.findUnique({
      where: { id: parsed.data.bookingId },
      select: {
        id: true,
        confirmationCode: true,
        status: true,
        source: true,
        guestFirstName: true,
        guestLastName: true,
        guestEmail: true,
        guestPhone: true,
        adults: true,
        children: true,
        infants: true,
        checkInDate: true,
        checkOutDate: true,
        totalAmount: true,
        specialRequests: true,
        internalNotes: true,
        guest: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            nationality: true,
            idType: true,
            idNumber: true,
            isVip: true,
            folios: {
              where: { status: "OPEN" },
              select: {
                id: true,
                folioNumber: true,
                balance: true,
              },
              take: 1,
            },
          },
        },
        bookingRooms: {
          where: { isPrimary: true },
          select: {
            roomId: true,
            room: {
              select: {
                id: true,
                number: true,
                floor: true,
                status: true,
                roomType: {
                  select: {
                    id: true,
                    name: true,
                    basePrice: true,
                    maxOccupancy: true,
                  },
                },
              },
            },
          },
        },
        checkIn: {
          select: {
            id: true,
            checkedInAt: true,
            keyCardNumber: true,
          },
        },
      },
    });

    if (!booking) {
      return {
        success: false,
        error: "Booking not found.",
      };
    }

    const primaryRoom = booking.bookingRooms?.[0];
    const folio = booking.guest?.folios?.[0];

    const result: CheckInDetails = {
      booking: {
        id: booking.id,
        confirmationCode: booking.confirmationCode,
        status: booking.status,
        source: booking.source,
        guestFirstName: booking.guestFirstName,
        guestLastName: booking.guestLastName,
        guestEmail: booking.guestEmail,
        guestPhone: booking.guestPhone,
        adults: booking.adults,
        children: booking.children,
        infants: booking.infants,
        checkInDate: toIsoDate(booking.checkInDate),
        checkOutDate: toIsoDate(booking.checkOutDate),
        totalAmount: booking.totalAmount.toString(),
        specialRequests: booking.specialRequests,
        internalNotes: booking.internalNotes,
      },
      guest: booking.guest
        ? {
            id: booking.guest.id,
            firstName: booking.guest.firstName,
            lastName: booking.guest.lastName,
            email: booking.guest.email,
            phone: booking.guest.phone,
            nationality: booking.guest.nationality,
            idType: booking.guest.idType,
            idNumber: booking.guest.idNumber,
            isVip: booking.guest.isVip,
          }
        : null,
      room: primaryRoom?.room
        ? {
            id: primaryRoom.room.id,
            number: primaryRoom.room.number,
            floor: primaryRoom.room.floor,
            status: primaryRoom.room.status,
            roomType: {
              id: primaryRoom.room.roomType.id,
              name: primaryRoom.room.roomType.name,
              basePrice: primaryRoom.room.roomType.basePrice.toString(),
              maxOccupancy: primaryRoom.room.roomType.maxOccupancy,
            },
          }
        : null,
      folio: folio
        ? {
            id: folio.id,
            folioNumber: folio.folioNumber,
            balance: folio.balance.toString(),
          }
        : null,
      existingCheckIn: booking.checkIn
        ? {
            id: booking.checkIn.id,
            checkedInAt: toIsoDate(booking.checkIn.checkedInAt),
            keyCardNumber: booking.checkIn.keyCardNumber,
          }
        : null,
    };

    void actor;
    return { success: true, data: result };
  } catch (error) {
    console.error("Get check-in details error:", error);
    return {
      success: false,
      error: "Failed to load check-in details. Please try again.",
    };
  }
}

export async function getAvailableRoomsAction(
  checkInDate: string,
  checkOutDate: string,
  excludeRoomId?: string,
): Promise<ActionResponse<AvailableRoom[]>> {
  let actor: AdminActor;
  try {
    actor = await requireAdminOrThrow();
  } catch {
    return {
      success: false,
      error: "You do not have permission to view available rooms.",
    };
  }

  const checkIn = normalizeToUtcStart(checkInDate);
  const checkOut = normalizeToUtcStart(checkOutDate);

  try {
    const bookedRoomIds = await prisma.bookingRoom.findMany({
      where: {
        booking: {
          status: { notIn: ["CANCELLED", "NO_SHOW", "CHECKED_OUT"] },
          checkInDate: { lt: checkOut },
          checkOutDate: { gt: checkIn },
        },
      },
      select: { roomId: true },
    });

    const bookedRoomIdSet = new Set(bookedRoomIds.map((r) => r.roomId));
    if (excludeRoomId) {
      bookedRoomIdSet.delete(excludeRoomId);
    }

    const rooms = await prisma.room.findMany({
      where: {
        status: "AVAILABLE",
        ...(bookedRoomIdSet.size > 0
          ? { id: { notIn: Array.from(bookedRoomIdSet) } }
          : {}),
      },
      orderBy: [{ floor: "asc" }, { number: "asc" }],
      select: {
        id: true,
        number: true,
        floor: true,
        status: true,
        roomType: {
          select: {
            id: true,
            name: true,
            basePrice: true,
            maxOccupancy: true,
          },
        },
      },
    });

    const availableRooms: AvailableRoom[] = rooms.map((room) => ({
      id: room.id,
      number: room.number,
      floor: room.floor,
      status: room.status,
      roomType: {
        id: room.roomType.id,
        name: room.roomType.name,
        basePrice: room.roomType.basePrice.toString(),
        maxOccupancy: room.roomType.maxOccupancy,
      },
    }));

    void actor;
    return { success: true, data: availableRooms };
  } catch (error) {
    console.error("Get available rooms error:", error);
    return {
      success: false,
      error: "Failed to load available rooms. Please try again.",
    };
  }
}

export async function performCheckInAction(
  input: PerformCheckInInput,
): Promise<ActionResponse<CheckInResult>> {
  const parsed = performCheckInSchema.safeParse(input);
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
      error: "You do not have permission to perform check-in.",
    };
  }

  const data = parsed.data;

  try {
    const booking = await prisma.booking.findUnique({
      where: { id: data.bookingId },
      include: {
        checkIn: true,
        bookingRooms: {
          where: { isPrimary: true },
          include: { room: true },
        },
      },
    });

    if (!booking) {
      return {
        success: false,
        error: "Booking not found.",
      };
    }

    if (booking.status === "CHECKED_IN") {
      return {
        success: false,
        error: "Guest has already checked in.",
      };
    }

    if (!["CONFIRMED", "TENTATIVE"].includes(booking.status)) {
      return {
        success: false,
        error: `Cannot check in a booking with status: ${booking.status}`,
      };
    }

    if (booking.checkIn) {
      return {
        success: false,
        error: "Check-in record already exists for this booking.",
      };
    }

    const room = await prisma.room.findUnique({
      where: { id: data.roomId },
      include: { roomType: true },
    });

    if (!room) {
      return {
        success: false,
        fieldErrors: { roomId: ["Selected room no longer exists."] },
      };
    }

    if (room.status !== "AVAILABLE") {
      return {
        success: false,
        fieldErrors: {
          roomId: [`Room ${room.number} is not available (status: ${room.status}).`],
        },
      };
    }

    const conflictingBooking = await prisma.bookingRoom.findFirst({
      where: {
        roomId: room.id,
        booking: {
          id: { not: booking.id },
          status: { notIn: ["CANCELLED", "NO_SHOW", "CHECKED_OUT"] },
          checkInDate: { lt: booking.checkOutDate },
          checkOutDate: { gt: booking.checkInDate },
        },
      },
    });

    if (conflictingBooking) {
      return {
        success: false,
        fieldErrors: {
          roomId: ["Room is already booked for this date range."],
        },
      };
    }

    const keyCardNumber = generateKeyCardNumber();
    const keyExpiration = new Date();
    keyExpiration.setHours(
      keyExpiration.getHours() + (data.keyAccessLevel === "GUEST" ? data.keyValidHours : 168),
    );

    const result = await prisma.$transaction(async (tx) => {
      let bookingRoom = booking.bookingRooms[0];
      let primaryRoom = bookingRoom?.room;

      if (primaryRoom?.id !== data.roomId) {
        if (bookingRoom) {
          await tx.bookingRoom.update({
            where: { id: bookingRoom.id },
            data: { roomId: data.roomId },
          });
        } else {
          await tx.bookingRoom.create({
            data: {
              bookingId: booking.id,
              roomId: data.roomId,
              rate: room.roomType.basePrice,
              totalNights: Math.max(
                Math.round(
                  (booking.checkOutDate.getTime() - booking.checkInDate.getTime()) /
                    (1000 * 60 * 60 * 24),
                ),
                1,
              ),
              isPrimary: true,
              status: "CHECKED_IN",
            },
          });
        }
      }

      const checkIn = await tx.checkIn.create({
        data: {
          bookingId: booking.id,
          checkedInBy: actor.staff.id,
          keyCardNumber,
          keyCardIssued: 1,
          keyExpiration,
          idVerified: data.idVerified,
          idDocumentType: data.idDocumentType,
          idDocumentNumber: data.idDocumentNumber,
          policiesAccepted: data.policiesAccepted,
          privacyAccepted: data.privacyAccepted,
          notes: data.notes,
        },
      });

      if (data.generateDigitalKey) {
        const keyNumber = generateDigitalKeyNumber(room.number);
        await tx.digitalKey.create({
          data: {
            keyNumber,
            keyCardNumber,
            roomId: data.roomId,
            bookingId: booking.id,
            accessLevel: data.keyAccessLevel,
            validFrom: new Date(),
            validUntil: keyExpiration,
            status: "ACTIVE",
            issuedBy: actor.staff.id,
          },
        });
      }

      await tx.room.update({
        where: { id: data.roomId },
        data: { status: "OCCUPIED" },
      });

      await tx.roomStatusHistory.create({
        data: {
          roomId: data.roomId,
          status: "OCCUPIED",
          notes: `Check-in for booking ${booking.confirmationCode}`,
          changedBy: actor.staff.id,
        },
      });

      await tx.bookingRoom.updateMany({
        where: { bookingId: booking.id },
        data: { status: "CHECKED_IN" },
      });

      await tx.booking.update({
        where: { id: booking.id },
        data: {
          status: "CHECKED_IN",
          actualCheckIn: new Date(),
        },
      });

      await tx.housekeepingTask.create({
        data: {
          roomId: data.roomId,
          taskType: "TURNDOWN",
          priority: "NORMAL",
          status: "PENDING",
          dueBy: new Date(booking.checkOutDate),
          notes: `Scheduled turndown service for ${booking.guestFirstName} ${booking.guestLastName}`,
        },
      });

      return {
        checkInId: checkIn.id,
        keyCardNumber,
      };
    });

    revalidatePath("/dashboard/calendar");
    revalidatePath("/dashboard/frontdesk");
    revalidateTag("calendar", "max");

    void actor;
    return {
      success: true,
      data: {
        bookingId: booking.id,
        confirmationCode: booking.confirmationCode,
        checkInId: result.checkInId,
        keyCardNumber: result.keyCardNumber,
        digitalKeyId: null,
      },
    };
  } catch (error) {
    console.error("Perform check-in error:", error);
    return {
      success: false,
      error: "Failed to complete check-in. Please try again.",
    };
  }
}

export async function cancelCheckInAction(
  input: CancelCheckInInput,
): Promise<ActionResponse<{ bookingId: string }>> {
  const parsed = cancelCheckInSchema.safeParse(input);
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
      error: "You do not have permission to cancel check-in.",
    };
  }

  try {
    const booking = await prisma.booking.findUnique({
      where: { id: parsed.data.bookingId },
      include: {
        checkIn: true,
        bookingRooms: {
          where: { status: "CHECKED_IN" },
        },
      },
    });

    if (!booking) {
      return {
        success: false,
        error: "Booking not found.",
      };
    }

    if (booking.status !== "CHECKED_IN") {
      return {
        success: false,
        error: "Guest is not checked in.",
      };
    }

    await prisma.$transaction(async (tx) => {
      if (booking.checkIn) {
        await tx.checkIn.update({
          where: { id: booking.checkIn.id },
          data: {
            notes: booking.checkIn.notes
              ? `${booking.checkIn.notes}\n[CANCELLED] ${parsed.data.reason}`
              : `[CANCELLED] ${parsed.data.reason}`,
          },
        });
      }

      for (const br of booking.bookingRooms) {
        await tx.room.update({
          where: { id: br.roomId },
          data: { status: "AVAILABLE" },
        });

        await tx.roomStatusHistory.create({
          data: {
            roomId: br.roomId,
            status: "AVAILABLE",
            notes: `Check-in cancelled: ${parsed.data.reason}`,
            changedBy: actor.staff.id,
          },
        });

        await tx.digitalKey.updateMany({
          where: {
            roomId: br.roomId,
            bookingId: booking.id,
            status: "ACTIVE",
          },
          data: {
            status: "REVOKED",
            revokedAt: new Date(),
            revokedBy: actor.staff.id,
            revokeReason: parsed.data.reason,
          },
        });
      }

      await tx.bookingRoom.updateMany({
        where: { bookingId: booking.id },
        data: { status: "RESERVED" },
      });

      await tx.booking.update({
        where: { id: booking.id },
        data: {
          status: "CONFIRMED",
          actualCheckIn: null,
        },
      });
    });

    revalidatePath("/dashboard/calendar");
    revalidatePath("/dashboard/frontdesk");
    revalidateTag("calendar", "max");

    void actor;
    return {
      success: true,
      data: { bookingId: booking.id },
    };
  } catch (error) {
    console.error("Cancel check-in error:", error);
    return {
      success: false,
      error: "Failed to cancel check-in. Please try again.",
    };
  }
}

export async function getInHouseAction(): Promise<
  ActionResponse<{ inHouse: ArrivalBooking[] }>
> {
  let actor: AdminActor;
  try {
    actor = await requireAdminOrThrow();
  } catch {
    return {
      success: false,
      error: "You do not have permission to view in-house guests.",
    };
  }

  try {
    const bookings = await prisma.bookingRoom.findMany({
      where: {
        booking: {
          status: "CHECKED_IN",
        },
      },
      orderBy: { booking: { actualCheckIn: "desc" } },
      select: {
        roomId: true,
        room: {
          select: {
            number: true,
            roomType: { select: { name: true } },
          },
        },
        booking: {
          select: {
            id: true,
            confirmationCode: true,
            status: true,
            source: true,
            guestFirstName: true,
            guestLastName: true,
            guestEmail: true,
            guestPhone: true,
            adults: true,
            children: true,
            checkInDate: true,
            checkOutDate: true,
            totalAmount: true,
            actualCheckIn: true,
          },
        },
      },
    });

    const inHouse: ArrivalBooking[] = bookings.map((br) => ({
      id: br.booking.id,
      confirmationCode: br.booking.confirmationCode,
      status: br.booking.status,
      source: br.booking.source,
      guestFirstName: br.booking.guestFirstName,
      guestLastName: br.booking.guestLastName,
      guestEmail: br.booking.guestEmail,
      guestPhone: br.booking.guestPhone,
      adults: br.booking.adults,
      children: br.booking.children,
      checkInDate: toIsoDate(br.booking.checkInDate),
      checkOutDate: toIsoDate(br.booking.checkOutDate),
      totalAmount: br.booking.totalAmount.toString(),
      specialRequests: null,
      roomId: br.roomId,
      roomNumber: br.room?.number ?? null,
      roomTypeName: br.room?.roomType.name ?? null,
      actualCheckIn: br.booking.actualCheckIn
        ? toIsoDate(br.booking.actualCheckIn)
        : null,
    }));

    void actor;
    return {
      success: true,
      data: { inHouse },
    };
  } catch (error) {
    console.error("Get in-house error:", error);
    return {
      success: false,
      error: "Failed to load in-house guests. Please try again.",
    };
  }
}
