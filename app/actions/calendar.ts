"use server";

import { revalidatePath, revalidateTag, unstable_cache } from "next/cache";
import prisma from "@/lib/prisma";
import { requireAdminOrThrow, type AdminActor } from "@/lib/admin-auth";
import {
  calendarViewQuerySchema,
  createBookingFromCalendarSchema,
  type CalendarViewQuery,
  type CreateBookingFromCalendarInput,
} from "@/lib/validations/calendar";
import type { ActionResponse } from "@/app/actions/password-reset";

export type CalendarRoom = {
  id: string;
  number: string;
  floor: number;
  status:
    | "AVAILABLE"
    | "OCCUPIED"
    | "DIRTY"
    | "CLEANING"
    | "MAINTENANCE"
    | "OUT_OF_ORDER";
  notes: string | null;
  roomType: {
    id: string;
    name: string;
    basePrice: string;
    maxOccupancy: number;
  };
};

export type CalendarBooking = {
  id: string;
  confirmationCode: string;
  status:
    | "TENTATIVE"
    | "CONFIRMED"
    | "CHECKED_IN"
    | "CHECKED_OUT"
    | "CANCELLED"
    | "NO_SHOW";
  source:
    | "DIRECT"
    | "WALK_IN"
    | "PHONE"
    | "OTA"
    | "CORPORATE"
    | "GROUP";
  guestFirstName: string;
  guestLastName: string;
  guestEmail: string;
  guestPhone: string | null;
  adults: number;
  children: number;
  checkInDate: string;
  checkOutDate: string;
  totalAmount: string;
  notes: string | null;
  roomId: string;
};

export type CalendarSummary = {
  totalRooms: number;
  occupiedToday: number;
  availableToday: number;
  arrivalsToday: number;
  departuresToday: number;
  outOfServiceToday: number;
};

export type CalendarRoomType = {
  id: string;
  name: string;
};

export type CalendarData = {
  from: string;
  to: string;
  rooms: CalendarRoom[];
  bookings: CalendarBooking[];
  roomTypes: CalendarRoomType[];
  floors: number[];
  summary: CalendarSummary;
};

export type GetCalendarDataResponse = ActionResponse<CalendarData>;

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

function generateConfirmationCode(): string {
  const year = new Date().getUTCFullYear();
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let suffix = "";
  for (let i = 0; i < 6; i += 1) {
    suffix += chars[Math.floor(Math.random() * chars.length)];
  }
  return `HMS-${year}-${suffix}`;
}

async function fetchCalendarDataInternal(
  fromIso: string,
  toIso: string,
  todayIso: string,
  filters: {
    roomTypeId?: string;
    floor?: number;
  },
): Promise<CalendarData> {
  const fromDate = normalizeToUtcStart(fromIso);
  const toDate = normalizeToUtcStart(toIso);
  const today = normalizeToUtcStart(todayIso);
  const tomorrow = new Date(today);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);

  const roomWhere: Record<string, unknown> = {};
  if (filters.roomTypeId) {
    roomWhere.roomTypeId = filters.roomTypeId;
  }
  if (typeof filters.floor === "number") {
    roomWhere.floor = filters.floor;
  }

  const [rooms, bookings, roomTypes] = await Promise.all([
    prisma.room.findMany({
      where: roomWhere,
      orderBy: [{ floor: "asc" }, { number: "asc" }],
      select: {
        id: true,
        number: true,
        floor: true,
        status: true,
        notes: true,
        roomType: {
          select: {
            id: true,
            name: true,
            basePrice: true,
            maxOccupancy: true,
          },
        },
      },
    }),
    prisma.bookingRoom.findMany({
      where: {
        room: roomWhere,
        booking: {
          checkInDate: { lt: toDate },
          checkOutDate: { gt: fromDate },
          status: { notIn: ["CANCELLED", "NO_SHOW"] },
        },
      },
      orderBy: { booking: { checkInDate: "asc" } },
      select: {
        roomId: true,
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
          },
        },
      },
    }),
    prisma.roomType.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  const calendarBookings: CalendarBooking[] = bookings.map((br) => ({
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
    notes: br.booking.specialRequests,
    roomId: br.roomId,
  }));

  const floorSet = new Set<number>();
  for (const room of rooms) {
    floorSet.add(room.floor);
  }

  const totalRooms = rooms.length;

  const occupiedToday = calendarBookings.filter((booking) => {
    const checkIn = normalizeToUtcStart(booking.checkInDate);
    const checkOut = normalizeToUtcStart(booking.checkOutDate);
    return checkIn < tomorrow && checkOut > today;
  }).length;

  const outOfServiceToday = rooms.filter((room) =>
    ["MAINTENANCE", "OUT_OF_ORDER", "CLEANING"].includes(room.status),
  ).length;

  const arrivalsToday = calendarBookings.filter((booking) => {
    const checkIn = normalizeToUtcStart(booking.checkInDate);
    return checkIn.getTime() === today.getTime();
  }).length;

  const departuresToday = calendarBookings.filter((booking) => {
    const checkOut = normalizeToUtcStart(booking.checkOutDate);
    return checkOut.getTime() === today.getTime();
  }).length;

  const summary: CalendarSummary = {
    totalRooms,
    occupiedToday,
    availableToday: Math.max(totalRooms - occupiedToday - outOfServiceToday, 0),
    arrivalsToday,
    departuresToday,
    outOfServiceToday,
  };

  return {
    from: fromIso,
    to: toIso,
    rooms: rooms.map((room) => ({
      id: room.id,
      number: room.number,
      floor: room.floor,
      status: room.status,
      notes: room.notes,
      roomType: {
        id: room.roomType.id,
        name: room.roomType.name,
        basePrice: room.roomType.basePrice.toString(),
        maxOccupancy: room.roomType.maxOccupancy,
      },
    })),
    bookings: calendarBookings,
    roomTypes,
    floors: Array.from(floorSet).sort((a, b) => a - b),
    summary,
  };
}

