"use server";

import { cookies } from "next/headers";
import { revalidatePath, revalidateTag } from "next/cache";
import { render } from "@react-email/render";

import prisma from "@/lib/prisma";
import { findBookingConflict, findAvailableRoomForType } from "@/lib/booking-conflict";
import { generateConfirmationCode, formatBookingAmount } from "@/lib/booking";
import { normalizeToUtcStart, nightsBetween } from "@/lib/dates";
import { getMailTransport } from "@/lib/mail";
import {
  directBookingSchema,
  searchAvailabilitySchema,
  type DirectBookingInput,
  type SearchAvailabilityInput,
} from "@/lib/validations/public-booking";
import { BookingConfirmationTemplate } from "@/app/emails/booking-confirmation-template";

export type ActionResponse<T = void> = {
  success: boolean;
  data?: T;
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

export type PublicRoomTypeOption = {
  roomTypeId: string;
  name: string;
  description: string | null;
  bedConfig: string | null;
  basePrice: string;
  maxOccupancy: number;
  amenities: string[];
  images: string[];
  availableRooms: number;
  nights: number;
  suggestedRoomId: string | null;
  suggestedRoomNumber: string | null;
  totalForStay: string;
};

export type PublicAvailability = {
  results: PublicRoomTypeOption[];
  range: { checkIn: string; checkOut: string; nights: number };
};

export type PublicGuestPrefill = {
  email: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
};

export type BookingResult = {
  bookingId: string;
  confirmationCode: string;
};

function flattenZodErrors(
  errors: Record<string, string[] | undefined>,
): Record<string, string[]> {
  const result: Record<string, string[]> = {};
  for (const [key, value] of Object.entries(errors)) {
    if (value && value.length > 0) result[key] = value;
  }
  return result;
}

/**
 * Run the same availability check the public API route performs, but as
 * a server action so the widget's search form can submit without forcing
 * a hard navigation. Returns the same shape as `GET /api/public/availability`.
 */
export async function searchAvailabilityAction(
  input: SearchAvailabilityInput,
): Promise<ActionResponse<PublicAvailability>> {
  const parsed = searchAvailabilitySchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      fieldErrors: flattenZodErrors(parsed.error.flatten().fieldErrors),
    };
  }

  const { checkIn, checkOut, adults, children } = parsed.data;
  const checkInDate = normalizeToUtcStart(checkIn);
  const checkOutDate = normalizeToUtcStart(checkOut);
  const today = normalizeToUtcStart(new Date().toISOString().slice(0, 10));

  if (checkInDate < today) {
    return {
      success: false,
      fieldErrors: { checkIn: ["Check-in cannot be in the past."] },
    };
  }

  const nights = nightsBetween(checkIn, checkOut);

  const roomTypes = await prisma.roomType.findMany({
    orderBy: { basePrice: "asc" },
    select: {
      id: true,
      name: true,
      description: true,
      basePrice: true,
      maxOccupancy: true,
      bedConfig: true,
      amenities: true,
      images: true,
      rooms: {
        where: { status: { notIn: ["MAINTENANCE", "OUT_OF_ORDER"] } },
        orderBy: { number: "asc" },
        select: { id: true, number: true, status: true },
      },
    },
  });

  const results: PublicRoomTypeOption[] = [];
  for (const type of roomTypes) {
    if (type.maxOccupancy < adults + children) continue;
    let availableRooms = 0;
    let firstAvailableId: string | null = null;
    let firstAvailableNumber: string | null = null;
    for (const room of type.rooms) {
      const conflict = await findBookingConflict(
        room.id,
        checkInDate,
        checkOutDate,
      );
      if (!conflict) {
        availableRooms += 1;
        if (firstAvailableId === null) {
          firstAvailableId = room.id;
          firstAvailableNumber = room.number;
        }
      }
    }
    if (availableRooms === 0) continue;
    results.push({
      roomTypeId: type.id,
      name: type.name,
      description: type.description,
      bedConfig: type.bedConfig,
      basePrice: type.basePrice.toString(),
      maxOccupancy: type.maxOccupancy,
      amenities: type.amenities,
      images: type.images,
      availableRooms,
      nights,
      suggestedRoomId: firstAvailableId,
      suggestedRoomNumber: firstAvailableNumber,
      totalForStay: (Number(type.basePrice) * nights).toFixed(2),
    });
  }

  return {
    success: true,
    data: {
      results,
      range: { checkIn, checkOut, nights },
    },
  };
}

