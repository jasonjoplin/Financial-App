import Decimal from 'decimal.js';
import db from '@/config/database';
import logger from '@/utils/logger';

export interface JournalEntry {
  account_id: string;
  debit_amount: number;
  credit_amount: number;
  description?: string;
  memo?: string;
  entity_id?: string;
  entity_type?: string;
}

export interface TransactionRequest {
  company_id: string;
  transaction_date: Date;
  posting_date?: Date;
  reference?: string;
  description?: string;
  memo?: string;
  type: 'journal_entry' | 'invoice' | 'payment' | 'deposit' | 'transfer' | 'adjustment';
  entries: JournalEntry[];
  created_by?: string;
  is_ai_generated?: boolean;
  ai_metadata?: any;
}

export class AccountingService {
  // GAAP Validation Rules
  static validateJournalEntry(entries: JournalEntry[]): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Rule 1: Must have at least 2 entries
    if (entries.length < 2) {
      errors.push('Journal entry must have at least 2 accounts (debit and credit)');
    }
    
    // Rule 2: Debits must equal credits
    const totalDebits = entries.reduce((sum, entry) => 
      sum.plus(new Decimal(entry.debit_amount || 0)), new Decimal(0));
    const totalCredits = entries.reduce((sum, entry) => 
      sum.plus(new Decimal(entry.credit_amount || 0)), new Decimal(0));
    
    if (!totalDebits.equals(totalCredits)) {
      errors.push(`Debits (${totalDebits.toString()}) must equal credits (${totalCredits.toString()})`);
    }
    
    // Rule 3: Each entry must have either debit OR credit (not both, not neither)
    entries.forEach((entry, index) => {
      const debit = new Decimal(entry.debit_amount || 0);
      const credit = new Decimal(entry.credit_amount || 0);
      
      if (debit.isZero() && credit.isZero()) {
        errors.push(`Entry ${index + 1}: Must have either debit or credit amount`);
      }
      
      if (!debit.isZero() && !credit.isZero()) {
        errors.push(`Entry ${index + 1}: Cannot have both debit and credit amounts`);
      }
      
      if (debit.isNegative() || credit.isNegative()) {
        errors.push(`Entry ${index + 1}: Amounts cannot be negative`);
      }
    });
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
  
  // Validate account normal balance rules
  static async validateAccountBalance(accountId: string, amount: number, isDebit: boolean): Promise<{ isValid: boolean; warning?: string }> {
    try {
      const account = await db('accounts')
        .join('account_categories', 'accounts.account_category_id', 'account_categories.id')
        .join('account_types', 'account_categories.account_type_id', 'account_types.id')
        .where('accounts.id', accountId)
        .select('accounts.*', 'account_types.normal_balance')
        .first();
      
      if (!account) {
        return { isValid: false, warning: 'Account not found' };
      }
      
      const normalBalance = account.normal_balance;
      const isNormalSide = (normalBalance === 'debit' && isDebit) || (normalBalance === 'credit' && !isDebit);
      
      if (!isNormalSide) {
        return {
          isValid: true,
          warning: `Warning: ${account.name} has normal ${normalBalance} balance, but ${isDebit ? 'debit' : 'credit'} entry posted`
        };
      }
      
      return { isValid: true };
    } catch (error) {
      logger.error('Error validating account balance:', error);
      return { isValid: false, warning: 'Error validating account' };
    }
  }
  
