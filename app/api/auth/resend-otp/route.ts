import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import prisma from "@/lib/prisma";
import resend from "@/lib/resend";
import { OtpEmailTemplate } from "@/app/emails/otp-template";

const OTP_EXPIRY_MINUTES = 10;

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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
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
      return NextResponse.json(
        { error: emailResult.error || "Failed to send verification code" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Resend OTP error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
