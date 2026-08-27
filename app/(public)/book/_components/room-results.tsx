"use client";

import * as React from "react";
import {
  BedDouble,
  CheckCircle2,
  ChevronRight,
  UsersRound,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatBookingAmount } from "@/lib/booking";
import { useBookingWidget } from "./booking-context";

function formatAmenities(amenities: string[]): string[] {
  return amenities.slice(0, 4);
}

export function RoomResults() {
  const { availability, setAvailability, isSearching, setSelectedRoomType, setDialogOpen, search } =
    useBookingWidget();

  if (isSearching) {
    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <RoomCardSkeleton />
        <RoomCardSkeleton />
      </div>
    );
  }

  if (availability === null) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 p-8 text-center text-sm text-slate-500">
        Search for your stay dates to see available rooms.
      </div>
    );
  }

  if (availability.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
        <h3 className="text-base font-semibold text-slate-800">
          No rooms available for those dates
        </h3>
        <p className="mt-1 text-sm text-slate-500">
          Try shifting your check-in or check-out by a day or two, or
          call our front desk for help with special requests.
        </p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => setAvailability(null)}
        >
          Adjust dates
        </Button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {availability.map((roomType) => {
        const totalFormatted = formatBookingAmount(roomType.totalForStay);
        const nightlyFormatted = formatBookingAmount(roomType.basePrice);
        const amenities = formatAmenities(roomType.amenities);

        return (
          <Card
            key={roomType.roomTypeId}
            className="overflow-hidden border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md"
          >
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <h3 className="text-lg font-semibold text-slate-900">
                    {roomType.name}
                  </h3>
                  {roomType.bedConfig ? (
                    <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">
                      {roomType.bedConfig}
                    </p>
                  ) : null}
                </div>
                <Badge
                  variant="secondary"
                  className="bg-emerald-50 text-emerald-700"
                >
                  <CheckCircle2 className="mr-1 h-3 w-3" />
                  {roomType.availableRooms}{" "}
                  {roomType.availableRooms === 1 ? "room" : "rooms"} left
                </Badge>
              </div>

              {roomType.description ? (
                <p className="mt-2 text-sm text-slate-600">
                  {roomType.description}
                </p>
              ) : null}

              {amenities.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {amenities.map((amenity) => (
                    <span
                      key={amenity}
                      className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-medium text-slate-600"
                    >
                      {amenity}
                    </span>
                  ))}
                </div>
              ) : null}

              <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                <span className="inline-flex items-center gap-1">
                  <BedDouble className="h-3.5 w-3.5" />
                  Sleeps up to {roomType.maxOccupancy}
                </span>
                <span className="inline-flex items-center gap-1">
                  <UsersRound className="h-3.5 w-3.5" />
                  {roomType.nights}{" "}
                  {roomType.nights === 1 ? "night" : "nights"}
                </span>
              </div>

              <div className="mt-5 flex items-end justify-between gap-4 border-t border-slate-100 pt-4">
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
                    From
                  </p>
                  <p className="text-2xl font-semibold tabular-nums text-slate-900">
                    {nightlyFormatted}
                    <span className="text-sm font-medium text-slate-500">
                      {" "}
                      / night
                    </span>
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {totalFormatted} for {roomType.nights}{" "}
                    {roomType.nights === 1 ? "night" : "nights"}
                  </p>
                </div>
                <Button
                  type="button"
                  onClick={() => {
                    setSelectedRoomType(roomType);
                    setDialogOpen(true);
                  }}
                  className="h-10 rounded-lg bg-gradient-to-b from-blue-500 via-blue-600 to-blue-700 px-5 text-sm font-semibold text-white shadow-md shadow-blue-500/20 hover:from-blue-400 hover:via-blue-500 hover:to-blue-600"
                  aria-label={`Reserve ${roomType.name} for ${search.checkIn} to ${search.checkOut}`}
                >
                  Reserve
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
              {roomType.suggestedRoomNumber ? (
                <p className="mt-2 text-[11px] text-slate-400">
                  Room {roomType.suggestedRoomNumber} suggested for your stay
                  (or similar).
                </p>
              ) : null}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function RoomCardSkeleton() {
  return (
    <Card className="overflow-hidden border-slate-200 bg-white shadow-sm">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="h-6 w-24" />
        </div>
        <Skeleton className="mt-3 h-4 w-full" />
        <Skeleton className="mt-2 h-4 w-3/4" />
        <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
          <div className="space-y-1.5">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-7 w-24" />
            <Skeleton className="h-3 w-32" />
          </div>
          <Skeleton className="h-10 w-24" />
        </div>
      </CardContent>
    </Card>
  );
}
