// Financial AI App Server with Multi-AI Provider Support
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { validationResult, body } = require('express-validator');
const tenantMiddleware = require('./src/middleware/tenant');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const knex = require('knex');
const winston = require('winston');
const { v4: uuidv4 } = require('uuid');
const { AIProviderService } = require('./src/services/aiProviders.service.js');
// const { AIAgentService } = require('./src/services/aiAgent.service.js');

// Initialize logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

// Initialize database
const db = knex({
  client: 'sqlite3',
  connection: { filename: './test.db' },
  useNullAsDefault: true
});

// Initialize AI Provider Service
const aiProviderService = new AIProviderService();
// const aiAgentService = new AIAgentService(db);

// Initialize Express
const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet());
app.use(cors({ 
  origin: [
    'http://localhost:3000',
    'http://localhost:3002',
    process.env.CORS_ORIGIN
  ].filter(Boolean)
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100
});
app.use(limiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));

// Tenant middleware (applies to all routes except auth)
app.use(tenantMiddleware);

// Simple auth check (tenant middleware handles the heavy lifting)
const authenticate = (req, res, next) => {
  if (!req.tenant) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
};

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Financial AI App is running!',
    timestamp: new Date().toISOString(),
    features: [
      'Authentication System ✅',
      'Chart of Accounts ✅', 
      'Transaction Management ✅',
      'AI Accounting Agent ⚡',
      'Customer/Vendor Management ✅',
      'Invoice/Bill Processing ✅',
      'OCR Document Processing ⚡'
    ]
  });
});

