const express = require('express');
const cors = require('cors');
const app = express();
const PORT = 3001;

// Middleware
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    message: 'Backend is running',
    features: [
      'User Authentication',
      'AI Analysis',
      'Tax Processing',
      'Financial Reports'
    ]
  });
});

// Mock login endpoint
app.post('/api/v1/auth/login', (req, res) => {
  const { email, password } = req.body;
  
  if (email === 'test@financialai.com' && password === 'password123') {
    res.json({
      message: 'Login successful',
      user: {
        id: '123',
        email: 'test@financialai.com',
        first_name: 'Test',
        last_name: 'User'
      },
      company: {
        id: '456',
        name: 'Demo Company',
        accounting_method: 'accrual',
        base_currency: 'USD'
      },
      token: 'mock-jwt-token'
    });
  } else {
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

// Mock registration endpoint
app.post('/api/v1/auth/register', (req, res) => {
  const { first_name, last_name, email, company_name } = req.body;
  
  res.json({
    message: 'User registered successfully',
    user: {
      id: '789',
      email,
      first_name,
      last_name
    },
    company: {
      id: '101112',
      name: company_name,
      accounting_method: 'accrual',
      base_currency: 'USD'
    },
    token: 'mock-jwt-token-new-user'
  });
});

// Mock AI analysis endpoint
app.post('/api/v1/ai/test/analyze', (req, res) => {
  const { description, amount } = req.body;
  
  setTimeout(() => {
    res.json({
      message: 'Transaction analyzed successfully (test mode)',
      analysis: {
        title: `Expense Entry: ${description}`,
        description: `Analysis of ${description} transaction for $${amount}`,
        reasoning: 'Based on the transaction description, this appears to be a business expense that should be categorized appropriately according to GAAP principles.',
        confidence_score: 0.92,
        suggested_entries: [
          {
            account_name: 'Office Supplies',
            account_code: '6100',
            debit_amount: parseFloat(amount),
            credit_amount: 0,
            description: `Purchase: ${description}`
          },
          {
            account_name: 'Cash',
            account_code: '1100',
            debit_amount: 0,
            credit_amount: parseFloat(amount),
            description: `Payment for: ${description}`
          }
        ],
        validation: {
          is_balanced: true,
          total_debits: parseFloat(amount),
          total_credits: parseFloat(amount),
          gaap_compliant: true
        }
      },
      processing_time_ms: 850,
      model_used: 'gpt-4'
    });
  }, 1000);
});

// Mock AI providers endpoint
app.get('/api/v1/ai/providers', (req, res) => {
  res.json({
    message: 'AI providers retrieved successfully',
    providers: [
      {
        id: 'openai',
        name: 'OpenAI',
        status: 'connected',
        model: 'gpt-4',
        last_used: new Date().toISOString()
      },
      {
        id: 'anthropic',
        name: 'Anthropic Claude',
        status: 'available',
        model: 'claude-3',
        last_used: null
      }
    ],
    current_provider: 'openai'
  });
});

// Mock AI settings endpoint
app.get('/api/v1/ai/settings', (req, res) => {
  res.json({
    message: 'AI settings retrieved successfully',
    settings: {
      default_provider: 'openai',
      temperature: 0.1,
      max_tokens: 2000,
      confidence_threshold: 0.7
    }
  });
});

app.put('/api/v1/ai/settings', (req, res) => {
  res.json({
    message: 'AI settings updated successfully',
    settings: req.body
  });
});

// Mock chart of accounts endpoint
app.get('/api/v1/accounts/chart', (req, res) => {
  res.json({
    message: 'Chart of accounts retrieved successfully',
    chart_of_accounts: {
      assets: {
        type: 'Assets',
        normal_balance: 'debit',
        accounts: [
          { code: '1001', name: 'Cash in Bank', balance: 45000 },
          { code: '1010', name: 'Accounts Receivable', balance: 25000 },
          { code: '1020', name: 'Inventory', balance: 35000 },
          { code: '1030', name: 'Equipment', balance: 85000 }
        ]
      },
      liabilities: {
        type: 'Liabilities',
        normal_balance: 'credit',
        accounts: [
          { code: '2001', name: 'Accounts Payable', balance: 15000 },
          { code: '2010', name: 'Notes Payable', balance: 50000 },
          { code: '2020', name: 'Accrued Expenses', balance: 8000 }
        ]
      },
      equity: {
        type: 'Equity',
        normal_balance: 'credit',
        accounts: [
          { code: '3001', name: 'Owner Capital', balance: 100000 },
          { code: '3010', name: 'Retained Earnings', balance: 17000 }
        ]
      },
      revenue: {
        type: 'Revenue',
        normal_balance: 'credit',
        accounts: [
          { code: '4001', name: 'Sales Revenue', balance: 125000 },
          { code: '4010', name: 'Service Revenue', balance: 35000 }
        ]
      },
      expenses: {
        type: 'Expenses',
        normal_balance: 'debit',
        accounts: [
          { code: '5001', name: 'Cost of Goods Sold', balance: 65000 },
          { code: '5010', name: 'Office Supplies', balance: 5000 },
          { code: '5020', name: 'Rent Expense', balance: 24000 },
          { code: '5030', name: 'Utilities', balance: 8000 }
        ]
      }
    },
    account_types_count: 5
  });
});

// Mock account CRUD endpoints
app.post('/api/v1/accounts', (req, res) => {
  res.json({
    message: 'Account created successfully',
    account: { ...req.body, balance: 0, is_active: true }
  });
});

app.put('/api/v1/accounts/:code', (req, res) => {
  res.json({
    message: 'Account updated successfully',
    account: { ...req.body, code: req.params.code }
  });
});

app.delete('/api/v1/accounts/:code', (req, res) => {
  res.json({
    message: 'Account deleted successfully'
  });
});

// Mock tax agent endpoints
app.post('/api/v1/tax/upload', (req, res) => {
  res.json({
    message: 'Tax documents uploaded successfully (mock)',
    files: {
      taxForms: [{ filename: 'form1040.pdf', size: 1024000 }],
      instructions: [{ filename: 'instructions1040.pdf', size: 512000 }]
    }
  });
});

app.post('/api/v1/tax/process', (req, res) => {
  setTimeout(() => {
    res.json({
      message: 'Tax forms processed successfully (mock)',
      forms: [
        {
          formType: '1040',
          formName: 'Individual Income Tax Return',
          fields: {
            'Line 1': 'Demo Company',
            'Line 2': '2024',
            'Line 3': 'Accrual Method'
          },
          calculations: {
            'Total Income': 125000,
            'Total Deductions': 35000,
            'Taxable Income': 90000
          },
          status: 'filled',
          confidence: 0.88
        }
      ],
      missingInformation: [
        'Quarterly estimated tax payments',
        'Equipment purchase dates'
      ],
      recommendations: [
        'Consider Section 179 deduction for equipment purchases'
      ]
    });
  }, 3000);
});

// Mock generic endpoints for other pages
app.get('/api/v1/transactions', (req, res) => {
  res.json({
    message: 'Transactions retrieved successfully',
    transactions: [],
    pagination: { page: 1, limit: 20, total: 0, pages: 0 }
  });
});

app.get('/api/v1/reports/*', (req, res) => {
  res.json({
    message: 'Report generated successfully (mock)',
    data: {}
  });
});

app.get('/api/v1/customers', (req, res) => {
  res.json({
    message: 'Customers retrieved successfully',
    customers: [],
    pagination: { page: 1, limit: 20, total: 0, pages: 0 }
  });
});

app.get('/api/v1/vendors', (req, res) => {
  res.json({
    message: 'Vendors retrieved successfully',
    vendors: [],
    pagination: { page: 1, limit: 20, total: 0, pages: 0 }
  });
});

app.get('/api/v1/invoices', (req, res) => {
  res.json({
    message: 'Invoices retrieved successfully',
    invoices: [],
    pagination: { page: 1, limit: 20, total: 0, pages: 0 }
  });
});

app.get('/api/v1/payments', (req, res) => {
  res.json({
    message: 'Payments retrieved successfully',
    payments: [],
    pagination: { page: 1, limit: 20, total: 0, pages: 0 }
  });
});

// Mock OCR endpoint
app.post('/api/v1/documents/ocr', (req, res) => {
  setTimeout(() => {
    res.json({
      message: 'OCR processing completed (mock)',
      extracted_text: 'INVOICE\\nCompany ABC\\nDate: 2024-01-15\\nAmount: $156.78\\nDescription: Office supplies',
      confidence: 0.95,
      processing_time_ms: 1200
    });
  }, 2000);
});

// Catch-all for missing endpoints
app.use('/api/v1/*', (req, res) => {
  res.status(404).json({
    error: 'API endpoint not found',
    path: req.path,
    method: req.method,
    message: 'This endpoint is not implemented in the mock server'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Financial AI Backend running on port ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/health`);
  console.log(`🔗 Frontend: http://localhost:3000`);
});