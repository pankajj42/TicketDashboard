-- AlterTable
ALTER TABLE "users" ADD COLUMN     "adminElevatedSessionId" TEXT,
ADD COLUMN     "adminElevatedUntil" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "admin_elevations" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "jti" TEXT NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "ipAddress" TEXT,
    "userAgent" TEXT,

    CONSTRAINT "admin_elevations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "admin_elevations_jti_key" ON "admin_elevations"("jti");

-- CreateIndex
CREATE INDEX "admin_elevations_userId_idx" ON "admin_elevations"("userId");

-- CreateIndex
CREATE INDEX "admin_elevations_sessionId_idx" ON "admin_elevations"("sessionId");

-- CreateIndex
CREATE INDEX "admin_elevations_expiresAt_idx" ON "admin_elevations"("expiresAt");

-- CreateIndex
CREATE INDEX "users_adminElevatedUntil_idx" ON "users"("adminElevatedUntil");

-- AddForeignKey
ALTER TABLE "admin_elevations" ADD CONSTRAINT "admin_elevations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
