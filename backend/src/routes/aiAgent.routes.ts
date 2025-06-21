import { Router } from 'express';
import { body, param, query } from 'express-validator';
import {
  analyzeTransaction,
  getSuggestions,
  getSuggestion,
  approveSuggestion,
  rejectSuggestion,
  implementSuggestion,
  getAgents,
  updateAgent,
  getAgentPerformance
} from '@/controllers/aiAgent.controller';
import { authenticate, requireCompany } from '@/middleware/auth';

const router = Router();

// Validation rules
const analyzeTransactionValidation = [
  param('companyId').isUUID(),
  body('description').notEmpty().trim(),
  body('amount').isNumeric(),
  body('date').isISO8601(),
  body('reference').optional().trim(),
  body('attachment_data').optional().trim(),
  body('context').optional().isObject()
];

const getSuggestionsValidation = [
  param('companyId').isUUID(),
  query('status').optional().isIn(['pending', 'approved', 'rejected', 'implemented', 'all']),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('agent_type').optional().isIn(['accounting', 'tax', 'analysis'])
];

const suggestionValidation = [
  param('companyId').isUUID(),
  param('suggestionId').isUUID()
];

const reviewSuggestionValidation = [
  ...suggestionValidation,
  body('review_notes').optional().trim(),
  body('auto_implement').optional().isBoolean()
];

const updateAgentValidation = [
  param('companyId').isUUID(),
  param('agentId').isUUID(),
  body('name').optional().notEmpty().trim(),
  body('description').optional().trim(),
  body('confidence_threshold').optional().isFloat({ min: 0, max: 1 }),
  body('auto_approve').optional().isBoolean(),
  body('is_active').optional().isBoolean(),
  body('configuration').optional().isObject(),
  body('rules').optional().isObject()
];

const getAgentPerformanceValidation = [
  param('companyId').isUUID(),
  param('agentId').isUUID(),
  query('days').optional().isInt({ min: 1, max: 365 })
];

// Routes

// Transaction Analysis
router.post('/:companyId/analyze', 
  authenticate, 
  requireCompany, 
  analyzeTransactionValidation, 
  analyzeTransaction
);

// Suggestions Management
router.get('/:companyId/suggestions', 
  authenticate, 
  requireCompany, 
  getSuggestionsValidation, 
  getSuggestions
);

router.get('/:companyId/suggestions/:suggestionId', 
  authenticate, 
  requireCompany, 
  suggestionValidation, 
  getSuggestion
);

router.patch('/:companyId/suggestions/:suggestionId/approve', 
  authenticate, 
  requireCompany, 
  reviewSuggestionValidation, 
  approveSuggestion
);

router.patch('/:companyId/suggestions/:suggestionId/reject', 
  authenticate, 
  requireCompany, 
  reviewSuggestionValidation, 
  rejectSuggestion
);

router.post('/:companyId/suggestions/:suggestionId/implement', 
  authenticate, 
  requireCompany, 
  suggestionValidation, 
  implementSuggestion
);

// Agent Management
router.get('/:companyId/agents', 
  authenticate, 
  requireCompany, 
  getAgents
);

router.patch('/:companyId/agents/:agentId', 
  authenticate, 
  requireCompany, 
  updateAgentValidation, 
  updateAgent
);

router.get('/:companyId/agents/:agentId/performance', 
  authenticate, 
  requireCompany, 
  getAgentPerformanceValidation, 
  getAgentPerformance
);

export default router;