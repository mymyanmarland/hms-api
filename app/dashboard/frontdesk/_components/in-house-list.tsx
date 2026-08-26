"use client";

import * as React from "react";
import useSWR from "swr";
import {
  UsersIcon,
  KeyIcon,
  PhoneIcon,
  MailIcon,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";

type InHouseBooking = {
  id: string;
  confirmationCode: string;
  status: "TENTATIVE" | "CONFIRMED" | "CHECKED_IN" | "CHECKED_OUT" | "CANCELLED" | "NO_SHOW";
  guestFirstName: string;
  guestLastName: string;
  guestEmail: string;
  guestPhone: string | null;
  adults: number;
  children: number;
  checkInDate: string;
  checkOutDate: string;
  roomId: string | null;
  roomNumber: string | null;
  roomTypeName: string | null;
  actualCheckIn: string | null;
};

type InHouseListResponse = {
  data: {
    inHouse: InHouseBooking[];
  };
  success: boolean;
  error?: string;
};

const fetcher = async (url: string) => {
  const res = await fetch(url, { credentials: "same-origin" });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error ?? "Failed to load in-house guests");
  }
  return res.json() as Promise<InHouseListResponse>;
};

export function InHouseList() {
  const { data, error, isLoading, mutate, isValidating } = useSWR<InHouseListResponse>(
    "/api/checkin?status=CHECKED_IN&intent=list",
    fetcher,
    {
      revalidateOnFocus: false,
      refreshInterval: 60000,
    },
  );

  const inHouse = data?.data?.inHouse ?? [];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="flex items-center gap-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <UsersIcon className="size-5" />
            In-House Guests
          </CardTitle>
          <Badge variant="secondary">{inHouse.length}</Badge>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => void mutate()}
          disabled={isValidating}
        >
          Refresh
        </Button>
      </CardHeader>
      <CardContent>
        {error ? (
          <div className="rounded-md border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
            {(error as Error).message ?? "Failed to load in-house guests."}
          </div>
        ) : isLoading ? (
          <InHouseListSkeleton />
        ) : inHouse.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="flex flex-col gap-3">
            {inHouse.map((booking) => (
              <InHouseCard key={booking.id} booking={booking} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function InHouseCard({ booking }: { booking: InHouseBooking }) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <Badge variant="default">In House</Badge>
          </div>
          <h3 className="font-semibold">
            {booking.guestFirstName} {booking.guestLastName}
          </h3>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <MailIcon className="size-3" />
              {booking.guestEmail}
            </span>
            {booking.guestPhone && (
              <span className="flex items-center gap-1">
                <PhoneIcon className="size-3" />
                {booking.guestPhone}
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className="font-mono text-sm text-muted-foreground">
            {booking.confirmationCode}
          </span>
          {booking.roomNumber && (
            <Badge variant="secondary">
              <KeyIcon className="size-3 mr-1" />
              Room {booking.roomNumber}
            </Badge>
          )}
          {booking.roomTypeName && (
            <span className="text-sm text-muted-foreground">
              {booking.roomTypeName}
            </span>
          )}
        </div>
      </div>

      <Separator />

      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-4 text-muted-foreground">
          <span>
            Checked in: {booking.actualCheckIn ?? booking.checkInDate}
          </span>
          <span>Departure: {booking.checkOutDate}</span>
        </div>
        <span>
          {booking.adults} adult{booking.adults !== 1 ? "s" : ""}
          {booking.children > 0 && `, ${booking.children} child${booking.children !== 1 ? "ren" : ""}`}
        </span>
      </div>
    </div>
  );
}

function InHouseListSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: 3 }).map((_, index) => (
        <div key={index} className="flex flex-col gap-3 rounded-lg border p-4">
          <div className="flex items-start justify-between">
            <div className="flex flex-col gap-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-64" />
            </div>
            <div className="flex flex-col items-end gap-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-5 w-16" />
            </div>
          </div>
          <Skeleton className="h-8 w-full" />
        </div>
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed py-8 text-center">
      <UsersIcon className="size-8 text-muted-foreground" />
      <p className="text-sm text-muted-foreground">No guests currently in house</p>
    </div>
  );
}
