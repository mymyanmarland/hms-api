import "dotenv/config";
import prisma from "../lib/prisma";

async function seedGroupBookings() {
  console.log("Starting group bookings seed...");

  try {
    // Check if we already have group bookings
    const existingCount = await prisma.groupBooking.count();
    if (existingCount > 0) {
      console.log(`Found ${existingCount} existing group bookings. Skipping seed.`);
      return;
    }

    // Create a corporate group booking
    const corporateGroup = await prisma.groupBooking.create({
      data: {
        groupName: "TechCorp Annual Conference 2026",
        groupType: "CORPORATE",
        groupCode: "GRP-2026-TCCONF",
        contactName: "Sarah Johnson",
        contactEmail: "sarah.johnson@techcorp.com",
        contactPhone: "+1-555-0101",
        contactCompany: "TechCorp Inc.",
        roomsBlocked: 15,
        roomsConfirmed: 8,
        discountPercent: 15,
        discountNotes: "Corporate partner discount - 15% for conference booking",
        depositRequired: true,
        depositAmount: 2500.0,
        depositReceived: 2500.0,
        depositReceivedAt: new Date("2026-06-15"),
        depositDueDate: new Date("2026-07-01"),
        bookingCutoffDate: new Date("2026-08-01"),
        releaseDate: new Date("2026-08-15"),
        arrivalInfo: "VIP check-in area at main lobby. Conference badges required.",
        departureInfo: "Standard check-out by 11 AM. Late check-out available until 2 PM on request.",
        notes: "Main conference venue: Grand Ballroom. Welcome reception on Aug 27 at 7 PM.",
        internalNotes: "High-value corporate client - ensure VIP treatment.",
        status: "ACTIVE",
      },
    });
    console.log(`Created corporate group: ${corporateGroup.groupName}`);

    // Create a wedding group booking
    const weddingGroup = await prisma.groupBooking.create({
      data: {
        groupName: "Williams-Roberts Wedding",
        groupType: "WEDDING",
        groupCode: "GRP-2026-WEDD01",
        contactName: "Emily Roberts",
        contactEmail: "emily.roberts@email.com",
        contactPhone: "+1-555-0202",
        contactCompany: null,
        roomsBlocked: 25,
        roomsConfirmed: 22,
        discountPercent: 20,
        discountNotes: "Wedding party block discount",
        depositRequired: true,
        depositAmount: 5000.0,
        depositReceived: 5000.0,
        depositReceivedAt: new Date("2026-05-20"),
        depositDueDate: new Date("2026-06-01"),
        bookingCutoffDate: new Date("2026-08-10"),
        releaseDate: new Date("2026-08-20"),
        arrivalInfo: "Wedding suite reserved for couple. Welcome drinks at pool bar 5-7 PM.",
        departureInfo: "Late check-out at 3 PM for wedding party. Brunch served 10 AM-2 PM.",
        notes: "Wedding date: Aug 28, 2026. Ceremony at 4 PM in Garden Pavilion.",
        internalNotes: "Bride's family requesting early check-in for bridal suite prep.",
        status: "ACTIVE",
      },
    });
    console.log(`Created wedding group: ${weddingGroup.groupName}`);

    // Create a tour group booking
    const tourGroup = await prisma.groupBooking.create({
      data: {
        groupName: "European Discovery Tour - Summer 2026",
        groupType: "TOUR",
        groupCode: "GRP-2026-EUR01",
        contactName: "Michael Chen",
        contactEmail: "m.chen@wanderlusttravel.com",
        contactPhone: "+1-555-0303",
        contactCompany: "Wanderlust Travel Agency",
        roomsBlocked: 12,
        roomsConfirmed: 12,
        discountPercent: 10,
        discountNotes: "Tour operator bulk booking discount",
        depositRequired: true,
        depositAmount: 1500.0,
        depositReceived: 1500.0,
        depositReceivedAt: new Date("2026-07-01"),
        depositDueDate: new Date("2026-07-15"),
        bookingCutoffDate: new Date("2026-08-15"),
        releaseDate: null,
        arrivalInfo: "Group check-in at 3 PM. Tour guide will meet guests in lobby.",
        departureInfo: "Group check-out by 10 AM. Luggage storage available.",
        notes: "Stop 3 of 5 on European Discovery Tour. City tour at 2 PM.",
        internalNotes: "Pre-booked breakfast buffet for 24 guests each morning.",
        status: "ACTIVE",
      },
    });
    console.log(`Created tour group: ${tourGroup.groupName}`);

    // Create a sports group booking
    const sportsGroup = await prisma.groupBooking.create({
      data: {
        groupName: "Regional Swim Championship - Hotel Block",
        groupType: "SPORTS",
        groupCode: "GRP-2026-SWIM1",
        contactName: "Coach David Park",
        contactEmail: "david.park@cityswimclub.org",
        contactPhone: "+1-555-0404",
        contactCompany: "City Swim Club",
        roomsBlocked: 20,
        roomsConfirmed: 15,
        discountPercent: 12,
        discountNotes: "Sports team discount - pool access included",
        depositRequired: true,
        depositAmount: 2000.0,
        depositReceived: 1000.0,
        depositReceivedAt: new Date("2026-08-01"),
        depositDueDate: new Date("2026-08-20"),
        bookingCutoffDate: new Date("2026-09-05"),
        releaseDate: new Date("2026-09-10"),
        arrivalInfo: "Early check-in requested for team buses arriving at 12 PM.",
        departureInfo: "Check-out by 9 AM on Sept 8. Competition starts at 10 AM.",
        notes: "Championship dates: Sept 6-7. 3 pool lanes reserved daily 6-10 AM.",
        internalNotes: "Requesting ice machine access on athlete floors.",
        status: "ACTIVE",
      },
    });
    console.log(`Created sports group: ${sportsGroup.groupName}`);

    // Create a government group booking
    const govtGroup = await prisma.groupBooking.create({
      data: {
        groupName: "Annual Municipal Conference 2026",
        groupType: "GOVERNMENT",
        groupCode: "GRP-2026-GOV01",
        contactName: "Director Jane Martinez",
        contactEmail: "j.martinez@municipality.gov",
        contactPhone: "+1-555-0505",
        contactCompany: "City Municipality",
        roomsBlocked: 30,
        roomsConfirmed: 25,
        discountPercent: 0,
        discountNotes: "Government rate applied - no additional discount",
        depositRequired: false,
        depositAmount: null,
        depositReceived: 0,
        depositReceivedAt: null,
        depositDueDate: null,
        bookingCutoffDate: new Date("2026-09-15"),
        releaseDate: new Date("2026-09-25"),
        arrivalInfo: "Federal per diem rate applies. Receipts required for reimbursement.",
        departureInfo: "Standard check-out. Invoice to be sent electronically.",
        notes: "Conference: Sept 20-22, 2026. Main venue: Conference Center.",
        internalNotes: "Government rate confirmed. Tax-exempt status verified.",
        status: "ACTIVE",
      },
    });
    console.log(`Created government group: ${govtGroup.groupName}`);

    // Create a completed group booking
    const completedGroup = await prisma.groupBooking.create({
      data: {
        groupName: "TechStart Innovation Summit 2026",
        groupType: "CORPORATE",
        groupCode: "GRP-2026-SUM01",
        contactName: "Amanda Lee",
        contactEmail: "a.lee@techstart.io",
        contactPhone: "+1-555-0606",
        contactCompany: "TechStart Ventures",
        roomsBlocked: 10,
        roomsConfirmed: 10,
        discountPercent: 10,
        discountNotes: "Returning client discount",
        depositRequired: true,
        depositAmount: 1500.0,
        depositReceived: 1500.0,
        depositReceivedAt: new Date("2026-06-01"),
        depositDueDate: new Date("2026-06-15"),
        bookingCutoffDate: new Date("2026-07-15"),
        releaseDate: null,
        arrivalInfo: "Standard check-in from 3 PM.",
        departureInfo: "Standard check-out by 11 AM.",
        notes: "Event completed successfully. Post-event survey sent to organizer.",
        internalNotes: "Great feedback received. Client interested in Q4 booking.",
        status: "COMPLETED",
      },
    });
    console.log(`Created completed group: ${completedGroup.groupName}`);

    // Create a cancelled group booking
    const cancelledGroup = await prisma.groupBooking.create({
      data: {
        groupName: "ABC Corp Leadership Retreat",
        groupType: "CORPORATE",
        groupCode: "GRP-2026-ABCCR",
        contactName: "Robert Kim",
        contactEmail: "r.kim@abccorp.com",
        contactPhone: "+1-555-0707",
        contactCompany: "ABC Corporation",
        roomsBlocked: 8,
        roomsConfirmed: 0,
        discountPercent: 15,
        discountNotes: "Corporate retreat discount",
        depositRequired: true,
        depositAmount: 1000.0,
        depositReceived: 0,
        depositReceivedAt: null,
        depositDueDate: new Date("2026-08-01"),
        bookingCutoffDate: null,
        releaseDate: new Date("2026-08-10"),
        arrivalInfo: null,
        departureInfo: null,
        notes: "Cancelled due to internal restructuring. Deposit not collected.",
        internalNotes: "Client may rebook in Q1 2027. Follow up in November.",
        status: "CANCELLED",
      },
    });
    console.log(`Created cancelled group: ${cancelledGroup.groupName}`);

    // Now create some bookings linked to these groups
    const standardType = await prisma.roomType.findFirst({
      where: { name: { contains: "Standard", mode: "insensitive" } },
    });
    const suiteType = await prisma.roomType.findFirst({
      where: { name: { contains: "Suite", mode: "insensitive" } },
    });

    if (!standardType || !suiteType) {
      console.log("Room types not found. Skipping booking links.");
      return;
    }

    const rooms = await prisma.room.findMany({
      where: { roomTypeId: { in: [standardType.id, suiteType.id] } },
      take: 20,
    });

    if (rooms.length === 0) {
      console.log("No rooms found. Skipping booking links.");
      return;
    }

    // Create a guest and link some bookings to the corporate group
    const corpGuest = await prisma.guest.upsert({
      where: { email: "attendee@techcorp.com" },
      update: {},
      create: {
        firstName: "Corporate",
        lastName: "Attendee",
        email: "attendee@techcorp.com",
        phone: "+1-555-1000",
        nationality: "US",
      },
    });

    // Create bookings for corporate group
    for (let i = 0; i < 3; i++) {
      const room = rooms[i];
      if (!room) continue;

      await prisma.booking.create({
        data: {
          confirmationCode: `HMS-CORP-${String(1001 + i).padStart(6, "0")}`,
          status: i === 0 ? "CONFIRMED" : i === 1 ? "CHECKED_IN" : "TENTATIVE",
          source: "GROUP",
          guestFirstName: `Corporate`,
          guestLastName: `Attendee ${i + 1}`,
          guestEmail: `attendee${i + 1}@techcorp.com`,
          guestPhone: `+1-555-100${i}`,
          adults: 1,
          children: 0,
          subtotal: 99.0 * 3,
          taxes: 30.0,
          totalAmount: 99.0 * 3 + 30.0,
          checkInDate: new Date("2026-08-26"),
          checkOutDate: new Date("2026-08-29"),
          isGroupBooking: true,
          groupName: "TechCorp Annual Conference 2026",
          groupBookingId: corporateGroup.id,
          guestId: corpGuest.id,
          bookingRooms: {
            create: {
              roomId: room.id,
              rate: 99.0,
              totalNights: 3,
              isPrimary: true,
              status: i === 1 ? "CHECKED_IN" : "RESERVED",
            },
          },
        },
      });
    }
    console.log(`Created 3 bookings for corporate group`);

    // Create bookings for wedding group
    const weddingGuests = [
      { firstName: "Emily", lastName: "Roberts", email: "emily.r@email.com" },
      { firstName: "James", lastName: "Williams", email: "james.w@email.com" },
      { firstName: "Sarah", lastName: "Miller", email: "sarah.m@email.com" },
    ];

    for (let i = 0; i < 3 && i < rooms.length; i++) {
      const room = rooms[i + 5];
      if (!room) continue;
      const guest = weddingGuests[i];

      const weddingGuest = await prisma.guest.upsert({
        where: { email: guest.email },
        update: {},
        create: {
          firstName: guest.firstName,
          lastName: guest.lastName,
          email: guest.email,
          phone: `+1-555-200${i}`,
          nationality: "US",
        },
      });

      await prisma.booking.create({
        data: {
          confirmationCode: `HMS-WEDD-${String(2001 + i).padStart(6, "0")}`,
          status: i === 0 ? "CONFIRMED" : "TENTATIVE",
          source: "GROUP",
          guestFirstName: guest.firstName,
          guestLastName: guest.lastName,
          guestEmail: guest.email,
          guestPhone: `+1-555-200${i}`,
          adults: 2,
          children: 0,
          subtotal: 199.0 * 2,
          taxes: 40.0,
          totalAmount: 199.0 * 2 + 40.0,
          checkInDate: new Date("2026-08-27"),
          checkOutDate: new Date("2026-08-29"),
          isGroupBooking: true,
          groupName: "Williams-Roberts Wedding",
          groupBookingId: weddingGroup.id,
          guestId: weddingGuest.id,
          bookingRooms: {
            create: {
              roomId: room.id,
              rate: 199.0,
              totalNights: 2,
              isPrimary: true,
              status: "RESERVED",
            },
          },
        },
      });
    }
    console.log(`Created 3 bookings for wedding group`);

    // Update room counts
    await prisma.groupBooking.update({
      where: { id: corporateGroup.id },
      data: { roomsConfirmed: 3 },
    });
    await prisma.groupBooking.update({
      where: { id: weddingGroup.id },
      data: { roomsConfirmed: 3 },
    });

    const stats = {
      groupBookings: await prisma.groupBooking.count(),
      bookingsWithGroup: await prisma.booking.count({
        where: { groupBookingId: { not: null } },
      }),
    };
    console.log("\nSeed completed!");
    console.log("Stats:", stats);
  } catch (error) {
    console.error("Error seeding group bookings:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
seedGroupBookings()
  .then(() => {
    console.log("\nGroup bookings seed completed successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\nGroup bookings seed failed:", error);
    process.exit(1);
  });
