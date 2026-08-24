import "dotenv/config";
import { hashPassword } from "@better-auth/utils/password";
import prisma from "@/lib/prisma";

const TARGET_EMAIL = process.argv[2] ?? "mymyanmarland@gmail.com";
const NEW_PASSWORD = process.argv[3] ?? "Admin@123456";

async function resetPassword() {
  console.log(`Resetting password for: ${TARGET_EMAIL}`);
  console.log(`Setting password to:    ${NEW_PASSWORD}\n`);

  try {
    const user = await prisma.user.findUnique({
      where: { email: TARGET_EMAIL },
      select: { id: true, email: true, name: true, staff: true },
    });

    if (!user) {
      console.error(`ERROR: No user found with email: ${TARGET_EMAIL}`);
      const allUsers = await prisma.user.findMany({
        select: { email: true, name: true },
        take: 20,
      });
      console.log("\nAvailable user emails:");
      allUsers.forEach((u) => console.log(`  - ${u.email} (${u.name})`));
      return;
    }

    console.log(`Found user:`);
    console.log(`  ID:    ${user.id}`);
    console.log(`  Name:  ${user.name}`);
    console.log(`  Email: ${user.email}`);
    console.log(`  Staff: ${user.staff ? `${user.staff.firstName} ${user.staff.lastName} (role=${user.staff.role}, active=${user.staff.isActive})` : "none"}\n`);

    const hashed = await hashPassword(NEW_PASSWORD);

    const result = await prisma.account.updateMany({
      where: { userId: user.id, providerId: "credential" },
      data: { password: hashed },
    });

    if (result.count === 0) {
      console.warn("WARNING: No credential account was updated. Creating one...");
      await prisma.account.create({
        data: {
          id: `acc_${Date.now()}`,
          userId: user.id,
          accountId: user.id,
          providerId: "credential",
          password: hashed,
        },
      });
    }

    await prisma.session.deleteMany({ where: { userId: user.id } });

    console.log(`SUCCESS: Password reset (Better Auth scrypt hash) and all sessions revoked.`);
    console.log(`\nYou can now log in with:`);
    console.log(`  Email:    ${user.email}`);
    console.log(`  Password: ${NEW_PASSWORD}`);
    console.log(`\nHash prefix: ${hashed.slice(0, 30)}...`);
  } catch (error) {
    console.error("Error resetting password:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

resetPassword();