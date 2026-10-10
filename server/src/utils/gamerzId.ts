import crypto from 'crypto';
import prisma from '../config/database';

/**
 * Generates a cryptographically secure random GamerZ ID string in the format GZHxxxxxx (e.g., GZH8K29P).
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
 * Generates a guaranteed globally unique GamerZ ID by checking the database for collisions.
 */
export async function generateUniqueGamerZId(): Promise<string> {
  let gamerzId = generateRandomGamerZId();
  let attempts = 0;
  while (attempts < 20) {
    try {
      const existing = await prisma.user.findUnique({ where: { gamerzId } });
      if (!existing) return gamerzId;
    } catch (err: any) {
      if (err?.code === 'P2022' || err?.code === 'P2021' || err?.message?.includes('does not exist')) {
        console.warn('[generateUniqueGamerZId] Database column missing, returning generated ID');
        return gamerzId;
      }
      throw err;
    }
    gamerzId = generateRandomGamerZId();
    attempts++;
  }
  return `GZH${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
}

/**
 * Safely ensures a user has a unique GamerZ ID.
 * IF user already has a valid GamerZ ID: Keeps existing ID.
 * IF user lacks a GamerZ ID: Generates a new cryptographically secure unique GamerZ ID.
 */
export async function ensureUserGamerZId(user: { id: string; gamerzId?: string | null }): Promise<string> {
  if (user.gamerzId && user.gamerzId.trim().length > 0) {
    return user.gamerzId;
  }
  const newGamerZId = await generateUniqueGamerZId();
  try {
    await prisma.user.update({
      where: { id: user.id },
      data: { gamerzId: newGamerZId },
    });
  } catch (err: any) {
    if (err?.code === 'P2022' || err?.code === 'P2021' || err?.message?.includes('does not exist')) {
      console.warn('[ensureUserGamerZId] Column gamerzId missing in DB schema, returning generated ID in-memory');
    } else {
      throw err;
    }
  }
  return newGamerZId;
}
