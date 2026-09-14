export type IdentityType = 'SELF_REPORTED' | 'OFFICIAL_API';

export type JoinCapability =
  | 'NATIVE_DEEPLINK'
  | 'CUSTOM_ROOM_HANDOFF'
  | 'MANUAL_LOBBY_CODE'
  | 'ASYNC_FRIEND_INVITE'
  | 'SOLO_LEADERBOARD_ONLY';

export interface GameFieldSpec {
  name: string;
  label: string;
  placeholder: string;
  type?: 'text' | 'select';
  options?: { label: string; value: string }[];
  required?: boolean;
}

export interface GameCapabilityConfig {
  gameId: string;
  displayName: string;
  category: 'MOBILE' | 'PC_CONSOLE' | 'CASUAL_BOARD' | 'SANDBOX';
  platforms: ('ANDROID' | 'IOS' | 'PC' | 'WEB')[];
  modes: string[];
  identityType: IdentityType;
  fields: GameFieldSpec[];
  teamModel: 'SOLO' | 'DUO' | 'SQUAD' | 'CLAN_GUILD' | 'ANY';
  sessionModel: 'ROOM_CODE' | 'FRIEND_LINK' | 'MATCH_LOBBY' | 'SOLO_SCORE';
  joinCapability: JoinCapability;
  externalLaunchRequirement: boolean;
  verificationCapability: boolean;
  apiStatus: 'NONE' | 'OFFICIAL_SUPPORTED' | 'LIMITED';
  enabled: boolean;
  capabilityValidatedAt: string;
  joinInstructions: string;
}

