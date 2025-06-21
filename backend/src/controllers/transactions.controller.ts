import { Response } from 'express';
import { validationResult } from 'express-validator';
import { AuthRequest } from '@/types';
import AccountingService, { TransactionRequest } from '@/services/accounting.service';
import db from '@/config/database';
import logger from '@/utils/logger';

export const createTransaction = async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const companyId = req.params.companyId;
    const userId = req.user?.id;
    
    const transactionData: TransactionRequest = {
      ...req.body,
      company_id: companyId,
      created_by: userId,
      transaction_date: new Date(req.body.transaction_date),
      posting_date: req.body.posting_date ? new Date(req.body.posting_date) : undefined
    };
    
    const result = await AccountingService.createTransaction(transactionData);
    
    if (!result.success) {
      return res.status(400).json({ 
        error: 'Transaction validation failed',
        details: result.errors 
      });
    }
    
    res.status(201).json({
      message: 'Transaction created successfully',
      transaction: result.transaction?.transaction,
      entries: result.transaction?.entries
    });
  } catch (error) {
    logger.error('Error creating transaction:', error);
    res.status(500).json({ error: 'Failed to create transaction' });
  }
};

export const getTransactions = async (req: AuthRequest, res: Response) => {
  try {
    const companyId = req.params.companyId;
    const { 
      page = 1, 
      limit = 50, 
      type, 
      status, 
      from_date, 
      to_date,
      account_id 
    } = req.query;
    
    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);
    
    let query = db('transactions')
      .where('company_id', companyId)
      .select('*')
      .orderBy('transaction_date', 'desc')
      .orderBy('created_at', 'desc')
      .limit(parseInt(limit as string))
      .offset(offset);
    
    // Apply filters
    if (type) {
      query = query.where('type', type);
    }
    
    if (status) {
      query = query.where('status', status);
    }
    
    if (from_date) {
      query = query.where('transaction_date', '>=', from_date);
    }
    
    if (to_date) {
      query = query.where('transaction_date', '<=', to_date);
    }
    
    if (account_id) {
      query = query.whereExists(
        db('transaction_entries')
          .where('transaction_entries.transaction_id', db.raw('transactions.id'))
          .where('transaction_entries.account_id', account_id)
      );
    }
    
    const transactions = await query;
    
    // Get total count for pagination
    let countQuery = db('transactions')
      .where('company_id', companyId)
      .count('* as total');
    
    if (type) countQuery = countQuery.where('type', type);
    if (status) countQuery = countQuery.where('status', status);
    if (from_date) countQuery = countQuery.where('transaction_date', '>=', from_date);
    if (to_date) countQuery = countQuery.where('transaction_date', '<=', to_date);
    if (account_id) {
      countQuery = countQuery.whereExists(
        db('transaction_entries')
          .where('transaction_entries.transaction_id', db.raw('transactions.id'))
          .where('transaction_entries.account_id', account_id)
      );
    }
    
    const [{ total }] = await countQuery;
    
    res.json({
      transactions,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total: parseInt(total as string),
        pages: Math.ceil(parseInt(total as string) / parseInt(limit as string))
      }
    });
  } catch (error) {
    logger.error('Error fetching transactions:', error);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
};

export const getTransaction = async (req: AuthRequest, res: Response) => {
  try {
    const { companyId, transactionId } = req.params;
    
    const transaction = await db('transactions')
      .where({ id: transactionId, company_id: companyId })
      .first();
    
    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }
    
    const entries = await db('transaction_entries')
      .join('accounts', 'transaction_entries.account_id', 'accounts.id')
      .where('transaction_entries.transaction_id', transactionId)
      .select(
        'transaction_entries.*',
        'accounts.name as account_name',
        'accounts.code as account_code'
      )
      .orderBy('transaction_entries.line_number');
    
    res.json({
      transaction,
      entries
    });
  } catch (error) {
    logger.error('Error fetching transaction:', error);
    res.status(500).json({ error: 'Failed to fetch transaction' });
  }
};

export const voidTransaction = async (req: AuthRequest, res: Response) => {
  try {
    const { companyId, transactionId } = req.params;
    
    const transaction = await db('transactions')
      .where({ id: transactionId, company_id: companyId })
      .first();
    
    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }
    
    if (transaction.status === 'void') {
      return res.status(400).json({ error: 'Transaction is already voided' });
    }
    
    await db('transactions')
      .where({ id: transactionId, company_id: companyId })
      .update({ 
        status: 'void',
        updated_at: new Date()
      });
    
    res.json({ message: 'Transaction voided successfully' });
  } catch (error) {
    logger.error('Error voiding transaction:', error);
    res.status(500).json({ error: 'Failed to void transaction' });
  }
};

export const getGeneralLedger = async (req: AuthRequest, res: Response) => {
  try {
    const companyId = req.params.companyId;
    const { 
      account_id, 
      from_date, 
      to_date,
      page = 1,
      limit = 100
    } = req.query;
    
    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);
    
    let query = db('transaction_entries')
      .join('transactions', 'transaction_entries.transaction_id', 'transactions.id')
      .join('accounts', 'transaction_entries.account_id', 'accounts.id')
      .where('transactions.company_id', companyId)
      .where('transactions.status', 'posted')
      .select(
        'transaction_entries.*',
        'transactions.transaction_number',
        'transactions.transaction_date',
        'transactions.posting_date',
        'transactions.reference',
        'transactions.description as transaction_description',
        'accounts.name as account_name',
        'accounts.code as account_code',
        'accounts.normal_balance'
      )
      .orderBy('transactions.posting_date', 'desc')
      .orderBy('transactions.transaction_number', 'desc')
      .orderBy('transaction_entries.line_number', 'asc')
      .limit(parseInt(limit as string))
      .offset(offset);
    
    // Apply filters
    if (account_id) {
      query = query.where('transaction_entries.account_id', account_id);
    }
    
    if (from_date) {
      query = query.where('transactions.posting_date', '>=', from_date);
    }
    
    if (to_date) {
      query = query.where('transactions.posting_date', '<=', to_date);
    }
    
    const entries = await query;
    
    // Calculate running balance if specific account is selected
    let entriesWithBalance = entries;
    if (account_id) {
      let runningBalance = 0;
      entriesWithBalance = entries.map(entry => {
        const isDebit = entry.debit_amount > 0;
        const amount = entry.debit_amount || entry.credit_amount;
        
        if (entry.normal_balance === 'debit') {
          runningBalance += isDebit ? amount : -amount;
        } else {
          runningBalance += isDebit ? -amount : amount;
        }
        
        return {
          ...entry,
          running_balance: runningBalance
        };
      });
    }
    
    res.json({
      entries: entriesWithBalance,
      account_id: account_id || null,
      date_range: {
        from: from_date || null,
        to: to_date || null
      }
    });
  } catch (error) {
    logger.error('Error fetching general ledger:', error);
    res.status(500).json({ error: 'Failed to fetch general ledger' });
  }
};

export const getTrialBalance = async (req: AuthRequest, res: Response) => {
  try {
    const companyId = req.params.companyId;
    const { as_of_date } = req.query;
    
    const asOfDate = as_of_date ? new Date(as_of_date as string) : new Date();
    
    const trialBalance = await AccountingService.getTrialBalance(companyId, asOfDate);
    const validation = AccountingService.validateTrialBalance(trialBalance);
    
    res.json({
      trial_balance: trialBalance,
      as_of_date: asOfDate,
      totals: {
        debit_total: validation.debitTotal,
        credit_total: validation.creditTotal,
        is_balanced: validation.isBalanced,
        difference: validation.debitTotal - validation.creditTotal
      }
    });
  } catch (error) {
    logger.error('Error generating trial balance:', error);
    res.status(500).json({ error: 'Failed to generate trial balance' });
  }
};

export const getAccountBalance = async (req: AuthRequest, res: Response) => {
  try {
    const { companyId, accountId } = req.params;
    const { as_of_date } = req.query;
    
    const asOfDate = as_of_date ? new Date(as_of_date as string) : undefined;
    
    const balance = await AccountingService.getAccountBalance(accountId, asOfDate);
    
    // Get account details
    const account = await db('accounts')
      .join('account_categories', 'accounts.account_category_id', 'account_categories.id')
      .join('account_types', 'account_categories.account_type_id', 'account_types.id')
      .where('accounts.id', accountId)
      .where('accounts.company_id', companyId)
      .select(
        'accounts.*',
        'account_categories.name as category_name',
        'account_types.name as type_name',
        'account_types.normal_balance'
      )
      .first();
    
    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }
    
    res.json({
      account,
      balance: {
        ...balance,
        as_of_date: asOfDate || 'current'
      }
    });
  } catch (error) {
    logger.error('Error fetching account balance:', error);
    res.status(500).json({ error: 'Failed to fetch account balance' });
  }
};