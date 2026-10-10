-- AlterTable User: Add column gamerzId if not exists
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "gamerzId" TEXT;

-- CreateIndex: Add unique index on User(gamerzId) if not exists
CREATE UNIQUE INDEX IF NOT EXISTS "User_gamerzId_key" ON "User"("gamerzId");
CREATE INDEX IF NOT EXISTS "User_gamerzId_idx" ON "User"("gamerzId");

-- AlterTable Profile: Add column allowComparison if not exists
ALTER TABLE "Profile" ADD COLUMN IF NOT EXISTS "allowComparison" BOOLEAN NOT NULL DEFAULT true;
CREATE INDEX IF NOT EXISTS "Profile_allowComparison_idx" ON "Profile"("allowComparison");

-- CreateTable GameProfile if not exists
CREATE TABLE IF NOT EXISTS "GameProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "game" TEXT NOT NULL,
    "gameUid" TEXT,
    "rank" TEXT,
    "level" TEXT,
    "region" TEXT,
    "role" TEXT,
    "availability" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GameProfile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex for GameProfile
CREATE UNIQUE INDEX IF NOT EXISTS "GameProfile_userId_game_key" ON "GameProfile"("userId", "game");
CREATE INDEX IF NOT EXISTS "GameProfile_game_rank_region_availability_idx" ON "GameProfile"("game", "rank", "region", "availability");
CREATE INDEX IF NOT EXISTS "GameProfile_userId_idx" ON "GameProfile"("userId");

-- AddForeignKey for GameProfile if not exists
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'GameProfile_userId_fkey'
    ) THEN
        ALTER TABLE "GameProfile" ADD CONSTRAINT "GameProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
