-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'STAFF', 'GUEST');

-- CreateEnum
CREATE TYPE "RoomStatus" AS ENUM ('AVAILABLE', 'DIRTY', 'CLEANING_IN_PROGRESS', 'READY', 'OUT_OF_ORDER', 'OCCUPIED');

-- CreateEnum
CREATE TYPE "StaffDepartment" AS ENUM ('FRONT_DESK', 'HOUSEKEEPING', 'MAINTENANCE', 'MANAGEMENT', 'FINANCE', 'F_AND_B');

-- CreateEnum
CREATE TYPE "BookingSource" AS ENUM ('DIRECT', 'WALK_IN', 'PHONE', 'MOBILE_APP', 'CORPORATE', 'AGENT');

-- CreateEnum
CREATE TYPE "ReservationStatus" AS ENUM ('PENDING', 'CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT', 'CANCELLED', 'NO_SHOW');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('UNPAID', 'PARTIAL', 'PAID', 'REFUNDED');

-- CreateEnum
CREATE TYPE "FolioStatus" AS ENUM ('OPEN', 'CLOSED', 'VOIDED');

-- CreateEnum
CREATE TYPE "ChargeType" AS ENUM ('ROOM', 'FOOD', 'BEVERAGE', 'SPA', 'SERVICE', 'TAX', 'DISCOUNT', 'OTHER');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'CARD', 'WALLET', 'BANK_TRANSFER', 'OTHER');

-- CreateEnum
CREATE TYPE "HousekeepingTaskStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "HousekeepingType" AS ENUM ('STANDARD_CLEAN', 'TURNDOWN', 'DEEP_CLEAN', 'INSPECTION');

-- CreateEnum
CREATE TYPE "RoomStatusChangeReason" AS ENUM ('HOUSEKEEPING', 'MAINTENANCE', 'INSPECTION', 'CHECK_IN', 'CHECK_OUT', 'MANUAL');

-- CreateEnum
CREATE TYPE "MaintenancePriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "MaintenanceStatus" AS ENUM ('OPEN', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "CommunicationType" AS ENUM ('PRE_ARRIVAL', 'POST_STAY', 'CONFIRMATION', 'CANCELLATION', 'REMINDER', 'MARKETING');

-- CreateEnum
CREATE TYPE "CommunicationChannel" AS ENUM ('EMAIL', 'SMS', 'PUSH');

-- AlterTable
ALTER TABLE "user" ADD COLUMN     "role" "UserRole" NOT NULL DEFAULT 'GUEST';

