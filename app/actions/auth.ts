"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import { loginSchema, verifyOtpSchema, resendOtpSchema } from "@/lib/validations/auth";
import resend from "@/lib/resend";
import { OtpEmailTemplate } from "@/app/emails/otp-template";

const OTP_EXPIRY_MINUTES = 10;
const OTP_LENGTH = 6;

function generateOtpCode(): string {
  return crypto.randomInt(100000, 999999).toString();
}

async function sendOtpEmail(email: string, otpCode: string) {
  try {
    await resend.emails.send({
      from: "HMS Admin <onboarding@resend.dev>",
      to: email,
      subject: "Your HMS Admin Login Verification Code",
      react: OtpEmailTemplate({ otpCode, userEmail: email }),
    });
    return { success: true };
  } catch (error) {
    console.error("Failed to send OTP email:", error);
    return { success: false, error: "Failed to send verification email" };
  }
}

export async function initiateLogin(
  prevState: { error?: string; fieldErrors?: Record<string, string[]> },
  formData: FormData
) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  const parsed = loginSchema.safeParse({ email, password });

  if (!parsed.success) {
    const fieldErrors: Record<string, string[]> = {};
    for (const error of parsed.error.errors) {
      const field = error.path[0] as string;
      if (!fieldErrors[field]) {
        fieldErrors[field] = [];
      }
      fieldErrors[field].push(error.message);
    }
    return { error: "Validation failed", fieldErrors };
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return { error: "Invalid email or password" };
    }

    const account = await prisma.account.findFirst({
      where: {
        userId: user.id,
        providerId: "credential",
      },
    });

    if (!account?.password) {
      return { error: "Invalid email or password" };
    }

    const isValidPassword = await bcrypt.compare(password, account.password);
    if (!isValidPassword) {
      return { error: "Invalid email or password" };
    }

    const existingOtps = await prisma.otpCode.findMany({
      where: { email, expiresAt: { gt: new Date() } },
    });
    for (const otp of existingOtps) {
      await prisma.otpCode.delete({ where: { id: otp.id } });
    }

    const otpCode = generateOtpCode();
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

    await prisma.otpCode.create({
      data: {
        email,
        code: otpCode,
        expiresAt,
        userId: user.id,
      },
    });

    const emailResult = await sendOtpEmail(email, otpCode);
    if (!emailResult.success) {
      return { error: emailResult.error || "Failed to send verification code" };
    }

    return {
      success: true,
      step: "otp",
      email,
    };
  } catch (error) {
    console.error("Login error:", error);
    return { error: "An unexpected error occurred" };
  }
}

export async function verifyOtp(
  prevState: { error?: string; fieldErrors?: Record<string, string[]> },
  formData: FormData
) {
  const email = formData.get("email") as string;
  const code = formData.get("code") as string;

  const parsed = verifyOtpSchema.safeParse({ email, code });

  if (!parsed.success) {
    const fieldErrors: Record<string, string[]> = {};
    for (const error of parsed.error.errors) {
      const field = error.path[0] as string;
      if (!fieldErrors[field]) {
        fieldErrors[field] = [];
      }
      fieldErrors[field].push(error.message);
    }
    return { error: "Validation failed", fieldErrors };
  }

  try {
    const otpRecord = await prisma.otpCode.findFirst({
      where: {
        email,
        code,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
    });

    if (!otpRecord) {
      return { error: "Invalid or expired verification code" };
    }

    await prisma.otpCode.delete({ where: { id: otpRecord.id } });

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return { error: "User not found" };
    }

    const sessionToken = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() * 24 * 60 * 60 * 1000);

    await prisma.session.create({
      data: {
        id: crypto.randomUUID(),
        userId: user.id,
        token: sessionToken,
        expiresAt,
      },
    });

    const cookieStore = await cookies();
    cookieStore.set("session", sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      expires: expiresAt,
      path: "/",
    });

    redirect("/dashboard");
  } catch (error) {
    if ((error as Error).message === "NEXT_REDIRECT") {
      throw error;
    }
    console.error("OTP verification error:", error);
    return { error: "An unexpected error occurred" };
  }
}

export async function resendOtp(
  prevState: { error?: string },
  formData: FormData
) {
  const email = formData.get("email") as string;

  const parsed = resendOtpSchema.safeParse({ email });

  if (!parsed.success) {
    return { error: "Invalid email address" };
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return { error: "User not found" };
    }

    await prisma.otpCode.deleteMany({
      where: { email, expiresAt: { gt: new Date() } },
    });

    const otpCode = generateOtpCode();
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

    await prisma.otpCode.create({
      data: {
        email,
        code: otpCode,
        expiresAt,
        userId: user.id,
      },
    });

    const emailResult = await sendOtpEmail(email, otpCode);
    if (!emailResult.success) {
      return { error: emailResult.error || "Failed to send verification code" };
    }

    return { success: true };
  } catch (error) {
    console.error("Resend OTP error:", error);
    return { error: "An unexpected error occurred" };
  }
}

export async function logout() {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get("session")?.value;

    if (sessionToken) {
      await prisma.session.deleteMany({
        where: { token: sessionToken },
      });
    }

    cookieStore.delete("session");
    redirect("/login");
  } catch (error) {
    if ((error as Error).message === "NEXT_REDIRECT") {
      throw error;
    }
    console.error("Logout error:", error);
    redirect("/login");
  }
}
