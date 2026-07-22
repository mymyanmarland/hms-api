-- CreateTable
CREATE TABLE "otp_code" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "otp_code_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "otp_code_email_idx" ON "otp_code"("email");
