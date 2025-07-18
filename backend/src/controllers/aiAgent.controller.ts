import { Response } from 'express';
import { validationResult } from 'express-validator';
import { AuthRequest } from '@/types';
import AIAgentService, { TransactionAnalysis } from '@/services/aiAgent.service';
import db from '@/config/database';
import logger from '@/utils/logger';

export const analyzeTransaction = async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    // Handle test endpoint (no company ID in params)
    const companyId = req.params.companyId || req.company?.id;
    
    if (!companyId) {
      return res.status(400).json({ error: 'No company ID provided' });
    }
    
    const analysis: TransactionAnalysis = {
      description: req.body.description,
      amount: parseFloat(req.body.amount),
      date: req.body.date ? new Date(req.body.date) : new Date(),
      reference: req.body.reference,
      attachment_data: req.body.attachment_data,
      context: req.body.context
    };
    
    const aiService = new AIAgentService();
    
    // Get or create accounting agent
    const agentResult = await aiService.getOrCreateAccountingAgent(companyId);
    if (!agentResult.success) {
      return res.status(500).json({ error: agentResult.error });
    }
    
    // Analyze transaction
    const result = await aiService.analyzeTransaction(companyId, analysis);
    
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }
    
    // For test endpoint, don't save to database, just return the analysis
    if (req.path.includes('/test/')) {
      return res.json({
        message: 'Transaction analyzed successfully (test mode)',
        analysis: result.suggestion,
        processing_time_ms: result.suggestion?.metadata.processing_time_ms,
        model_used: result.suggestion?.metadata.model_used
      });
    }
    
    // Save suggestion to database
    const saveResult = await aiService.saveSuggestion(
      companyId,
      agentResult.agent.id,
      result.suggestion!,
      analysis
    );
    
    if (!saveResult.success) {
      return res.status(500).json({ error: saveResult.error });
    }
    
    res.json({
      message: 'Transaction analyzed successfully',
      suggestion_id: saveResult.suggestionId,
      suggestion: result.suggestion,
      agent: {
        id: agentResult.agent.id,
        name: agentResult.agent.name,
        confidence_threshold: agentResult.agent.confidence_threshold
      }
    });
  } catch (error) {
    logger.error('Error analyzing transaction:', error);
    res.status(500).json({ error: 'Failed to analyze transaction' });
  }
};

export const getSuggestions = async (req: AuthRequest, res: Response) => {
  try {
    const companyId = req.params.companyId;
    const { 
      status = 'pending', 
      page = 1, 
      limit = 20,
      agent_type 
    } = req.query;
    
    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);
    
    let query = db('ai_suggestions')
      .join('ai_agents', 'ai_suggestions.ai_agent_id', 'ai_agents.id')
      .where('ai_suggestions.company_id', companyId)
      .select(
        'ai_suggestions.*',
        'ai_agents.name as agent_name',
        'ai_agents.type as agent_type'
      )
      .orderBy('ai_suggestions.created_at', 'desc')
      .limit(parseInt(limit as string))
      .offset(offset);
    
    if (status !== 'all') {
      query = query.where('ai_suggestions.status', status);
    }
    
    if (agent_type) {
      query = query.where('ai_agents.type', agent_type);
    }
    
    const suggestions = await query;
    
    // Get total count
    let countQuery = db('ai_suggestions')
      .join('ai_agents', 'ai_suggestions.ai_agent_id', 'ai_agents.id')
      .where('ai_suggestions.company_id', companyId)
      .count('* as total');
    
    if (status !== 'all') {
      countQuery = countQuery.where('ai_suggestions.status', status);
    }
    
    if (agent_type) {
      countQuery = countQuery.where('ai_agents.type', agent_type);
    }
    
    const [{ total }] = await countQuery;
    
    res.json({
      suggestions,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total: parseInt(total as string),
        pages: Math.ceil(parseInt(total as string) / parseInt(limit as string))
      }
    });
  } catch (error) {
    logger.error('Error fetching suggestions:', error);
    res.status(500).json({ error: 'Failed to fetch suggestions' });
  }
};

export const getSuggestion = async (req: AuthRequest, res: Response) => {
  try {
    const { companyId, suggestionId } = req.params;
    
    const suggestion = await db('ai_suggestions')
      .join('ai_agents', 'ai_suggestions.ai_agent_id', 'ai_agents.id')
      .where('ai_suggestions.id', suggestionId)
      .where('ai_suggestions.company_id', companyId)
      .select(
        'ai_suggestions.*',
        'ai_agents.name as agent_name',
        'ai_agents.type as agent_type'
      )
      .first();
    
    if (!suggestion) {
      return res.status(404).json({ error: 'Suggestion not found' });
    }
    
    // If implemented, get the transaction details
    let implementedTransaction = null;
    if (suggestion.implemented_transaction_id) {
      implementedTransaction = await db('transactions')
        .where('id', suggestion.implemented_transaction_id)
        .first();
    }
    
    res.json({
      suggestion,
      implemented_transaction: implementedTransaction
    });
  } catch (error) {
    logger.error('Error fetching suggestion:', error);
    res.status(500).json({ error: 'Failed to fetch suggestion' });
  }
};

