import prisma from '../config/database';

/**
 * Executes raw SQL DDL migrations over the active Prisma database connection.
 * Adds missing columns, indices, and tables safely using IF NOT EXISTS.
 * Preserves 100% of existing users, profiles, messages, posts, and data.
 */
export async function applyRawMigrations(): Promise<{ success: boolean; executed: string[]; errors: string[] }> {
  const executed: string[] = [];
  const errors: string[] = [];

  const statements = [
    // 1. User table additions
    `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "gamerzId" TEXT;`,
    `CREATE UNIQUE INDEX IF NOT EXISTS "User_gamerzId_key" ON "User"("gamerzId");`,
    `CREATE INDEX IF NOT EXISTS "User_gamerzId_idx" ON "User"("gamerzId");`,

    // 2. Profile table additions
    `ALTER TABLE "Profile" ADD COLUMN IF NOT EXISTS "allowComparison" BOOLEAN NOT NULL DEFAULT true;`,
    `CREATE INDEX IF NOT EXISTS "Profile_allowComparison_idx" ON "Profile"("allowComparison");`,

    // 3. Tournament table additions
    `ALTER TABLE "Tournament" ADD COLUMN IF NOT EXISTS "reminderMinutes" INTEGER DEFAULT 30;`,

    // 4. TournamentSupportTicket table additions
    `ALTER TABLE "TournamentSupportTicket" ADD COLUMN IF NOT EXISTS "targetUserId" TEXT;`,
    `ALTER TABLE "TournamentSupportTicket" ADD COLUMN IF NOT EXISTS "targetTeamId" TEXT;`,
    `ALTER TABLE "TournamentSupportTicket" ADD COLUMN IF NOT EXISTS "targetResultId" TEXT;`,
    `ALTER TABLE "TournamentSupportTicket" ADD COLUMN IF NOT EXISTS "targetMessageId" TEXT;`,
    `ALTER TABLE "TournamentSupportTicket" ADD COLUMN IF NOT EXISTS "evidenceUrl" TEXT;`,
    `ALTER TABLE "TournamentSupportTicket" ADD COLUMN IF NOT EXISTS "severity" TEXT DEFAULT 'MEDIUM';`,
    `ALTER TABLE "TournamentSupportTicket" ADD COLUMN IF NOT EXISTS "actionTaken" TEXT;`,
    `ALTER TABLE "TournamentSupportTicket" ADD COLUMN IF NOT EXISTS "reviewedById" TEXT;`,
    `ALTER TABLE "TournamentSupportTicket" ADD COLUMN IF NOT EXISTS "reviewedAt" TIMESTAMP(3);`,
    `ALTER TABLE "TournamentSupportTicket" ADD COLUMN IF NOT EXISTS "resolvedAt" TIMESTAMP(3);`,

    // 5. GameProfile table creation
    `CREATE TABLE IF NOT EXISTS "GameProfile" (
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
    );`,
    `CREATE UNIQUE INDEX IF NOT EXISTS "GameProfile_userId_game_key" ON "GameProfile"("userId", "game");`,
    `CREATE INDEX IF NOT EXISTS "GameProfile_game_rank_region_availability_idx" ON "GameProfile"("game", "rank", "region", "availability");`,
    `CREATE INDEX IF NOT EXISTS "GameProfile_userId_idx" ON "GameProfile"("userId");`,

    // 6. Foreign key constraint for GameProfile
    `DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'GameProfile_userId_fkey'
      ) THEN
        ALTER TABLE "GameProfile" ADD CONSTRAINT "GameProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
      END IF;
    END $$;`
  ];

  console.log('[AutoMigrate] Executing database schema DDL migrations...');

  for (const sql of statements) {
    try {
      await prisma.$executeRawUnsafe(sql);
      executed.push(sql.substring(0, 60) + '...');
    } catch (err: any) {
      console.warn(`[AutoMigrate Warn] SQL statement execution notice:`, err?.message || err);
      errors.push(err?.message || String(err));
    }
  }

  console.log(`[AutoMigrate Complete] Successfully executed ${executed.length} DDL migration step(s).`);
  return { success: errors.length === 0, executed, errors };
}
