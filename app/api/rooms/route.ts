import { NextRequest, NextResponse } from "next/server";
import {
  listRoomsWithStatusAction,
  updateRoomStatusAction,
  getRoomStatusHistoryAction,
} from "@/app/actions/room-status";
import {
  updateRoomStatusSchema,
  getRoomStatusHistorySchema,
  listRoomsWithStatusSchema,
} from "@/lib/validations/room-status";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const intent = searchParams.get("intent");

  if (intent === "history") {
    const roomId = searchParams.get("roomId");
    if (!roomId) {
      return NextResponse.json({ error: "Room ID is required" }, { status: 400 });
    }

    const result = await getRoomStatusHistoryAction({ roomId });
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json(result);
  }

  // Default: list rooms with status
  const result = await listRoomsWithStatusAction({
    floor: searchParams.get("floor") ? Number(searchParams.get("floor")) : undefined,
    roomTypeId: searchParams.get("roomTypeId") ?? undefined,
    status: (searchParams.get("status") as "ALL" | "AVAILABLE" | "OCCUPIED" | "DIRTY" | "CLEANING" | "MAINTENANCE" | "OUT_OF_ORDER") ?? "ALL",
  });

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const parsed = updateRoomStatusSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid payload",
        fieldErrors: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  const result = await updateRoomStatusAction(parsed.data);
  if (!result.success) {
    return NextResponse.json(
      {
        error: result.error ?? "Failed to update room status",
        fieldErrors: result.fieldErrors,
      },
      { status: 400 },
    );
  }

  return NextResponse.json(result);
}
