-- Add friend code used for friend invites
ALTER TABLE "User" ADD COLUMN "friendCode" TEXT;

-- Backfill existing users with deterministic unique codes
UPDATE "User"
SET "friendCode" = 'GM-' || UPPER(REPLACE("id", '-', ''))
WHERE "friendCode" IS NULL;

ALTER TABLE "User" ALTER COLUMN "friendCode" SET NOT NULL;

CREATE UNIQUE INDEX "User_friendCode_key" ON "User"("friendCode");
