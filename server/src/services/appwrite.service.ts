import { Query } from 'node-appwrite';
import { getAppwriteDatabases, appwriteConfig, isAppwriteConfigured } from '../config/appwrite';

export interface PublicProfileReadModel {
  userId: string;
  username: string;
  displayName?: string | null;
  avatar?: string | null;
  banner?: string | null;
  bio?: string | null;
  country?: string | null;
  rank?: string | null;
  winRate?: number;
  kd?: number;
  totalMatches?: number;
  gamerScore?: number;
  verified?: boolean;
  languages?: string[];
  updatedAt: string;
}

export interface GameProfileReadModel {
  userId: string;
  game: string;
  inGameUid: string;
  inGameName: string;
  region?: string | null;
  rank?: string | null;
  level?: number | null;
  kdRatio?: number | null;
  winRate?: number | null;
  verified?: boolean;
  syncStatus?: string | null;
  updatedAt: string;
}

export interface TeammateDiscoveryReadModel {
  id: string; // game_userId
  userId: string;
  gameId: string;
  rank: string;
  playstyle: string;
  language: string;
  micPreference: boolean;
  availability: string;
  reputationScore: number;
  isVerified: boolean;
  username?: string | null;
  displayName?: string | null;
  avatar?: string | null;
  updatedAt: string;
}

export class AppwriteService {
  private get db() {
    return getAppwriteDatabases();
  }

  public isAvailable(): boolean {
    return isAppwriteConfigured() && this.db !== null;
  }

  // ─── 1. GAME REGISTRY ────────────────────────────────────────────────────────

  async getGameRegistry(gameId?: string): Promise<Record<string, any> | null> {
    if (!this.isAvailable()) return null;
    try {
      const db = this.db!;
      if (gameId) {
        const doc = await db.getDocument(
          appwriteConfig.databaseId,
          appwriteConfig.collections.gameRegistry,
          gameId
        );
        return doc ? JSON.parse(doc.payload as string) : null;
      } else {
        const docs = await db.listDocuments(
          appwriteConfig.databaseId,
          appwriteConfig.collections.gameRegistry,
          [Query.limit(100)]
        );
        if (docs.documents.length === 0) return null;
        const result: Record<string, any> = {};
        for (const d of docs.documents) {
          result[d.$id] = JSON.parse(d.payload as string);
        }
        return result;
      }
    } catch (err: any) {
      console.warn(`[Appwrite] getGameRegistry fallback triggered:`, err?.message || err);
      return null;
    }
  }

  async syncGameRegistry(gameId: string, payload: any): Promise<boolean> {
    if (!this.isAvailable()) return false;
    try {
      const db = this.db!;
      const docPayload = {
        payload: JSON.stringify(payload),
        updatedAt: new Date().toISOString(),
      };
      try {
        await db.updateDocument(
          appwriteConfig.databaseId,
          appwriteConfig.collections.gameRegistry,
          gameId,
          docPayload
        );
      } catch (err: any) {
        await db.createDocument(
          appwriteConfig.databaseId,
          appwriteConfig.collections.gameRegistry,
          gameId,
          docPayload
        );
      }
      return true;
    } catch (err: any) {
      console.warn(`[Appwrite] syncGameRegistry error:`, err?.message || err);
      return false;
    }
  }

  // ─── 2. PUBLIC GAMER PROFILES ───────────────────────────────────────────────

  async getPublicProfile(userId: string): Promise<PublicProfileReadModel | null> {
    if (!this.isAvailable()) return null;
    try {
      const db = this.db!;
      const doc = await db.getDocument(
        appwriteConfig.databaseId,
        appwriteConfig.collections.publicGamerProfiles,
        userId
      );
      if (!doc) return null;
      return {
        userId: doc.userId,
        username: doc.username,
        displayName: doc.displayName,
        avatar: doc.avatar,
        banner: doc.banner,
        bio: doc.bio,
        country: doc.country,
        rank: doc.rank,
        winRate: doc.winRate,
        kd: doc.kd,
        totalMatches: doc.totalMatches,
        gamerScore: doc.gamerScore,
        verified: doc.verified,
        languages: typeof doc.languages === 'string' ? JSON.parse(doc.languages) : (doc.languages || []),
        updatedAt: doc.updatedAt,
      };
    } catch (err: any) {
      return null;
    }
  }

