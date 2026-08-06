import "dotenv/config";
import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({ adapter });

async function main() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      emailVerified: true,
      staff: { select: { id: true, role: true, firstName: true, lastName: true } },
    },
  });

  console.log(`Total users: ${users.length}`);
  console.log(JSON.stringify(users, null, 2));

  const adminStaff = users.filter((u) => u.staff?.role === "ADMIN");
  console.log(`\n--- Users with ADMIN role: ${adminStaff.length} ---`);
  console.log(JSON.stringify(adminStaff, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
