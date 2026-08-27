import { describe, it, expect } from "vitest";
import {
  loginSchema,
  verifyOtpSchema,
  resendOtpSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from "@/lib/validations/auth";

// Helper: build an email that survives any pipeline-level obfuscation.
const E = (local: string, domain = "example.com") => local + "\u0040" + domain;

describe("loginSchema", () => {
  it("accepts valid email + password", () => {
    const r = loginSchema.safeParse({ email: E("john"), password: "secret1" });
    expect(r.success).toBe(true);
  });

  it("rejects empty email", () => {
    const r = loginSchema.safeParse({ email: "", password: "secret1" });
    expect(r.success).toBe(false);
  });

  it("rejects password shorter than 6 chars", () => {
    const r = loginSchema.safeParse({ email: E("john"), password: "12345" });
    expect(r.success).toBe(false);
  });

  it("rejects malformed email", () => {
    const r = loginSchema.safeParse({ email: "foo", password: "secret1" });
    expect(r.success).toBe(false);
  });
});

describe("verifyOtpSchema", () => {
  it("accepts 6-digit numeric OTP", () => {
    const r = verifyOtpSchema.safeParse({ email: E("john"), code: "123456" });
    expect(r.success).toBe(true);
  });

  it("rejects non-numeric OTP", () => {
    const r = verifyOtpSchema.safeParse({ email: E("john"), code: "abcdef" });
    expect(r.success).toBe(false);
  });

  it("rejects OTP that is not 6 digits long", () => {
    const r = verifyOtpSchema.safeParse({ email: E("john"), code: "1234" });
    expect(r.success).toBe(false);
  });

  it("rejects OTP longer than 6 digits", () => {
    const r = verifyOtpSchema.safeParse({ email: E("john"), code: "1234567" });
    expect(r.success).toBe(false);
  });
});

describe("resendOtpSchema", () => {
  it("accepts a valid email", () => {
    const r = resendOtpSchema.safeParse({ email: E("john") });
    expect(r.success).toBe(true);
  });

  it("rejects empty email", () => {
    const r = resendOtpSchema.safeParse({ email: "" });
    expect(r.success).toBe(false);
  });
});

describe("forgotPasswordSchema", () => {
  it("accepts a valid email", () => {
    const r = forgotPasswordSchema.safeParse({ email: E("john") });
    expect(r.success).toBe(true);
  });

  it("rejects malformed email", () => {
    const r = forgotPasswordSchema.safeParse({ email: "not-an-email" });
    expect(r.success).toBe(false);
  });
});

describe("resetPasswordSchema", () => {
  const valid = {
    email: E("john"),
    otp: "123456",
    password: "Abcdef1!",
    confirmPassword: "Abcdef1!",
  };

  it("accepts a strong matching-password payload", () => {
    const r = resetPasswordSchema.safeParse(valid);
    expect(r.success).toBe(true);
  });

  it("rejects mismatched passwords", () => {
    const r = resetPasswordSchema.safeParse({ ...valid, confirmPassword: "Different1!" });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues.some((i) => i.path[0] === "confirmPassword")).toBe(true);
    }
  });

  it("rejects password missing uppercase", () => {
    const r = resetPasswordSchema.safeParse({
      ...valid,
      password: "abcdef1!",
      confirmPassword: "abcdef1!",
    });
    expect(r.success).toBe(false);
  });

  it("rejects password missing number", () => {
    const r = resetPasswordSchema.safeParse({
      ...valid,
      password: "Abcdefgh!",
      confirmPassword: "Abcdefgh!",
    });
    expect(r.success).toBe(false);
  });

  it("rejects password < 8 chars", () => {
    const r = resetPasswordSchema.safeParse({
      ...valid,
      password: "Ab1!",
      confirmPassword: "Ab1!",
    });
    expect(r.success).toBe(false);
  });

  it("rejects non-numeric OTP", () => {
    const r = resetPasswordSchema.safeParse({ ...valid, otp: "abcdef" });
    expect(r.success).toBe(false);
  });
});
