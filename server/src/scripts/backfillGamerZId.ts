import prisma from '../config/database';
import { generateUniqueGamerZId, ensureUserGamerZId } from '../utils/gamerzId';

/**
 * Phase 2 — Safely Audits and Migrates Existing Users.
 * - IF user already has a valid GamerZ ID: Keeps existing ID.
 * - IF user lacks a GamerZ ID: Generates a new cryptographically secure unique GamerZ ID with collision verification.
 * - Enforces 100% data preservation and unique constraint compliance.
 */
export async function migrateExistingUsersSafely() {
  console.log('[Phase 2 Migration] Auditing existing users in PostgreSQL...');

  const allUsers = await prisma.user.findMany({
    select: { id: true, email: true, gamerzId: true },
  });

  console.log(`[Phase 2 Migration] Found ${allUsers.length} total user record(s).`);

  let keptCount = 0;
  let generatedCount = 0;

  for (const user of allUsers) {
    if (user.gamerzId && user.gamerzId.trim().length > 0) {
      keptCount++;
      console.log(`[Phase 2 Migration] Kept existing GamerZ ID '${user.gamerzId}' for user ${user.id}`);
    } else {
      const newGamerZId = await ensureUserGamerZId(user);
      generatedCount++;
      console.log(`[Phase 2 Migration] Provisioned new GamerZ ID '${newGamerZId}' for user ${user.id} (${user.email})`);
    }
  }

  // Verification step: Ensure zero users are missing a GamerZ ID
  const unmigratedCount = await prisma.user.count({ where: { gamerzId: null } });
  if (unmigratedCount > 0) {
    throw new Error(`[Phase 2 Migration Error] ${unmigratedCount} user(s) still missing GamerZ ID after migration!`);
  }

  console.log(`[Phase 2 Migration Success] Total: ${allUsers.length} | Preserved: ${keptCount} | Provisioned: ${generatedCount}`);
}

export const backfillGamerZIds = migrateExistingUsersSafely;

if (require.main === module) {
  migrateExistingUsersSafely()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('[Phase 2 Migration Failed]:', err);
      process.exit(1);
    });
}
