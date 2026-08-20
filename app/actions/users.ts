"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import resend from "@/lib/resend";
import { getFromAddress } from "@/lib/mail";
import { UserInviteTemplate } from "@/app/emails/user-invite-template";
import {
  createUserSchema,
  updateUserSchema,
  userIdSchema,
  type CreateUserInput,
  type UpdateUserInput,
  type UserIdInput,
} from "@/lib/validations/users";
import {
  requireAdminOrThrow,
  type AdminActor,
} from "@/lib/admin-auth";
import { writeAuditLog } from "@/lib/audit";
import { isSuperAdmin } from "@/lib/permissions";
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

async function sendUserInviteEmail(
  to: string,
  name: string,
  temporaryPassword: string,
): Promise<void> {
  if (process.env.RESEND_DEV_LOG_OTP?.toLowerCase() === "true") {
    console.log("\n" + "=".repeat(60));
    console.log("[DEV] User invite (email not sent)");
    console.log(`[DEV] To: ${to}`);
    console.log(`[DEV] Temporary password: ${temporaryPassword}`);
    console.log("=".repeat(60) + "\n");
    return;
  }

  try {
    await resend.emails.send({
      from: getFromAddress(),
      to,
      subject: "You have been invited to HMS",
      react: UserInviteTemplate({
        userName: name,
        userEmail: to,
        temporaryPassword,
        loginUrl: `${getLoginUrl()}/login`,
      }),
    });
  } catch (error) {
    console.error("Failed to send user invite email:", error);
    throw new Error("Failed to send user invite email");
  }
}

// ---------------------------------------------------------------------------
// Create a customer user (Super Admin only)
// ---------------------------------------------------------------------------
export async function createUserAction(
  input: CreateUserInput,
): Promise<ActionResponse<{ userId: string }>> {
  const parsed = createUserSchema.safeParse(input);
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
    return { success: false, error: "You do not have permission to create users." };
  }

  // Only Super Admins can manually create customer accounts.
  const isSuper = await isSuperAdmin(actor.user.id);
  if (!isSuper) {
    return {
      success: false,
      error: "Only Super Admins can create customer accounts.",
    };
  }

  const { name, email, temporaryPassword } = parsed.data;
  const normalizedEmail = email.toLowerCase();

  try {
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: {
        id: true,
        staff: { select: { id: true } },
      },
    });

    if (existingUser) {
      const message = existingUser.staff
        ? "An admin account already uses this email."
        : "An account with this email already exists.";
      return {
        success: false,
        fieldErrors: { email: [message] },
      };
    }

    const hashedPassword = await bcrypt.hash(temporaryPassword, 12);

    const created = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          id: `user_${Date.now()}`,
          name,
          email: normalizedEmail,
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

      return { userId: user.id };
    });

    await writeAuditLog({
      action: "INVITE",
      actorStaffId: actor.staff.id,
      targetUserId: created.userId,
      metadata: { email: normalizedEmail, source: "user_management_super_admin" },
    });

    try {
      await sendUserInviteEmail(normalizedEmail, name, temporaryPassword);
    } catch (error) {
      console.error("User invite email failed:", error);
      revalidatePath("/dashboard/users");
      return {
        success: true,
        data: created,
        error:
          "User was created but we could not send the invite email. Share the temporary password manually.",
      };
    }

    revalidatePath("/dashboard/users");
    return { success: true, data: created };
  } catch (error) {
    console.error("Create user error:", error);
    return {
      success: false,
      error: "We could not create that user. Please try again.",
    };
  }
}


