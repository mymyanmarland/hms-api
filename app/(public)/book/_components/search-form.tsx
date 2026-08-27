"use client";

import * as React from "react";
import { useForm, type UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CalendarDays, Loader2, Minus, Plus, UsersRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  searchAvailabilityFormSchema,
  type SearchAvailabilityFormValues,
} from "@/lib/validations/public-booking";
import { searchAvailabilityAction } from "@/app/actions/public-booking";
import { addDays } from "@/lib/dates";
import { useBookingWidget } from "./booking-context";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

type SearchFormValues = SearchAvailabilityFormValues;

export function SearchForm() {
  const {
    search,
    setSearch,
    setAvailability,
    setIsSearching,
    isSearching,
  } = useBookingWidget();

  const form = useForm<SearchFormValues>({
    resolver: zodResolver(searchAvailabilityFormSchema),
    defaultValues: search,
  });

  const handleSubmit = form.handleSubmit(async (values) => {
    setIsSearching(true);
    setAvailability(null);
    const normalized = {
      checkIn: values.checkIn,
      checkOut: values.checkOut,
      adults: values.adults,
      children: values.children,
    };
    setSearch(normalized);
    try {
      const result = await searchAvailabilityAction(normalized);
      if (result.success && result.data) {
        setAvailability(result.data.results);
      } else if (result.fieldErrors) {
        for (const [field, messages] of Object.entries(result.fieldErrors)) {
          form.setError(field as keyof SearchFormValues, {
            type: "server",
            message: messages?.[0] ?? "Invalid value",
          });
        }
      }
    } finally {
      setIsSearching(false);
    }
  });

  const minCheckOut = form.watch("checkIn") || addDays(todayIso(), 1);

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:items-end">
        <div className="space-y-1.5">
          <Label
            htmlFor="checkIn"
            className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500"
          >
            Check-in
          </Label>
          <div className="relative">
            <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              id="checkIn"
              type="date"
              min={todayIso()}
              className="h-11 rounded-lg border-slate-200 pl-10"
              {...form.register("checkIn")}
            />
          </div>
          {form.formState.errors.checkIn ? (
            <p className="text-[11px] text-rose-500">
              {form.formState.errors.checkIn.message}
            </p>
          ) : null}
        </div>

        <div className="space-y-1.5">
          <Label
            htmlFor="checkOut"
            className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500"
          >
            Check-out
          </Label>
          <div className="relative">
            <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              id="checkOut"
              type="date"
              min={minCheckOut}
              className="h-11 rounded-lg border-slate-200 pl-10"
              {...form.register("checkOut")}
            />
          </div>
          {form.formState.errors.checkOut ? (
            <p className="text-[11px] text-rose-500">
              {form.formState.errors.checkOut.message}
            </p>
          ) : null}
        </div>

        <GuestStepper form={form} label="Adults" fieldName="adults" min={1} max={6} />
        <GuestStepper
          form={form}
          label="Children"
          fieldName="children"
          min={0}
          max={6}
        />
      </div>

      <div className="mt-5 flex flex-col items-stretch justify-end gap-3 sm:flex-row sm:items-center">
        <p className="text-xs text-slate-500 sm:mr-auto">
          <UsersRound className="mr-1 inline h-3.5 w-3.5" />
          Best price guaranteed when you book direct.
        </p>
        <Button
          type="submit"
          disabled={isSearching}
          className="h-11 rounded-lg bg-gradient-to-b from-blue-500 via-blue-600 to-blue-700 px-6 text-sm font-semibold text-white shadow-md shadow-blue-500/20 hover:from-blue-400 hover:via-blue-500 hover:to-blue-600 disabled:opacity-60"
        >
          {isSearching ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Searching...
            </>
          ) : (
            "Search availability"
          )}
        </Button>
      </div>
    </form>
  );
}

type FieldName = "adults" | "children";

type GuestStepperProps = {
  form: UseFormReturn<SearchFormValues>;
  label: string;
  fieldName: FieldName;
  min: number;
  max: number;
};

function GuestStepper({
  form,
  label,
  fieldName,
  min,
  max,
}: GuestStepperProps) {
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const value = Number(form.watch(fieldName) ?? min);

  const adjust = (delta: number) => {
    const next = Math.min(max, Math.max(min, value + delta));
    form.setValue(fieldName, next, { shouldValidate: true, shouldDirty: true });
    inputRef.current?.focus({ preventScroll: true });
  };

  return (
    <div className="space-y-1.5">
      <Label
        htmlFor={fieldName}
        className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500"
      >
        {label}
      </Label>
      <div className="flex h-11 items-center justify-between rounded-lg border border-slate-200 bg-white px-2">
        <button
          type="button"
          onClick={() => adjust(-1)}
          disabled={value <= min}
          aria-label={`Decrease ${label.toLowerCase()}`}
          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Minus className="h-4 w-4" />
        </button>
        <input
          id={fieldName}
          type="number"
          min={min}
          max={max}
          value={value}
          {...form.register(fieldName)}
          ref={(el) => {
            inputRef.current = el;
          }}
          className="w-10 border-0 bg-transparent text-center text-sm font-medium tabular-nums focus:outline-none focus:ring-0"
          readOnly
        />
        <button
          type="button"
          onClick={() => adjust(1)}
          disabled={value >= max}
          aria-label={`Increase ${label.toLowerCase()}`}
          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
