import { describe, it, expect } from "vitest";
import {
  createGroupBookingSchema,
  updateGroupBookingSchema,
  listGroupBookingsQuerySchema,
  receiveDepositSchema,
} from "@/lib/validations/group-booking";

const E = (local: string, domain = "example.com") => local + "\u0040" + domain;

const baseCreate = {
  groupName: "Smith Wedding",
  groupType: "WEDDING",
  contactName: "John Smith",
  contactEmail: E("john"),
  roomsBlocked: 10,
  discountPercent: 5,
  depositRequired: false,
};

describe("createGroupBookingSchema", () => {
  it("accepts a valid group booking payload", () => {
    const r = createGroupBookingSchema.safeParse(baseCreate);
    expect(r.success).toBe(true);
  });

  it("rejects missing group name", () => {
    const r = createGroupBookingSchema.safeParse({ ...baseCreate, groupName: "" });
    expect(r.success).toBe(false);
  });

  it("rejects invalid group type", () => {
    const r = createGroupBookingSchema.safeParse({ ...baseCreate, groupType: "BAD_TYPE" });
    expect(r.success).toBe(false);
  });

  it("rejects discount > 100", () => {
    const r = createGroupBookingSchema.safeParse({ ...baseCreate, discountPercent: 150 });
    expect(r.success).toBe(false);
  });

  it("rejects negative discount", () => {
    const r = createGroupBookingSchema.safeParse({ ...baseCreate, discountPercent: -1 });
    expect(r.success).toBe(false);
  });

  it("rejects roomsBlocked = 0", () => {
    const r = createGroupBookingSchema.safeParse({ ...baseCreate, roomsBlocked: 0 });
    expect(r.success).toBe(false);
  });

  it("rejects roomsBlocked > 100", () => {
    const r = createGroupBookingSchema.safeParse({ ...baseCreate, roomsBlocked: 101 });
    expect(r.success).toBe(false);
  });

  it("rejects malformed contactEmail", () => {
    const r = createGroupBookingSchema.safeParse({ ...baseCreate, contactEmail: "not-email" });
    expect(r.success).toBe(false);
  });

  it("rejects malformed depositDueDate", () => {
    const r = createGroupBookingSchema.safeParse({
      ...baseCreate,
      depositRequired: true,
      depositAmount: 100,
      depositDueDate: "March 8 2026",
    });
    expect(r.success).toBe(false);
  });

  it("rejects malformed bookingCutoffDate", () => {
    const r = createGroupBookingSchema.safeParse({
      ...baseCreate,
      bookingCutoffDate: "not-a-date",
    });
    expect(r.success).toBe(false);
  });
});

describe("updateGroupBookingSchema", () => {
  it("accepts an empty-update payload (id only)", () => {
    const r = updateGroupBookingSchema.safeParse({ groupBookingId: "gb-1" });
    expect(r.success).toBe(true);
  });

  it("rejects missing id", () => {
    const r = updateGroupBookingSchema.safeParse({ groupName: "Renamed" });
    expect(r.success).toBe(false);
  });

  it("accepts partial updates with valid types", () => {
    const r = updateGroupBookingSchema.safeParse({
      groupBookingId: "gb-1",
      status: "COMPLETED",
      notes: "All done",
    });
    expect(r.success).toBe(true);
  });
});

describe("listGroupBookingsQuerySchema", () => {
  it("accepts an empty query (defaults)", () => {
    const r = listGroupBookingsQuerySchema.safeParse({});
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.status).toBe("ALL");
      expect(r.data.limit).toBe(10);
    }
  });

  it("coerces limit from string", () => {
    const r = listGroupBookingsQuerySchema.safeParse({ limit: "25" });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.limit).toBe(25);
  });

  it("rejects limit > 50", () => {
    const r = listGroupBookingsQuerySchema.safeParse({ limit: "100" });
    expect(r.success).toBe(false);
  });
});

describe("receiveDepositSchema", () => {
  it("accepts a valid deposit", () => {
    const r = receiveDepositSchema.safeParse({
      groupBookingId: "gb-1",
      amount: 100,
      paymentMethod: "CASH",
    });
    expect(r.success).toBe(true);
  });

  it("rejects amount = 0", () => {
    const r = receiveDepositSchema.safeParse({
      groupBookingId: "gb-1",
      amount: 0,
      paymentMethod: "CASH",
    });
    expect(r.success).toBe(false);
  });

  it("rejects negative amount", () => {
    const r = receiveDepositSchema.safeParse({
      groupBookingId: "gb-1",
      amount: -50,
      paymentMethod: "CASH",
    });
    expect(r.success).toBe(false);
  });

  it("rejects unknown payment method", () => {
    const r = receiveDepositSchema.safeParse({
      groupBookingId: "gb-1",
      amount: 100,
      paymentMethod: "CRYPTO",
    });
    expect(r.success).toBe(false);
  });
});
