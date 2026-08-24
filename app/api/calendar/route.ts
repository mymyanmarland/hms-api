import { NextRequest, NextResponse } from "next/server";
import {
  createBookingFromCalendarSchema,
  type CreateBookingFromCalendarInput,
} from "@/lib/validations/calendar";
import {
  createBookingFromCalendarAction,
  getCalendarDataAction,
} from "@/app/actions/calendar";

function toIsoDate(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const floorParam = searchParams.get("floor");
  const result = await getCalendarDataAction({
    from: searchParams.get("from") ?? toIsoDate(new Date()),
    roomTypeId: searchParams.get("roomTypeId") ?? undefined,
    floor: floorParam && floorParam.length > 0 ? Number(floorParam) : undefined,
    status: "ALL",
  });

  if (!result.success) {
    return NextResponse.json(
      { error: result.error ?? "Failed to load calendar" },
      { status: 400 },
    );
  }

  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON payload" },
      { status: 400 },
    );
  }

  const parsed = createBookingFromCalendarSchema.safeParse(
    body as CreateBookingFromCalendarInput,
  );
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid booking payload",
        fieldErrors: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  const result = await createBookingFromCalendarAction(parsed.data);
  if (!result.success) {
    return NextResponse.json(
      {
        error: result.error ?? "Failed to create booking",
        fieldErrors: result.fieldErrors,
      },
      { status: 400 },
    );
  }

  return NextResponse.json(result);
}