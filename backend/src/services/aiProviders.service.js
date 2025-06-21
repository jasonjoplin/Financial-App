/**
 * Multi-AI Provider Service
 * Supports OpenAI, Anthropic Claude, and Local Ollama models
 */

const axios = require('axios');
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [new winston.transports.Console()]
});

class AIProviderService {
  constructor() {
    this.providers = {
      openai: {
        name: 'OpenAI',
        models: ['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo'],
        endpoint: 'https://api.openai.com/v1/chat/completions',
        requiresKey: true
      },
      anthropic: {
        name: 'Anthropic Claude',
        models: ['claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku'],
        endpoint: 'https://api.anthropic.com/v1/messages',
        requiresKey: true
      },
      ollama: {
        name: 'Local Ollama',
        models: [], // Will be populated dynamically
        endpoint: 'http://localhost:11434',
        requiresKey: false
      }
    };

    // Default configuration
    this.config = {
      defaultProvider: process.env.DEFAULT_AI_PROVIDER || 'openai',
      defaultModel: process.env.DEFAULT_AI_MODEL || 'gpt-4',
      providers: {
        openai: {
          apiKey: process.env.OPENAI_API_KEY,
          model: 'gpt-4',
          temperature: 0.1,
          maxTokens: 1500
        },
        anthropic: {
          apiKey: process.env.ANTHROPIC_API_KEY,
          model: 'claude-3-sonnet',
          temperature: 0.1,
          maxTokens: 1500
        },
        ollama: {
          endpoint: process.env.OLLAMA_ENDPOINT || 'http://172.20.64.1:11434',
          model: 'deepseek-r1:14b',
          temperature: 0.1,
          maxTokens: 1500
        }
      }
    };
  }

  /**
   * Get available Ollama models
   */
  async getOllamaModels(endpoint) {
    try {
      const response = await axios.get(`${endpoint}/api/tags`, { timeout: 5000 });
      return response.data.models?.map(model => model.name) || [];
    } catch (error) {
      logger.warn('Failed to fetch Ollama models:', error.message);
      return [];
    }
  }

  /**
   * Get available providers and their status
   */
  async getProviderStatus() {
    const status = {};
    
    for (const [key, provider] of Object.entries(this.providers)) {
      const config = this.config.providers[key];
      let isAvailable = false;
      let error = null;
      let models = provider.models;

      try {
        if (key === 'openai' && config.apiKey) {
          isAvailable = true;
        } else if (key === 'anthropic' && config.apiKey) {
          isAvailable = true;
        } else if (key === 'ollama') {
          // Test Ollama connection and get models
          const ollamaModels = await this.getOllamaModels(config.endpoint);
          if (ollamaModels.length > 0) {
            isAvailable = true;
            models = ollamaModels;
            // Update the provider models cache
            this.providers[key].models = models;
          } else {
            // Provide demo models when Ollama is not available
            isAvailable = false;
            models = ['llama3', 'llama2', 'codellama', 'mistral', 'phi3', 'qwen'];
            throw new Error('Ollama not running. Install and start Ollama to use local models.');
          }
        }
      } catch (err) {
        error = err.code === 'ECONNREFUSED' ? 
          'Connection refused - Is Ollama running on localhost:11434?' : 
          err.message;
      }

      status[key] = {
        name: provider.name,
        available: isAvailable,
        models: models,
        currentModel: config.model,
        error
      };
    }

    return status;
  }

  /**
   * Set AI provider configuration
   */
  setProviderConfig(provider, config) {
    if (!this.providers[provider]) {
      throw new Error(`Unknown provider: ${provider}`);
    }

    this.config.providers[provider] = {
      ...this.config.providers[provider],
      ...config
    };

    logger.info(`Updated configuration for provider: ${provider}`);
  }

  /**
   * Analyze transaction using specified provider
   */
  async analyzeTransaction(transactionData, provider = null, model = null) {
    const selectedProvider = provider || this.config.defaultProvider;
    const providerConfig = this.config.providers[selectedProvider];
    const selectedModel = model || providerConfig.model;

    if (!this.providers[selectedProvider]) {
      throw new Error(`Unknown provider: ${selectedProvider}`);
    }

    const prompt = this.buildTransactionAnalysisPrompt(transactionData);
    
    try {
      let response;
      const startTime = Date.now();

      switch (selectedProvider) {
        case 'openai':
          response = await this.callOpenAI(prompt, selectedModel, providerConfig);
          break;
        case 'anthropic':
          response = await this.callAnthropic(prompt, selectedModel, providerConfig);
          break;
        case 'ollama':
          response = await this.callOllama(prompt, selectedModel, providerConfig);
          break;
        default:
          throw new Error(`Unsupported provider: ${selectedProvider}`);
      }

      const processingTime = Date.now() - startTime;
      
      // Parse AI response into structured format
      const analysis = this.parseAIResponse(response, transactionData);
      
      logger.info(`AI analysis completed using ${selectedProvider}/${selectedModel} in ${processingTime}ms`);

      return {
        analysis,
        provider: selectedProvider,
        model: selectedModel,
        processingTime,
        confidence: analysis.confidence_score || 0.8
      };

    } catch (error) {
      logger.error(`AI analysis failed with ${selectedProvider}:`, error);
      
      // Fallback to mock analysis if AI fails
      return this.getMockAnalysis(transactionData, selectedProvider, selectedModel);
    }
  }

