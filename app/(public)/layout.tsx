import Link from "next/link";

import { Toaster } from "@/components/ui/sonner";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-gradient-to-b from-slate-50 via-white to-slate-100">
      <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between gap-3 px-4 sm:h-16 sm:px-6">
          <Link href="/book" className="flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 text-sm font-semibold text-white shadow-sm">
              H
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-[10px] font-medium uppercase tracking-[0.22em] text-blue-600">
                HMS Booking
              </span>
              <span className="text-sm font-semibold text-slate-900">
                Direct reservations
              </span>
            </div>
          </Link>
          <span className="hidden rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-medium text-emerald-700 sm:inline-flex">
            No commission · Best rate
          </span>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6 sm:py-12">
        {children}
      </main>

      <footer className="border-t border-slate-200/70 bg-white/60 py-6 text-center text-[11px] text-slate-500">
        HMS Booking · Direct booking keeps your stay free of third-party fees.
        Secure checkout at the front desk.
      </footer>

      <Toaster position="top-center" richColors closeButton />
    </div>
  );
}
