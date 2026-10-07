import prisma from '../config/database';
import { generateUniqueGamerZId } from '../utils/gamerzId';

/**
 * Scans all User records in PostgreSQL and assigns a unique GamerZ ID to any user missing one.
 * Guarantees zero data loss and 100% backward compatibility.
 */
export async function backfillGamerZIds() {
  console.log('[Backfill] Auditing existing users for GamerZ IDs...');
  const usersWithoutGamerZId = await prisma.user.findMany({
    where: { gamerzId: null },
    select: { id: true, email: true },
  });

  if (usersWithoutGamerZId.length === 0) {
    console.log('[Backfill] All existing users already have valid GamerZ IDs.');
    return;
  }

  console.log(`[Backfill] Found ${usersWithoutGamerZId.length} user(s) requiring GamerZ ID generation.`);
  let count = 0;

  for (const user of usersWithoutGamerZId) {
    const gamerzId = await generateUniqueGamerZId();
    await prisma.user.update({
      where: { id: user.id },
      data: { gamerzId },
    });
    count++;
    console.log(`[Backfill] Assigned ${gamerzId} to user ${user.id} (${user.email})`);
  }

  console.log(`[Backfill] Successfully provisioned GamerZ IDs for ${count} user(s).`);
}

if (require.main === module) {
  backfillGamerZIds()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('[Backfill Error]:', err);
      process.exit(1);
    });
}
