"use client";

import * as React from "react";
import useSWR from "swr";
import { CalendarRangeIcon } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { CalendarToolbar, type CalendarFilters } from "./calendar-toolbar";
import { CalendarGrid } from "./calendar-grid";
import { BookingDetailsSheet } from "./booking-details-sheet";
import { KpiStrip } from "./kpi-strip";
import { NewBookingDialog, type NewBookingSlot } from "./new-booking-dialog";
import type {
  CalendarBooking,
  CalendarData,
  GetCalendarDataResponse,
} from "@/app/actions/calendar";

const fetcher = async (url: string) => {
  const res = await fetch(url, { credentials: "same-origin" });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as {
      error?: string;
    };
    throw new Error(body.error ?? "Failed to load calendar");
  }
  return (await res.json()) as GetCalendarDataResponse;
};

function buildKey(
  fromIso: string,
  filters: CalendarFilters,
): { path: string; key: [string, string, string, string] } {
  const params = new URLSearchParams();
  params.set("from", fromIso);
  if (filters.roomTypeId !== "ALL") {
    params.set("roomTypeId", filters.roomTypeId);
  }
  if (filters.floor !== "ALL") {
    params.set("floor", filters.floor);
  }
  const qs = params.toString();
  return {
    path: `/api/calendar?${qs}`,
    key: ["/api/calendar", fromIso, filters.roomTypeId, filters.floor],
  };
}

function toIsoDate(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function CalendarView() {
  const [fromIso, setFromIso] = React.useState<string>(() => toIsoDate(new Date()));
  const [filters, setFilters] = React.useState<CalendarFilters>({
    roomTypeId: "ALL",
    floor: "ALL",
  });

  const [selectedBooking, setSelectedBooking] =
    React.useState<CalendarBooking | null>(null);
  const [sheetOpen, setSheetOpen] = React.useState(false);

  const [newBookingSlot, setNewBookingSlot] =
    React.useState<NewBookingSlot | null>(null);
  const [dialogOpen, setDialogOpen] = React.useState(false);

  const { path, key } = React.useMemo(() => buildKey(fromIso, filters), [
    fromIso,
    filters,
  ]);

  const { data, error, isLoading, isValidating, mutate } = useSWR<
    GetCalendarDataResponse,
    Error
  >(key, () => fetcher(path), {
    keepPreviousData: true,
    revalidateOnFocus: false,
  });

  const calendar: CalendarData | null =
    data?.success && data.data ? data.data : null;

  const handleRefresh = React.useCallback(() => {
    void mutate();
  }, [mutate]);

  const handleSelectBooking = React.useCallback((booking: CalendarBooking) => {
    setSelectedBooking(booking);
    setSheetOpen(true);
  }, []);

  const handleCreateBooking = React.useCallback((slot: NewBookingSlot) => {
    setNewBookingSlot(slot);
    setDialogOpen(true);
  }, []);

  const handleDialogChange = React.useCallback((open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      setNewBookingSlot(null);
    }
  }, []);

  return (
    <>
      <Card className="mx-4 lg:mx-6">
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0">
          <div className="flex flex-col gap-1">
            <CardTitle className="flex items-center gap-2 text-lg">
              <CalendarRangeIcon className="size-5" />
              Booking Calendar
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Visual grid of every room with bookings, current occupancy, and
              status at a glance.
            </p>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <CalendarToolbar
            fromIso={fromIso}
            weekEndIso={addDays(fromIso, 6)}
            filters={filters}
            roomTypes={calendar?.roomTypes ?? []}
            floors={calendar?.floors ?? []}
            onChangeFrom={setFromIso}
            onChangeFilters={setFilters}
            onRefresh={handleRefresh}
            refreshing={isValidating}
          />

          <KpiStrip
            summary={calendar?.summary ?? null}
            loading={isLoading && !calendar}
          />

          <LegendStrip />

          {error ? (
            <div className="rounded-md border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
              {(error as Error).message ?? "Failed to load calendar."}
            </div>
          ) : isLoading && !calendar ? (
            <GridSkeleton />
          ) : calendar ? (
            <CalendarGrid
              fromIso={calendar.from}
              rooms={calendar.rooms}
              bookings={calendar.bookings}
              selectedSlot={newBookingSlot}
              onSelectBooking={handleSelectBooking}
              onCreateBooking={handleCreateBooking}
            />
          ) : null}
        </CardContent>
      </Card>

      <BookingDetailsSheet
        booking={selectedBooking}
        roomNumber={
          selectedBooking && calendar
            ? calendar.rooms.find((room) => room.id === selectedBooking.roomId)
                ?.number ?? null
            : null
        }
        roomTypeName={
          selectedBooking && calendar
            ? calendar.rooms.find((room) => room.id === selectedBooking.roomId)
                ?.roomType.name ?? null
            : null
        }
        open={sheetOpen}
        onOpenChange={setSheetOpen}
      />

      <NewBookingDialog
        open={dialogOpen}
        onOpenChange={handleDialogChange}
        slot={newBookingSlot}
        rooms={calendar?.rooms ?? []}
        onSuccess={() => {
          handleRefresh();
        }}
      />
    </>
  );
}

function LegendStrip() {
  const items: Array<{ label: string; className: string }> = [
    {
      label: "Tentative",
      className: "bg-amber-500/30 ring-amber-500/40",
    },
    {
      label: "Confirmed",
      className: "bg-blue-500/30 ring-blue-500/40",
    },
    {
      label: "Checked in",
      className: "bg-emerald-500/30 ring-emerald-500/40",
    },
    {
      label: "Checked out",
      className: "bg-slate-500/30 ring-slate-500/40",
    },
  ];
  return (
    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
      <span className="font-medium uppercase tracking-wide">Legend</span>
      <Separator orientation="vertical" className="h-4" />
      {items.map((item) => (
        <span key={item.label} className="flex items-center gap-1.5">
          <span
            className={`inline-block size-3 rounded ring-1 ${item.className}`}
            aria-hidden
          />
          {item.label}
        </span>
      ))}
    </div>
  );
}

function GridSkeleton() {
  return (
    <div className="space-y-2 rounded-lg border bg-card p-3">
      <Skeleton className="h-9 w-full" />
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-16 w-full" />
    </div>
  );
}

function addDays(iso: string, days: number): string {
  const date = new Date(`${iso}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return toIsoDate(date);
}