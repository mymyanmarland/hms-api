import "dotenv/config";
import prisma from "@/lib/prisma";

// Initial permissions for the HMS system
const INITIAL_PERMISSIONS = [
  // Admin management permissions
  { name: "admin.create", description: "Create new admin accounts", resource: "admin", action: "create" },
  { name: "admin.read", description: "View admin accounts", resource: "admin", action: "read" },
  { name: "admin.update", description: "Update admin account details", resource: "admin", action: "update" },
  { name: "admin.deactivate", description: "Deactivate admin accounts", resource: "admin", action: "deactivate" },
  { name: "admin.reactivate", description: "Reactivate admin accounts", resource: "admin", action: "reactivate" },
  { name: "admin.reset_password", description: "Reset admin passwords", resource: "admin", action: "reset_password" },
  { name: "admin.delete", description: "Delete admin accounts", resource: "admin", action: "delete" },
  { name: "admin.assign_role", description: "Assign roles to admins", resource: "admin", action: "assign_role" },

  // Staff management permissions
  { name: "staff.create", description: "Create new staff accounts", resource: "staff", action: "create" },
  { name: "staff.read", description: "View staff accounts", resource: "staff", action: "read" },
  { name: "staff.update", description: "Update staff account details", resource: "staff", action: "update" },
  { name: "staff.delete", description: "Delete staff accounts", resource: "staff", action: "delete" },

  // Role management permissions
  { name: "role.create", description: "Create new roles", resource: "role", action: "create" },
  { name: "role.read", description: "View roles", resource: "role", action: "read" },
  { name: "role.update", description: "Update role details and permissions", resource: "role", action: "update" },
  { name: "role.delete", description: "Delete roles", resource: "role", action: "delete" },

  // Permission management permissions
  { name: "permission.create", description: "Create new permissions", resource: "permission", action: "create" },
  { name: "permission.read", description: "View permissions", resource: "permission", action: "read" },
  { name: "permission.update", description: "Update permissions", resource: "permission", action: "update" },
  { name: "permission.delete", description: "Delete permissions", resource: "permission", action: "delete" },

  // Room management permissions
  { name: "room.create", description: "Create new rooms", resource: "room", action: "create" },
  { name: "room.read", description: "View rooms", resource: "room", action: "read" },
  { name: "room.update", description: "Update room details", resource: "room", action: "update" },
  { name: "room.delete", description: "Delete rooms", resource: "room", action: "delete" },

  // Booking management permissions
  { name: "booking.create", description: "Create new bookings", resource: "booking", action: "create" },
  { name: "booking.read", description: "View bookings", resource: "booking", action: "read" },
  { name: "booking.update", description: "Update booking details", resource: "booking", action: "update" },
  { name: "booking.delete", description: "Cancel/delete bookings", resource: "booking", action: "delete" },

  // Guest management permissions
  { name: "guest.create", description: "Create guest profiles", resource: "guest", action: "create" },
  { name: "guest.read", description: "View guest profiles", resource: "guest", action: "read" },
  { name: "guest.update", description: "Update guest profiles", resource: "guest", action: "update" },
  { name: "guest.delete", description: "Delete guest profiles", resource: "guest", action: "delete" },

  // Report permissions
  { name: "report.read", description: "View reports and analytics", resource: "report", action: "read" },
  { name: "report.export", description: "Export reports", resource: "report", action: "export" },

  // Night audit permissions
  { name: "night_audit.execute", description: "Execute night audit", resource: "night_audit", action: "execute" },
  { name: "night_audit.view", description: "View night audit results", resource: "night_audit", action: "view" },

  // Housekeeping permissions
  { name: "housekeeping.create", description: "Create housekeeping tasks", resource: "housekeeping", action: "create" },
  { name: "housekeeping.read", description: "View housekeeping tasks", resource: "housekeeping", action: "read" },
  { name: "housekeeping.update", description: "Update housekeeping tasks", resource: "housekeeping", action: "update" },
  { name: "housekeeping.delete", description: "Delete housekeeping tasks", resource: "housekeeping", action: "delete" },

  // Maintenance permissions
  { name: "maintenance.create", description: "Create maintenance tickets", resource: "maintenance", action: "create" },
  { name: "maintenance.read", description: "View maintenance tickets", resource: "maintenance", action: "read" },
  { name: "maintenance.update", description: "Update maintenance tickets", resource: "maintenance", action: "update" },
  { name: "maintenance.delete", description: "Delete maintenance tickets", resource: "maintenance", action: "delete" },

  // Billing permissions
  { name: "billing.read", description: "View billing and payments", resource: "billing", action: "read" },
  { name: "billing.charge", description: "Add charges to folios", resource: "billing", action: "charge" },
  { name: "billing.payment", description: "Process payments", resource: "billing", action: "payment" },
  { name: "billing.refund", description: "Process refunds", resource: "billing", action: "refund" },

  // Shift management permissions
  { name: "shift.create", description: "Create shifts", resource: "shift", action: "create" },
  { name: "shift.read", description: "View shifts", resource: "shift", action: "read" },
  { name: "shift.update", description: "Update shifts", resource: "shift", action: "update" },
  { name: "shift.delete", description: "Delete shifts", resource: "shift", action: "delete" },

  // Group booking permissions
  { name: "group_booking.create", description: "Create group bookings", resource: "group_booking", action: "create" },
  { name: "group_booking.read", description: "View group bookings", resource: "group_booking", action: "read" },
  { name: "group_booking.update", description: "Update group bookings", resource: "group_booking", action: "update" },
  { name: "group_booking.delete", description: "Delete group bookings", resource: "group_booking", action: "delete" },
];

