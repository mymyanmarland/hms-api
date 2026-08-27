"use client";

import * as React from "react";
import {
  CalendarDays,
  CheckCircle2,
  Copy,
  Mail,
  Sparkles,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { formatBookingAmount } from "@/lib/booking";
import type { BookingResult } from "@/app/actions/public-booking";

interface ConfirmationScreenProps {
  result: BookingResult;
  roomTypeName: string;
  roomNumber: string | null;
  checkIn: string;
  checkOut: string;
  total: string;
  onClose: () => void;
}

export function ConfirmationScreen({
  result,
  roomTypeName,
  roomNumber,
  checkIn,
  checkOut,
  total,
  onClose,
}: ConfirmationScreenProps) {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(result.confirmationCode);
      setCopied(true);
      toast.success("Confirmation code copied", {
        description:
          "Save it somewhere safe — you'll need it for check-in.",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy to clipboard. Long-press to copy manually.");
    }
  };

  return (
    <div className="flex flex-col gap-5 py-2 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
        <CheckCircle2 className="h-8 w-8" />
      </div>

      <div>
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-emerald-600">
          Booking confirmed
        </p>
        <h2 className="mt-1 text-2xl font-semibold text-slate-900">
          See you in {roomTypeName}!
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          We&apos;ve emailed your confirmation. Bring a valid photo ID — pay
          at check-in.
        </p>
      </div>

      <Card className="border-slate-200 bg-slate-50">
        <CardContent className="p-4">
          <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-slate-500">
            Confirmation code
          </p>
          <div className="mt-1 flex items-center justify-between gap-2">
            <code className="font-mono text-lg font-semibold tabular-nums text-slate-900">
              {result.confirmationCode}
            </code>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={handleCopy}
              className="h-8 px-2 text-xs text-slate-500 hover:text-slate-900"
              aria-label="Copy confirmation code"
            >
              <Copy className="mr-1 h-3.5 w-3.5" />
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <dl className="grid grid-cols-2 gap-3 text-left">
        <SummaryStat label="Room" value={roomTypeName} />
        <SummaryStat
          label="Room #"
          value={roomNumber ?? "Assigned at check-in"}
        />
        <SummaryStat
          label="Check-in"
          value={checkIn}
          icon={<CalendarDays className="h-3.5 w-3.5" />}
        />
        <SummaryStat label="Check-out" value={checkOut} />
        <SummaryStat
          label="Total (pay later)"
          value={formatBookingAmount(total)}
        />
      </dl>

      <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-left text-xs text-blue-800">
        <Sparkles className="mr-1 inline h-3.5 w-3.5 text-blue-600" />
        This booking was made directly with us — no third-party fees were
        charged.
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button
          type="button"
          variant="ghost"
          onClick={onClose}
          className="flex-1 text-slate-600"
        >
          <Mail className="mr-1 h-4 w-4" /> Done
        </Button>
        <Button
          type="button"
          asChild
          className="flex-1 rounded-lg bg-gradient-to-b from-blue-500 via-blue-600 to-blue-700 text-white hover:from-blue-400 hover:via-blue-500 hover:to-blue-600"
        >
          <a href={`mailto:reservations@hms.com?subject=${result.confirmationCode}`}>
            Contact front desk
          </a>
        </Button>
      </div>
    </div>
  );
}

function SummaryStat({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-slate-500">
        {label}
      </p>
      <p className="mt-1 inline-flex items-center gap-1 text-sm font-medium text-slate-900">
        {icon}
        {value}
      </p>
    </div>
  );
}
