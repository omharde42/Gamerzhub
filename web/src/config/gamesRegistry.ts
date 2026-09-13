export type IdentityType =
  | 'CHARACTER_ID'
  | 'PLAYER_TAG'
  | 'RIOT_ID'
  | 'STEAM_ID64'
  | 'USERNAME'
  | 'SELF_REPORTED_UID'
  | 'NONE';

export type TeamModel = 'SOLO' | 'DUO' | 'SQUAD' | 'CUSTOM';

export type SessionModel =
  | 'DIRECT_LOBBY'
  | 'ROOM_CODE'
  | 'FRIEND_INVITE'
  | 'PARTY_LINK'
  | 'EXTERNAL_HANDOFF'
  | 'OFFLINE_SOLO';

export type JoinCapability =
  | 'NATIVE_LINK'
  | 'ROOM_CODE'
  | 'MANUAL_HANDOFF'
  | 'UNSUPPORTED';

export type VerificationCapability = 'OFFICIAL_API' | 'SELF_REPORTED' | 'UNAVAILABLE';

export type ApiStatus = 'LIVE' | 'COMMUNITY' | 'COMMUNITY_MANUAL' | 'OFFICIAL_API';

export interface GameRegistryEntry {
  gameId: string;
  slug: string;
  displayName: string;
  category: 'Battle Royale' | 'Strategy' | 'Arcade' | 'FPS' | 'Sandbox' | 'Board' | 'Sports' | 'Racing';
  platforms: string[];
  modes: string[];
  identityType: IdentityType;
  requiredProfileFields: string[];
  optionalProfileFields: string[];
  teamModel: TeamModel;
  sessionModel: SessionModel;
  joinCapability: JoinCapability;
  externalLaunchRequirement: boolean;
  externalLaunchNote?: string;
  verificationCapability: VerificationCapability;
  apiStatus: ApiStatus;
  enabledState: boolean;
  capabilityValidationTimestamp: string;
}

const TIMESTAMP = new Date().toISOString();

