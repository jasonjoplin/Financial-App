// Mock Ollama Server for Testing Financial AI App Integration
const express = require('express');
const app = express();
const PORT = 11434;

app.use(express.json());

// Mock models data
const mockModels = [
  { name: 'deepseek-r1:14b', size: 14000000000, digest: 'abc123' },
  { name: 'llama3:latest', size: 4700000000, digest: 'def456' },
  { name: 'llama2:7b', size: 3800000000, digest: 'ghi789' },
  { name: 'codellama:7b', size: 3800000000, digest: 'jkl012' },
  { name: 'mistral:7b', size: 4100000000, digest: 'mno345' },
  { name: 'phi3:mini', size: 2300000000, digest: 'pqr678' }
];

// API endpoints
app.get('/api/tags', (req, res) => {
  console.log('GET /api/tags - Returning mock models');
  res.json({
    models: mockModels.map(model => ({
      name: model.name,
      size: model.size,
      digest: model.digest,
      modified_at: new Date().toISOString()
    }))
  });
});

app.post('/api/chat', (req, res) => {
  const { model, messages } = req.body;
  console.log(`POST /api/chat - Model: ${model}, Messages: ${messages?.length} messages`);
  
  // Simulate processing time
  setTimeout(() => {
    const mockResponse = {
      model: model,
      created_at: new Date().toISOString(),
      message: {
        role: 'assistant',
        content: generateMockAccountingResponse(messages)
      },
      done: true,
      total_duration: 2500000000,
      load_duration: 500000000,
      prompt_eval_count: 50,
      eval_count: 150,
      eval_duration: 2000000000
    };
    
    res.json(mockResponse);
  }, 1000 + Math.random() * 2000); // 1-3 second delay
});

app.post('/api/generate', (req, res) => {
  const { model, prompt } = req.body;
  console.log(`POST /api/generate - Model: ${model}`);
  
  setTimeout(() => {
    res.json({
      model: model,
      created_at: new Date().toISOString(),
      response: generateMockAccountingResponse([{ content: prompt }]),
      done: true
    });
  }, 800 + Math.random() * 1200);
});

function generateMockAccountingResponse(messages) {
  const lastMessage = messages[messages.length - 1]?.content || '';
  
  if (lastMessage.includes('transaction') || lastMessage.includes('journal')) {
    return `{
  "title": "Office Supplies Purchase Analysis",
  "reasoning": "This transaction appears to be a business expense for office supplies. Based on the description and amount, I recommend categorizing this as an office expense with the corresponding cash reduction.",
  "confidence_score": 0.92,
  "suggested_entries": [
    {
      "account_name": "Office Supplies Expense",
      "account_code": "6100",
      "debit_amount": 156.78,
      "credit_amount": 0,
      "description": "Office supplies purchase"
    },
    {
      "account_name": "Cash",
      "account_code": "1001",
      "debit_amount": 0,
      "credit_amount": 156.78,
      "description": "Payment for office supplies"
    }
  ],
  "validation": {
    "is_balanced": true,
    "total_debits": 156.78,
    "total_credits": 156.78,
    "gaap_compliant": true
  }
}`;
  }
  
  return "I'm a mock Ollama DeepSeek R1 model running locally. I can help with accounting analysis and GAAP-compliant journal entries.";
}

app.listen(PORT, () => {
  console.log(`🤖 Mock Ollama Server running on http://localhost:${PORT}`);
  console.log(`📊 Available models: ${mockModels.map(m => m.name).join(', ')}`);
  console.log(`🎭 This is a simulation for testing the Financial AI App integration`);
});