// ---------------------------------------------------------------------------
// Update user profile
// ---------------------------------------------------------------------------
export async function updateUserAction(
  input: UpdateUserInput,
): Promise<ActionResponse> {
  const parsed = updateUserSchema.safeParse(input);
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
    return { success: false, error: "You do not have permission to edit users." };
  }

  const { userId, name, email } = parsed.data;
  const nextEmail = email.toLowerCase();

  try {
    const existing = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        staff: { select: { id: true } },
      },
    });

    if (!existing) {
      return { success: false, error: "User not found." };
    }

    if (existing.staff) {
      return {
        success: false,
        error: "This account belongs to an admin. Edit it from Admin Management instead.",
      };
    }

    const emailChanged = existing.email !== nextEmail;
    if (emailChanged) {
      const conflict = await prisma.user.findFirst({
        where: { email: nextEmail, NOT: { id: userId } },
        select: { id: true },
      });
      if (conflict) {
        return {
          success: false,
          fieldErrors: { email: ["Another account already uses this email."] },
        };
      }
    }

    const previousName = existing.name;
    const previousEmail = existing.email;

    await prisma.user.update({
      where: { id: userId },
      data: {
        name,
        email: nextEmail,
      },
    });

    await writeAuditLog({
      action: "UPDATE",
      actorStaffId: actor.staff.id,
      targetUserId: userId,
      metadata: {
        changedFields: {
          name: previousName !== name,
          email: emailChanged,
        },
        previousName,
        previousEmail: emailChanged ? previousEmail : undefined,
      },
    });

    revalidatePath("/dashboard/users");
    return { success: true };
  } catch (error) {
    console.error("Update user error:", error);
    return {
      success: false,
      error: "We could not update that user. Please try again.",
    };
  }
}

// ---------------------------------------------------------------------------
// Deactivate (revoke all sessions)
// ---------------------------------------------------------------------------
export async function deactivateUserAction(
  input: UserIdInput,
): Promise<ActionResponse> {
  const parsed = userIdSchema.safeParse(input);
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
    return { success: false, error: "You do not have permission to deactivate users." };
  }

  const { userId } = parsed.data;

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        staff: { select: { id: true } },
        _count: { select: { sessions: true } },
      },
    });

    if (!user) {
      return { success: false, error: "User not found." };
    }

    if (user.staff) {
      return {
        success: false,
        error: "This account belongs to an admin. Use Admin Management instead.",
      };
    }

    const { count } = await prisma.session.deleteMany({
      where: { userId },
    });

    await writeAuditLog({
      action: "REVOKE_SESSIONS",
      actorStaffId: actor.staff.id,
      targetUserId: userId,
      metadata: { email: user.email, revokedSessionCount: count },
    });

    revalidatePath("/dashboard/users");
    return { success: true };
  } catch (error) {
    console.error("Deactivate user error:", error);
    return {
      success: false,
      error: "We could not revoke that user's sessions. Please try again.",
    };
  }
}

// ---------------------------------------------------------------------------
// Delete user (hard delete)
// ---------------------------------------------------------------------------
export async function deleteUserAction(
  input: UserIdInput,
): Promise<ActionResponse> {
  const parsed = userIdSchema.safeParse(input);
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
    return { success: false, error: "You do not have permission to delete users." };
  }

  const { userId } = parsed.data;

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        staff: { select: { id: true } },
        guest: { select: { id: true } },
      },
    });

    if (!user) {
      return { success: false, error: "User not found." };
    }

    if (user.staff) {
      return {
        success: false,
        error: "This account belongs to an admin. Use Admin Management instead.",
      };
    }

    await writeAuditLog({
      action: "DELETE",
      actorStaffId: actor.staff.id,
      targetUserId: userId,
      metadata: { email: user.email, detachedGuestId: user.guest?.id ?? null },
    });

    await prisma.$transaction(async (tx) => {
      await tx.session.deleteMany({ where: { userId } });
      await tx.account.deleteMany({ where: { userId } });
      await tx.otpCode.deleteMany({ where: { userId } });
      if (user.guest) {
        await tx.guest.update({
          where: { id: user.guest.id },
          data: { userId: null },
        });
      }
      // Ban the email so the mobile app's auto-signup flow cannot resurrect
      // this account on the next sign-in attempt.
      await tx.bannedEmail.upsert({
        where: { email: user.email },
        create: {
          email: user.email,
          reason: "deleted_by_admin",
          bannedById: actor.staff.id,
        },
        update: {
          reason: "deleted_by_admin",
          bannedById: actor.staff.id,
        },
      });
      await tx.user.delete({ where: { id: userId } });
    });

    revalidatePath("/dashboard/users");
    return { success: true };
  } catch (error) {
    console.error("Delete user error:", error);
    return {
      success: false,
      error: "We could not delete that user. Please try again.",
    };
  }
}

// Re-export the type so client components can import it from a single place.
export type { ActionResponse } from "@/app/actions/password-reset";
