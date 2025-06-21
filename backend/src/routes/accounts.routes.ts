import { Router } from 'express';
import { body, param } from 'express-validator';
import {
  getChartOfAccounts,
  createAccount,
  updateAccount,
  deactivateAccount,
  getAccountCategories
} from '@/controllers/accounts.controller';
import { authenticate, requireCompany } from '@/middleware/auth';

const router = Router();

// Validation rules
const createAccountValidation = [
  param('companyId').isUUID(),
  body('account_category_id').isUUID(),
  body('parent_account_id').optional().isUUID(),
  body('code').notEmpty().trim().isLength({ max: 20 }),
  body('name').notEmpty().trim().isLength({ max: 255 }),
  body('description').optional().trim(),
  body('opening_balance').optional().isNumeric(),
  body('opening_balance_date').optional().isISO8601()
];

const updateAccountValidation = [
  param('companyId').isUUID(),
  param('accountId').isUUID(),
  body('code').optional().notEmpty().trim().isLength({ max: 20 }),
  body('name').optional().notEmpty().trim().isLength({ max: 255 }),
  body('description').optional().trim(),
  body('opening_balance').optional().isNumeric(),
  body('opening_balance_date').optional().isISO8601()
];

// Routes
router.get('/categories', authenticate, getAccountCategories);
router.get('/:companyId/chart', authenticate, requireCompany, getChartOfAccounts);
router.post('/:companyId', authenticate, requireCompany, createAccountValidation, createAccount);
router.put('/:companyId/:accountId', authenticate, requireCompany, updateAccountValidation, updateAccount);
router.delete('/:companyId/:accountId', authenticate, requireCompany, deactivateAccount);

export default router;