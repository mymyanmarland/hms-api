"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { BedIcon, CalendarIcon, Loader2 } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  createBookingFromCalendarSchema,
  type CreateBookingFromCalendarInput,
} from "@/lib/validations/calendar";
import { createBookingFromCalendarAction } from "@/app/actions/calendar";
import type { CalendarRoom } from "@/app/actions/calendar";

export type NewBookingSlot = {
  roomId: string;
  checkInDate: string;
  checkOutDate: string;
};

export function NewBookingDialog({
  open,
  onOpenChange,
  slot,
  rooms,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  slot: NewBookingSlot | null;
  rooms: CalendarRoom[];
  onSuccess?: (payload: {
    bookingId: string;
    confirmationCode: string;
  }) => void;
}) {
  const innerKey = open && slot ? `${slot.roomId}:${slot.checkInDate}` : "closed";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[calc(100vh-2rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
        {open && slot ? (
          <NewBookingFormBody
            key={innerKey}
            slot={slot}
            rooms={rooms}
            onOpenChange={onOpenChange}
            onSuccess={onSuccess}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

const SOURCES: Array<{
  value: CreateBookingFromCalendarInput["source"];
  label: string;
}> = [
  { value: "DIRECT", label: "Direct" },
  { value: "WALK_IN", label: "Walk-in" },
  { value: "PHONE", label: "Phone" },
  { value: "OTA", label: "OTA" },
  { value: "CORPORATE", label: "Corporate" },
  { value: "GROUP", label: "Group" },
];

function nightsBetween(checkInIso: string, checkOutIso: string): number {
  const checkIn = new Date(`${checkInIso}T00:00:00.000Z`).getTime();
  const checkOut = new Date(`${checkOutIso}T00:00:00.000Z`).getTime();
  return Math.max(
    Math.round((checkOut - checkIn) / (1000 * 60 * 60 * 24)),
    0,
  );
}

function formatHumanDate(iso: string): string {
  const date = new Date(`${iso}T00:00:00.000Z`);
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

function NewBookingFormBody({
  slot,
  rooms,
  onOpenChange,
  onSuccess,
}: {
  slot: NewBookingSlot;
  rooms: CalendarRoom[];
  onOpenChange: (open: boolean) => void;
  onSuccess?: (payload: {
    bookingId: string;
    confirmationCode: string;
  }) => void;
}) {
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [isPending, startTransition] = React.useTransition();

  const selectedRoom = rooms.find((room) => room.id === slot.roomId);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CreateBookingFromCalendarInput>({
    resolver: zodResolver(createBookingFromCalendarSchema),
    defaultValues: {
      roomId: slot.roomId,
      checkInDate: slot.checkInDate,
      checkOutDate: slot.checkOutDate,
      guestFirstName: "",
      guestLastName: "",
      guestEmail: "",
      guestPhone: "",
      adults: 1,
      children: 0,
      source: "DIRECT",
      notes: "",
    },
  });

  React.useEffect(() => {
    reset({
      roomId: slot.roomId,
      checkInDate: slot.checkInDate,
      checkOutDate: slot.checkOutDate,
      guestFirstName: "",
      guestLastName: "",
      guestEmail: "",
      guestPhone: "",
      adults: 1,
      children: 0,
      source: "DIRECT",
      notes: "",
    });
  }, [slot, reset]);

  const roomId = watch("roomId");
  const source = watch("source");

  const onSubmit = handleSubmit((data) => {
    setServerError(null);
    startTransition(async () => {
      const result = await createBookingFromCalendarAction({
        ...data,
        notes: data.notes || undefined,
        guestPhone: data.guestPhone || undefined,
      });
      if (result.success && result.data) {
        toast.success(
          `Booking ${result.data.confirmationCode} created`,
        );
        onOpenChange(false);
        onSuccess?.(result.data);
        return;
      }
      if (result.fieldErrors) {
        for (const [key, messages] of Object.entries(result.fieldErrors)) {
          if (messages?.[0]) {
            setError(key as keyof CreateBookingFromCalendarInput, {
              message: messages[0],
            });
          }
        }
      }
      if (result.error) setServerError(result.error);
    });
  });

  return (
    <form
      onSubmit={onSubmit}
      className="flex min-h-0 flex-1 flex-col"
    >
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pt-4">
        <div className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>New booking</DialogTitle>
            <DialogDescription>
              Reserve a room for a guest. The booking will be confirmed
              automatically; you can adjust the status later from the booking
              detail.
            </DialogDescription>

            {/* Slot context chips: makes it obvious which room + date was clicked */}
            <div className="mt-2 flex flex-wrap items-center gap-2 rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-xs">
              <span className="inline-flex items-center gap-1.5 font-medium text-primary">
                <BedIcon className="size-3.5" aria-hidden />
                Room {selectedRoom?.number ?? "—"}
                {selectedRoom?.roomType?.name ? (
                  <span className="text-muted-foreground">
                    · {selectedRoom.roomType.name}
                  </span>
                ) : null}
              </span>
              <span aria-hidden className="text-muted-foreground">·</span>
              <span className="inline-flex items-center gap-1.5 text-foreground">
                <CalendarIcon className="size-3.5 text-muted-foreground" aria-hidden />
                <span className="font-medium">{formatHumanDate(slot.checkInDate)}</span>
                <span className="text-muted-foreground">→</span>
                <span className="font-medium">{formatHumanDate(slot.checkOutDate)}</span>
              </span>
              <Badge variant="outline" className="ml-auto border-primary/40 text-primary">
                {nightsBetween(slot.checkInDate, slot.checkOutDate)} night
                {nightsBetween(slot.checkInDate, slot.checkOutDate) === 1 ? "" : "s"}
              </Badge>
            </div>
          </DialogHeader>

          {serverError ? (
            <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
              {serverError}
            </div>
          ) : null}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="new-booking-room">Room</Label>
            <Select
              value={roomId}
              onValueChange={(value) =>
                setValue("roomId", value, { shouldValidate: true, shouldDirty: true })
              }
            >
              <SelectTrigger id="new-booking-room" className="w-full">
                <SelectValue placeholder="Choose a room" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {rooms.map((room) => (
                    <SelectItem key={room.id} value={room.id}>
                      Room {room.number} · {room.roomType.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
            {selectedRoom ? (
              <p className="text-xs text-muted-foreground">
                Floor {selectedRoom.floor} · ${selectedRoom.roomType.basePrice} / night · sleeps up to{" "}
                {selectedRoom.roomType.maxOccupancy}
              </p>
            ) : null}
            {errors.roomId?.message ? (
              <p className="text-xs text-destructive">{errors.roomId.message}</p>
            ) : null}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="new-booking-checkin">Check-in</Label>
              <Input
                id="new-booking-checkin"
                type="date"
                {...register("checkInDate")}
              />
              {errors.checkInDate?.message ? (
                <p className="text-xs text-destructive">
                  {errors.checkInDate.message}
                </p>
              ) : null}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="new-booking-checkout">Check-out</Label>
              <Input
                id="new-booking-checkout"
                type="date"
                {...register("checkOutDate")}
              />
              {errors.checkOutDate?.message ? (
                <p className="text-xs text-destructive">
                  {errors.checkOutDate.message}
                </p>
              ) : null}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="new-booking-first-name">First name</Label>
              <Input
                id="new-booking-first-name"
                autoComplete="given-name"
                {...register("guestFirstName")}
              />
              {errors.guestFirstName?.message ? (
                <p className="text-xs text-destructive">
                  {errors.guestFirstName.message}
                </p>
              ) : null}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="new-booking-last-name">Last name</Label>
              <Input
                id="new-booking-last-name"
                autoComplete="family-name"
                {...register("guestLastName")}
              />
              {errors.guestLastName?.message ? (
                <p className="text-xs text-destructive">
                  {errors.guestLastName.message}
                </p>
              ) : null}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="new-booking-email">Email</Label>
            <Input
              id="new-booking-email"
              type="email"
              autoComplete="email"
              {...register("guestEmail")}
            />
            {errors.guestEmail?.message ? (
              <p className="text-xs text-destructive">
                {errors.guestEmail.message}
              </p>
            ) : null}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="new-booking-phone">Phone (optional)</Label>
            <Input
              id="new-booking-phone"
              type="tel"
              autoComplete="tel"
              {...register("guestPhone")}
            />
            {errors.guestPhone?.message ? (
              <p className="text-xs text-destructive">
                {errors.guestPhone.message}
              </p>
            ) : null}
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="new-booking-adults">Adults</Label>
              <Input
                id="new-booking-adults"
                type="number"
                min={1}
                max={6}
                {...register("adults", { valueAsNumber: true })}
              />
              {errors.adults?.message ? (
                <p className="text-xs text-destructive">
                  {errors.adults.message}
                </p>
              ) : null}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="new-booking-children">Children</Label>
              <Input
                id="new-booking-children"
                type="number"
                min={0}
                max={6}
                {...register("children", { valueAsNumber: true })}
              />
              {errors.children?.message ? (
                <p className="text-xs text-destructive">
                  {errors.children.message}
                </p>
              ) : null}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="new-booking-source">Source</Label>
              <Select
                value={source}
                onValueChange={(value) =>
                  setValue(
                    "source",
                    value as CreateBookingFromCalendarInput["source"],
                    { shouldValidate: true, shouldDirty: true },
                  )
                }
              >
                <SelectTrigger id="new-booking-source" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {SOURCES.map((sourceOption) => (
                      <SelectItem
                        key={sourceOption.value}
                        value={sourceOption.value}
                      >
                        {sourceOption.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="new-booking-notes">Internal notes</Label>
            <Input
              id="new-booking-notes"
              placeholder="Optional notes for the front desk"
              {...register("notes")}
            />
            {errors.notes?.message ? (
              <p className="text-xs text-destructive">{errors.notes.message}</p>
            ) : null}
          </div>
        </div>
      </div>

      <DialogFooter className="mx-0 mb-0 shrink-0 gap-2 rounded-none border-t bg-popover px-4 py-3 sm:flex-row sm:justify-end">
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
              Creating...
            </>
          ) : (
            <>
              <Badge variant="default" className="bg-emerald-600">
                Confirm
              </Badge>
              Create booking
            </>
          )}
        </Button>
      </DialogFooter>
    </form>
  );
}