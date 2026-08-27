import { describe, it, expect, beforeEach, vi } from "vitest";
import { findBookingConflict, findAvailableRoomForType } from "@/lib/booking-conflict";

vi.mock("@/lib/prisma", () => ({
  default: {
    bookingRoom: { findFirst: vi.fn() },
    room: { findMany: vi.fn() },
  },
}));

import prisma from "@/lib/prisma";

const mockedPrisma = prisma as unknown as {
  bookingRoom: { findFirst: ReturnType<typeof vi.fn> };
  room: { findMany: ReturnType<typeof vi.fn> };
};

const checkIn = new Date("2026-03-10T00:00:00Z");
const checkOut = new Date("2026-03-15T00:00:00Z");

describe("findBookingConflict", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null when there is no overlapping booking", async () => {
    mockedPrisma.bookingRoom.findFirst.mockResolvedValueOnce(null);
    const result = await findBookingConflict("room-1", checkIn, checkOut);
    expect(result).toBeNull();
  });

  it("returns conflict details when an overlapping booking exists", async () => {
    mockedPrisma.bookingRoom.findFirst.mockResolvedValueOnce({
      bookingId: "bk-1",
      booking: {
        id: "bk-1",
        confirmationCode: "HMS-2026-ABC123",
        checkInDate: new Date("2026-03-09T00:00:00Z"),
        checkOutDate: new Date("2026-03-12T00:00:00Z"),
      },
    });
    const result = await findBookingConflict("room-1", checkIn, checkOut);
    expect(result).toEqual({
      bookingId: "bk-1",
      confirmationCode: "HMS-2026-ABC123",
      checkInDate: new Date("2026-03-09T00:00:00Z"),
      checkOutDate: new Date("2026-03-12T00:00:00Z"),
    });
  });

  it("forwards the roomId and dates into the Prisma query", async () => {
    mockedPrisma.bookingRoom.findFirst.mockResolvedValueOnce(null);
    await findBookingConflict("room-42", checkIn, checkOut);
    expect(mockedPrisma.bookingRoom.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ roomId: "room-42" }),
      }),
    );
  });

  it("excludes CANCELLED and NO_SHOW statuses", async () => {
    mockedPrisma.bookingRoom.findFirst.mockResolvedValueOnce(null);
    await findBookingConflict("room-1", checkIn, checkOut);
    const call = mockedPrisma.bookingRoom.findFirst.mock.calls[0][0];
    expect(call.where.booking.status).toEqual({
      notIn: ["CANCELLED", "NO_SHOW"],
    });
  });
});

describe("findAvailableRoomForType", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the first room that has no conflict", async () => {
    mockedPrisma.room.findMany.mockResolvedValueOnce([
      { id: "r-1", number: "101" },
      { id: "r-2", number: "102" },
    ]);
    // r-1 has a conflict; r-2 does not.
    mockedPrisma.bookingRoom.findFirst
      .mockResolvedValueOnce({
        bookingId: "bk-x",
        booking: {
          id: "bk-x",
          confirmationCode: "HMS-2026-XXX",
          checkInDate: checkIn,
          checkOutDate: checkOut,
        },
      })
      .mockResolvedValueOnce(null);

    const result = await findAvailableRoomForType("rt-1", checkIn, checkOut);
    expect(result).toEqual({ id: "r-2", number: "102" });
  });

  it("returns null when every room has a conflict", async () => {
    mockedPrisma.room.findMany.mockResolvedValueOnce([
      { id: "r-1", number: "101" },
      { id: "r-2", number: "102" },
    ]);
    mockedPrisma.bookingRoom.findFirst.mockResolvedValue({
      bookingId: "bk-x",
      booking: {
        id: "bk-x",
        confirmationCode: "HMS-2026-XXX",
        checkInDate: checkIn,
        checkOutDate: checkOut,
      },
    });

    const result = await findAvailableRoomForType("rt-1", checkIn, checkOut);
    expect(result).toBeNull();
  });

  it("returns null when no rooms exist for the type", async () => {
    mockedPrisma.room.findMany.mockResolvedValueOnce([]);
    const result = await findAvailableRoomForType("rt-1", checkIn, checkOut);
    expect(result).toBeNull();
  });

  it("excludes MAINTENANCE and OUT_OF_ORDER rooms at the Prisma level", async () => {
    mockedPrisma.room.findMany.mockResolvedValueOnce([]);
    await findAvailableRoomForType("rt-1", checkIn, checkOut);
    expect(mockedPrisma.room.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: { notIn: ["MAINTENANCE", "OUT_OF_ORDER"] },
        }),
      }),
    );
  });
});
