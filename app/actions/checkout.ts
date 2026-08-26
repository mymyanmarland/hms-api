"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import prisma from "@/lib/prisma";
import { requireAdminOrThrow, type AdminActor } from "@/lib/admin-auth";
import {
  checkOutQuerySchema,
  processCheckOutSchema,
  getCheckOutDetailsSchema,
  addCheckoutChargeSchema,
  cancelCheckOutSchema,
  type CheckOutQuery,
  type ProcessCheckOutInput,
  type GetCheckOutDetailsInput,
  type AddCheckoutChargeInput,
  type CancelCheckOutInput,
} from "@/lib/validations/checkout";
import type { ActionResponse } from "@/app/actions/password-reset";

// ============================================
// TYPES
// ============================================

export type DepartureBooking = {
  id: string;
  confirmationCode: string;
  status: "TENTATIVE" | "CONFIRMED" | "CHECKED_IN" | "CHECKED_OUT" | "CANCELLED" | "NO_SHOW";
  source: "DIRECT" | "WALK_IN" | "PHONE" | "OTA" | "CORPORATE" | "GROUP";
  guestFirstName: string;
  guestLastName: string;
  guestEmail: string;
  guestPhone: string | null;
  adults: number;
  children: number;
  checkInDate: string;
  checkOutDate: string;
  totalAmount: string;
  roomId: string | null;
  roomNumber: string | null;
  roomTypeName: string | null;
  actualCheckIn: string | null;
  folioBalance: string;
  folioId: string | null;
};

export type CheckOutDetails = {
  booking: {
    id: string;
    confirmationCode: string;
    status: string;
    source: string;
    guestFirstName: string;
    guestLastName: string;
    guestEmail: string;
    guestPhone: string | null;
    adults: number;
    children: number;
    infants: number;
    checkInDate: string;
    checkOutDate: string;
    totalAmount: string;
    specialRequests: string | null;
  };
  guest: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string | null;
    isVip: boolean;
  } | null;
  room: {
    id: string;
    number: string;
    floor: number;
    status: string;
    roomType: {
      id: string;
      name: string;
      basePrice: string;
    };
  } | null;
  folio: {
    id: string;
    folioNumber: string;
    balance: string;
    subtotal: string;
    taxes: string;
    totalPayments: string;
    charges: Array<{
      id: string;
      category: string;
      description: string;
      amount: string;
      postedAt: string;
    }>;
    payments: Array<{
      id: string;
      method: string;
      amount: string;
      processedAt: string;
      cardLast4: string | null;
    }>;
  } | null;
  checkIn: {
    id: string;
    checkedInAt: string;
    keyCardNumber: string | null;
  } | null;
};

export type CheckOutResult = {
  bookingId: string;
  confirmationCode: string;
  checkOutId: string;
};

// ============================================
// HELPERS
// ============================================

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

function generateFolioNumber(): string {
  const year = new Date().getUTCFullYear();
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let suffix = "";
  for (let i = 0; i < 6; i += 1) {
    suffix += chars[Math.floor(Math.random() * chars.length)];
  }
  return `FOL-${year}-${suffix}`;
}

// ============================================
// ACTIONS
// ============================================

