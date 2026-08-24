import "dotenv/config";
import prisma from "../lib/prisma";

async function main() {
  // 1) Create 2 room types
  const standardType = await prisma.roomType.upsert({
    where: { id: "roomtype_standard_seed" },
    update: {},
    create: {
      id: "roomtype_standard_seed",
      name: "Standard Room",
      description: "Comfortable standard room with city view",
      basePrice: 99.0,
      maxOccupancy: 2,
      bedConfig: "1 Queen",
      amenities: ["Wi-Fi", "TV", "AC"],
      images: [],
    },
  });
  const suiteType = await prisma.roomType.upsert({
    where: { id: "roomtype_suite_seed" },
    update: {},
    create: {
      id: "roomtype_suite_seed",
      name: "Deluxe Suite",
      description: "Spacious suite with lounge area",
      basePrice: 199.0,
      maxOccupancy: 4,
      bedConfig: "1 King + Sofa",
      amenities: ["Wi-Fi", "TV", "AC", "Mini-bar"],
      images: [],
    },
  });

  // 2) Create 6 rooms (3 per type, 2 floors)
  const rooms = [
    { number: "101", floor: 1, type: standardType.id, status: "AVAILABLE" as const },
    { number: "102", floor: 1, type: standardType.id, status: "OCCUPIED" as const },
    { number: "103", floor: 1, type: standardType.id, status: "DIRTY" as const },
    { number: "201", floor: 2, type: suiteType.id, status: "AVAILABLE" as const },
    { number: "202", floor: 2, type: suiteType.id, status: "CLEANING" as const },
    { number: "203", floor: 2, type: suiteType.id, status: "MAINTENANCE" as const },
  ];

  for (const r of rooms) {
    await prisma.room.upsert({
      where: { number: r.number },
      update: { floor: r.floor, roomTypeId: r.type, status: r.status },
      create: {
        number: r.number,
        floor: r.floor,
        roomTypeId: r.type,
        status: r.status,
      },
    });
  }

  // 3) Create a guest
  const guest = await prisma.guest.upsert({
    where: { email: "alice@example.com" },
    update: {},
    create: {
      firstName: "Alice",
      lastName: "Johnson",
      email: "alice@example.com",
      phone: "+1234567890",
      nationality: "US",
    },
  });

  // 4) Create 3 bookings across current week
  const today = new Date("2026-08-24T00:00:00.000Z");
  const room102 = await prisma.room.findUnique({ where: { number: "102" } });
  const room201 = await prisma.room.findUnique({ where: { number: "201" } });
  const room103 = await prisma.room.findUnique({ where: { number: "103" } });

  if (!room102 || !room201 || !room103) throw new Error("Rooms not seeded");

  const existingBookings = await prisma.booking.count({
    where: {
      confirmationCode: { startsWith: "HMS-SEED-" },
    },
  });

  if (existingBookings === 0) {
    // Booking 1: Alice in 102, Aug 25-28 (CHECKED_IN)
    const b1 = await prisma.booking.create({
      data: {
        confirmationCode: "HMS-SEED-000001",
        status: "CHECKED_IN",
        source: "DIRECT",
        guestFirstName: "Alice",
        guestLastName: "Johnson",
        guestEmail: "alice@example.com",
        guestPhone: "+1234567890",
        adults: 2,
        children: 0,
        subtotal: 297.0,
        taxes: 30.0,
        totalAmount: 327.0,
        checkInDate: new Date("2026-08-25T00:00:00.000Z"),
        checkOutDate: new Date("2026-08-28T00:00:00.000Z"),
        actualCheckIn: new Date("2026-08-25T15:00:00.000Z"),
        guestId: guest.id,
        bookingRooms: {
          create: {
            roomId: room102.id,
            rate: 99.0,
            totalNights: 3,
            isPrimary: true,
            status: "CHECKED_IN",
          },
        },
      },
    });

    // Booking 2: Bob in 201, Aug 26-30 (CONFIRMED)
    const guestBob = await prisma.guest.upsert({
      where: { email: "bob@example.com" },
      update: {},
      create: {
        firstName: "Bob",
        lastName: "Smith",
        email: "bob@example.com",
        phone: "+1987654321",
      },
    });

    await prisma.booking.create({
      data: {
        confirmationCode: "HMS-SEED-000002",
        status: "CONFIRMED",
        source: "OTA",
        guestFirstName: "Bob",
        guestLastName: "Smith",
        guestEmail: "bob@example.com",
        adults: 1,
        children: 0,
        subtotal: 796.0,
        taxes: 80.0,
        totalAmount: 876.0,
        checkInDate: new Date("2026-08-26T00:00:00.000Z"),
        checkOutDate: new Date("2026-08-30T00:00:00.000Z"),
        guestId: guestBob.id,
        bookingRooms: {
          create: {
            roomId: room201.id,
            rate: 199.0,
            totalNights: 4,
            isPrimary: true,
            status: "RESERVED",
          },
        },
      },
    });

    // Booking 3: Carol in 103, Aug 27-29 (TENTATIVE)
    const guestCarol = await prisma.guest.upsert({
      where: { email: "carol@example.com" },
      update: {},
      create: {
        firstName: "Carol",
        lastName: "Lee",
        email: "carol@example.com",
        phone: "+1555555555",
      },
    });

    await prisma.booking.create({
      data: {
        confirmationCode: "HMS-SEED-000003",
        status: "TENTATIVE",
        source: "PHONE",
        guestFirstName: "Carol",
        guestLastName: "Lee",
        guestEmail: "carol@example.com",
        adults: 2,
        children: 1,
        subtotal: 198.0,
        taxes: 20.0,
        totalAmount: 218.0,
        checkInDate: new Date("2026-08-27T00:00:00.000Z"),
        checkOutDate: new Date("2026-08-29T00:00:00.000Z"),
        guestId: guestCarol.id,
        bookingRooms: {
          create: {
            roomId: room103.id,
            rate: 99.0,
            totalNights: 2,
            isPrimary: true,
            status: "RESERVED",
          },
        },
      },
    });

    console.log("Seeded 3 bookings");
  }

  const stats = {
    roomTypes: await prisma.roomType.count(),
    rooms: await prisma.room.count(),
    guests: await prisma.guest.count(),
    bookings: await prisma.booking.count(),
  };
  console.log("Stats:", stats);
}

main()
  .catch(async (e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());