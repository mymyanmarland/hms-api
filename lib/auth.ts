import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { emailOTP } from "better-auth/plugins";
import prisma from "@/lib/prisma";
import resend from "@/lib/resend";
import { PasswordResetOtpTemplate } from "@/app/emails/password-reset-otp-template";

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60,
    },
  },
  emailAndPassword: {
    enabled: true,
    revokeSessionsOnPasswordReset: true,
  },
  plugins: [
    emailOTP({
      otpLength: 6,
      expiresIn: 60 * 10,
      allowedAttempts: 3,
      storeOTP: "hashed",
      disableSignUp: true,
      overrideDefaultEmailVerification: false,
      rateLimit: {
        window: 60,
        max: 3,
      },
      sendVerificationOTP: async ({ email, otp, type }) => {
        if (type !== "forget-password") {
          return;
        }

        try {
          await resend.emails.send({
            from: "HMS Admin <onboarding@resend.dev>",
            to: email,
            subject: "Your HMS Admin Password Reset Code",
            react: PasswordResetOtpTemplate({ otpCode: otp, userEmail: email }),
          });
        } catch (error) {
          console.error("Failed to send password reset email:", error);
          throw new Error("Failed to send password reset email");
        }
      },
    }),
  ],
});