export const approveSuggestion = async (req: AuthRequest, res: Response) => {
  try {
    const { companyId, suggestionId } = req.params;
    const { review_notes } = req.body;
    const userId = req.user?.id;
    
    const suggestion = await db('ai_suggestions')
      .where('id', suggestionId)
      .where('company_id', companyId)
      .first();
    
    if (!suggestion) {
      return res.status(404).json({ error: 'Suggestion not found' });
    }
    
    if (suggestion.status !== 'pending') {
      return res.status(400).json({ error: 'Suggestion already reviewed' });
    }
    
    // Update suggestion status
    await db('ai_suggestions')
      .where('id', suggestionId)
      .update({
        status: 'approved',
        reviewed_by: userId,
        reviewed_at: new Date(),
        review_notes
      });
    
    // Auto-implement if requested
    if (req.body.auto_implement) {
      const aiService = new AIAgentService();
      const implementResult = await aiService.implementSuggestion(suggestionId, userId!);
      
      if (implementResult.success) {
        return res.json({
          message: 'Suggestion approved and implemented successfully',
          transaction_id: implementResult.transactionId
        });
      } else {
        return res.json({
          message: 'Suggestion approved but implementation failed',
          error: implementResult.error
        });
      }
    }
    
    res.json({ message: 'Suggestion approved successfully' });
  } catch (error) {
    logger.error('Error approving suggestion:', error);
    res.status(500).json({ error: 'Failed to approve suggestion' });
  }
};

export const rejectSuggestion = async (req: AuthRequest, res: Response) => {
  try {
    const { companyId, suggestionId } = req.params;
    const { review_notes } = req.body;
    const userId = req.user?.id;
    
    const suggestion = await db('ai_suggestions')
      .where('id', suggestionId)
      .where('company_id', companyId)
      .first();
    
    if (!suggestion) {
      return res.status(404).json({ error: 'Suggestion not found' });
    }
    
    if (suggestion.status !== 'pending') {
      return res.status(400).json({ error: 'Suggestion already reviewed' });
    }
    
    // Update suggestion status
    await db('ai_suggestions')
      .where('id', suggestionId)
      .update({
        status: 'rejected',
        reviewed_by: userId,
        reviewed_at: new Date(),
        review_notes
      });
    
    // Update agent statistics
    await db('ai_agents')
      .where('id', suggestion.ai_agent_id)
      .increment('suggestions_rejected', 1);
    
    res.json({ message: 'Suggestion rejected successfully' });
  } catch (error) {
    logger.error('Error rejecting suggestion:', error);
    res.status(500).json({ error: 'Failed to reject suggestion' });
  }
};

export const implementSuggestion = async (req: AuthRequest, res: Response) => {
  try {
    const { companyId, suggestionId } = req.params;
    const userId = req.user?.id;
    
    const aiService = new AIAgentService();
    const result = await aiService.implementSuggestion(suggestionId, userId!);
    
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }
    
    res.json({
      message: 'Suggestion implemented successfully',
      transaction_id: result.transactionId
    });
  } catch (error) {
    logger.error('Error implementing suggestion:', error);
    res.status(500).json({ error: 'Failed to implement suggestion' });
  }
};

export const getAgents = async (req: AuthRequest, res: Response) => {
  try {
    const companyId = req.params.companyId;
    
    const agents = await db('ai_agents')
      .where('company_id', companyId)
      .where('is_active', true)
      .select('*')
      .orderBy('type');
    
    res.json({ agents });
  } catch (error) {
    logger.error('Error fetching agents:', error);
    res.status(500).json({ error: 'Failed to fetch agents' });
  }
};

export const updateAgent = async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const { companyId, agentId } = req.params;
    const updates = req.body;
    
    const agent = await db('ai_agents')
      .where('id', agentId)
      .where('company_id', companyId)
      .first();
    
    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }
    
    const [updatedAgent] = await db('ai_agents')
      .where('id', agentId)
      .update({
        ...updates,
        updated_at: new Date()
      })
      .returning('*');
    
    res.json({
      message: 'Agent updated successfully',
      agent: updatedAgent
    });
  } catch (error) {
    logger.error('Error updating agent:', error);
    res.status(500).json({ error: 'Failed to update agent' });
  }
};

export const getAgentPerformance = async (req: AuthRequest, res: Response) => {
  try {
    const { companyId, agentId } = req.params;
    const { days = 30 } = req.query;
    
    const agent = await db('ai_agents')
      .where('id', agentId)
      .where('company_id', companyId)
      .first();
    
    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }
    
    // Get performance metrics for the specified period
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - parseInt(days as string));
    
    const suggestions = await db('ai_suggestions')
      .where('ai_agent_id', agentId)
      .where('created_at', '>=', fromDate)
      .select('status', 'confidence_score', 'created_at')
      .orderBy('created_at', 'desc');
    
    const stats = {
      total_suggestions: suggestions.length,
      pending: suggestions.filter(s => s.status === 'pending').length,
      approved: suggestions.filter(s => s.status === 'approved').length,
      rejected: suggestions.filter(s => s.status === 'rejected').length,
      implemented: suggestions.filter(s => s.status === 'implemented').length,
      average_confidence: suggestions.length > 0 
        ? suggestions.reduce((sum, s) => sum + s.confidence_score, 0) / suggestions.length 
        : 0,
      accuracy_rate: agent.accuracy_rate || 0
    };
    
    res.json({
      agent: {
        id: agent.id,
        name: agent.name,
        type: agent.type,
        is_active: agent.is_active,
        confidence_threshold: agent.confidence_threshold,
        auto_approve: agent.auto_approve
      },
      performance: stats,
      recent_suggestions: suggestions.slice(0, 10),
      period_days: parseInt(days as string)
    });
  } catch (error) {
    logger.error('Error fetching agent performance:', error);
    res.status(500).json({ error: 'Failed to fetch agent performance' });
  }
};