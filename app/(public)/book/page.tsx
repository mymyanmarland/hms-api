import { Suspense } from "react";
import Link from "next/link";
import { BedDouble, ShieldCheck, Sparkles } from "lucide-react";

import { getCurrentGuestPrefillAction } from "@/app/actions/public-booking";
import { addDays } from "@/lib/dates";
import { Skeleton } from "@/components/ui/skeleton";

import { BookingWidgetProvider } from "./_components/booking-context";
import { BookingDialog } from "./_components/booking-dialog";
import { EmailOtpSheet } from "./_components/email-otp-sheet";
import { RoomResults } from "./_components/room-results";
import { SearchForm } from "./_components/search-form";
import { PrefillHydrator } from "./_components/prefill-hydrator";
import type { WidgetSearchState } from "./_components/booking-context";

export const dynamic = "force-dynamic";

interface BookPageProps {
  searchParams: Promise<{
    checkIn?: string;
    checkOut?: string;
    adults?: string;
    children?: string;
  }>;
}

function defaultSearch(): WidgetSearchState {
  const today = new Date().toISOString().slice(0, 10);
  return {
    checkIn: today,
    checkOut: addDays(today, 1),
    adults: 2,
    children: 0,
  };
}

function normalizeSearch(params: Awaited<BookPageProps["searchParams"]>): WidgetSearchState {
  const base = defaultSearch();
  const adults = Number(params.adults ?? base.adults);
  const children = Number(params.children ?? base.children);
  return {
    checkIn: typeof params.checkIn === "string" ? params.checkIn : base.checkIn,
    checkOut:
      typeof params.checkOut === "string" ? params.checkOut : base.checkOut,
    adults: Number.isFinite(adults) && adults >= 1 && adults <= 6 ? adults : base.adults,
    children:
      Number.isFinite(children) && children >= 0 && children <= 6
        ? children
        : base.children,
  };
}

export default async function BookPage({ searchParams }: BookPageProps) {
  const params = await searchParams;
  const initialSearch = normalizeSearch(params);

  // Prefill the guest-side form whenever a better-auth session is active.
  // The action returns `{ success: true, data: null }` for anonymous users.
  const prefillResult = await getCurrentGuestPrefillAction();
  const guestPrefill =
    prefillResult.success && prefillResult.data ? prefillResult.data : null;

  return (
    <BookingWidgetProvider
      initialSearch={initialSearch}
      key={`${initialSearch.checkIn}-${initialSearch.checkOut}-${initialSearch.adults}-${initialSearch.children}`}
    >
      <div className="space-y-7">
        <section className="space-y-2">
          <p className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-blue-700">
            <Sparkles className="h-3 w-3" />
            Direct booking
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
            Book your stay direct — skip the commission.
          </h1>
          <p className="max-w-xl text-sm text-slate-600">
            Reserve any room in our hotel without paying third-party fees.
            Best-rate guaranteed, instant email confirmation, and our front
            desk is one tap away whenever you need help.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="sr-only">Search availability</h2>
          <SearchForm />
        </section>

        <Suspense fallback={<RoomResultsSkeleton />}>
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                Available rooms
              </h2>
              <Link
                href="/login"
                className="text-xs font-medium text-blue-600 transition-colors hover:text-blue-700"
              >
                Admin sign in →
              </Link>
            </div>
            <RoomResults />
          </section>
        </Suspense>

        <section className="grid grid-cols-1 gap-3 rounded-2xl border border-slate-200 bg-white p-5 sm:grid-cols-3">
          <TrustItem
            icon={<ShieldCheck className="h-4 w-4 text-emerald-600" />}
            title="Secure direct booking"
            body="Your details are encrypted; payments happen at the front desk."
          />
          <TrustItem
            icon={<Sparkles className="h-4 w-4 text-blue-600" />}
            title="Best rate, no fees"
            body="Save up to 18% versus online travel agencies."
          />
          <TrustItem
            icon={<BedDouble className="h-4 w-4 text-purple-600" />}
            title="Front desk in-app"
            body="Tap one button to reach our team from your confirmation."
          />
        </section>
      </div>

      {guestPrefill ? <PrefillHydrator prefill={guestPrefill} /> : null}

      <BookingDialog />
      <EmailOtpSheet />
    </BookingWidgetProvider>
  );
}

function TrustItem({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-slate-50 ring-1 ring-slate-100">
        {icon}
      </div>
      <p className="text-sm font-semibold text-slate-900">{title}</p>
      <p className="text-xs leading-relaxed text-slate-500">{body}</p>
    </div>
  );
}

function RoomResultsSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <Skeleton className="h-44 w-full rounded-2xl" />
      <Skeleton className="h-44 w-full rounded-2xl" />
    </div>
  );
}
