import "dotenv/config";
import prisma from "@/lib/prisma";

const TARGET_EMAIL = "mymyanmarland@gmail.com";

async function promoteToSuperAdmin() {
  console.log(`Promoting staff with email: ${TARGET_EMAIL}`);
  console.log("Starting promotion to Super Admin...\n");

  try {
    // Find the staff member
    const staff = await prisma.staff.findUnique({
      where: { email: TARGET_EMAIL.toLowerCase() },
      include: {
        adminRole: true,
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (!staff) {
      console.error(`ERROR: No staff found with email: ${TARGET_EMAIL}`);
      console.log("\nAvailable staff emails:");
      const allStaff = await prisma.staff.findMany({
        select: { email: true, firstName: true, lastName: true },
        take: 20,
      });
      allStaff.forEach((s) => {
        console.log(`  - ${s.email} (${s.firstName} ${s.lastName})`);
      });
      return;
    }

    console.log(`Found staff member:`);
    console.log(`  ID: ${staff.id}`);
    console.log(`  Name: ${staff.firstName} ${staff.lastName}`);
    console.log(`  Email: ${staff.email}`);
    console.log(`  Role: ${staff.role}`);
    console.log(`  Is Active: ${staff.isActive}`);
    console.log(`  User ID: ${staff.userId}`);
    if (staff.user) {
      console.log(`  User Name: ${staff.user.name}`);
      console.log(`  User Email: ${staff.user.email}`);
    }
    console.log(`  Current Role: ${staff.adminRole?.name || "None"}`);

    // Find the Super Admin role
    const superAdminRole = await prisma.role.findUnique({
      where: { name: "super_admin" },
    });

    if (!superAdminRole) {
      console.error("\nERROR: Super Admin role not found!");
      console.log("Please run the seed script first: npm run db:seed-permissions");
      console.log("Or: npx tsx scripts/seed-permissions.ts");
      return;
    }

    console.log(`\nSuper Admin role found:`);
    console.log(`  ID: ${superAdminRole.id}`);
    console.log(`  Name: ${superAdminRole.name}`);
    console.log(`  Is Super Role: ${superAdminRole.isSuperRole}`);

    // Check if already assigned
    if (staff.adminRoleId === superAdminRole.id) {
      console.log("\nSUCCESS: Staff already has the Super Admin role!");
      return;
    }

    // Assign the Super Admin role
    const updatedStaff = await prisma.staff.update({
      where: { id: staff.id },
      data: {
        adminRoleId: superAdminRole.id,
        role: "ADMIN", // Ensure they have ADMIN role
      },
      include: {
        adminRole: true,
      },
    });

    console.log("\nSUCCESS: Staff has been promoted to Super Admin!");
    console.log(`\nUpdated staff member:`);
    console.log(`  ID: ${updatedStaff.id}`);
    console.log(`  Name: ${updatedStaff.firstName} ${updatedStaff.lastName}`);
    console.log(`  Assigned Role: ${updatedStaff.adminRole?.name || "None"}`);
    console.log(`  Is Super Role: ${updatedStaff.adminRole?.isSuperRole || false}`);

    console.log("\n" + "=".repeat(50));
    console.log("PROMOTION COMPLETE");
    console.log("=".repeat(50));
    console.log(`\nThe user ${TARGET_EMAIL} now has full Super Admin permissions.`);
    console.log("They can now access the Roles & Permissions management page.");
  } catch (error) {
    console.error("Error promoting to Super Admin:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
promoteToSuperAdmin()
  .then(() => {
    console.log("\nPromotion script completed successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\nPromotion script failed:", error);
    process.exit(1);
  });