  async syncPublicProfile(data: PublicProfileReadModel): Promise<boolean> {
    if (!this.isAvailable()) return false;
    try {
      const db = this.db!;
      const docData = {
        ...data,
        languages: JSON.stringify(data.languages || []),
        updatedAt: new Date().toISOString(),
      };
      try {
        await db.updateDocument(
          appwriteConfig.databaseId,
          appwriteConfig.collections.publicGamerProfiles,
          data.userId,
          docData
        );
      } catch (err: any) {
        await db.createDocument(
          appwriteConfig.databaseId,
          appwriteConfig.collections.publicGamerProfiles,
          data.userId,
          docData
        );
      }
      return true;
    } catch (err: any) {
      console.warn(`[Appwrite] syncPublicProfile error:`, err?.message || err);
      return false;
    }
  }

  // ─── 3. GAME PROFILES ───────────────────────────────────────────────────────

  async getGameProfile(userId: string, gameId: string): Promise<GameProfileReadModel | null> {
    if (!this.isAvailable()) return null;
    const docId = `${userId}_${gameId}`;
    try {
      const db = this.db!;
      const doc = await db.getDocument(
        appwriteConfig.databaseId,
        appwriteConfig.collections.gameProfiles,
        docId
      );
      if (!doc) return null;
      return {
        userId: doc.userId,
        game: doc.game,
        inGameUid: doc.inGameUid,
        inGameName: doc.inGameName,
        region: doc.region,
        rank: doc.rank,
        level: doc.level,
        kdRatio: doc.kdRatio,
        winRate: doc.winRate,
        verified: doc.verified,
        syncStatus: doc.syncStatus,
        updatedAt: doc.updatedAt,
      };
    } catch (err: any) {
      return null;
    }
  }

  async syncGameProfile(data: GameProfileReadModel): Promise<boolean> {
    if (!this.isAvailable()) return false;
    const docId = `${data.userId}_${data.game}`;
    try {
      const db = this.db!;
      const docData = {
        ...data,
        updatedAt: new Date().toISOString(),
      };
      try {
        await db.updateDocument(
          appwriteConfig.databaseId,
          appwriteConfig.collections.gameProfiles,
          docId,
          docData
        );
      } catch (err: any) {
        await db.createDocument(
          appwriteConfig.databaseId,
          appwriteConfig.collections.gameProfiles,
          docId,
          docData
        );
      }
      return true;
    } catch (err: any) {
      console.warn(`[Appwrite] syncGameProfile error:`, err?.message || err);
      return false;
    }
  }

  // ─── 4. TEAMMATE DISCOVERY ─────────────────────────────────────────────────

  async getTeammateCandidates(
    gameId: string,
    filters: { rank?: string; playstyle?: string; language?: string; availability?: string; limit?: number }
  ): Promise<TeammateDiscoveryReadModel[] | null> {
    if (!this.isAvailable()) return null;
    try {
      const db = this.db!;
      const queries = [Query.equal('gameId', gameId), Query.limit(filters.limit || 20)];

      if (filters.rank) queries.push(Query.equal('rank', filters.rank));
      if (filters.playstyle) queries.push(Query.equal('playstyle', filters.playstyle));
      if (filters.language) queries.push(Query.equal('language', filters.language));
      if (filters.availability) queries.push(Query.equal('availability', filters.availability));

      const docs = await db.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.collections.teammateDiscovery,
        queries
      );

      if (docs.documents.length === 0) return null;

      return docs.documents.map((doc: any) => ({
        id: doc.$id,
        userId: doc.userId,
        gameId: doc.gameId,
        rank: doc.rank,
        playstyle: doc.playstyle,
        language: doc.language,
        micPreference: doc.micPreference,
        availability: doc.availability,
        reputationScore: doc.reputationScore,
        isVerified: doc.isVerified,
        username: doc.username,
        displayName: doc.displayName,
        avatar: doc.avatar,
        updatedAt: doc.updatedAt,
      }));
    } catch (err: any) {
      return null;
    }
  }

  async syncTeammateDiscovery(data: TeammateDiscoveryReadModel): Promise<boolean> {
    if (!this.isAvailable()) return false;
    const docId = `${data.gameId}_${data.userId}`;
    try {
      const db = this.db!;
      const docData = {
        ...data,
        updatedAt: new Date().toISOString(),
      };
      try {
        await db.updateDocument(
          appwriteConfig.databaseId,
          appwriteConfig.collections.teammateDiscovery,
          docId,
          docData
        );
      } catch (err: any) {
        await db.createDocument(
          appwriteConfig.databaseId,
          appwriteConfig.collections.teammateDiscovery,
          docId,
          docData
        );
      }
      return true;
    } catch (err: any) {
      console.warn(`[Appwrite] syncTeammateDiscovery error:`, err?.message || err);
      return false;
    }
  }
}

export const appwriteService = new AppwriteService();