export const CANONICAL_GAMES_REGISTRY: Record<string, GameCapabilityConfig> = {
  bgmi: {
    gameId: 'bgmi',
    displayName: 'Battlegrounds Mobile India (BGMI)',
    category: 'MOBILE',
    platforms: ['ANDROID', 'IOS'],
    modes: ['Classic Squad', 'TDM 4v4', 'Custom Room Scrim', 'Duo Ranked'],
    identityType: 'SELF_REPORTED',
    fields: [
      { name: 'characterId', label: 'BGMI Character ID', placeholder: 'e.g. 5123456789', required: true },
      { name: 'inGameName', label: 'In-Game Name (IGN)', placeholder: 'e.g. Dynamo#123', required: true },
      { name: 'rank', label: 'Rank Tier', type: 'select', options: [
        { label: 'Crown / Ace', value: 'ACE' },
        { label: 'Conqueror', value: 'CONQUEROR' },
        { label: 'Diamond', value: 'DIAMOND' },
        { label: 'Platinum or below', value: 'PLATINUM' },
      ], required: true },
    ],
    teamModel: 'SQUAD',
    sessionModel: 'ROOM_CODE',
    joinCapability: 'CUSTOM_ROOM_HANDOFF',
    externalLaunchRequirement: true,
    verificationCapability: false,
    apiStatus: 'NONE',
    enabled: true,
    capabilityValidatedAt: '2026-09-12T00:00:00.000Z',
    joinInstructions: 'Launch BGMI, select Custom Room / Lobby, enter the Room ID and Password provided below by the squad host.',
  },

  clashofclans: {
    gameId: 'clashofclans',
    displayName: 'Clash of Clans',
    category: 'MOBILE',
    platforms: ['ANDROID', 'IOS'],
    modes: ['Clan War', 'CWL', 'Friendly Challenge', 'Troop Donating'],
    identityType: 'OFFICIAL_API',
    fields: [
      { name: 'playerTag', label: 'Clash Player Tag', placeholder: 'e.g. #GR8QQRV9J', required: true },
    ],
    teamModel: 'CLAN_GUILD',
    sessionModel: 'FRIEND_LINK',
    joinCapability: 'NATIVE_DEEPLINK',
    externalLaunchRequirement: true,
    verificationCapability: true,
    apiStatus: 'OFFICIAL_SUPPORTED',
    enabled: true,
    capabilityValidatedAt: '2026-09-12T00:00:00.000Z',
    joinInstructions: 'Click Open Clash of Clans to trigger the in-game clan or friend link directly.',
  },

  pubgmobile: {
    gameId: 'pubgmobile',
    displayName: 'PUBG Mobile (Global)',
    category: 'MOBILE',
    platforms: ['ANDROID', 'IOS'],
    modes: ['Classic Squad', 'Metro Royale', 'Custom Room', 'Payload Mode'],
    identityType: 'SELF_REPORTED',
    fields: [
      { name: 'characterId', label: 'PUBG Character ID', placeholder: 'e.g. 5198765432', required: true },
      { name: 'inGameName', label: 'In-Game Name', placeholder: 'e.g. Mortal#Global', required: true },
    ],
    teamModel: 'SQUAD',
    sessionModel: 'ROOM_CODE',
    joinCapability: 'CUSTOM_ROOM_HANDOFF',
    externalLaunchRequirement: true,
    verificationCapability: false,
    apiStatus: 'NONE',
    enabled: true,
    capabilityValidatedAt: '2026-09-12T00:00:00.000Z',
    joinInstructions: 'Open PUBG Mobile, navigate to Custom Match / Room, and enter the provided Room ID & Key.',
  },

  freefiremax: {
    gameId: 'freefiremax',
    displayName: 'Free Fire MAX',
    category: 'MOBILE',
    platforms: ['ANDROID', 'IOS'],
    modes: ['BR Squad Ranked', 'Clash Squad (CS)', 'Lone Wolf 2v2', 'Custom Room'],
    identityType: 'SELF_REPORTED',
    fields: [
      { name: 'uid', label: 'Free Fire UID', placeholder: 'e.g. 123456789', required: true },
      { name: 'inGameName', label: 'In-Game Name', placeholder: 'e.g. FreeFireKing', required: true },
      { name: 'rank', label: 'Rank', type: 'select', options: [
        { label: 'Heroic', value: 'HEROIC' },
        { label: 'Grandmaster', value: 'GRANDMASTER' },
        { label: 'Diamond', value: 'DIAMOND' },
        { label: 'Platinum / Gold', value: 'GOLD' },
      ], required: true },
    ],
    teamModel: 'SQUAD',
    sessionModel: 'ROOM_CODE',
    joinCapability: 'CUSTOM_ROOM_HANDOFF',
    externalLaunchRequirement: true,
    verificationCapability: false,
    apiStatus: 'NONE',
    enabled: true,
    capabilityValidatedAt: '2026-09-12T00:00:00.000Z',
    joinInstructions: 'Open Free Fire MAX, go to Custom Room tab, and enter the Room ID and Password provided by the session leader.',
  },

  smashkarts: {
    gameId: 'smashkarts',
    displayName: 'Smash Karts',
    category: 'CASUAL_BOARD',
    platforms: ['WEB', 'ANDROID', 'IOS'],
    modes: ['Free For All', 'Gem Grab', 'Custom Private Arena'],
    identityType: 'SELF_REPORTED',
    fields: [
      { name: 'username', label: 'Smash Karts Username', placeholder: 'e.g. KartRacer99', required: true },
    ],
    teamModel: 'ANY',
    sessionModel: 'FRIEND_LINK',
    joinCapability: 'NATIVE_DEEPLINK',
    externalLaunchRequirement: true,
    verificationCapability: false,
    apiStatus: 'NONE',
    enabled: true,
    capabilityValidatedAt: '2026-09-12T00:00:00.000Z',
    joinInstructions: 'Click the Smash Karts direct room URL below to jump directly into the Kart battle lobby.',
  },

  codm: {
    gameId: 'codm',
    displayName: 'Call of Duty: Mobile',
    category: 'MOBILE',
    platforms: ['ANDROID', 'IOS'],
    modes: ['Multiplayer Ranked', 'Battle Royale Squad', 'Search & Destroy', 'Private Room'],
    identityType: 'SELF_REPORTED',
    fields: [
      { name: 'activisionId', label: 'Activision / IGN', placeholder: 'e.g. Ghost#1029384', required: true },
    ],
    teamModel: 'SQUAD',
    sessionModel: 'ROOM_CODE',
    joinCapability: 'MANUAL_LOBBY_CODE',
    externalLaunchRequirement: true,
    verificationCapability: false,
    apiStatus: 'NONE',
    enabled: true,
    capabilityValidatedAt: '2026-09-12T00:00:00.000Z',
    joinInstructions: 'Copy the host Activision ID / Private Room Code, launch COD Mobile, and send a lobby invite or join the private room.',
  },

  roblox: {
    gameId: 'roblox',
    displayName: 'Roblox',
    category: 'SANDBOX',
    platforms: ['WEB', 'ANDROID', 'IOS', 'PC'],
    modes: ['BedWars', 'Blox Fruits', 'Adopt Me', 'Custom Server'],
    identityType: 'SELF_REPORTED',
    fields: [
      { name: 'robloxUsername', label: 'Roblox Username', placeholder: 'e.g. BuildMaster2026', required: true },
    ],
    teamModel: 'ANY',
    sessionModel: 'FRIEND_LINK',
    joinCapability: 'NATIVE_DEEPLINK',
    externalLaunchRequirement: true,
    verificationCapability: false,
    apiStatus: 'NONE',
    enabled: true,
    capabilityValidatedAt: '2026-09-12T00:00:00.000Z',
    joinInstructions: 'Click the Roblox VIP Server link or join through the host Roblox profile link.',
  },

  minecraft: {
    gameId: 'minecraft',
    displayName: 'Minecraft',
    category: 'SANDBOX',
    platforms: ['PC', 'ANDROID', 'IOS'],
    modes: ['BedWars', 'Survival SMP', 'Creative Realm', 'Minigames'],
    identityType: 'SELF_REPORTED',
    fields: [
      { name: 'gamertag', label: 'Gamertag / IGN', placeholder: 'e.g. Steve_Crafts', required: true },
    ],
    teamModel: 'ANY',
    sessionModel: 'ROOM_CODE',
    joinCapability: 'MANUAL_LOBBY_CODE',
    externalLaunchRequirement: true,
    verificationCapability: false,
    apiStatus: 'NONE',
    enabled: true,
    capabilityValidatedAt: '2026-09-12T00:00:00.000Z',
    joinInstructions: 'Copy the server IP address / Realm Invite Code, open Minecraft, add Server/Realm, and join.',
  },

  ludoking: {
    gameId: 'ludoking',
    displayName: 'Ludo King',
    category: 'CASUAL_BOARD',
    platforms: ['ANDROID', 'IOS'],
    modes: ['4 Player Classic', 'Quick Mode', '2v2 Team Up'],
    identityType: 'SELF_REPORTED',
    fields: [
      { name: 'displayName', label: 'Ludo King Name', placeholder: 'e.g. LudoChamp', required: true },
    ],
    teamModel: 'DUO',
    sessionModel: 'ROOM_CODE',
    joinCapability: 'MANUAL_LOBBY_CODE',
    externalLaunchRequirement: true,
    verificationCapability: false,
    apiStatus: 'NONE',
    enabled: true,
    capabilityValidatedAt: '2026-09-12T00:00:00.000Z',
    joinInstructions: 'Open Ludo King, select "Play with Friends", choose "JOIN", and enter the 8-digit Private Room Code.',
  },

  eightballpool: {
    gameId: 'eightballpool',
    displayName: '8 Ball Pool',
    category: 'CASUAL_BOARD',
    platforms: ['ANDROID', 'IOS', 'WEB'],
    modes: ['1v1 Match', '9 Ball', 'Friendly Challenge'],
    identityType: 'SELF_REPORTED',
    fields: [
      { name: 'uniqueId', label: 'Miniclip / Pool Unique ID', placeholder: 'e.g. 123-456-789-0', required: true },
    ],
    teamModel: 'SOLO',
    sessionModel: 'FRIEND_LINK',
    joinCapability: 'ASYNC_FRIEND_INVITE',
    externalLaunchRequirement: true,
    verificationCapability: false,
    apiStatus: 'NONE',
    enabled: true,
    capabilityValidatedAt: '2026-09-12T00:00:00.000Z',
    joinInstructions: 'Add the host unique ID in 8 Ball Pool friends tab, then accept the 1v1 challenge notification.',
  },

  brawlstars: {
    gameId: 'brawlstars',
    displayName: 'Brawl Stars',
    category: 'MOBILE',
    platforms: ['ANDROID', 'IOS'],
    modes: ['3v3 Gem Grab', 'Showdown Duo', 'Brawl Ball', 'Team League'],
    identityType: 'OFFICIAL_API',
    fields: [
      { name: 'playerTag', label: 'Brawl Stars Tag', placeholder: 'e.g. #90UJLY2', required: true },
    ],
    teamModel: 'SQUAD',
    sessionModel: 'FRIEND_LINK',
    joinCapability: 'NATIVE_DEEPLINK',
    externalLaunchRequirement: true,
    verificationCapability: true,
    apiStatus: 'OFFICIAL_SUPPORTED',
    enabled: true,
    capabilityValidatedAt: '2026-09-12T00:00:00.000Z',
    joinInstructions: 'Click the Brawl Stars team invite link to open the team lobby in-game automatically.',
  },

  clashroyale: {
    gameId: 'clashroyale',
    displayName: 'Clash Royale',
    category: 'MOBILE',
    platforms: ['ANDROID', 'IOS'],
    modes: ['1v1 Ladder', '2v2 Battle', 'Friendly Duel', 'Clan Battle'],
    identityType: 'OFFICIAL_API',
    fields: [
      { name: 'playerTag', label: 'Clash Royale Tag', placeholder: 'e.g. #2PP820CG', required: true },
    ],
    teamModel: 'DUO',
    sessionModel: 'FRIEND_LINK',
    joinCapability: 'NATIVE_DEEPLINK',
    externalLaunchRequirement: true,
    verificationCapability: true,
    apiStatus: 'OFFICIAL_SUPPORTED',
    enabled: true,
    capabilityValidatedAt: '2026-09-12T00:00:00.000Z',
    joinInstructions: 'Click the Clash Royale friend/battle link to launch Clash Royale directly.',
  },

  realcricket: {
    gameId: 'realcricket',
    displayName: 'Real Cricket',
    category: 'CASUAL_BOARD',
    platforms: ['ANDROID', 'IOS'],
    modes: ['2 Over Quick Match', '5 Over Ranked', 'Dream Team 1v1'],
    identityType: 'SELF_REPORTED',
    fields: [
      { name: 'userCode', label: 'Real Cricket User Code', placeholder: 'e.g. RC24-998811', required: true },
    ],
    teamModel: 'SOLO',
    sessionModel: 'ROOM_CODE',
    joinCapability: 'MANUAL_LOBBY_CODE',
    externalLaunchRequirement: true,
    verificationCapability: false,
    apiStatus: 'NONE',
    enabled: true,
    capabilityValidatedAt: '2026-09-12T00:00:00.000Z',
    joinInstructions: 'Open Real Cricket, navigate to Multiplayer -> Play with Friends, and input the room code.',
  },

  efootball: {
    gameId: 'efootball',
    displayName: 'eFootball',
    category: 'MOBILE',
    platforms: ['ANDROID', 'IOS', 'PC'],
    modes: ['1v1 Match Room', 'Co-Op 3v3', 'Friend Match'],
    identityType: 'SELF_REPORTED',
    fields: [
      { name: 'konamiId', label: 'eFootball / Konami ID', placeholder: 'e.g. eFoot_Pro_10', required: true },
    ],
    teamModel: 'DUO',
    sessionModel: 'ROOM_CODE',
    joinCapability: 'MANUAL_LOBBY_CODE',
    externalLaunchRequirement: true,
    verificationCapability: false,
    apiStatus: 'NONE',
    enabled: true,
    capabilityValidatedAt: '2026-09-12T00:00:00.000Z',
    joinInstructions: 'Open eFootball, enter Match -> Friend Match -> Create/Search Match Room Number.',
  },

  drdriving: {
    gameId: 'drdriving',
    displayName: 'Dr. Driving',
    category: 'CASUAL_BOARD',
    platforms: ['ANDROID', 'IOS'],
    modes: ['Online Leaderboard', 'Distance Challenge'],
    identityType: 'SELF_REPORTED',
    fields: [
      { name: 'driverName', label: 'Driver Handle', placeholder: 'e.g. SpeedDriver007', required: true },
    ],
    teamModel: 'SOLO',
    sessionModel: 'SOLO_SCORE',
    joinCapability: 'SOLO_LEADERBOARD_ONLY',
    externalLaunchRequirement: true,
    verificationCapability: false,
    apiStatus: 'NONE',
    enabled: true,
    capabilityValidatedAt: '2026-09-12T00:00:00.000Z',
    joinInstructions: 'Dr. Driving does not support live multi-player lobbies. Share high-scores and compete asynchronously on GamerZ Hub Leaderboards.',
  },
};
