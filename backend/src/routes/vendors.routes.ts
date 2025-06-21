import { Router } from 'express';
import { body, param, query } from 'express-validator';
import {
  getVendors,
  getVendor,
  createVendor,
  updateVendor,
  deactivateVendor,
  getVendorBills,
  getVendorBalance,
  get1099Report
} from '@/controllers/vendors.controller';
import { authenticate, requireCompany } from '@/middleware/auth';

const router = Router();

// Validation rules
const getVendorsValidation = [
  param('companyId').isUUID(),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('search').optional().trim(),
  query('is_active').optional().isIn(['true', 'false', 'all']),
  query('is_1099_vendor').optional().isIn(['true', 'false'])
];

const getVendorValidation = [
  param('companyId').isUUID(),
  param('vendorId').isUUID()
];

const createVendorValidation = [
  param('companyId').isUUID(),
  body('name').notEmpty().trim(),
  body('company_name').optional().trim(),
  body('email').optional().isEmail().normalizeEmail(),
  body('phone').optional().trim(),
  body('address').optional().trim(),
  body('city').optional().trim(),
  body('state').optional().trim(),
  body('zip').optional().trim(),
  body('country').optional().trim(),
  body('tax_id').optional().trim(),
  body('payment_terms').optional().isIn(['net_15', 'net_30', 'net_60', 'due_on_receipt', 'cash_on_delivery']),
  body('payment_method').optional().trim(),
  body('is_1099_vendor').optional().isBoolean(),
  body('custom_fields').optional().isObject()
];

const updateVendorValidation = [
  param('companyId').isUUID(),
  param('vendorId').isUUID(),
  body('name').optional().notEmpty().trim(),
  body('company_name').optional().trim(),
  body('email').optional().isEmail().normalizeEmail(),
  body('phone').optional().trim(),
  body('address').optional().trim(),
  body('city').optional().trim(),
  body('state').optional().trim(),
  body('zip').optional().trim(),
  body('country').optional().trim(),
  body('tax_id').optional().trim(),
  body('payment_terms').optional().isIn(['net_15', 'net_30', 'net_60', 'due_on_receipt', 'cash_on_delivery']),
  body('payment_method').optional().trim(),
  body('is_1099_vendor').optional().isBoolean(),
  body('custom_fields').optional().isObject(),
  body('is_active').optional().isBoolean()
];

const getVendorBillsValidation = [
  param('companyId').isUUID(),
  param('vendorId').isUUID(),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('status').optional().isIn(['draft', 'pending', 'approved', 'overdue', 'paid', 'void'])
];

const get1099ReportValidation = [
  param('companyId').isUUID(),
  query('year').optional().isInt({ min: 2000, max: new Date().getFullYear() + 1 })
];

// Routes
router.get('/:companyId/vendors', 
  authenticate, 
  requireCompany, 
  getVendorsValidation, 
  getVendors
);

router.get('/:companyId/vendors/:vendorId', 
  authenticate, 
  requireCompany, 
  getVendorValidation, 
  getVendor
);

router.post('/:companyId/vendors', 
  authenticate, 
  requireCompany, 
  createVendorValidation, 
  createVendor
);

router.put('/:companyId/vendors/:vendorId', 
  authenticate, 
  requireCompany, 
  updateVendorValidation, 
  updateVendor
);

router.delete('/:companyId/vendors/:vendorId', 
  authenticate, 
  requireCompany, 
  getVendorValidation, 
  deactivateVendor
);

router.get('/:companyId/vendors/:vendorId/bills', 
  authenticate, 
  requireCompany, 
  getVendorBillsValidation, 
  getVendorBills
);

router.get('/:companyId/vendors/:vendorId/balance', 
  authenticate, 
  requireCompany, 
  getVendorValidation, 
  getVendorBalance
);

router.get('/:companyId/vendors/reports/1099', 
  authenticate, 
  requireCompany, 
  get1099ReportValidation, 
  get1099Report
);

export default router;