export async function getDeparturesAction(
  input: CheckOutQuery,
): Promise<ActionResponse<{ departures: DepartureBooking[]; date: string }>> {
  const parsed = checkOutQuerySchema.safeParse(input);
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
      error: "You do not have permission to view departures.",
    };
  }

  const today = new Date();
  const targetDate = parsed.data.date
    ? normalizeToUtcStart(parsed.data.date)
    : today;
  const targetDateIso = toIsoDate(targetDate);

  const dayStart = normalizeToUtcStart(targetDateIso);
  const dayEnd = new Date(dayStart);
  dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);

  try {
    const statusFilter = parsed.data.status;

    const whereClause: Record<string, unknown> = {
      booking: {
        checkOutDate: {
          gte: dayStart,
          lt: dayEnd,
        },
        ...(statusFilter !== "ALL"
          ? statusFilter === "CHECKED_IN"
            ? { status: "CHECKED_IN" }
            : statusFilter === "PENDING_PAYMENT"
              ? { status: "CHECKED_IN" }
              : {}
          : { status: { in: ["CHECKED_IN"] } }),
      },
    };

    const bookings = await prisma.bookingRoom.findMany({
      where: whereClause,
      orderBy: { booking: { checkOutDate: "asc" } },
      select: {
        roomId: true,
        room: {
          select: {
            number: true,
            roomType: { select: { name: true } },
          },
        },
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
            actualCheckIn: true,
            guest: {
              select: {
                id: true,
                folios: {
                  where: { status: "OPEN" },
                  select: {
                    id: true,
                    balance: true,
                  },
                  take: 1,
                },
              },
            },
          },
        },
      },
    });

    const departures: DepartureBooking[] = bookings.map((br) => {
      const folio = br.booking.guest?.folios?.[0];
      return {
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
        roomId: br.roomId,
        roomNumber: br.room?.number ?? null,
        roomTypeName: br.room?.roomType.name ?? null,
        actualCheckIn: br.booking.actualCheckIn
          ? toIsoDate(br.booking.actualCheckIn)
          : null,
        folioBalance: folio?.balance.toString() ?? "0.00",
        folioId: folio?.id ?? null,
      };
    });

    void actor;
    return {
      success: true,
      data: { departures, date: targetDateIso },
    };
  } catch (error) {
    console.error("Get departures error:", error);
    return {
      success: false,
      error: "Failed to load departures. Please try again.",
    };
  }
}

export async function getCheckOutDetailsAction(
  input: GetCheckOutDetailsInput,
): Promise<ActionResponse<CheckOutDetails>> {
  const parsed = getCheckOutDetailsSchema.safeParse(input);
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
      error: "You do not have permission to view check-out details.",
    };
  }

  try {
    const booking = await prisma.booking.findUnique({
      where: { id: parsed.data.bookingId },
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
        infants: true,
        checkInDate: true,
        checkOutDate: true,
        totalAmount: true,
        specialRequests: true,
        guest: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            isVip: true,
            folios: {
              where: { status: "OPEN" },
              include: {
                charges: {
                  orderBy: { postedAt: "desc" },
                  select: {
                    id: true,
                    category: true,
                    description: true,
                    amount: true,
                    postedAt: true,
                  },
                },
                payments: {
                  orderBy: { processedAt: "desc" },
                  select: {
                    id: true,
                    method: true,
                    amount: true,
                    processedAt: true,
                    cardLast4: true,
                  },
                },
              },
              take: 1,
            },
          },
        },
        bookingRooms: {
          where: { status: "CHECKED_IN" },
          select: {
            roomId: true,
            room: {
              select: {
                id: true,
                number: true,
                floor: true,
                status: true,
                roomType: {
                  select: {
                    id: true,
                    name: true,
                    basePrice: true,
                  },
                },
              },
            },
          },
          take: 1,
        },
        checkIn: {
          select: {
            id: true,
            checkedInAt: true,
            keyCardNumber: true,
          },
        },
      },
    });

    if (!booking) {
      return {
        success: false,
        error: "Booking not found.",
      };
    }

    const primaryRoom = booking.bookingRooms?.[0];
    const folio = booking.guest?.folios?.[0];

    const result: CheckOutDetails = {
      booking: {
        id: booking.id,
        confirmationCode: booking.confirmationCode,
        status: booking.status,
        source: booking.source,
        guestFirstName: booking.guestFirstName,
        guestLastName: booking.guestLastName,
        guestEmail: booking.guestEmail,
        guestPhone: booking.guestPhone,
        adults: booking.adults,
        children: booking.children,
        infants: booking.infants,
        checkInDate: toIsoDate(booking.checkInDate),
        checkOutDate: toIsoDate(booking.checkOutDate),
        totalAmount: booking.totalAmount.toString(),
        specialRequests: booking.specialRequests,
      },
      guest: booking.guest
        ? {
            id: booking.guest.id,
            firstName: booking.guest.firstName,
            lastName: booking.guest.lastName,
            email: booking.guest.email,
            phone: booking.guest.phone,
            isVip: booking.guest.isVip,
          }
        : null,
      room: primaryRoom?.room
        ? {
            id: primaryRoom.room.id,
            number: primaryRoom.room.number,
            floor: primaryRoom.room.floor,
            status: primaryRoom.room.status,
            roomType: {
              id: primaryRoom.room.roomType.id,
              name: primaryRoom.room.roomType.name,
              basePrice: primaryRoom.room.roomType.basePrice.toString(),
            },
          }
        : null,
      folio: folio
        ? {
            id: folio.id,
            folioNumber: folio.folioNumber,
            balance: folio.balance.toString(),
            subtotal: folio.subtotal.toString(),
            taxes: folio.taxes.toString(),
            totalPayments: folio.totalPayments.toString(),
            charges: folio.charges.map((c) => ({
              id: c.id,
              category: c.category,
              description: c.description,
              amount: c.amount.toString(),
              postedAt: toIsoDate(c.postedAt),
            })),
            payments: folio.payments.map((p) => ({
              id: p.id,
              method: p.method,
              amount: p.amount.toString(),
              processedAt: toIsoDate(p.processedAt),
              cardLast4: p.cardLast4,
            })),
          }
        : null,
      checkIn: booking.checkIn
        ? {
            id: booking.checkIn.id,
            checkedInAt: toIsoDate(booking.checkIn.checkedInAt),
            keyCardNumber: booking.checkIn.keyCardNumber,
          }
        : null,
    };

    void actor;
    return { success: true, data: result };
  } catch (error) {
    console.error("Get check-out details error:", error);
    return {
      success: false,
      error: "Failed to load check-out details. Please try again.",
    };
  }
}

