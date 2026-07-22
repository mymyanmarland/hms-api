import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({
  adapter,
});

const ADMIN_EMAIL = "admin@hms.com";
const ADMIN_PASSWORD = "Admin@123456";
const ADMIN_NAME = "System Admin";

async function seedAdmin() {
  console.log("Starting admin seed...");

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
    console.log("Please change the password after first login.");
  } catch (error) {
    console.error("Error seeding admin:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

seedAdmin();
