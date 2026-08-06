import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
import { listAdminsQuerySchema } from "@/lib/validations/admin";

export async function GET(request: NextRequest) {
  const actor = await requireAdmin();
  if (!actor) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const parsed = listAdminsQuerySchema.safeParse({
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
    role: "ADMIN" as const,
    ...(search
      ? {
          OR: [
            { firstName: { contains: search, mode: "insensitive" as const } },
            { lastName: { contains: search, mode: "insensitive" as const } },
            { email: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {}),
    ...(status === "active" ? { isActive: true } : {}),
    ...(status === "inactive" ? { isActive: false } : {}),
  };

  try {
    const admins = await prisma.staff.findMany({
      where,
      orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      include: {
        user: {
          select: {
            id: true,
            emailVerified: true,
            sessions: {
              orderBy: { expiresAt: "desc" },
              take: 1,
              select: { expiresAt: true },
            },
          },
        },
      },
    });

    let nextCursor: string | null = null;
    if (admins.length > limit) {
      const nextItem = admins.pop();
      nextCursor = nextItem?.id ?? null;
    }

    const total = await prisma.staff.count({ where });

    return NextResponse.json({
      data: admins.map((admin) => ({
        id: admin.id,
        userId: admin.userId,
        firstName: admin.firstName,
        lastName: admin.lastName,
        name: `${admin.firstName} ${admin.lastName}`.trim(),
        email: admin.email,
        phone: admin.phone,
        role: admin.role,
        isActive: admin.isActive,
        createdAt: admin.createdAt,
        emailVerified: admin.user?.emailVerified ?? false,
        lastActiveAt: admin.user?.sessions?.[0]?.expiresAt ?? null,
      })),
      nextCursor,
      total,
    });
  } catch (error) {
    console.error("List admins error:", error);
    return NextResponse.json(
      { error: "Failed to load admins" },
      { status: 500 },
    );
  }
}