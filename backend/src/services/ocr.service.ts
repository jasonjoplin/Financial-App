import OpenAI from 'openai';
import logger from '@/utils/logger';

export interface OCRResult {
  text: string;
  structured_data: {
    vendor?: string;
    amount?: number;
    date?: string;
    description?: string;
    invoice_number?: string;
    tax_amount?: number;
    line_items?: Array<{
      description: string;
      amount: number;
      quantity?: number;
    }>;
  };
  confidence: number;
}

export class OCRService {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  }

  // Process image and extract text + structured data
  async processDocument(imageBase64: string, documentType: 'receipt' | 'invoice' | 'bill' = 'receipt'): Promise<{ success: boolean; result?: OCRResult; error?: string }> {
    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4-vision-preview",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: this.getOCRPrompt(documentType)
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/jpeg;base64,${imageBase64}`
                }
              }
            ]
          }
        ],
        max_tokens: 1000,
        temperature: 0.1,
        response_format: { type: "json_object" }
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        return { success: false, error: 'No response from OCR service' };
      }

      const ocrResult = JSON.parse(content) as OCRResult;
      
      // Validate and clean the result
      this.validateOCRResult(ocrResult);
      
      return { success: true, result: ocrResult };
    } catch (error) {
      logger.error('OCR processing failed:', error);
      return { success: false, error: 'OCR processing failed' };
    }
  }

  // Extract text from simple receipts using basic pattern matching
  async extractReceiptData(text: string): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: "You are an expert at extracting structured data from receipt text. Extract vendor, amount, date, and description information."
          },
          {
            role: "user",
            content: `Extract structured data from this receipt text:\n\n${text}\n\nReturn JSON with vendor, amount, date, description, and any other relevant details.`
          }
        ],
        temperature: 0.1,
        response_format: { type: "json_object" }
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        return { success: false, error: 'No response from text extraction' };
      }

      const extractedData = JSON.parse(content);
      return { success: true, data: extractedData };
    } catch (error) {
      logger.error('Text extraction failed:', error);
      return { success: false, error: 'Text extraction failed' };
    }
  }

  private getOCRPrompt(documentType: string): string {
    return `
Analyze this ${documentType} image and extract all relevant information. 

Extract the following information and return as JSON:
{
  "text": "Complete text visible in the image",
  "structured_data": {
    "vendor": "Business/vendor name",
    "amount": 123.45,
    "date": "YYYY-MM-DD format",
    "description": "Description of purchase/service",
    "invoice_number": "Invoice/receipt number if visible",
    "tax_amount": 12.34,
    "line_items": [
      {
        "description": "Item description",
        "amount": 12.34,
        "quantity": 1
      }
    ]
  },
  "confidence": 0.95
}

Instructions:
- Extract ALL visible text accurately
- Parse amounts as numbers (remove currency symbols)
- Convert dates to YYYY-MM-DD format
- Set confidence between 0-1 based on image clarity
- If information is unclear or missing, omit that field
- Focus on financial transaction details
- Identify line items if this is an itemized ${documentType}
`;
  }

  private validateOCRResult(result: OCRResult): void {
    // Ensure confidence is between 0 and 1
    if (result.confidence < 0) result.confidence = 0;
    if (result.confidence > 1) result.confidence = 1;
    
    // Validate amount format
    if (result.structured_data.amount && typeof result.structured_data.amount === 'string') {
      result.structured_data.amount = parseFloat(result.structured_data.amount as string);
    }
    
    // Validate tax amount format
    if (result.structured_data.tax_amount && typeof result.structured_data.tax_amount === 'string') {
      result.structured_data.tax_amount = parseFloat(result.structured_data.tax_amount as string);
    }
    
    // Validate date format
    if (result.structured_data.date) {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(result.structured_data.date)) {
        // Try to parse and reformat common date formats
        const parsedDate = new Date(result.structured_data.date);
        if (!isNaN(parsedDate.getTime())) {
          result.structured_data.date = parsedDate.toISOString().split('T')[0];
        } else {
          delete result.structured_data.date;
        }
      }
    }
    
    // Validate line items
    if (result.structured_data.line_items) {
      result.structured_data.line_items = result.structured_data.line_items.filter(item => 
        item.description && item.amount && !isNaN(item.amount)
      );
    }
  }
}

export default OCRService;