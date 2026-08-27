"use client";

import { createAuthClient } from "better-auth/react";
import { emailOTPClient } from "better-auth/client/plugins";

/**
 * Better-auth client used by interactive booking-widget components to
 * trigger email-OTP sign-in. Cookies set by the resulting session are
 * automatically attached to subsequent server-action calls, so the
 * server can read the active user via its cookie store.
 */
export const authClient = createAuthClient({
  baseURL:
    typeof window === "undefined"
      ? process.env.NEXT_PUBLIC_APP_URL ?? process.env.BETTER_AUTH_URL ?? ""
      : window.location.origin,
  plugins: [emailOTPClient()],
});
