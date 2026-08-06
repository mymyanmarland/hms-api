import "dotenv/config";
import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({ adapter });

async function main() {
  const email = "admin@hms.com";

  const user = await prisma.user.findUnique({
    where: { email },
    include: { staff: true },
  });

  if (!user) {
    console.log(`No user found with email ${email}. Nothing to delete.`);
    return;
  }

  console.log("Found user to delete:");
  console.log(JSON.stringify(user, null, 2));

  if (user.staff) {
    console.log(`Deleting linked staff record (${user.staff.id})...`);
    await prisma.staff.delete({ where: { id: user.staff.id } });
  }

  console.log("Deleting sessions...");
  await prisma.session.deleteMany({ where: { userId: user.id } });

  console.log("Deleting accounts...");
  await prisma.account.deleteMany({ where: { userId: user.id } });

  console.log("Deleting user...");
  await prisma.user.delete({ where: { id: user.id } });

  console.log(`\nDeleted user ${email} successfully.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });