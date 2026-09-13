import { Client, Databases } from 'node-appwrite';

export const appwriteConfig = {
  endpoint: process.env.APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1',
  projectId: process.env.APPWRITE_PROJECT_ID || '',
  apiKey: process.env.APPWRITE_API_KEY || '',
  databaseId: process.env.APPWRITE_DATABASE_ID || 'gamerzhub_db',
  collections: {
    gameRegistry: process.env.APPWRITE_COLLECTION_GAME_REGISTRY || 'game_registry',
    publicGamerProfiles: process.env.APPWRITE_COLLECTION_PUBLIC_GAMER_PROFILES || 'public_gamer_profiles',
    gameProfiles: process.env.APPWRITE_COLLECTION_GAME_PROFILES || 'game_profiles',
    teammateDiscovery: process.env.APPWRITE_COLLECTION_TEAMMATE_DISCOVERY || 'teammate_discovery',
  },
};

let clientInstance: Client | null = null;
let databasesInstance: Databases | null = null;

export function isAppwriteConfigured(): boolean {
  return Boolean(appwriteConfig.projectId && appwriteConfig.apiKey && appwriteConfig.databaseId);
}

export function getAppwriteDatabases(): Databases | null {
  if (!isAppwriteConfigured()) {
    return null;
  }
  if (!databasesInstance) {
    try {
      clientInstance = new Client();
      clientInstance
        .setEndpoint(appwriteConfig.endpoint)
        .setProject(appwriteConfig.projectId)
        .setKey(appwriteConfig.apiKey);
      databasesInstance = new Databases(clientInstance);
    } catch (err: any) {
      console.warn('[Appwrite] Failed to initialize Appwrite client:', err?.message || err);
      return null;
    }
  }
  return databasesInstance;
}
