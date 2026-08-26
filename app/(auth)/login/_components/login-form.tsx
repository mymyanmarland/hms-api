"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Loader2,
  Mail,
  Lock,
  ArrowLeft,
  RefreshCw,
  KeyRound,
  CheckCircle2,
  Eye,
  EyeOff,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  loginSchema,
  verifyOtpSchema,
  type LoginInput,
  type VerifyOtpInput,
} from "@/lib/validations/auth";
import { cn } from "@/lib/utils";

interface LoginFormProps {
  onSuccess?: () => void;
}

export function LoginForm({ onSuccess }: LoginFormProps) {
  const [step, setStep] = useState<"credentials" | "otp">("credentials");
  const [pendingEmail, setPendingEmail] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [shake, setShake] = useState(false);

  const credentialsForm = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const otpForm = useForm<VerifyOtpInput>({
    resolver: zodResolver(verifyOtpSchema),
    defaultValues: { email: "", code: "" },
  });

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const triggerErrorShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 450);
  };

  const handleCredentialsSubmit = async (data: LoginInput) => {
    setIsPending(true);
    setServerError(null);
    try {
      const response = await fetch("/api/auth/callback/credentials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (response.ok) {
        const result = await response.json();
        setPendingEmail(result.email || data.email);
        otpForm.setValue("email", result.email || data.email);
        setStep("otp");
        setCountdown(600);
      } else {
        const result = await response.json();
        setServerError(result.error || "Invalid credentials");
        triggerErrorShake();
      }
    } catch {
      setServerError("An unexpected error occurred");
      triggerErrorShake();
    } finally {
      setIsPending(false);
    }
  };

  const handleOtpSubmit = async (data: VerifyOtpInput) => {
    setIsPending(true);
    setServerError(null);
    try {
      const formData = new URLSearchParams();
      formData.append("email", data.email);
      formData.append("code", data.code);
      const response = await fetch("/api/auth/verify-otp", {
        method: "POST",
        body: formData,
      });
      if (response.redirected) {
        window.location.href = response.url;
        onSuccess?.();
      } else {
        const result = await response.json();
        if (!result.success) {
          setServerError(result.error || "Invalid verification code");
          triggerErrorShake();
        }
      }
    } catch {
      setServerError("An unexpected error occurred");
      triggerErrorShake();
    } finally {
      setIsPending(false);
    }
  };

  const handleResendOtp = async () => {
    if (!pendingEmail) return;
    setIsPending(true);
    setServerError(null);
    try {
      const response = await fetch("/api/auth/resend-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: pendingEmail }),
      });
      if (response.ok) {
        setCountdown(600);
      } else {
        const result = await response.json();
        setServerError(result.error || "Failed to resend code");
        triggerErrorShake();
      }
    } catch {
      setServerError("Failed to resend code");
      triggerErrorShake();
    } finally {
      setIsPending(false);
    }
  };

  const handleBack = () => {
    setStep("credentials");
    setServerError(null);
    credentialsForm.reset();
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const isOtpStep = step === "otp";

  return (
    <div className={cn("w-full", shake && "animate-shake-x")}>
      {!isOtpStep ? (
        <>
          {/* Top row — language selector (right aligned, like reference) */}
          <div className="mb-6 flex items-center justify-end">
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/[0.02] px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-slate-400 transition-colors hover:border-white/20 hover:text-slate-200"
            >
              EN
              <ChevronDown className="h-3 w-3" />
            </button>
          </div>

          {/* Header — left-aligned, like reference */}
          <div className="mb-6">
            <p className="text-[11px] font-medium uppercase tracking-[0.25em] text-orange-400">
              Welcome to HMS
            </p>
            <h1 className="mt-1.5 text-3xl font-semibold tracking-tight text-white sm:text-[34px]">
              Sign in
            </h1>
            <p className="mt-1.5 text-sm text-slate-400">
              Access your admin dashboard to manage operations.
            </p>
          </div>

          {/* Form */}
          <form
            onSubmit={credentialsForm.handleSubmit(handleCredentialsSubmit)}
            className="space-y-4"
            noValidate
          >
            {/* Error banner */}
            {serverError && (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300 animate-fade-up"
              >
                <span className="mt-0.5 inline-block h-2 w-2 shrink-0 animate-pulse rounded-full bg-rose-400" />
                <span>{serverError}</span>
              </div>
            )}

            {/* Email */}
            <div className="space-y-1.5">
              <label
                htmlFor="email"
                className="block text-[11px] font-medium uppercase tracking-[0.18em] text-slate-400"
              >
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@hotel.com"
                  autoComplete="email"
                  className="h-11 rounded-lg border-white/10 bg-white/[0.03] pl-10 text-sm text-white placeholder:text-slate-500 focus-visible:border-orange-500/50 focus-visible:ring-orange-500/20"
                  {...credentialsForm.register("email")}
                />
              </div>
              {credentialsForm.formState.errors.email && (
                <p className="text-[11px] text-rose-400 animate-fade-up">
                  {credentialsForm.formState.errors.email.message}
                </p>
              )}
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="password"
                  className="block text-[11px] font-medium uppercase tracking-[0.18em] text-slate-400"
                >
                  Password
                </label>
                <Link
                  href="/forgot-password"
                  className="text-[12px] font-medium text-orange-400 transition-colors duration-200 hover:text-orange-300"
                >
                  Forgot Password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  className="h-11 rounded-lg border-white/10 bg-white/[0.03] pl-10 pr-10 text-sm text-white placeholder:text-slate-500 focus-visible:border-orange-500/50 focus-visible:ring-orange-500/20"
                  {...credentialsForm.register("password")}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                  tabIndex={-1}
                  className="absolute right-2 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-slate-500 transition-all duration-200 hover:text-slate-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/40"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <Eye className="h-4 w-4" aria-hidden="true" />
                  )}
                </button>
              </div>
              {credentialsForm.formState.errors.password && (
                <p className="text-[11px] text-rose-400 animate-fade-up">
                  {credentialsForm.formState.errors.password.message}
                </p>
              )}
            </div>

            {/* Submit — orange CTA matching reference */}
            <Button
              type="submit"
              disabled={isPending}
              className="group/btn relative h-11 w-full overflow-hidden rounded-lg bg-gradient-to-b from-orange-400 via-orange-500 to-orange-600 text-sm font-semibold text-white shadow-lg shadow-orange-500/25 transition-all duration-300 hover:from-orange-300 hover:via-orange-400 hover:to-orange-500 disabled:opacity-60"
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Login"
              )}
            </Button>

            {/* Footer — authorized note */}
            <p className="pt-2 text-center text-[10px] uppercase tracking-[0.18em] text-slate-500">
              Authorized personnel only · All access is logged
            </p>
          </form>
        </>
      ) : (
        <form
          onSubmit={otpForm.handleSubmit(handleOtpSubmit)}
          className="space-y-5"
          noValidate
        >
          {/* Top row */}
          <div className="mb-6 flex items-center justify-end">
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/[0.02] px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-slate-400 transition-colors hover:border-white/20 hover:text-slate-200"
            >
              EN
              <ChevronDown className="h-3 w-3" />
            </button>
          </div>

          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.25em] text-orange-400">
              Two-step verification
            </p>
            <h1 className="mt-1.5 text-3xl font-semibold tracking-tight text-white sm:text-[34px]">
              Verify code
            </h1>
            <p className="mt-1.5 text-sm text-slate-400">
              Enter the 6-digit code we sent to your email.
            </p>
          </div>

          {serverError && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300 animate-fade-up"
            >
              <span className="mt-0.5 inline-block h-2 w-2 shrink-0 animate-pulse rounded-full bg-rose-400" />
              <span>{serverError}</span>
            </div>
          )}

          <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-slate-300">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
            <span className="text-slate-400">Sent to</span>
            <span className="truncate font-medium text-white">
              {pendingEmail}
            </span>
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="code"
              className="block text-[11px] font-medium uppercase tracking-[0.18em] text-slate-400"
            >
              Verification Code
            </label>
            <div className="relative">
              <KeyRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <Input
                id="code"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                placeholder="000000"
                autoFocus
                className="h-11 rounded-lg border-white/10 bg-white/[0.03] pl-10 text-center text-base tracking-[0.4em] font-mono text-white placeholder:text-slate-600 focus-visible:border-orange-500/50 focus-visible:ring-orange-500/20"
                {...otpForm.register("code")}
              />
            </div>
            {otpForm.formState.errors.code && (
              <p className="text-[11px] text-rose-400 animate-fade-up">
                {otpForm.formState.errors.code?.message}
              </p>
            )}
          </div>

          <div className="flex items-center justify-between text-xs">
            <button
              type="button"
              onClick={handleBack}
              disabled={isPending}
              className="inline-flex items-center text-slate-400 transition-colors hover:text-white disabled:opacity-50"
            >
              <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
              Back
            </button>
            {countdown > 0 ? (
              <span className="inline-flex items-center gap-1.5 text-slate-500">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-orange-400 opacity-75" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-orange-500" />
                </span>
                Resend in {formatTime(countdown)}
              </span>
            ) : (
              <button
                type="button"
                onClick={handleResendOtp}
                disabled={isPending}
                className="inline-flex items-center text-orange-400 transition-colors hover:text-orange-300 disabled:opacity-50"
              >
                <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                Resend Code
              </button>
            )}
          </div>

          <Button
            type="submit"
            disabled={isPending}
            className="h-11 w-full rounded-lg bg-gradient-to-b from-orange-400 via-orange-500 to-orange-600 text-sm font-semibold text-white shadow-lg shadow-orange-500/25 transition-all duration-300 hover:from-orange-300 hover:via-orange-400 hover:to-orange-500 disabled:opacity-60"
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Verifying...
              </>
            ) : (
              "Verify & Login"
            )}
          </Button>
        </form>
      )}
    </div>
  );
}