  /**
   * Call OpenAI API
   */
  async callOpenAI(prompt, model, config) {
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: model,
        messages: [
          {
            role: 'system',
            content: 'You are an expert accounting AI assistant specializing in GAAP-compliant journal entries.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: config.temperature,
        max_tokens: config.maxTokens
      },
      {
        headers: {
          'Authorization': `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );

    return response.data.choices[0].message.content;
  }

  /**
   * Call Anthropic Claude API
   */
  async callAnthropic(prompt, model, config) {
    const response = await axios.post(
      'https://api.anthropic.com/v1/messages',
      {
        model: model,
        max_tokens: config.maxTokens,
        temperature: config.temperature,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      },
      {
        headers: {
          'x-api-key': config.apiKey,
          'Content-Type': 'application/json',
          'anthropic-version': '2023-06-01'
        },
        timeout: 30000
      }
    );

    return response.data.content[0].text;
  }

  /**
   * Call Local Ollama API
   */
  async callOllama(prompt, model, config) {
    const response = await axios.post(
      `${config.endpoint}/api/chat`,
      {
        model: model,
        messages: [
          {
            role: 'system',
            content: 'You are an expert accounting AI assistant specializing in GAAP-compliant journal entries.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        stream: false,
        options: {
          temperature: config.temperature,
          num_predict: config.maxTokens
        }
      },
      {
        timeout: 120000 // DeepSeek 14B model needs more time
      }
    );

    return response.data.message.content;
  }

  /**
   * Build transaction analysis prompt
   */
  buildTransactionAnalysisPrompt(transactionData) {
    return `
Analyze this business transaction and provide GAAP-compliant journal entries:

Transaction Details:
- Description: ${transactionData.description}
- Amount: $${transactionData.amount}
- Date: ${transactionData.date}
- Company: ${transactionData.company || 'Financial AI Demo Company'}

Please provide your response in the following JSON format:
{
  "title": "Brief title for this transaction",
  "reasoning": "Detailed explanation of your analysis",
  "confidence_score": 0.95,
  "suggested_entries": [
    {
      "account_name": "Account Name",
      "account_code": "1234",
      "debit_amount": 0,
      "credit_amount": 156.78,
      "description": "Entry description"
    }
  ],
  "validation": {
    "is_balanced": true,
    "total_debits": 156.78,
    "total_credits": 156.78,
    "gaap_compliant": true
  }
}

Requirements:
1. Ensure debits equal credits (double-entry bookkeeping)
2. Use appropriate GAAP account classifications
3. Provide confidence score (0.0 to 1.0)
4. Include clear reasoning for account selections
5. Return only valid JSON
`;
  }

  /**
   * Parse AI response into structured format
   */
  parseAIResponse(response, transactionData) {
    try {
      // Try to extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        
        // Validate required fields
        if (parsed.suggested_entries && Array.isArray(parsed.suggested_entries)) {
          return {
            title: parsed.title || `Analysis: ${transactionData.description}`,
            description: parsed.description || `AI analysis for ${transactionData.description}`,
            reasoning: parsed.reasoning || 'AI-generated accounting analysis',
            confidence_score: parsed.confidence_score || 0.8,
            suggested_entries: parsed.suggested_entries,
            validation: parsed.validation || {
              is_balanced: true,
              total_debits: transactionData.amount,
              total_credits: transactionData.amount,
              gaap_compliant: true
            }
          };
        }
      }
    } catch (error) {
      logger.warn('Failed to parse AI response, using fallback');
    }

    // Fallback structured response
    return this.generateFallbackAnalysis(transactionData);
  }

  /**
   * Generate fallback analysis when AI parsing fails
   */
  generateFallbackAnalysis(transactionData) {
    const amount = parseFloat(transactionData.amount);
    
    return {
      title: `Analysis: ${transactionData.description}`,
      description: `Automated analysis for ${transactionData.description}`,
      reasoning: `Based on the description "${transactionData.description}", this appears to be a business expense requiring appropriate journal entry allocation.`,
      confidence_score: 0.75,
      suggested_entries: [
        {
          account_name: "General Expense",
          account_code: "6000",
          debit_amount: amount,
          credit_amount: 0,
          description: transactionData.description
        },
        {
          account_name: "Cash",
          account_code: "1001",
          debit_amount: 0,
          credit_amount: amount,
          description: `Payment for ${transactionData.description}`
        }
      ],
      validation: {
        is_balanced: true,
        total_debits: amount,
        total_credits: amount,
        gaap_compliant: true
      }
    };
  }

  /**
   * Get mock analysis (for testing/fallback)
   */
  getMockAnalysis(transactionData, provider, model) {
    const analysis = this.generateFallbackAnalysis(transactionData);
    
    return {
      analysis,
      provider: provider,
      model: `mock-${model}`,
      processingTime: 250 + Math.random() * 200,
      confidence: 0.75,
      mock: true
    };
  }

  /**
   * Test AI provider connection
   */
  async testProvider(provider, model = null) {
    const testTransaction = {
      description: "Test office supplies purchase",
      amount: 100.00,
      date: new Date().toISOString().split('T')[0]
    };

    try {
      const result = await this.analyzeTransaction(testTransaction, provider, model);
      return {
        success: true,
        provider,
        model: result.model,
        processingTime: result.processingTime,
        mock: result.mock || false
      };
    } catch (error) {
      return {
        success: false,
        provider,
        error: error.message
      };
    }
  }
}

module.exports = { AIProviderService };