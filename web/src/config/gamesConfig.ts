export interface GameField {
  name: string;
  label: string;
  placeholder: string;
  type?: 'text' | 'select';
  options?: { label: string; value: string }[];
  required?: boolean;
}

export interface GameConfig {
  id: string;
  name: string;
  icon: string;
  color: string;
  brandColor: string;
  bgGradient: string;
  borderColor: string;
  description: string;
  fields: GameField[];
}

export const GAMES_CONFIG: Record<string, GameConfig> = {
  bgmi: {
    id: 'bgmi',
    name: 'BGMI',
    icon: '📱',
    color: '#EAB308',
    brandColor: '#F59E0B',
    bgGradient: 'from-[#1A1408] via-zinc-950 to-black',
    borderColor: 'border-amber-500/40',
    description: 'Sync Conqueror Tier, K/D Ratio, Chicken Dinners & Accuracy',
    fields: [
      { name: 'uid', label: 'BGMI Character ID', placeholder: 'e.g. 5123456789', required: true },
    ],
  },
  clashofclans: {
    id: 'clashofclans',
    name: 'Clash of Clans',
    icon: '🏰',
    color: '#EAB308',
    brandColor: '#EAB308',
    bgGradient: 'from-amber-950/60 via-yellow-950/40 to-black',
    borderColor: 'border-yellow-500/40',
    description: 'Sync Town Hall, League, War Stars, Trophies & Clan',
    fields: [
      { name: 'playerTag', label: 'Player Tag', placeholder: 'e.g. #GR8QQRV9J', required: true },
    ],
  },
  pubg_mobile: {
    id: 'pubg_mobile',
    name: 'PUBG Mobile',
    icon: '🪖',
    color: '#F97316',
    brandColor: '#F97316',
    bgGradient: 'from-orange-950/60 via-amber-950/40 to-black',
    borderColor: 'border-orange-500/40',
    description: 'Sync Global PUBG Mobile Character ID, Rank & Match History',
    fields: [
      { name: 'uid', label: 'PUBG Mobile Character ID', placeholder: 'e.g. 5123456789', required: true },
    ],
  },
  freefire: {
    id: 'freefire',
    name: 'Free Fire MAX',
    icon: '🔥',
    color: '#F97316',
    brandColor: '#F97316',
    bgGradient: 'from-orange-950/60 via-amber-950/40 to-black',
    borderColor: 'border-orange-500/40',
    description: 'Self-reported UID & IGN, BR/CS Squad modes & teammate matching',
    fields: [
      { name: 'freeFireUid', label: 'Free Fire Player UID', placeholder: 'e.g. 123456789', required: true },
    ],
  },
  smashkarts: {
    id: 'smashkarts',
    name: 'Smash Karts',
    icon: '🏎️',
    color: '#38BDF8',
    brandColor: '#38BDF8',
    bgGradient: 'from-sky-950/60 via-slate-950/40 to-black',
    borderColor: 'border-sky-500/40',
    description: 'Community multiplayer kart battles — direct web party links',
    fields: [
      { name: 'username', label: 'Smash Karts In-Game Username', placeholder: 'e.g. KartKing', required: true },
    ],
  },
  codm: {
    id: 'codm',
    name: 'Call of Duty: Mobile',
    icon: '🎯',
    color: '#10B981',
    brandColor: '#10B981',
    bgGradient: 'from-emerald-950/60 via-slate-950/40 to-black',
    borderColor: 'border-emerald-500/40',
    description: 'Sync CODM Username, MP/BR mode preferences & custom rooms',
    fields: [
      { name: 'username', label: 'CODM In-Game Username', placeholder: 'e.g. Ghost_007', required: true },
    ],
  },
  roblox: {
    id: 'roblox',
    name: 'Roblox',
    icon: '🧱',
    color: '#EF4444',
    brandColor: '#EF4444',
    bgGradient: 'from-red-950/60 via-slate-950/40 to-black',
    borderColor: 'border-red-500/40',
    description: 'Roblox party play & private server join link handoff',
    fields: [
      { name: 'username', label: 'Roblox Username', placeholder: 'e.g. BloxMaster', required: true },
    ],
  },
  minecraft: {
    id: 'minecraft',
    name: 'Minecraft',
    icon: '⛏️',
    color: '#22C55E',
    brandColor: '#22C55E',
    bgGradient: 'from-green-950/60 via-slate-950/40 to-black',
    borderColor: 'border-green-500/40',
    description: 'Server IP:Port & Realm code manual handoff for multiplayer survival',
    fields: [
      { name: 'username', label: 'Minecraft GamerTag', placeholder: 'e.g. CrafterPro', required: true },
    ],
  },
  ludoking: {
    id: 'ludoking',
    name: 'Ludo King',
    icon: '🎲',
    color: '#EAB308',
    brandColor: '#EAB308',
    bgGradient: 'from-yellow-950/60 via-slate-950/40 to-black',
    borderColor: 'border-yellow-500/40',
    description: '8-digit Private Room Code sharing for 2P/4P Ludo battles',
    fields: [
      { name: 'username', label: 'Ludo King Name', placeholder: 'e.g. LudoChamp', required: true },
    ],
  },
  eightballpool: {
    id: 'eightballpool',
    name: '8 Ball Pool',
    icon: '🎱',
    color: '#3B82F6',
    brandColor: '#3B82F6',
    bgGradient: 'from-blue-950/60 via-slate-950/40 to-black',
    borderColor: 'border-blue-500/40',
    description: 'Unique ID search for 1v1 pool match challenges',
    fields: [
      { name: 'uniqueId', label: '8 Ball Pool Unique ID', placeholder: 'e.g. 123-456-789-0', required: true },
    ],
  },
  brawlstars: {
    id: 'brawlstars',
    name: 'Brawl Stars',
    icon: '🌟',
    color: '#EC4899',
    brandColor: '#EC4899',
    bgGradient: 'from-pink-950/60 via-slate-950/40 to-black',
    borderColor: 'border-pink-500/40',
    description: 'Sync Trophy Count, Highest Trophies, Club & Brawlers',
    fields: [
      { name: 'playerTag', label: 'Player Tag', placeholder: 'e.g. #90UJLY2', required: true },
    ],
  },
  clashroyale: {
    id: 'clashroyale',
    name: 'Clash Royale',
    icon: '👑',
    color: '#3B82F6',
    brandColor: '#3B82F6',
    bgGradient: 'from-blue-950/60 via-slate-950/40 to-black',
    borderColor: 'border-blue-500/40',
    description: 'Sync King Level, Trophies, Favorite Deck & Win Rate',
    fields: [
      { name: 'playerTag', label: 'Player Tag', placeholder: 'e.g. #2PP820CG', required: true },
    ],
  },
  realcricket: {
    id: 'realcricket',
    name: 'Real Cricket',
    icon: '🏏',
    color: '#8B5CF6',
    brandColor: '#8B5CF6',
    bgGradient: 'from-purple-950/60 via-slate-950/40 to-black',
    borderColor: 'border-purple-500/40',
    description: 'Multiplayer private room ID sharing for 2 Over / 5 Over cricket matches',
    fields: [
      { name: 'username', label: 'Real Cricket Profile Name', placeholder: 'e.g. CricketFanatic', required: true },
    ],
  },
  efootball: {
    id: 'efootball',
    name: 'eFootball',
    icon: '⚽',
    color: '#06B6D4',
    brandColor: '#06B6D4',
    bgGradient: 'from-cyan-950/60 via-slate-950/40 to-black',
    borderColor: 'border-cyan-500/40',
    description: 'Match Room Number sharing for 1v1 & Co-op 3v3 football matches',
    fields: [
      { name: 'ownerName', label: 'eFootball Owner Name', placeholder: 'e.g. FC_Striker', required: true },
    ],
  },
  drdriving: {
    id: 'drdriving',
    name: 'Dr. Driving',
    icon: '🚗',
    color: '#64748B',
    brandColor: '#64748B',
    bgGradient: 'from-slate-900 via-zinc-950 to-black',
    borderColor: 'border-slate-500/40',
    description: 'Single-player career title. Track personal high scores (multiplayer join unsupported).',
    fields: [],
  },
};
