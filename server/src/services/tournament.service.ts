import prisma from '../config/database';
import { TournamentType, TournamentStatus, MatchStatus, OrgMemberRole, NotificationType } from '@prisma/client';
import { NotFoundError, ForbiddenError, ConflictError, ValidationError } from '../utils/errors';
import { emitToUser } from '../socket-emitter';
import { notificationService } from './notification.service';
import { achievementService } from './achievement.service';
import { challongeService, NormalizedTournament } from './challonge.service';

const ORGANIZER_ROLES = [OrgMemberRole.OWNER, OrgMemberRole.ADMIN, OrgMemberRole.MODERATOR];

export class TournamentService {
  async create(
    data: {
      title: string;
      description?: string;
      game: string;
      type?: TournamentType;
      format?: TournamentType;
      maxTeams: number;
      minTeamSize?: number;
      maxTeamSize?: number;
      prizePool?: number;
      entryFee?: number;
      startDate: string;
      endDate?: string;
      registrationEnd?: string;
      rules?: string;
      mapPool?: string[];
      formatMode?: 'SOLO' | 'DUO' | 'SQUAD';
      status?: TournamentStatus;
    },
    userId: string
  ) {
    const { startDate, endDate, registrationEnd, mapPool, formatMode, status, ...rest } = data;
    let type = rest.type || rest.format || TournamentType.SINGLE_ELIMINATION;
    if (formatMode || rest.game.toLowerCase().includes('pubg') || rest.game.toLowerCase().includes('free fire')) {
      type = TournamentType.BATTLE_ROYALE;
    }
    const organizerId = await this.resolveOrganizerId(userId);

    let minTeamSize = rest.minTeamSize || 1;
    let maxTeamSize = rest.maxTeamSize || 5;
    if (formatMode === 'SOLO') {
      minTeamSize = 1;
      maxTeamSize = 1;
    } else if (formatMode === 'DUO') {
      minTeamSize = 2;
      maxTeamSize = 2;
    } else if (formatMode === 'SQUAD') {
      minTeamSize = 4;
      maxTeamSize = 5;
    }

    return prisma.tournament.create({
      data: {
        title: rest.title,
        description: rest.description,
        game: rest.game,
        type,
        maxTeams: rest.maxTeams,
        minTeamSize,
        maxTeamSize,
        prizePool: rest.prizePool || 0,
        entryFee: rest.entryFee || 0,
        rules: rest.rules,
        mapPool: mapPool || [],
        customFields: { formatMode: formatMode || (maxTeamSize === 1 ? 'SOLO' : maxTeamSize === 2 ? 'DUO' : 'SQUAD') },
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : undefined,
        registrationEnd: registrationEnd ? new Date(registrationEnd) : undefined,
        organizerId,
        status: status || TournamentStatus.DRAFT,
      },
    });
  }

  async updateStatus(tournamentId: string, status: TournamentStatus, userId: string) {
    await this.assertOrganizer(tournamentId, userId);
    const tournament = await prisma.tournament.findUnique({ where: { id: tournamentId } });
    if (!tournament) throw new NotFoundError('Tournament');

    const updated = await prisma.tournament.update({
      where: { id: tournamentId },
      data: { status, endDate: status === TournamentStatus.COMPLETED ? new Date() : tournament.endDate },
    });

    this.broadcastUpdate({ id: tournamentId, organizerId: tournament.organizerId });
    return updated;
  }

