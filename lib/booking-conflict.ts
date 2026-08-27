/**
 * Booking conflict detection and room availability helpers.
 * These are used by the public availability API and booking actions to
 * determine whether a specific room or room type is free for a date range.
 */

import prisma from "@/lib/prisma";

/** Return type for `findBookingConflict` */
export type BookingConflict = {
  bookingId: string;
  confirmationCode: string;
  checkInDate: Date;
  checkOutDate: Date;
} | null;

/**
 * Check whether a specific room has an active booking that overlaps the
 * requested date range.
 *
 * An overlap exists when:
 *   new_check_in  <  existing_check_out   AND
 *   new_check_out >  existing_check_in
 *
 * Cancelled and no-show bookings are excluded.
 */
export async function findBookingConflict(
  roomId: string,
  checkInDate: Date,
  checkOutDate: Date,
): Promise<BookingConflict> {
  const conflict = await prisma.bookingRoom.findFirst({
    where: {
      roomId,
      // Both conditions must hold on the same `booking` relation — merge
      // into a single `booking` key so neither overwrites the other.
      booking: {
        status: {
          notIn: ["CANCELLED", "NO_SHOW"],
        },
        checkInDate: { lt: checkOutDate },
        checkOutDate: { gt: checkInDate },
      },
    },
    select: {
      bookingId: true,
      booking: {
        select: {
          id: true,
          confirmationCode: true,
          checkInDate: true,
          checkOutDate: true,
        },
      },
    },
  });

  if (!conflict) return null;

  return {
    bookingId: conflict.booking.id,
    confirmationCode: conflict.booking.confirmationCode,
    checkInDate: conflict.booking.checkInDate,
    checkOutDate: conflict.booking.checkOutDate,
  };
}

/** Return type for `findAvailableRoomForType` */
export type AvailableRoom = {
  id: string;
  number: string;
} | null;

/**
 * Find the first available room of a given room type for the requested
 * date range. Useful when the guest selects a room type and we need to
 * assign a specific room before payment.
 *
 * Rooms with status MAINTENANCE or OUT_OF_ORDER are excluded entirely.
 * Confirmed / tentative bookings with overlapping dates are also excluded.
 */
export async function findAvailableRoomForType(
  roomTypeId: string,
  checkInDate: Date,
  checkOutDate: Date,
): Promise<AvailableRoom> {
  const allRooms = await prisma.room.findMany({
    where: {
      roomTypeId,
      status: { notIn: ["MAINTENANCE", "OUT_OF_ORDER"] },
    },
    select: { id: true, number: true },
  });

  for (const room of allRooms) {
    const conflict = await findBookingConflict(
      room.id,
      checkInDate,
      checkOutDate,
    );
    if (!conflict) return room;
  }

  return null;
}
