import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { emailOTP } from "better-auth/plugins";
import { render } from "@react-email/render";
import prisma from "@/lib/prisma";
import { getMailTransport, getFromAddress } from "@/lib/mail";
import { LoginOtpTemplate } from "@/app/emails/login-otp-template";
import { SignupOtpTemplate } from "@/app/emails/signup-otp-template";
import { PasswordResetOtpTemplate } from "@/app/emails/password-reset-otp-template";

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
  trustedOrigins: [
    process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
    // Expo Go / dev tools use the exp:// scheme and the host PC's LAN IP.
    "exp://",
    "exp://*",
    "http://localhost:8081",
    "http://localhost:19000",
    "http://localhost:19006",
    "http://192.168.*.*:*",
    "http://10.0.*.*:*",
  ],
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
    requireEmailVerification: true,
  },
  plugins: [
    emailOTP({
      otpLength: 6,
      expiresIn: 60 * 10,
      allowedAttempts: 3,
      storeOTP: "hashed",
      disableSignUp: false,
      sendVerificationOnSignUp: true,
      overrideDefaultEmailVerification: true,
      rateLimit: {
        window: 60,
        max: 3,
      },
      sendVerificationOTP: async ({ email, otp, type }) => {
        const label =
          type === "sign-in"
            ? "Sign-in"
            : type === "email-verification"
            ? "Sign-up verification"
            : type === "forget-password"
            ? "Password reset"
            : "Email change";

        if (process.env.RESEND_DEV_LOG_OTP?.toLowerCase() === "true") {
          console.log("\n" + "=".repeat(60));
          console.log(`[DEV] ${label} OTP (email not sent)`);
          console.log(`[DEV] To: ${email}`);
          console.log(`[DEV] OTP: ${otp}`);
          console.log("=".repeat(60) + "\n");
          return;
        }

        const subject =
          type === "sign-in"
            ? "Your HMS Booking login code"
            : type === "email-verification"
            ? "Confirm your HMS Booking account"
            : type === "forget-password"
            ? "Your HMS Admin Password Reset Code"
            : "Confirm your new email for HMS Booking";

        const reactElement =
          type === "sign-in" || type === "change-email"
            ? LoginOtpTemplate({ otpCode: otp, userEmail: email })
            : type === "email-verification"
            ? SignupOtpTemplate({ otpCode: otp, userEmail: email })
            : PasswordResetOtpTemplate({ otpCode: otp, userEmail: email });

        const html = await render(reactElement);

        try {
          const transport = await getMailTransport();
          const fromAddress = getFromAddress();
          console.log(
            `[mail] sending ${type} OTP via ${transport.kind} from "${fromAddress}" -> ${email}`
          );
          await transport.sendMail({ to: email, subject, html });
          console.log(`[mail] ${type} OTP delivered to ${email}`);
        } catch (error) {
          console.error("Failed to send OTP email:", error);
          throw new Error("Failed to send OTP email");
        }
      },
    }),
  ],
});