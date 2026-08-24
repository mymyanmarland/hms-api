import "dotenv/config";
import prisma from "@/lib/prisma";

async function main() {
  const email = "mymyanmarland@gmail.com";
  const user = await prisma.user.findUnique({ where: { email } });
  console.log("User:", JSON.stringify(user, null, 2));

  if (user) {
    const accounts = await prisma.account.findMany({ where: { userId: user.id } });
    console.log("\nAccounts:", JSON.stringify(accounts, null, 2));

    const staff = await prisma.staff.findUnique({ where: { email } });
    console.log("\nStaff:", JSON.stringify(staff, null, 2));

    const bcrypt = (await import("bcryptjs")).default;
    const cred = accounts.find((a) => a.providerId === "credential");
    if (cred?.password) {
      const ok = await bcrypt.compare("Admin@123456", cred.password);
      console.log("\nbcrypt.compare('Admin@123456') =>", ok);
      console.log("Hash prefix:", cred.password.slice(0, 7));
    } else {
      console.log("\nNo credential account found.");
    }
  }
}

main().finally(() => prisma.$disconnect());