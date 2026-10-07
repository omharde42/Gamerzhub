export interface User { id: string; gamerzId?: string; email: string; emailVerified: string | null; role: 'USER' | 'MODERATOR' | 'ADMIN' | 'SUPER_ADMIN'; banned: boolean; createdAt: string; profile: Profile | null; subscription: Subscription | null; }
export interface Profile { id: string; username: string; displayName: string | null; avatar: string | null; banner: string | null; bio: string | null; country: string | null; languages: string[]; playStyle: string | null; communicationStyle: string | null; activeTime: string | null; toxicityScore: number; winRate: number; kd: number; accuracy: number; totalMatches: number; wins: number; losses: number; rank: string | null; rankScore: number; role: string | null; mainGames: string[]; twitch: string | null; youtube: string | null; discord: string | null; steam: string | null; twitter: string | null; instagram: string | null; website: string | null; achievements: Achievement[]; certifications: Certification[]; tournamentHistory: TournamentHistory[]; }
export interface Achievement { id: string; title: string; description: string | null; icon: string | null; rarity: string | null; unlockedAt: string; }
export interface Certification { id: string; title: string; issuer: string | null; issueDate: string | null; credentialUrl: string | null; }
export interface TournamentHistory { id: string; tournamentName: string; placement: string | null; prize: string | null; date: string; }
export interface Post { id: string; type: 'POST' | 'ARTICLE' | 'CLIP' | 'POLL'; content: string; media: string[]; tags: string[]; viewCount: number; createdAt: string; user: { id: string; profile: Profile | null }; _count: { likes: number; comments: number }; isLiked?: boolean; poll?: Poll | null; }
export interface Poll { id: string; question: string; options: PollOption[]; expiresAt: string | null; }
export interface PollOption { id: string; text: string; votes: number; voted?: boolean; }
export interface Comment { id: string; content: string; createdAt: string; user: { id: string; profile: Profile | null }; likes: any[]; replies?: Comment[]; }
export interface Team { id: string; name: string; tag: string | null; description: string | null; avatar: string | null; banner: string | null; status: string; rank: string | null; region: string | null; wins: number; losses: number; members: TeamMember[]; practiceSchedules?: PracticeSchedule[]; scrims?: Scrim[]; _count?: { members: number }; }
export interface TeamMember { id: string; role: 'CAPTAIN' | 'MANAGER' | 'COACH' | 'MEMBER' | 'TRIAL'; joinedAt: string; user: { id: string; email: string; profile: Profile | null }; }
export interface PracticeSchedule { id: string; dayOfWeek: number; startTime: string; endTime: string; }
export interface Scrim { id: string; title: string; description: string | null; scheduledAt: string; duration: number; status: string; }
export interface Tournament { id: string; title: string; description: string | null; game: string; type: string; status: string; maxTeams: number; prizePool: number; entryFee: number; startDate: string; organizer: { id: string; name: string; avatar: string | null }; _count: { teams: number }; }
export interface Match { id: string; round: number; matchIndex: number; status: string; team1Id: string | null; team2Id: string | null; scoreTeam1: number | null; scoreTeam2: number | null; }
export interface Chat { id: string; name: string | null; isGroup: boolean; avatar: string | null; participants: ChatParticipant[]; messages: Message[]; updatedAt: string; }
export interface ChatParticipant { id: string; user: { id: string; profile: Profile | null }; lastReadAt: string | null; }
export interface Message { id: string; content: string | null; media: string[]; gif: string | null; createdAt: string; sender: { id: string; profile: Profile | null }; readBy: any[]; }
export interface Notification { id: string; type: string; title: string; message: string | null; link: string | null; image: string | null; isRead: boolean; createdAt: string; }
export interface Job { id: string; title: string; description: string; type: string; status: string; location: string | null; salary: string | null; game: string | null; organization: { id: string; name: string; avatar: string | null; verified: boolean }; _count: { applications: number }; createdAt: string; }
export interface Organization { id: string; name: string; slug: string; description: string | null; avatar: string | null; banner: string | null; verified: boolean; website: string | null; location: string | null; members: OrganizationMember[]; _count?: { jobs: number; tournaments: number; members: number }; }
export interface OrganizationMember { id: string; role: string; user: { id: string; profile: Profile | null }; }
export interface Subscription { id: string; tier: 'PRO' | 'ELITE' | 'TEAM_PRO'; status: string; currentPeriodEnd: string | null; cancelAtPeriodEnd: boolean; }
export interface AIRecommendation { userId: string; username: string; avatar: string | null; rank: string | null; role: string | null; winRate: number; compatibility: number; reasons: string[]; }
export type ChallengeStatus = 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'CANCELLED' | 'EXPIRED' | 'COMPLETED';
export type ChallengeType = 'ONE_VS_ONE' | 'TEAM_VS_TEAM';
export interface ChallengePublicUser { id: string; profile: Pick<Profile, 'username' | 'displayName' | 'avatar'> | null; }
export interface ChallengeParticipant { id: string; user: ChallengePublicUser; }
export interface ChallengeTeam {
  id: string;
  teamRole: 'CHALLENGER' | 'OPPONENT';
  name: string | null;
  captain: ChallengePublicUser;
  members: ChallengeParticipant[];
}
export interface Challenge {
  id: string;
  game: string;
  challengeType: ChallengeType;
  gameMode: string;
  message: string | null;
  status: ChallengeStatus;
  scheduledAt: string;
  expiresAt: string;
  result: string | null;
  createdAt: string;
  challenger: ChallengePublicUser;
  opponent: ChallengePublicUser;
  teams?: ChallengeTeam[];
  participants?: ChallengeParticipant[];
}
export interface ChallengeGameMode { game: string; name: string; icon: string; modes: string[]; }
export interface ApiResponse<T = any> { success: boolean; message?: string; data?: T; error?: string; errors?: Record<string, string[]>; }
export interface PaginatedResponse<T> { success: boolean; data: T[]; meta: { page: number; limit: number; total: number; totalPages: number; hasNext: boolean; hasPrev: boolean; }; }
