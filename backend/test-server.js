// Test server startup
require('dotenv').config();
const express = require('express');
const cors = require('cors');

console.log('🚀 Starting Financial AI App Test Server...\n');

const app = express();
const PORT = 3001;

// Basic middleware
app.use(cors());
app.use(express.json());

// Test routes
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Financial AI App is running!',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

app.get('/api/v1/test', (req, res) => {
  res.json({
    message: 'API is working!',
    features: [
      'Authentication System',
      'Chart of Accounts',
      'Transaction Management', 
      'AI Accounting Agent',
      'Customer/Vendor Management',
      'Invoice/Bill Processing',
      'OCR Document Processing'
    ]
  });
});

// Test database connection
app.get('/api/v1/test/database', async (req, res) => {
  try {
    const knex = require('knex');
    const config = require('./knexfile');
    const db = knex(config.development);
    
    // Test database connection
    const accountTypes = await db('account_types').select('*');
    await db.destroy();
    
    res.json({
      status: 'Connected',
      message: 'Database connection successful',
      account_types_count: accountTypes.length,
      account_types: accountTypes
    });
  } catch (error) {
    res.status(500).json({
      status: 'Error',
      message: 'Database connection failed',
      error: error.message
    });
  }
});

// Test accounting logic
app.post('/api/v1/test/validate-entries', (req, res) => {
  try {
    const { entries } = req.body;
    
    if (!entries || !Array.isArray(entries)) {
      return res.status(400).json({ error: 'Entries array required' });
    }
    
    // Validate double-entry bookkeeping
    const totalDebits = entries.reduce((sum, entry) => sum + (entry.debit_amount || 0), 0);
    const totalCredits = entries.reduce((sum, entry) => sum + (entry.credit_amount || 0), 0);
    
    const isBalanced = Math.abs(totalDebits - totalCredits) < 0.01;
    
    res.json({
      valid: isBalanced,
      total_debits: totalDebits,
      total_credits: totalCredits,
      difference: totalDebits - totalCredits,
      entries_count: entries.length,
      message: isBalanced ? 'Journal entries are balanced!' : 'Journal entries are not balanced'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    error: 'Route not found',
    available_routes: [
      'GET /health',
      'GET /api/v1/test',
      'GET /api/v1/test/database',
      'POST /api/v1/test/validate-entries'
    ]
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
  console.log('🔗 Test endpoints:');
  console.log(`   Health check: http://localhost:${PORT}/health`);
  console.log(`   API test: http://localhost:${PORT}/api/v1/test`);
  console.log(`   Database test: http://localhost:${PORT}/api/v1/test/database`);
  console.log(`   Accounting test: POST http://localhost:${PORT}/api/v1/test/validate-entries`);
  console.log('\n📝 Test the accounting validation with:');
  console.log(`curl -X POST http://localhost:${PORT}/api/v1/test/validate-entries \\`);
  console.log(`  -H "Content-Type: application/json" \\`);
  console.log(`  -d '{"entries":[{"debit_amount":100,"credit_amount":0},{"debit_amount":0,"credit_amount":100}]}'`);
  console.log('\n🎉 Financial AI App is ready for testing!');
});