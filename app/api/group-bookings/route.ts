import { NextRequest, NextResponse } from "next/server";
import {
  createGroupBookingAction,
  getGroupBookingsAction,
} from "@/app/actions/group-booking";
import { createGroupBookingSchema, listGroupBookingsQuerySchema } from "@/lib/validations/group-booking";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const result = await getGroupBookingsAction({
    search: searchParams.get("search") ?? undefined,
    groupType: (searchParams.get("groupType") as "CORPORATE" | "WEDDING" | "TOUR" | "SPORTS" | "GOVERNMENT" | "OTHER") ?? undefined,
    status: (searchParams.get("status") as "ALL" | "ACTIVE" | "COMPLETED" | "CANCELLED") ?? "ALL",
    cursor: searchParams.get("cursor") ?? undefined,
    limit: searchParams.get("limit") ? Number(searchParams.get("limit")) : 10,
  });

  if (!result.success) {
    return NextResponse.json(
      { error: result.error ?? "Failed to load group bookings" },
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

  const parsed = createGroupBookingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid group booking payload",
        fieldErrors: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  const result = await createGroupBookingAction(parsed.data);
  if (!result.success) {
    return NextResponse.json(
      {
        error: result.error ?? "Failed to create group booking",
        fieldErrors: result.fieldErrors,
      },
      { status: 400 },
    );
  }

  return NextResponse.json(result, { status: 201 });
}
