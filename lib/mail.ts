import nodemailer, { type Transporter } from "nodemailer";

/**
 * Shared mail transport used by the auth OTP pipeline.
 *
 * The Resend transport is preferred when a sender is configured via
 * `RESEND_FROM_EMAIL` (e.g. `HMS Booking <support@hms-api-kmn.online>`).
 * Once that domain is verified inside Resend, OTP emails will land in the
 * user's real Gmail inbox regardless of which recipient they're registering
 * with. We fall back to Gmail SMTP only when Resend isn't configured.
 *
 * If neither is configured, the transport returns `null` so callers can
 * decide whether to log the OTP to the console instead of sending.
 */

export interface SendMailArgs {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface MailTransport {
  /** True when the transport can deliver to arbitrary recipients. */
  readonly ready: boolean;
  /** Human-readable identifier for logs. */
  readonly kind: "gmail" | "resend" | "none";
  sendMail(args: SendMailArgs): Promise<void>;
}

const RESEND_API_KEY = process.env.RESEND_API_KEY?.trim();
const RESEND_FROM_EMAIL =
  process.env.RESEND_FROM_EMAIL?.trim() || "HMS Booking <onboarding@resend.dev>";
const GMAIL_USER = process.env.GMAIL_USER?.trim();
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD?.trim();

/**
 * Single source of truth for the `from` address used by every email path
 * (Better Auth OTP hook + admin invite + credential/resend-OTP routes).
 * Reads `RESEND_FROM_EMAIL` so the value can be changed in one place
 * (`hms-api/.env`) without code edits.
 */
export function getFromAddress(): string {
  return RESEND_FROM_EMAIL;
}

let cachedTransport: MailTransport | null = null;

async function buildResendTransport(): Promise<MailTransport | null> {
  if (!RESEND_API_KEY) return null;

  // Lazy-load Resend so the Gmail path doesn't pull it in unnecessarily.
  const { Resend } = await import("resend");
  const resend = new Resend(RESEND_API_KEY);

  // `ready: true` if the from address is on a custom (verifiable) domain,
  // otherwise Resend's onboarding sender will reject arbitrary recipients.
  const isVerifiedDomain = !RESEND_FROM_EMAIL.includes("@resend.dev");
  const fromDisplay = getFromAddress();

  return {
    ready: isVerifiedDomain,
    kind: "resend",
    async sendMail({ to, subject, html }) {
      await resend.emails.send({
        from: fromDisplay,
        to,
        subject,
        html,
      });
    },
  };
}

function buildGmailTransport(): MailTransport | null {
  if (!GMAIL_USER || !GMAIL_APP_PASSWORD) return null;

  const transporter: Transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
      user: GMAIL_USER,
      pass: GMAIL_APP_PASSWORD,
    },
  });

  return {
    ready: true,
    kind: "gmail",
    async sendMail({ to, subject, html, text }) {
      await transporter.sendMail({
        from: `HMS Booking <${GMAIL_USER}>`,
        to,
        subject,
        html,
        text: text ?? stripHtml(html),
      });
    },
  };
}

function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export async function getMailTransport(): Promise<MailTransport> {
  if (cachedTransport) return cachedTransport;

  // Prefer Resend (with the verified sender from `RESEND_FROM_EMAIL`) so
  // OTPs land in the user's real Gmail inbox.
  const resend = await buildResendTransport();
  if (resend) {
    cachedTransport = resend;
    return resend;
  }

  const gmail = buildGmailTransport();
  if (gmail) {
    cachedTransport = gmail;
    return gmail;
  }

  cachedTransport = {
    ready: false,
    kind: "none",
    async sendMail() {
      throw new Error("No mail transport is configured.");
    },
  };
  return cachedTransport;
}

export default getMailTransport;