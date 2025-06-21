import { Router } from 'express';
import { body, param } from 'express-validator';
import {
  uploadAndAnalyze,
  extractText,
  analyzeExtractedData
} from '@/controllers/documents.controller';
import { authenticate, requireCompany } from '@/middleware/auth';

const router = Router();

// Validation rules
const uploadAndAnalyzeValidation = [
  param('companyId').isUUID(),
  body('image_base64').notEmpty(),
  body('document_type').optional().isIn(['receipt', 'invoice', 'bill']),
  body('auto_analyze').optional().isBoolean()
];

const extractTextValidation = [
  body('text').notEmpty().trim()
];

const analyzeExtractedDataValidation = [
  param('companyId').isUUID(),
  body('extracted_data').isObject(),
  body('extracted_data.amount').notEmpty(),
  body('extracted_data.vendor').notEmpty().trim()
];

// Routes
router.post('/:companyId/upload-analyze', 
  authenticate, 
  requireCompany, 
  uploadAndAnalyzeValidation, 
  uploadAndAnalyze
);

router.post('/extract-text', 
  authenticate, 
  extractTextValidation, 
  extractText
);

router.post('/:companyId/analyze-data', 
  authenticate, 
  requireCompany, 
  analyzeExtractedDataValidation, 
  analyzeExtractedData
);

export default router;