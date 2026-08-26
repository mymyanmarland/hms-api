"use client";

import * as React from "react";
import useSWR from "swr";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2, KeyIcon, ShieldCheckIcon, FileCheckIcon } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { performCheckInSchema, type PerformCheckInInput } from "@/lib/validations/checkin";

type ArrivalBooking = {
  id: string;
  confirmationCode: string;
  status: string;
  source: string;
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
};

type CheckInDetails = {
  booking: {
    id: string;
    confirmationCode: string;
    status: string;
    source: string;
    guestFirstName: string;
    guestLastName: string;
    guestEmail: string;
    guestPhone: string | null;
    adults: number;
    children: number;
    infants: number;
    checkInDate: string;
    checkOutDate: string;
    totalAmount: string;
    specialRequests: string | null;
    internalNotes: string | null;
  };
  guest: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string | null;
    nationality: string | null;
    idType: string | null;
    idNumber: string | null;
    isVip: boolean;
  } | null;
  room: {
    id: string;
    number: string;
    floor: number;
    status: string;
    roomType: {
      id: string;
      name: string;
      basePrice: string;
      maxOccupancy: number;
    };
  } | null;
  folio: {
    id: string;
    folioNumber: string;
    balance: string;
  } | null;
  existingCheckIn: {
    id: string;
    checkedInAt: string;
    keyCardNumber: string | null;
  } | null;
};

type AvailableRoom = {
  id: string;
  number: string;
  floor: number;
  status: string;
  roomType: {
    id: string;
    name: string;
    basePrice: string;
    maxOccupancy: number;
  };
};

type CheckInDetailsResponse = {
  data: CheckInDetails;
  success: boolean;
};

type AvailableRoomsResponse = {
  data: AvailableRoom[];
  success: boolean;
};

const fetcher = async (url: string) => {
  const res = await fetch(url, { credentials: "same-origin" });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error ?? "Failed to load check-in details");
  }
  return res.json() as Promise<CheckInDetailsResponse>;
};

const roomsFetcher = async (url: string) => {
  const res = await fetch(url, { credentials: "same-origin" });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error ?? "Failed to load available rooms");
  }
  return res.json() as Promise<AvailableRoomsResponse>;
};

