import { NextRequest, NextResponse } from "next/server";
import {
  getGroupBookingDetailsAction,
  updateGroupBookingAction,
  addToGroupAction,
  removeFromGroupAction,
  receiveDepositAction,
  deleteGroupBookingAction,
} from "@/app/actions/group-booking";
import {
  groupBookingIdSchema,
  updateGroupBookingSchema,
  addToGroupSchema,
  removeFromGroupSchema,
  receiveDepositSchema,
} from "@/lib/validations/group-booking";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  const result = await getGroupBookingDetailsAction({ groupBookingId: id });
  if (!result.success) {
    return NextResponse.json(
      { error: result.error ?? "Failed to load group booking details" },
      { status: 404 },
    );
  }

  return NextResponse.json(result);
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON payload" },
      { status: 400 },
    );
  }

  const parsed = updateGroupBookingSchema.safeParse({ ...body as object, groupBookingId: id });
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid update payload",
        fieldErrors: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  const result = await updateGroupBookingAction(parsed.data);
  if (!result.success) {
    return NextResponse.json(
      {
        error: result.error ?? "Failed to update group booking",
        fieldErrors: result.fieldErrors,
      },
      { status: 400 },
    );
  }

  return NextResponse.json(result);
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const intent = searchParams.get("intent");

  if (intent === "add-booking") {
    const bookingId = searchParams.get("bookingId");
    const overrideDiscount = searchParams.get("overrideDiscount") === "true";

    if (!bookingId) {
      return NextResponse.json(
        { error: "Booking ID is required" },
        { status: 400 },
      );
    }

    const result = await addToGroupAction({
      bookingId,
      groupBookingId: id,
      overrideDiscount,
    });
    if (!result.success) {
      return NextResponse.json(
        { error: result.error ?? "Failed to add booking to group", fieldErrors: result.fieldErrors },
        { status: 400 },
      );
    }
    return NextResponse.json(result);
  }

  if (intent === "remove-booking") {
    const bookingId = searchParams.get("bookingId");
    const reason = searchParams.get("reason") ?? undefined;

    if (!bookingId) {
      return NextResponse.json(
        { error: "Booking ID is required" },
        { status: 400 },
      );
    }

    const result = await removeFromGroupAction({
      bookingId,
      reason,
    });
    if (!result.success) {
      return NextResponse.json(
        { error: result.error ?? "Failed to remove booking from group", fieldErrors: result.fieldErrors },
        { status: 400 },
      );
    }
    return NextResponse.json(result);
  }

  if (intent === "receive-deposit") {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON payload" },
        { status: 400 },
      );
    }

    const parsed = receiveDepositSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid deposit payload",
          fieldErrors: parsed.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const result = await receiveDepositAction({
      ...parsed.data,
      groupBookingId: id,
    });
    if (!result.success) {
      return NextResponse.json(
        { error: result.error ?? "Failed to record deposit", fieldErrors: result.fieldErrors },
        { status: 400 },
      );
    }
    return NextResponse.json(result);
  }

  const result = await deleteGroupBookingAction({ groupBookingId: id });
  if (!result.success) {
    return NextResponse.json(
      { error: result.error ?? "Failed to delete group booking" },
      { status: 400 },
    );
  }

  return NextResponse.json(result);
}
