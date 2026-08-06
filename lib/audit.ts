import prisma from "@/lib/prisma";
import type { AdminAction, Prisma } from "@/app/generated/prisma/client";

export type AuditLogInput = {
  action: AdminAction;
  actorStaffId?: string | null;
  targetStaffId?: string | null;
  targetUserId?: string | null;
  metadata?: Prisma.InputJsonValue;
};

/**
 * Persists a single row in the `AdminAuditLog` table. Errors are caught and
 * logged so audit write failures never block the primary user-facing action,
 * but we still surface them to the console for monitoring.
 */
export async function writeAuditLog(input: AuditLogInput): Promise<void> {
  try {
    await prisma.adminAuditLog.create({
      data: {
        action: input.action,
        actorStaffId: input.actorStaffId ?? null,
        targetStaffId: input.targetStaffId ?? null,
        targetUserId: input.targetUserId ?? null,
        metadata: input.metadata ?? undefined,
      },
    });
  } catch (error) {
    console.error("Failed to write admin audit log:", error);
  }
}