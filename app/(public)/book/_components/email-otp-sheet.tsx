"use client";

import * as React from "react";
import {
  CheckCircle2,
  KeyRound,
  Loader2,
  Mail,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";
import { useBookingWidget } from "./booking-context";

type OtpStage = "request" | "verify";

export function EmailOtpSheet() {
  const {
    otpSheetOpen,
    setOtpSheetOpen,
    guestPrefill,
  } = useBookingWidget();

  const [stage, setStage] = React.useState<OtpStage>("request");
  const [email, setEmail] = React.useState(guestPrefill?.email ?? "");
  const [code, setCode] = React.useState("");
  const [isPending, setIsPending] = React.useState(false);
  const [countdown, setCountdown] = React.useState(0);
  const [error, setError] = React.useState<string | null>(null);

  const handleOpenChange = (open: boolean) => {
    setOtpSheetOpen(open);
    // When closing, reset the countdown so a future open starts fresh.
    if (!open) {
      setCountdown(0);
    }
  };

  React.useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsPending(true);
    try {
      const trimmed = email.trim().toLowerCase();
      const { error: sendError } = await authClient.emailOtp.sendVerificationOtp({
        email: trimmed,
        type: "sign-in",
      });
      if (sendError) {
        setError(sendError.message ?? "Failed to send code.");
        return;
      }
      setEmail(trimmed);
      setStage("verify");
      setCountdown(60);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error");
    } finally {
      setIsPending(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!/^\d{6}$/.test(code)) {
      setError("Enter the 6-digit code from your email.");
      return;
    }
    setIsPending(true);
    try {
      const { error: verifyError } = await authClient.signIn.emailOtp({
        email,
        otp: code,
      });
      if (verifyError) {
        setError(verifyError.message ?? "Invalid code.");
        return;
      }
      // Force a hard refresh so server components re-read the new
      // session cookie and prefilled guest data flows back through
      // getCurrentGuestPrefillAction.
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error");
    } finally {
      setIsPending(false);
    }
  };

  const handleResend = async () => {
    if (countdown > 0) return;
    setError(null);
    setIsPending(true);
    try {
      const { error: sendError } = await authClient.emailOtp.sendVerificationOtp({
        email,
        type: "sign-in",
      });
      if (sendError) {
        setError(sendError.message ?? "Failed to resend code.");
        return;
      }
      setCountdown(60);
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Sheet open={otpSheetOpen} onOpenChange={handleOpenChange}>
      <SheetContent
        side="bottom"
        className="rounded-t-2xl border-slate-200 bg-white px-5 pb-8 pt-6"
      >
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="h-4 w-4 text-blue-600" />
            Verify your email
          </SheetTitle>
          <SheetDescription className="text-xs text-slate-500">
            Signing in prefills your contact details and links this booking
            to your account.
          </SheetDescription>
        </SheetHeader>

        {stage === "request" ? (
          <form onSubmit={handleSendCode} className="mt-5 space-y-4">
            {error ? (
              <div
                role="alert"
                className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700"
              >
                {error}
              </div>
            ) : null}
            <div className="space-y-1.5">
              <Label
                htmlFor="otp-email"
                className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500"
              >
                Email address
              </Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  id="otp-email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-11 rounded-lg border-slate-200 pl-10"
                  placeholder="you@example.com"
                  required
                />
              </div>
            </div>
            <Button
              type="submit"
              disabled={isPending || email.length < 3}
              className="h-11 w-full rounded-lg bg-gradient-to-b from-blue-500 via-blue-600 to-blue-700 text-sm font-semibold text-white shadow-md shadow-blue-500/20 disabled:opacity-60"
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending code...
                </>
              ) : (
                "Send verification code"
              )}
            </Button>
            <button
              type="button"
              onClick={() => setOtpSheetOpen(false)}
              className="block w-full text-center text-xs font-medium text-slate-400 transition-colors hover:text-slate-600"
            >
              Skip for now
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyCode} className="mt-5 space-y-4">
            {error ? (
              <div
                role="alert"
                className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700"
              >
                {error}
              </div>
            ) : null}

            <div className="flex items-center gap-2 rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
              <CheckCircle2 className="h-4 w-4" />
              Code sent to{" "}
              <span className="truncate font-medium">{email}</span>
              <button
                type="button"
                onClick={() => setStage("request")}
                className="ml-auto text-[11px] font-medium text-emerald-700 underline-offset-2 hover:underline"
              >
                Change
              </button>
            </div>

            <div className="space-y-1.5">
              <Label
                htmlFor="otp-code"
                className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500"
              >
                Verification code
              </Label>
              <div className="relative">
                <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  id="otp-code"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  autoComplete="one-time-code"
                  value={code}
                  onChange={(e) =>
                    setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                  }
                  placeholder="000000"
                  autoFocus
                  className="h-11 rounded-lg border-slate-200 pl-10 text-center text-base tracking-[0.4em] font-mono"
                />
              </div>
            </div>

            <div className="flex items-center justify-between text-xs">
              <button
                type="button"
                onClick={() => setStage("request")}
                className="text-slate-500 transition-colors hover:text-slate-700"
              >
                Use a different email
              </button>
              {countdown > 0 ? (
                <span className="text-slate-400">
                  Resend in {countdown}s
                </span>
              ) : (
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={isPending}
                  className="inline-flex items-center gap-1 text-blue-600 transition-colors hover:text-blue-700 disabled:opacity-60"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Resend code
                </button>
              )}
            </div>

            <Button
              type="submit"
              disabled={isPending || code.length !== 6}
              className="h-11 w-full rounded-lg bg-gradient-to-b from-blue-500 via-blue-600 to-blue-700 text-sm font-semibold text-white shadow-md shadow-blue-500/20 disabled:opacity-60"
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Verifying...
                </>
              ) : (
                "Verify & continue"
              )}
            </Button>
          </form>
        )}
        </SheetContent>
    </Sheet>
  );
}
