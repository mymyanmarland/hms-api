"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { CalendarBooking } from "@/app/actions/calendar";

const STATUS_STYLES: Record<CalendarBooking["status"], string> = {
  TENTATIVE:
    "bg-amber-500/15 text-amber-800 ring-amber-500/30 hover:bg-amber-500/25 dark:text-amber-200",
  CONFIRMED:
    "bg-blue-500/15 text-blue-800 ring-blue-500/30 hover:bg-blue-500/25 dark:text-blue-200",
  CHECKED_IN:
    "bg-emerald-500/15 text-emerald-800 ring-emerald-500/30 hover:bg-emerald-500/25 dark:text-emerald-200",
  CHECKED_OUT:
    "bg-slate-500/15 text-slate-700 ring-slate-500/30 hover:bg-slate-500/25 dark:text-slate-200",
  CANCELLED:
    "bg-zinc-500/15 text-zinc-700 ring-zinc-500/30 hover:bg-zinc-500/25 dark:text-zinc-200",
  NO_SHOW:
    "bg-red-500/15 text-red-800 ring-red-500/30 hover:bg-red-500/25 dark:text-red-200",
};

const STATUS_LABEL: Record<CalendarBooking["status"], string> = {
  TENTATIVE: "Tentative",
  CONFIRMED: "Confirmed",
  CHECKED_IN: "Checked in",
  CHECKED_OUT: "Checked out",
  CANCELLED: "Cancelled",
  NO_SHOW: "No show",
};

export function BookingBar({
  booking,
  startColumn,
  endColumn,
  rowIndex,
  onSelect,
}: {
  booking: CalendarBooking;
  startColumn: number;
  endColumn: number;
  rowIndex: number;
  onSelect: (booking: CalendarBooking) => void;
}) {
  const guestInitials = `${booking.guestFirstName[0] ?? ""}${booking.guestLastName[0] ?? ""}`.toUpperCase();

  const style: React.CSSProperties = {
    gridColumnStart: startColumn,
    gridColumnEnd: endColumn,
    gridRowStart: rowIndex + 1,
    gridRowEnd: rowIndex + 2,
  };

  const ariaLabel = `Booking ${booking.confirmationCode}, ${booking.guestFirstName} ${booking.guestLastName}, ${booking.checkInDate} to ${booking.checkOutDate}`;

  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={() => onSelect(booking)}
            aria-label={ariaLabel}
            className={cn(
              "m-0.5 flex items-center gap-1.5 overflow-hidden rounded-md px-2 py-1 text-left text-xs font-medium ring-1 transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
              STATUS_STYLES[booking.status],
            )}
            style={style}
          >
            <span className="flex size-5 shrink-0 items-center justify-center rounded bg-background/60 text-[10px] font-semibold tabular-nums">
              {guestInitials || "?"}
            </span>
            <span className="truncate">
              {booking.guestLastName} · {booking.confirmationCode}
            </span>
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" align="start">
          <div className="flex flex-col gap-1">
            <div className="font-medium">
              {booking.guestFirstName} {booking.guestLastName}
            </div>
            <div className="text-xs opacity-80">
              {STATUS_LABEL[booking.status]} · {booking.source}
            </div>
            <div className="text-xs opacity-80">
              {booking.checkInDate} → {booking.checkOutDate}
            </div>
            <div className="text-xs opacity-80">
              {booking.adults} adult{booking.adults === 1 ? "" : "s"}
              {booking.children > 0
                ? `, ${booking.children} child${booking.children === 1 ? "" : "ren"}`
                : ""}
            </div>
            <div className="text-xs opacity-80">{booking.confirmationCode}</div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}