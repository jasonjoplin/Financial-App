/**
 * AI Accounting Agent Service
 * Provides an intelligent assistant that can interact with all app features
 */

const axios = require('axios');
const winston = require('winston');
const { AIProviderService } = require('./aiProviders.service.js');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [new winston.transports.Console()]
});

class AIAgentService {
  constructor(db) {
    this.db = db;
    this.aiProviderService = new AIProviderService();
    
    // Define available tools the agent can use
    this.tools = {
      // Chart of Accounts tools
      getChartOfAccounts: this.getChartOfAccounts.bind(this),
      createAccount: this.createAccount.bind(this),
      updateAccount: this.updateAccount.bind(this),
      
      // Transaction tools
      createJournalEntry: this.createJournalEntry.bind(this),
      getTransactions: this.getTransactions.bind(this),
      analyzeTransaction: this.analyzeTransaction.bind(this),
      
      // Contact Management tools
      getContacts: this.getContacts.bind(this),
      createContact: this.createContact.bind(this),
      updateContact: this.updateContact.bind(this),
      
      // Invoice/Bill tools
      getInvoices: this.getInvoices.bind(this),
      createInvoice: this.createInvoice.bind(this),
      updateInvoiceStatus: this.updateInvoiceStatus.bind(this),
      
      // Payment tools
      getPayments: this.getPayments.bind(this),
      createPayment: this.createPayment.bind(this),
      reconcilePayment: this.reconcilePayment.bind(this),
      
      // Financial Reports tools
      generateProfitLoss: this.generateProfitLoss.bind(this),
      generateBalanceSheet: this.generateBalanceSheet.bind(this),
      generateTrialBalance: this.generateTrialBalance.bind(this),
      
      // OCR tools
      processOCRDocument: this.processOCRDocument.bind(this),
      
      // Search tools
      searchRecords: this.searchRecords.bind(this)
    };
  }

  /**
   * Main chat interface for the AI agent
   */
  async chat(message, userId, conversationHistory = []) {
    try {
      // Build the agent prompt with available tools
      const systemPrompt = this.buildAgentSystemPrompt();
      
      // Create conversation context
      const messages = [
        { role: 'system', content: systemPrompt },
        ...conversationHistory,
        { role: 'user', content: message }
      ];

      // Get AI response with tool capabilities
      const agentPrompt = `${systemPrompt}\n\nUser Message: ${message}\n\nRespond in JSON format with message, actions, and suggestions.`;
      
      const response = await this.aiProviderService.analyzeTransaction({
        description: agentPrompt,
        amount: 0,
        date: new Date().toISOString().split('T')[0],
        company: 'Financial AI Demo Company'
      }, 'ollama', 'deepseek-r1:14b');

      // Parse the response to see if tool usage is requested
      const agentResponse = await this.processAgentResponse(response.analysis, userId);
      
      logger.info(`AI Agent processed request: ${message.substring(0, 50)}...`);
      
      return {
        message: agentResponse.message,
        actions: agentResponse.actions,
        suggestions: agentResponse.suggestions,
        processingTime: response.processingTime,
        provider: response.provider,
        model: response.model
      };

    } catch (error) {
      logger.error('AI Agent chat error:', error);
      return {
        message: "I apologize, but I'm experiencing some technical difficulties. Please try again or contact support if the issue persists.",
        actions: [],
        suggestions: [],
        error: error.message
      };
    }
  }

  /**
   * Build the system prompt for the AI agent
   */
  buildAgentSystemPrompt() {
    return `You are an expert AI Accounting Assistant for a comprehensive financial management system. You have access to all application features and can perform actions on behalf of users.

AVAILABLE TOOLS:
1. Chart of Accounts: getChartOfAccounts, createAccount, updateAccount
2. Transactions: createJournalEntry, getTransactions, analyzeTransaction
3. Contacts: getContacts, createContact, updateContact
4. Invoices/Bills: getInvoices, createInvoice, updateInvoiceStatus
5. Payments: getPayments, createPayment, reconcilePayment
6. Reports: generateProfitLoss, generateBalanceSheet, generateTrialBalance
7. OCR: processOCRDocument
8. Search: searchRecords

CAPABILITIES:
- Create and manage journal entries with GAAP compliance
- Set up and maintain chart of accounts
- Process invoices, bills, and payments
- Generate financial reports
- Manage customer and vendor relationships
- Process documents with OCR
- Search and analyze financial data
- Provide accounting guidance and best practices

RESPONSE FORMAT:
Always respond in JSON format:
{
  "message": "Your conversational response to the user",
  "actions": [
    {
      "tool": "toolName",
      "parameters": {...},
      "description": "What this action does"
    }
  ],
  "suggestions": [
    "Additional actions the user might want to take"
  ]
}

IMPORTANT GUIDELINES:
- Always explain what you're doing and why
- Follow GAAP accounting principles
- Validate all financial data before processing
- Provide helpful suggestions for next steps
- Ask for clarification when needed
- Be proactive in identifying potential issues or improvements
- Maintain data integrity and accuracy`;
  }

