import { NextRequest, NextResponse } from "next/server";
import {
  getArrivalsAction,
  getCheckInDetailsAction,
  performCheckInAction,
  cancelCheckInAction,
  getAvailableRoomsAction,
  getInHouseAction,
} from "@/app/actions/checkin";
import { checkInQuerySchema, performCheckInSchema, getCheckInDetailsSchema, cancelCheckInSchema } from "@/lib/validations/checkin";

function toIsoDate(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const intent = searchParams.get("intent");

  if (intent === "details") {
    const bookingId = searchParams.get("bookingId");
    if (!bookingId) {
      return NextResponse.json(
        { error: "Booking ID is required" },
        { status: 400 },
      );
    }

    const result = await getCheckInDetailsAction({ bookingId });
    if (!result.success) {
      return NextResponse.json(
        { error: result.error ?? "Failed to load check-in details" },
        { status: 400 },
      );
    }
    return NextResponse.json(result);
  }

  if (intent === "available-rooms") {
    const checkInDate = searchParams.get("checkInDate");
    const checkOutDate = searchParams.get("checkOutDate");
    const excludeRoomId = searchParams.get("excludeRoomId") ?? undefined;

    if (!checkInDate || !checkOutDate) {
      return NextResponse.json(
        { error: "Check-in and check-out dates are required" },
        { status: 400 },
      );
    }

    const result = await getAvailableRoomsAction(checkInDate, checkOutDate, excludeRoomId);
    if (!result.success) {
      return NextResponse.json(
        { error: result.error ?? "Failed to load available rooms" },
        { status: 400 },
      );
    }
    return NextResponse.json(result);
  }

  if (intent === "in-house") {
    const result = await getInHouseAction();
    if (!result.success) {
      return NextResponse.json(
        { error: result.error ?? "Failed to load in-house guests" },
        { status: 400 },
      );
    }
    return NextResponse.json(result);
  }

  const result = await getArrivalsAction({
    date: searchParams.get("date") ?? toIsoDate(new Date()),
    status: (searchParams.get("status") as "ALL" | "CONFIRMED" | "CHECKED_IN" | "PENDING_ROOM") ?? "ALL",
  });

  if (!result.success) {
    return NextResponse.json(
      { error: result.error ?? "Failed to load arrivals" },
      { status: 400 },
    );
  }

  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const intent = searchParams.get("intent");

  if (intent === "cancel") {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON payload" },
        { status: 400 },
      );
    }

    const parsed = cancelCheckInSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid payload",
          fieldErrors: parsed.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const result = await cancelCheckInAction(parsed.data);
    if (!result.success) {
      return NextResponse.json(
        { error: result.error ?? "Failed to cancel check-in", fieldErrors: result.fieldErrors },
        { status: 400 },
      );
    }
    return NextResponse.json(result);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON payload" },
      { status: 400 },
    );
  }

  const parsed = performCheckInSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid check-in payload",
        fieldErrors: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  const result = await performCheckInAction(parsed.data);
  if (!result.success) {
    return NextResponse.json(
      {
        error: result.error ?? "Failed to complete check-in",
        fieldErrors: result.fieldErrors,
      },
      { status: 400 },
    );
  }

  return NextResponse.json(result);
}
