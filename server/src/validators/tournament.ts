import { body, param } from 'express-validator';

export const createTournamentValidation = [
  body('title').isString().trim().isLength({ min: 3, max: 120 }).withMessage('Title must be 3-120 characters'),
  body('description').optional({ values: 'falsy' }).isString().isLength({ max: 2000 }).withMessage('Description is too long'),
  body('game').isString().trim().notEmpty().withMessage('Game is required'),
  body('type').optional().isIn(['SINGLE_ELIMINATION', 'DOUBLE_ELIMINATION', 'ROUND_ROBIN', 'SWISS']).withMessage('Invalid tournament type'),
  body('format').optional().isIn(['SINGLE_ELIMINATION', 'DOUBLE_ELIMINATION', 'ROUND_ROBIN', 'SWISS']).withMessage('Invalid tournament format'),
  body('maxTeams').isInt({ min: 2, max: 128 }).withMessage('Max teams must be between 2 and 128'),
  body('prizePool').optional({ values: 'falsy' }).isFloat({ min: 0 }).withMessage('Prize pool must be a non-negative number'),
  body('entryFee').optional({ values: 'falsy' }).isFloat({ min: 0 }).withMessage('Entry fee must be a non-negative number'),
  body('startDate').isISO8601().withMessage('Valid start date is required'),
  body('rules').optional({ values: 'falsy' }).isString().isLength({ max: 5000 }).withMessage('Rules are too long'),
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

