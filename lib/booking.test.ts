import { describe, it, expect } from "vitest";
import { generateConfirmationCode, formatBookingAmount } from "@/lib/booking";
import { Prisma } from "@/app/generated/prisma/client";

describe("generateConfirmationCode", () => {
  it("starts with 'HMS-' prefix", () => {
    const code = generateConfirmationCode();
    expect(code.startsWith("HMS-")).toBe(true);
  });

  it("contains the current UTC year", () => {
    const code = generateConfirmationCode();
    const year = new Date().getUTCFullYear();
    expect(code).toContain(`-${year}-`);
  });

  it("produces exactly 6 characters in the suffix", () => {
    const code = generateConfirmationCode();
    const suffix = code.split("-")[2];
    expect(suffix).toHaveLength(6);
  });

  it("uses only unambiguous alphanumeric characters (no 0, O, 1, I)", () => {
    // Run multiple iterations to ensure randomness is bounded by the alphabet.
    for (let i = 0; i < 50; i += 1) {
      const code = generateConfirmationCode();
      const suffix = code.split("-")[2];
      expect(suffix).toMatch(/^[A-HJ-NP-Z2-9]+$/);
    }
  });

  it("generates different codes on subsequent calls (probabilistic)", () => {
    const codes = new Set<string>();
    for (let i = 0; i < 100; i += 1) codes.add(generateConfirmationCode());
    // With 32^6 ≈ 1 billion possibilities, collisions in 100 trials are astronomically unlikely.
    expect(codes.size).toBe(100);
  });
});

describe("formatBookingAmount", () => {
  it("formats whole numbers without cents (e.g. '$150')", () => {
    expect(formatBookingAmount(150)).toBe("$150");
    expect(formatBookingAmount(0)).toBe("$0");
  });

  it("formats fractional numbers with cents", () => {
    // Intl trims trailing zeros when minimumFractionDigits=0, so 150.5 renders as "$150.5"
    // and 99.95 renders as "$99.95".
    expect(formatBookingAmount(150.5)).toBe("$150.5");
    expect(formatBookingAmount(99.95)).toBe("$99.95");
    expect(formatBookingAmount(0.99)).toBe("$0.99");
  });

  it("formats negative numbers with a leading minus sign", () => {
    expect(formatBookingAmount(-15)).toBe("-$15");
  });

  it("formats string numbers by parsing first", () => {
    expect(formatBookingAmount("250")).toBe("$250");
    expect(formatBookingAmount("99.95")).toBe("$99.95");
  });

  it("formats Prisma Decimal instances (treats as number)", () => {
    const decimal = new Prisma.Decimal("1234.56");
    expect(formatBookingAmount(decimal)).toBe("$1,234.56");
  });

  it("uses USD currency and en-US locale (e.g. ',' thousands sep)", () => {
    expect(formatBookingAmount(1500000)).toBe("$1,500,000");
  });
});
