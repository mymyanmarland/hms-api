import { cookies } from "next/headers";
import prisma from "@/lib/prisma";
import type { Staff, User } from "@/app/generated/prisma/client";

export type AdminActor = {
  user: User;
  staff: Staff;
};

export type SidebarUserData = {
  name: string;
  email: string;
  avatar: string;
};

/**
 * Resolves the active session from the cookie store and returns the
 * associated admin actor (User + Staff) if (and only if) the linked staff
 * row has the ADMIN role. Returns `null` for any unknown / non-admin user.
 *
 * Use this in every Server Action or API route that needs admin privileges.
 */
export async function requireAdmin(): Promise<AdminActor | null> {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("session")?.value;

  if (!sessionToken) {
    return null;
  }

  const session = await prisma.session.findUnique({
    where: { token: sessionToken },
    include: {
      user: {
        include: {
          staff: true,
        },
      },
    },
  });

  if (!session || session.expiresAt < new Date()) {
    return null;
  }

  const user = session.user;
  const staff = user.staff;

  if (!staff || staff.role !== "ADMIN" || !staff.isActive) {
    return null;
  }

  return { user, staff };
}

/**
 * Same as {@link requireAdmin} but throws a tagged error if the caller is
 * not authenticated as an admin. Use only inside `try/catch` blocks where
 * you want a clean translation to a 403 / forbidden action response.
 */
export class AdminForbiddenError extends Error {
  constructor(message = "Admin access required") {
    super(message);
    this.name = "AdminForbiddenError";
  }
}

export async function requireAdminOrThrow(): Promise<AdminActor> {
  const actor = await requireAdmin();
  if (!actor) {
    throw new AdminForbiddenError();
  }
  return actor;
}

/**
 * Resolve the current session and return a minimal payload suitable for
 * passing into <AppSidebar /> so the footer user chip renders the right
 * initials/name/email/avatar. Returns `null` if the session is missing or
 * expired so the caller can redirect (rather than silently showing a
 * "Loading..." placeholder).
 */
export async function getSidebarUserData(): Promise<SidebarUserData | null> {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("session")?.value;

  if (!sessionToken) {
    return null;
  }

  const session = await prisma.session.findUnique({
    where: { token: sessionToken },
    include: {
      user: {
        include: {
          staff: true,
        },
      },
    },
  });

  if (!session || session.expiresAt < new Date()) {
    return null;
  }

  const user = session.user;
  const userName = user.staff
    ? `${user.staff.firstName} ${user.staff.lastName}`.trim()
    : user.name;

  return {
    name: userName || user.email,
    email: user.email,
    avatar: user.image || "",
  };
}