export function CheckInDialog({
  booking,
  open,
  onOpenChange,
  onSuccess,
}: {
  booking: ArrivalBooking;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}) {
  const innerKey = open ? "open" : "closed";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        {open ? (
          <CheckInFormBody
            key={innerKey}
            booking={booking}
            onOpenChange={onOpenChange}
            onSuccess={onSuccess}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function CheckInFormBody({
  booking,
  onOpenChange,
  onSuccess,
}: {
  booking: ArrivalBooking;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}) {
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [isPending, startTransition] = React.useTransition();

  const { data: detailsData, isLoading: loadingDetails } = useSWR<CheckInDetailsResponse>(
    `/api/checkin?intent=details&bookingId=${booking.id}`,
    fetcher,
    { revalidateOnFocus: false },
  );

  const details = detailsData?.data;

  const { data: roomsData, isLoading: loadingRooms } = useSWR<AvailableRoomsResponse>(
    details
      ? `/api/checkin?intent=available-rooms&checkInDate=${details.booking.checkInDate}&checkOutDate=${details.booking.checkOutDate}`
      : null,
    roomsFetcher,
    { revalidateOnFocus: false },
  );

  const availableRooms = roomsData?.data ?? [];

  const form = useForm<PerformCheckInInput>({
    resolver: zodResolver(performCheckInSchema),
    defaultValues: {
      bookingId: booking.id,
      roomId: booking.roomId ?? "",
      generateDigitalKey: true,
      keyAccessLevel: "GUEST",
      keyValidHours: 72,
      idVerified: false,
      idDocumentType: undefined,
      idDocumentNumber: undefined,
      policiesAccepted: false,
      privacyAccepted: false,
      notes: undefined,
    },
  });

  const onSubmit = form.handleSubmit((formData) => {
    setServerError(null);
    startTransition(async () => {
      const response = await fetch("/api/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (result.success) {
        toast.success("Check-in completed successfully");
        form.reset();
        onOpenChange(false);
        onSuccess?.();
      } else if (result.fieldErrors) {
        for (const [key, messages] of Object.entries(result.fieldErrors)) {
          if (messages?.[0]) {
            form.setError(key as keyof PerformCheckInInput, {
              message: messages[0],
            });
          }
        }
        if (result.error) setServerError(result.error);
      } else if (result.error) {
        setServerError(result.error);
      }
    });
  });

  if (loadingDetails) {
    return (
      <div className="flex flex-col gap-4">
        <DialogHeader>
          <DialogTitle>Loading...</DialogTitle>
        </DialogHeader>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (!details) {
    return (
      <div className="flex flex-col gap-4">
        <DialogHeader>
          <DialogTitle>Error loading details</DialogTitle>
          <DialogDescription>Unable to load check-in details.</DialogDescription>
        </DialogHeader>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <KeyIcon className="size-5" />
          Check-In
        </DialogTitle>
        <DialogDescription>
          Confirmation: <span className="font-mono">{details.booking.confirmationCode}</span>
        </DialogDescription>
      </DialogHeader>

      {serverError && (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
          {serverError}
        </div>
      )}

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="font-semibold">
            {details.booking.guestFirstName} {details.booking.guestLastName}
          </span>
          {details.guest?.isVip && <Badge variant="default">VIP</Badge>}
        </div>
        <div className="text-sm text-muted-foreground">
          <p>Check-in: {details.booking.checkInDate}</p>
          <p>Check-out: {details.booking.checkOutDate}</p>
          <p>
            {details.booking.adults} adult{details.booking.adults !== 1 ? "s" : ""}
            {details.booking.children > 0 &&
              `, ${details.booking.children} child${details.booking.children !== 1 ? "ren" : ""}`}
          </p>
        </div>
        {details.guest && (
          <div className="flex items-center gap-2 text-sm">
            <Badge variant="outline">{details.guest.idType ?? "No ID"}</Badge>
            {details.guest.idNumber && (
              <span className="font-mono text-muted-foreground">
                {details.guest.idNumber}
              </span>
            )}
          </div>
        )}
      </div>

      <Separator />

      <div className="flex flex-col gap-2">
        <Label htmlFor="roomId">Room Assignment *</Label>
        {loadingRooms ? (
          <Skeleton className="h-10 w-full" />
        ) : (
          <Select
            onValueChange={(value) => form.setValue("roomId", value)}
            defaultValue={details.room?.id ?? booking.roomId ?? ""}
          >
            <SelectTrigger id="roomId">
              <SelectValue placeholder="Select a room" />
            </SelectTrigger>
            <SelectContent>
              {availableRooms.map((room) => (
                <SelectItem key={room.id} value={room.id}>
                  Room {room.number} - {room.roomType.name} (Floor {room.floor})
                </SelectItem>
              ))}
              {availableRooms.length === 0 && (
                <div className="p-2 text-sm text-muted-foreground">
                  No available rooms
                </div>
              )}
            </SelectContent>
          </Select>
        )}
        {form.formState.errors.roomId && (
          <p className="text-xs text-destructive">
            {form.formState.errors.roomId.message}
          </p>
        )}
      </div>

      <Separator />

      <div className="flex flex-col gap-3">
        <h4 className="flex items-center gap-2 text-sm font-semibold">
          <KeyIcon className="size-4" />
          Digital Key
        </h4>
        <div className="flex items-center gap-2">
          <Checkbox
            id="generateDigitalKey"
            checked={form.watch("generateDigitalKey")}
            onCheckedChange={(checked) =>
              form.setValue("generateDigitalKey", checked as boolean)
            }
          />
          <Label htmlFor="generateDigitalKey" className="font-normal">
            Generate digital key
          </Label>
        </div>
        {form.watch("generateDigitalKey") && (
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="keyAccessLevel">Access Level</Label>
              <Select
                onValueChange={(value) =>
                  form.setValue("keyAccessLevel", value as "GUEST" | "STAFF" | "EMERGENCY")
                }
                defaultValue="GUEST"
              >
                <SelectTrigger id="keyAccessLevel">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="GUEST">Guest</SelectItem>
                  <SelectItem value="STAFF">Staff</SelectItem>
                  <SelectItem value="EMERGENCY">Emergency</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="keyValidHours">Valid Hours</Label>
              <Select
                onValueChange={(value) =>
                  form.setValue("keyValidHours", Number(value))
                }
                defaultValue="72"
              >
                <SelectTrigger id="keyValidHours">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="24">24 hours</SelectItem>
                  <SelectItem value="48">48 hours</SelectItem>
                  <SelectItem value="72">72 hours</SelectItem>
                  <SelectItem value="120">5 days</SelectItem>
                  <SelectItem value="168">7 days</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
      </div>

      <Separator />

      <div className="flex flex-col gap-3">
        <h4 className="flex items-center gap-2 text-sm font-semibold">
          <ShieldCheckIcon className="size-4" />
          ID Verification
        </h4>
        <div className="flex items-center gap-2">
          <Checkbox
            id="idVerified"
            checked={form.watch("idVerified")}
            onCheckedChange={(checked) =>
              form.setValue("idVerified", checked as boolean)
            }
          />
          <Label htmlFor="idVerified" className="font-normal">
            ID has been verified
          </Label>
        </div>
        {form.watch("idVerified") && (
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="idDocumentType">Document Type</Label>
              <Select
                onValueChange={(value) =>
                  form.setValue("idDocumentType", value)
                }
              >
                <SelectTrigger id="idDocumentType">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Passport">Passport</SelectItem>
                  <SelectItem value="Driver License">Driver License</SelectItem>
                  <SelectItem value="National ID">National ID</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="idDocumentNumber">Document Number</Label>
              <input
                id="idDocumentNumber"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                {...form.register("idDocumentNumber")}
              />
            </div>
          </div>
        )}
      </div>

      <Separator />

      <div className="flex flex-col gap-3">
        <h4 className="flex items-center gap-2 text-sm font-semibold">
          <FileCheckIcon className="size-4" />
          Acknowledgments
        </h4>
        <div className="flex items-center gap-2">
          <Checkbox
            id="policiesAccepted"
            checked={form.watch("policiesAccepted")}
            onCheckedChange={(checked) =>
              form.setValue("policiesAccepted", checked as boolean)
            }
          />
          <Label htmlFor="policiesAccepted" className="font-normal text-sm">
            Guest has accepted hotel policies
          </Label>
        </div>
        <div className="flex items-center gap-2">
          <Checkbox
            id="privacyAccepted"
            checked={form.watch("privacyAccepted")}
            onCheckedChange={(checked) =>
              form.setValue("privacyAccepted", checked as boolean)
            }
          />
          <Label htmlFor="privacyAccepted" className="font-normal text-sm">
            Guest has acknowledged privacy notice
          </Label>
        </div>
      </div>

      <Separator />

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="notes">Notes (optional)</Label>
        <textarea
          id="notes"
          className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          placeholder="Any special notes about this check-in..."
          {...form.register("notes")}
        />
      </div>

      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          onClick={() => onOpenChange(false)}
          disabled={isPending}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isPending || loadingRooms}
        >
          {isPending ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Processing...
            </>
          ) : (
            "Complete Check-In"
          )}
        </Button>
      </DialogFooter>
    </form>
  );
}
