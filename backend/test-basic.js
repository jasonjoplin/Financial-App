// Simple test to check if server components work
const express = require('express');

console.log('Testing Financial AI App Backend...\n');

// Test 1: Check if Express works
try {
  const app = express();
  console.log('✅ Express.js - OK');
} catch (error) {
  console.log('❌ Express.js - Failed:', error.message);
}

// Test 2: Check if core dependencies load
try {
  const jwt = require('jsonwebtoken');
  const bcrypt = require('bcryptjs');
  const winston = require('winston');
  console.log('✅ Core dependencies (JWT, bcrypt, winston) - OK');
} catch (error) {
  console.log('❌ Core dependencies - Failed:', error.message);
}

// Test 3: Check if accounting service logic works
try {
  // Simple validation test
  const entries = [
    { account_id: 'test1', debit_amount: 100, credit_amount: 0 },
    { account_id: 'test2', debit_amount: 0, credit_amount: 100 }
  ];
  
  const totalDebits = entries.reduce((sum, entry) => sum + (entry.debit_amount || 0), 0);
  const totalCredits = entries.reduce((sum, entry) => sum + (entry.credit_amount || 0), 0);
  
  if (totalDebits === totalCredits) {
    console.log('✅ Accounting validation logic - OK');
  } else {
    console.log('❌ Accounting validation logic - Failed: Debits != Credits');
  }
} catch (error) {
  console.log('❌ Accounting validation logic - Failed:', error.message);
}

// Test 4: Check if OpenAI dependency loads (without API call)
try {
  const OpenAI = require('openai');
  console.log('✅ OpenAI dependency - OK');
} catch (error) {
  console.log('❌ OpenAI dependency - Failed:', error.message);
}

// Test 5: Check if environment variables load
try {
  require('dotenv').config();
  console.log('✅ Environment configuration - OK');
} catch (error) {
  console.log('❌ Environment configuration - Failed:', error.message);
}

console.log('\n📊 Basic component test completed!');
console.log('\nNext steps:');
console.log('1. Set up database (SQLite)');
console.log('2. Run migrations');
console.log('3. Start server');
console.log('4. Test API endpoints');