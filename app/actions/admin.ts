"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import resend from "@/lib/resend";
import { getFromAddress } from "@/lib/mail";
import { AdminInviteTemplate } from "@/app/emails/admin-invite-template";
import {
  inviteAdminSchema,
  updateAdminSchema,
  staffIdSchema,
  resetAdminPasswordSchema,
  type InviteAdminInput,
  type UpdateAdminInput,
  type StaffIdInput,
  type ResetAdminPasswordInput,
} from "@/lib/validations/admin";
import {
  requireAdmin,
  requireAdminOrThrow,
  AdminForbiddenError,
  type AdminActor,
} from "@/lib/admin-auth";
import { writeAuditLog } from "@/lib/audit";
import {
  hasPermission,
  requirePermission,
} from "@/lib/permissions";
import type { ActionResponse } from "@/app/actions/password-reset";

function flattenZodErrors(
  errors: Record<string, string[] | undefined>,
): Record<string, string[]> {
  const result: Record<string, string[]> = {};
  for (const [key, value] of Object.entries(errors)) {
    if (value && value.length > 0) {
      result[key] = value;
    }
  }
  return result;
}

function getLoginUrl(): string {
  return (
    process.env.BETTER_AUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
  ).replace(/\/$/, "");
}

async function sendAdminInviteEmail(
  to: string,
  name: string,
  temporaryPassword: string,
): Promise<void> {
  if (process.env.RESEND_DEV_LOG_OTP?.toLowerCase() === "true") {
    console.log("\n" + "=".repeat(60));
    console.log("[DEV] Admin invite (email not sent)");
    console.log(`[DEV] To: ${to}`);
    console.log(`[DEV] Temporary password: ${temporaryPassword}`);
    console.log("=".repeat(60) + "\n");
    return;
  }

  try {
    await resend.emails.send({
      from: getFromAddress(),
      to,
      subject: "You have been invited to HMS Admin",
      react: AdminInviteTemplate({
        adminName: name,
        adminEmail: to,
        temporaryPassword,
        loginUrl: `${getLoginUrl()}/login`,
      }),
    });
  } catch (error) {
    console.error("Failed to send admin invite email:", error);
    throw new Error("Failed to send admin invite email");
  }
}

// ---------------------------------------------------------------------------
// Invite a new admin
// ---------------------------------------------------------------------------
export async function inviteAdminAction(
  input: InviteAdminInput,
): Promise<ActionResponse<{ staffId: string; userId: string }>> {
  const parsed = inviteAdminSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      fieldErrors: flattenZodErrors(parsed.error.flatten().fieldErrors),
    };
  }

  let actor: AdminActor;
  try {
    actor = await requireAdminOrThrow();
  } catch {
    return { success: false, error: "You do not have permission to invite admins." };
  }

  // Check permission
  const hasPerm = await hasPermission(actor.user.id, "admin.create");
  if (!hasPerm) {
    return { success: false, error: "You do not have permission to invite admins." };
  }

  const { name, email, phone, temporaryPassword } = parsed.data;

  try {
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: { id: true, staff: { select: { id: true } } },
    });

    if (existingUser) {
      return {
        success: false,
        fieldErrors: {
          email: ["An account with this email already exists."],
        },
      };
    }

    const hashedPassword = await bcrypt.hash(temporaryPassword, 12);

    const created = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          id: `admin_${Date.now()}`,
          name,
          email: email.toLowerCase(),
          emailVerified: false,
        },
        select: { id: true },
      });

      await tx.account.create({
        data: {
          id: `acc_${Date.now()}`,
          userId: user.id,
          accountId: user.id,
          providerId: "credential",
          password: hashedPassword,
        },
      });

      const [firstName, ...lastParts] = name.trim().split(/\s+/);
      const lastName = lastParts.length > 0 ? lastParts.join(" ") : "-";

      const staff = await tx.staff.create({
        data: {
          firstName: firstName ?? name,
          lastName,
          email: email.toLowerCase(),
          phone: phone ?? null,
          role: "ADMIN",
          isActive: true,
          userId: user.id,
        },
        select: { id: true },
      });

      return { userId: user.id, staffId: staff.id };
    });

    await writeAuditLog({
      action: "INVITE",
      actorStaffId: actor.staff.id,
      targetStaffId: created.staffId,
      targetUserId: created.userId,
      metadata: { email: email.toLowerCase() },
    });

    try {
      await sendAdminInviteEmail(email.toLowerCase(), name, temporaryPassword);
    } catch (error) {
      console.error("Invite email failed:", error);
      // Admin user is already created; surface a warning to the UI.
      revalidatePath("/dashboard/admins");
      return {
        success: true,
        data: created,
        error:
          "Admin was created but we could not send the invite email. Share the temporary password manually.",
      };
    }

    revalidatePath("/dashboard/admins");
    return { success: true, data: created };
  } catch (error) {
    console.error("Invite admin error:", error);
    return {
      success: false,
      error: "We could not invite that admin. Please try again.",
    };
  }
}

