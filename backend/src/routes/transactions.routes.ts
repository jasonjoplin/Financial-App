import { Router } from 'express';
import { body, param, query } from 'express-validator';
import {
  createTransaction,
  getTransactions,
  getTransaction,
  voidTransaction,
  getGeneralLedger,
  getTrialBalance,
  getAccountBalance
} from '@/controllers/transactions.controller';
import { authenticate, requireCompany } from '@/middleware/auth';

const router = Router();

// Validation rules
const createTransactionValidation = [
  param('companyId').isUUID(),
  body('transaction_date').isISO8601(),
  body('posting_date').optional().isISO8601(),
  body('reference').optional().trim(),
  body('description').optional().trim(),
  body('memo').optional().trim(),
  body('type').isIn(['journal_entry', 'invoice', 'payment', 'deposit', 'transfer', 'adjustment']),
  body('entries').isArray({ min: 2 }),
  body('entries.*.account_id').isUUID(),
  body('entries.*.debit_amount').optional().isNumeric(),
  body('entries.*.credit_amount').optional().isNumeric(),
  body('entries.*.description').optional().trim(),
  body('entries.*.memo').optional().trim(),
  body('entries.*.entity_id').optional().isUUID(),
  body('entries.*.entity_type').optional().isIn(['customer', 'vendor', 'employee'])
];

const getTransactionsValidation = [
  param('companyId').isUUID(),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('type').optional().isIn(['journal_entry', 'invoice', 'payment', 'deposit', 'transfer', 'adjustment']),
  query('status').optional().isIn(['draft', 'pending', 'posted', 'void']),
  query('from_date').optional().isISO8601(),
  query('to_date').optional().isISO8601(),
  query('account_id').optional().isUUID()
];

const getTransactionValidation = [
  param('companyId').isUUID(),
  param('transactionId').isUUID()
];

const getGeneralLedgerValidation = [
  param('companyId').isUUID(),
  query('account_id').optional().isUUID(),
  query('from_date').optional().isISO8601(),
  query('to_date').optional().isISO8601(),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 1000 })
];

const getTrialBalanceValidation = [
  param('companyId').isUUID(),
  query('as_of_date').optional().isISO8601()
];

const getAccountBalanceValidation = [
  param('companyId').isUUID(),
  param('accountId').isUUID(),
  query('as_of_date').optional().isISO8601()
];

// Routes
router.post('/:companyId/transactions', 
  authenticate, 
  requireCompany, 
  createTransactionValidation, 
  createTransaction
);

router.get('/:companyId/transactions', 
  authenticate, 
  requireCompany, 
  getTransactionsValidation, 
  getTransactions
);

router.get('/:companyId/transactions/:transactionId', 
  authenticate, 
  requireCompany, 
  getTransactionValidation, 
  getTransaction
);

router.patch('/:companyId/transactions/:transactionId/void', 
  authenticate, 
  requireCompany, 
  getTransactionValidation, 
  voidTransaction
);

router.get('/:companyId/general-ledger', 
  authenticate, 
  requireCompany, 
  getGeneralLedgerValidation, 
  getGeneralLedger
);

router.get('/:companyId/trial-balance', 
  authenticate, 
  requireCompany, 
  getTrialBalanceValidation, 
  getTrialBalance
);

router.get('/:companyId/accounts/:accountId/balance', 
  authenticate, 
  requireCompany, 
  getAccountBalanceValidation, 
  getAccountBalance
);

export default router;