/**
 * Resolve the active better-auth session and return a minimal guest
 * prefill so the booking dialog can skip the guest-name fields. Returns
 * `null` when the user isn't signed in — the dialog falls back to plain
 * text inputs.
 */
export async function getCurrentGuestPrefillAction(): Promise<
  ActionResponse<PublicGuestPrefill | null>
> {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get("session")?.value;
    if (!sessionToken) {
      return { success: true, data: null };
    }

    const session = await prisma.session.findUnique({
      where: { token: sessionToken },
      select: {
        expiresAt: true,
        user: {
          select: {
            email: true,
            name: true,
            guest: {
              select: {
                firstName: true,
                lastName: true,
                phone: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (!session || session.expiresAt < new Date()) {
      return { success: true, data: null };
    }

    const guest = session.user.guest;
    return {
      success: true,
      data: {
        email: guest?.email ?? session.user.email,
        firstName: guest?.firstName ?? null,
        lastName: guest?.lastName ?? null,
        phone: guest?.phone ?? null,
      },
    };
  } catch (error) {
    console.error("getCurrentGuestPrefillAction:", error);
    return { success: true, data: null };
  }
}

/**
 * Create a direct booking from the public widget. Validates input with
 * Zod, ensures the chosen room is free for the requested range, creates
 * the `Guest` (linked to the active `User` if signed in) and emits a
 * confirmation email + `EmailLog` row.
 */
export async function createDirectBookingAction(
  input: DirectBookingInput,
): Promise<ActionResponse<BookingResult>> {
  const parsed = directBookingSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      fieldErrors: flattenZodErrors(parsed.error.flatten().fieldErrors),
    };
  }

  const data = parsed.data;
  const normalizedEmail = data.guestEmail.toLowerCase();
  const checkInDate = normalizeToUtcStart(data.checkIn);
  const checkOutDate = normalizeToUtcStart(data.checkOut);

  // Optional session — used only to link the booking to an existing User.
  let activeUserId: string | null = null;
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get("session")?.value;
    if (sessionToken) {
      const session = await prisma.session.findUnique({
        where: { token: sessionToken },
        select: { userId: true, expiresAt: true },
      });
      if (session && session.expiresAt > new Date()) {
        activeUserId = session.userId;
      }
    }
  } catch {
    /* ignore — booking still proceeds as a guest */
  }

  try {
    // 1. Resolve which room we are booking. The widget may pass either a
    //    pre-selected `roomId` (when the calendar is shown) or just a
    //    `roomTypeId` (when we should pick the first available room).
    type ResolvedRoom = {
      id: string;
      number: string;
      basePrice: number;
      roomTypeName: string;
    };
    let room: ResolvedRoom | null = null;
    if (data.roomId) {
      const fetched = await prisma.room.findUnique({
        where: { id: data.roomId },
        select: {
          id: true,
          number: true,
          status: true,
          roomTypeId: true,
          roomType: { select: { basePrice: true, name: true } },
        },
      });
      if (!fetched) {
        return {
          success: false,
          fieldErrors: { roomId: ["Selected room no longer exists."] },
        };
      }
      if (fetched.status === "MAINTENANCE" || fetched.status === "OUT_OF_ORDER") {
        return {
          success: false,
          error: `Room ${fetched.number} is currently out of service. Please pick another.`,
        };
      }
      if (fetched.roomTypeId !== data.roomTypeId) {
        return {
          success: false,
          fieldErrors: { roomTypeId: ["Room and room type do not match."] },
        };
      }
      room = {
        id: fetched.id,
        number: fetched.number,
        basePrice: Number(fetched.roomType.basePrice),
        roomTypeName: fetched.roomType.name,
      };
    } else {
      const candidate = await findAvailableRoomForType(
        data.roomTypeId,
        checkInDate,
        checkOutDate,
      );
      if (!candidate) {
        return {
          success: false,
          error:
            "Unfortunately that room type is no longer available for the selected dates.",
        };
      }
      const fetched = await prisma.room.findUnique({
        where: { id: candidate.id },
        select: {
          id: true,
          number: true,
          roomType: { select: { basePrice: true, name: true } },
        },
      });
      if (!fetched) {
        return { success: false, error: "Room lookup failed, please try again." };
      }
      room = {
        id: fetched.id,
        number: fetched.number,
        basePrice: Number(fetched.roomType.basePrice),
        roomTypeName: fetched.roomType.name,
      };
    }

    // 3. Transaction: create or reuse guest + create booking + create
    //    booking_room row with pessimistic locking to prevent race conditions.
    const nights = nightsBetween(data.checkIn, data.checkOut);
    const subtotalNumber = room.basePrice * nights;
    const subtotal = subtotalNumber.toFixed(2);
    const totalAmount = subtotal;
    const nightlyRate = room.basePrice.toFixed(2);

    let confirmationCode = generateConfirmationCode();
    type TxResult = { bookingId: string; guestId: string };
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

        // Re-check for conflicts inside the transaction while holding the lock.
        // This closes the TOCTOU race condition window where two concurrent
        // requests could both pass the pre-transaction conflict check.
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
            `Room ${room.number} was booked by another guest (${conflict.booking.confirmationCode})`,
          );
        }

        const existingGuest = await tx.guest.findUnique({
          where: { email: normalizedEmail },
          select: { id: true, userId: true },
        });

        const guest =
          existingGuest ??
          (await tx.guest.create({
            data: {
              firstName: data.guestFirstName,
              lastName: data.guestLastName,
              email: normalizedEmail,
              phone: data.guestPhone || null,
              userId: activeUserId,
            },
            select: { id: true },
          }));

        // If the guest existed but was never linked to this user, link
        // them now — the same person is booking from their logged-in
        // app for the first time.
        if (activeUserId && !existingGuest?.userId) {
          await tx.guest.update({
            where: { id: guest.id },
            data: { userId: activeUserId },
          });
        }

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
            source: "DIRECT",
            guestId: guest.id,
            guestFirstName: data.guestFirstName,
            guestLastName: data.guestLastName,
            guestEmail: normalizedEmail,
            guestPhone: data.guestPhone || null,
            adults: data.adults,
            children: data.children,
            infants: 0,
            subtotal,
            taxes: "0.00",
            discounts: "0.00",
            totalAmount,
            checkInDate,
            checkOutDate,
            specialRequests: data.specialRequests || null,
          },
          select: { id: true },
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

        return { bookingId: booking.id, guestId: guest.id };
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
      console.error("[public-booking] transaction failed:", txError);
      return {
        success: false,
        error:
          "We could not finalize that confirmation number. Please try again.",
      };
    }

    const { bookingId, guestId } = txResult;

    // 4. Invalidate caches so both admin calendar + public availability
    //    reflect the new booking immediately.
    revalidatePath("/dashboard/calendar");
    revalidateTag("calendar", "max");
    revalidateTag("availability", "max");

    // 5. Best-effort confirmation email. Failure here must NOT undo the
    //    booking, so we log and move on.
    try {
      const html = await render(
        BookingConfirmationTemplate({
          guestFirstName: data.guestFirstName,
          guestLastName: data.guestLastName,
          confirmationCode,
          checkIn: data.checkIn,
          checkOut: data.checkOut,
          roomNumber: room.number,
          totalForStay: formatBookingAmount(totalAmount),
          adults: data.adults,
          children: data.children,
          specialRequests: data.specialRequests,
        }),
      );
      const transport = await getMailTransport();
      const subject = `Your booking ${confirmationCode} is confirmed`;
      await transport.sendMail({
        to: normalizedEmail,
        subject,
        html,
      });
      await prisma.emailLog.create({
        data: {
          guestId,
          emailType: "BOOKING_CONFIRMATION",
          recipient: normalizedEmail,
          subject,
          status: "SENT",
          sentAt: new Date(),
        },
      });
    } catch (emailError) {
      console.error("[public-booking] confirmation email failed:", emailError);
    }

    return {
      success: true,
      data: { bookingId, confirmationCode },
    };
  } catch (error) {
    console.error("[public-booking] createDirectBookingAction:", error);
    return {
      success: false,
      error: "We could not create that booking. Please try again.",
    };
  }
}
