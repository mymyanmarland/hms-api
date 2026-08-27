import { describe, it, expect } from "vitest";
import {
  createPermissionSchema,
  createRoleSchema,
  updateRoleSchema,
  listRolesQuerySchema,
  assignRoleSchema,
} from "@/lib/validations/roles";

describe("createPermissionSchema", () => {
  it("accepts a valid 'resource.action' name", () => {
    const r = createPermissionSchema.safeParse({
      name: "admin.create",
      resource: "admin",
      action: "create",
    });
    expect(r.success).toBe(true);
  });

  it("rejects name without dot separator", () => {
    const r = createPermissionSchema.safeParse({
      name: "admincreate",
      resource: "admin",
      action: "create",
    });
    expect(r.success).toBe(false);
  });

  it("rejects name with uppercase characters", () => {
    const r = createPermissionSchema.safeParse({
      name: "Admin.create",
      resource: "admin",
      action: "create",
    });
    expect(r.success).toBe(false);
  });

  it("rejects resource with digits", () => {
    const r = createPermissionSchema.safeParse({
      name: "admin1.create",
      resource: "admin1",
      action: "create",
    });
    expect(r.success).toBe(false);
  });

  it("rejects empty description when provided is too long", () => {
    const r = createPermissionSchema.safeParse({
      name: "admin.create",
      resource: "admin",
      action: "create",
      description: "x".repeat(256),
    });
    expect(r.success).toBe(false);
  });
});

describe("createRoleSchema", () => {
  it("accepts a valid role payload", () => {
    const r = createRoleSchema.safeParse({
      name: "front_desk",
      isSuperRole: false,
      permissionIds: ["perm-1", "perm-2"],
    });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.permissionIds).toEqual(["perm-1", "perm-2"]);
  });

  it("defaults isSuperRole to false when omitted", () => {
    const r = createRoleSchema.safeParse({ name: "front_desk" });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.isSuperRole).toBe(false);
  });

  it("rejects uppercase role name", () => {
    const r = createRoleSchema.safeParse({ name: "FrontDesk" });
    expect(r.success).toBe(false);
  });

  it("rejects empty role name", () => {
    const r = createRoleSchema.safeParse({ name: "" });
    expect(r.success).toBe(false);
  });

  it("rejects empty permissionId string", () => {
    const r = createRoleSchema.safeParse({ name: "front_desk", permissionIds: [""] });
    expect(r.success).toBe(false);
  });
});

describe("updateRoleSchema", () => {
  it("requires an id", () => {
    const r = updateRoleSchema.safeParse({ name: "housekeeping" });
    expect(r.success).toBe(false);
  });

  it("accepts a full update payload", () => {
    const r = updateRoleSchema.safeParse({
      id: "role-1",
      name: "housekeeping",
      description: "Cleaning crew",
      permissionIds: ["perm-3"],
    });
    expect(r.success).toBe(true);
  });
});

describe("listRolesQuerySchema", () => {
  it("defaults limit to 20", () => {
    const r = listRolesQuerySchema.safeParse({});
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.limit).toBe(20);
  });

  it("coerces limit from string", () => {
    const r = listRolesQuerySchema.safeParse({ limit: "30" });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.limit).toBe(30);
  });

  it("rejects limit > 50", () => {
    const r = listRolesQuerySchema.safeParse({ limit: "100" });
    expect(r.success).toBe(false);
  });

  it("rejects limit < 1", () => {
    const r = listRolesQuerySchema.safeParse({ limit: "0" });
    expect(r.success).toBe(false);
  });
});

describe("assignRoleSchema", () => {
  it("accepts staff + role ids", () => {
    const r = assignRoleSchema.safeParse({ staffId: "s-1", roleId: "r-1" });
    expect(r.success).toBe(true);
  });

  it("rejects empty staffId", () => {
    const r = assignRoleSchema.safeParse({ staffId: "", roleId: "r-1" });
    expect(r.success).toBe(false);
  });
});
