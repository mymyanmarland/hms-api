/*
  Warnings:

  - You are about to drop the `booking` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `booking_room` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `charge` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `check_in` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `check_out` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `email_log` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `folio` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `guest` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `guest_preference` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `housekeeping_task` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `maintenance_ticket` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `night_audit` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `otp_code` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `payment` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `room` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `room_status_history` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `room_type` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `shift` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `shift_report` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `staff` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "booking" DROP CONSTRAINT "booking_guestId_fkey";

-- DropForeignKey
ALTER TABLE "booking" DROP CONSTRAINT "booking_masterBookingId_fkey";

-- DropForeignKey
ALTER TABLE "booking_room" DROP CONSTRAINT "booking_room_bookingId_fkey";

-- DropForeignKey
ALTER TABLE "booking_room" DROP CONSTRAINT "booking_room_roomId_fkey";

-- DropForeignKey
ALTER TABLE "charge" DROP CONSTRAINT "charge_folioId_fkey";

-- DropForeignKey
ALTER TABLE "check_in" DROP CONSTRAINT "check_in_bookingId_fkey";

-- DropForeignKey
ALTER TABLE "check_out" DROP CONSTRAINT "check_out_bookingId_fkey";

-- DropForeignKey
ALTER TABLE "folio" DROP CONSTRAINT "folio_guestId_fkey";

-- DropForeignKey
ALTER TABLE "guest" DROP CONSTRAINT "guest_userId_fkey";

-- DropForeignKey
ALTER TABLE "guest_preference" DROP CONSTRAINT "guest_preference_guestId_fkey";

-- DropForeignKey
ALTER TABLE "housekeeping_task" DROP CONSTRAINT "housekeeping_task_assignedTo_fkey";

-- DropForeignKey
ALTER TABLE "housekeeping_task" DROP CONSTRAINT "housekeeping_task_roomId_fkey";

-- DropForeignKey
ALTER TABLE "maintenance_ticket" DROP CONSTRAINT "maintenance_ticket_assignedTo_fkey";

-- DropForeignKey
ALTER TABLE "maintenance_ticket" DROP CONSTRAINT "maintenance_ticket_roomId_fkey";

-- DropForeignKey
ALTER TABLE "payment" DROP CONSTRAINT "payment_folioId_fkey";

-- DropForeignKey
ALTER TABLE "room" DROP CONSTRAINT "room_roomTypeId_fkey";

-- DropForeignKey
ALTER TABLE "room_status_history" DROP CONSTRAINT "room_status_history_roomId_fkey";

-- DropForeignKey
ALTER TABLE "shift" DROP CONSTRAINT "shift_staffId_fkey";

-- DropForeignKey
ALTER TABLE "shift_report" DROP CONSTRAINT "shift_report_shiftId_fkey";

-- DropForeignKey
ALTER TABLE "shift_report" DROP CONSTRAINT "shift_report_submittedBy_fkey";

-- DropForeignKey
ALTER TABLE "staff" DROP CONSTRAINT "staff_userId_fkey";

-- AlterTable
ALTER TABLE "user" ADD COLUMN     "twoFactorEnabled" BOOLEAN DEFAULT false;

-- DropTable
DROP TABLE "booking";

-- DropTable
DROP TABLE "booking_room";

-- DropTable
DROP TABLE "charge";

-- DropTable
DROP TABLE "check_in";

-- DropTable
DROP TABLE "check_out";

-- DropTable
DROP TABLE "email_log";

-- DropTable
DROP TABLE "folio";

-- DropTable
DROP TABLE "guest";

-- DropTable
DROP TABLE "guest_preference";

-- DropTable
DROP TABLE "housekeeping_task";

-- DropTable
DROP TABLE "maintenance_ticket";

-- DropTable
DROP TABLE "night_audit";

-- DropTable
DROP TABLE "otp_code";

-- DropTable
DROP TABLE "payment";

-- DropTable
DROP TABLE "room";

-- DropTable
DROP TABLE "room_status_history";

-- DropTable
DROP TABLE "room_type";

-- DropTable
DROP TABLE "shift";

-- DropTable
DROP TABLE "shift_report";

-- DropTable
DROP TABLE "staff";

-- DropEnum
DROP TYPE "BookingSource";

-- DropEnum
DROP TYPE "BookingStatus";

-- DropEnum
DROP TYPE "ChargeCategory";

-- DropEnum
DROP TYPE "EmailStatus";

-- DropEnum
DROP TYPE "EmailType";

-- DropEnum
DROP TYPE "FolioStatus";

-- DropEnum
DROP TYPE "PaymentMethod";

-- DropEnum
DROP TYPE "RoomStatus";

-- DropEnum
DROP TYPE "StaffRole";

-- DropEnum
DROP TYPE "TaskPriority";

-- DropEnum
DROP TYPE "TaskStatus";

-- DropEnum
DROP TYPE "TaskType";

-- DropEnum
DROP TYPE "TicketCategory";

-- DropEnum
DROP TYPE "TicketPriority";

-- DropEnum
DROP TYPE "TicketStatus";

-- CreateTable
CREATE TABLE "twoFactor" (
    "id" TEXT NOT NULL,
    "secret" TEXT NOT NULL,
    "backupCodes" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "verified" BOOLEAN DEFAULT true,

    CONSTRAINT "twoFactor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "otpCode" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT,

    CONSTRAINT "otpCode_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "twoFactor_secret_idx" ON "twoFactor"("secret");

-- CreateIndex
CREATE INDEX "twoFactor_userId_idx" ON "twoFactor"("userId");

-- CreateIndex
CREATE INDEX "otpCode_email_idx" ON "otpCode"("email");

-- CreateIndex
CREATE INDEX "otpCode_code_idx" ON "otpCode"("code");

-- AddForeignKey
ALTER TABLE "twoFactor" ADD CONSTRAINT "twoFactor_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
