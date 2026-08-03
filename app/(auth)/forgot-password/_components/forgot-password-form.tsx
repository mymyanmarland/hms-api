"use client";

import { useState, useEffect, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import {
  ArrowLeft,
  KeyRound,
  Loader2,
  Lock,
  Mail,
  RefreshCw,
  Shield,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  forgotPasswordSchema,
  resetPasswordSchema,
  type ForgotPasswordInput,
  type ResetPasswordInput,
} from "@/lib/validations/auth";
import {
  requestPasswordResetAction,
  resetPasswordAction,
} from "@/app/actions/password-reset";

type Step = "request" | "verify" | "success";

export function ForgotPasswordForm() {
  const [step, setStep] = useState<Step>("request");
  const [pendingEmail, setPendingEmail] = useState("");
  const [serverError, setServerError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);
  const [isPending, startTransition] = useTransition();

  const requestForm = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  const resetForm = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      email: "",
      otp: "",
      password: "",
      confirmPassword: "",
    },
  });

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleRequestSubmit = async (data: ForgotPasswordInput) => {
    setServerError(null);
    startTransition(async () => {
      const result = await requestPasswordResetAction(data);
      if (result.success) {
        setPendingEmail(data.email);
        resetForm.setValue("email", data.email);
        setStep("verify");
        setCountdown(600);
      } else {
        if (result.error) setServerError(result.error);
        if (result.fieldErrors) {
          for (const [field, messages] of Object.entries(result.fieldErrors)) {
            if (messages && messages.length > 0) {
              requestForm.setError(field as keyof ForgotPasswordInput, {
                type: "server",
                message: messages[0],
              });
            }
          }
        }
      }
    });
  };

  const handleResetSubmit = async (data: ResetPasswordInput) => {
    setServerError(null);
    startTransition(async () => {
      const result = await resetPasswordAction(data);
      if (result.success) {
        setStep("success");
      } else {
        if (result.error) setServerError(result.error);
        if (result.fieldErrors) {
          for (const [field, messages] of Object.entries(result.fieldErrors)) {
            if (messages && messages.length > 0) {
              resetForm.setError(field as keyof ResetPasswordInput, {
                type: "server",
                message: messages[0],
              });
            }
          }
        }
      }
    });
  };

  const handleResendCode = () => {
    if (!pendingEmail) return;
    setServerError(null);
    startTransition(async () => {
      const result = await requestPasswordResetAction({ email: pendingEmail });
      if (result.success) {
        setCountdown(600);
      } else {
        setServerError(result.error || "Failed to resend code");
      }
    });
  };

  const handleChangeEmail = () => {
    setStep("request");
    setServerError(null);
    resetForm.reset();
    requestForm.reset();
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const maskEmail = (email: string) => {
    if (!email) return "";
    const [local, domain] = email.split("@");
    if (!domain || local.length <= 2) return email;
    const visible = local.slice(0, 2);
    const masked = "*".repeat(Math.max(local.length - 2, 1));
    return `${visible}${masked}@${domain}`;
  };

  return (
    <Card className="w-full max-w-md shadow-lg">
      <CardHeader className="space-y-1">
        <div className="flex items-center justify-center mb-2">
          <div className="p-2 rounded-full bg-primary/10">
            {step === "success" ? (
              <CheckCircle2 className="h-8 w-8 text-primary" />
            ) : (
              <KeyRound className="h-8 w-8 text-primary" />
            )}
          </div>
        </div>
        <CardTitle className="text-2xl text-center font-bold">
          {step === "success" ? "Password reset" : "Forgot your password?"}
        </CardTitle>
        <CardDescription className="text-center">
          {step === "request" &&
            "Enter the email associated with your account and we'll send you a reset code."}
          {step === "verify" &&
            "Enter the 6-digit code we sent to your email and choose a new password."}
          {step === "success" &&
            "Your password has been reset successfully. You can now sign in with your new password."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {serverError && (
          <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
            {serverError}
          </div>
        )}

        {step === "request" && (
          <form
            onSubmit={requestForm.handleSubmit(handleRequestSubmit)}
            className="space-y-4"
          >
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@example.com"
                  className="pl-10"
                  autoComplete="email"
                  {...requestForm.register("email")}
                />
              </div>
              {requestForm.formState.errors.email && (
                <p className="text-sm text-destructive">
                  {requestForm.formState.errors.email.message}
                </p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending code...
                </>
              ) : (
                "Send reset code"
              )}
            </Button>

            <div className="text-center">
              <Link
                href="/login"
                className="inline-flex items-center text-sm text-muted-foreground hover:text-primary"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to sign in
              </Link>
            </div>
          </form>
        )}

        {step === "verify" && (
          <form
            onSubmit={resetForm.handleSubmit(handleResetSubmit)}
            className="space-y-4"
          >
            <p className="text-center text-xs text-muted-foreground">
              A 6-digit code has been sent to{" "}
              <strong>{maskEmail(pendingEmail)}</strong>
            </p>

            <div className="space-y-2">
              <label htmlFor="otp" className="text-sm font-medium">
                Reset code
              </label>
              <div className="relative">
                <Shield className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="otp"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  placeholder="Enter 6-digit code"
                  className="pl-10 text-center text-lg tracking-widest font-mono"
                  {...resetForm.register("otp")}
                />
              </div>
              {resetForm.formState.errors.otp && (
                <p className="text-sm text-destructive">
                  {resetForm.formState.errors.otp.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">
                New password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter a new password"
                  className="pl-10"
                  autoComplete="new-password"
                  {...resetForm.register("password")}
                />
              </div>
              {resetForm.formState.errors.password && (
                <p className="text-sm text-destructive">
                  {resetForm.formState.errors.password.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="confirmPassword" className="text-sm font-medium">
                Confirm new password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Re-enter your new password"
                  className="pl-10"
                  autoComplete="new-password"
                  {...resetForm.register("confirmPassword")}
                />
              </div>
              {resetForm.formState.errors.confirmPassword && (
                <p className="text-sm text-destructive">
                  {resetForm.formState.errors.confirmPassword.message}
                </p>
              )}
            </div>

            <div className="flex items-center justify-between text-sm">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleChangeEmail}
                disabled={isPending}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Change email
              </Button>

              <div className="flex items-center gap-2">
                {countdown > 0 ? (
                  <span className="text-muted-foreground">
                    Resend in {formatTime(countdown)}
                  </span>
                ) : (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleResendCode}
                    disabled={isPending}
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Resend code
                  </Button>
                )}
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Resetting password...
                </>
              ) : (
                "Reset password"
              )}
            </Button>
          </form>
        )}

        {step === "success" && (
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-muted text-sm text-muted-foreground text-center">
              Your password for <strong>{maskEmail(pendingEmail)}</strong> has
              been updated. For your security, any other active sessions have
              been signed out.
            </div>

            <Link href="/login" className="block">
              <Button className="w-full">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Return to sign in
              </Button>
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}