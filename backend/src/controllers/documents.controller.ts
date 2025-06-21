import { Response } from 'express';
import { validationResult } from 'express-validator';
import { AuthRequest } from '@/types';
import OCRService from '@/services/ocr.service';
import AIAgentService from '@/services/aiAgent.service';
import logger from '@/utils/logger';

export const uploadAndAnalyze = async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const companyId = req.params.companyId;
    const { 
      image_base64, 
      document_type = 'receipt',
      auto_analyze = true 
    } = req.body;
    
    if (!image_base64) {
      return res.status(400).json({ error: 'Image data required' });
    }
    
    // Remove data URL prefix if present
    const base64Data = image_base64.replace(/^data:image\/[a-z]+;base64,/, '');
    
    // Process document with OCR
    const ocrService = new OCRService();
    const ocrResult = await ocrService.processDocument(base64Data, document_type);
    
    if (!ocrResult.success) {
      return res.status(400).json({ error: ocrResult.error });
    }
    
    const response: any = {
      message: 'Document processed successfully',
      ocr_result: ocrResult.result,
      document_type
    };
    
    // Auto-analyze with AI if requested and sufficient data extracted
    if (auto_analyze && ocrResult.result?.structured_data.amount && ocrResult.result?.structured_data.vendor) {
      const aiService = new AIAgentService();
      
      const analysis = {
        description: `${document_type} from ${ocrResult.result.structured_data.vendor}${ocrResult.result.structured_data.description ? ` - ${ocrResult.result.structured_data.description}` : ''}`,
        amount: ocrResult.result.structured_data.amount,
        date: ocrResult.result.structured_data.date ? new Date(ocrResult.result.structured_data.date) : new Date(),
        reference: ocrResult.result.structured_data.invoice_number,
        attachment_data: ocrResult.result.text,
        context: {
          document_type,
          vendor: ocrResult.result.structured_data.vendor,
          tax_amount: ocrResult.result.structured_data.tax_amount,
          line_items: ocrResult.result.structured_data.line_items,
          ocr_confidence: ocrResult.result.confidence
        }
      };
      
      // Get or create accounting agent
      const agentResult = await aiService.getOrCreateAccountingAgent(companyId);
      if (agentResult.success) {
        // Analyze transaction
        const aiResult = await aiService.analyzeTransaction(companyId, analysis);
        
        if (aiResult.success) {
          // Save suggestion
          const saveResult = await aiService.saveSuggestion(
            companyId,
            agentResult.agent.id,
            aiResult.suggestion!,
            analysis
          );
          
          if (saveResult.success) {
            response.ai_analysis = {
              suggestion_id: saveResult.suggestionId,
              suggestion: aiResult.suggestion,
              auto_generated: true
            };
          }
        }
      }
    }
    
    res.json(response);
  } catch (error) {
    logger.error('Error processing document:', error);
    res.status(500).json({ error: 'Failed to process document' });
  }
};

export const extractText = async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const { text } = req.body;
    
    const ocrService = new OCRService();
    const result = await ocrService.extractReceiptData(text);
    
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }
    
    res.json({
      message: 'Text processed successfully',
      extracted_data: result.data
    });
  } catch (error) {
    logger.error('Error extracting text data:', error);
    res.status(500).json({ error: 'Failed to extract text data' });
  }
};

export const analyzeExtractedData = async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const companyId = req.params.companyId;
    const { extracted_data } = req.body;
    
    if (!extracted_data.amount || !extracted_data.vendor) {
      return res.status(400).json({ 
        error: 'Insufficient data for analysis. Amount and vendor are required.' 
      });
    }
    
    const aiService = new AIAgentService();
    
    const analysis = {
      description: `Expense from ${extracted_data.vendor}${extracted_data.description ? ` - ${extracted_data.description}` : ''}`,
      amount: parseFloat(extracted_data.amount),
      date: extracted_data.date ? new Date(extracted_data.date) : new Date(),
      reference: extracted_data.invoice_number || extracted_data.receipt_number,
      context: {
        vendor: extracted_data.vendor,
        tax_amount: extracted_data.tax_amount,
        line_items: extracted_data.line_items,
        manually_entered: true
      }
    };
    
    // Get or create accounting agent
    const agentResult = await aiService.getOrCreateAccountingAgent(companyId);
    if (!agentResult.success) {
      return res.status(500).json({ error: agentResult.error });
    }
    
    // Analyze transaction
    const aiResult = await aiService.analyzeTransaction(companyId, analysis);
    
    if (!aiResult.success) {
      return res.status(400).json({ error: aiResult.error });
    }
    
    // Save suggestion
    const saveResult = await aiService.saveSuggestion(
      companyId,
      agentResult.agent.id,
      aiResult.suggestion!,
      analysis
    );
    
    if (!saveResult.success) {
      return res.status(500).json({ error: saveResult.error });
    }
    
    res.json({
      message: 'Data analyzed successfully',
      suggestion_id: saveResult.suggestionId,
      suggestion: aiResult.suggestion,
      agent: {
        id: agentResult.agent.id,
        name: agentResult.agent.name
      }
    });
  } catch (error) {
    logger.error('Error analyzing extracted data:', error);
    res.status(500).json({ error: 'Failed to analyze extracted data' });
  }
};