  /**
   * Process the AI agent response and execute any requested tools
   */
  async processAgentResponse(analysisResponse, userId) {
    try {
      // Try to parse JSON response
      let agentResponse;
      try {
        const jsonMatch = analysisResponse.reasoning || analysisResponse.description || JSON.stringify(analysisResponse);
        agentResponse = JSON.parse(jsonMatch);
      } catch {
        // Fallback to structured response
        agentResponse = {
          message: analysisResponse.reasoning || "I understand your request. Let me help you with that.",
          actions: [],
          suggestions: [
            "Would you like me to analyze a specific transaction?",
            "I can help you create journal entries or manage your chart of accounts",
            "I can also generate financial reports or process invoices"
          ]
        };
      }

      // Execute any requested actions
      if (agentResponse.actions && Array.isArray(agentResponse.actions)) {
        for (const action of agentResponse.actions) {
          try {
            if (this.tools[action.tool]) {
              const result = await this.tools[action.tool](action.parameters, userId);
              action.result = result;
              action.status = 'completed';
            } else {
              action.status = 'error';
              action.error = `Tool '${action.tool}' not available`;
            }
          } catch (error) {
            action.status = 'error';
            action.error = error.message;
          }
        }
      }

      return agentResponse;
    } catch (error) {
      logger.error('Error processing agent response:', error);
      return {
        message: "I understand your request, but I need more specific information to help you effectively. Could you please provide more details about what you'd like me to do?",
        actions: [],
        suggestions: [
          "Try asking me to create a journal entry",
          "Ask me to generate a financial report", 
          "Request help with invoice processing",
          "Ask about your chart of accounts"
        ]
      };
    }
  }

  // Tool implementations
  async getChartOfAccounts(params, userId) {
    // Mock implementation - replace with actual database queries
    return {
      success: true,
      data: [
        { code: '1001', name: 'Cash', type: 'Asset', balance: 25000 },
        { code: '1100', name: 'Accounts Receivable', type: 'Asset', balance: 15000 },
        { code: '2000', name: 'Accounts Payable', type: 'Liability', balance: 8000 }
      ]
    };
  }

  async createAccount(params, userId) {
    const { code, name, type, description } = params;
    return {
      success: true,
      message: `Created account ${code} - ${name} (${type})`,
      data: { code, name, type, description, balance: 0 }
    };
  }

  async updateAccount(params, userId) {
    const { code, updates } = params;
    return {
      success: true,
      message: `Updated account ${code}`,
      data: updates
    };
  }

  async createJournalEntry(params, userId) {
    const { description, entries, date } = params;
    
    // Validate double-entry bookkeeping
    const totalDebits = entries.reduce((sum, entry) => sum + (entry.debit || 0), 0);
    const totalCredits = entries.reduce((sum, entry) => sum + (entry.credit || 0), 0);
    
    if (Math.abs(totalDebits - totalCredits) > 0.01) {
      throw new Error('Journal entry is not balanced. Debits must equal credits.');
    }

    return {
      success: true,
      message: `Created journal entry: ${description}`,
      data: {
        id: Date.now(),
        description,
        entries,
        date,
        status: 'posted',
        totalDebits,
        totalCredits
      }
    };
  }

  async getTransactions(params, userId) {
    const { startDate, endDate, limit = 50 } = params;
    return {
      success: true,
      data: [
        {
          id: 1,
          date: '2025-06-15',
          description: 'Office Supplies',
          amount: 156.78,
          type: 'Expense'
        }
      ]
    };
  }

