"use client";

import * as React from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  CalendarIcon,
  MailIcon,
  PhoneIcon,
  UsersIcon,
  UserIcon,
  WalletIcon,
} from "lucide-react";
import type { CalendarBooking } from "@/app/actions/calendar";

const STATUS_LABEL: Record<CalendarBooking["status"], string> = {
  TENTATIVE: "Tentative",
  CONFIRMED: "Confirmed",
  CHECKED_IN: "Checked in",
  CHECKED_OUT: "Checked out",
  CANCELLED: "Cancelled",
  NO_SHOW: "No show",
};

const STATUS_VARIANT: Record<
  CalendarBooking["status"],
  "default" | "secondary" | "outline" | "destructive"
> = {
  TENTATIVE: "outline",
  CONFIRMED: "default",
  CHECKED_IN: "default",
  CHECKED_OUT: "secondary",
  CANCELLED: "outline",
  NO_SHOW: "destructive",
};

export function BookingDetailsSheet({
  booking,
  roomNumber,
  roomTypeName,
  open,
  onOpenChange,
}: {
  booking: CalendarBooking | null;
  roomNumber: string | null;
  roomTypeName: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="sm:max-w-md">
        {booking ? (
          <div className="flex flex-col gap-4">
            <SheetHeader>
              <div className="flex items-center gap-2">
                <Badge variant={STATUS_VARIANT[booking.status]}>
                  {STATUS_LABEL[booking.status]}
                </Badge>
                <Badge variant="outline">{booking.source}</Badge>
              </div>
              <SheetTitle className="flex items-center gap-2">
                <UserIcon className="size-4" />
                {booking.guestFirstName} {booking.guestLastName}
              </SheetTitle>
              <SheetDescription>
                Confirmation code:{" "}
                <span className="font-mono text-foreground">
                  {booking.confirmationCode}
                </span>
              </SheetDescription>
            </SheetHeader>

            <Separator />

            <div className="flex flex-col gap-3 text-sm">
              <Row icon={<CalendarIcon className="size-4" />} label="Stay">
                {booking.checkInDate} → {booking.checkOutDate}
              </Row>
              {roomNumber ? (
                <Row icon={<UserIcon className="size-4" />} label="Room">
                  {roomNumber}
                  {roomTypeName ? (
                    <span className="text-muted-foreground">
                      {" "}· {roomTypeName}
                    </span>
                  ) : null}
                </Row>
              ) : null}
              <Row
                icon={<UsersIcon className="size-4" />}
                label="Guests"
              >
                {booking.adults} adult{booking.adults === 1 ? "" : "s"}
                {booking.children > 0
                  ? `, ${booking.children} child${booking.children === 1 ? "" : "ren"}`
                  : ""}
              </Row>
              <Row icon={<WalletIcon className="size-4" />} label="Total">
                ${Number(booking.totalAmount).toFixed(2)}
              </Row>
              <Row icon={<MailIcon className="size-4" />} label="Email">
                <span className="break-all">{booking.guestEmail}</span>
              </Row>
              {booking.guestPhone ? (
                <Row icon={<PhoneIcon className="size-4" />} label="Phone">
                  {booking.guestPhone}
                </Row>
              ) : null}
              {booking.notes ? (
                <div className="rounded-md border bg-muted/40 p-3 text-xs text-muted-foreground">
                  {booking.notes}
                </div>
              ) : null}
            </div>

            <Separator />

            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" disabled>
                View guest
              </Button>
              <Button variant="outline" size="sm" disabled>
                View folio
              </Button>
              <Button variant="default" size="sm" disabled>
                Manage check-in
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Detailed actions will be enabled in the Reservation & Front Desk
              workflow rollout.
            </p>
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

function Row({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2">
      <span className="mt-0.5 text-muted-foreground">{icon}</span>
      <div className="flex flex-col">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="text-sm">{children}</span>
      </div>
    </div>
  );
}