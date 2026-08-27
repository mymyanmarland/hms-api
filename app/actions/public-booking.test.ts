import { describe, it, expect, beforeEach, vi } from "vitest";

// ----- Mocks MUST come before imports of the module under test. -----

vi.mock("@/lib/prisma", () => {
  // The transaction callback runs against a `tx` client; we mirror the
  // shape minimally so the SUT can call create/findUnique without exploding.
  const tx = {
    guest: {
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({ id: "guest-1" }),
      update: vi.fn().mockResolvedValue({ id: "guest-1" }),
    },
    booking: {
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({
        id: "bk-1",
        confirmationCode: "HMS-2026-ABC123",
      }),
    },
    bookingRoom: {
      create: vi.fn().mockResolvedValue({ id: "br-1" }),
    },
    emailLog: {
      create: vi.fn().mockResolvedValue({ id: "email-1" }),
    },
  };
  return {
    default: {
      roomType: { findMany: vi.fn() },
      room: { findUnique: vi.fn() },
      booking: { create: vi.fn() },
      bookingRoom: { create: vi.fn() },
      guest: {
        upsert: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn().mockResolvedValue({ id: "guest-1" }),
      },
      session: { findUnique: vi.fn() },
      emailLog: { create: vi.fn().mockResolvedValue({ id: "email-1" }) },
      $transaction: vi.fn(async (cb) => cb(tx)),
    },
  };
});

vi.mock("@/lib/booking-conflict", () => ({
  findBookingConflict: vi.fn().mockResolvedValue(null),
  findAvailableRoomForType: vi.fn(),
}));

vi.mock("@/lib/mail", () => ({
  getMailTransport: () => ({
    send: vi.fn().mockResolvedValue({ id: "email-1" }),
  }),
}));

vi.mock("@react-email/render", () => ({
  render: vi.fn().mockReturnValue("<html>mock email</html>"),
}));

vi.mock("@/app/emails/booking-confirmation-template", () => ({
  BookingConfirmationTemplate: () => null,
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}));

// ----- Now import the SUT. -----
import {
  searchAvailabilityAction,
  createDirectBookingAction,
} from "@/app/actions/public-booking";
import prisma from "@/lib/prisma";
import { findAvailableRoomForType } from "@/lib/booking-conflict";

const mockedPrisma = prisma as unknown as {
  roomType: { findMany: ReturnType<typeof vi.fn> };
  room: { findUnique: ReturnType<typeof vi.fn> };
  booking: { create: ReturnType<typeof vi.fn> };
  bookingRoom: { create: ReturnType<typeof vi.fn> };
  guest: {
    upsert: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
  };
  session: { findUnique: ReturnType<typeof vi.fn> };
};
const today = new Date().toISOString().slice(0, 10);
const tomorrow = (() => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
})();

const E = (local: string, domain = "example.com") => local + "\u0040" + domain;

describe("searchAvailabilityAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns field errors on invalid input", async () => {
    const result = await searchAvailabilityAction({
      checkIn: "not-a-date",
      checkOut: tomorrow,
      adults: 1,
      children: 0,
    });
    expect(result.success).toBe(false);
    expect(result.fieldErrors?.checkIn).toBeDefined();
  });

  it("returns empty results when no room types exist", async () => {
    mockedPrisma.roomType.findMany.mockResolvedValueOnce([]);
    const result = await searchAvailabilityAction({
      checkIn: today,
      checkOut: tomorrow,
      adults: 1,
      children: 0,
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data?.results).toEqual([]);
  });

  it("excludes room types with no available rooms", async () => {
    mockedPrisma.roomType.findMany.mockResolvedValueOnce([
      {
        id: "rt-1",
        name: "Deluxe",
        description: null,
        basePrice: { toString: () => "100" },
        maxOccupancy: 2,
        bedConfig: null,
        amenities: [],
        images: [],
        rooms: [],
      },
      {
        id: "rt-2",
        name: "Standard",
        description: null,
        basePrice: { toString: () => "80" },
        maxOccupancy: 2,
        bedConfig: null,
        amenities: [],
        images: [],
        rooms: [{ id: "r-1", number: "101", status: "AVAILABLE" }],
      },
    ]);
    const result = await searchAvailabilityAction({
      checkIn: today,
      checkOut: tomorrow,
      adults: 1,
      children: 0,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data?.results).toHaveLength(1);
      expect(result.data?.results[0].roomTypeId).toBe("rt-2");
    }
  });

  it("returns field error for past check-in", async () => {
    const result = await searchAvailabilityAction({
      checkIn: "2000-01-01",
      checkOut: tomorrow,
      adults: 1,
      children: 0,
    });
    expect(result.success).toBe(false);
    expect(result.fieldErrors?.checkIn).toBeDefined();
  });
});

describe("createDirectBookingAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(findAvailableRoomForType).mockResolvedValue({ id: "room-1", number: "101" });
  });

  const valid = {
    roomTypeId: "rt-1",
    checkIn: today,
    checkOut: tomorrow,
    adults: 1,
    children: 0,
    guestFirstName: "John",
    guestLastName: "Doe",
    guestEmail: E("john"),
    guestPhone: "",
    specialRequests: "",
    paymentMethod: "CARD" as const,
  };

  it("rejects invalid input with field errors", async () => {
    const result = await createDirectBookingAction({
      ...valid,
      guestEmail: "not-email",
    });
    expect(result.success).toBe(false);
    expect(result.fieldErrors?.guestEmail).toBeDefined();
  });

  it("returns error when no room is available for the type", async () => {
    vi.mocked(findAvailableRoomForType).mockResolvedValueOnce(null);
    const result = await createDirectBookingAction(valid);
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/no longer available/i);
  });

  it("happy path: creates a booking and returns confirmation code", async () => {
    mockedPrisma.room.findUnique.mockResolvedValue({
      id: "room-1",
      number: "101",
      status: "AVAILABLE",
      roomTypeId: "rt-1",
      roomType: { basePrice: { toString: () => "100" }, name: "Deluxe" },
    });
    const result = await createDirectBookingAction(valid);
    if (!result.success) {
      console.error("createDirectBookingAction failed:", JSON.stringify(result));
    }
    expect(result.success).toBe(true);
    expect(result.data?.bookingId).toBe("bk-1");
    // Confirmation code is generated inside the action; just assert shape.
    expect(result.data?.confirmationCode).toMatch(/^HMS-\d{4}-[A-Z0-9]+$/);
  });

  it("uses provided roomId when present", async () => {
    mockedPrisma.room.findUnique.mockResolvedValue({
      id: "room-existing",
      number: "202",
      status: "AVAILABLE",
      roomTypeId: "rt-1",
      roomType: { basePrice: { toString: () => "100" }, name: "Deluxe" },
    });
    const result = await createDirectBookingAction({ ...valid, roomId: "room-existing" });
    if (!result.success) {
      console.error("createDirectBookingAction failed:", JSON.stringify(result));
    }
    expect(result.success).toBe(true);
  });
});
