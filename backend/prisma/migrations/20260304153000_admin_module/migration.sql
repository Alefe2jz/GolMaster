-- Admin support with role-based access control and control tables.
CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN');

ALTER TABLE "User"
ADD COLUMN "role" "UserRole" NOT NULL DEFAULT 'USER',
ADD COLUMN "isBlocked" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "blockedAt" TIMESTAMP(3),
ADD COLUMN "blockedReason" TEXT;

CREATE TABLE "AdminNotification" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "type" TEXT NOT NULL DEFAULT 'info',
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AdminNotification_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AdminSetting" (
  "id" TEXT NOT NULL DEFAULT 'global',
  "maintenanceMode" BOOLEAN NOT NULL DEFAULT false,
  "maintenanceMessage" TEXT,
  "allowRegistrations" BOOLEAN NOT NULL DEFAULT true,
  "allowGoogleAuth" BOOLEAN NOT NULL DEFAULT true,
  "updatedById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AdminSetting_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "AdminNotification"
ADD CONSTRAINT "AdminNotification_createdById_fkey"
FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "AdminSetting"
ADD CONSTRAINT "AdminSetting_updatedById_fkey"
FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
