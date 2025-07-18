import OpenAI from 'openai';
import db from '@/config/database';
import logger from '@/utils/logger';
const pdfExtract = require('pdf-extract');
import fs from 'fs';
import path from 'path';

export interface TaxFormData {
  formType: string;
  formName: string;
  fields: Record<string, any>;
  calculations: Record<string, number>;
  requiredInformation: string[];
  status: 'draft' | 'filled' | 'reviewed' | 'completed';
  confidence: number;
}

export interface TaxProcessingResult {
  success: boolean;
  forms: TaxFormData[];
  missingInformation: string[];
  recommendations: string[];
  error?: string;
}

export class TaxAgentService {
  private openai: OpenAI;
  private model: string;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
    this.model = process.env.OPENAI_MODEL || 'gpt-4';
  }

  // Extract text from uploaded PDF files
  async extractPDFText(filePath: string): Promise<{ success: boolean; text?: string; error?: string }> {
    try {
      const PDFExtract = pdfExtract.PDFExtract;
      const extractor = new PDFExtract();
      
      return new Promise((resolve) => {
        extractor.extract(filePath, {}, (err: any, data: any) => {
          if (err) {
            logger.error('PDF extraction failed:', err);
            resolve({ success: false, error: 'Failed to extract PDF content' });
            return;
          }

          const text = data.pages
            .map((page: any) => page.content.map((item: any) => item.str).join(' '))
            .join('\n');

          resolve({ success: true, text });
        });
      });
    } catch (error) {
      logger.error('PDF processing error:', error);
      return { success: false, error: 'PDF processing failed' };
    }
  }

  // Analyze tax forms and instructions using AI
  async analyzeTaxForms(
    companyId: string,
    formTexts: string[],
    instructionTexts: string[]
  ): Promise<TaxProcessingResult> {
    try {
      // Get company financial data
      const companyData = await this.getCompanyFinancialData(companyId);
      
      if (!companyData.success) {
        return {
          success: false,
          forms: [],
          missingInformation: [],
          recommendations: [],
          error: companyData.error
        };
      }

      // Build AI prompt for tax form analysis
      const prompt = this.buildTaxAnalysisPrompt(
        formTexts,
        instructionTexts,
        companyData.data
      );

      // Call OpenAI API
      const response = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: "system",
            content: this.getTaxAgentSystemPrompt()
          },
          {
            role: "user", 
            content: prompt
          }
        ],
        temperature: 0.1,
        max_tokens: 4000,
        response_format: { type: "json_object" }
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        return {
          success: false,
          forms: [],
          missingInformation: [],
          recommendations: [],
          error: 'No response from AI model'
        };
      }

      const aiResponse = JSON.parse(content);
      
      return {
        success: true,
        forms: aiResponse.forms,
        missingInformation: aiResponse.missingInformation || [],
        recommendations: aiResponse.recommendations || []
      };

    } catch (error) {
      logger.error('Tax form analysis failed:', error);
      return {
        success: false,
        forms: [],
        missingInformation: [],
        recommendations: [],
        error: 'Tax analysis failed'
      };
    }
  }

  // Get company financial data for tax form completion
  private async getCompanyFinancialData(companyId: string): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      // Get company basic info
      const company = await db('companies').where('id', companyId).first();
      if (!company) {
        return { success: false, error: 'Company not found' };
      }

      // Get account balances (simplified for demo)
      const accounts = await db('accounts')
        .leftJoin('account_categories', 'accounts.account_category_id', 'account_categories.id')
        .leftJoin('account_types', 'account_categories.account_type_id', 'account_types.id')
        .where('accounts.company_id', companyId)
        .where('accounts.is_active', true)
        .select(
          'accounts.*',
          'account_types.name as account_type',
          'account_categories.name as category_name'
        );

      // Get transaction summaries (last 12 months)
      const lastYear = new Date();
      lastYear.setFullYear(lastYear.getFullYear() - 1);

      const transactions = await db('transactions')
        .join('transaction_entries', 'transactions.id', 'transaction_entries.transaction_id')
        .join('accounts', 'transaction_entries.account_id', 'accounts.id')
        .leftJoin('account_categories', 'accounts.account_category_id', 'account_categories.id')
        .leftJoin('account_types', 'account_categories.account_type_id', 'account_types.id')
        .where('transactions.company_id', companyId)
        .where('transactions.transaction_date', '>=', lastYear)
        .select(
          'account_types.name as account_type',
          'accounts.name as account_name',
          'transaction_entries.debit_amount',
          'transaction_entries.credit_amount',
          'transactions.transaction_date'
        );

      // Calculate basic financial metrics
      const revenue = transactions
        .filter(t => t.account_type === 'Revenue')
        .reduce((sum, t) => sum + (t.credit_amount || 0) - (t.debit_amount || 0), 0);

      const expenses = transactions
        .filter(t => t.account_type === 'Expense')
        .reduce((sum, t) => sum + (t.debit_amount || 0) - (t.credit_amount || 0), 0);

      const assets = transactions
        .filter(t => t.account_type === 'Asset')
        .reduce((sum, t) => sum + (t.debit_amount || 0) - (t.credit_amount || 0), 0);

      const liabilities = transactions
        .filter(t => t.account_type === 'Liability')
        .reduce((sum, t) => sum + (t.credit_amount || 0) - (t.debit_amount || 0), 0);

      return {
        success: true,
        data: {
          company: {
            name: company.name,
            ein: company.ein || 'Not provided',
            address: company.address || 'Not provided',
            businessType: company.business_type || 'Not specified',
            accountingMethod: company.accounting_method,
            taxYear: new Date().getFullYear()
          },
          financials: {
            totalRevenue: revenue,
            totalExpenses: expenses,
            netIncome: revenue - expenses,
            totalAssets: assets,
            totalLiabilities: liabilities,
            equity: assets - liabilities
          },
          accounts: accounts,
          transactionCount: transactions.length
        }
      };

    } catch (error) {
      logger.error('Failed to get company financial data:', error);
      return { success: false, error: 'Failed to retrieve company data' };
    }
  }

  // Build comprehensive prompt for tax form analysis
  private buildTaxAnalysisPrompt(
    formTexts: string[],
    instructionTexts: string[],
    companyData: any
  ): string {
    return `
You are a tax preparation AI agent. Analyze the provided tax forms and instructions, then fill out the forms using the company's financial data.

COMPANY INFORMATION:
${JSON.stringify(companyData.company, null, 2)}

FINANCIAL DATA:
${JSON.stringify(companyData.financials, null, 2)}

TAX FORMS TO PROCESS:
${formTexts.map((text, i) => `Form ${i + 1}:\n${text.substring(0, 2000)}...`).join('\n\n')}

FORM INSTRUCTIONS:
${instructionTexts.map((text, i) => `Instructions ${i + 1}:\n${text.substring(0, 2000)}...`).join('\n\n')}

TASK:
1. Identify each tax form type and its purpose
2. Extract all required fields from each form
3. Fill out forms using provided company financial data
4. Perform all necessary calculations according to tax rules
5. Identify any missing information needed to complete forms
6. Provide recommendations for tax optimization

IMPORTANT REQUIREMENTS:
- Follow IRS guidelines and tax law precisely
- Double-check all calculations
- Flag any unusual or high-risk items
- Identify missing information that must be obtained from the user
- Ensure all forms are mathematically consistent
- Do not hallucinate data - only use provided information

Return response in this JSON format:
{
  "forms": [
    {
      "formType": "1040",
      "formName": "Individual Income Tax Return",
      "fields": {
        "line1": "Company Name",
        "line2": "123456789",
        "line3": "2024"
      },
      "calculations": {
        "totalIncome": 125000,
        "adjustedGrossIncome": 120000,
        "taxableIncome": 95000,
        "taxLiability": 15000
      },
      "requiredInformation": ["W-2 forms", "1099 forms"],
      "status": "filled",
      "confidence": 0.85
    }
  ],
  "missingInformation": [
    "Quarterly estimated tax payments",
    "Employee benefit costs",
    "Equipment depreciation schedules"
  ],
  "recommendations": [
    "Consider Section 179 deduction for equipment purchases",
    "Review retirement plan contributions for tax benefits"
  ]
}
`;
  }

  // System prompt for tax agent
  private getTaxAgentSystemPrompt(): string {
    return `
You are an expert tax preparation AI agent with deep knowledge of:

1. IRS tax forms and regulations
2. Tax law and compliance requirements
3. Business accounting principles
4. Tax optimization strategies
5. Financial data analysis

CORE RESPONSIBILITIES:
- Accurately complete tax forms using provided financial data
- Perform complex tax calculations following IRS guidelines
- Identify tax optimization opportunities
- Flag potential compliance issues
- Request missing information when needed
- Provide clear explanations for all tax decisions

ACCURACY REQUIREMENTS:
- All calculations must be mathematically correct
- Follow current tax year rules and regulations
- Cross-reference form instructions carefully
- Never fabricate or estimate data not provided
- Flag uncertain calculations for human review

COMPLIANCE STANDARDS:
- Adhere to IRS publication guidelines
- Follow Generally Accepted Accounting Principles (GAAP)
- Maintain audit trail for all calculations
- Document assumptions and methodology
- Identify high-risk items requiring additional review

You must be extremely careful with tax calculations as errors can result in penalties, interest, and legal issues.
`;
  }

  // Validate and double-check completed tax forms
  async validateTaxForms(
    forms: TaxFormData[],
    companyData: any
  ): Promise<{ 
    success: boolean; 
    validationResults: Array<{
      formId: string;
      isValid: boolean;
      errors: string[];
      warnings: string[];
      confidence: number;
    }>;
    error?: string;
  }> {
    try {
      const validationResults = [];

      for (const form of forms) {
        const validation = await this.validateSingleForm(form, companyData);
        validationResults.push({
          formId: form.formType,
          isValid: validation.isValid,
          errors: validation.errors,
          warnings: validation.warnings,
          confidence: validation.confidence
        });
      }

      return {
        success: true,
        validationResults
      };

    } catch (error) {
      logger.error('Form validation failed:', error);
      return {
        success: false,
        validationResults: [],
        error: 'Form validation failed'
      };
    }
  }

  // Validate individual tax form
  private async validateSingleForm(
    form: TaxFormData,
    companyData: any
  ): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
    confidence: number;
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Basic validation checks
    if (!form.fields || Object.keys(form.fields).length === 0) {
      errors.push('Form has no filled fields');
    }

    if (!form.calculations || Object.keys(form.calculations).length === 0) {
      errors.push('Form has no calculations');
    }

    // Cross-check calculations with financial data
    const totalRevenue = companyData.financials.totalRevenue;
    const totalExpenses = companyData.financials.totalExpenses;
    const netIncome = companyData.financials.netIncome;

    // Example validation for income consistency
    if (form.calculations.totalIncome) {
      const formIncome = form.calculations.totalIncome;
      const difference = Math.abs(formIncome - totalRevenue);
      
      if (difference > totalRevenue * 0.1) { // 10% tolerance
        warnings.push(`Form income (${formIncome}) differs significantly from book income (${totalRevenue})`);
      }
    }

    // Check for required fields
    if (form.requiredInformation && form.requiredInformation.length > 0) {
      warnings.push(`Missing required information: ${form.requiredInformation.join(', ')}`);
    }

    // Calculate confidence based on completeness and accuracy
    let confidence = form.confidence || 0.5;
    
    if (errors.length > 0) {
      confidence = Math.max(0.1, confidence - (errors.length * 0.2));
    }
    
    if (warnings.length > 0) {
      confidence = Math.max(0.3, confidence - (warnings.length * 0.1));
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      confidence
    };
  }

  // Save processed tax forms to database
  async saveTaxForms(
    companyId: string,
    userId: string,
    forms: TaxFormData[],
    metadata: any
  ): Promise<{ success: boolean; formIds?: string[]; error?: string }> {
    try {
      const formIds: string[] = [];

      for (const form of forms) {
        const [savedForm] = await db('tax_forms').insert({
          company_id: companyId,
          user_id: userId,
          form_type: form.formType,
          form_name: form.formName,
          form_data: {
            fields: form.fields,
            calculations: form.calculations,
            requiredInformation: form.requiredInformation
          },
          status: form.status,
          confidence_score: form.confidence,
          ai_metadata: {
            model_used: this.model,
            processing_date: new Date(),
            validation_status: 'pending',
            ...metadata
          }
        }).returning('id');

        formIds.push(savedForm.id);
      }

      return { success: true, formIds };

    } catch (error) {
      logger.error('Failed to save tax forms:', error);
      return { success: false, error: 'Failed to save tax forms' };
    }
  }
}

export default TaxAgentService;