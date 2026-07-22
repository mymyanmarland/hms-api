"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Mail, Lock, Shield, ArrowLeft, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { loginSchema, verifyOtpSchema, type LoginInput, type VerifyOtpInput } from "@/lib/validations/auth";

type ActionState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
  success?: boolean;
  step?: string;
  email?: string;
};

interface LoginFormProps {
  onSuccess?: () => void;
}

export function LoginForm({ onSuccess }: LoginFormProps) {
  const [step, setStep] = useState<"credentials" | "otp">("credentials");
  const [email, setEmail] = useState("");
  const [pendingEmail, setPendingEmail] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);

  const credentialsForm = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const otpForm = useForm<VerifyOtpInput>({
    resolver: zodResolver(verifyOtpSchema),
    defaultValues: {
      email: "",
      code: "",
    },
  });

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleCredentialsSubmit = async (data: LoginInput) => {
    setIsPending(true);
    setServerError(null);

    try {
      const formData = new FormData();
      formData.append("email", data.email);
      formData.append("password", data.password);

      const response = await fetch("/api/auth/callback/credentials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        setPendingEmail(data.email);
        otpForm.setValue("email", data.email);
        setStep("otp");
        setCountdown(600);
      } else {
        const result = await response.json();
        setServerError(result.error || "Invalid credentials");
      }
    } catch (error) {
      setServerError("An unexpected error occurred");
    } finally {
      setIsPending(false);
    }
  };

  const handleOtpSubmit = async (data: VerifyOtpInput) => {
    setIsPending(true);
    setServerError(null);

    try {
      const formData = new FormData();
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
        }
      }
    } catch (error) {
      setServerError("An unexpected error occurred");
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
        body: new URLSearchParams({ email: pendingEmail }),
      });

      if (response.ok) {
        setCountdown(600);
      } else {
        const result = await response.json();
        setServerError(result.error || "Failed to resend code");
      }
    } catch (error) {
      setServerError("Failed to resend code");
    } finally {
      setIsPending(false);
    }
  };

  const handleBack = () => {
    setStep("credentials");
    setEmail("");
    setServerError(null);
    credentialsForm.reset();
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <Card className="w-full max-w-md shadow-lg">
      <CardHeader className="space-y-1">
        <div className="flex items-center justify-center mb-2">
          <div className="p-2 rounded-full bg-primary/10">
            <Shield className="h-8 w-8 text-primary" />
          </div>
        </div>
        <CardTitle className="text-2xl text-center font-bold">
          HMS Admin Login
        </CardTitle>
        <CardDescription className="text-center">
          {step === "credentials"
            ? "Enter your credentials to access the dashboard"
            : "Enter the verification code sent to your email"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {serverError && (
          <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
            {serverError}
          </div>
        )}

        {step === "credentials" ? (
          <form onSubmit={credentialsForm.handleSubmit(handleCredentialsSubmit)} className="space-y-4">
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
                  {...credentialsForm.register("email")}
                />
              </div>
              {credentialsForm.formState.errors.email && (
                <p className="text-sm text-destructive">
                  {credentialsForm.formState.errors.email.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  className="pl-10"
                  {...credentialsForm.register("password")}
                />
              </div>
              {credentialsForm.formState.errors.password && (
                <p className="text-sm text-destructive">
                  {credentialsForm.formState.errors.password.message}
                </p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                "Sign In"
              )}
            </Button>
          </form>
        ) : (
          <form onSubmit={otpForm.handleSubmit(handleOtpSubmit)} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="code" className="text-sm font-medium">
                Verification Code
              </label>
              <div className="relative">
                <Shield className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="code"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  placeholder="Enter 6-digit code"
                  className="pl-10 text-center text-lg tracking-widest font-mono"
                  {...otpForm.register("code")}
                />
              </div>
              {otpForm.formState.errors.code && (
                <p className="text-sm text-destructive">
                  {otpForm.formState.errors.code.message}
                </p>
              )}
            </div>

            <div className="flex items-center justify-between text-sm">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleBack}
                disabled={isPending}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
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
                    onClick={handleResendOtp}
                    disabled={isPending}
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Resend Code
                  </Button>
                )}
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                "Verify & Sign In"
              )}
            </Button>

            <p className="text-center text-xs text-muted-foreground">
              A 6-digit code has been sent to <strong>{pendingEmail}</strong>
            </p>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
