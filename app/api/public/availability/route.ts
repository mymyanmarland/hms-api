import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import prisma from "@/lib/prisma";
import { findBookingConflict } from "@/lib/booking-conflict";
import { normalizeToUtcStart, toIsoDate } from "@/lib/dates";
import { searchAvailabilitySchema } from "@/lib/validations/public-booking";
import {
  getClientIp,
  isTrustedPublicCaller,
} from "@/lib/request-origin";
import { consumeRateLimitToken } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const querySchema = searchAvailabilitySchema.extend({
  // The browser sends 0/1/2; the API also accepts the same fields the URL
  // search-params produce.
  promoCode: z.string().trim().max(40).optional(),
});

/**
 * `GET /api/public/availability`
 *
 * Returns the room types that have at least one *available* room for the
 * requested range. Anonymous callers are welcome - the result is shaped
 * only from public catalog data (no PII). An origin guard and a small
 * in-memory rate limiter keep scrapers honest.
 *
 * `POST /api/public/availability`
 *
 * Same as GET but accepts JSON body for mobile app compatibility.
 * Body: { checkIn, checkOut, adults, children }
 */
export async function GET(request: NextRequest) {
  return handleAvailabilityRequest(request);
}

export async function POST(request: NextRequest) {
  return handleAvailabilityRequest(request, true);
}

async function handleAvailabilityRequest(
  request: NextRequest,
  isJson = false
) {
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

  let parsed;
  if (isJson) {
    try {
      const body = await request.json();
      parsed = querySchema.safeParse({
        checkIn: body.checkIn ?? "",
        checkOut: body.checkOut ?? "",
        adults: body.adults ?? 1,
        children: body.children ?? 0,
        promoCode: body.promoCode ?? undefined,
      });
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON body" },
        { status: 400 },
      );
    }
  } else {
    const { searchParams } = new URL(request.url);
    parsed = querySchema.safeParse({
      checkIn: searchParams.get("checkIn") ?? "",
      checkOut: searchParams.get("checkOut") ?? "",
      adults: searchParams.get("adults") ?? 1,
      children: searchParams.get("children") ?? 0,
      promoCode: searchParams.get("promoCode") ?? undefined,
    });
  }
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid availability query",
        fieldErrors: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  const { checkIn, checkOut, adults, children } = parsed.data;
  const checkInDate = normalizeToUtcStart(checkIn);
  const checkOutDate = normalizeToUtcStart(checkOut);
  const today = normalizeToUtcStart(toIsoDate(new Date()));

  if (checkInDate < today) {
    return NextResponse.json(
      { error: "Check-in date cannot be in the past." },
      { status: 400 },
    );
  }

  try {
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
          // Exclude rooms that are flagged out of service for *any* day of
          // the range. We keep rooms whose status is AVAILABLE / DIRTY /
          // CLEANING — those flip back to AVAILABLE through housekeeping
          // before the guest's check-in so they are still bookable.
          where: { status: { notIn: ["MAINTENANCE", "OUT_OF_ORDER"] } },
          orderBy: { number: "asc" },
          select: { id: true, number: true, status: true },
        },
      },
    });

    const results = [];
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

      const nights = Math.max(
        Math.round(
          (checkOutDate.getTime() - checkInDate.getTime()) /
            (1000 * 60 * 60 * 24),
        ),
        1,
      );

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

    return NextResponse.json(
      { success: true, data: results, range: { checkIn, checkOut, nights: Math.max(
        Math.round(
          (checkOutDate.getTime() - checkInDate.getTime()) /
            (1000 * 60 * 60 * 24),
        ),
        1,
      ) } },
      {
        headers: {
          // Allow the Expo WebView to cache for a short window — when the
          // guest taps the back button their previous search is instant.
          "Cache-Control": "private, max-age=15",
        },
      },
    );
  } catch (error) {
    console.error("[public/availability] failed:", error);
    return NextResponse.json(
      { error: "We could not load availability, please try again." },
      { status: 500 },
    );
  }
}
