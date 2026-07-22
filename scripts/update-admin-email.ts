import "dotenv/config";
import prisma from "@/lib/prisma";

async function updateAdminEmail() {
  const NEW_EMAIL = "mymyanmarland@gmail.com";
  
  try {
    const admin = await prisma.user.findFirst({
      where: { email: "admin@hms.com" }
    });

    if (!admin) {
      console.log("Admin user not found");
      return;
    }

    await prisma.user.update({
      where: { id: admin.id },
      data: { email: NEW_EMAIL }
    });

    console.log(`Admin email updated to: ${NEW_EMAIL}`);
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

updateAdminEmail();