  // Create a new transaction with journal entries
  static async createTransaction(transactionData: TransactionRequest): Promise<{ success: boolean; transaction?: any; errors?: string[] }> {
    try {
      // Validate journal entries
      const validation = this.validateJournalEntry(transactionData.entries);
      if (!validation.isValid) {
        return { success: false, errors: validation.errors };
      }
      
      // Validate accounts exist and are active
      const accountIds = transactionData.entries.map(e => e.account_id);
      const accounts = await db('accounts')
        .whereIn('id', accountIds)
        .where('company_id', transactionData.company_id)
        .where('is_active', true);
      
      if (accounts.length !== accountIds.length) {
        return { success: false, errors: ['One or more accounts not found or inactive'] };
      }
      
      // Generate transaction number
      const lastTransaction = await db('transactions')
        .where('company_id', transactionData.company_id)
        .orderBy('transaction_number', 'desc')
        .first();
      
      const nextNumber = lastTransaction 
        ? parseInt(lastTransaction.transaction_number) + 1 
        : 1;
      
      const result = await db.transaction(async (trx) => {
        // Create main transaction record
        const [transaction] = await trx('transactions').insert({
          company_id: transactionData.company_id,
          transaction_number: nextNumber.toString().padStart(6, '0'),
          transaction_date: transactionData.transaction_date,
          posting_date: transactionData.posting_date || transactionData.transaction_date,
          reference: transactionData.reference,
          description: transactionData.description,
          memo: transactionData.memo,
          type: transactionData.type,
          status: 'posted', // Auto-post for now
          total_amount: transactionData.entries.reduce((sum, entry) => 
            sum + (entry.debit_amount || entry.credit_amount || 0), 0),
          created_by: transactionData.created_by,
          is_ai_generated: transactionData.is_ai_generated || false,
          ai_metadata: transactionData.ai_metadata
        }).returning('*');
        
        // Create journal entries
        const journalEntries = transactionData.entries.map((entry, index) => ({
          transaction_id: transaction.id,
          account_id: entry.account_id,
          debit_amount: entry.debit_amount || 0,
          credit_amount: entry.credit_amount || 0,
          description: entry.description,
          memo: entry.memo,
          line_number: index + 1,
          entity_id: entry.entity_id,
          entity_type: entry.entity_type
        }));
        
        const entries = await trx('transaction_entries')
          .insert(journalEntries)
          .returning('*');
        
        return { transaction, entries };
      });
      
      logger.info(`Transaction created: ${result.transaction.transaction_number}`);
      return { success: true, transaction: result };
      
    } catch (error) {
      logger.error('Error creating transaction:', error);
      return { success: false, errors: ['Failed to create transaction'] };
    }
  }
  
  // Get account balance at a specific date
  static async getAccountBalance(accountId: string, asOfDate?: Date): Promise<{ balance: number; debit_total: number; credit_total: number }> {
    try {
      const query = db('transaction_entries')
        .join('transactions', 'transaction_entries.transaction_id', 'transactions.id')
        .where('transaction_entries.account_id', accountId)
        .where('transactions.status', 'posted');
      
      if (asOfDate) {
        query.where('transactions.posting_date', '<=', asOfDate);
      }
      
      const result = await query
        .sum('transaction_entries.debit_amount as total_debits')
        .sum('transaction_entries.credit_amount as total_credits')
        .first();
      
      const debitTotal = parseFloat(result?.total_debits || '0');
      const creditTotal = parseFloat(result?.total_credits || '0');
      const balance = debitTotal - creditTotal;
      
      return {
        balance,
        debit_total: debitTotal,
        credit_total: creditTotal
      };
    } catch (error) {
      logger.error('Error calculating account balance:', error);
      throw error;
    }
  }
  
  // Get trial balance
  static async getTrialBalance(companyId: string, asOfDate?: Date): Promise<any[]> {
    try {
      const accounts = await db('accounts')
        .join('account_categories', 'accounts.account_category_id', 'account_categories.id')
        .join('account_types', 'account_categories.account_type_id', 'account_types.id')
        .where('accounts.company_id', companyId)
        .where('accounts.is_active', true)
        .select(
          'accounts.*',
          'account_categories.name as category_name',
          'account_types.name as type_name',
          'account_types.normal_balance'
        )
        .orderBy('accounts.code');
      
      const trialBalance = await Promise.all(
        accounts.map(async (account) => {
          const balance = await this.getAccountBalance(account.id, asOfDate);
          return {
            account_id: account.id,
            account_code: account.code,
            account_name: account.name,
            account_type: account.type_name,
            category: account.category_name,
            normal_balance: account.normal_balance,
            debit_total: balance.debit_total,
            credit_total: balance.credit_total,
            balance: balance.balance,
            display_balance: account.normal_balance === 'debit' 
              ? Math.max(0, balance.balance)
              : Math.max(0, -balance.balance)
          };
        })
      );
      
      return trialBalance;
    } catch (error) {
      logger.error('Error generating trial balance:', error);
      throw error;
    }
  }
  
  // Validate trial balance (debits should equal credits)
  static validateTrialBalance(trialBalance: any[]): { isBalanced: boolean; debitTotal: number; creditTotal: number } {
    const debitTotal = trialBalance
      .filter(account => account.normal_balance === 'debit')
      .reduce((sum, account) => sum + account.display_balance, 0);
    
    const creditTotal = trialBalance
      .filter(account => account.normal_balance === 'credit')
      .reduce((sum, account) => sum + account.display_balance, 0);
    
    return {
      isBalanced: Math.abs(debitTotal - creditTotal) < 0.01, // Allow for rounding
      debitTotal,
      creditTotal
    };
  }
}

export default AccountingService;