// ---------------------------------------------------------------------------
// Update admin profile
// ---------------------------------------------------------------------------
export async function updateAdminAction(
  input: UpdateAdminInput,
): Promise<ActionResponse> {
  const parsed = updateAdminSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      fieldErrors: flattenZodErrors(parsed.error.flatten().fieldErrors),
    };
  }

  let actor: AdminActor;
  try {
    actor = await requireAdminOrThrow();
  } catch {
    return { success: false, error: "You do not have permission to edit admins." };
  }

  // Check permission
  const hasPerm = await hasPermission(actor.user.id, "admin.update");
  if (!hasPerm) {
    return { success: false, error: "You do not have permission to edit admins." };
  }

  const { staffId, userId, name, email, phone, isActive } = parsed.data;

  try {
    const existing = await prisma.staff.findUnique({
      where: { id: staffId },
      include: { user: true },
    });

    if (!existing || existing.role !== "ADMIN") {
      return { success: false, error: "Admin not found." };
    }

    if (!existing.user || existing.user.id !== userId) {
      return { success: false, error: "Admin record is inconsistent." };
    }

    const [firstName, ...lastParts] = name.trim().split(/\s+/);
    const lastName = lastParts.length > 0 ? lastParts.join(" ") : "-";

    const emailChanged = existing.email !== email.toLowerCase();
    const nextEmail = email.toLowerCase();

    if (emailChanged) {
      const conflict = await prisma.staff.findFirst({
        where: { email: nextEmail, NOT: { id: staffId } },
        select: { id: true },
      });
      if (conflict) {
        return {
          success: false,
          fieldErrors: { email: ["Another admin already uses this email."] },
        };
      }
      const userConflict = await prisma.user.findFirst({
        where: { email: nextEmail, NOT: { id: userId } },
        select: { id: true },
      });
      if (userConflict) {
        return {
          success: false,
          fieldErrors: { email: ["Another account already uses this email."] },
        };
      }
    }

    // Prevent deactivating the last active admin
    if (!isActive && existing.isActive) {
      const remaining = await prisma.staff.count({
        where: { role: "ADMIN", isActive: true, NOT: { id: staffId } },
      });
      if (remaining === 0) {
        return {
          success: false,
          fieldErrors: {
            isActive: ["Cannot deactivate the last active admin."],
          },
        };
      }
    }

    await prisma.$transaction(async (tx) => {
      await tx.staff.update({
        where: { id: staffId },
        data: {
          firstName: firstName ?? name,
          lastName,
          email: nextEmail,
          phone: phone ?? null,
          isActive,
        },
      });

      await tx.user.update({
        where: { id: userId },
        data: {
          name,
          email: nextEmail,
        },
      });
    });

    // If the admin was deactivated, revoke all their sessions.
    if (!isActive && existing.isActive) {
      await prisma.session.deleteMany({ where: { userId } });
    }

    await writeAuditLog({
      action: "UPDATE",
      actorStaffId: actor.staff.id,
      targetStaffId: staffId,
      targetUserId: userId,
      metadata: {
        changedFields: {
          name:
            existing.firstName + " " + existing.lastName !==
            `${firstName ?? name} ${lastName}`.trim(),
          email: emailChanged,
          phone: (existing.phone ?? null) !== (phone ?? null),
          isActive: existing.isActive !== isActive,
        },
      },
    });

    revalidatePath("/dashboard/admins");
    return { success: true };
  } catch (error) {
    console.error("Update admin error:", error);
    return {
      success: false,
      error: "We could not update that admin. Please try again.",
    };
  }
}