const cachedFetchCalendar = unstable_cache(
  async (
    fromIso: string,
    toIso: string,
    todayIso: string,
    roomTypeId?: string,
    floor?: number,
  ): Promise<CalendarData> => {
    return fetchCalendarDataInternal(fromIso, toIso, todayIso, {
      roomTypeId,
      floor,
    });
  },
  ["calendar-data"],
  { revalidate: 60, tags: ["calendar"] },
);

export async function getCalendarDataAction(
  input: CalendarViewQuery,
): Promise<GetCalendarDataResponse> {
  const parsed = calendarViewQuerySchema.safeParse(input);
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
      error: "You do not have permission to view the booking calendar.",
    };
  }

  const today = new Date();
  const todayIso = toIsoDate(today);

  let fromIso = parsed.data.from ?? todayIso;
  const fromDate = normalizeToUtcStart(fromIso);
  const todayDate = normalizeToUtcStart(todayIso);
  const minFrom = new Date(todayDate);
  minFrom.setUTCDate(minFrom.getUTCDate() - 60);
  const maxFrom = new Date(todayDate);
  maxFrom.setUTCDate(maxFrom.getUTCDate() + 60);

  if (fromDate < minFrom) fromIso = toIsoDate(minFrom);
  if (fromDate > maxFrom) fromIso = toIsoDate(maxFrom);

  const toDate = new Date(normalizeToUtcStart(fromIso));
  toDate.setUTCDate(toDate.getUTCDate() + 7);
  const toIso = toIsoDate(toDate);

  try {
    const data = await cachedFetchCalendar(
      fromIso,
      toIso,
      todayIso,
      parsed.data.roomTypeId,
      parsed.data.floor,
    );
    void actor;
    return { success: true, data };
  } catch (error) {
    console.error("Calendar data error:", error);
    return {
      success: false,
      error: "We could not load the calendar. Please try again.",
    };
  }
}

