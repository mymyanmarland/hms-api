import "dotenv/config";
import { PrismaClient, StaffRole } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({ adapter });

async function main() {
  const email = "mymyanmarland@gmail.com";

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw new Error(`No user found with email ${email}`);
  }

  const existing = await prisma.staff.findUnique({ where: { userId: user.id } });
  if (existing) {
    console.log("Staff record already exists. Updating role to ADMIN.");
    const updated = await prisma.staff.update({
      where: { userId: user.id },
      data: { role: StaffRole.ADMIN },
    });
    console.log(JSON.stringify(updated, null, 2));
    return;
  }

  const staff = await prisma.staff.create({
    data: {
      firstName: "System",
      lastName: "Admin",
      email,
      phone: null,
      role: StaffRole.ADMIN,
      userId: user.id,
    },
  });

  console.log("Created ADMIN staff record:");
  console.log(JSON.stringify(staff, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
