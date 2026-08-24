import "dotenv/config";
import { verifyPassword } from "@better-auth/utils/password";
import prisma from "@/lib/prisma";

async function main() {
  const email = "mymyanmarland@gmail.com";
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return console.log("No user");

  const account = await prisma.account.findFirst({
    where: { userId: user.id, providerId: "credential" },
  });
  if (!account?.password) return console.log("No credential account for this user");

  console.log("Hash:", account.password);
  try {
    const ok = await verifyPassword(account.password, "Admin@123456");
    console.log("verifyPassword('Admin@123456') =>", ok);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.log("verifyPassword threw:", msg);
  }
}

main().finally(() => prisma.$disconnect());