// ---------------------------------------------------------------------------
// Deactivate / Reactivate
// ---------------------------------------------------------------------------
export async function deactivateAdminAction(
  input: StaffIdInput,
): Promise<ActionResponse> {
  const parsed = staffIdSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      fieldErrors: flattenZodErrors(parsed.error.flatten().fieldErrors),
    };
  }

  let actor: AdminActor;
  try {
    actor = await requireAdminOrThrow();
  } catch {
    return { success: false, error: "You do not have permission to deactivate admins." };
  }

  // Check permission
  const hasPerm = await hasPermission(actor.user.id, "admin.deactivate");
  if (!hasPerm) {
    return { success: false, error: "You do not have permission to deactivate admins." };
  }

  const { staffId } = parsed.data;

  try {
    const staff = await prisma.staff.findUnique({
      where: { id: staffId },
      include: { user: true },
    });

    if (!staff || staff.role !== "ADMIN") {
      return { success: false, error: "Admin not found." };
    }

    if (staffId === actor.staff.id) {
      return {
        success: false,
        error: "You cannot deactivate your own account.",
      };
    }

    if (!staff.isActive) {
      return { success: true };
    }

    const remaining = await prisma.staff.count({
      where: { role: "ADMIN", isActive: true, NOT: { id: staffId } },
    });
    if (remaining === 0) {
      return {
        success: false,
        error: "Cannot deactivate the last active admin.",
      };
    }

    await prisma.staff.update({
      where: { id: staffId },
      data: { isActive: false },
    });

    if (staff.userId) {
      await prisma.session.deleteMany({ where: { userId: staff.userId } });
    }

    await writeAuditLog({
      action: "DEACTIVATE",
      actorStaffId: actor.staff.id,
      targetStaffId: staffId,
      targetUserId: staff.userId ?? null,
    });

    revalidatePath("/dashboard/admins");
    return { success: true };
  } catch (error) {
    console.error("Deactivate admin error:", error);
    return {
      success: false,
      error: "We could not deactivate that admin. Please try again.",
    };
  }
}

export async function reactivateAdminAction(
  input: StaffIdInput,
): Promise<ActionResponse> {
  const parsed = staffIdSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      fieldErrors: flattenZodErrors(parsed.error.flatten().fieldErrors),
    };
  }

  let actor: AdminActor;
  try {
    actor = await requireAdminOrThrow();
  } catch {
    return { success: false, error: "You do not have permission to reactivate admins." };
  }

  // Check permission
  const hasPerm = await hasPermission(actor.user.id, "admin.reactivate");
  if (!hasPerm) {
    return { success: false, error: "You do not have permission to reactivate admins." };
  }

  const { staffId } = parsed.data;

  try {
    const staff = await prisma.staff.findUnique({
      where: { id: staffId },
      include: { user: true },
    });

    if (!staff || staff.role !== "ADMIN") {
      return { success: false, error: "Admin not found." };
    }

    if (staff.isActive) {
      return { success: true };
    }

    await prisma.staff.update({
      where: { id: staffId },
      data: { isActive: true },
    });

    await writeAuditLog({
      action: "REACTIVATE",
      actorStaffId: actor.staff.id,
      targetStaffId: staffId,
      targetUserId: staff.userId ?? null,
    });

    revalidatePath("/dashboard/admins");
    return { success: true };
  } catch (error) {
    console.error("Reactivate admin error:", error);
    return {
      success: false,
      error: "We could not reactivate that admin. Please try again.",
    };
  }
}

