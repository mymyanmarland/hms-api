"use client";

import * as React from "react";
import useSWR from "swr";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2, KeyIcon, CreditCardIcon, FileCheckIcon } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { processCheckOutSchema, type ProcessCheckOutInput } from "@/lib/validations/checkout";

type DepartureBooking = {
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
  roomId: string | null;
  roomNumber: string | null;
  roomTypeName: string | null;
  actualCheckIn: string | null;
  folioBalance: string;
  folioId: string | null;
};

type CheckOutDetails = {
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
  };
  guest: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string | null;
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
    };
  } | null;
  folio: {
    id: string;
    folioNumber: string;
    balance: string;
    subtotal: string;
    taxes: string;
    totalPayments: string;
    charges: Array<{
      id: string;
      category: string;
      description: string;
      amount: string;
      postedAt: string;
    }>;
    payments: Array<{
      id: string;
      method: string;
      amount: string;
      processedAt: string;
      cardLast4: string | null;
    }>;
  } | null;
  checkIn: {
    id: string;
    checkedInAt: string;
    keyCardNumber: string | null;
  } | null;
};

type CheckOutDetailsResponse = {
  data: CheckOutDetails;
  success: boolean;
};

const fetcher = async (url: string) => {
  const res = await fetch(url, { credentials: "same-origin" });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error ?? "Failed to load check-out details");
  }
  return res.json() as Promise<CheckOutDetailsResponse>;
};

export function CheckOutDialog({
  booking,
  open,
  onOpenChange,
  onSuccess,
}: {
  booking: DepartureBooking;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}) {
  const innerKey = open ? "open" : "closed";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        {open ? (
          <CheckOutFormBody
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

function CheckOutFormBody({
  booking,
  onOpenChange,
  onSuccess,
}: {
  booking: DepartureBooking;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}) {
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [isPending, startTransition] = React.useTransition();

  const { data: detailsData, isLoading } = useSWR<CheckOutDetailsResponse>(
    `/api/checkout?intent=details&bookingId=${booking.id}`,
    fetcher,
    { revalidateOnFocus: false },
  );

  const details = detailsData?.data;

  const form = useForm<Partial<ProcessCheckOutInput>>({
    defaultValues: {
      bookingId: booking.id,
      departureTime: "11:00",
      roomKeysReturned: true,
      paymentMethod: undefined,
      paymentAmount: undefined,
      feedbackRequested: true,
      earlyCheckout: false,
      lateCheckout: false,
      checkoutCharges: 0,
      notes: undefined,
    },
  });

  const onSubmit = form.handleSubmit((formData) => {
    setServerError(null);
    startTransition(async () => {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (result.success) {
        toast.success("Check-out completed successfully");
        form.reset();
        onOpenChange(false);
        onSuccess?.();
      } else if (result.fieldErrors) {
        for (const [key, messages] of Object.entries(result.fieldErrors as Record<string, string[]>)) {
          if (messages?.[0]) {
            form.setError(key as keyof ProcessCheckOutInput, {
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

  if (isLoading) {
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
          <DialogDescription>Unable to load check-out details.</DialogDescription>
        </DialogHeader>
      </div>
    );
  }

  const hasBalance = Number(details.folio?.balance ?? 0) > 0;

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <KeyIcon className="size-5" />
          Check-Out
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
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Badge variant="outline">Room {details.room?.number ?? "N/A"}</Badge>
          <span>{details.booking.checkInDate} - {details.booking.checkOutDate}</span>
        </div>
        {details.checkIn?.keyCardNumber && (
          <div className="text-sm text-muted-foreground">
            Key card: <span className="font-mono">{details.checkIn.keyCardNumber}</span>
          </div>
        )}
      </div>

      <Separator />

      {details.folio && (
        <>
          <div className="flex flex-col gap-2">
            <h4 className="text-sm font-semibold">Folio Summary</h4>
            <div className="rounded-lg border p-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Room charges</span>
                <span>${Number(details.folio.subtotal).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Taxes</span>
                <span>${Number(details.folio.taxes).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Payments</span>
                <span className="text-green-600">
                  -${Number(details.folio.totalPayments).toFixed(2)}
                </span>
              </div>
              <Separator className="my-2" />
              <div className="flex justify-between font-semibold">
                <span>Balance Due</span>
                <span className={hasBalance ? "text-destructive" : "text-green-600"}>
                  ${Number(details.folio.balance).toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {details.folio.charges.length > 0 && (
            <div className="flex flex-col gap-2">
              <h4 className="text-sm font-semibold">Additional Charges</h4>
              <div className="flex flex-col gap-1">
                {details.folio.charges.map((charge) => (
                  <div key={charge.id} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{charge.description}</span>
                    <span>${Number(charge.amount).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {hasBalance && (
            <>
              <Separator />
              <div className="flex flex-col gap-3">
                <h4 className="flex items-center gap-2 text-sm font-semibold">
                  <CreditCardIcon className="size-4" />
                  Payment
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="paymentMethod">Payment Method</Label>
                    <Select
                      onValueChange={(value) => form.setValue("paymentMethod", value as ProcessCheckOutInput["paymentMethod"])}
                    >
                      <SelectTrigger id="paymentMethod">
                        <SelectValue placeholder="Select method" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CASH">Cash</SelectItem>
                        <SelectItem value="CREDIT_CARD">Credit Card</SelectItem>
                        <SelectItem value="DEBIT_CARD">Debit Card</SelectItem>
                        <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="paymentAmount">Amount</Label>
                    <input
                      id="paymentAmount"
                      type="number"
                      step="0.01"
                      min="0"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      defaultValue={details.folio.balance}
                      onChange={(e) =>
                        form.setValue("paymentAmount", Number(e.target.value))
                      }
                    />
                  </div>
                </div>
              </div>
            </>
          )}
        </>
      )}

      <Separator />

      <div className="flex flex-col gap-3">
        <h4 className="flex items-center gap-2 text-sm font-semibold">
          <FileCheckIcon className="size-4" />
          Checkout Details
        </h4>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="departureTime">Departure Time</Label>
            <Select
              onValueChange={(value) => form.setValue("departureTime", value)}
              defaultValue="11:00"
            >
              <SelectTrigger id="departureTime">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10:00">10:00 AM</SelectItem>
                <SelectItem value="11:00">11:00 AM</SelectItem>
                <SelectItem value="12:00">12:00 PM</SelectItem>
                <SelectItem value="13:00">1:00 PM</SelectItem>
                <SelectItem value="14:00">2:00 PM</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Checkbox
            id="roomKeysReturned"
            checked={form.watch("roomKeysReturned")}
            onCheckedChange={(checked) =>
              form.setValue("roomKeysReturned", checked as boolean)
            }
          />
          <Label htmlFor="roomKeysReturned" className="font-normal text-sm">
            Room keys returned
          </Label>
        </div>
        <div className="flex items-center gap-2">
          <Checkbox
            id="feedbackRequested"
            checked={form.watch("feedbackRequested")}
            onCheckedChange={(checked) =>
              form.setValue("feedbackRequested", checked as boolean)
            }
          />
          <Label htmlFor="feedbackRequested" className="font-normal text-sm">
            Request feedback survey
          </Label>
        </div>
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
        <Button type="submit" disabled={isPending}>
          {isPending ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Processing...
            </>
          ) : (
            "Complete Check-Out"
          )}
        </Button>
      </DialogFooter>
    </form>
  );
}