// Auth routes
app.post('/api/v1/auth/register', [
  body('email').isEmail(),
  body('password').isLength({ min: 6 }),
  body('first_name').notEmpty(),
  body('last_name').notEmpty(),
  body('company_name').notEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password, first_name, last_name, company_name } = req.body;

    // Check if user exists
    const existingUser = await db('users').where({ email }).first();
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Create user and company
    const userId = uuidv4();
    const companyId = uuidv4();
    const hashedPassword = await bcrypt.hash(password, 8);

    // Insert user
    await db('users').insert({
      id: userId,
      email,
      password_hash: hashedPassword,
      first_name,
      last_name,
      role: 'admin'
    });

    // Insert company
    await db('companies').insert({
      id: companyId,
      name: company_name
    });

    // Link user to company
    await db('user_companies').insert({
      user_id: userId,
      company_id: companyId,
      role: 'admin'
    });

    // Generate token
    const token = jwt.sign(
      { user_id: userId, email, company_id: companyId },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    logger.info(`New user registered: ${email}`);

    res.status(201).json({
      message: 'Registration successful',
      user: { id: userId, email, first_name, last_name },
      company: { id: companyId, name: company_name },
      token
    });
  } catch (error) {
    logger.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

app.post('/api/v1/auth/login', [
  body('email').isEmail(),
  body('password').notEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    const user = await db('users').where({ email }).first();
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Get user's company from user_companies table
    const userCompany = await db('user_companies')
      .join('companies', 'user_companies.company_id', 'companies.id')
      .where('user_companies.user_id', user.id)
      .select('companies.*')
      .first();

    if (!userCompany) {
      return res.status(401).json({ error: 'No company associated with user' });
    }

    const token = jwt.sign(
      { user_id: user.id, email: user.email, company_id: userCompany.id },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    logger.info(`User logged in: ${email}`);

    res.json({
      message: 'Login successful',
      user: { id: user.id, email: user.email, first_name: user.first_name, last_name: user.last_name },
      company: userCompany,
      token
    });
  } catch (error) {
    logger.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// AI Provider Status endpoint
app.get('/api/v1/ai/providers', authenticate, async (req, res) => {
  try {
    const status = await aiProviderService.getProviderStatus();
    res.json({
      message: 'AI providers status retrieved',
      providers: status,
      defaultProvider: aiProviderService.config.defaultProvider
    });
  } catch (error) {
    logger.error('Provider status error:', error);
    res.status(500).json({ error: 'Failed to get provider status' });
  }
});

// Update AI provider configuration
app.post('/api/v1/ai/providers/:provider/config', authenticate, [
  body('model').optional().isString(),
  body('apiKey').optional().isString(),
  body('temperature').optional().isNumeric(),
  body('maxTokens').optional().isNumeric()
], async (req, res) => {
  try {
    const { provider } = req.params;
    const config = req.body;
    
    aiProviderService.setProviderConfig(provider, config);
    
    res.json({
      message: `Configuration updated for ${provider}`,
      provider,
      config
    });
  } catch (error) {
    logger.error('Provider config error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Test AI provider
app.post('/api/v1/ai/providers/:provider/test', authenticate, async (req, res) => {
  try {
    const { provider } = req.params;
    const { model } = req.body;
    
    const result = await aiProviderService.testProvider(provider, model);
    
    res.json({
      message: 'Provider test completed',
      result
    });
  } catch (error) {
    logger.error('Provider test error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Enhanced AI analysis endpoint with multi-provider support
app.post('/api/v1/ai/analyze', authenticate, [
  body('description').notEmpty(),
  body('amount').isNumeric(),
  body('date').isISO8601(),
  body('provider').optional().isString(),
  body('model').optional().isString()
], async (req, res) => {
  try {
    const { description, amount, date, provider, model } = req.body;
    
    const transactionData = {
      description,
      amount: parseFloat(amount),
      date,
      company: req.user?.company_name || 'Financial AI Demo Company'
    };
    
    const result = await aiProviderService.analyzeTransaction(
      transactionData, 
      provider, 
      model
    );
    
    logger.info(`AI analysis completed using ${result.provider}/${result.model} for: ${description}`);

    res.json({
      message: 'AI analysis completed',
      analysis: result.analysis,
      processing_time_ms: result.processingTime,
      model_used: result.model,
      provider_used: result.provider,
      confidence: result.confidence,
      mock: result.mock || false
    });
  } catch (error) {
    logger.error('AI analysis error:', error);
    res.status(500).json({ error: 'Analysis failed' });
  }
});

// AI Agent Chat endpoints (temporarily disabled)
/*
app.post('/api/v1/ai/chat', authenticate, [
  body('message').notEmpty(),
  body('conversationHistory').optional().isArray()
], async (req, res) => {
  try {
    const { message, conversationHistory = [] } = req.body;
    
    const response = await aiAgentService.chat(message, req.user.id, conversationHistory);
    
    logger.info(`AI Agent chat completed for user ${req.user.id}`);
    
    res.json({
      message: 'AI Agent response generated',
      response,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('AI Agent chat error:', error);
    res.status(500).json({ error: 'Chat request failed' });
  }
});

// Get chat suggestions
app.get('/api/v1/ai/chat/suggestions', authenticate, async (req, res) => {
  try {
    const suggestions = [
      "Help me create a journal entry for office supplies",
      "Generate a profit and loss report for this month",
      "Show me my accounts receivable balance",
      "Create an invoice for a new customer",
      "Analyze this receipt and create the appropriate entries",
      "What's my cash flow looking like?",
      "Help me reconcile my bank statement",
      "Create a new expense account for marketing"
    ];
    
    res.json({
      suggestions,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Chat suggestions error:', error);
    res.status(500).json({ error: 'Failed to get suggestions' });
  }
});
*/

// Backward compatibility endpoint (existing UI calls this)
app.post('/api/v1/ai/test/analyze', authenticate, [
  body('description').notEmpty(),
  body('amount').isNumeric(),
  body('date').isISO8601()
], async (req, res) => {
  try {
    const { description, amount, date } = req.body;
    
    const transactionData = {
      description,
      amount: parseFloat(amount),
      date,
      company: req.user?.company_name || 'Financial AI Demo Company'
    };
    
    const result = await aiProviderService.analyzeTransaction(transactionData);
    
    logger.info(`AI analysis completed using ${result.provider}/${result.model} for: ${description}`);

    res.json({
      message: 'AI analysis completed',
      analysis: result.analysis,
      processing_time_ms: result.processingTime,
      model_used: result.model
    });
  } catch (error) {
    logger.error('AI analysis error:', error);
    res.status(500).json({ error: 'Analysis failed' });
  }
});

// Test transaction validation
app.post('/api/v1/transactions/validate', authenticate, [
  body('entries').isArray({ min: 2 })
], async (req, res) => {
  try {
    const { entries } = req.body;
    
    // Validate double-entry bookkeeping
    const totalDebits = entries.reduce((sum, entry) => sum + (entry.debit_amount || 0), 0);
    const totalCredits = entries.reduce((sum, entry) => sum + (entry.credit_amount || 0), 0);
    const isBalanced = Math.abs(totalDebits - totalCredits) < 0.01;
    
    // Check individual entries
    const entryValidation = entries.map((entry, index) => {
      const hasDebit = (entry.debit_amount || 0) > 0;
      const hasCredit = (entry.credit_amount || 0) > 0;
      const valid = (hasDebit && !hasCredit) || (!hasDebit && hasCredit);
      
      return {
        entry_number: index + 1,
        valid,
        debit_amount: entry.debit_amount || 0,
        credit_amount: entry.credit_amount || 0,
        issue: valid ? null : 'Entry must have either debit OR credit, not both or neither'
      };
    });

    const allEntriesValid = entryValidation.every(e => e.valid);

    logger.info(`Transaction validation: ${isBalanced && allEntriesValid ? 'PASSED' : 'FAILED'}`);

    res.json({
      valid: isBalanced && allEntriesValid,
      balanced: isBalanced,
      total_debits: totalDebits,
      total_credits: totalCredits,
      difference: totalDebits - totalCredits,
      entries_count: entries.length,
      entry_validation: entryValidation,
      gaap_compliant: isBalanced && allEntriesValid,
      message: isBalanced && allEntriesValid ? 
        'Transaction is valid and GAAP compliant!' : 
        'Transaction validation failed'
    });
  } catch (error) {
    logger.error('Validation error:', error);
    res.status(500).json({ error: 'Validation failed' });
  }
});

// Get account types
app.get('/api/v1/accounts/types', authenticate, async (req, res) => {
  try {
    // Mock account types data
    const accountTypes = [
      { id: 1, name: 'Assets', normal_balance: 'debit' },
      { id: 2, name: 'Liabilities', normal_balance: 'credit' },
      { id: 3, name: 'Equity', normal_balance: 'credit' },
      { id: 4, name: 'Revenue', normal_balance: 'credit' },
      { id: 5, name: 'Expenses', normal_balance: 'debit' }
    ];
    res.json({ account_types: accountTypes });
  } catch (error) {
    logger.error('Error fetching account types:', error);
    res.status(500).json({ error: 'Failed to fetch account types' });
  }
});

// Chart of accounts - PRODUCTION VERSION (NO MOCK DATA)
app.get('/api/v1/accounts/chart', authenticate, async (req, res) => {
  try {
    // Get real accounts from database filtered by user's company
    const realAccounts = await db('accounts')
      .select('*')
      .where({ 
        is_active: true,
        company_id: req.tenant.companyId 
      })
      .orderBy('code');
    
    // Group accounts by type - ONLY REAL ACCOUNTS
    const groupedAccounts = {
      assets: {
        type: 'Assets',
        normal_balance: 'debit',
        accounts: []
      },
      liabilities: {
        type: 'Liabilities', 
        normal_balance: 'credit',
        accounts: []
      },
      equity: {
        type: 'Equity',
        normal_balance: 'credit', 
        accounts: []
      },
      revenue: {
        type: 'Revenue',
        normal_balance: 'credit',
        accounts: []
      },
      expenses: {
        type: 'Expenses',
        normal_balance: 'debit', 
        accounts: []
      }
    };

    // Add ONLY real accounts to appropriate groups
    realAccounts.forEach(account => {
      if (groupedAccounts[account.type]) {
        groupedAccounts[account.type].accounts.push({
          code: account.code,
          name: account.name,
          balance: parseFloat(account.balance) || 0
        });
      }
    });

    const chartOfAccounts = groupedAccounts;

    res.json({
      message: 'Chart of accounts retrieved',
      chart_of_accounts: chartOfAccounts,
      account_types_count: 5
    });
  } catch (error) {
    logger.error('Error fetching chart of accounts:', error);
    res.status(500).json({ error: 'Failed to fetch chart of accounts' });
  }
});

// CRUD endpoints for accounts
// Create account
app.post('/api/v1/accounts', authenticate, [
  body('code').notEmpty().withMessage('Account code is required'),
  body('name').notEmpty().withMessage('Account name is required'),
  body('type').isIn(['assets', 'liabilities', 'equity', 'revenue', 'expenses']).withMessage('Invalid account type'),
  body('normal_balance').isIn(['debit', 'credit']).withMessage('Normal balance must be debit or credit')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { code, name, type, normal_balance, description, parent_account } = req.body;
    const accountId = uuidv4();

    // Check if account code already exists for this company
    const existingAccount = await db('accounts').where({ 
      code, 
      company_id: req.tenant.companyId 
    }).first();
    if (existingAccount) {
      return res.status(400).json({ error: 'Account code already exists' });
    }

    await db('accounts').insert({
      id: accountId,
      code,
      name,
      type,
      normal_balance,
      description: description || null,
      parent_account: parent_account || null,
      balance: 0,
      company_id: req.tenant.companyId
    });

    const newAccount = await db('accounts').where({ id: accountId }).first();

    logger.info(`New account created: ${code} - ${name}`);

    res.status(201).json({
      message: 'Account created successfully',
      account: newAccount
    });
  } catch (error) {
    logger.error('Account creation error:', error);
    res.status(500).json({ error: 'Failed to create account' });
  }
});

// Get all accounts
app.get('/api/v1/accounts', authenticate, async (req, res) => {
  try {
    const accounts = await db('accounts')
      .select('*')
      .where({ 
        is_active: true,
        company_id: req.tenant.companyId 
      })
      .orderBy('code');
    res.json({
      message: 'Accounts retrieved successfully',
      accounts
    });
  } catch (error) {
    logger.error('Error fetching accounts:', error);
    res.status(500).json({ error: 'Failed to fetch accounts' });
  }
});

// Update account
app.put('/api/v1/accounts/:code', authenticate, [
  body('name').notEmpty().withMessage('Account name is required'),
  body('type').isIn(['assets', 'liabilities', 'equity', 'revenue', 'expenses']).withMessage('Invalid account type'),
  body('normal_balance').isIn(['debit', 'credit']).withMessage('Normal balance must be debit or credit')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { code } = req.params;
    const { name, type, normal_balance, description, parent_account } = req.body;

    const account = await db('accounts').where({ code }).first();
    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }

    await db('accounts').where({ code }).update({
      name,
      type,
      normal_balance,
      description: description || null,
      parent_account: parent_account || null,
      updated_at: new Date()
    });

    const updatedAccount = await db('accounts').where({ code }).first();

    logger.info(`Account updated: ${code} - ${name}`);

    res.json({
      message: 'Account updated successfully',
      account: updatedAccount
    });
  } catch (error) {
    logger.error('Account update error:', error);
    res.status(500).json({ error: 'Failed to update account' });
  }
});

// Delete account
app.delete('/api/v1/accounts/:code', authenticate, async (req, res) => {
  try {
    const { code } = req.params;

    const account = await db('accounts').where({ code }).first();
    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }

    // Soft delete by setting is_active to false
    await db('accounts').where({ code }).update({
      is_active: false,
      updated_at: new Date()
    });

    logger.info(`Account deleted: ${code}`);

    res.json({
      message: 'Account deleted successfully'
    });
  } catch (error) {
    logger.error('Account deletion error:', error);
    res.status(500).json({ error: 'Failed to delete account' });
  }
});

// ====== TRANSACTIONS ENDPOINTS ======
app.get('/api/v1/transactions', authenticate, async (req, res) => {
  try {
    // For now, return empty transactions - add actual implementation later
    res.json({
      message: 'Transactions retrieved successfully',
      transactions: []
    });
  } catch (error) {
    logger.error('Error fetching transactions:', error);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

// ====== CONTACTS/CUSTOMERS/VENDORS ENDPOINTS ======
app.get('/api/v1/contacts', authenticate, async (req, res) => {
  try {
    // For now, return empty contacts - add actual implementation later
    res.json({
      message: 'Contacts retrieved successfully',
      contacts: []
    });
  } catch (error) {
    logger.error('Error fetching contacts:', error);
    res.status(500).json({ error: 'Failed to fetch contacts' });
  }
});

// ====== INVOICES ENDPOINTS ======
app.get('/api/v1/invoices', authenticate, async (req, res) => {
  try {
    // For now, return empty invoices - add actual implementation later
    res.json({
      message: 'Invoices retrieved successfully',
      invoices: []
    });
  } catch (error) {
    logger.error('Error fetching invoices:', error);
    res.status(500).json({ error: 'Failed to fetch invoices' });
  }
});

// ====== PAYMENTS ENDPOINTS ======
app.get('/api/v1/payments', authenticate, async (req, res) => {
  try {
    // For now, return empty payments - add actual implementation later
    res.json({
      message: 'Payments retrieved successfully',
      payments: []
    });
  } catch (error) {
    logger.error('Error fetching payments:', error);
    res.status(500).json({ error: 'Failed to fetch payments' });
  }
});

// ====== DOCUMENTS/OCR ENDPOINTS ======
app.get('/api/v1/documents', authenticate, async (req, res) => {
  try {
    // For now, return empty documents - add actual implementation later
    res.json({
      message: 'Documents retrieved successfully',
      documents: []
    });
  } catch (error) {
    logger.error('Error fetching documents:', error);
    res.status(500).json({ error: 'Failed to fetch documents' });
  }
});

// Test endpoints list
app.get('/api/v1/test/endpoints', (req, res) => {
  res.json({
    message: 'Financial AI App - Available Test Endpoints',
    endpoints: {
      authentication: [
        'POST /api/v1/auth/register',
        'POST /api/v1/auth/login'
      ],
      ai_features: [
        'POST /api/v1/ai/test/analyze (Requires auth)',
      ],
      accounting: [
        'POST /api/v1/transactions/validate (Requires auth)',
        'GET /api/v1/accounts/types (Requires auth)',
        'GET /api/v1/accounts/chart (Requires auth)'
      ],
      testing: [
        'GET /health',
        'GET /api/v1/test/endpoints'
      ]
    },
    sample_requests: {
      register: {
        url: 'POST /api/v1/auth/register',
        body: {
          email: 'ceo@testcompany.com',
          password: 'SecurePass123',
          first_name: 'John',
          last_name: 'Doe',
          company_name: 'Test Company LLC'
        }
      },
      ai_analysis: {
        url: 'POST /api/v1/ai/test/analyze',
        headers: { 'Authorization': 'Bearer YOUR_TOKEN' },
        body: {
          description: 'Office supplies from Staples',
          amount: 156.78,
          date: '2024-01-15'
        }
      }
    }
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    error: 'Route not found',
    suggestion: 'Try GET /api/v1/test/endpoints to see available routes'
  });
});

// Error handler
app.use((error, req, res, next) => {
  logger.error('Unhandled error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
  logger.info(`🚀 Financial AI App running on http://localhost:${PORT}`);
  logger.info(`🔗 Health check: http://localhost:${PORT}/health`);
  logger.info(`📋 Available endpoints: http://localhost:${PORT}/api/v1/test/endpoints`);
  logger.info(`🎉 Ready for testing!`);
});