-- CreateTable
CREATE TABLE "hotel" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "address" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "checkInTime" TEXT NOT NULL DEFAULT '14:00',
    "checkOutTime" TEXT NOT NULL DEFAULT '11:00',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hotel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "amenity" (
    "id" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "icon" TEXT,

    CONSTRAINT "amenity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "room_type" (
    "id" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "baseCapacity" INTEGER NOT NULL DEFAULT 2,
    "maxCapacity" INTEGER NOT NULL DEFAULT 2,
    "bedConfig" TEXT,
    "sizeSqm" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "room_type_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "room" (
    "id" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "roomTypeId" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "floor" INTEGER,
    "status" "RoomStatus" NOT NULL DEFAULT 'READY',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "room_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "room_status_log" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "fromStatus" "RoomStatus" NOT NULL,
    "toStatus" "RoomStatus" NOT NULL,
    "reason" "RoomStatusChangeReason" NOT NULL,
    "changedById" TEXT,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,

    CONSTRAINT "room_status_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rate_plan" (
    "id" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "roomTypeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rate_plan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rate_plan_price" (
    "id" TEXT NOT NULL,
    "ratePlanId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',

    CONSTRAINT "rate_plan_price_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "outlet" (
    "id" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "outlet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "menu_item" (
    "id" TEXT NOT NULL,
    "outletId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" DECIMAL(10,2) NOT NULL,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "menu_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "booking_group" (
    "id" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contactName" TEXT,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "arrivalDate" DATE NOT NULL,
    "departureDate" DATE NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "booking_group_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "booking" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "primaryGuestId" TEXT NOT NULL,
    "source" "BookingSource" NOT NULL DEFAULT 'DIRECT',
    "status" "ReservationStatus" NOT NULL DEFAULT 'PENDING',
    "checkInDate" DATE NOT NULL,
    "checkOutDate" DATE NOT NULL,
    "adults" INTEGER NOT NULL DEFAULT 1,
    "children" INTEGER NOT NULL DEFAULT 0,
    "specialRequests" TEXT,
    "arrivalETA" TEXT,
    "notes" TEXT,
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'UNPAID',
    "totalAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "paidAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "groupId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "booking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "booking_room" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "roomId" TEXT,
    "roomTypeId" TEXT NOT NULL,
    "ratePlanId" TEXT NOT NULL,
    "guestName" TEXT,
    "checkInDate" DATE NOT NULL,
    "checkOutDate" DATE NOT NULL,
    "nightlyRate" DECIMAL(10,2) NOT NULL,
    "adults" INTEGER NOT NULL DEFAULT 1,
    "children" INTEGER NOT NULL DEFAULT 0,
    "status" "ReservationStatus" NOT NULL DEFAULT 'PENDING',

    CONSTRAINT "booking_room_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "guest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "phone" TEXT,
    "dateOfBirth" DATE,
    "nationality" TEXT,
    "idType" TEXT,
    "idNumber" TEXT,
    "dietaryPreferences" TEXT,
    "preferredFloor" INTEGER,
    "marketingOptIn" BOOLEAN NOT NULL DEFAULT false,
    "vip" BOOLEAN NOT NULL DEFAULT false,
    "totalStays" INTEGER NOT NULL DEFAULT 0,
    "totalSpend" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "lastStayAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "guest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "guest_preference" (
    "id" TEXT NOT NULL,
    "guestId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "guest_preference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "guest_note" (
    "id" TEXT NOT NULL,
    "guestId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "guest_note_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "staff" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "department" "StaffDepartment" NOT NULL,
    "jobTitle" TEXT,
    "phone" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "hiredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "staff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "folio" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),
    "balance" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "status" "FolioStatus" NOT NULL DEFAULT 'OPEN',

    CONSTRAINT "folio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "folio_charge" (
    "id" TEXT NOT NULL,
    "folioId" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "type" "ChargeType" NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "postedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "outletId" TEXT,
    "menuItemId" TEXT,
    "createdById" TEXT,
    "voidedAt" TIMESTAMP(3),
    "voidReason" TEXT,

    CONSTRAINT "folio_charge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "folioId" TEXT,
    "method" "PaymentMethod" NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "reference" TEXT,
    "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "receivedById" TEXT,
    "invoiceId" TEXT,

    CONSTRAINT "payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoice" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueAt" TIMESTAMP(3),
    "subtotal" DECIMAL(12,2) NOT NULL,
    "tax" DECIMAL(12,2) NOT NULL,
    "total" DECIMAL(12,2) NOT NULL,
    "notes" TEXT,

    CONSTRAINT "invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "housekeeping_task" (
    "id" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "assigneeId" TEXT,
    "type" "HousekeepingType" NOT NULL DEFAULT 'STANDARD_CLEAN',
    "status" "HousekeepingTaskStatus" NOT NULL DEFAULT 'PENDING',
    "scheduledFor" TIMESTAMP(3) NOT NULL,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "housekeeping_task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "maintenance_ticket" (
    "id" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "roomId" TEXT,
    "assigneeId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "priority" "MaintenancePriority" NOT NULL DEFAULT 'MEDIUM',
    "status" "MaintenanceStatus" NOT NULL DEFAULT 'OPEN',
    "reportedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "cost" DECIMAL(10,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "maintenance_ticket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shift" (
    "id" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "endedAt" TIMESTAMP(3),
    "cashOnHand" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "notes" TEXT,

    CONSTRAINT "shift_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "communication_log" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT,
    "guestId" TEXT,
    "type" "CommunicationType" NOT NULL,
    "channel" "CommunicationChannel" NOT NULL,
    "subject" TEXT,
    "body" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "sentAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "communication_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_log" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "entity" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_RoomTypeAmenities" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_RoomTypeAmenities_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "hotel_slug_key" ON "hotel"("slug");

-- CreateIndex
CREATE INDEX "amenity_hotelId_idx" ON "amenity"("hotelId");

-- CreateIndex
CREATE UNIQUE INDEX "amenity_hotelId_name_key" ON "amenity"("hotelId", "name");

-- CreateIndex
CREATE INDEX "room_type_hotelId_idx" ON "room_type"("hotelId");

-- CreateIndex
CREATE UNIQUE INDEX "room_type_hotelId_code_key" ON "room_type"("hotelId", "code");

-- CreateIndex
CREATE INDEX "room_hotelId_status_idx" ON "room"("hotelId", "status");

-- CreateIndex
CREATE INDEX "room_roomTypeId_idx" ON "room"("roomTypeId");

-- CreateIndex
CREATE UNIQUE INDEX "room_hotelId_number_key" ON "room"("hotelId", "number");

-- CreateIndex
CREATE INDEX "room_status_log_roomId_changedAt_idx" ON "room_status_log"("roomId", "changedAt");

-- CreateIndex
CREATE INDEX "room_status_log_changedById_idx" ON "room_status_log"("changedById");

-- CreateIndex
CREATE INDEX "rate_plan_hotelId_roomTypeId_idx" ON "rate_plan"("hotelId", "roomTypeId");

-- CreateIndex
CREATE INDEX "rate_plan_price_ratePlanId_idx" ON "rate_plan_price"("ratePlanId");

-- CreateIndex
CREATE UNIQUE INDEX "rate_plan_price_ratePlanId_date_key" ON "rate_plan_price"("ratePlanId", "date");

-- CreateIndex
CREATE INDEX "outlet_hotelId_idx" ON "outlet"("hotelId");

-- CreateIndex
CREATE UNIQUE INDEX "outlet_hotelId_code_key" ON "outlet"("hotelId", "code");

-- CreateIndex
CREATE INDEX "menu_item_outletId_idx" ON "menu_item"("outletId");

-- CreateIndex
CREATE INDEX "booking_group_hotelId_idx" ON "booking_group"("hotelId");

-- CreateIndex
CREATE UNIQUE INDEX "booking_code_key" ON "booking"("code");

-- CreateIndex
CREATE INDEX "booking_hotelId_checkInDate_idx" ON "booking"("hotelId", "checkInDate");

-- CreateIndex
CREATE INDEX "booking_hotelId_status_idx" ON "booking"("hotelId", "status");

-- CreateIndex
CREATE INDEX "booking_primaryGuestId_idx" ON "booking"("primaryGuestId");

-- CreateIndex
CREATE INDEX "booking_groupId_idx" ON "booking"("groupId");

-- CreateIndex
CREATE INDEX "booking_paymentStatus_idx" ON "booking"("paymentStatus");

-- CreateIndex
CREATE INDEX "booking_createdAt_idx" ON "booking"("createdAt");

-- CreateIndex
CREATE INDEX "booking_room_bookingId_idx" ON "booking_room"("bookingId");

-- CreateIndex
CREATE INDEX "booking_room_checkInDate_checkOutDate_idx" ON "booking_room"("checkInDate", "checkOutDate");

-- CreateIndex
CREATE INDEX "booking_room_roomId_idx" ON "booking_room"("roomId");

-- CreateIndex
CREATE UNIQUE INDEX "guest_userId_key" ON "guest"("userId");

-- CreateIndex
CREATE INDEX "guest_vip_idx" ON "guest"("vip");

-- CreateIndex
CREATE INDEX "guest_marketingOptIn_idx" ON "guest"("marketingOptIn");

-- CreateIndex
CREATE INDEX "guest_lastStayAt_idx" ON "guest"("lastStayAt");

-- CreateIndex
CREATE INDEX "guest_preference_guestId_idx" ON "guest_preference"("guestId");

-- CreateIndex
CREATE UNIQUE INDEX "guest_preference_guestId_key_key" ON "guest_preference"("guestId", "key");

-- CreateIndex
CREATE INDEX "guest_note_guestId_createdAt_idx" ON "guest_note"("guestId", "createdAt");

-- CreateIndex
CREATE INDEX "guest_note_createdById_idx" ON "guest_note"("createdById");

-- CreateIndex
CREATE UNIQUE INDEX "staff_userId_key" ON "staff"("userId");

-- CreateIndex
CREATE INDEX "staff_department_idx" ON "staff"("department");

-- CreateIndex
CREATE INDEX "staff_isActive_idx" ON "staff"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "folio_bookingId_key" ON "folio"("bookingId");

-- CreateIndex
CREATE INDEX "folio_status_idx" ON "folio"("status");

-- CreateIndex
CREATE INDEX "folio_charge_bookingId_idx" ON "folio_charge"("bookingId");

-- CreateIndex
CREATE INDEX "folio_charge_folioId_idx" ON "folio_charge"("folioId");

-- CreateIndex
CREATE INDEX "folio_charge_type_idx" ON "folio_charge"("type");

-- CreateIndex
CREATE INDEX "folio_charge_postedAt_idx" ON "folio_charge"("postedAt");

-- CreateIndex
CREATE INDEX "payment_bookingId_idx" ON "payment"("bookingId");

-- CreateIndex
CREATE INDEX "payment_folioId_idx" ON "payment"("folioId");

-- CreateIndex
CREATE INDEX "payment_method_idx" ON "payment"("method");

-- CreateIndex
CREATE INDEX "payment_paidAt_idx" ON "payment"("paidAt");

-- CreateIndex
CREATE UNIQUE INDEX "invoice_number_key" ON "invoice"("number");

-- CreateIndex
CREATE INDEX "invoice_bookingId_idx" ON "invoice"("bookingId");

-- CreateIndex
CREATE INDEX "invoice_issuedAt_idx" ON "invoice"("issuedAt");

-- CreateIndex
CREATE INDEX "housekeeping_task_hotelId_status_idx" ON "housekeeping_task"("hotelId", "status");

-- CreateIndex
CREATE INDEX "housekeeping_task_roomId_scheduledFor_idx" ON "housekeeping_task"("roomId", "scheduledFor");

-- CreateIndex
CREATE INDEX "housekeeping_task_assigneeId_idx" ON "housekeeping_task"("assigneeId");

-- CreateIndex
CREATE INDEX "maintenance_ticket_hotelId_status_idx" ON "maintenance_ticket"("hotelId", "status");

-- CreateIndex
CREATE INDEX "maintenance_ticket_roomId_idx" ON "maintenance_ticket"("roomId");

-- CreateIndex
CREATE INDEX "maintenance_ticket_assigneeId_idx" ON "maintenance_ticket"("assigneeId");

-- CreateIndex
CREATE INDEX "shift_staffId_startedAt_idx" ON "shift"("staffId", "startedAt");

-- CreateIndex
CREATE INDEX "communication_log_bookingId_idx" ON "communication_log"("bookingId");

-- CreateIndex
CREATE INDEX "communication_log_status_sentAt_idx" ON "communication_log"("status", "sentAt");

-- CreateIndex
CREATE INDEX "audit_log_createdAt_idx" ON "audit_log"("createdAt");

-- CreateIndex
CREATE INDEX "audit_log_entity_entityId_idx" ON "audit_log"("entity", "entityId");

-- CreateIndex
CREATE INDEX "audit_log_actorId_idx" ON "audit_log"("actorId");

-- CreateIndex
CREATE INDEX "_RoomTypeAmenities_B_index" ON "_RoomTypeAmenities"("B");

-- AddForeignKey
ALTER TABLE "amenity" ADD CONSTRAINT "amenity_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "hotel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_type" ADD CONSTRAINT "room_type_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "hotel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room" ADD CONSTRAINT "room_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "hotel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room" ADD CONSTRAINT "room_roomTypeId_fkey" FOREIGN KEY ("roomTypeId") REFERENCES "room_type"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_status_log" ADD CONSTRAINT "room_status_log_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "room"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rate_plan" ADD CONSTRAINT "rate_plan_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "hotel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rate_plan" ADD CONSTRAINT "rate_plan_roomTypeId_fkey" FOREIGN KEY ("roomTypeId") REFERENCES "room_type"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rate_plan_price" ADD CONSTRAINT "rate_plan_price_ratePlanId_fkey" FOREIGN KEY ("ratePlanId") REFERENCES "rate_plan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outlet" ADD CONSTRAINT "outlet_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "hotel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu_item" ADD CONSTRAINT "menu_item_outletId_fkey" FOREIGN KEY ("outletId") REFERENCES "outlet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking" ADD CONSTRAINT "booking_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "hotel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking" ADD CONSTRAINT "booking_primaryGuestId_fkey" FOREIGN KEY ("primaryGuestId") REFERENCES "guest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking" ADD CONSTRAINT "booking_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "booking_group"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_room" ADD CONSTRAINT "booking_room_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_room" ADD CONSTRAINT "booking_room_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "room"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_room" ADD CONSTRAINT "booking_room_roomTypeId_fkey" FOREIGN KEY ("roomTypeId") REFERENCES "room_type"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_room" ADD CONSTRAINT "booking_room_ratePlanId_fkey" FOREIGN KEY ("ratePlanId") REFERENCES "rate_plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guest" ADD CONSTRAINT "guest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guest_preference" ADD CONSTRAINT "guest_preference_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "guest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guest_note" ADD CONSTRAINT "guest_note_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "guest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff" ADD CONSTRAINT "staff_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "folio" ADD CONSTRAINT "folio_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "folio_charge" ADD CONSTRAINT "folio_charge_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "booking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "folio_charge" ADD CONSTRAINT "folio_charge_folioId_fkey" FOREIGN KEY ("folioId") REFERENCES "folio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "folio_charge" ADD CONSTRAINT "folio_charge_outletId_fkey" FOREIGN KEY ("outletId") REFERENCES "outlet"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "folio_charge" ADD CONSTRAINT "folio_charge_menuItemId_fkey" FOREIGN KEY ("menuItemId") REFERENCES "menu_item"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "folio_charge" ADD CONSTRAINT "folio_charge_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment" ADD CONSTRAINT "payment_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment" ADD CONSTRAINT "payment_folioId_fkey" FOREIGN KEY ("folioId") REFERENCES "folio"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment" ADD CONSTRAINT "payment_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment" ADD CONSTRAINT "payment_receivedById_fkey" FOREIGN KEY ("receivedById") REFERENCES "staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "housekeeping_task" ADD CONSTRAINT "housekeeping_task_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "room"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "housekeeping_task" ADD CONSTRAINT "housekeeping_task_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_ticket" ADD CONSTRAINT "maintenance_ticket_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "room"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_ticket" ADD CONSTRAINT "maintenance_ticket_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shift" ADD CONSTRAINT "shift_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "communication_log" ADD CONSTRAINT "communication_log_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_RoomTypeAmenities" ADD CONSTRAINT "_RoomTypeAmenities_A_fkey" FOREIGN KEY ("A") REFERENCES "amenity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_RoomTypeAmenities" ADD CONSTRAINT "_RoomTypeAmenities_B_fkey" FOREIGN KEY ("B") REFERENCES "room_type"("id") ON DELETE CASCADE ON UPDATE CASCADE;