export async function addCheckoutChargeAction(
  input: AddCheckoutChargeInput,
): Promise<ActionResponse<{ chargeId: string }>> {
  const parsed = addCheckoutChargeSchema.safeParse(input);
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
      error: "You do not have permission to add charges.",
    };
  }

  try {
    const booking = await prisma.booking.findUnique({
      where: { id: parsed.data.bookingId },
      select: {
        id: true,
        guestId: true,
      },
    });

    if (!booking) {
      return {
        success: false,
        error: "Booking not found.",
      };
    }

    // Find or create the folio for this guest
    let folio = await prisma.folio.findFirst({
      where: {
        guestId: booking.guestId,
        status: "OPEN",
      },
    });

    if (!folio) {
      folio = await prisma.folio.create({
        data: {
          folioNumber: generateFolioNumber(),
          status: "OPEN",
          guestId: booking.guestId,
          bookingId: booking.id,
        },
      });
    }

    const chargeCategoryMap: Record<string, string> = {
      EARLY_CHECK_IN: "EARLY_CHECK_IN",
      LATE_CHECK_OUT: "LATE_CHECK_OUT",
      EXTRA_BED: "EXTRA_BED",
      PET_FEE: "PET_FEE",
      OTHER: "OTHER",
    };

    const charge = await prisma.charge.create({
      data: {
        folioId: folio.id,
        category: chargeCategoryMap[parsed.data.chargeType] as "EARLY_CHECK_IN" | "LATE_CHECK_OUT" | "EXTRA_BED" | "PET_FEE" | "OTHER",
        description: parsed.data.description,
        amount: parsed.data.amount,
        postedBy: actor.staff.id,
      },
    });

    await prisma.folio.update({
      where: { id: folio.id },
      data: {
        subtotal: { increment: parsed.data.amount },
        balance: { increment: parsed.data.amount },
      },
    });

    void actor;
    return {
      success: true,
      data: { chargeId: charge.id },
    };
  } catch (error) {
    console.error("Add checkout charge error:", error);
    return {
      success: false,
      error: "Failed to add charge. Please try again.",
    };
  }
}

