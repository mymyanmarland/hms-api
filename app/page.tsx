import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import prisma from "@/lib/prisma";

export default async function HomePage() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("session")?.value;

  if (sessionToken) {
    try {
      const session = await prisma.session.findUnique({
        where: { token: sessionToken },
      });

      if (session && session.expiresAt > new Date()) {
        redirect("/dashboard");
      }
    } catch {
      // Session check failed, continue to login
    }
  }

  redirect("/login");
}
