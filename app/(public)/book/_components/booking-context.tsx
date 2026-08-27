"use client";

import * as React from "react";

import type { PublicRoomTypeOption } from "@/app/actions/public-booking";
import type { PublicGuestPrefill } from "@/app/actions/public-booking";

export type WidgetSearchState = {
  checkIn: string;
  checkOut: string;
  adults: number;
  children: number;
};

type WidgetContextValue = {
  search: WidgetSearchState;
  setSearch: (next: WidgetSearchState) => void;
  availability: PublicRoomTypeOption[] | null;
  setAvailability: (next: PublicRoomTypeOption[] | null) => void;
  isSearching: boolean;
  setIsSearching: (next: boolean) => void;
  selectedRoomType: PublicRoomTypeOption | null;
  setSelectedRoomType: (next: PublicRoomTypeOption | null) => void;
  dialogOpen: boolean;
  setDialogOpen: (next: boolean) => void;
  otpSheetOpen: boolean;
  setOtpSheetOpen: (next: boolean) => void;
  guestPrefill: PublicGuestPrefill | null;
  setGuestPrefill: (next: PublicGuestPrefill | null) => void;
};

const WidgetContext = React.createContext<WidgetContextValue | null>(null);

export type BookingWidgetProviderProps = {
  initialSearch: WidgetSearchState;
  children: React.ReactNode;
};

export function BookingWidgetProvider({
  initialSearch,
  children,
}: BookingWidgetProviderProps) {
  const [search, setSearch] = React.useState<WidgetSearchState>(initialSearch);
  const [availability, setAvailability] = React.useState<
    PublicRoomTypeOption[] | null
  >(null);
  const [isSearching, setIsSearching] = React.useState(false);
  const [selectedRoomType, setSelectedRoomType] =
    React.useState<PublicRoomTypeOption | null>(null);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [otpSheetOpen, setOtpSheetOpen] = React.useState(false);
  const [guestPrefill, setGuestPrefill] = React.useState<
    PublicGuestPrefill | null
  >(null);

  const value: WidgetContextValue = {
    search,
    setSearch,
    availability,
    setAvailability,
    isSearching,
    setIsSearching,
    selectedRoomType,
    setSelectedRoomType,
    dialogOpen,
    setDialogOpen,
    otpSheetOpen,
    setOtpSheetOpen,
    guestPrefill,
    setGuestPrefill,
  };

  return (
    <WidgetContext.Provider value={value}>{children}</WidgetContext.Provider>
  );
}

export function useBookingWidget(): WidgetContextValue {
  const ctx = React.useContext(WidgetContext);
  if (!ctx) {
    throw new Error(
      "useBookingWidget must be used inside <BookingWidgetProvider>",
    );
  }
  return ctx;
}