export const CANONICAL_GAMES_REGISTRY: Record<string, GameRegistryEntry> = {
  bgmi: {
    gameId: 'bgmi',
    slug: 'bgmi',
    displayName: 'BGMI',
    category: 'Battle Royale',
    platforms: ['Android', 'iOS'],
    modes: ['Erangel Squad', 'Livik Duo', 'TDM 4v4', 'Classic Solo'],
    identityType: 'CHARACTER_ID',
    requiredProfileFields: ['uid'],
    optionalProfileFields: ['inGameName', 'rank', 'kd'],
    teamModel: 'SQUAD',
    sessionModel: 'ROOM_CODE',
    joinCapability: 'ROOM_CODE',
    externalLaunchRequirement: true,
    externalLaunchNote: 'Copy room code & password to join custom room inside BGMI.',
    verificationCapability: 'SELF_REPORTED',
    apiStatus: 'COMMUNITY_MANUAL',
    enabledState: true,
    capabilityValidationTimestamp: TIMESTAMP,
  },
  clashofclans: {
    gameId: 'clashofclans',
    slug: 'clashofclans',
    displayName: 'Clash of Clans',
    category: 'Strategy',
    platforms: ['Android', 'iOS'],
    modes: ['Clan Wars', 'Friendly Challenge', 'Builder Hall', 'Trophy Push'],
    identityType: 'PLAYER_TAG',
    requiredProfileFields: ['playerTag'],
    optionalProfileFields: ['townHallLevel', 'clanName'],
    teamModel: 'CUSTOM',
    sessionModel: 'FRIEND_INVITE',
    joinCapability: 'MANUAL_HANDOFF',
    externalLaunchRequirement: true,
    externalLaunchNote: 'Use Player Tag to send friendly challenge or clan invite inside Clash of Clans.',
    verificationCapability: 'OFFICIAL_API',
    apiStatus: 'OFFICIAL_API',
    enabledState: true,
    capabilityValidationTimestamp: TIMESTAMP,
  },
  pubg_mobile: {
    gameId: 'pubg_mobile',
    slug: 'pubg_mobile',
    displayName: 'PUBG Mobile',
    category: 'Battle Royale',
    platforms: ['Android', 'iOS'],
    modes: ['Classic Squad', 'TDM', 'Arena', 'Payload'],
    identityType: 'CHARACTER_ID',
    requiredProfileFields: ['uid'],
    optionalProfileFields: ['inGameName', 'region'],
    teamModel: 'SQUAD',
    sessionModel: 'ROOM_CODE',
    joinCapability: 'ROOM_CODE',
    externalLaunchRequirement: true,
    externalLaunchNote: 'Separate global build from BGMI. Copy custom room ID & password to join.',
    verificationCapability: 'SELF_REPORTED',
    apiStatus: 'COMMUNITY_MANUAL',
    enabledState: true,
    capabilityValidationTimestamp: TIMESTAMP,
  },
  freefire: {
    gameId: 'freefire',
    slug: 'freefire',
    displayName: 'Free Fire MAX',
    category: 'Battle Royale',
    platforms: ['Android', 'iOS'],
    modes: ['BR Squad', 'CS Squad', 'Lone Wolf', 'Custom Room'],
    identityType: 'SELF_REPORTED_UID',
    requiredProfileFields: ['freeFireUid'],
    optionalProfileFields: ['freeFireUsername', 'preferredMode', 'rank', 'playstyle', 'micPreference'],
    teamModel: 'SQUAD',
    sessionModel: 'ROOM_CODE',
    joinCapability: 'ROOM_CODE',
    externalLaunchRequirement: true,
    externalLaunchNote: 'Copy Team Code or Room ID to join match in Free Fire MAX.',
    verificationCapability: 'SELF_REPORTED',
    apiStatus: 'COMMUNITY_MANUAL',
    enabledState: true,
    capabilityValidationTimestamp: TIMESTAMP,
  },
  smashkarts: {
    gameId: 'smashkarts',
    slug: 'smashkarts',
    displayName: 'Smash Karts',
    category: 'Arcade',
    platforms: ['Web', 'Mobile Browser'],
    modes: ['Free For All', 'Gem Grab', 'Hat Hold', 'Custom Game'],
    identityType: 'USERNAME',
    requiredProfileFields: ['username'],
    optionalProfileFields: ['favoriteKart'],
    teamModel: 'SOLO',
    sessionModel: 'PARTY_LINK',
    joinCapability: 'NATIVE_LINK',
    externalLaunchRequirement: false,
    externalLaunchNote: 'Direct web party room link provided for immediate lobby joining.',
    verificationCapability: 'UNAVAILABLE',
    apiStatus: 'COMMUNITY',
    enabledState: true,
    capabilityValidationTimestamp: TIMESTAMP,
  },

  codm: {
    gameId: 'codm',
    slug: 'codm',
    displayName: 'Call of Duty: Mobile',
    category: 'FPS',
    platforms: ['Android', 'iOS'],
    modes: ['MP 5v5', 'BR Squad', 'Search & Destroy', 'Private Room'],
    identityType: 'USERNAME',
    requiredProfileFields: ['username'],
    optionalProfileFields: ['playerUid'],
    teamModel: 'SQUAD',
    sessionModel: 'ROOM_CODE',
    joinCapability: 'ROOM_CODE',
    externalLaunchRequirement: true,
    externalLaunchNote: 'Add friend via CODM Username or enter Private Room Code.',
    verificationCapability: 'SELF_REPORTED',
    apiStatus: 'COMMUNITY_MANUAL',
    enabledState: true,
    capabilityValidationTimestamp: TIMESTAMP,
  },
  roblox: {
    gameId: 'roblox',
    slug: 'roblox',
    displayName: 'Roblox',
    category: 'Arcade',
    platforms: ['Android', 'iOS', 'PC', 'Xbox'],
    modes: ['Private Server', 'VIP Server', 'Party Play'],
    identityType: 'USERNAME',
    requiredProfileFields: ['username'],
    optionalProfileFields: ['robloxUserId'],
    teamModel: 'CUSTOM',
    sessionModel: 'PARTY_LINK',
    joinCapability: 'NATIVE_LINK',
    externalLaunchRequirement: true,
    externalLaunchNote: 'Click private server link or join user via Roblox profile.',
    verificationCapability: 'SELF_REPORTED',
    apiStatus: 'COMMUNITY',
    enabledState: true,
    capabilityValidationTimestamp: TIMESTAMP,
  },
  minecraft: {
    gameId: 'minecraft',
    slug: 'minecraft',
    displayName: 'Minecraft',
    category: 'Sandbox',
    platforms: ['PC', 'Android', 'iOS', 'Xbox', 'PlayStation'],
    modes: ['SMP Server', 'BedWars', 'Survival Co-op', 'Creative Build'],
    identityType: 'USERNAME',
    requiredProfileFields: ['username'],
    optionalProfileFields: ['edition'],
    teamModel: 'CUSTOM',
    sessionModel: 'EXTERNAL_HANDOFF',
    joinCapability: 'MANUAL_HANDOFF',
    externalLaunchRequirement: true,
    externalLaunchNote: 'Copy Server IP:Port or Realm invite code into Minecraft.',
    verificationCapability: 'UNAVAILABLE',
    apiStatus: 'COMMUNITY_MANUAL',
    enabledState: true,
    capabilityValidationTimestamp: TIMESTAMP,
  },
  ludoking: {
    gameId: 'ludoking',
    slug: 'ludoking',
    displayName: 'Ludo King',
    category: 'Board',
    platforms: ['Android', 'iOS'],
    modes: ['2 Player Classic', '4 Player Classic', 'Rush Mode', 'Private Room'],
    identityType: 'SELF_REPORTED_UID',
    requiredProfileFields: ['username'],
    optionalProfileFields: ['level'],
    teamModel: 'DUO',
    sessionModel: 'ROOM_CODE',
    joinCapability: 'ROOM_CODE',
    externalLaunchRequirement: true,
    externalLaunchNote: 'Enter 8-digit Private Room Code in Ludo King Play with Friends mode.',
    verificationCapability: 'UNAVAILABLE',
    apiStatus: 'COMMUNITY_MANUAL',
    enabledState: true,
    capabilityValidationTimestamp: TIMESTAMP,
  },
  eightballpool: {
    gameId: 'eightballpool',
    slug: 'eightballpool',
    displayName: '8 Ball Pool',
    category: 'Board',
    platforms: ['Android', 'iOS', 'Web'],
    modes: ['1v1 Match', '9 Ball', 'Private Challenge'],
    identityType: 'SELF_REPORTED_UID',
    requiredProfileFields: ['uniqueId'],
    optionalProfileFields: ['cueName'],
    teamModel: 'SOLO',
    sessionModel: 'FRIEND_INVITE',
    joinCapability: 'MANUAL_HANDOFF',
    externalLaunchRequirement: true,
    externalLaunchNote: 'Search Unique ID in 8 Ball Pool friends list to send match challenge.',
    verificationCapability: 'UNAVAILABLE',
    apiStatus: 'COMMUNITY_MANUAL',
    enabledState: true,
    capabilityValidationTimestamp: TIMESTAMP,
  },
  brawlstars: {
    gameId: 'brawlstars',
    slug: 'brawlstars',
    displayName: 'Brawl Stars',
    category: 'Arcade',
    platforms: ['Android', 'iOS'],
    modes: ['Gem Grab', 'Showdown', 'Brawl Ball', 'Team Room'],
    identityType: 'PLAYER_TAG',
    requiredProfileFields: ['playerTag'],
    optionalProfileFields: ['trophies'],
    teamModel: 'SQUAD',
    sessionModel: 'PARTY_LINK',
    joinCapability: 'MANUAL_HANDOFF',
    externalLaunchRequirement: true,
    externalLaunchNote: 'Use Team Code or Supercell Friend Link to join room in Brawl Stars.',
    verificationCapability: 'OFFICIAL_API',
    apiStatus: 'OFFICIAL_API',
    enabledState: true,
    capabilityValidationTimestamp: TIMESTAMP,
  },
  clashroyale: {
    gameId: 'clashroyale',
    slug: 'clashroyale',
    displayName: 'Clash Royale',
    category: 'Strategy',
    platforms: ['Android', 'iOS'],
    modes: ['1v1 Battle', '2v2 Battle', 'Friendly Battle', 'Tournament'],
    identityType: 'PLAYER_TAG',
    requiredProfileFields: ['playerTag'],
    optionalProfileFields: ['trophies'],
    teamModel: 'DUO',
    sessionModel: 'FRIEND_INVITE',
    joinCapability: 'MANUAL_HANDOFF',
    externalLaunchRequirement: true,
    externalLaunchNote: 'Use Player Tag or Friendly Battle link in Clash Royale.',
    verificationCapability: 'OFFICIAL_API',
    apiStatus: 'OFFICIAL_API',
    enabledState: true,
    capabilityValidationTimestamp: TIMESTAMP,
  },
  realcricket: {
    gameId: 'realcricket',
    slug: 'realcricket',
    displayName: 'Real Cricket',
    category: 'Sports',
    platforms: ['Android', 'iOS'],
    modes: ['2 Over Match', '5 Over Match', 'Multiplayer Private Room'],
    identityType: 'USERNAME',
    requiredProfileFields: ['username'],
    optionalProfileFields: ['level'],
    teamModel: 'SOLO',
    sessionModel: 'ROOM_CODE',
    joinCapability: 'ROOM_CODE',
    externalLaunchRequirement: true,
    externalLaunchNote: 'Copy Room ID to join Private Room in Real Cricket.',
    verificationCapability: 'UNAVAILABLE',
    apiStatus: 'COMMUNITY_MANUAL',
    enabledState: true,
    capabilityValidationTimestamp: TIMESTAMP,
  },
  efootball: {
    gameId: 'efootball',
    slug: 'efootball',
    displayName: 'eFootball',
    category: 'Sports',
    platforms: ['Android', 'iOS', 'PC', 'Console'],
    modes: ['Match Room 1v1', 'Co-op 3v3', 'Friend Match'],
    identityType: 'USERNAME',
    requiredProfileFields: ['ownerName'],
    optionalProfileFields: ['userUniqueId'],
    teamModel: 'SOLO',
    sessionModel: 'ROOM_CODE',
    joinCapability: 'ROOM_CODE',
    externalLaunchRequirement: true,
    externalLaunchNote: 'Copy Match Room Number to join 1v1 or Co-op room in eFootball.',
    verificationCapability: 'UNAVAILABLE',
    apiStatus: 'COMMUNITY_MANUAL',
    enabledState: true,
    capabilityValidationTimestamp: TIMESTAMP,
  },
  drdriving: {
    gameId: 'drdriving',
    slug: 'drdriving',
    displayName: 'Dr. Driving',
    category: 'Racing',
    platforms: ['Android', 'iOS'],
    modes: ['Offline Career', 'Single Player High Score'],
    identityType: 'NONE',
    requiredProfileFields: [],
    optionalProfileFields: ['highScore'],
    teamModel: 'SOLO',
    sessionModel: 'OFFLINE_SOLO',
    joinCapability: 'UNSUPPORTED',
    externalLaunchRequirement: false,
    externalLaunchNote: 'Dr. Driving is a single-player driving game. Multiplayer session joining is not supported.',
    verificationCapability: 'UNAVAILABLE',
    apiStatus: 'COMMUNITY',
    enabledState: true,
    capabilityValidationTimestamp: TIMESTAMP,
  },
};

export function getCanonicalGame(gameId: string): GameRegistryEntry | null {
  if (!gameId) return null;
  const normalized = gameId.toLowerCase().trim();
  return CANONICAL_GAMES_REGISTRY[normalized] || null;
}

export function getAllCanonicalGames(): GameRegistryEntry[] {
  return Object.values(CANONICAL_GAMES_REGISTRY);
}