export async function processCheckOutAction(
  input: ProcessCheckOutInput,
): Promise<ActionResponse<CheckOutResult>> {
  const parsed = processCheckOutSchema.safeParse(input);
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
      error: "You do not have permission to process check-out.",
    };
  }

  const data = parsed.data;

  try {
    const booking = await prisma.booking.findUnique({
      where: { id: data.bookingId },
      select: {
        id: true,
        guestId: true,
        confirmationCode: true,
        status: true,
        guestFirstName: true,
        checkOut: true,
        checkIn: true,
        bookingRooms: {
          where: { status: "CHECKED_IN" },
          select: {
            roomId: true,
          },
        },
      },
    });

    if (!booking) {
      return {
        success: false,
        error: "Booking not found.",
      };
    }

    if (booking.status !== "CHECKED_IN") {
      return {
        success: false,
        error: "Guest has not checked in.",
      };
    }

    if (booking.checkOut) {
      return {
        success: false,
        error: "Guest has already checked out.",
      };
    }

    // Get the folio for this guest
    let folio = await prisma.folio.findFirst({
      where: {
        guestId: booking.guestId,
        status: "OPEN",
      },
    });

    let folioBalance = 0;
    if (folio) {
      folioBalance = Number(folio.balance);
    }

    if (data.checkoutCharges > 0) {
      if (folio) {
        await prisma.charge.create({
          data: {
            folioId: folio.id,
            category: data.lateCheckout ? "LATE_CHECK_OUT" : data.earlyCheckout ? "EARLY_CHECK_IN" : "OTHER",
            description: data.lateCheckout
              ? "Late check-out charge"
              : data.earlyCheckout
                ? "Early check-out adjustment"
                : "Additional charges",
            amount: data.checkoutCharges,
            postedBy: actor.staff.id,
          },
        });

        await prisma.folio.update({
          where: { id: folio.id },
          data: {
            subtotal: { increment: data.checkoutCharges },
            balance: { increment: data.checkoutCharges },
          },
        });
        folioBalance = folioBalance + data.checkoutCharges;
      }
    }

    if (data.paymentMethod && data.paymentAmount && data.paymentAmount > 0) {
      if (folio) {
        const payment = await prisma.payment.create({
          data: {
            folioId: folio.id,
            method: data.paymentMethod as "CASH" | "CREDIT_CARD" | "DEBIT_CARD" | "BANK_TRANSFER",
            amount: data.paymentAmount,
            processedBy: actor.staff.id,
            status: "COMPLETED",
          },
        });

        await prisma.folio.update({
          where: { id: folio.id },
          data: {
            totalPayments: { increment: data.paymentAmount },
            balance: { decrement: Math.min(data.paymentAmount, folioBalance) },
          },
        });
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      if (booking.checkIn) {
        await tx.digitalKey.updateMany({
          where: {
            bookingId: booking.id,
            status: "ACTIVE",
          },
          data: {
            status: "INACTIVE",
            revokedAt: new Date(),
            revokedBy: actor.staff.id,
            revokeReason: "Check-out",
          },
        });
      }

      for (const br of booking.bookingRooms) {
        await tx.room.update({
          where: { id: br.roomId },
          data: { status: "DIRTY" },
        });

        await tx.roomStatusHistory.create({
          data: {
            roomId: br.roomId,
            status: "DIRTY",
            notes: `Check-out for booking ${booking.confirmationCode}`,
            changedBy: actor.staff.id,
          },
        });

        await tx.housekeepingTask.create({
          data: {
            roomId: br.roomId,
            taskType: "CLEANING",
            priority: "HIGH",
            status: "PENDING",
            dueBy: new Date(),
            notes: `Post check-out cleaning for ${booking.guestFirstName}`,
          },
        });
      }

      await tx.bookingRoom.updateMany({
        where: { bookingId: booking.id },
        data: { status: "CHECKED_OUT" },
      });

      const checkOut = await tx.checkOut.create({
        data: {
          bookingId: booking.id,
          checkedOutBy: actor.staff.id,
          departureTime: data.departureTime,
          roomKeysReturned: data.roomKeysReturned,
          folioBalance,
          paymentRequired: data.paymentMethod ? false : folioBalance > 0,
          feedbackRequested: data.feedbackRequested,
          notes: data.notes,
        },
      });

      await tx.booking.update({
        where: { id: booking.id },
        data: {
          status: "CHECKED_OUT",
          actualCheckOut: new Date(),
        },
      });

      if (folio) {
        await tx.folio.update({
          where: { id: folio.id },
          data: {
            status: "CLOSED",
            closedAt: new Date(),
          },
        });
      }

      return { checkOutId: checkOut.id };
    });

    revalidatePath("/dashboard/calendar");
    revalidatePath("/dashboard/frontdesk");
    revalidateTag("calendar", "max");

    void actor;
    return {
      success: true,
      data: {
        bookingId: booking.id,
        confirmationCode: booking.confirmationCode,
        checkOutId: result.checkOutId,
      },
    };
  } catch (error) {
    console.error("Process check-out error:", error);
    return {
      success: false,
      error: "Failed to complete check-out. Please try again.",
    };
  }
}

