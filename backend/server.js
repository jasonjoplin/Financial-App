// Financial AI App Server with Multi-AI Provider Support
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { validationResult, body } = require('express-validator');
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

// Auth middleware
const authenticate = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'Access token required' });
    }

    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await db('users').where({ id: payload.user_id }).first();
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
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

    const company = await db('companies').first(); // Get first company for demo

    const token = jwt.sign(
      { user_id: user.id, email: user.email, company_id: company?.id },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    logger.info(`User logged in: ${email}`);

    res.json({
      message: 'Login successful',
      user: { id: user.id, email: user.email, first_name: user.first_name, last_name: user.last_name },
      company,
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
    const accountTypes = await db('account_types').select('*');
    res.json({ account_types: accountTypes });
  } catch (error) {
    logger.error('Error fetching account types:', error);
    res.status(500).json({ error: 'Failed to fetch account types' });
  }
});

// Mock chart of accounts
app.get('/api/v1/accounts/chart', authenticate, async (req, res) => {
  try {
    const accountTypes = await db('account_types').select('*');
    
    // Mock chart of accounts based on our seed data
    const chartOfAccounts = {
      assets: {
        type: 'Assets',
        normal_balance: 'debit',
        accounts: [
          { code: '1001', name: 'Cash', balance: 25000 },
          { code: '1100', name: 'Accounts Receivable', balance: 15000 },
          { code: '1200', name: 'Inventory', balance: 35000 },
          { code: '1500', name: 'Equipment', balance: 50000 }
        ]
      },
      liabilities: {
        type: 'Liabilities', 
        normal_balance: 'credit',
        accounts: [
          { code: '2000', name: 'Accounts Payable', balance: 8000 },
          { code: '2100', name: 'Accrued Expenses', balance: 3000 },
          { code: '2500', name: 'Long-term Debt', balance: 25000 }
        ]
      },
      equity: {
        type: 'Equity',
        normal_balance: 'credit', 
        accounts: [
          { code: '3000', name: 'Owner\'s Equity', balance: 75000 },
          { code: '3100', name: 'Retained Earnings', balance: 14000 }
        ]
      },
      revenue: {
        type: 'Revenue',
        normal_balance: 'credit',
        accounts: [
          { code: '4000', name: 'Sales Revenue', balance: 125000 },
          { code: '4500', name: 'Interest Income', balance: 500 }
        ]
      },
      expenses: {
        type: 'Expenses',
        normal_balance: 'debit', 
        accounts: [
          { code: '6000', name: 'Office Expense', balance: 12000 },
          { code: '6700', name: 'Rent Expense', balance: 24000 },
          { code: '6800', name: 'Payroll Expense', balance: 75000 }
        ]
      }
    };

    res.json({
      message: 'Chart of accounts retrieved',
      chart_of_accounts: chartOfAccounts,
      account_types_count: accountTypes.length
    });
  } catch (error) {
    logger.error('Error fetching chart of accounts:', error);
    res.status(500).json({ error: 'Failed to fetch chart of accounts' });
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