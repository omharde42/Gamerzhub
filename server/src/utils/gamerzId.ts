import crypto from 'crypto';
import prisma from '../config/database';

/**
 * Generates a random GamerZ ID string in the format GZHxxxxxx (e.g., GZH8F4A21).
 */
export function generateRandomGamerZId(): string {
  const characters = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let result = 'GZH';
  const randomBytes = crypto.randomBytes(6);
  for (let i = 0; i < 6; i++) {
    result += characters[randomBytes[i] % characters.length];
  }
  return result;
}

/**
 * Generates a guaranteed globally unique GamerZ ID by checking the database.
 */
export async function generateUniqueGamerZId(): Promise<string> {
  let gamerzId = generateRandomGamerZId();
  let attempts = 0;
  while (attempts < 10) {
    const existing = await prisma.user.findUnique({ where: { gamerzId } });
    if (!existing) return gamerzId;
    gamerzId = generateRandomGamerZId();
    attempts++;
  }
  return `GZH${Date.now().toString(36).toUpperCase().slice(-6)}`;
}

/**
 * Ensures an existing user has a GamerZ ID. If missing, auto-generates and persists one.
 */
export async function ensureUserGamerZId(user: { id: string; gamerzId?: string | null }): Promise<string> {
  if (user.gamerzId) return user.gamerzId;
  const newGamerZId = await generateUniqueGamerZId();
  await prisma.user.update({
    where: { id: user.id },
    data: { gamerzId: newGamerZId },
  });
  return newGamerZId;
}
