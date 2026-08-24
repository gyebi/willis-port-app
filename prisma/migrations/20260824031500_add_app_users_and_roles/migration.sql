
-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('AGENT', 'MANAGER');

-- CreateTable
CREATE TABLE "AppUser" (
    "id" TEXT NOT NULL,
    "firebaseUid" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "displayName" TEXT,
    "role" "UserRole" NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppUser_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AppUser_firebaseUid_key"
ON "AppUser"("firebaseUid");

-- CreateIndex
CREATE UNIQUE INDEX "AppUser_email_key"
ON "AppUser"("email");
