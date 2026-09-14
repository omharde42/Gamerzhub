import { Client, Databases, Query } from 'node-appwrite';

export interface AppwriteGameProfileDocument {
  $id?: string;
  userId: string;
  gameId: string;
  rank: string;
  playstyle: string;
  language: string;
  micPreference: boolean;
  availability: string;
  reputationScore: number;
  completedSessions: number;
  isVerified: boolean;
  identityType: string;
  identityDataJson: string;
  updatedAt: string;
}

export class AppwriteService {
  private client: Client | null = null;
  private databases: Databases | null = null;
  private isConfigured: boolean = false;

  private endpoint: string = process.env.APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1';
  private projectId: string = process.env.APPWRITE_PROJECT_ID || '';
  private apiKey: string = process.env.APPWRITE_API_KEY || '';
  private databaseId: string = process.env.APPWRITE_DATABASE_ID || 'gamerzhub';
  private collectionId: string = 'game_profiles_read_model';

  constructor() {
    this.initClient();
  }

  private initClient() {
    if (this.endpoint && this.projectId && this.apiKey) {
      try {
        this.client = new Client()
          .setEndpoint(this.endpoint)
          .setProject(this.projectId)
          .setKey(this.apiKey);

        this.databases = new Databases(this.client);
        this.isConfigured = true;
      } catch (err) {
        console.warn('Appwrite Client initialization notice:', err);
        this.isConfigured = false;
      }
    } else {
      this.isConfigured = false;
    }
  }

  public getIsConfigured(): boolean {
    return this.isConfigured;
  }

  /**
   * Sync Game Profile document to Appwrite Read Model
   */
  async syncGameProfile(profile: any): Promise<boolean> {
    if (!this.isConfigured || !this.databases) {
      return false;
    }

    try {
      const docId = `${profile.userId}_${profile.gameId}`.replace(/[^a-zA-Z0-9._-]/g, '_');
      const payload = {
        userId: profile.userId,
        gameId: profile.gameId,
        rank: profile.rank || 'UNRANKED',
        playstyle: profile.playstyle || 'BALANCED',
        language: profile.language || 'ENGLISH',
        micPreference: profile.micPreference ?? true,
        availability: profile.availability || 'EVENING',
        reputationScore: profile.reputationScore ?? 5.0,
        completedSessions: profile.completedSessions ?? 0,
        isVerified: profile.isVerified ?? false,
        identityType: profile.identityType || 'SELF_REPORTED',
        identityDataJson: JSON.stringify(profile.identityData || {}),
        updatedAt: new Date().toISOString(),
      };

      try {
        await this.databases.updateDocument(this.databaseId, this.collectionId, docId, payload);
      } catch (updateErr: any) {
        if (updateErr?.code === 404) {
          await this.databases.createDocument(this.databaseId, this.collectionId, docId, payload);
        } else {
          throw updateErr;
        }
      }
      return true;
    } catch (err) {
      console.warn('Appwrite sync failure (falling back to primary PostgreSQL):', err);
      return false;
    }
  }

  /**
   * Query Teammate Candidates from Appwrite Read Model
   */
  async getTeammatesFromReadModel(gameId: string, excludeUserId: string, filters: { rank?: string; playstyle?: string; limit?: number }) {
    if (!this.isConfigured || !this.databases) {
      return null;
    }

    try {
      const queries = [
        Query.equal('gameId', gameId),
        Query.notEqual('userId', excludeUserId),
        Query.limit(filters.limit || 20),
      ];

      if (filters.rank) queries.push(Query.equal('rank', filters.rank));
      if (filters.playstyle) queries.push(Query.equal('playstyle', filters.playstyle));

      const response = await this.databases.listDocuments(this.databaseId, this.collectionId, queries);

      return response.documents.map((doc: any) => ({
        id: doc.$id,
        userId: doc.userId,
        gameId: doc.gameId,
        rank: doc.rank,
        playstyle: doc.playstyle,
        language: doc.language,
        micPreference: doc.micPreference,
        availability: doc.availability,
        reputationScore: doc.reputationScore,
        completedSessions: doc.completedSessions,
        isVerified: doc.isVerified,
        identityType: doc.identityType,
        identityData: doc.identityDataJson ? JSON.parse(doc.identityDataJson) : {},
      }));
    } catch (err) {
      console.warn('Appwrite read query failure (falling back to primary PostgreSQL):', err);
      return null;
    }
  }
}

export const appwriteService = new AppwriteService();
