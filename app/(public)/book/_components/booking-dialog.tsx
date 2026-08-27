"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  BedDouble,
  CalendarDays,
  CheckCircle2,
  Loader2,
  Mail,
  Phone,
  ShieldCheck,
  UserRound,
  UsersRound,
} from "lucide-react";

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
import { Textarea } from "@/components/ui/textarea";
import {
  directBookingSchema,
  type DirectBookingFormInput,
} from "@/lib/validations/public-booking";
import {
  createDirectBookingAction,
  type BookingResult,
} from "@/app/actions/public-booking";
import { useBookingWidget } from "./booking-context";
import { ConfirmationScreen } from "./confirmation-screen";
import { formatBookingAmount } from "@/lib/booking";

type SubmissionResult =
  | { kind: "success"; data: BookingResult }
  | { kind: "error"; message: string };

export function BookingDialog() {
  const {
    dialogOpen,
    setDialogOpen,
    selectedRoomType,
    setSelectedRoomType,
    search,
    guestPrefill,
    setOtpSheetOpen,
  } = useBookingWidget();

  const [isPending, startTransition] = React.useTransition();
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [submission, setSubmission] = React.useState<SubmissionResult | null>(
    null,
  );

  const form = useForm<DirectBookingFormInput>({
    resolver: zodResolver(directBookingSchema),
    defaultValues: {
      roomTypeId: selectedRoomType?.roomTypeId ?? "",
      roomId: selectedRoomType?.suggestedRoomId ?? undefined,
      checkIn: search.checkIn,
      checkOut: search.checkOut,
      adults: search.adults,
      children: search.children,
      guestFirstName: guestPrefill?.firstName ?? "",
      guestLastName: guestPrefill?.lastName ?? "",
      guestEmail: guestPrefill?.email ?? "",
      guestPhone: guestPrefill?.phone ?? "",
      specialRequests: "",
      paymentMethod: "CARD",
    },
  });

  const handleClose = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      setServerError(null);
      setSubmission(null);
    }
  };

  const handleSubmit = form.handleSubmit((values) => {
    setServerError(null);
    startTransition(async () => {
      const result = await createDirectBookingAction(values);
      if (result.success && result.data) {
        setSubmission({ kind: "success", data: result.data });
      } else {
        if (result.fieldErrors) {
          for (const [field, messages] of Object.entries(result.fieldErrors)) {
            form.setError(field as keyof DirectBookingFormInput, {
              type: "server",
              message: messages?.[0] ?? "Invalid value",
            });
          }
        }
        setServerError(result.error ?? "We could not create the booking.");
      }
    });
  });

  if (!selectedRoomType) return null;

  const totalLabel = formatBookingAmount(selectedRoomType.totalForStay);
  const nightlyLabel = formatBookingAmount(selectedRoomType.basePrice);

  return (
    <Dialog open={dialogOpen} onOpenChange={handleClose}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-xl">
        {submission?.kind === "success" ? (
          <ConfirmationScreen
            result={submission.data}
            roomTypeName={selectedRoomType.name}
            roomNumber={selectedRoomType.suggestedRoomNumber}
            checkIn={search.checkIn}
            checkOut={search.checkOut}
            total={selectedRoomType.totalForStay}
            onClose={() => {
              handleClose(false);
              setSelectedRoomType(null);
            }}
          />
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <BedDouble className="h-4 w-4 text-blue-600" />
                Reserve {selectedRoomType.name}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                {totalLabel} for {selectedRoomType.nights}{" "}
                {selectedRoomType.nights === 1 ? "night" : "nights"} (
                {nightlyLabel} / night). You won&apos;t be charged yet — pay at
                check-in.
              </DialogDescription>
            </DialogHeader>

            <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-xs text-slate-600">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                <span className="inline-flex items-center gap-1">
                  <CalendarDays className="h-3.5 w-3.5" />
                  {search.checkIn} → {search.checkOut}
                </span>
                <span className="inline-flex items-center gap-1">
                  <UsersRound className="h-3.5 w-3.5" />
                  {search.adults + search.children}{" "}
                  {search.adults + search.children === 1
                    ? "guest"
                    : "guests"}
                </span>
                {selectedRoomType.suggestedRoomNumber ? (
                  <span className="inline-flex items-center gap-1">
                    <BedDouble className="h-3.5 w-3.5" />
                    Room {selectedRoomType.suggestedRoomNumber}
                  </span>
                ) : null}
              </div>
            </div>

            {!guestPrefill?.email ? (
              <button
                type="button"
                onClick={() => setOtpSheetOpen(true)}
                className="flex items-center justify-between gap-2 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-left text-xs text-blue-700 transition-colors hover:bg-blue-100"
              >
                <span className="inline-flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-blue-600" />
                  Already have an account? Verify your email for faster booking.
                </span>
                <span className="font-semibold">Verify →</span>
              </button>
            ) : null}

            <form
              onSubmit={handleSubmit}
              noValidate
              className="space-y-4"
            >
              {serverError ? (
                <div
                  role="alert"
                  className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700"
                >
                  {serverError}
                </div>
              ) : null}

              <div className="grid grid-cols-2 gap-3">
                <FormField
                  id="guestFirstName"
                  label="First name"
                  icon={<UserRound className="h-4 w-4" />}
                  error={form.formState.errors.guestFirstName?.message}
                >
                  <Input
                    id="guestFirstName"
                    autoComplete="given-name"
                    className="h-11 rounded-lg border-slate-200 pl-10"
                    {...form.register("guestFirstName")}
                  />
                </FormField>
                <FormField
                  id="guestLastName"
                  label="Last name"
                  icon={<UserRound className="h-4 w-4" />}
                  error={form.formState.errors.guestLastName?.message}
                >
                  <Input
                    id="guestLastName"
                    autoComplete="family-name"
                    className="h-11 rounded-lg border-slate-200 pl-10"
                    {...form.register("guestLastName")}
                  />
                </FormField>
              </div>

              <FormField
                id="guestEmail"
                label="Email"
                icon={<Mail className="h-4 w-4" />}
                error={form.formState.errors.guestEmail?.message}
              >
                <Input
                  id="guestEmail"
                  type="email"
                  autoComplete="email"
                  className="h-11 rounded-lg border-slate-200 pl-10"
                  {...form.register("guestEmail")}
                />
              </FormField>

              <FormField
                id="guestPhone"
                label="Phone (optional)"
                icon={<Phone className="h-4 w-4" />}
                error={form.formState.errors.guestPhone?.message}
              >
                <Input
                  id="guestPhone"
                  type="tel"
                  autoComplete="tel"
                  className="h-11 rounded-lg border-slate-200 pl-10"
                  {...form.register("guestPhone")}
                />
              </FormField>

              <div className="space-y-1.5">
                <Label
                  htmlFor="specialRequests"
                  className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500"
                >
                  Special requests (optional)
                </Label>
                <Textarea
                  id="specialRequests"
                  rows={3}
                  className="rounded-lg border-slate-200 text-sm"
                  placeholder="Late check-in, dietary preferences, extra pillows..."
                  {...form.register("specialRequests")}
                />
              </div>

              <input
                type="hidden"
                {...form.register("roomTypeId")}
              />
              <input
                type="hidden"
                {...form.register("roomId")}
              />
              <input
                type="hidden"
                {...form.register("checkIn")}
              />
              <input
                type="hidden"
                {...form.register("checkOut")}
              />
              <input
                type="hidden"
                {...form.register("adults", { valueAsNumber: true })}
              />
              <input
                type="hidden"
                {...form.register("children", { valueAsNumber: true })}
              />

              <DialogFooter className="gap-2 sm:gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => handleClose(false)}
                  disabled={isPending}
                  className="text-slate-500"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isPending}
                  className="h-11 flex-1 rounded-lg bg-gradient-to-b from-blue-500 via-blue-600 to-blue-700 text-sm font-semibold text-white shadow-md shadow-blue-500/20 hover:from-blue-400 hover:via-blue-500 hover:to-blue-600 disabled:opacity-60 sm:flex-none sm:px-8"
                >
                  {isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Reserving...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Confirm reservation
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

type FormFieldProps = {
  id: string;
  label: string;
  icon: React.ReactNode;
  error?: string;
  children: React.ReactElement;
};

function FormField({ id, label, icon, error, children }: FormFieldProps) {
  return (
    <div className="space-y-1.5">
      <Label
        htmlFor={id}
        className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500"
      >
        {label}
      </Label>
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
          {icon}
        </span>
        {children}
      </div>
      {error ? (
        <p className="text-[11px] text-rose-500">{error}</p>
      ) : null}
    </div>
  );
}