  /**
   * Tournament.organizerId is an FK to Organization, but tournaments are
   * created by plain users. Resolve the user's organization (first membership,
   * else the org they own, else a personal org created on the fly) so the FK
   * always holds.
   */
  private async resolveOrganizerId(userId: string): Promise<string> {
    const membership = await prisma.organizationMember.findFirst({
      where: { userId },
      select: { organizationId: true },
    });
    if (membership) return membership.organizationId;
    const owned = await prisma.organization.findFirst({
      where: { ownerId: userId },
      select: { id: true },
    });
    if (owned) return owned.id;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { profile: { select: { username: true } }, email: true },
    });
    const username = user?.profile?.username || user?.email?.split('@')[0] || 'user';
    const slugBase = username.toLowerCase().replace(/[^a-z0-9_-]/g, '');
    const org = await prisma.organization.create({
      data: {
        name: `${username}'s Organization`,
        slug: `${slugBase}-org-${userId.slice(0, 8)}`,
        ownerId: userId,
      },
    });
    return org.id;
  }

  /** True when the user owns/admins/moderates the org running the tournament. */
  private async isOrganizer(tournamentId: string, userId: string): Promise<boolean> {
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      select: { organizerId: true },
    });
    if (!tournament) return false;
    const org = await prisma.organization.findUnique({
      where: { id: tournament.organizerId },
      select: { ownerId: true },
    });
    if (org && org.ownerId === userId) return true;
    const membership = await prisma.organizationMember.findFirst({
      where: { organizationId: tournament.organizerId, userId, role: { in: ORGANIZER_ROLES } },
      select: { id: true },
    });
    return Boolean(membership);
  }

  private async assertOrganizer(tournamentId: string, userId: string) {
    if (!(await this.isOrganizer(tournamentId, userId))) {
      throw new ForbiddenError('Only tournament organizers can perform this action');
    }
  }

  async getById(id: string, viewerUserId?: string) {
    const tournament = await prisma.tournament.findUnique({
      where: { id },
      include: {
        organizer: { select: { id: true, name: true, avatar: true } },
        teams: { include: { team: { include: { members: { include: { user: { select: { id: true, profile: true } } } } } }, members: { include: { user: { select: { id: true, profile: true } } } } } },
        matches: {
          include: {
            team1: { include: { team: { select: { id: true, name: true, avatar: true } } } },
            team2: { include: { team: { select: { id: true, name: true, avatar: true } } } },
          },
          orderBy: [{ round: 'asc' }, { matchIndex: 'asc' }],
        },
        participants: { include: { user: { select: { id: true, profile: true } } } },
        disputes: { include: { reporter: { select: { id: true, profile: { select: { username: true, avatar: true } } } } }, orderBy: { createdAt: 'desc' } },
      },
    });
    if (!tournament) throw new NotFoundError('Tournament');
    if (viewerUserId) {
      (tournament as any).isOrganizer = await this.isOrganizer(id, viewerUserId);
    }
    return tournament;
  }
  async list(params: { page?: number; limit?: number; status?: string; game?: string; search?: string; q?: string }) {
    const { page = 1, limit = 20, status, game, search, q } = params;
    const searchTerm = (search || q || '').trim().toLowerCase();

    // 1. Query database tournaments
    const where: any = {};
    if (status) where.status = status;
    if (game) where.game = game;
    if (searchTerm) {
      where.OR = [
        { title: { contains: searchTerm, mode: 'insensitive' } },
        { game: { contains: searchTerm, mode: 'insensitive' } },
        { description: { contains: searchTerm, mode: 'insensitive' } },
      ];
    }

    let dbTournaments: any[] = [];
    try {
      dbTournaments = await prisma.tournament.findMany({
        where,
        include: { organizer: { select: { id: true, name: true, avatar: true } }, _count: { select: { teams: true } } },
        orderBy: { startDate: 'asc' },
      });
    } catch (e) {
      console.error('[TournamentService] Error querying local DB tournaments:', e);
    }

    const normalizedDb: NormalizedTournament[] = dbTournaments.map((t) => ({
      id: t.id,
      name: t.title,
      game: t.game || null,
      description: t.description || null,
      startDate: t.startDate ? t.startDate.toISOString() : null,
      endDate: t.endDate ? t.endDate.toISOString() : null,
      status: t.status || null,
      participants: t._count?.teams || t.teams?.length || 0,
      maxParticipants: t.maxTeams || null,
      organizer: t.organizer?.name || null,
      url: `/tournaments/${t.id}`,
      source: 'gamerhub',
    }));

    // 2. Query Challonge API tournaments
    const challongeList = await challongeService.getTournaments();

    // 3. Filter Challonge list
    let filteredChallonge = challongeList;
    if (searchTerm) {
      filteredChallonge = filteredChallonge.filter(
        (t) =>
          t.name.toLowerCase().includes(searchTerm) ||
          (t.game && t.game.toLowerCase().includes(searchTerm)) ||
          (t.description && t.description.toLowerCase().includes(searchTerm))
      );
    }
    if (game) {
      filteredChallonge = filteredChallonge.filter(
        (t) => t.game && t.game.toLowerCase().includes(game.toLowerCase())
      );
    }
    if (status) {
      const s = status.toLowerCase();
      filteredChallonge = filteredChallonge.filter((t) => {
        if (!t.status) return true;
        const st = t.status.toLowerCase();
        if (s === 'registration_open' || s === 'open') return st === 'pending' || st === 'open' || st === 'registration_open';
        if (s === 'in_progress') return st === 'underway' || st === 'in_progress';
        if (s === 'completed') return st === 'complete' || st === 'completed';
        return st.includes(s);
      });
    }

    // 4. Merge, paginate, and return normalized list
    const combined = [...normalizedDb, ...filteredChallonge];
    const total = combined.length;
    const startIndex = (page - 1) * limit;
    const paginated = combined.slice(startIndex, startIndex + limit);

    return {
      data: paginated,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    };
  }
  /**
   * Register for a tournament:
   * - with a teamId: the team must exist and the caller must be a member;
   *   double-registration is blocked by the TournamentTeam unique constraint.
   * - without a teamId: the caller registers as an individual
   *   TournamentParticipant (blocked by the TournamentParticipant unique pair).
   * Spot count = registered teams + individual participants vs maxTeams.
   */
  async registerTeam(tournamentId: string, teamId: string | undefined, userId: string) {
    const tournament = await prisma.tournament.findUnique({ where: { id: tournamentId }, select: { id: true, status: true, maxTeams: true, organizerId: true } });
    if (!tournament) throw new NotFoundError('Tournament');
    if (tournament.status !== 'REGISTRATION_OPEN' && tournament.status !== 'DRAFT') {
      throw new ForbiddenError('Registration is not open for this tournament');
    }
    if (teamId) {
      const team = await prisma.team.findUnique({ where: { id: teamId }, include: { members: { select: { userId: true } } } });
      if (!team) throw new NotFoundError('Team');
      if (!team.members.some((m) => m.userId === userId)) {
        throw new ForbiddenError('You must be a member of the team to register it');
      }
      const existing = await prisma.tournamentTeam.findUnique({ where: { tournamentId_teamId: { tournamentId, teamId } } });
      if (existing) throw new ConflictError('Team is already registered for this tournament');
      const teamCount = await prisma.tournamentTeam.count({ where: { tournamentId } });
      if (teamCount >= tournament.maxTeams) throw new ForbiddenError('Tournament is full');
      const result = await prisma.tournamentTeam.create({ data: { tournamentId, teamId } });
      this.broadcastUpdate(tournament);
      this.notifyRegistration(tournament, userId);
      achievementService.unlockByKey(userId, 'FIRST_TOURNAMENT').catch(() => {});
      return result;
    }
    const existingParticipant = await prisma.tournamentParticipant.findUnique({ where: { tournamentId_userId: { tournamentId, userId } } });
    if (existingParticipant) throw new ConflictError('You are already registered for this tournament');
    const [teamCount, participantCount] = await Promise.all([
      prisma.tournamentTeam.count({ where: { tournamentId } }),
      prisma.tournamentParticipant.count({ where: { tournamentId } }),
    ]);
    if (teamCount + participantCount >= tournament.maxTeams) throw new ForbiddenError('Tournament is full');
    const result = await prisma.tournamentParticipant.create({ data: { tournamentId, userId, role: 'PLAYER' } });
    this.broadcastUpdate(tournament);
    this.notifyRegistration(tournament, userId);
    achievementService.unlockByKey(userId, 'FIRST_TOURNAMENT').catch(() => {});
    return result;
  }

  private broadcastUpdate(tournament: { id: string; organizerId: string }) {
    emitToUser(tournament.organizerId, 'tournament:updated', { tournamentId: tournament.id });
  }

  private async notifyRegistration(tournament: { id: string; title?: string }, userId: string) {
    await notificationService.create({
      userId,
      type: NotificationType.TOURNAMENT,
      title: 'Tournament registration confirmed',
      message: `You are registered for "${tournament.title}"`,
      link: `/tournaments/${tournament.id}`,
    });
  }

  /** Next power of two >= n (bracket size). */
  private bracketSize(n: number): number {
    let size = 1;
    while (size < n) size *= 2;
    return size;
  }

  /**
   * Generate a single-elimination bracket:
   *  - teams are seeded 1..N (random when no seeds exist yet) and paired
   *    consecutively in round 1;
   *  - teams facing a bye (no opponent in round 1) are recorded as a
   *    completed walkover so they advance automatically;
   *  - later rounds are created empty and filled as results are submitted.
   * Idempotent: when matches already exist they are returned unchanged.
   */
  async generateBrackets(tournamentId: string) {
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      include: { teams: { include: { team: { select: { id: true, name: true, avatar: true } } }, orderBy: { seed: 'asc' } } },
    });
    if (!tournament) throw new NotFoundError('Tournament');
    const existing = await prisma.match.count({ where: { tournamentId } });
    if (existing > 0) {
      return prisma.match.findMany({ where: { tournamentId }, orderBy: [{ round: 'asc' }, { matchIndex: 'asc' }] });
    }
    const teams = tournament.teams;
    if (teams.length < 2) throw new ValidationError({ teams: ['At least 2 teams are required to generate a bracket'] });

    // Assign seeds when not already seeded (random for fairness; stored so
    // subsequent calls are stable).
    const seeded = teams.map((t) => t.seed ?? 0);
    let nextSeed = Math.max(0, ...seeded) + 1;
    for (const t of teams) {
      if (t.seed == null) {
        await prisma.tournamentTeam.update({ where: { id: t.id }, data: { seed: nextSeed++ } });
        t.seed = nextSeed - 1;
      }
    }
    const ordered = [...teams].sort((a, b) => (a.seed ?? 0) - (b.seed ?? 0));
    const size = this.bracketSize(ordered.length);
    const rounds = Math.log2(size);

    const toCreate: Array<{ tournamentId: string; round: number; matchIndex: number; team1Id: string | null; team2Id: string | null; status: MatchStatus; winnerId?: string; scoreTeam1?: number; scoreTeam2?: number; completedAt?: Date }> = [];

    // Round 1 — pair consecutive seeds; a missing opponent is a bye (walkover).
    const round1Count = size / 2;
    for (let i = 0; i < round1Count; i++) {
      const teamA = ordered[i * 2];
      const teamB = ordered[i * 2 + 1];
      if (teamA && teamB) {
        toCreate.push({ tournamentId, round: 1, matchIndex: i, team1Id: teamA.id, team2Id: teamB.id, status: MatchStatus.SCHEDULED });
      } else if (teamA) {
        toCreate.push({ tournamentId, round: 1, matchIndex: i, team1Id: teamA.id, team2Id: null, status: MatchStatus.COMPLETED, winnerId: teamA.id, scoreTeam1: 1, scoreTeam2: 0, completedAt: new Date() });
      } else if (teamB) {
        toCreate.push({ tournamentId, round: 1, matchIndex: i, team1Id: null, team2Id: teamB.id, status: MatchStatus.COMPLETED, winnerId: teamB.id, scoreTeam1: 0, scoreTeam2: 1, completedAt: new Date() });
      }
    }
    // Rounds 2..R — empty, filled as winners advance.
    for (let round = 2; round <= rounds; round++) {
      const count = size / Math.pow(2, round);
      for (let i = 0; i < count; i++) {
        toCreate.push({ tournamentId, round, matchIndex: i, team1Id: null, team2Id: null, status: MatchStatus.SCHEDULED });
      }
    }
    await prisma.match.createMany({ data: toCreate as any });
    await prisma.tournament.update({
      where: { id: tournamentId },
      data: { status: tournament.status === TournamentStatus.COMPLETED || tournament.status === TournamentStatus.CANCELLED ? tournament.status : TournamentStatus.IN_PROGRESS },
    });
    const created = await prisma.match.findMany({ where: { tournamentId }, orderBy: [{ round: 'asc' }, { matchIndex: 'asc' }] });
    this.broadcastUpdate(tournament);
    return created;
  }

  /**
   * Organizer submits a match result. The winner is advanced into the next
   * round's slot automatically; submitting the final match completes the
   * tournament, computes placements, writes TournamentHistory and notifies.
   */
  async submitResult(tournamentId: string, matchId: string, userId: string, data: { scoreTeam1: number; scoreTeam2: number; winnerId?: string }) {
    await this.assertOrganizer(tournamentId, userId);
    const match = await prisma.match.findUnique({
      where: { id: matchId },
      include: {
        tournament: { select: { id: true, title: true, status: true, organizerId: true } },
        team1: { include: { team: { select: { name: true } }, members: { select: { userId: true } } } },
        team2: { include: { team: { select: { name: true } }, members: { select: { userId: true } } } },
      },
    });
    if (!match || match.tournamentId !== tournamentId) throw new NotFoundError('Match');
    if (match.status === MatchStatus.COMPLETED) throw new ConflictError('This match already has a result');
    if (!match.team1Id || !match.team2Id) throw new ForbiddenError('Both teams must be present to submit a result');
    const s1 = Number(data.scoreTeam1) || 0;
    const s2 = Number(data.scoreTeam2) || 0;
    if (s1 < 0 || s2 < 0) throw new ValidationError({ scoreTeam1: ['Scores must be non-negative'] });

    let winnerId = data.winnerId;
    if (winnerId && winnerId !== match.team1Id && winnerId !== match.team2Id) {
      throw new ValidationError({ winnerId: ['Winner must be one of the two teams'] });
    }
    if (!winnerId) {
      if (s1 === s2) throw new ValidationError({ winnerId: ['Scores are tied — specify the winner'] });
      winnerId = s1 > s2 ? match.team1Id : match.team2Id;
    }

    await prisma.match.update({
      where: { id: matchId },
      data: { status: MatchStatus.COMPLETED, winnerId, scoreTeam1: s1, scoreTeam2: s2, completedAt: new Date() },
    });

    // Advance winner into the next round's slot.
    const nextMatch = await prisma.match.findFirst({
      where: { tournamentId, round: match.round + 1, matchIndex: Math.floor(match.matchIndex / 2) },
    });
    if (nextMatch) {
      const slot = match.matchIndex % 2 === 0 ? { team1Id: winnerId } : { team2Id: winnerId };
      await prisma.match.update({ where: { id: nextMatch.id }, data: slot });
      await this.notifyMatchResult(match, matchId, winnerId, s1, s2);
    } else {
      // Final match — complete the tournament.
      await this.completeTournament(tournamentId, matchId, winnerId);
    }
    this.broadcastUpdate({ id: tournamentId, organizerId: match.tournament.organizerId });
    return this.getById(tournamentId);
  }

  private async notifyMatchResult(match: any, matchId: string, winnerId: string, s1: number, s2: number) {
    const winnerName = winnerId === match.team1Id ? match.team1?.team?.name : match.team2?.team?.name;
    const loserName = winnerId === match.team1Id ? match.team2?.team?.name : match.team1?.team?.name;
    const memberIds = new Set<string>();
    match.team1?.members?.forEach((m: any) => memberIds.add(m.userId));
    match.team2?.members?.forEach((m: any) => memberIds.add(m.userId));
    const text = `${winnerName} defeated ${loserName} ${s1}-${s2}`;
    for (const memberId of memberIds) {
      await notificationService.createWithDedupe(
        {
          userId: memberId,
          type: NotificationType.TOURNAMENT_RESULT,
          title: 'Match result recorded',
          message: text,
          link: `/tournaments/${match.tournamentId}`,
        },
        `match-result-${matchId}-${memberId}`
      );
    }
  }

  /**
   * Finalize the tournament: mark COMPLETED, compute 1st/2nd/3rd placements,
   * write TournamentHistory entries for the top teams' members, award the
   * winner achievement and notify every participant.
   */
  private async completeTournament(tournamentId: string, finalMatchId: string, championId: string) {
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      include: {
        teams: { include: { members: { select: { userId: true } }, team: { select: { name: true } } } },
        participants: { select: { userId: true } },
        matches: { select: { id: true, round: true, winnerId: true, team1Id: true, team2Id: true } },
      },
    });
    if (!tournament) throw new NotFoundError('Tournament');

    const rounds = tournament.matches.reduce((max, m) => Math.max(max, m.round), 0);
    // placement per TournamentTeam id, derived from the round they lost in.
    const placements = new Map<string, number>();
    for (const match of tournament.matches) {
      if (!match.winnerId) continue;
      const loserId = match.team1Id === match.winnerId ? match.team2Id : match.team1Id;
      if (!loserId) continue;
      let placement: number;
      if (match.round === rounds) {
        placement = 2; // runner-up
      } else {
        placement = Math.pow(2, rounds - match.round) + 1; // group start (3rd/4th, 5th-8th, ...)
      }
      const existing = placements.get(loserId);
      if (existing === undefined || placement < existing) placements.set(loserId, placement);
    }
    placements.set(championId, 1);

    await Promise.all(
      tournament.teams.map((t) =>
        prisma.tournamentTeam.update({ where: { id: t.id }, data: { placement: placements.get(t.id) ?? null } })
      )
    );
    await prisma.tournament.update({ where: { id: tournamentId }, data: { status: TournamentStatus.COMPLETED, endDate: new Date() } });

    // TournamentHistory for the top 3 teams + winner achievement + notifications.
    const topTeams = [...tournament.teams]
      .map((t) => ({ ...t, placement: placements.get(t.id) ?? Infinity }))
      .sort((a, b) => a.placement - b.placement)
      .slice(0, 3);
    const placementLabel: Record<number, string> = { 1: '1st Place', 2: '2nd Place', 3: '3rd Place' };
    for (const team of topTeams) {
      const label = placementLabel[team.placement] || `#${team.placement}`;
      for (const member of team.members) {
        await prisma.tournamentHistory.create({
          data: {
            tournamentName: tournament.title,
            placement: label,
            prize: team.placement === 1 && tournament.prizePool ? `${tournament.prizePool}` : undefined,
            profileId: member.userId,
          },
        }).catch(() => {});
        if (team.placement === 1) {
          achievementService.unlockByKey(member.userId, 'TOURNAMENT_WINNER').catch(() => {});
        }
        if (team.placement <= 3) {
          achievementService.unlockByKey(member.userId, 'TOURNAMENT_TOP3').catch(() => {});
        }
        await notificationService.createWithDedupe(
          {
            userId: member.userId,
            type: NotificationType.TOURNAMENT_RESULT,
            title: `Tournament complete — ${label}`,
            message: `${team.team.name} finished ${label} in "${tournament.title}"`,
            link: `/tournaments/${tournamentId}`,
          },
          `tournament-final-${tournamentId}-${member.userId}`
        );
      }
    }
    const allMemberIds = new Set<string>(tournament.participants.map((p) => p.userId));
    for (const team of tournament.teams) for (const member of team.members) allMemberIds.add(member.userId);
    for (const memberId of allMemberIds) {
      emitToUser(memberId, 'tournament:completed', { tournamentId });
    }
  }

  /** Standings derived from real match results (wins/losses + placement). */
  async getStandings(tournamentId: string) {
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      include: {
        teams: { include: { team: { select: { id: true, name: true, avatar: true, tag: true } }, members: { include: { user: { select: { id: true, profile: { select: { username: true, avatar: true } } } } } } } },
        matches: { select: { winnerId: true, team1Id: true, team2Id: true, status: true, round: true } },
      },
    });
    if (!tournament) throw new NotFoundError('Tournament');
    const stats = new Map<string, { wins: number; losses: number }>();
    for (const t of tournament.teams) stats.set(t.id, { wins: 0, losses: 0 });
    for (const m of tournament.matches) {
      if (m.status !== MatchStatus.COMPLETED || !m.winnerId) continue;
      const winner = stats.get(m.winnerId);
      if (winner) winner.wins += 1;
      const loserId = m.team1Id === m.winnerId ? m.team2Id : m.team1Id;
      if (loserId) {
        const loser = stats.get(loserId);
        if (loser) loser.losses += 1;
      }
    }
    const standings = tournament.teams
      .map((t) => ({ ...t, ...(stats.get(t.id) || { wins: 0, losses: 0 }) }))
      .sort((a, b) => {
        const pa = a.placement ?? Number.MAX_SAFE_INTEGER;
        const pb = b.placement ?? Number.MAX_SAFE_INTEGER;
        if (pa !== pb) return pa - pb;
        return (b.wins ?? 0) - (a.wins ?? 0);
      });
    return standings;
  }

  // ─── Disputes (match result verification) ────────────────────────────────

  /**
   * A member of either team (or the organizer) can dispute a completed match
   * result. One OPEN dispute per match per reporter; a hard cap per match
   * prevents flooding.
   */
  async fileDispute(tournamentId: string, matchId: string, userId: string, data: { reason: string; description?: string }) {
    const match = await prisma.match.findUnique({
      where: { id: matchId },
      include: { team1: { include: { members: { select: { userId: true } } } }, team2: { include: { members: { select: { userId: true } } } } },
    });
    if (!match || match.tournamentId !== tournamentId) throw new NotFoundError('Match');
    if (match.status !== MatchStatus.COMPLETED) throw new ForbiddenError('Only completed matches can be disputed');
    const isOrganizer = await this.isOrganizer(tournamentId, userId);
    const memberIds = new Set<string>();
    match.team1?.members?.forEach((m: any) => memberIds.add(m.userId));
    match.team2?.members?.forEach((m: any) => memberIds.add(m.userId));
    if (!isOrganizer && !memberIds.has(userId)) {
      throw new ForbiddenError('Only members of the participating teams can dispute a result');
    }
    const existing = await prisma.matchDispute.findFirst({ where: { matchId, reporterId: userId, status: 'OPEN' }, select: { id: true } });
    if (existing) throw new ConflictError('You already have an open dispute for this match');
    const openCount = await prisma.matchDispute.count({ where: { matchId, status: 'OPEN' } });
    if (openCount >= 3) throw new ConflictError('This match already has too many open disputes');
    const dispute = await prisma.matchDispute.create({
      data: { matchId, tournamentId, reporterId: userId, reason: data.reason, description: data.description },
      include: { reporter: { select: { id: true, profile: { select: { username: true, avatar: true } } } } },
    });
    const tournament = await prisma.tournament.findUnique({ where: { id: tournamentId }, select: { organizerId: true } });
    if (tournament) {
      await notificationService.create({
        userId: tournament.organizerId,
        type: NotificationType.TOURNAMENT,
        title: 'Match result disputed',
        message: `${data.reason}`,
        link: `/tournaments/${tournamentId}`,
      });
    }
    return dispute;
  }

  /**
   * Organizer resolves an OPEN dispute. RESOLVED can optionally overturn the
   * result: the new winner replaces the previous one in the next-round slot.
   */
  async resolveDispute(tournamentId: string, disputeId: string, userId: string, data: { status: 'RESOLVED' | 'DISMISSED'; resolution?: string; newWinnerId?: string }) {
    await this.assertOrganizer(tournamentId, userId);
    const dispute = await prisma.matchDispute.findUnique({
      where: { id: disputeId },
      include: { match: { include: { tournament: { select: { organizerId: true } } } } },
    });
    if (!dispute || dispute.tournamentId !== tournamentId) throw new NotFoundError('Dispute');
    if (dispute.status !== 'OPEN') throw new ConflictError('This dispute is already resolved');
    if (data.status !== 'RESOLVED' && data.status !== 'DISMISSED') {
      throw new ValidationError({ status: ['Status must be RESOLVED or DISMISSED'] });
    }
    if (data.newWinnerId && data.newWinnerId !== dispute.match.team1Id && data.newWinnerId !== dispute.match.team2Id) {
      throw new ValidationError({ newWinnerId: ['New winner must be one of the two teams'] });
    }
    const match = dispute.match;
    if (data.status === 'RESOLVED' && data.newWinnerId && data.newWinnerId !== match.winnerId) {
      await prisma.match.update({ where: { id: match.id }, data: { winnerId: data.newWinnerId } });
      const nextMatch = await prisma.match.findFirst({
        where: { tournamentId, round: match.round + 1, matchIndex: Math.floor(match.matchIndex / 2) },
      });
      if (nextMatch) {
        const slot = match.matchIndex % 2 === 0 ? { team1Id: data.newWinnerId } : { team2Id: data.newWinnerId };
        await prisma.match.update({ where: { id: nextMatch.id }, data: slot });
      } else {
        // Final overturned → re-complete the tournament with the new champion.
        await this.completeTournament(tournamentId, match.id, data.newWinnerId);
      }
    }
    const updated = await prisma.matchDispute.update({
      where: { id: disputeId },
      data: { status: data.status, resolution: data.resolution, resolvedAt: new Date() },
    });
    await notificationService.create({
      userId: dispute.reporterId,
      type: NotificationType.TOURNAMENT,
      title: data.status === 'RESOLVED' ? 'Dispute resolved' : 'Dispute dismissed',
      message: data.resolution || (data.status === 'RESOLVED' ? 'Your dispute was accepted' : 'Your dispute was not upheld'),
      link: `/tournaments/${tournamentId}`,
    }).catch(() => {});
    this.broadcastUpdate({ id: tournamentId, organizerId: match.tournament.organizerId });
    return updated;
  }

  // ─── Player Action Center & Team Readiness ───────────────────────────────

  async getPlayerActionCenter(userId: string) {
    const actions: Array<{ id: string; type: string; title: string; description: string; link: string; priority: 'HIGH' | 'MEDIUM' | 'LOW' }> = [];

    // 1. Verified Game Account check
    const verifiedAccounts = await prisma.gameAccount.count({ where: { userId, verified: true } });
    if (verifiedAccounts === 0) {
      actions.push({
        id: 'verify-game-acc',
        type: 'VERIFY_GAME_ACCOUNT',
        title: 'Verify Game Account',
        description: 'Link and verify your in-game UID to participate in tournaments',
        link: '/profile/edit',
        priority: 'HIGH',
      });
    }

    // 2. Pending Tournament Team Invitations
    const pendingInvites = await prisma.tournamentInvitation.findMany({
      where: { inviteeId: userId, status: 'PENDING' },
      include: { tournament: { select: { title: true } }, team: { select: { name: true } } },
    });
    for (const invite of pendingInvites) {
      actions.push({
        id: `invite-${invite.id}`,
        type: 'ACCEPT_TEAM_INVITE',
        title: 'Accept Team Invitation',
        description: `Join ${invite.team.name} for "${invite.tournament.title}"`,
        link: `/tournaments/${invite.tournamentId}`,
        priority: 'HIGH',
      });
    }

    // 3. Action Required Registrations
    const userTeamIds = await prisma.teamMember.findMany({
      where: { userId },
      select: { teamId: true },
    });
    const teamIdsList = userTeamIds.map((t) => t.teamId);
    if (teamIdsList.length > 0) {
      const actionRequiredTeams = await prisma.tournamentTeam.findMany({
        where: { teamId: { in: teamIdsList }, registrationStatus: 'ACTION_REQUIRED' },
        include: { tournament: { select: { title: true } } },
      });
      for (const tt of actionRequiredTeams) {
        actions.push({
          id: `resubmit-${tt.id}`,
          type: 'RESUBMIT_REGISTRATION',
          title: 'Resubmit Registration Details',
          description: tt.actionRequiredNotes || `Organizer requested updates for "${tt.tournament.title}"`,
          link: `/tournaments/${tt.tournamentId}`,
          priority: 'HIGH',
        });
      }

      // 4. Pending Match Check-Ins
      const upcomingMatches = await prisma.match.findMany({
        where: {
          status: MatchStatus.SCHEDULED,
          OR: [{ team1Id: { in: teamIdsList } }, { team2Id: { in: teamIdsList } }],
        },
        include: { tournament: { select: { title: true, checkInWindowMinutes: true } }, team1: { select: { teamId: true } }, team2: { select: { teamId: true } } },
      });

      for (const m of upcomingMatches) {
        const isTeam1 = m.team1 && teamIdsList.includes(m.team1.teamId);
        const isCheckedIn = isTeam1 ? m.team1CheckedIn : m.team2CheckedIn;
        if (!isCheckedIn) {
          actions.push({
            id: `checkin-match-${m.id}`,
            type: 'MATCH_CHECK_IN',
            title: `Check in to Match #${m.matchIndex + 1}`,
            description: `Check-in is required before lobby credentials unlock in "${m.tournament.title}"`,
            link: `/tournaments/${m.tournamentId}`,
            priority: 'HIGH',
          });
        }
      }
    }

    return {
      actionCount: actions.length,
      actions,
    };
  }

  async calculateTeamReadinessScore(tournamentTeamId: string) {
    const tt = await prisma.tournamentTeam.findUnique({
      where: { id: tournamentTeamId },
      include: {
        members: { include: { user: { include: { gameAccounts: true } } } },
        team: { select: { avatar: true } },
      },
    });
    if (!tt) return 0;

    let score = 0;
    // Roster completeness (up to 40 points)
    if (tt.members.length >= 1) score += 40;

    // Verified Game UIDs for all members (up to 30 points)
    const verifiedCount = tt.members.filter((m) => m.user.gameAccounts?.some((g) => g.verified)).length;
    if (tt.members.length > 0) {
      score += Math.round((verifiedCount / tt.members.length) * 30);
    }

    // Team Branding (15 points if logo uploaded)
    if (tt.team.avatar) score += 15;

    // Check-in status (15 points if checked in)
    if (tt.checkedIn) score += 15;

    await prisma.tournamentTeam.update({
      where: { id: tournamentTeamId },
      data: { readinessScore: score },
    });

    return score;
  }

  // ─── Organizer Command Center & "Needs Attention" ────────────────────────

  async getOrganizerCommandCenter(tournamentId: string, userId: string) {
    await this.assertOrganizer(tournamentId, userId);

    const openDisputes = await prisma.matchDispute.findMany({
      where: { tournamentId, status: 'OPEN' },
      include: {
        reporter: { select: { id: true, profile: { select: { username: true, avatar: true } } } },
        match: { select: { id: true, round: true, matchIndex: true } },
      },
    });

    const openTickets = await prisma.tournamentSupportTicket.findMany({
      where: { tournamentId, status: { in: ['OPEN', 'IN_PROGRESS'] } },
      include: {
        reporter: { select: { id: true, profile: { select: { username: true, avatar: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const pendingReviews = await prisma.tournamentTeam.count({
      where: { tournamentId, registrationStatus: { in: ['PENDING_REVIEW', 'ACTION_REQUIRED'] } },
    });

    const matchesNeedingCheckIn = await prisma.match.findMany({
      where: {
        tournamentId,
        status: MatchStatus.SCHEDULED,
        OR: [{ team1CheckedIn: false }, { team2CheckedIn: false }],
      },
      include: {
        team1: { include: { team: { select: { name: true } } } },
        team2: { include: { team: { select: { name: true } } } },
      },
    });

    const urgentCount = openDisputes.length + openTickets.filter((t) => t.priority === 'HIGH' || t.priority === 'URGENT').length + pendingReviews;

    return {
      urgentCount,
      openDisputes,
      openTickets,
      pendingReviews,
      matchesNeedingCheckIn,
    };
  }

  // ─── Match Check-In ──────────────────────────────────────────────────────

  async checkInMatch(matchId: string, teamId: string, userId: string) {
    const match = await prisma.match.findUnique({
      where: { id: matchId },
      include: {
        tournament: { select: { id: true, title: true } },
        team1: { include: { members: { select: { userId: true } }, team: { select: { name: true } } } },
        team2: { include: { members: { select: { userId: true } }, team: { select: { name: true } } } },
      },
    });
    if (!match) throw new NotFoundError('Match');

    const isTeam1 = match.team1?.id === teamId;
    const isTeam2 = match.team2?.id === teamId;
    if (!isTeam1 && !isTeam2) throw new ForbiddenError('Team not participating in this match');

    const targetTeam = isTeam1 ? match.team1 : match.team2;
    const isMember = targetTeam?.members.some((m) => m.userId === userId);
    if (!isMember) throw new ForbiddenError('Only team members can check in');

    const dataToUpdate = isTeam1 ? { team1CheckedIn: true } : { team2CheckedIn: true };
    const updatedMatch = await prisma.match.update({
      where: { id: matchId },
      data: dataToUpdate,
    });

    await this.logTournamentActivity(match.tournament.id, {
      type: 'CHECK_IN',
      title: 'Team Checked In',
      message: `${targetTeam?.team.name} checked in to Match #${match.matchIndex + 1}`,
      matchId,
      teamId,
      userId,
    });

    return updatedMatch;
  }

  // ─── Activity Feed Logging ───────────────────────────────────────────────

  async logTournamentActivity(
    tournamentId: string,
    data: { type: string; title: string; message: string; teamId?: string; matchId?: string; userId?: string; metadata?: any }
  ) {
    const entry = await prisma.tournamentActivityFeed.create({
      data: {
        tournamentId,
        type: data.type,
        title: data.title,
        message: data.message,
        teamId: data.teamId,
        matchId: data.matchId,
        userId: data.userId,
        metadata: data.metadata || {},
      },
      include: {
        user: { select: { profile: { select: { username: true, avatar: true } } } },
        team: { select: { team: { select: { name: true, avatar: true } } } },
      },
    });

    emitToUser(tournamentId, 'tournament:activity', entry);
    return entry;
  }

  async getTournamentActivityFeed(tournamentId: string, limit = 50) {
    return prisma.tournamentActivityFeed.findMany({
      where: { tournamentId },
      include: {
        user: { select: { profile: { select: { username: true, avatar: true } } } },
        team: { select: { team: { select: { name: true, avatar: true } } } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  // ─── Support Ticket Messages & Chat ──────────────────────────────────────

  async addTicketMessage(ticketId: string, senderId: string, data: { message: string; attachmentUrl?: string }) {
    const ticket = await prisma.tournamentSupportTicket.findUnique({
      where: { id: ticketId },
      select: { tournamentId: true, reporterId: true },
    });
    if (!ticket) throw new NotFoundError('Support ticket');

    const isOrganizer = await this.isOrganizer(ticket.tournamentId, senderId);
    const senderRole = isOrganizer ? 'ADMIN' : 'PLAYER';

    const msg = await prisma.ticketMessage.create({
      data: {
        ticketId,
        senderId,
        senderRole,
        message: data.message,
        attachmentUrl: data.attachmentUrl,
      },
      include: {
        sender: { select: { id: true, profile: { select: { username: true, avatar: true } } } },
      },
    });

    const recipientId = isOrganizer ? ticket.reporterId : senderId;
    if (recipientId) {
      await notificationService.create({
        userId: recipientId,
        type: NotificationType.TOURNAMENT,
        title: 'New ticket response',
        message: data.message.slice(0, 80),
        link: `/tournaments/${ticket.tournamentId}`,
      }).catch(() => {});
    }

    return msg;
  }

  async getTicketMessages(ticketId: string) {
    return prisma.ticketMessage.findMany({
      where: { ticketId },
      include: {
        sender: { select: { id: true, profile: { select: { username: true, avatar: true } } } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  // ─── Map Pick/Ban Veto System ─────────────────────────────────────────────

  async processMapVeto(matchId: string, teamId: string, action: 'BAN' | 'PICK', mapName: string, userId: string) {
    const match = await prisma.match.findUnique({
      where: { id: matchId },
      include: { tournament: { select: { id: true, mapPool: true } } },
    });
    if (!match) throw new NotFoundError('Match');

    const vetoState: any = match.mapVetoState || { history: [], remainingMaps: match.tournament.mapPool || ['Dust II', 'Mirage', 'Inferno', 'Nuke', 'Ancient'], selectedMap: null };

    vetoState.history.push({ teamId, action, mapName, timestamp: new Date() });
    if (action === 'BAN') {
      vetoState.remainingMaps = vetoState.remainingMaps.filter((m: string) => m !== mapName);
    } else if (action === 'PICK') {
      vetoState.selectedMap = mapName;
    }

    const updated = await prisma.match.update({
      where: { id: matchId },
      data: { mapVetoState: vetoState },
    });

    await this.logTournamentActivity(match.tournament.id, {
      type: 'ANNOUNCEMENT',
      title: 'Map Veto Action',
      message: `Map ${mapName} was ${action.toLowerCase()}ed`,
      matchId,
      teamId,
      userId,
    });

    return updated;
  }

  // ─── Organizer Payout Distribution Stage Manager ─────────────────────────

  async updatePayoutStage(tournamentId: string, userId: string, payoutStage: string, details?: any) {
    await this.assertOrganizer(tournamentId, userId);

    const updated = await prisma.tournament.update({
      where: { id: tournamentId },
      data: { payoutStage, payoutDetails: details || {} },
    });

    await this.logTournamentActivity(tournamentId, {
      type: 'ANNOUNCEMENT',
      title: 'Prize Payout Updated',
      message: `Prize distribution stage updated to ${payoutStage}`,
      userId,
    });

    return updated;
  }

  async forfeitNoShowTeam(matchId: string, forfeitTeamId: string, userId: string) {
    const match = await prisma.match.findUnique({
      where: { id: matchId },
      include: { tournament: { select: { id: true, organizerId: true } } },
    });
    if (!match) throw new NotFoundError('Match');
    await this.assertOrganizer(match.tournament.id, userId);

    const winningTeamId = match.team1Id === forfeitTeamId ? match.team2Id : match.team1Id;
    if (!winningTeamId) throw new ValidationError({ forfeitTeamId: ['Cannot forfeit match without valid opponent'] });

    return this.submitResult(match.tournament.id, matchId, userId, {
      scoreTeam1: match.team1Id === winningTeamId ? 1 : 0,
      scoreTeam2: match.team2Id === winningTeamId ? 1 : 0,
      winnerId: winningTeamId,
    });
  }

  // ─── Team Registration Approval Pipeline ───────────────────────────────────

  async acceptTeamRegistration(tournamentId: string, teamId: string, userId: string) {
    await this.assertOrganizer(tournamentId, userId);
    const tournamentTeam = await prisma.tournamentTeam.findUnique({
      where: { tournamentId_teamId: { tournamentId, teamId } },
      include: { team: { include: { members: { select: { userId: true } } } } },
    });
    if (!tournamentTeam) throw new NotFoundError('Tournament registration request');
    if (tournamentTeam.status === 'ACCEPTED') throw new ConflictError('Team is already accepted');

    const updated = await prisma.tournamentTeam.update({
      where: { id: tournamentTeam.id },
      data: { status: 'ACCEPTED' },
      include: { team: { select: { id: true, name: true, avatar: true } } },
    });

    // Automatically ensure team members are linked as TournamentTeamMembers
    const existingMembers = await prisma.tournamentTeamMember.findMany({ where: { tournamentTeamId: tournamentTeam.id } });
    if (existingMembers.length === 0 && tournamentTeam.team?.members) {
      await prisma.tournamentTeamMember.createMany({
        data: tournamentTeam.team.members.map((m) => ({ tournamentTeamId: tournamentTeam.id, userId: m.userId })),
        skipDuplicates: true,
      });
    }

    // Notify team captain & members
    for (const member of tournamentTeam.team.members) {
      await notificationService.create({
        userId: member.userId,
        type: NotificationType.TOURNAMENT,
        title: 'Team Accepted!',
        message: `${tournamentTeam.team.name} has been accepted into the tournament!`,
        link: `/tournaments/${tournamentId}`,
      }).catch(() => {});
    }

    this.broadcastUpdate({ id: tournamentId, organizerId: userId });
    return updated;
  }

  async rejectTeamRegistration(tournamentId: string, teamId: string, userId: string, rejectionReason?: string) {
    await this.assertOrganizer(tournamentId, userId);
    const tournamentTeam = await prisma.tournamentTeam.findUnique({
      where: { tournamentId_teamId: { tournamentId, teamId } },
      include: { team: { select: { id: true, name: true, members: { select: { userId: true } } } } },
    });
    if (!tournamentTeam) throw new NotFoundError('Tournament registration request');

    const updated = await prisma.tournamentTeam.update({
      where: { id: tournamentTeam.id },
      data: { status: 'REJECTED', rejectionReason: rejectionReason || 'Registration not accepted by organizer' },
    });

    if (tournamentTeam.team?.members?.[0]) {
      await notificationService.create({
        userId: tournamentTeam.team.members[0].userId,
        type: NotificationType.TOURNAMENT,
        title: 'Team Registration Update',
        message: `Your registration for ${tournamentTeam.team.name} was not accepted: ${rejectionReason || 'Organizer decision'}`,
        link: `/tournaments/${tournamentId}`,
      }).catch(() => {});
    }

    this.broadcastUpdate({ id: tournamentId, organizerId: userId });
    return updated;
  }

  // ─── Window-based Team Check-In System ─────────────────────────────────────

  async processCheckIn(tournamentId: string, userId: string) {
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      select: { id: true, startDate: true, checkInWindowMinutes: true, organizerId: true },
    });
    if (!tournament) throw new NotFoundError('Tournament');

    // Find the user's registered team in this tournament
    const userTeam = await prisma.tournamentTeam.findFirst({
      where: {
        tournamentId,
        status: 'ACCEPTED',
        OR: [
          { team: { members: { some: { userId } } } },
          { members: { some: { userId } } },
        ],
      },
    });

    if (!userTeam) throw new ForbiddenError('You do not have an accepted team in this tournament');
    if (userTeam.checkInStatus === 'CHECKED_IN') return userTeam;

    const updated = await prisma.tournamentTeam.update({
      where: { id: userTeam.id },
      data: { checkInStatus: 'CHECKED_IN', checkedInAt: new Date() },
    });

    this.broadcastUpdate(tournament);
    return updated;
  }

  // ─── Match Credentials & Instructions ─────────────────────────────────────

  async setMatchCredentials(tournamentId: string, matchId: string, userId: string, data: { roomId: string; roomPassword?: string; instructions?: string }) {
    await this.assertOrganizer(tournamentId, userId);
    const match = await prisma.match.findUnique({ where: { id: matchId } });
    if (!match || match.tournamentId !== tournamentId) throw new NotFoundError('Match');

    const updated = await prisma.match.update({
      where: { id: matchId },
      data: { roomId: data.roomId, roomPassword: data.roomPassword, instructions: data.instructions },
    });

    this.broadcastUpdate({ id: tournamentId, organizerId: userId });
    return updated;
  }

  // ─── Announcements & Broadcasts ───────────────────────────────────────────

  async createAnnouncement(tournamentId: string, userId: string, data: { title: string; content: string; isPinned?: boolean }) {
    await this.assertOrganizer(tournamentId, userId);
    const announcement = await prisma.tournamentAnnouncement.create({
      data: { tournamentId, title: data.title, content: data.content, isPinned: data.isPinned || false },
    });

    this.broadcastUpdate({ id: tournamentId, organizerId: userId });
    return announcement;
  }

  async getAnnouncements(tournamentId: string) {
    return prisma.tournamentAnnouncement.findMany({
      where: { tournamentId },
      orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
    });
  }

  // ─── Organizer Reputation & Analytics ─────────────────────────────────────

  async rateOrganizer(tournamentId: string, userId: string, data: { rating: number; feedback?: string }) {
    const tournament = await prisma.tournament.findUnique({ where: { id: tournamentId }, select: { status: true } });
    if (!tournament) throw new NotFoundError('Tournament');

    return prisma.tournamentOrganizerRating.upsert({
      where: { tournamentId_userId: { tournamentId, userId } },
      create: { tournamentId, userId, rating: data.rating, feedback: data.feedback },
      update: { rating: data.rating, feedback: data.feedback },
    });
  }

  async getAnalytics(tournamentId: string, userId: string) {
    await this.assertOrganizer(tournamentId, userId);
    const [totalTeams, acceptedTeams, checkedInTeams, matches, disputes] = await Promise.all([
      prisma.tournamentTeam.count({ where: { tournamentId } }),
      prisma.tournamentTeam.count({ where: { tournamentId, status: 'ACCEPTED' } }),
      prisma.tournamentTeam.count({ where: { tournamentId, checkInStatus: 'CHECKED_IN' } }),
      prisma.match.findMany({ where: { tournamentId }, select: { status: true } }),
      prisma.matchDispute.count({ where: { tournamentId } }),
    ]);

    const completedMatches = matches.filter((m) => m.status === 'COMPLETED').length;
    const checkInRate = acceptedTeams > 0 ? Math.round((checkedInTeams / acceptedTeams) * 100) : 0;
    const completionRate = matches.length > 0 ? Math.round((completedMatches / matches.length) * 100) : 0;

    return {
      totalTeams,
      acceptedTeams,
      checkedInTeams,
      checkInRate,
      totalMatches: matches.length,
      completedMatches,
      completionRate,
      disputes,
    };
  }

  // ─── Workspace & Workspace Chat ──────────────────────────────────────────────

  async getWorkspace(tournamentId: string, userId?: string) {
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      include: {
        announcements: { orderBy: { createdAt: 'desc' } },
        teams: {
          where: { status: 'ACCEPTED' },
          include: {
            team: true,
            members: {
              include: {
                user: {
                  select: {
                    id: true,
                    profile: { select: { username: true, avatar: true } },
                  },
                },
              },
            },
          },
        },
        participants: {
          include: {
            user: {
              select: {
                id: true,
                profile: { select: { username: true, avatar: true } },
              },
            },
          },
        },
      },
    });

    if (!tournament) throw new NotFoundError('Tournament');

    let isOrganizer = false;
    let isApprovedParticipant = false;

    if (userId) {
      isOrganizer = tournament.organizerId === userId;
      if (!isOrganizer) {
        const teamMatch = tournament.teams.some((t: any) =>
          t.members.some((m: any) => m.userId === userId)
        );
        const partMatch = tournament.participants.some((p: any) => p.userId === userId);
        isApprovedParticipant = teamMatch || partMatch;
      }
    }

    const canAccessPrivateCredentials = isOrganizer || isApprovedParticipant;

    return {
      id: tournament.id,
      title: tournament.title,
      description: tournament.description,
      game: tournament.game,
      type: tournament.type,
      status: tournament.status,
      startDate: tournament.startDate,
      rules: tournament.rules,
      prizePool: tournament.prizePool,
      maxTeams: tournament.maxTeams,
      announcements: tournament.announcements,
      teams: tournament.teams,
      participants: tournament.participants,
      isOrganizer,
      isApprovedParticipant,
      roomCredentials: canAccessPrivateCredentials && (tournament as any).roomDetails ? (tournament as any).roomDetails : null,
    };
  }

  async getTournamentChat(tournamentId: string, userId: string) {
    const workspace = await this.getWorkspace(tournamentId, userId);
    if (!workspace.isOrganizer && !workspace.isApprovedParticipant) {
      throw new ForbiddenError('Tournament chat access requires approved participant or organizer status');
    }

    const roomName = `Tournament:${tournamentId}`;
    let chat = await prisma.chat.findFirst({
      where: { name: roomName },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          take: 100,
          include: {
            sender: {
              select: {
                id: true,
                profile: { select: { username: true, avatar: true } },
              },
            },
          },
        },
      },
    });

    if (!chat) {
      chat = await prisma.chat.create({
        data: {
          name: roomName,
          isGroup: true,
        },
        include: {
          messages: {
            orderBy: { createdAt: 'asc' },
            take: 100,
            include: {
              sender: {
                select: {
                  id: true,
                  profile: { select: { username: true, avatar: true } },
                },
              },
            },
          },
        },
      });
    }

    return chat;
  }

  async sendTournamentChatMessage(tournamentId: string, userId: string, text: string) {
    const chat = await this.getTournamentChat(tournamentId, userId);
    const message = await prisma.message.create({
      data: {
        chatId: chat.id,
        senderId: userId,
        content: text,
      },
      include: {
        sender: {
          select: {
            id: true,
            profile: { select: { username: true, avatar: true } },
          },
        },
      },
    });

    return message;
  }
}
export const tournamentService = new TournamentService();



