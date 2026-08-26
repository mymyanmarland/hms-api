import { NextRequest, NextResponse } from "next/server";
import {
  getDeparturesAction,
  getCheckOutDetailsAction,
  processCheckOutAction,
  cancelCheckOutAction,
  addCheckoutChargeAction,
} from "@/app/actions/checkout";
import { checkOutQuerySchema, processCheckOutSchema, getCheckOutDetailsSchema, addCheckoutChargeSchema, cancelCheckOutSchema } from "@/lib/validations/checkout";

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

    const result = await getCheckOutDetailsAction({ bookingId });
    if (!result.success) {
      return NextResponse.json(
        { error: result.error ?? "Failed to load check-out details" },
        { status: 400 },
      );
    }
    return NextResponse.json(result);
  }

  const result = await getDeparturesAction({
    date: searchParams.get("date") ?? toIsoDate(new Date()),
    status: (searchParams.get("status") as "ALL" | "CHECKED_IN" | "PENDING_PAYMENT" | "READY_TO_CHECKOUT") ?? "ALL",
  });

  if (!result.success) {
    return NextResponse.json(
      { error: result.error ?? "Failed to load departures" },
      { status: 400 },
    );
  }

  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const intent = searchParams.get("intent");

  if (intent === "add-charge") {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON payload" },
        { status: 400 },
      );
    }

    const parsed = addCheckoutChargeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid payload",
          fieldErrors: parsed.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const result = await addCheckoutChargeAction(parsed.data);
    if (!result.success) {
      return NextResponse.json(
        { error: result.error ?? "Failed to add charge", fieldErrors: result.fieldErrors },
        { status: 400 },
      );
    }
    return NextResponse.json(result);
  }

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

    const parsed = cancelCheckOutSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid payload",
          fieldErrors: parsed.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const result = await cancelCheckOutAction(parsed.data);
    if (!result.success) {
      return NextResponse.json(
        { error: result.error ?? "Failed to cancel check-out", fieldErrors: result.fieldErrors },
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

  const parsed = processCheckOutSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid check-out payload",
        fieldErrors: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  const result = await processCheckOutAction(parsed.data);
  if (!result.success) {
    return NextResponse.json(
      {
        error: result.error ?? "Failed to complete check-out",
        fieldErrors: result.fieldErrors,
      },
      { status: 400 },
    );
  }

  return NextResponse.json(result);
}
