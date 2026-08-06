import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
import { listAdminAuditQuerySchema } from "@/lib/validations/admin";

export async function GET(request: NextRequest) {
  const actor = await requireAdmin();
  if (!actor) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const parsed = listAdminAuditQuerySchema.safeParse({
    cursor: searchParams.get("cursor") ?? undefined,
    limit: searchParams.get("limit") ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid query parameters",
        fieldErrors: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  const { cursor, limit } = parsed.data;

  try {
    const logs = await prisma.adminAuditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      include: {
        actorStaff: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        targetStaff: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    let nextCursor: string | null = null;
    if (logs.length > limit) {
      const nextItem = logs.pop();
      nextCursor = nextItem?.id ?? null;
    }

    return NextResponse.json({
      data: logs.map((log) => ({
        id: log.id,
        action: log.action,
        createdAt: log.createdAt,
        metadata: log.metadata,
        actor: log.actorStaff
          ? {
              id: log.actorStaff.id,
              name: `${log.actorStaff.firstName} ${log.actorStaff.lastName}`.trim(),
              email: log.actorStaff.email,
            }
          : null,
        target: log.targetStaff
          ? {
              id: log.targetStaff.id,
              name: `${log.targetStaff.firstName} ${log.targetStaff.lastName}`.trim(),
              email: log.targetStaff.email,
            }
          : null,
      })),
      nextCursor,
    });
  } catch (error) {
    console.error("List admin audit log error:", error);
    return NextResponse.json(
      { error: "Failed to load activity log" },
      { status: 500 },
    );
  }
}