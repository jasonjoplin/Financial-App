import OpenAI from 'openai';
import db from '@/config/database';
import logger from '@/utils/logger';
import ChartOfAccountsService from '@/services/chartOfAccounts.service';
import AccountingService, { JournalEntry } from '@/services/accounting.service';

export interface TransactionAnalysis {
  description: string;
  amount: number;
  date: Date;
  reference?: string;
  attachment_data?: string; // OCR text from receipts/invoices
  context?: any; // Additional business context
}

export interface AISuggestion {
  title: string;
  description: string;
  reasoning: string;
  confidence_score: number;
  suggested_entries: JournalEntry[];
  metadata: {
    analysis_method: string;
    processing_time_ms: number;
    model_used: string;
    rules_applied: string[];
  };
}

export class AIAgentService {
  private openai: OpenAI;
  private model: string;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
    this.model = process.env.OPENAI_MODEL || 'gpt-4';
  }

  // Analyze a transaction and suggest journal entries
  async analyzeTransaction(
    companyId: string, 
    analysis: TransactionAnalysis
  ): Promise<{ success: boolean; suggestion?: AISuggestion; error?: string }> {
    try {
      const startTime = Date.now();
      
      // Get company's chart of accounts for context
      const accounts = await this.getCompanyAccounts(companyId);
      const systemAccounts = await ChartOfAccountsService.getSystemAccounts(companyId);
      
      // Get company context
      const company = await db('companies').where('id', companyId).first();
      
      if (!company) {
        return { success: false, error: 'Company not found' };
      }
      
      // Build the AI prompt
      const prompt = this.buildAnalysisPrompt(analysis, accounts, company);
      
      // Call OpenAI API
      const response = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: "system",
            content: this.getSystemPrompt()
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.1, // Low temperature for consistent accounting decisions
        max_tokens: 2000,
        response_format: { type: "json_object" }
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        return { success: false, error: 'No response from AI model' };
      }

      // Parse AI response
      const aiResponse = JSON.parse(content);
      
      // Validate the suggested entries
      const validation = AccountingService.validateJournalEntry(aiResponse.suggested_entries);
      if (!validation.isValid) {
        logger.warn('AI suggested invalid journal entries:', validation.errors);
        // Try to fix common issues or ask for re-analysis
        return { success: false, error: 'AI suggested invalid entries: ' + validation.errors.join(', ') };
      }
      
      const processingTime = Date.now() - startTime;
      
      const suggestion: AISuggestion = {
        title: aiResponse.title,
        description: aiResponse.description,
        reasoning: aiResponse.reasoning,
        confidence_score: aiResponse.confidence_score,
        suggested_entries: aiResponse.suggested_entries,
        metadata: {
          analysis_method: 'openai_gpt',
          processing_time_ms: processingTime,
          model_used: this.model,
          rules_applied: aiResponse.rules_applied || []
        }
      };
      
      return { success: true, suggestion };
      
    } catch (error) {
      logger.error('AI analysis failed:', error);
      return { success: false, error: 'AI analysis failed' };
    }
  }
  
  // Save AI suggestion to database
  async saveSuggestion(
    companyId: string,
    agentId: string,
    suggestion: AISuggestion,
    originalData: TransactionAnalysis
  ): Promise<{ success: boolean; suggestionId?: string; error?: string }> {
    try {
      const [savedSuggestion] = await db('ai_suggestions').insert({
        ai_agent_id: agentId,
        company_id: companyId,
        type: 'transaction',
        title: suggestion.title,
        description: suggestion.description,
        reasoning: suggestion.reasoning,
        original_data: originalData,
        suggested_action: {
          entries: suggestion.suggested_entries,
          transaction_type: 'journal_entry'
        },
        confidence_score: suggestion.confidence_score,
        status: 'pending',
        metadata: suggestion.metadata
      }).returning('*');
      
      // Update agent statistics
      await this.updateAgentStats(agentId, 'suggestion_made');
      
      return { success: true, suggestionId: savedSuggestion.id };
    } catch (error) {
      logger.error('Failed to save AI suggestion:', error);
      return { success: false, error: 'Failed to save suggestion' };
    }
  }
  
  // Process and create transaction from approved AI suggestion
  async implementSuggestion(suggestionId: string, userId: string): Promise<{ success: boolean; transactionId?: string; error?: string }> {
    try {
      const suggestion = await db('ai_suggestions')
        .where('id', suggestionId)
        .first();
      
      if (!suggestion) {
        return { success: false, error: 'Suggestion not found' };
      }
      
      if (suggestion.status !== 'approved') {
        return { success: false, error: 'Suggestion not approved' };
      }
      
      // Create transaction from suggestion
      const transactionData = {
        company_id: suggestion.company_id,
        transaction_date: new Date(),
        description: suggestion.title,
        memo: suggestion.reasoning,
        type: 'journal_entry' as const,
        entries: suggestion.suggested_action.entries,
        created_by: userId,
        is_ai_generated: true,
        ai_metadata: {
          suggestion_id: suggestionId,
          confidence_score: suggestion.confidence_score,
          ai_agent_id: suggestion.ai_agent_id
        }
      };
      
      const result = await AccountingService.createTransaction(transactionData);
      
      if (result.success) {
        // Update suggestion status
        await db('ai_suggestions')
          .where('id', suggestionId)
          .update({
            status: 'implemented',
            implemented_transaction_id: result.transaction?.transaction.id,
            implemented_at: new Date()
          });
        
        // Update agent statistics
        await this.updateAgentStats(suggestion.ai_agent_id, 'suggestion_accepted');
        
        return { success: true, transactionId: result.transaction?.transaction.id };
      } else {
        return { success: false, error: result.errors?.join(', ') };
      }
      
    } catch (error) {
      logger.error('Failed to implement AI suggestion:', error);
      return { success: false, error: 'Failed to implement suggestion' };
    }
  }
  
  // Get company's chart of accounts for AI context
  private async getCompanyAccounts(companyId: string): Promise<any[]> {
    return await db('accounts')
      .join('account_categories', 'accounts.account_category_id', 'account_categories.id')
      .join('account_types', 'account_categories.account_type_id', 'account_types.id')
      .where('accounts.company_id', companyId)
      .where('accounts.is_active', true)
      .select(
        'accounts.id',
        'accounts.code',
        'accounts.name',
        'accounts.description',
        'account_types.name as type_name',
        'account_categories.name as category_name',
        'accounts.normal_balance'
      )
      .orderBy('accounts.code');
  }
  
  // Build the analysis prompt for OpenAI
  private buildAnalysisPrompt(
    analysis: TransactionAnalysis,
    accounts: any[],
    company: any
  ): string {
    const accountList = accounts.map(acc => 
      `${acc.code} - ${acc.name} (${acc.type_name}/${acc.category_name}) [${acc.normal_balance}]`
    ).join('\n');
    
    return `
Analyze this business transaction and suggest appropriate journal entries following GAAP principles:

COMPANY CONTEXT:
- Business: ${company.name}
- Industry: ${company.industry || 'Not specified'}
- Accounting Method: ${company.accounting_method}
- Business Type: ${company.business_type || 'Not specified'}

TRANSACTION TO ANALYZE:
- Description: ${analysis.description}
- Amount: $${analysis.amount}
- Date: ${analysis.date.toDateString()}
- Reference: ${analysis.reference || 'None'}
${analysis.attachment_data ? `- OCR Data: ${analysis.attachment_data}` : ''}

AVAILABLE ACCOUNTS:
${accountList}

INSTRUCTIONS:
1. Analyze the transaction description and context
2. Determine the appropriate accounts to debit and credit
3. Ensure debits equal credits (fundamental accounting equation)
4. Follow GAAP accrual accounting principles
5. Consider the business context and industry
6. Provide clear reasoning for your account selections

Response must be valid JSON with this structure:
{
  "title": "Brief description of the journal entry",
  "description": "Detailed explanation of the transaction",
  "reasoning": "Why these accounts were chosen and the accounting logic",
  "confidence_score": 0.95,
  "suggested_entries": [
    {
      "account_id": "account-uuid-here",
      "debit_amount": 100.00,
      "credit_amount": 0,
      "description": "What this entry represents"
    },
    {
      "account_id": "account-uuid-here", 
      "debit_amount": 0,
      "credit_amount": 100.00,
      "description": "What this entry represents"
    }
  ],
  "rules_applied": ["rule1", "rule2"]
}
`;
  }
  
  // System prompt for the AI agent
  private getSystemPrompt(): string {
    return `
You are an expert accounting AI agent specialized in GAAP-compliant bookkeeping and financial analysis. Your role is to:

1. Analyze business transactions and suggest appropriate journal entries
2. Ensure all suggestions follow Generally Accepted Accounting Principles (GAAP)
3. Maintain the fundamental accounting equation: Assets = Liabilities + Equity
4. Apply accrual accounting principles correctly
5. Consider business context and industry-specific accounting practices

CORE PRINCIPLES:
- Every transaction must have equal debits and credits
- Respect normal account balances (Asset/Expense = Debit, Liability/Equity/Revenue = Credit)
- Use accrual method: recognize revenue when earned, expenses when incurred
- Be conservative in estimates and assumptions
- Provide clear, educational reasoning for all suggestions

CONFIDENCE SCORING:
- 0.95+: Very confident, clear transaction type with obvious account classification
- 0.85-0.94: Confident, standard transaction with minor ambiguity
- 0.70-0.84: Moderately confident, some assumptions required
- 0.50-0.69: Low confidence, unusual transaction or insufficient information
- <0.50: Very uncertain, recommend human review

Always explain your reasoning clearly and cite relevant accounting principles.
`;
  }
  
  // Update agent performance statistics
  private async updateAgentStats(agentId: string, statType: 'suggestion_made' | 'suggestion_accepted' | 'suggestion_rejected'): Promise<void> {
    try {
      const agent = await db('ai_agents').where('id', agentId).first();
      if (!agent) return;
      
      const updates: any = {
        last_activity_at: new Date()
      };
      
      switch (statType) {
        case 'suggestion_made':
          updates.suggestions_made = agent.suggestions_made + 1;
          break;
        case 'suggestion_accepted':
          updates.suggestions_accepted = agent.suggestions_accepted + 1;
          break;
        case 'suggestion_rejected':
          updates.suggestions_rejected = agent.suggestions_rejected + 1;
          break;
      }
      
      // Calculate accuracy rate
      const totalReviewed = updates.suggestions_accepted + updates.suggestions_rejected;
      if (totalReviewed > 0) {
        updates.accuracy_rate = (updates.suggestions_accepted / totalReviewed) * 100;
      }
      
      await db('ai_agents')
        .where('id', agentId)
        .update(updates);
        
    } catch (error) {
      logger.error('Failed to update agent stats:', error);
    }
  }
  
  // Create or get the accounting agent for a company
  async getOrCreateAccountingAgent(companyId: string): Promise<{ success: boolean; agent?: any; error?: string }> {
    try {
      // Check if accounting agent already exists
      let agent = await db('ai_agents')
        .where({
          company_id: companyId,
          type: 'accounting',
          is_active: true
        })
        .first();
      
      if (!agent) {
        // Create new accounting agent
        [agent] = await db('ai_agents').insert({
          company_id: companyId,
          name: 'Accounting Agent',
          type: 'accounting',
          description: 'AI agent for automated journal entry suggestions and transaction analysis',
          configuration: {
            model: this.model,
            temperature: 0.1,
            max_tokens: 2000
          },
          rules: {
            gaap_compliance: true,
            require_balanced_entries: true,
            minimum_confidence: 0.7,
            auto_approve_threshold: 0.95
          },
          confidence_threshold: 0.70,
          auto_approve: false // Start with manual approval
        }).returning('*');
      }
      
      return { success: true, agent };
    } catch (error) {
      logger.error('Failed to get/create accounting agent:', error);
      return { success: false, error: 'Failed to initialize accounting agent' };
    }
  }
}

export default AIAgentService;