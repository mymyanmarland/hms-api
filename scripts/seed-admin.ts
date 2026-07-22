import "dotenv/config";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";

const ADMIN_EMAIL = "admin@hms.com";
const ADMIN_PASSWORD = "Admin@123456";
const ADMIN_NAME = "System Admin";

async function seedAdmin() {
  console.log("Starting admin seed...");
  console.log("Database URL:", process.env.DATABASE_URL ? "Set" : "Not set");

  try {
    const existingAdmin = await prisma.user.findUnique({
      where: { email: ADMIN_EMAIL },
    });

    if (existingAdmin) {
      console.log("Admin user already exists. Updating password...");

      const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 12);

      await prisma.account.updateMany({
        where: { userId: existingAdmin.id },
        data: { password: hashedPassword },
      });

      console.log("Admin password updated successfully!");
      return;
    }

    const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 12);

    const adminUser = await prisma.user.create({
      data: {
        id: `admin_${Date.now()}`,
        name: ADMIN_NAME,
        email: ADMIN_EMAIL,
        emailVerified: true,
      },
    });

    await prisma.account.create({
      data: {
        id: `acc_${Date.now()}`,
        userId: adminUser.id,
        accountId: adminUser.id,
        providerId: "credential",
        password: hashedPassword,
      },
    });

    console.log("Admin user created successfully!");
    console.log(`Email: ${ADMIN_EMAIL}`);
    console.log(`Password: ${ADMIN_PASSWORD}`);
  } catch (error) {
    console.error("Error seeding admin:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

seedAdmin();
