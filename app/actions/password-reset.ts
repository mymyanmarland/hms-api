"use server";

import { auth } from "@/lib/auth";
import {
  forgotPasswordSchema,
  resetPasswordSchema,
  type ForgotPasswordInput,
  type ResetPasswordInput,
} from "@/lib/validations/auth";

export type ActionResponse<T = void> = {
  success: boolean;
  data?: T;
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

function flattenZodErrors(
  errors: Record<string, string[] | undefined>,
): Record<string, string[]> {
  const result: Record<string, string[]> = {};
  for (const [key, value] of Object.entries(errors)) {
    if (value && value.length > 0) {
      result[key] = value;
    }
  }
  return result;
}

export async function requestPasswordResetAction(
  input: ForgotPasswordInput,
): Promise<ActionResponse> {
  const parsed = forgotPasswordSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      fieldErrors: flattenZodErrors(parsed.error.flatten().fieldErrors),
    };
  }

  try {
    await auth.api.requestPasswordResetEmailOTP({
      body: {
        email: parsed.data.email,
      },
    });

    return { success: true };
  } catch (error) {
    console.error("Request password reset error:", error);
    return {
      success: false,
      error: "We could not start your password reset. Please try again.",
    };
  }
}

export async function resetPasswordAction(
  input: ResetPasswordInput,
): Promise<ActionResponse> {
  const parsed = resetPasswordSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      fieldErrors: flattenZodErrors(parsed.error.flatten().fieldErrors),
    };
  }

  try {
    await auth.api.resetPasswordEmailOTP({
      body: {
        email: parsed.data.email,
        otp: parsed.data.otp,
        password: parsed.data.password,
      },
    });

    return { success: true };
  } catch (error) {
    const message = (error as Error)?.message ?? "";
    if (
      message.includes("OTP_EXPIRED") ||
      message.toLowerCase().includes("expired")
    ) {
      return {
        success: false,
        error: "This reset code has expired. Please request a new one.",
      };
    }

    if (
      message.includes("INVALID_OTP") ||
      message.toLowerCase().includes("invalid")
    ) {
      return {
        success: false,
        error: "The reset code is incorrect. Please try again.",
      };
    }

    if (message.toLowerCase().includes("too many")) {
      return {
        success: false,
        error: "Too many attempts. Please request a new reset code.",
      };
    }

    console.error("Reset password error:", error);
    return {
      success: false,
      error: "We could not reset your password. Please try again.",
    };
  }
}