// Predefined roles with their permissions
const PREDEFINED_ROLES = [
  {
    name: "super_admin",
    description: "Full system access with all permissions",
    isSuperRole: true,
    permissionNames: [], // Super role gets all permissions automatically
  },
  {
    name: "manager",
    description: "Hotel manager with full operational access",
    isSuperRole: false,
    permissionNames: [
      // Admin management - view only
      "admin.read",
      // Staff management
      "staff.create", "staff.read", "staff.update",
      // Role management - view only
      "role.read",
      // Room management
      "room.create", "room.read", "room.update", "room.delete",
      // Booking management
      "booking.create", "booking.read", "booking.update", "booking.delete",
      // Group booking management
      "group_booking.create", "group_booking.read", "group_booking.update", "group_booking.delete",
      // Guest management
      "guest.create", "guest.read", "guest.update", "guest.delete",
      // Reports
      "report.read", "report.export",
      // Night audit
      "night_audit.view",
      // Housekeeping
      "housekeeping.create", "housekeeping.read", "housekeeping.update", "housekeeping.delete",
      // Maintenance
      "maintenance.create", "maintenance.read", "maintenance.update", "maintenance.delete",
      // Billing
      "billing.read", "billing.charge", "billing.payment", "billing.refund",
      // Shifts
      "shift.create", "shift.read", "shift.update", "shift.delete",
    ],
  },
  {
    name: "front_desk",
    description: "Front desk staff with guest and booking access",
    isSuperRole: false,
    permissionNames: [
      // Room management - view only
      "room.read",
      // Booking management
      "booking.create", "booking.read", "booking.update",
      // Group booking management
      "group_booking.create", "group_booking.read", "group_booking.update",
      // Guest management
      "guest.create", "guest.read", "guest.update",
      // Housekeeping
      "housekeeping.read", "housekeeping.update",
      // Maintenance
      "maintenance.read", "maintenance.create",
      // Billing
      "billing.read", "billing.charge", "billing.payment",
      // Reports - basic
      "report.read",
    ],
  },
  {
    name: "housekeeping_manager",
    description: "Housekeeping department manager",
    isSuperRole: false,
    permissionNames: [
      "room.read",
      "housekeeping.create", "housekeeping.read", "housekeeping.update", "housekeeping.delete",
      "maintenance.read", "maintenance.create",
      "report.read",
    ],
  },
  {
    name: "accountant",
    description: "Accounting staff with billing access",
    isSuperRole: false,
    permissionNames: [
      "guest.read", "guest.update",
      "booking.read", "booking.update",
      "billing.read", "billing.charge", "billing.payment", "billing.refund",
      "report.read", "report.export",
      "night_audit.view",
    ],
  },
];

