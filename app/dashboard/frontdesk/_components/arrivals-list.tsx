"use client";

import * as React from "react";
import useSWR from "swr";
import {
  PlaneLandingIcon,
  UserIcon,
  PhoneIcon,
  MailIcon,
  CalendarIcon,
  KeyIcon,
  CreditCardIcon,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { CheckInDialog } from "./check-in-dialog";
import { CheckOutDialog } from "./check-out-dialog";

type ArrivalBooking = {
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
  specialRequests: string | null;
  roomId: string | null;
  roomNumber: string | null;
  roomTypeName: string | null;
  actualCheckIn: string | null;
  folioBalance: string;
  folioId: string | null;
};

type DepartureBooking = {
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
  specialRequests: string | null;
  roomId: string | null;
  roomNumber: string | null;
  roomTypeName: string | null;
  actualCheckIn: string | null;
  folioBalance: string;
  folioId: string | null;
};

type ArrivalsListResponse = {
  data: {
    arrivals: ArrivalBooking[];
    date: string;
  };
  success: boolean;
  error?: string;
};

const fetcher = async (url: string) => {
  const res = await fetch(url, { credentials: "same-origin" });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error ?? "Failed to load arrivals");
  }
  return res.json() as Promise<ArrivalsListResponse>;
};

const STATUS_VARIANT: Record<ArrivalBooking["status"], "default" | "secondary" | "outline" | "destructive"> = {
  TENTATIVE: "outline",
  CONFIRMED: "default",
  CHECKED_IN: "default",
  CHECKED_OUT: "secondary",
  CANCELLED: "outline",
  NO_SHOW: "destructive",
};

const STATUS_LABEL: Record<ArrivalBooking["status"], string> = {
  TENTATIVE: "Tentative",
  CONFIRMED: "Confirmed",
  CHECKED_IN: "Checked In",
  CHECKED_OUT: "Checked Out",
  CANCELLED: "Cancelled",
  NO_SHOW: "No Show",
};

export function ArrivalsList({ date }: { date: string }) {
  const [checkInBooking, setCheckInBooking] = React.useState<ArrivalBooking | null>(null);
  const [checkOutBooking, setCheckOutBooking] = React.useState<DepartureBooking | null>(null);

  const { data, error, isLoading, mutate, isValidating } = useSWR<ArrivalsListResponse>(
    `/api/checkin?date=${date}&intent=list`,
    fetcher,
    {
      revalidateOnFocus: false,
      refreshInterval: 30000,
    },
  );

  const arrivals = data?.data?.arrivals ?? [];
  const arrivalsCount = arrivals.filter((a) => a.status !== "CHECKED_IN").length;
  const checkedInCount = arrivals.filter((a) => a.status === "CHECKED_IN").length;

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div className="flex items-center gap-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <PlaneLandingIcon className="size-5" />
              Arrivals
            </CardTitle>
            <Badge variant="secondary">{arrivals.length}</Badge>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline">{arrivalsCount} pending</Badge>
            <Badge variant="default">{checkedInCount} checked in</Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void mutate()}
              disabled={isValidating}
            >
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {error ? (
            <div className="rounded-md border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
              {(error as Error).message ?? "Failed to load arrivals."}
            </div>
          ) : isLoading ? (
            <ArrivalsListSkeleton />
          ) : arrivals.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="flex flex-col gap-3">
              {arrivals.map((arrival) => (
                <ArrivalCard
                  key={arrival.id}
                  arrival={arrival}
                  onCheckIn={() => setCheckInBooking(arrival)}
                  onCheckOut={() => setCheckOutBooking(arrival)}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {checkInBooking && (
        <CheckInDialog
          booking={checkInBooking}
          open={!!checkInBooking}
          onOpenChange={(open) => {
            if (!open) setCheckInBooking(null);
          }}
          onSuccess={() => {
            toast.success("Check-in completed successfully");
            void mutate();
            setCheckInBooking(null);
          }}
        />
      )}

      {checkOutBooking && (
        <CheckOutDialog
          booking={checkOutBooking}
          open={!!checkOutBooking}
          onOpenChange={(open) => {
            if (!open) setCheckOutBooking(null);
          }}
          onSuccess={() => {
            toast.success("Check-out completed successfully");
            void mutate();
            setCheckOutBooking(null);
          }}
        />
      )}
    </>
  );
}

function ArrivalCard({
  arrival,
  onCheckIn,
  onCheckOut,
}: {
  arrival: ArrivalBooking;
  onCheckIn: () => void;
  onCheckOut: () => void;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <Badge variant={STATUS_VARIANT[arrival.status]}>
              {STATUS_LABEL[arrival.status]}
            </Badge>
            <Badge variant="outline">{arrival.source}</Badge>
          </div>
          <h3 className="font-semibold">
            {arrival.guestFirstName} {arrival.guestLastName}
          </h3>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <MailIcon className="size-3" />
              {arrival.guestEmail}
            </span>
            {arrival.guestPhone && (
              <span className="flex items-center gap-1">
                <PhoneIcon className="size-3" />
                {arrival.guestPhone}
              </span>
            )}
            <span className="flex items-center gap-1">
              <CalendarIcon className="size-3" />
              {arrival.checkInDate} - {arrival.checkOutDate}
            </span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className="font-mono text-sm text-muted-foreground">
            {arrival.confirmationCode}
          </span>
          {arrival.roomNumber && (
            <Badge variant="secondary">
              <KeyIcon className="size-3 mr-1" />
              Room {arrival.roomNumber}
            </Badge>
          )}
          {arrival.roomTypeName && (
            <span className="text-sm text-muted-foreground">
              {arrival.roomTypeName}
            </span>
          )}
        </div>
      </div>

      <Separator />

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 text-sm">
          <span className="text-muted-foreground">
            {arrival.adults} adult{arrival.adults !== 1 ? "s" : ""}
            {arrival.children > 0 && `, ${arrival.children} child${arrival.children !== 1 ? "ren" : ""}`}
          </span>
          <span className="font-medium">
            ${Number(arrival.totalAmount).toFixed(2)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {arrival.status === "CHECKED_IN" ? (
            <Button size="sm" onClick={onCheckOut}>
              Check Out
            </Button>
          ) : arrival.status === "CONFIRMED" || arrival.status === "TENTATIVE" ? (
            <Button size="sm" onClick={onCheckIn} disabled={!arrival.roomId && !arrival.roomNumber}>
              Check In
            </Button>
          ) : null}
        </div>
      </div>

      {arrival.specialRequests && (
        <div className="rounded-md bg-muted/40 p-2 text-xs text-muted-foreground">
          {arrival.specialRequests}
        </div>
      )}
    </div>
  );
}

function ArrivalsListSkeleton() {
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
      <UserIcon className="size-8 text-muted-foreground" />
      <p className="text-sm text-muted-foreground">No arrivals for this date</p>
    </div>
  );
}
