import { Router } from 'express';
import { body, param, query } from 'express-validator';
import {
  upload,
  uploadTaxDocuments,
  processTaxForms,
  validateTaxForms,
  getTaxForms,
  getTaxForm,
  updateTaxForm,
  deleteTaxForm
} from '@/controllers/taxAgent.controller';
import { authenticate } from '@/middleware/auth';

const router = Router();

// Validation rules
const uploadValidation: any[] = [
  // No specific validation needed for file uploads - handled by multer
];

const processFormsValidation = [
  body('formPaths').isArray({ min: 1 }).withMessage('At least one tax form path required'),
  body('instructionPaths').optional().isArray()
];

const validateFormsValidation = [
  body('formIds').isArray({ min: 1 }).withMessage('At least one form ID required'),
  body('formIds.*').isUUID().withMessage('Invalid form ID format')
];

const getFormsValidation = [
  query('status').optional().isIn(['draft', 'filled', 'reviewed', 'completed', 'validated', 'needs_review', 'all']),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 })
];

const formParamValidation = [
  param('formId').isUUID().withMessage('Invalid form ID')
];

const updateFormValidation = [
  ...formParamValidation,
  body('status').optional().isIn(['draft', 'filled', 'reviewed', 'completed']),
  body('form_data').optional().isObject(),
  body('confidence_score').optional().isFloat({ min: 0, max: 1 })
];

// Routes

// File Upload
router.post('/upload',
  authenticate,
  upload.fields([
    { name: 'taxForms', maxCount: 10 },
    { name: 'instructions', maxCount: 10 }
  ]),
  uploadValidation,
  uploadTaxDocuments
);

// Tax Form Processing
router.post('/process',
  authenticate,
  processFormsValidation,
  processTaxForms
);

// Form Validation
router.post('/validate',
  authenticate,
  validateFormsValidation,
  validateTaxForms
);

// Get Tax Forms
router.get('/forms',
  authenticate,
  getFormsValidation,
  getTaxForms
);

// Get Single Tax Form
router.get('/forms/:formId',
  authenticate,
  formParamValidation,
  getTaxForm
);

// Update Tax Form
router.patch('/forms/:formId',
  authenticate,
  updateFormValidation,
  updateTaxForm
);

// Delete Tax Form
router.delete('/forms/:formId',
  authenticate,
  formParamValidation,
  deleteTaxForm
);

export default router;