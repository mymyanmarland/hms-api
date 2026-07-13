-- CreateEnum
CREATE TYPE "RoomStatus" AS ENUM ('AVAILABLE', 'OCCUPIED', 'DIRTY', 'CLEANING', 'MAINTENANCE', 'OUT_OF_ORDER');

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('TENTATIVE', 'CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT', 'CANCELLED', 'NO_SHOW');

-- CreateEnum
CREATE TYPE "BookingSource" AS ENUM ('DIRECT', 'WALK_IN', 'PHONE', 'OTA', 'CORPORATE', 'GROUP');

-- CreateEnum
CREATE TYPE "TaskPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TaskType" AS ENUM ('CLEANING', 'DEEP_CLEANING', 'TURNDOWN', 'INSPECTION', 'STOCKING', 'OTHER');

-- CreateEnum
CREATE TYPE "TicketStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'ON_HOLD', 'RESOLVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "TicketPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "TicketCategory" AS ENUM ('PLUMBING', 'ELECTRICAL', 'HVAC', 'FURNITURE', 'APPLIANCES', 'STRUCTURAL', 'SECURITY', 'OTHER');

-- CreateEnum
CREATE TYPE "FolioStatus" AS ENUM ('OPEN', 'CLOSED', 'TRANSFERRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ChargeCategory" AS ENUM ('ROOM', 'ROOM_TAX', 'FOOD_BEVERAGE', 'RESTAURANT', 'BAR', 'SPA', 'MINIBAR', 'LAUNDRY', 'PARKING', 'TRANSPORTATION', 'PHONE', 'INTERNET', 'ENTERTAINMENT', 'OTHER', 'EARLY_CHECK_IN', 'LATE_CHECK_OUT', 'PET_FEE', 'EXTRA_BED', 'CANCELLATION_FEE');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'CREDIT_CARD', 'DEBIT_CARD', 'BANK_TRANSFER', 'CORPORATE_ACCOUNT', 'GIFT_CARD', 'LOYALTY_POINTS', 'COMP');

-- CreateEnum
CREATE TYPE "StaffRole" AS ENUM ('ADMIN', 'MANAGER', 'FRONT_DESK', 'CONCIERGE', 'HOUSEKEEPING', 'MAINTENANCE', 'RESTAURANT', 'SPA', 'ACCOUNTING');

-- CreateEnum
CREATE TYPE "EmailType" AS ENUM ('WELCOME', 'BOOKING_CONFIRMATION', 'PRE_ARRIVAL', 'ARRIVAL_INFO', 'CHECK_OUT_REMINDER', 'POST_STAY_SURVEY', 'MARKETING', 'PROMOTIONAL', 'BIRTHDAY', 'ANNIVERSARY');

-- CreateEnum
CREATE TYPE "EmailStatus" AS ENUM ('PENDING', 'SENT', 'FAILED', 'BOUNCED', 'UNSUBSCRIBED');

-- CreateTable
CREATE TABLE "user" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session" (
    "id" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "userId" TEXT NOT NULL,

    CONSTRAINT "session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "account" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMP(3),
    "refreshTokenExpiresAt" TIMESTAMP(3),
    "scope" TEXT,
    "password" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "verification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "room_type" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "basePrice" DECIMAL(10,2) NOT NULL,
    "maxOccupancy" INTEGER NOT NULL DEFAULT 2,
    "bedConfig" TEXT,
    "amenities" TEXT[],
    "images" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "room_type_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "room" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "floor" INTEGER NOT NULL,
    "status" "RoomStatus" NOT NULL DEFAULT 'AVAILABLE',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "roomTypeId" TEXT NOT NULL,

    CONSTRAINT "room_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "room_status_history" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "status" "RoomStatus" NOT NULL,
    "notes" TEXT,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "changedBy" TEXT,

    CONSTRAINT "room_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "guest" (
    "id" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "alternatePhone" TEXT,
    "dateOfBirth" TIMESTAMP(3),
    "nationality" TEXT,
    "idType" TEXT,
    "idNumber" TEXT,
    "idExpiry" TIMESTAMP(3),
    "passportCountry" TEXT,
    "address" TEXT,
    "city" TEXT,
    "country" TEXT,
    "specialRequests" TEXT,
    "specialNotes" TEXT,
    "isVip" BOOLEAN NOT NULL DEFAULT false,
    "loyaltyPoints" INTEGER NOT NULL DEFAULT 0,
    "marketingOptIn" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT,

    CONSTRAINT "guest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "guest_preference" (
    "id" TEXT NOT NULL,
    "guestId" TEXT NOT NULL,
    "preferenceType" TEXT NOT NULL,
    "preferenceKey" TEXT NOT NULL,
    "preferenceValue" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "guest_preference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "booking" (
    "id" TEXT NOT NULL,
    "confirmationCode" TEXT NOT NULL,
    "status" "BookingStatus" NOT NULL DEFAULT 'TENTATIVE',
    "source" "BookingSource" NOT NULL DEFAULT 'DIRECT',
    "guestFirstName" TEXT NOT NULL,
    "guestLastName" TEXT NOT NULL,
    "guestEmail" TEXT NOT NULL,
    "guestPhone" TEXT,
    "adults" INTEGER NOT NULL DEFAULT 1,
    "children" INTEGER NOT NULL DEFAULT 0,
    "infants" INTEGER NOT NULL DEFAULT 0,
    "subtotal" DECIMAL(10,2) NOT NULL,
    "taxes" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "discounts" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "totalAmount" DECIMAL(10,2) NOT NULL,
    "checkInDate" TIMESTAMP(3) NOT NULL,
    "checkOutDate" TIMESTAMP(3) NOT NULL,
    "actualCheckIn" TIMESTAMP(3),
    "actualCheckOut" TIMESTAMP(3),
    "specialRequests" TEXT,
    "internalNotes" TEXT,
    "isGroupBooking" BOOLEAN NOT NULL DEFAULT false,
    "groupName" TEXT,
    "masterBookingId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "guestId" TEXT NOT NULL,

    CONSTRAINT "booking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "booking_room" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "rate" DECIMAL(10,2) NOT NULL,
    "totalNights" INTEGER NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT true,
    "status" TEXT NOT NULL DEFAULT 'RESERVED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "booking_room_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "check_in" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "checkedInAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "checkedInBy" TEXT NOT NULL,
    "keyCardNumber" TEXT,
    "keyCardIssued" INTEGER NOT NULL DEFAULT 1,
    "keyExpiration" TIMESTAMP(3),
    "idVerified" BOOLEAN NOT NULL DEFAULT false,
    "idDocumentType" TEXT,
    "idDocumentNumber" TEXT,
    "policiesAccepted" BOOLEAN NOT NULL DEFAULT false,
    "privacyAccepted" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,

    CONSTRAINT "check_in_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "check_out" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "checkedOutAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "checkedOutBy" TEXT NOT NULL,
    "departureTime" TEXT,
    "roomKeysReturned" BOOLEAN NOT NULL DEFAULT false,
    "folioBalance" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "paymentRequired" BOOLEAN NOT NULL DEFAULT false,
    "feedbackRequested" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,

    CONSTRAINT "check_out_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "housekeeping_task" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "taskType" "TaskType" NOT NULL DEFAULT 'CLEANING',
    "priority" "TaskPriority" NOT NULL DEFAULT 'NORMAL',
    "status" "TaskStatus" NOT NULL DEFAULT 'PENDING',
    "scheduledFor" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "dueBy" TIMESTAMP(3),
    "assignedTo" TEXT,
    "instructions" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "housekeeping_task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "maintenance_ticket" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "category" "TicketCategory" NOT NULL,
    "priority" "TicketPriority" NOT NULL DEFAULT 'MEDIUM',
    "status" "TicketStatus" NOT NULL DEFAULT 'OPEN',
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "location" TEXT,
    "resolution" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "assignedTo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "maintenance_ticket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "folio" (
    "id" TEXT NOT NULL,
    "folioNumber" TEXT NOT NULL,
    "status" "FolioStatus" NOT NULL DEFAULT 'OPEN',
    "guestId" TEXT NOT NULL,
    "bookingId" TEXT,
    "subtotal" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "taxes" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "totalPayments" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "balance" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "folio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "charge" (
    "id" TEXT NOT NULL,
    "folioId" TEXT NOT NULL,
    "category" "ChargeCategory" NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitPrice" DECIMAL(10,2),
    "referenceId" TEXT,
    "referenceType" TEXT,
    "postedBy" TEXT,
    "postedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "nightAuditId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "charge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment" (
    "id" TEXT NOT NULL,
    "folioId" TEXT NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "transactionId" TEXT,
    "authorizationCode" TEXT,
    "cardLast4" TEXT,
    "cardBrand" TEXT,
    "reference" TEXT,
    "status" TEXT NOT NULL DEFAULT 'COMPLETED',
    "processedBy" TEXT,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "nightAuditId" TEXT,
    "refundedAmount" DECIMAL(10,2),
    "refundedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "staff" (
    "id" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "role" "StaffRole" NOT NULL DEFAULT 'FRONT_DESK',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "hireDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "salary" DECIMAL(10,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT,

    CONSTRAINT "staff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shift" (
    "id" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "role" "StaffRole" NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3),
    "actualStart" TIMESTAMP(3),
    "actualEnd" TIMESTAMP(3),
    "breakStart" TIMESTAMP(3),
    "breakEnd" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shift_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shift_report" (
    "id" TEXT NOT NULL,
    "shiftId" TEXT NOT NULL,
    "submittedBy" TEXT NOT NULL,
    "reportType" TEXT NOT NULL,
    "totalCharges" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "totalPayments" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "totalCash" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "totalCards" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "checkIns" INTEGER NOT NULL DEFAULT 0,
    "checkOuts" INTEGER NOT NULL DEFAULT 0,
    "noShows" INTEGER NOT NULL DEFAULT 0,
    "cancellations" INTEGER NOT NULL DEFAULT 0,
    "roomsAvailable" INTEGER NOT NULL DEFAULT 0,
    "roomsOccupied" INTEGER NOT NULL DEFAULT 0,
    "roomsDirty" INTEGER NOT NULL DEFAULT 0,
    "roomsMaintenance" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shift_report_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_log" (
    "id" TEXT NOT NULL,
    "guestId" TEXT,
    "emailType" "EmailType" NOT NULL,
    "recipient" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT,
    "templateId" TEXT,
    "status" "EmailStatus" NOT NULL DEFAULT 'PENDING',
    "sentAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "openedAt" TIMESTAMP(3),
    "clickedAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "email_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "night_audit" (
    "id" TEXT NOT NULL,
    "auditDate" DATE NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'IN_PROGRESS',
    "totalRoomRevenue" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "totalFbrRevenue" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "totalOtherRevenue" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "totalRevenue" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "totalPayments" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "totalRefunds" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "totalCheckIns" INTEGER NOT NULL DEFAULT 0,
    "totalCheckOuts" INTEGER NOT NULL DEFAULT 0,
    "totalOccupiedRooms" INTEGER NOT NULL DEFAULT 0,
    "occupancyRate" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "adr" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "revpar" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "preparedBy" TEXT NOT NULL,
    "reviewedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "night_audit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");

-- CreateIndex
CREATE INDEX "session_userId_idx" ON "session"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "session_token_key" ON "session"("token");

-- CreateIndex
CREATE INDEX "account_userId_idx" ON "account"("userId");

-- CreateIndex
CREATE INDEX "verification_identifier_idx" ON "verification"("identifier");

-- CreateIndex
CREATE INDEX "room_roomTypeId_idx" ON "room"("roomTypeId");

-- CreateIndex
CREATE INDEX "room_status_idx" ON "room"("status");

-- CreateIndex
CREATE UNIQUE INDEX "room_number_key" ON "room"("number");

-- CreateIndex
CREATE INDEX "room_status_history_roomId_idx" ON "room_status_history"("roomId");

-- CreateIndex
CREATE INDEX "room_status_history_changedAt_idx" ON "room_status_history"("changedAt");

-- CreateIndex
CREATE UNIQUE INDEX "guest_userId_key" ON "guest"("userId");

-- CreateIndex
CREATE INDEX "guest_userId_idx" ON "guest"("userId");

-- CreateIndex
CREATE INDEX "guest_lastName_idx" ON "guest"("lastName");

-- CreateIndex
CREATE UNIQUE INDEX "guest_email_key" ON "guest"("email");

-- CreateIndex
CREATE INDEX "guest_preference_guestId_idx" ON "guest_preference"("guestId");

-- CreateIndex
CREATE UNIQUE INDEX "guest_preference_guestId_preferenceKey_key" ON "guest_preference"("guestId", "preferenceKey");

-- CreateIndex
CREATE UNIQUE INDEX "booking_confirmationCode_key" ON "booking"("confirmationCode");

-- CreateIndex
CREATE INDEX "booking_guestId_idx" ON "booking"("guestId");

-- CreateIndex
CREATE INDEX "booking_status_idx" ON "booking"("status");

-- CreateIndex
CREATE INDEX "booking_checkInDate_idx" ON "booking"("checkInDate");

-- CreateIndex
CREATE INDEX "booking_checkOutDate_idx" ON "booking"("checkOutDate");

-- CreateIndex
CREATE INDEX "booking_confirmationCode_idx" ON "booking"("confirmationCode");

-- CreateIndex
CREATE INDEX "booking_room_bookingId_idx" ON "booking_room"("bookingId");

-- CreateIndex
CREATE INDEX "booking_room_roomId_idx" ON "booking_room"("roomId");

-- CreateIndex
CREATE UNIQUE INDEX "check_in_bookingId_key" ON "check_in"("bookingId");

-- CreateIndex
CREATE INDEX "check_in_checkedInAt_idx" ON "check_in"("checkedInAt");

-- CreateIndex
CREATE UNIQUE INDEX "check_out_bookingId_key" ON "check_out"("bookingId");

-- CreateIndex
CREATE INDEX "check_out_checkedOutAt_idx" ON "check_out"("checkedOutAt");

-- CreateIndex
CREATE INDEX "housekeeping_task_roomId_idx" ON "housekeeping_task"("roomId");

-- CreateIndex
CREATE INDEX "housekeeping_task_status_idx" ON "housekeeping_task"("status");

-- CreateIndex
CREATE INDEX "housekeeping_task_assignedTo_idx" ON "housekeeping_task"("assignedTo");

-- CreateIndex
CREATE INDEX "housekeeping_task_scheduledFor_idx" ON "housekeeping_task"("scheduledFor");

-- CreateIndex
CREATE INDEX "maintenance_ticket_roomId_idx" ON "maintenance_ticket"("roomId");

-- CreateIndex
CREATE INDEX "maintenance_ticket_status_idx" ON "maintenance_ticket"("status");

-- CreateIndex
CREATE INDEX "maintenance_ticket_priority_idx" ON "maintenance_ticket"("priority");

-- CreateIndex
CREATE INDEX "maintenance_ticket_assignedTo_idx" ON "maintenance_ticket"("assignedTo");

-- CreateIndex
CREATE UNIQUE INDEX "folio_folioNumber_key" ON "folio"("folioNumber");

-- CreateIndex
CREATE INDEX "folio_guestId_idx" ON "folio"("guestId");

-- CreateIndex
CREATE INDEX "folio_status_idx" ON "folio"("status");

-- CreateIndex
CREATE INDEX "charge_folioId_idx" ON "charge"("folioId");

-- CreateIndex
CREATE INDEX "charge_category_idx" ON "charge"("category");

-- CreateIndex
CREATE INDEX "charge_postedAt_idx" ON "charge"("postedAt");

-- CreateIndex
CREATE INDEX "payment_folioId_idx" ON "payment"("folioId");

-- CreateIndex
CREATE INDEX "payment_method_idx" ON "payment"("method");

-- CreateIndex
CREATE INDEX "payment_processedAt_idx" ON "payment"("processedAt");

-- CreateIndex
CREATE UNIQUE INDEX "staff_userId_key" ON "staff"("userId");

-- CreateIndex
CREATE INDEX "staff_role_idx" ON "staff"("role");

-- CreateIndex
CREATE INDEX "staff_isActive_idx" ON "staff"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "staff_email_key" ON "staff"("email");

-- CreateIndex
CREATE INDEX "shift_staffId_idx" ON "shift"("staffId");

-- CreateIndex
CREATE INDEX "shift_startTime_idx" ON "shift"("startTime");

-- CreateIndex
CREATE INDEX "shift_status_idx" ON "shift"("status");

-- CreateIndex
CREATE INDEX "shift_report_shiftId_idx" ON "shift_report"("shiftId");

-- CreateIndex
CREATE INDEX "shift_report_createdAt_idx" ON "shift_report"("createdAt");

-- CreateIndex
CREATE INDEX "email_log_guestId_idx" ON "email_log"("guestId");

-- CreateIndex
CREATE INDEX "email_log_emailType_idx" ON "email_log"("emailType");

-- CreateIndex
CREATE INDEX "email_log_status_idx" ON "email_log"("status");

-- CreateIndex
CREATE INDEX "email_log_recipient_idx" ON "email_log"("recipient");

-- CreateIndex
CREATE INDEX "night_audit_status_idx" ON "night_audit"("status");

-- CreateIndex
CREATE UNIQUE INDEX "night_audit_auditDate_key" ON "night_audit"("auditDate");

-- AddForeignKey
ALTER TABLE "session" ADD CONSTRAINT "session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account" ADD CONSTRAINT "account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room" ADD CONSTRAINT "room_roomTypeId_fkey" FOREIGN KEY ("roomTypeId") REFERENCES "room_type"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_status_history" ADD CONSTRAINT "room_status_history_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "room"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guest" ADD CONSTRAINT "guest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guest_preference" ADD CONSTRAINT "guest_preference_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "guest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking" ADD CONSTRAINT "booking_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "guest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking" ADD CONSTRAINT "booking_masterBookingId_fkey" FOREIGN KEY ("masterBookingId") REFERENCES "booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_room" ADD CONSTRAINT "booking_room_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_room" ADD CONSTRAINT "booking_room_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "room"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "check_in" ADD CONSTRAINT "check_in_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "check_out" ADD CONSTRAINT "check_out_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "housekeeping_task" ADD CONSTRAINT "housekeeping_task_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "room"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "housekeeping_task" ADD CONSTRAINT "housekeeping_task_assignedTo_fkey" FOREIGN KEY ("assignedTo") REFERENCES "staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_ticket" ADD CONSTRAINT "maintenance_ticket_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "room"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_ticket" ADD CONSTRAINT "maintenance_ticket_assignedTo_fkey" FOREIGN KEY ("assignedTo") REFERENCES "staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "folio" ADD CONSTRAINT "folio_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "guest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "charge" ADD CONSTRAINT "charge_folioId_fkey" FOREIGN KEY ("folioId") REFERENCES "folio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment" ADD CONSTRAINT "payment_folioId_fkey" FOREIGN KEY ("folioId") REFERENCES "folio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff" ADD CONSTRAINT "staff_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shift" ADD CONSTRAINT "shift_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shift_report" ADD CONSTRAINT "shift_report_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "shift"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shift_report" ADD CONSTRAINT "shift_report_submittedBy_fkey" FOREIGN KEY ("submittedBy") REFERENCES "staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