export async function createBookingFromCalendarAction(
  input: CreateBookingFromCalendarInput,
): Promise<ActionResponse<{ bookingId: string; confirmationCode: string }>> {
  const parsed = createBookingFromCalendarSchema.safeParse(input);
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
      error: "You do not have permission to create bookings.",
    };
  }

  const data = parsed.data;
  const normalizedEmail = data.guestEmail.toLowerCase();
  const checkInDate = normalizeToUtcStart(data.checkInDate);
  const checkOutDate = normalizeToUtcStart(data.checkOutDate);

  try {
    const room = await prisma.room.findUnique({
      where: { id: data.roomId },
      select: {
        id: true,
        roomType: { select: { basePrice: true } },
      },
    });

    if (!room) {
      return { success: false, fieldErrors: { roomId: ["Selected room no longer exists."] } };
    }

    // 3. Transaction: re-check for conflicts inside the transaction
    //    while holding a consistent read snapshot, then create the
    //    booking + booking_room row. Re-checking inside the transaction
    //    closes the TOCTOU race condition where two concurrent calendar
    //    bookings for the same room/dates could both pass the
    //    pre-transaction conflict check and both insert.
    const nights = Math.max(
      Math.round(
        (checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24),
      ),
      1,
    );
    const nightlyRate = room.roomType.basePrice;
    const subtotal = nightlyRate.mul(nights);
    const totalAmount = subtotal;

    let confirmationCode = generateConfirmationCode();
    type TxResult = { id: string; confirmationCode: string };
    let txResult: TxResult;
    try {
      txResult = await prisma.$transaction(async (tx) => {
        // Acquire the room record to establish a consistent read snapshot
        const lockedRoom = await tx.room.findUnique({
          where: { id: room.id },
          select: { id: true },
        });

        if (!lockedRoom) {
          throw new Error("Room no longer exists");
        }

        // Re-check for conflicts inside the transaction. This closes the
        // TOCTOU window where two concurrent requests could both pass
        // the pre-transaction check and both create bookings for the
        // same room/dates.
        const conflict = await tx.bookingRoom.findFirst({
          where: {
            roomId: room.id,
            booking: {
              status: { notIn: ["CANCELLED", "NO_SHOW"] },
              checkInDate: { lt: checkOutDate },
              checkOutDate: { gt: checkInDate },
            },
          },
          select: {
            bookingId: true,
            booking: { select: { confirmationCode: true } },
          },
        });

        if (conflict) {
          throw new Error(
            `Room was booked by another guest (${conflict.booking.confirmationCode})`,
          );
        }

        const existingGuest = await tx.guest.findUnique({
          where: { email: normalizedEmail },
          select: { id: true },
        });

        const guest =
          existingGuest ??
          (await tx.guest.create({
            data: {
              firstName: data.guestFirstName,
              lastName: data.guestLastName,
              email: normalizedEmail,
              phone: data.guestPhone,
            },
            select: { id: true },
          }));

        // Retry the confirmation code a few times in case of an
        // unlikely collision on the unique index.
        for (let attempt = 0; attempt < 5; attempt += 1) {
          const existing = await tx.booking.findUnique({
            where: { confirmationCode },
            select: { id: true },
          });
          if (!existing) break;
          confirmationCode = generateConfirmationCode();
        }

        const booking = await tx.booking.create({
          data: {
            confirmationCode,
            status: "CONFIRMED",
            source: data.source,
            guestId: guest.id,
            guestFirstName: data.guestFirstName,
            guestLastName: data.guestLastName,
            guestEmail: normalizedEmail,
            guestPhone: data.guestPhone,
            adults: data.adults,
            children: data.children,
            infants: 0,
            subtotal,
            taxes: 0,
            discounts: 0,
            totalAmount,
            checkInDate,
            checkOutDate,
            specialRequests: data.notes,
          },
          select: { id: true, confirmationCode: true },
        });

        await tx.bookingRoom.create({
          data: {
            bookingId: booking.id,
            roomId: room.id,
            rate: nightlyRate,
            totalNights: nights,
            isPrimary: true,
            status: "RESERVED",
          },
        });

        return { id: booking.id, confirmationCode: booking.confirmationCode };
      }, {
        // Use serializable isolation for stronger guarantees in high-contention scenarios
        isolationLevel: 'Serializable',
      });
    } catch (txError) {
      // Surface specific error types for better user feedback
      if (txError instanceof Error) {
        if (txError.message.includes("was booked by another guest")) {
          return {
            success: false,
            error: txError.message,
          };
        }
        if (txError.message.includes("no longer exists")) {
          return {
            success: false,
            error: "Room no longer exists. Please try again.",
          };
        }
      }
      // A unique-confirmation-code collision on the 6th retry means the
      // generation space is exhausted; surface a friendly error rather
      // than leaking the database error.
      console.error("[calendar] transaction failed:", txError);
      return {
        success: false,
        error:
          "We could not finalize that confirmation number. Please try again.",
      };
    }

    revalidatePath("/dashboard/calendar");
    revalidateTag("calendar", "max");

    void actor;
    return {
      success: true,
      data: {
        bookingId: txResult.id,
        confirmationCode: txResult.confirmationCode,
      },
    };
  } catch (error) {
    console.error("Create calendar booking error:", error);
    return {
      success: false,
      error: "We could not create that booking. Please try again.",
    };
  }
}