import "dotenv/config";
import dotenv from "dotenv";
dotenv.config({ override: true, path: "./.env" });
import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({ adapter });

/**
 * Cancels the seed-script duplicate bookings. Run with:
 *   npx tsx scripts/cleanup-duplicates.ts --apply
 *
 * Without --apply it prints what would be cancelled (dry-run).
 *
 * Strategy: for every pair of overlapping bookings in the same room, keep
 * the one with the EARLIER createdAt and CANCEL the later one. We only
 * touch bookings whose confirmationCode starts with one of the seed
 * prefixes (HMS-SEED-, HMS-CORP-, HMS-WEDD-) so user-created bookings are
 * never affected.
 */
const SEED_PREFIXES = ["HMS-SEED-", "HMS-CORP-", "HMS-WEDD-"];

async function main() {
  const apply = process.argv.includes("--apply");

  if (!apply) {
    console.log("=== DRY RUN — pass --apply to actually cancel ===\n");
  } else {
    console.log("=== APPLYING — will CANCEL the bookings listed below ===\n");
  }

  const allRows = await prisma.bookingRoom.findMany({
    where: {
      booking: {
        status: { notIn: ["CANCELLED", "NO_SHOW"] },
      },
    },
    include: {
      room: { select: { number: true } },
      booking: {
        select: {
          id: true,
          confirmationCode: true,
          guestFirstName: true,
          guestLastName: true,
          status: true,
          checkInDate: true,
          checkOutDate: true,
          createdAt: true,
        },
      },
    },
  });

  const byRoom = new Map<string, typeof allRows>();
  for (const r of allRows) {
    const list = byRoom.get(r.roomId) ?? [];
    list.push(r);
    byRoom.set(r.roomId, list);
  }

  const toCancel: Array<{ id: string; code: string; reason: string }> = [];

  for (const [, rows] of byRoom.entries()) {
    if (rows.length < 2) continue;
    for (let i = 0; i < rows.length; i++) {
      for (let j = i + 1; j < rows.length; j++) {
        const a = rows[i].booking;
        const b = rows[j].booking;
        if (a.checkInDate < b.checkOutDate && b.checkInDate < a.checkOutDate) {
          // Determine which is "later" (the duplicate)
          const laterCreatedAt =
            a.createdAt.getTime() >= b.createdAt.getTime() ? a : b;
          const earlier = a.createdAt < b.createdAt ? a : b;
          const laterIsSeed = SEED_PREFIXES.some((p) =>
            laterCreatedAt.confirmationCode.startsWith(p),
          );
          const earlierIsSeed = SEED_PREFIXES.some((p) =>
            earlier.confirmationCode.startsWith(p),
          );

          // Only cancel if BOTH are seed-created (so we never touch a real
          // user booking) OR if the later one is a seed booking.
          if (laterIsSeed) {
            toCancel.push({
              id: laterCreatedAt.id,
              code: laterCreatedAt.confirmationCode,
              reason: `Later seed duplicate in Room ${rows[i].room.number} (conflicts with ${earlier.confirmationCode})`,
            });
          } else if (earlierIsSeed && laterCreatedAt.status !== "CHECKED_IN" && laterCreatedAt.status !== "CHECKED_OUT") {
            // The earlier is seed but the later is user-created — only auto-cancel
            // the user one if it's still tentative/confirmed (not checked in).
            // Skip this case and just warn so a human can decide.
            console.log(
              `⚠ SKIPPING: Room ${rows[i].room.number} — seed booking ${earlier.confirmationCode} overlaps user booking ${laterCreatedAt.confirmationCode} (${laterCreatedAt.status}). Human review needed.`,
            );
          }
        }
      }
    }
  }

  // De-dupe (each booking could appear in multiple overlap pairs)
  const seen = new Set<string>();
  const finalList = toCancel.filter((c) => {
    if (seen.has(c.id)) return false;
    seen.add(c.id);
    return true;
  });

  if (finalList.length === 0) {
    console.log("No duplicate seed bookings found.");
    return;
  }

  console.log(`Will cancel ${finalList.length} bookings:`);
  for (const c of finalList) {
    console.log(`  - ${c.code} — ${c.reason}`);
  }

  if (apply) {
    const result = await prisma.booking.updateMany({
      where: { id: { in: finalList.map((c) => c.id) } },
      data: { status: "CANCELLED" },
    });
    console.log(`\n✅ Cancelled ${result.count} bookings.`);
    console.log("Now run: revalidateTag('calendar') in the app, or hard-refresh the calendar page.");
  } else {
    console.log("\nRe-run with --apply to actually cancel.");
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
