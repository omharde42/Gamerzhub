import { body, param } from 'express-validator';

export const createTournamentValidation = [
  body('title').isString().trim().isLength({ min: 3, max: 120 }).withMessage('Title must be 3-120 characters'),
  body('description').optional({ values: 'falsy' }).isString().isLength({ max: 2000 }).withMessage('Description is too long'),
  body('game').isString().trim().notEmpty().withMessage('Game is required'),
  body('type').optional().isIn(['SINGLE_ELIMINATION', 'DOUBLE_ELIMINATION', 'ROUND_ROBIN', 'SWISS', 'BATTLE_ROYALE']).withMessage('Invalid tournament type'),
  body('format').optional().isIn(['SINGLE_ELIMINATION', 'DOUBLE_ELIMINATION', 'ROUND_ROBIN', 'SWISS', 'BATTLE_ROYALE']).withMessage('Invalid tournament format'),
  body('formatMode').optional().isIn(['SOLO', 'DUO', 'SQUAD']).withMessage('Invalid format mode (must be SOLO, DUO, or SQUAD)'),
  body('maxTeams').isInt({ min: 2, max: 256 }).withMessage('Capacity must be between 2 and 256'),
  body('minTeamSize').optional().isInt({ min: 1, max: 10 }).withMessage('Min team size must be 1-10'),
  body('maxTeamSize').optional().isInt({ min: 1, max: 10 }).withMessage('Max team size must be 1-10'),
  body('prizePool').optional({ values: 'falsy' }).isFloat({ min: 0 }).withMessage('Prize pool must be a non-negative number'),
  body('entryFee').optional({ values: 'falsy' }).isFloat({ min: 0 }).withMessage('Entry fee must be a non-negative number'),
  body('startDate').isISO8601().withMessage('Valid start date is required'),
  body('endDate').optional({ values: 'falsy' }).isISO8601().withMessage('Valid end date is required'),
  body('registrationEnd').optional({ values: 'falsy' }).isISO8601().withMessage('Valid registration end date is required'),
  body('rules').optional({ values: 'falsy' }).isString().isLength({ max: 5000 }).withMessage('Rules are too long'),
  body('mapPool').optional().isArray().withMessage('Map pool must be an array of strings'),
  body('status').optional().isIn(['DRAFT', 'REGISTRATION_OPEN', 'OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).withMessage('Invalid status'),
];

export const updateTournamentStatusValidation = [
  param('id').isUUID().withMessage('Valid tournament ID is required'),
  body('status').isIn(['DRAFT', 'REGISTRATION_OPEN', 'OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).withMessage('Invalid tournament status'),
];

export const registerTournamentValidation = [
  param('id').isUUID().withMessage('Valid tournament ID is required'),
  body('teamId').optional({ values: 'falsy' }).isUUID().withMessage('Valid team ID is required'),
];

export const tournamentIdParamValidation = [
  param('id').isUUID().withMessage('Valid tournament ID is required'),
];

export const submitResultValidation = [
  param('id').isUUID().withMessage('Valid tournament ID is required'),
  param('matchId').isUUID().withMessage('Valid match ID is required'),
  body('scoreTeam1').isInt({ min: 0 }).withMessage('Team 1 score must be a non-negative integer'),
  body('scoreTeam2').isInt({ min: 0 }).withMessage('Team 2 score must be a non-negative integer'),
  body('winnerId').optional({ values: 'falsy' }).isUUID().withMessage('Valid winner team ID is required'),
];

export const disputeValidation = [
  param('id').isUUID().withMessage('Valid tournament ID is required'),
  param('matchId').isUUID().withMessage('Valid match ID is required'),
  body('reason').isString().trim().isLength({ min: 3, max: 200 }).withMessage('Reason must be 3-200 characters'),
  body('description').optional({ values: 'falsy' }).isString().isLength({ max: 2000 }).withMessage('Description is too long'),
];

export const resolveDisputeValidation = [
  param('id').isUUID().withMessage('Valid tournament ID is required'),
  param('disputeId').isUUID().withMessage('Valid dispute ID is required'),
  body('status').isIn(['RESOLVED', 'DISMISSED']).withMessage('Status must be RESOLVED or DISMISSED'),
  body('resolution').optional({ values: 'falsy' }).isString().isLength({ max: 2000 }).withMessage('Resolution note is too long'),
  body('newWinnerId').optional({ values: 'falsy' }).isUUID().withMessage('Valid new winner team ID is required'),
];

export const matchCheckInValidation = [
  param('matchId').isUUID().withMessage('Valid match ID is required'),
  body('teamId').isUUID().withMessage('Valid team ID is required'),
];

export const ticketMessageValidation = [
  param('ticketId').isUUID().withMessage('Valid ticket ID is required'),
  body('message').isString().trim().isLength({ min: 1, max: 2000 }).withMessage('Message must be between 1 and 2000 characters'),
  body('attachmentUrl').optional({ values: 'falsy' }).isString().withMessage('Attachment URL must be a string'),
];

export const mapVetoValidation = [
  param('matchId').isUUID().withMessage('Valid match ID is required'),
  body('action').isIn(['BAN', 'PICK']).withMessage('Action must be BAN or PICK'),
  body('mapName').isString().trim().notEmpty().withMessage('Map name is required'),
];

export const payoutStageValidation = [
  param('id').isUUID().withMessage('Valid tournament ID is required'),
  body('payoutStage').isIn(['PENDING', 'DISTRIBUTING', 'COMPLETED']).withMessage('Payout stage must be PENDING, DISTRIBUTING, or COMPLETED'),
];

export const teamRegistrationDecisionValidation = [
  param('id').isUUID().withMessage('Valid tournament ID is required'),
  param('teamId').isUUID().withMessage('Valid team ID is required'),
  body('rejectionReason').optional({ values: 'falsy' }).isString().isLength({ max: 500 }).withMessage('Rejection reason must be under 500 characters'),
];

export const matchCredentialsValidation = [
  param('id').isUUID().withMessage('Valid tournament ID is required'),
  param('matchId').isUUID().withMessage('Valid match ID is required'),
  body('roomId').isString().trim().notEmpty().withMessage('Room ID is required'),
  body('roomPassword').optional({ values: 'falsy' }).isString().trim(),
  body('instructions').optional({ values: 'falsy' }).isString().isLength({ max: 1000 }),
];

export const announcementValidation = [
  param('id').isUUID().withMessage('Valid tournament ID is required'),
  body('title').isString().trim().isLength({ min: 2, max: 150 }).withMessage('Title must be between 2 and 150 characters'),
  body('content').isString().trim().isLength({ min: 5, max: 2000 }).withMessage('Content must be between 5 and 2000 characters'),
  body('isPinned').optional().isBoolean(),
];

export const organizerRatingValidation = [
  param('id').isUUID().withMessage('Valid tournament ID is required'),
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
  body('feedback').optional({ values: 'falsy' }).isString().isLength({ max: 1000 }),
];

export const VALID_REPORT_CATEGORIES = [
  'MISLEADING_INFO',
  'ORGANIZER_MISCONDUCT',
  'PRIZE_DISPUTE',
  'CANCELLATION_ISSUE',
  'UNFAIR_ADMIN',
  'SUSPICIOUS_ACTIVITY',
  'CHEATING',
  'HARASSMENT',
  'ABUSIVE_LANGUAGE',
  'IMPERSONATION',
  'SPAM',
  'INAPPROPRIATE_BEHAVIOR',
  'INVALID_ROSTER',
  'ABUSIVE_BEHAVIOR',
  'THREATS',
  'INAPPROPRIATE_CONTENT',
  'SCAM_FRAUD',
  'INCORRECT_RESULT',
  'SCORE_MANIPULATION',
  'DISPUTED_PLACEMENT',
  'OTHER_RESULT_ISSUE',
  'SCORE_DISPUTE',
  'ROSTER_ISSUE',
  'TECHNICAL',
  'GENERAL',
];

export const createReportValidation = [
  body('category').isString().trim().isIn(VALID_REPORT_CATEGORIES).withMessage('Invalid report category'),
  body('subject').optional({ values: 'falsy' }).isString().trim().isLength({ max: 150 }).withMessage('Subject is too long'),
  body('description').isString().trim().isLength({ min: 5, max: 2000 }).withMessage('Description must be 5-2000 characters'),
  body('tournamentId').optional({ values: 'falsy' }).isUUID().withMessage('Valid tournament ID required'),
  body('targetUserId').optional({ values: 'falsy' }).isUUID().withMessage('Valid target user ID required'),
  body('targetTeamId').optional({ values: 'falsy' }).isUUID().withMessage('Valid target team ID required'),
  body('targetResultId').optional({ values: 'falsy' }).isUUID().withMessage('Valid target result ID required'),
  body('targetMessageId').optional({ values: 'falsy' }).isUUID().withMessage('Valid target message ID required'),
  body('evidenceUrl').optional({ values: 'falsy' }).isString().trim().withMessage('Evidence URL must be a string'),
  body('severity').optional().isIn(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).withMessage('Invalid severity'),
];

export const updateReportStatusValidation = [
  param('reportId').isUUID().withMessage('Valid report ID required'),
  body('status').isIn(['OPEN', 'UNDER_REVIEW', 'ACTION_REQUIRED', 'RESOLVED', 'REJECTED', 'DUPLICATE', 'ESCALATED']).withMessage('Invalid report status'),
];

export const resolveReportValidation = [
  param('reportId').isUUID().withMessage('Valid report ID required'),
  body('status').isIn(['RESOLVED', 'REJECTED', 'DUPLICATE']).withMessage('Status must be RESOLVED, REJECTED, or DUPLICATE'),
  body('resolutionNote').isString().trim().isLength({ min: 3, max: 2000 }).withMessage('Resolution note must be 3-2000 characters'),
  body('actionTaken').optional().isIn(['NO_VIOLATION', 'WARNING', 'CONTENT_REMOVAL', 'PARTICIPANT_RESTRICTION', 'ORGANIZER_RESTRICTION', 'TOURNAMENT_SUSPENSION', 'TOURNAMENT_CANCELLATION', 'RESULT_CORRECTION', 'ESCALATE']).withMessage('Invalid action taken'),
];

