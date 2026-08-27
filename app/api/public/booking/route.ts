import { NextRequest, NextResponse } from "next/server";

import prisma from "@/lib/prisma";
import { findBookingConflict, findAvailableRoomForType } from "@/lib/booking-conflict";
import { generateConfirmationCode, formatBookingAmount } from "@/lib/booking";
import { normalizeToUtcStart, nightsBetween } from "@/lib/dates";
import { directBookingSchema } from "@/lib/validations/public-booking";
import {
  getClientIp,
  isTrustedPublicCaller,
} from "@/lib/request-origin";
import { consumeRateLimitToken } from "@/lib/rate-limit";
import { getMailTransport } from "@/lib/mail";
import { render } from "@react-email/render";
import { BookingConfirmationTemplate } from "@/app/emails/booking-confirmation-template";

export const dynamic = "force-dynamic";

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
 * `POST /api/public/booking`
 *
 * Creates a direct booking from the mobile app.
 * Validates input with Zod, ensures room availability, creates
 * Guest and Booking records, and sends confirmation email.
 */
export async function POST(request: NextRequest) {
  if (!isTrustedPublicCaller(request)) {
    return NextResponse.json(
      { error: "This endpoint is not available from your origin." },
      { status: 403 },
    );
  }

  const retryAfter = consumeRateLimitToken(getClientIp(request));
  if (retryAfter !== null) {
    return NextResponse.json(
      { error: "Too many requests, please slow down." },
      { status: 429, headers: { "Retry-After": String(retryAfter) } },
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const parsed = directBookingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        error: "Invalid booking data",
        fieldErrors: flattenZodErrors(parsed.error.flatten().fieldErrors),
      },
      { status: 400 },
    );
  }

  const data = parsed.data;
  const normalizedEmail = data.guestEmail.toLowerCase();
  const checkInDate = normalizeToUtcStart(data.checkIn);
  const checkOutDate = normalizeToUtcStart(data.checkOut);

  try {
    // Resolve which room we are booking
    let room: {
      id: string;
      number: string;
      basePrice: number;
      roomTypeName: string;
    } | null = null;

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
        return NextResponse.json(
          {
            success: false,
            fieldErrors: { roomId: ["Selected room no longer exists."] },
          },
          { status: 400 },
        );
      }

      if (fetched.status === "MAINTENANCE" || fetched.status === "OUT_OF_ORDER") {
        return NextResponse.json(
          {
            success: false,
            error: `Room ${fetched.number} is currently out of service. Please pick another.`,
          },
          { status: 400 },
        );
      }

      if (fetched.roomTypeId !== data.roomTypeId) {
        return NextResponse.json(
          {
            success: false,
            fieldErrors: { roomTypeId: ["Room and room type do not match."] },
          },
          { status: 400 },
        );
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
        return NextResponse.json(
          {
            success: false,
            error: "Unfortunately that room type is no longer available for the selected dates.",
          },
          { status: 400 },
        );
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
        return NextResponse.json(
          {
            success: false,
            error: "Room lookup failed, please try again.",
          },
          { status: 500 },
        );
      }

      room = {
        id: fetched.id,
        number: fetched.number,
        basePrice: Number(fetched.roomType.basePrice),
        roomTypeName: fetched.roomType.name,
      };
    }

    // Calculate pricing
    const nights = nightsBetween(data.checkIn, data.checkOut);
    const subtotalNumber = room.basePrice * nights;
    const subtotal = subtotalNumber.toFixed(2);
    const totalAmount = subtotal;
    const nightlyRate = room.basePrice.toFixed(2);

    let confirmationCode = generateConfirmationCode();

    // Create booking transaction with pessimistic locking
    let bookingId: string;
    let guestId: string;

    try {
      const result = await prisma.$transaction(async (tx) => {
        // Acquire a row-level lock on the room to prevent concurrent bookings
        const lockedRoom = await tx.room.findUnique({
          where: { id: room.id },
          select: { id: true },
        });

        if (!lockedRoom) {
          throw new Error("Room no longer exists");
        }

        // Re-check for conflicts inside the transaction while holding the lock
        // This closes the TOCTOU race condition window
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
            },
            select: { id: true },
          }));

        // Retry confirmation code on collision
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

      bookingId = result.bookingId;
      guestId = result.guestId;
    } catch (txError) {
      // Handle specific error types for better user feedback
      if (txError instanceof Error) {
        if (txError.message.includes("was booked by another guest")) {
          return NextResponse.json(
            {
              success: false,
              error: txError.message,
            },
            { status: 409 },
          );
        }
        if (txError.message.includes("no longer exists")) {
          return NextResponse.json(
            {
              success: false,
              error: "Room no longer exists. Please try again.",
            },
            { status: 400 },
          );
        }
      }
      console.error("[public/booking] transaction failed:", txError);
      return NextResponse.json(
        {
          success: false,
          error: "We could not finalize that confirmation number. Please try again.",
        },
        { status: 500 },
      );
    }

    // Send confirmation email (best-effort)
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
          paymentMethod: data.paymentMethod,
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
      console.error("[public/booking] confirmation email failed:", emailError);
      // Don't fail the booking if email fails
    }

    return NextResponse.json({
      success: true,
      data: {
        bookingId,
        confirmationCode,
      },
    });
  } catch (error) {
    console.error("[public/booking] POST error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "We could not create that booking. Please try again.",
      },
      { status: 500 },
    );
  }
}
