"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import {
  updateUserSchema,
  userIdSchema,
  type UpdateUserInput,
  type UserIdInput,
} from "@/lib/validations/users";
import {
  requireAdminOrThrow,
  type AdminActor,
} from "@/lib/admin-auth";
import { writeAuditLog } from "@/lib/audit";
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
