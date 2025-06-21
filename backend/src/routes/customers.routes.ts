import { Router } from 'express';
import { body, param, query } from 'express-validator';
import {
  getCustomers,
  getCustomer,
  createCustomer,
  updateCustomer,
  deactivateCustomer,
  getCustomerInvoices,
  getCustomerBalance
} from '@/controllers/customers.controller';
import { authenticate, requireCompany } from '@/middleware/auth';

const router = Router();

// Validation rules
const getCustomersValidation = [
  param('companyId').isUUID(),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('search').optional().trim(),
  query('is_active').optional().isIn(['true', 'false', 'all'])
];

const getCustomerValidation = [
  param('companyId').isUUID(),
  param('customerId').isUUID()
];

const createCustomerValidation = [
  param('companyId').isUUID(),
  body('name').notEmpty().trim(),
  body('company_name').optional().trim(),
  body('email').optional().isEmail().normalizeEmail(),
  body('phone').optional().trim(),
  body('billing_address').optional().trim(),
  body('billing_city').optional().trim(),
  body('billing_state').optional().trim(),
  body('billing_zip').optional().trim(),
  body('billing_country').optional().trim(),
  body('shipping_address').optional().trim(),
  body('shipping_city').optional().trim(),
  body('shipping_state').optional().trim(),
  body('shipping_zip').optional().trim(),
  body('shipping_country').optional().trim(),
  body('tax_id').optional().trim(),
  body('credit_limit').optional().isNumeric(),
  body('payment_terms').optional().isIn(['net_15', 'net_30', 'net_60', 'due_on_receipt', 'cash_on_delivery']),
  body('custom_fields').optional().isObject()
];

const updateCustomerValidation = [
  param('companyId').isUUID(),
  param('customerId').isUUID(),
  body('name').optional().notEmpty().trim(),
  body('company_name').optional().trim(),
  body('email').optional().isEmail().normalizeEmail(),
  body('phone').optional().trim(),
  body('billing_address').optional().trim(),
  body('billing_city').optional().trim(),
  body('billing_state').optional().trim(),
  body('billing_zip').optional().trim(),
  body('billing_country').optional().trim(),
  body('shipping_address').optional().trim(),
  body('shipping_city').optional().trim(),
  body('shipping_state').optional().trim(),
  body('shipping_zip').optional().trim(),
  body('shipping_country').optional().trim(),
  body('tax_id').optional().trim(),
  body('credit_limit').optional().isNumeric(),
  body('payment_terms').optional().isIn(['net_15', 'net_30', 'net_60', 'due_on_receipt', 'cash_on_delivery']),
  body('custom_fields').optional().isObject(),
  body('is_active').optional().isBoolean()
];

const getCustomerInvoicesValidation = [
  param('companyId').isUUID(),
  param('customerId').isUUID(),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('status').optional().isIn(['draft', 'sent', 'viewed', 'overdue', 'paid', 'void'])
];

// Routes
router.get('/:companyId/customers', 
  authenticate, 
  requireCompany, 
  getCustomersValidation, 
  getCustomers
);

router.get('/:companyId/customers/:customerId', 
  authenticate, 
  requireCompany, 
  getCustomerValidation, 
  getCustomer
);

router.post('/:companyId/customers', 
  authenticate, 
  requireCompany, 
  createCustomerValidation, 
  createCustomer
);

router.put('/:companyId/customers/:customerId', 
  authenticate, 
  requireCompany, 
  updateCustomerValidation, 
  updateCustomer
);

router.delete('/:companyId/customers/:customerId', 
  authenticate, 
  requireCompany, 
  getCustomerValidation, 
  deactivateCustomer
);

router.get('/:companyId/customers/:customerId/invoices', 
  authenticate, 
  requireCompany, 
  getCustomerInvoicesValidation, 
  getCustomerInvoices
);

router.get('/:companyId/customers/:customerId/balance', 
  authenticate, 
  requireCompany, 
  getCustomerValidation, 
  getCustomerBalance
);

export default router;