import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import bcrypt from "bcryptjs";
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
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    const account = await prisma.account.findFirst({
      where: {
        userId: user.id,
        providerId: "credential",
      },
    });

    if (!account?.password) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    const isValidPassword = await bcrypt.compare(password, account.password);
    if (!isValidPassword) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
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
      return NextResponse.json(
        { error: emailResult.error || "Failed to send verification code" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      step: "otp",
      email,
    });
  } catch (error) {
    console.error("Credentials verification error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
