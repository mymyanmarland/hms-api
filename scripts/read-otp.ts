import "dotenv/config";
import prisma from "../lib/prisma";

async function readLatestOtp(email: string) {
  const record = await prisma.otpCode.findFirst({
    where: { email },
    orderBy: { createdAt: "desc" },
    select: { code: true, expiresAt: true },
  });
  console.log(JSON.stringify(record, null, 2));
}

async function main() {
  await readLatestOtp(process.argv[2] ?? "admin@hms.com");
  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exit(1);
});