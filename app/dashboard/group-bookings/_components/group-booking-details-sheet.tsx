"use client";

import * as React from "react";
import useSWR from "swr";
import { Loader2, UsersIcon, CalendarIcon, BadgeDollarSignIcon } from "lucide-react";
import { toast } from "sonner";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";

type GroupChildBooking = {
  id: string;
  confirmationCode: string;
  status: string;
  guestFirstName: string;
  guestLastName: string;
  guestEmail: string;
  roomNumber: string | null;
  roomTypeName: string | null;
  checkInDate: string;
  checkOutDate: string;
  totalAmount: string;
  createdAt: string;
};

type GroupBookingDetails = {
  id: string;
  groupName: string;
  groupType: string;
  groupCode: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string | null;
  contactCompany: string | null;
  roomsBlocked: number;
  roomsConfirmed: number;
  discountPercent: string;
  discountNotes: string | null;
  depositRequired: boolean;
  depositAmount: string | null;
  depositReceived: string;
  depositDueDate: string | null;
  depositReceivedAt: string | null;
  bookingCutoffDate: string | null;
  releaseDate: string | null;
  notes: string | null;
  internalNotes: string | null;
  arrivalInfo: string | null;
  departureInfo: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  childBookings: GroupChildBooking[];
};

type GroupBookingDetailsResponse = {
  data: GroupBookingDetails;
  success: boolean;
};

const fetcher = async (url: string) => {
  const res = await fetch(url, { credentials: "same-origin" });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error ?? "Failed to load group booking details");
  }
  return res.json() as Promise<GroupBookingDetailsResponse>;
};

const GROUP_TYPE_LABELS: Record<string, string> = {
  CORPORATE: "Corporate",
  WEDDING: "Wedding",
  TOUR: "Tour",
  SPORTS: "Sports",
  GOVERNMENT: "Government",
  OTHER: "Other",
};

const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  ACTIVE: "default",
  COMPLETED: "secondary",
  CANCELLED: "destructive",
  TENTATIVE: "outline",
  CONFIRMED: "default",
  CHECKED_IN: "default",
  CHECKED_OUT: "secondary",
};

export function GroupBookingDetailsSheet({
  groupId,
  open,
  onOpenChange,
  onSuccess,
}: {
  groupId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}) {
  const { data, error, isLoading, mutate } = useSWR<GroupBookingDetailsResponse>(
    open ? `/api/group-bookings/${groupId}` : null,
    fetcher,
    { revalidateOnFocus: false },
  );

  const details = data?.data;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="max-h-[100vh] overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <UsersIcon className="size-5" />
            Group Booking Details
          </SheetTitle>
          <SheetDescription>
            {details ? (
              <span className="font-mono">{details.groupCode}</span>
            ) : (
              "Loading..."
            )}
          </SheetDescription>
        </SheetHeader>

        {error ? (
          <div className="mt-4 rounded-md border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
            {(error as Error).message ?? "Failed to load details."}
          </div>
        ) : isLoading ? (
          <DetailsSkeleton />
        ) : details ? (
          <div className="mt-4 flex flex-col gap-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold">{details.groupName}</h3>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{GROUP_TYPE_LABELS[details.groupType]}</Badge>
                  <Badge variant={STATUS_VARIANT[details.status] ?? "outline"}>
                    {details.status}
                  </Badge>
                </div>
              </div>
            </div>

            <Separator />

            <div className="flex flex-col gap-3">
              <h4 className="text-sm font-semibold">Contact Information</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Name:</span>
                  <p className="font-medium">{details.contactName}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Email:</span>
                  <p className="font-medium">{details.contactEmail}</p>
                </div>
                {details.contactPhone && (
                  <div>
                    <span className="text-muted-foreground">Phone:</span>
                    <p className="font-medium">{details.contactPhone}</p>
                  </div>
                )}
                {details.contactCompany && (
                  <div>
                    <span className="text-muted-foreground">Company:</span>
                    <p className="font-medium">{details.contactCompany}</p>
                  </div>
                )}
              </div>
            </div>

            <Separator />

            <div className="flex flex-col gap-3">
              <h4 className="text-sm font-semibold">Reservation Details</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Rooms Blocked:</span>
                  <p className="font-medium">{details.roomsBlocked}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Rooms Confirmed:</span>
                  <p className="font-medium">{details.roomsConfirmed}</p>
                </div>
                {Number(details.discountPercent) > 0 && (
                  <div>
                    <span className="text-muted-foreground">Discount:</span>
                    <p className="flex items-center gap-1 font-medium">
                      <BadgeDollarSignIcon className="size-3" />
                      {details.discountPercent}%
                    </p>
                  </div>
                )}
                {details.bookingCutoffDate && (
                  <div>
                    <span className="text-muted-foreground">Booking Cutoff:</span>
                    <p className="flex items-center gap-1 font-medium">
                      <CalendarIcon className="size-3" />
                      {details.bookingCutoffDate}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {details.depositRequired && (
              <>
                <Separator />
                <div className="flex flex-col gap-3">
                  <h4 className="text-sm font-semibold">Deposit</h4>
                  <div className="rounded-lg border p-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Required:</span>
                      <span className="font-medium">
                        ${Number(details.depositAmount ?? 0).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Received:</span>
                      <span className="font-medium text-green-600">
                        ${Number(details.depositReceived).toFixed(2)}
                      </span>
                    </div>
                    <Separator className="my-2" />
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Balance:</span>
                      <span
                        className={`font-medium ${
                          Number(details.depositAmount ?? 0) - Number(details.depositReceived) > 0
                            ? "text-destructive"
                            : "text-green-600"
                        }`}
                      >
                        $
                        {(
                          Number(details.depositAmount ?? 0) - Number(details.depositReceived)
                        ).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              </>
            )}

            {details.childBookings.length > 0 && (
              <>
                <Separator />
                <div className="flex flex-col gap-3">
                  <h4 className="text-sm font-semibold">
                    Bookings ({details.childBookings.length})
                  </h4>
                  <div className="flex flex-col gap-2">
                    {details.childBookings.map((booking) => (
                      <div
                        key={booking.id}
                        className="flex items-center justify-between rounded-lg border p-2 text-sm"
                      >
                        <div className="flex flex-col">
                          <span className="font-medium">
                            {booking.guestFirstName} {booking.guestLastName}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {booking.confirmationCode}
                            {booking.roomNumber && ` • Room ${booking.roomNumber}`}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={STATUS_VARIANT[booking.status] ?? "outline"}
                            className="text-xs"
                          >
                            {booking.status}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            ${Number(booking.totalAmount).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {details.notes && (
              <>
                <Separator />
                <div className="flex flex-col gap-2">
                  <h4 className="text-sm font-semibold">Notes</h4>
                  <p className="text-sm text-muted-foreground">{details.notes}</p>
                </div>
              </>
            )}

            <Separator />

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" disabled>
                Edit
              </Button>
              <Button variant="outline" className="flex-1" disabled>
                Add Booking
              </Button>
            </div>
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

function DetailsSkeleton() {
  return (
    <div className="mt-4 flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-24" />
      </div>
      <Separator />
      <div className="flex flex-col gap-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-4 w-36" />
      </div>
      <Separator />
      <div className="flex flex-col gap-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-4 w-24" />
      </div>
    </div>
  );
}