async function seedPermissions() {
  console.log("Starting permissions and roles seed...");

  try {
    // Create all permissions
    console.log("\n1. Creating permissions...");
    const createdPermissions: Record<string, { id: string; name: string }> = {};

    for (const perm of INITIAL_PERMISSIONS) {
      const existing = await prisma.permission.findUnique({
        where: { name: perm.name },
      });

      if (existing) {
        console.log(`   Permission '${perm.name}' already exists, skipping...`);
        createdPermissions[perm.name] = existing;
      } else {
        const created = await prisma.permission.create({
          data: perm,
        });
        createdPermissions[perm.name] = created;
        console.log(`   Created permission '${perm.name}'`);
      }
    }

    console.log(`\n   Total permissions: ${Object.keys(createdPermissions).length}`);

    // Create roles with their permissions
    console.log("\n2. Creating/updating roles...");
    for (const roleData of PREDEFINED_ROLES) {
      const existingRole = await prisma.role.findUnique({
        where: { name: roleData.name },
      });

      if (existingRole) {
        // Update the description if it exists
        if (existingRole.description !== roleData.description) {
          await prisma.role.update({
            where: { id: existingRole.id },
            data: { description: roleData.description },
          });
        }

        // Sync permissions for existing roles
        if (!roleData.isSuperRole && roleData.permissionNames.length > 0) {
          // Get current permissions for this role
          const currentPerms = await prisma.rolePermission.findMany({
            where: { roleId: existingRole.id },
            include: { permission: true },
          });

          const currentPermNames = currentPerms.map(rp => rp.permission.name);
          const targetPermNames = roleData.permissionNames;

          // Find permissions to add
          const permsToAdd = targetPermNames.filter(name => !currentPermNames.includes(name));

          // Add missing permissions
          for (const permName of permsToAdd) {
            if (createdPermissions[permName]) {
              await prisma.rolePermission.create({
                data: {
                  roleId: existingRole.id,
                  permissionId: createdPermissions[permName].id,
                },
              });
              console.log(`   Added permission '${permName}' to role '${roleData.name}'`);
            }
          }
        }

        console.log(`   Role '${roleData.name}' already exists, synced permissions`);
        continue;
      }

      const role = await prisma.role.create({
        data: {
          name: roleData.name,
          description: roleData.description,
          isSuperRole: roleData.isSuperRole,
        },
      });

      // Assign permissions to the role
      if (!roleData.isSuperRole && roleData.permissionNames.length > 0) {
        const permissionConnections = roleData.permissionNames
          .filter(name => createdPermissions[name])
          .map(name => ({
            roleId: role.id,
            permissionId: createdPermissions[name].id,
          }));

        if (permissionConnections.length > 0) {
          await prisma.rolePermission.createMany({
            data: permissionConnections,
          });
        }
      }

      console.log(`   Created role '${roleData.name}' with ${roleData.isSuperRole ? 'all permissions (super role)' : roleData.permissionNames.length + ' permissions'}`);
    }

    console.log("\nPermissions and roles seeded successfully!");
  } catch (error) {
    console.error("Error seeding permissions and roles:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
seedPermissions()
  .then(() => {
    console.log("\nSeed completed successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\nSeed failed:", error);
    process.exit(1);
  });

export { seedPermissions, INITIAL_PERMISSIONS, PREDEFINED_ROLES };
