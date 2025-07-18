import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { AuthRequest } from '@/types';
import TaxAgentService from '@/services/taxAgent.service';
import db from '@/config/database';
import logger from '@/utils/logger';

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads', 'tax-forms');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req: any, file: any, cb: any) => {
  if (file.mimetype === 'application/pdf') {
    cb(null, true);
  } else {
    cb(new Error('Only PDF files are allowed'), false);
  }
};

export const upload = multer({ 
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

export const uploadTaxDocuments = async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    const companyId = req.company?.id;

    if (!companyId) {
      return res.status(400).json({ error: 'Company ID required' });
    }

    if (!files || (!files.taxForms && !files.instructions)) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const uploadedFiles = {
      taxForms: files.taxForms || [],
      instructions: files.instructions || []
    };

    // Log uploaded files
    logger.info('Tax documents uploaded:', {
      companyId,
      taxForms: uploadedFiles.taxForms.length,
      instructions: uploadedFiles.instructions.length
    });

    res.json({
      message: 'Tax documents uploaded successfully',
      files: {
        taxForms: uploadedFiles.taxForms.map(f => ({
          filename: f.filename,
          originalName: f.originalname,
          size: f.size,
          path: f.path
        })),
        instructions: uploadedFiles.instructions.map(f => ({
          filename: f.filename,
          originalName: f.originalname,
          size: f.size,
          path: f.path
        }))
      }
    });

  } catch (error) {
    logger.error('File upload error:', error);
    res.status(500).json({ error: 'File upload failed' });
  }
};

export const processTaxForms = async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { formPaths, instructionPaths } = req.body;
    const companyId = req.company?.id;
    const userId = req.user?.id;

    if (!companyId || !userId) {
      return res.status(400).json({ error: 'User and company ID required' });
    }

    if (!formPaths || !Array.isArray(formPaths) || formPaths.length === 0) {
      return res.status(400).json({ error: 'Tax form paths required' });
    }

    const taxService = new TaxAgentService();

    // Extract text from uploaded PDFs
    const formTexts: string[] = [];
    const instructionTexts: string[] = [];

    // Process tax forms
    for (const formPath of formPaths) {
      const result = await taxService.extractPDFText(formPath);
      if (result.success && result.text) {
        formTexts.push(result.text);
      } else {
        logger.warn(`Failed to extract text from form: ${formPath}`);
      }
    }

    // Process instruction documents
    if (instructionPaths && Array.isArray(instructionPaths)) {
      for (const instructionPath of instructionPaths) {
        const result = await taxService.extractPDFText(instructionPath);
        if (result.success && result.text) {
          instructionTexts.push(result.text);
        } else {
          logger.warn(`Failed to extract text from instructions: ${instructionPath}`);
        }
      }
    }

    if (formTexts.length === 0) {
      return res.status(400).json({ error: 'No readable tax forms found' });
    }

    // Analyze and fill tax forms
    const analysisResult = await taxService.analyzeTaxForms(
      companyId,
      formTexts,
      instructionTexts
    );

    if (!analysisResult.success) {
      return res.status(400).json({ error: analysisResult.error });
    }

    // Save processed forms to database
    const saveResult = await taxService.saveTaxForms(
      companyId,
      userId,
      analysisResult.forms,
      {
        originalFormPaths: formPaths,
        originalInstructionPaths: instructionPaths || [],
        processingTimestamp: new Date()
      }
    );

    if (!saveResult.success) {
      return res.status(500).json({ error: saveResult.error });
    }

    res.json({
      message: 'Tax forms processed successfully',
      formIds: saveResult.formIds,
      forms: analysisResult.forms,
      missingInformation: analysisResult.missingInformation,
      recommendations: analysisResult.recommendations
    });

  } catch (error) {
    logger.error('Tax form processing error:', error);
    res.status(500).json({ error: 'Tax form processing failed' });
  }
};

