-- CreateTable
CREATE TABLE "banned_email" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "reason" TEXT,
    "bannedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "banned_email_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "banned_email_email_key" ON "banned_email"("email");

-- CreateIndex
CREATE INDEX "banned_email_bannedById_idx" ON "banned_email"("bannedById");

-- AddForeignKey
ALTER TABLE "banned_email" ADD CONSTRAINT "banned_email_bannedById_fkey" FOREIGN KEY ("bannedById") REFERENCES "staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;