  async analyzeTransaction(params, userId) {
    const { description, amount, date } = params;
    const analysis = await this.aiProviderService.analyzeTransaction({
      description, amount, date, company: 'Financial AI Demo Company'
    });
    
    return {
      success: true,
      message: `Analyzed transaction: ${description}`,
      data: analysis
    };
  }

  async getContacts(params, userId) {
    const { type = 'all', limit = 50 } = params;
    return {
      success: true,
      data: [
        { id: 1, name: 'Acme Corp', type: 'customer', email: 'billing@acme.com' },
        { id: 2, name: 'Office Depot', type: 'vendor', email: 'orders@officedepot.com' }
      ]
    };
  }

  async createContact(params, userId) {
    const { name, type, email, phone, address } = params;
    return {
      success: true,
      message: `Created ${type}: ${name}`,
      data: { id: Date.now(), name, type, email, phone, address }
    };
  }

  async updateContact(params, userId) {
    const { id, updates } = params;
    return {
      success: true,
      message: `Updated contact ${id}`,
      data: updates
    };
  }

  async getInvoices(params, userId) {
    const { status, limit = 50 } = params;
    return {
      success: true,
      data: [
        {
          id: 'INV-001',
          customer: 'Acme Corp',
          amount: 1500.00,
          status: 'sent',
          dueDate: '2025-07-15'
        }
      ]
    };
  }

  async createInvoice(params, userId) {
    const { customer, items, dueDate } = params;
    const total = items.reduce((sum, item) => sum + (item.quantity * item.price), 0);
    
    return {
      success: true,
      message: `Created invoice for ${customer}`,
      data: {
        id: `INV-${Date.now()}`,
        customer,
        items,
        total,
        dueDate,
        status: 'draft'
      }
    };
  }

  async updateInvoiceStatus(params, userId) {
    const { id, status } = params;
    return {
      success: true,
      message: `Updated invoice ${id} status to ${status}`,
      data: { id, status }
    };
  }

  async getPayments(params, userId) {
    const { startDate, endDate, limit = 50 } = params;
    return {
      success: true,
      data: [
        {
          id: 1,
          amount: 1500.00,
          date: '2025-06-15',
          method: 'Bank Transfer',
          reference: 'INV-001'
        }
      ]
    };
  }

  async createPayment(params, userId) {
    const { amount, method, reference, date } = params;
    return {
      success: true,
      message: `Recorded payment of $${amount}`,
      data: {
        id: Date.now(),
        amount,
        method,
        reference,
        date,
        status: 'cleared'
      }
    };
  }

  async reconcilePayment(params, userId) {
    const { paymentId, bankStatementId } = params;
    return {
      success: true,
      message: `Reconciled payment ${paymentId} with bank statement`,
      data: { paymentId, bankStatementId, status: 'reconciled' }
    };
  }

  async generateProfitLoss(params, userId) {
    const { startDate, endDate } = params;
    return {
      success: true,
      message: `Generated P&L report for ${startDate} to ${endDate}`,
      data: {
        revenue: 125000,
        expenses: 98000,
        netIncome: 27000,
        period: `${startDate} to ${endDate}`
      }
    };
  }

  async generateBalanceSheet(params, userId) {
    const { asOfDate } = params;
    return {
      success: true,
      message: `Generated Balance Sheet as of ${asOfDate}`,
      data: {
        assets: 125000,
        liabilities: 36000,
        equity: 89000,
        asOfDate
      }
    };
  }

  async generateTrialBalance(params, userId) {
    const { asOfDate } = params;
    return {
      success: true,
      message: `Generated Trial Balance as of ${asOfDate}`,
      data: {
        totalDebits: 250000,
        totalCredits: 250000,
        balanced: true,
        asOfDate
      }
    };
  }

  async processOCRDocument(params, userId) {
    const { documentType, confidence } = params;
    return {
      success: true,
      message: `Processed ${documentType} document with ${confidence}% confidence`,
      data: {
        extractedData: {
          vendor: 'Office Depot',
          amount: 156.78,
          date: '2025-06-15',
          items: ['Paper', 'Pens', 'Staples']
        },
        confidence
      }
    };
  }

  async searchRecords(params, userId) {
    const { query, type, limit = 20 } = params;
    return {
      success: true,
      message: `Found results for "${query}"`,
      data: [
        {
          type: 'transaction',
          id: 1,
          description: 'Office Supplies',
          amount: 156.78,
          relevance: 0.95
        }
      ]
    };
  }
}

module.exports = { AIAgentService };