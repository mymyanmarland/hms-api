"use client";

import * as React from "react";
import useSWR from "swr";
import {
  PlaneTakeoffIcon,
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
import { CheckOutDialog } from "./check-out-dialog";

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
  roomId: string | null;
  roomNumber: string | null;
  roomTypeName: string | null;
  actualCheckIn: string | null;
  folioBalance: string;
  folioId: string | null;
};

type DeparturesListResponse = {
  data: {
    departures: DepartureBooking[];
    date: string;
  };
  success: boolean;
  error?: string;
};

const fetcher = async (url: string) => {
  const res = await fetch(url, { credentials: "same-origin" });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error ?? "Failed to load departures");
  }
  return res.json() as Promise<DeparturesListResponse>;
};

export function DeparturesList({ date }: { date: string }) {
  const [checkOutBooking, setCheckOutBooking] = React.useState<DepartureBooking | null>(null);

  const { data, error, isLoading, mutate, isValidating } = useSWR<DeparturesListResponse>(
    `/api/checkout?date=${date}&intent=list`,
    fetcher,
    {
      revalidateOnFocus: false,
      refreshInterval: 30000,
    },
  );

  const departures = data?.data?.departures ?? [];

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div className="flex items-center gap-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <PlaneTakeoffIcon className="size-5" />
              Departures
            </CardTitle>
            <Badge variant="secondary">{departures.length}</Badge>
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
              {(error as Error).message ?? "Failed to load departures."}
            </div>
          ) : isLoading ? (
            <DeparturesListSkeleton />
          ) : departures.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="flex flex-col gap-3">
              {departures.map((departure) => (
                <DepartureCard
                  key={departure.id}
                  departure={departure}
                  onCheckOut={() => setCheckOutBooking(departure)}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

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

function DepartureCard({
  departure,
  onCheckOut,
}: {
  departure: DepartureBooking;
  onCheckOut: () => void;
}) {
  const hasBalance = Number(departure.folioBalance) > 0;

  return (
    <div className="flex flex-col gap-3 rounded-lg border p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <Badge variant="secondary">Departing</Badge>
            {hasBalance && (
              <Badge variant="destructive">Balance: ${Number(departure.folioBalance).toFixed(2)}</Badge>
            )}
          </div>
          <h3 className="font-semibold">
            {departure.guestFirstName} {departure.guestLastName}
          </h3>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <MailIcon className="size-3" />
              {departure.guestEmail}
            </span>
            {departure.guestPhone && (
              <span className="flex items-center gap-1">
                <PhoneIcon className="size-3" />
                {departure.guestPhone}
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className="font-mono text-sm text-muted-foreground">
            {departure.confirmationCode}
          </span>
          {departure.roomNumber && (
            <Badge variant="outline">
              <KeyIcon className="size-3 mr-1" />
              Room {departure.roomNumber}
            </Badge>
          )}
          {departure.roomTypeName && (
            <span className="text-sm text-muted-foreground">
              {departure.roomTypeName}
            </span>
          )}
        </div>
      </div>

      <Separator />

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 text-sm">
          <span className="text-muted-foreground">
            Stayed {departure.checkInDate} - {departure.checkOutDate}
          </span>
        </div>
        <Button size="sm" onClick={onCheckOut}>
          Process Check-Out
        </Button>
      </div>
    </div>
  );
}

function DeparturesListSkeleton() {
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
      <PlaneTakeoffIcon className="size-8 text-muted-foreground" />
      <p className="text-sm text-muted-foreground">No departures for this date</p>
    </div>
  );
}