export async function cancelCheckOutAction(
  input: CancelCheckOutInput,
): Promise<ActionResponse<{ bookingId: string }>> {
  const parsed = cancelCheckOutSchema.safeParse(input);
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
      error: "You do not have permission to cancel check-out.",
    };
  }

  try {
    const booking = await prisma.booking.findUnique({
      where: { id: parsed.data.bookingId },
      include: {
        checkOut: true,
        bookingRooms: {
          where: { status: "CHECKED_OUT" },
        },
      },
    });

    if (!booking) {
      return {
        success: false,
        error: "Booking not found.",
      };
    }

    if (booking.status !== "CHECKED_OUT") {
      return {
        success: false,
        error: "Guest has not checked out.",
      };
    }

    await prisma.$transaction(async (tx) => {
      if (booking.checkOut) {
        await tx.checkOut.update({
          where: { id: booking.checkOut.id },
          data: {
            notes: booking.checkOut.notes
              ? `${booking.checkOut.notes}\n[CANCELLED] ${parsed.data.reason}`
              : `[CANCELLED] ${parsed.data.reason}`,
          },
        });
      }

      for (const br of booking.bookingRooms) {
        await tx.room.update({
          where: { id: br.roomId },
          data: { status: "OCCUPIED" },
        });

        await tx.roomStatusHistory.create({
          data: {
            roomId: br.roomId,
            status: "OCCUPIED",
            notes: `Check-out cancelled: ${parsed.data.reason}`,
            changedBy: actor.staff.id,
          },
        });
      }

      await tx.bookingRoom.updateMany({
        where: { bookingId: booking.id },
        data: { status: "CHECKED_IN" },
      });

      await tx.booking.update({
        where: { id: booking.id },
        data: {
          status: "CHECKED_IN",
          actualCheckOut: null,
        },
      });
    });

    revalidatePath("/dashboard/calendar");
    revalidatePath("/dashboard/frontdesk");
    revalidateTag("calendar", "max");

    void actor;
    return {
      success: true,
      data: { bookingId: booking.id },
    };
  } catch (error) {
    console.error("Cancel check-out error:", error);
    return {
      success: false,
      error: "Failed to cancel check-out. Please try again.",
    };
  }
}
