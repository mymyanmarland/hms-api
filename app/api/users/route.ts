import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
import { listUsersQuerySchema } from "@/lib/validations/users";

export async function GET(request: NextRequest) {
  const actor = await requireAdmin();
  if (!actor) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const parsed = listUsersQuerySchema.safeParse({
    search: searchParams.get("search") ?? undefined,
    status: searchParams.get("status") ?? undefined,
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

  const { search, status, cursor, limit } = parsed.data;

  const where = {
    staff: null,
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" as const } },
            { email: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {}),
    ...(status === "active"
      ? {
          sessions: {
            some: { expiresAt: { gt: new Date() } },
          },
        }
      : {}),
    ...(status === "inactive"
      ? {
          sessions: {
            none: { expiresAt: { gt: new Date() } },
          },
        }
      : {}),
  };

  try {
    const users = await prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      include: {
        guest: {
          select: {
            id: true,
            phone: true,
            isVip: true,
            loyaltyPoints: true,
          },
        },
        sessions: {
          orderBy: { expiresAt: "desc" },
          take: 1,
          select: { expiresAt: true },
        },
        _count: {
          select: { sessions: true },
        },
      },
    });

    let nextCursor: string | null = null;
    if (users.length > limit) {
      const nextItem = users.pop();
      nextCursor = nextItem?.id ?? null;
    }

    const total = await prisma.user.count({ where });

    const now = new Date();
    return NextResponse.json({
      data: users.map((user) => {
        const lastSession = user.sessions?.[0]?.expiresAt ?? null;
        const isActive = lastSession ? lastSession > now : false;
        return {
          id: user.id,
          name: user.name,
          email: user.email,
          emailVerified: user.emailVerified,
          createdAt: user.createdAt,
          lastActiveAt: lastSession ? lastSession.toISOString() : null,
          isActive,
          sessionCount: user._count.sessions,
          hasGuestProfile: !!user.guest,
          guestId: user.guest?.id ?? null,
          phone: user.guest?.phone ?? null,
          isVip: user.guest?.isVip ?? false,
          loyaltyPoints: user.guest?.loyaltyPoints ?? 0,
        };
      }),
      nextCursor,
      total,
    });
  } catch (error) {
    console.error("List users error:", error);
    return NextResponse.json(
      { error: "Failed to load users" },
      { status: 500 },
    );
  }
}