export const validateTaxForms = async (req: AuthRequest, res: Response) => {
  try {
    const { formIds } = req.body;
    const companyId = req.company?.id;

    if (!companyId) {
      return res.status(400).json({ error: 'Company ID required' });
    }

    if (!formIds || !Array.isArray(formIds) || formIds.length === 0) {
      return res.status(400).json({ error: 'Form IDs required' });
    }

    // Get forms from database
    const forms = await db('tax_forms')
      .where('company_id', companyId)
      .whereIn('id', formIds)
      .select('*');

    if (forms.length === 0) {
      return res.status(404).json({ error: 'No forms found' });
    }

    const taxService = new TaxAgentService();

    // Get company data for validation
    const companyData = await taxService['getCompanyFinancialData'](companyId);
    if (!companyData.success) {
      return res.status(500).json({ error: companyData.error });
    }

    // Convert database forms to TaxFormData format
    const taxForms = forms.map(form => ({
      formType: form.form_type,
      formName: form.form_name,
      fields: form.form_data.fields,
      calculations: form.form_data.calculations,
      requiredInformation: form.form_data.requiredInformation || [],
      status: form.status,
      confidence: form.confidence_score
    }));

    // Validate forms
    const validationResult = await taxService.validateTaxForms(taxForms, companyData.data);

    if (!validationResult.success) {
      return res.status(500).json({ error: validationResult.error });
    }

    // Update validation status in database
    for (let i = 0; i < forms.length; i++) {
      const form = forms[i];
      const validation = validationResult.validationResults[i];
      
      await db('tax_forms')
        .where('id', form.id)
        .update({
          validation_results: validation,
          validation_date: new Date(),
          status: validation.isValid ? 'validated' : 'needs_review'
        });
    }

    res.json({
      message: 'Tax forms validated successfully',
      validationResults: validationResult.validationResults,
      overallValid: validationResult.validationResults.every(r => r.isValid)
    });

  } catch (error) {
    logger.error('Tax form validation error:', error);
    res.status(500).json({ error: 'Tax form validation failed' });
  }
};

export const getTaxForms = async (req: AuthRequest, res: Response) => {
  try {
    const companyId = req.company?.id;
    const { status, page = 1, limit = 20 } = req.query;

    if (!companyId) {
      return res.status(400).json({ error: 'Company ID required' });
    }

    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);

    let query = db('tax_forms')
      .where('company_id', companyId)
      .orderBy('created_at', 'desc')
      .limit(parseInt(limit as string))
      .offset(offset);

    if (status && status !== 'all') {
      query = query.where('status', status);
    }

    const forms = await query;

    // Get total count
    let countQuery = db('tax_forms')
      .where('company_id', companyId)
      .count('* as total');

    if (status && status !== 'all') {
      countQuery = countQuery.where('status', status);
    }

    const [{ total }] = await countQuery;

    res.json({
      forms,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total: parseInt(total as string),
        pages: Math.ceil(parseInt(total as string) / parseInt(limit as string))
      }
    });

  } catch (error) {
    logger.error('Error fetching tax forms:', error);
    res.status(500).json({ error: 'Failed to fetch tax forms' });
  }
};

export const getTaxForm = async (req: AuthRequest, res: Response) => {
  try {
    const { formId } = req.params;
    const companyId = req.company?.id;

    if (!companyId) {
      return res.status(400).json({ error: 'Company ID required' });
    }

    const form = await db('tax_forms')
      .where('id', formId)
      .where('company_id', companyId)
      .first();

    if (!form) {
      return res.status(404).json({ error: 'Tax form not found' });
    }

    res.json({ form });

  } catch (error) {
    logger.error('Error fetching tax form:', error);
    res.status(500).json({ error: 'Failed to fetch tax form' });
  }
};

export const updateTaxForm = async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { formId } = req.params;
    const companyId = req.company?.id;
    const updates = req.body;

    if (!companyId) {
      return res.status(400).json({ error: 'Company ID required' });
    }

    const form = await db('tax_forms')
      .where('id', formId)
      .where('company_id', companyId)
      .first();

    if (!form) {
      return res.status(404).json({ error: 'Tax form not found' });
    }

    const [updatedForm] = await db('tax_forms')
      .where('id', formId)
      .update({
        ...updates,
        updated_at: new Date()
      })
      .returning('*');

    res.json({
      message: 'Tax form updated successfully',
      form: updatedForm
    });

  } catch (error) {
    logger.error('Error updating tax form:', error);
    res.status(500).json({ error: 'Failed to update tax form' });
  }
};

export const deleteTaxForm = async (req: AuthRequest, res: Response) => {
  try {
    const { formId } = req.params;
    const companyId = req.company?.id;

    if (!companyId) {
      return res.status(400).json({ error: 'Company ID required' });
    }

    const form = await db('tax_forms')
      .where('id', formId)
      .where('company_id', companyId)
      .first();

    if (!form) {
      return res.status(404).json({ error: 'Tax form not found' });
    }

    await db('tax_forms')
      .where('id', formId)
      .del();

    res.json({ message: 'Tax form deleted successfully' });

  } catch (error) {
    logger.error('Error deleting tax form:', error);
    res.status(500).json({ error: 'Failed to delete tax form' });
  }
};