// ---------------------------------------------------------------------------
// Reset password
// ---------------------------------------------------------------------------
export async function resetAdminPasswordAction(
  input: ResetAdminPasswordInput,
): Promise<ActionResponse> {
  const parsed = resetAdminPasswordSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      fieldErrors: flattenZodErrors(parsed.error.flatten().fieldErrors),
    };
  }

  let actor: AdminActor;
  try {
    actor = await requireAdminOrThrow();
  } catch {
    return { success: false, error: "You do not have permission to reset passwords." };
  }

  // Check permission
  const hasPerm = await hasPermission(actor.user.id, "admin.reset_password");
  if (!hasPerm) {
    return { success: false, error: "You do not have permission to reset passwords." };
  }

  const { staffId, newPassword } = parsed.data;

  try {
    const staff = await prisma.staff.findUnique({
      where: { id: staffId },
      include: { user: true },
    });

    if (!staff || staff.role !== "ADMIN" || !staff.userId) {
      return { success: false, error: "Admin not found." };
    }

    const hashed = await bcrypt.hash(newPassword, 12);

    await prisma.$transaction(async (tx) => {
      await tx.account.updateMany({
        where: { userId: staff.userId!, providerId: "credential" },
        data: { password: hashed },
      });
      await tx.session.deleteMany({ where: { userId: staff.userId! } });
    });

    await writeAuditLog({
      action: "RESET_PASSWORD",
      actorStaffId: actor.staff.id,
      targetStaffId: staffId,
      targetUserId: staff.userId,
    });

    revalidatePath("/dashboard/admins");
    return { success: true };
  } catch (error) {
    console.error("Reset admin password error:", error);
    return {
      success: false,
      error: "We could not reset that password. Please try again.",
    };
  }
}

// ---------------------------------------------------------------------------
// Delete admin (hard delete)
// ---------------------------------------------------------------------------
export async function deleteAdminAction(
  input: StaffIdInput,
): Promise<ActionResponse> {
  const parsed = staffIdSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      fieldErrors: flattenZodErrors(parsed.error.flatten().fieldErrors),
    };
  }

  let actor: AdminActor;
  try {
    actor = await requireAdminOrThrow();
  } catch {
    return { success: false, error: "You do not have permission to delete admins." };
  }

  // Check permission
  const hasPerm = await hasPermission(actor.user.id, "admin.delete");
  if (!hasPerm) {
    return { success: false, error: "You do not have permission to delete admins." };
  }

  const { staffId } = parsed.data;

  try {
    const staff = await prisma.staff.findUnique({
      where: { id: staffId },
      include: { user: true },
    });

    if (!staff || staff.role !== "ADMIN") {
      return { success: false, error: "Admin not found." };
    }

    if (staffId === actor.staff.id) {
      return {
        success: false,
        error: "You cannot delete your own account.",
      };
    }

    const activeCount = await prisma.staff.count({
      where: { role: "ADMIN", NOT: { id: staffId } },
    });
    if (activeCount === 0) {
      return {
        success: false,
        error: "Cannot delete the last admin.",
      };
    }

    const targetUserId = staff.userId ?? null;

    await writeAuditLog({
      action: "DELETE",
      actorStaffId: actor.staff.id,
      targetStaffId: staffId,
      targetUserId,
    });

    if (staff.userId) {
      await prisma.$transaction(async (tx) => {
        await tx.session.deleteMany({ where: { userId: staff.userId! } });
        await tx.account.deleteMany({ where: { userId: staff.userId! } });
        await tx.staff.delete({ where: { id: staffId } });
        await tx.user.delete({ where: { id: staff.userId! } });
      });
    } else {
      await prisma.staff.delete({ where: { id: staffId } });
    }

    revalidatePath("/dashboard/admins");
    return { success: true };
  } catch (error) {
    console.error("Delete admin error:", error);
    return {
      success: false,
      error: "We could not delete that admin. Please try again.",
    };
  }
}

// Re-export the type so client components can import it from a single place.
export type { ActionResponse } from "@/app/actions/password-reset";

// Suppress unused-symbol lint for helpers only used in error translation paths.
export { AdminForbiddenError, requireAdmin };