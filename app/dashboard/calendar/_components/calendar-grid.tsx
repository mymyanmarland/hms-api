"use client";

import * as React from "react";
import { PlusIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { BookingBar } from "./booking-bar";
import type {
  CalendarBooking,
  CalendarRoom,
} from "@/app/actions/calendar";

const ROOM_STATUS_LABEL: Record<CalendarRoom["status"], string> = {
  AVAILABLE: "Available",
  OCCUPIED: "Occupied",
  DIRTY: "Dirty",
  CLEANING: "Cleaning",
  MAINTENANCE: "Maintenance",
  OUT_OF_ORDER: "Out of order",
};

const ROOM_STATUS_CLASSES: Record<CalendarRoom["status"], string> = {
  AVAILABLE: "bg-emerald-500/15 text-emerald-700 ring-emerald-500/30 dark:text-emerald-300",
  OCCUPIED: "bg-blue-500/15 text-blue-700 ring-blue-500/30 dark:text-blue-300",
  DIRTY: "bg-amber-500/15 text-amber-800 ring-amber-500/30 dark:text-amber-300",
  CLEANING: "bg-violet-500/15 text-violet-700 ring-violet-500/30 dark:text-violet-300",
  MAINTENANCE: "bg-orange-500/15 text-orange-800 ring-orange-500/30 dark:text-orange-300",
  OUT_OF_ORDER: "bg-red-500/15 text-red-800 ring-red-500/30 dark:text-red-300",
};

const WEEKDAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// Visual sizing for the booking track layout. Each track holds one booking
// bar at a uniform height, so overlapping bookings never visually collide.
// The day cell's min-height is trackCount * TRACK_HEIGHT + CELL_BASE_HEIGHT.
const TRACK_HEIGHT = 30; // px — matches BookingBar height (py-1 + text-xs + ring)
const CELL_BASE_HEIGHT = 4; // px — top/bottom breathing room inside the day cell

export type NewBookingSlot = {
  roomId: string;
  checkInDate: string;
  checkOutDate: string;
};

function isSameSlot(
  a: NewBookingSlot | null | undefined,
  b: { roomId: string; checkInDate: string },
): boolean {
  if (!a) return false;
  return a.roomId === b.roomId && a.checkInDate === b.checkInDate;
}

type PositionedBooking = CalendarBooking & {
  startColumn: number;
  endColumn: number;
  startDay: number;
  endDay: number;
  trackIndex: number;
};

// Greedy interval-scheduling: sort by start day ascending (then longer
// durations first), and assign each booking to the first track where it
// doesn't overlap with the previous booking on that track.
function assignTracks(
  bookings: CalendarBooking[],
  fromIso: string,
): { positioned: PositionedBooking[]; trackCount: number } {
  const positioned: PositionedBooking[] = bookings.map((booking) => {
    const span = computeSpan(booking.checkInDate, booking.checkOutDate, fromIso);
    return {
      ...booking,
      ...span,
      trackIndex: 0,
    };
  });

  positioned.sort((a, b) => {
    if (a.startDay !== b.startDay) return a.startDay - b.startDay;
    return b.endDay - a.endDay;
  });

  // trackOccupancy[k] is the endDay of the last booking placed on track k.
  // A new booking fits on track k if its startDay >= trackOccupancy[k].
  const trackOccupancy: number[] = [];
  for (const booking of positioned) {
    let trackIndex = trackOccupancy.findIndex(
      (lastEndDay) => booking.startDay >= lastEndDay,
    );
    if (trackIndex === -1) {
      trackIndex = trackOccupancy.length;
      trackOccupancy.push(0);
    }
    trackOccupancy[trackIndex] = booking.endDay;
    booking.trackIndex = trackIndex;
  }

  const trackCount = Math.max(trackOccupancy.length, 1);
  return { positioned, trackCount };
}

const EMPTY_LAYOUT: { positioned: PositionedBooking[]; trackCount: number } = {
  positioned: [],
  trackCount: 1,
};

type RoomLayout = ReturnType<typeof assignTracks>;

function buildRoomLayout(
  bookingsByRoom: Map<string, CalendarBooking[]>,
  fromIso: string,
): Map<string, RoomLayout> {
  const layout = new Map<string, RoomLayout>();
  for (const [roomId, roomBookings] of bookingsByRoom) {
    layout.set(roomId, assignTracks(roomBookings, fromIso));
  }
  return layout;
}

export function CalendarGrid({
  fromIso,
  rooms,
  bookings,
  selectedSlot,
  onSelectBooking,
  onCreateBooking,
}: {
  fromIso: string;
  rooms: CalendarRoom[];
  bookings: CalendarBooking[];
  selectedSlot?: NewBookingSlot | null;
  onSelectBooking: (booking: CalendarBooking) => void;
  onCreateBooking: (slot: NewBookingSlot) => void;
}) {
  const days = React.useMemo(() => buildWeek(fromIso), [fromIso]);
  const bookingsByRoom = React.useMemo(() => groupByRoom(bookings), [bookings]);
  const layoutByRoom = React.useMemo(
    () => buildRoomLayout(bookingsByRoom, fromIso),
    [bookingsByRoom, fromIso],
  );

  return (
    <div className="overflow-x-auto rounded-lg border bg-card">
      <div
        className="grid min-w-[900px]"
        style={{
          gridTemplateColumns: "260px repeat(7, minmax(0, 1fr))",
        }}
      >
        {/* Top-left corner header */}
        <div className="sticky left-0 top-0 z-20 border-b border-r bg-card px-3 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Rooms · 7 days
        </div>

        {/* Date headers */}
        {days.map((day) => {
          const isToday = day.iso === fromIso || day.isToday;
          return (
            <div
              key={day.iso}
              className={cn(
                "sticky top-0 z-10 border-b bg-card px-2 py-2 text-center text-xs",
                isToday && "bg-primary/5",
              )}
            >
              <div className="font-medium uppercase tracking-wide text-muted-foreground">
                {WEEKDAY_NAMES[day.date.getUTCDay()]}
              </div>
              <div
                className={cn(
                  "mt-0.5 inline-flex size-7 items-center justify-center rounded-full text-sm font-semibold tabular-nums",
                  isToday && "bg-primary text-primary-foreground",
                  !isToday && "text-foreground",
                )}
              >
                {day.date.getUTCDate()}
              </div>
            </div>
          );
        })}

        {/* Rows */}
        {rooms.length === 0 ? (
          <div className="col-span-8 flex flex-col items-center justify-center gap-2 px-4 py-16 text-center">
            <p className="text-sm text-muted-foreground">
              No rooms match the current filters.
            </p>
            <p className="text-xs text-muted-foreground">
              Try clearing the room type or floor filter.
            </p>
          </div>
        ) : null}

        {rooms.map((room) => {
          const layout = layoutByRoom.get(room.id) ?? EMPTY_LAYOUT;
          const { positioned, trackCount } = layout;
          const cellMinHeight = trackCount * TRACK_HEIGHT + CELL_BASE_HEIGHT;

          return (
            <React.Fragment key={room.id}>
              <div className="sticky left-0 z-10 flex items-center justify-between gap-2 border-b border-r bg-card px-3 py-2">
                <div className="flex min-w-0 flex-col">
                  <span className="truncate text-sm font-semibold">
                    Room {room.number}
                  </span>
                  <span className="truncate text-xs text-muted-foreground">
                    {room.roomType.name} · Floor {room.floor}
                  </span>
                </div>
                <Badge
                  className={cn(
                    "shrink-0 ring-1",
                    ROOM_STATUS_CLASSES[room.status],
                  )}
                >
                  {ROOM_STATUS_LABEL[room.status]}
                </Badge>
              </div>

              <div
                className="relative col-span-7 border-b"
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
                  minHeight: `${cellMinHeight}px`,
                }}
              >
                {/* Day columns as clickable backgrounds */}
                {days.map((day) => {
                  const cellSlot: NewBookingSlot = {
                    roomId: room.id,
                    checkInDate: day.iso,
                    checkOutDate: addDays(day.iso, 1),
                  };
                  const isSelected = isSameSlot(selectedSlot, cellSlot);
                  return (
                    <button
                      key={day.iso}
                      type="button"
                      onClick={() => onCreateBooking(cellSlot)}
                      aria-label={`Create booking for room ${room.number} on ${day.iso}`}
                      aria-pressed={isSelected}
                      className={cn(
                        "group/cell relative h-full border-r border-border/40 text-left text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
                        day.isToday && !isSelected && "bg-primary/5",
                        // Idle hover: clear primary tint + visible "create" cue
                        "hover:bg-primary/10",
                        // Selected (open dialog) state: stronger ring + tint
                        isSelected &&
                          "z-10 bg-primary/15 ring-2 ring-inset ring-primary shadow-[inset_0_0_0_2px_hsl(var(--primary)/0.4)]",
                        // Active (mouse pressed) state
                        "active:bg-primary/20",
                      )}
                      style={{ minHeight: `${cellMinHeight}px` }}
                    >
                      {/* "Click to create" hint shown on hover (hidden when selected).
                          Confined to the top track so it never visually collides
                          with bookings stacked in lower tracks of the same cell. */}
                      {!isSelected ? (
                        <span
                          className="pointer-events-none absolute inset-x-0 top-0 hidden items-center justify-center text-primary/70 group-hover/cell:flex"
                          style={{ height: `${TRACK_HEIGHT}px` }}
                        >
                          <PlusIcon
                            className="size-5"
                            aria-hidden
                          />
                          <span className="sr-only">
                            Create booking for room {room.number} on {day.iso}
                          </span>
                        </span>
                      ) : null}

                      {/* Selected indicator */}
                      {isSelected ? (
                        <span
                          aria-hidden
                          className="pointer-events-none absolute right-1.5 top-1.5 inline-flex items-center gap-1 rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary-foreground"
                        >
                          <PlusIcon className="size-3" />
                          New
                        </span>
                      ) : null}
                    </button>
                  );
                })}

                {/* Booking bars overlaid in a fixed-height grid. Each track
                    has a uniform row height so stacked bookings never collide.
                    Columns are inherited from the parent grid so bars size
                    to the day cells (not to their own text content, which
                    would make `whitespace-nowrap` stretch the grid). */}
                <div
                  className="pointer-events-none absolute inset-0 grid"
                  style={{
                    gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
                    gridTemplateRows: `repeat(${trackCount}, ${TRACK_HEIGHT}px)`,
                  }}
                >
                  {positioned.map((booking) => {
                    if (booking.endColumn < 2 || booking.startColumn > 8) {
                      return null;
                    }
                    const startColumn = Math.max(booking.startColumn, 2);
                    const endColumn = Math.min(booking.endColumn, 9);
                    return (
                      <div
                        key={booking.id}
                        className="pointer-events-auto"
                        style={{
                          gridColumnStart: startColumn,
                          gridColumnEnd: endColumn,
                          gridRowStart: booking.trackIndex + 1,
                          gridRowEnd: booking.trackIndex + 2,
                        }}
                      >
                        <BookingBar
                          booking={booking}
                          onSelect={onSelectBooking}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

function buildWeek(fromIso: string): Array<{
  iso: string;
  date: Date;
  isToday: boolean;
}> {
  const start = parseIso(fromIso);
  const todayIso = toIsoDate(new Date());
  const days: Array<{ iso: string; date: Date; isToday: boolean }> = [];
  for (let i = 0; i < 7; i += 1) {
    const date = new Date(start);
    date.setUTCDate(date.getUTCDate() + i);
    const iso = toIsoDate(date);
    days.push({ iso, date, isToday: iso === todayIso });
  }
  return days;
}

function groupByRoom(
  bookings: CalendarBooking[],
): Map<string, CalendarBooking[]> {
  const map = new Map<string, CalendarBooking[]>();
  for (const booking of bookings) {
    const list = map.get(booking.roomId);
    if (list) {
      list.push(booking);
    } else {
      map.set(booking.roomId, [booking]);
    }
  }
  return map;
}

function computeSpan(
  checkInIso: string,
  checkOutIso: string,
  fromIso: string,
): { startColumn: number; endColumn: number; startDay: number; endDay: number } {
  const checkIn = parseIso(checkInIso);
  const checkOut = parseIso(checkOutIso);
  const from = parseIso(fromIso);

  const startDay = Math.max(
    Math.floor((checkIn.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)),
    0,
  );
  const endDay = Math.max(
    Math.ceil((checkOut.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)),
    startDay + 1,
  );

  const startColumn = Math.min(Math.max(startDay + 2, 2), 8);
  const endColumn = Math.min(Math.max(endDay + 2, 3), 9);

  return { startColumn, endColumn, startDay, endDay };
}

function parseIso(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

function toIsoDate(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(iso: string, days: number): string {
  const date = parseIso(iso);
  date.setUTCDate(date.getUTCDate() + days);
  return toIsoDate(date);
}