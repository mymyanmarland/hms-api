"use client";

import * as React from "react";

import { useBookingWidget } from "./booking-context";
import type { PublicGuestPrefill } from "@/app/actions/public-booking";

/**
 * Tiny client component that takes a server-resolved guest prefill and
 * pushes it into the booking-widget provider. Renders nothing.
 */
export function PrefillHydrator({ prefill }: { prefill: PublicGuestPrefill }) {
  const { setGuestPrefill } = useBookingWidget();
  React.useEffect(() => {
    setGuestPrefill(prefill);
  }, [prefill, setGuestPrefill]);
  return null;
}
