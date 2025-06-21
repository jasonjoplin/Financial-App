import { Response } from 'express';
import { validationResult } from 'express-validator';
import { AuthRequest } from '@/types';
import db from '@/config/database';
import logger from '@/utils/logger';

export const getChartOfAccounts = async (req: AuthRequest, res: Response) => {
  try {
    const companyId = req.params.companyId;
    
    const accounts = await db('accounts')
      .join('account_categories', 'accounts.account_category_id', 'account_categories.id')
      .join('account_types', 'account_categories.account_type_id', 'account_types.id')
      .where('accounts.company_id', companyId)
      .where('accounts.is_active', true)
      .select(
        'accounts.*',
        'account_categories.name as category_name',
        'account_categories.code as category_code',
        'account_types.name as type_name',
        'account_types.code as type_code',
        'account_types.normal_balance'
      )
      .orderBy([
        { column: 'account_types.code', order: 'asc' },
        { column: 'account_categories.sort_order', order: 'asc' },
        { column: 'accounts.code', order: 'asc' }
      ]);
    
    // Group accounts by type and category
    const groupedAccounts = accounts.reduce((acc: any, account) => {
      const typeKey = account.type_code;
      const categoryKey = account.category_code;
      
      if (!acc[typeKey]) {
        acc[typeKey] = {
          type_name: account.type_name,
          type_code: account.type_code,
          normal_balance: account.normal_balance,
          categories: {}
        };
      }
      
      if (!acc[typeKey].categories[categoryKey]) {
        acc[typeKey].categories[categoryKey] = {
          category_name: account.category_name,
          category_code: account.category_code,
          accounts: []
        };
      }
      
      acc[typeKey].categories[categoryKey].accounts.push({
        id: account.id,
        code: account.code,
        name: account.name,
        description: account.description,
        normal_balance: account.normal_balance,
        opening_balance: account.opening_balance,
        opening_balance_date: account.opening_balance_date,
        is_system_account: account.is_system_account,
        parent_account_id: account.parent_account_id
      });
      
      return acc;
    }, {});
    
    res.json({
      company_id: companyId,
      chart_of_accounts: groupedAccounts
    });
  } catch (error) {
    logger.error('Error fetching chart of accounts:', error);
    res.status(500).json({ error: 'Failed to fetch chart of accounts' });
  }
};

export const createAccount = async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const companyId = req.params.companyId;
    const {
      account_category_id,
      parent_account_id,
      code,
      name,
      description,
      opening_balance,
      opening_balance_date
    } = req.body;
    
    // Check if account code already exists for this company
    const existingAccount = await db('accounts')
      .where({ company_id: companyId, code })
      .first();
    
    if (existingAccount) {
      return res.status(400).json({ error: 'Account code already exists' });
    }
    
    // Get account category to determine normal balance
    const category = await db('account_categories')
      .join('account_types', 'account_categories.account_type_id', 'account_types.id')
      .where('account_categories.id', account_category_id)
      .select('account_types.normal_balance')
      .first();
    
    if (!category) {
      return res.status(400).json({ error: 'Invalid account category' });
    }
    
    const [account] = await db('accounts').insert({
      company_id: companyId,
      account_category_id,
      parent_account_id,
      code,
      name,
      description,
      normal_balance: category.normal_balance,
      opening_balance: opening_balance || 0,
      opening_balance_date,
      is_system_account: false
    }).returning('*');
    
    res.status(201).json({
      message: 'Account created successfully',
      account
    });
  } catch (error) {
    logger.error('Error creating account:', error);
    res.status(500).json({ error: 'Failed to create account' });
  }
};

export const updateAccount = async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const { companyId, accountId } = req.params;
    const updateData = req.body;
    
    // Don't allow updating system accounts
    const account = await db('accounts')
      .where({ id: accountId, company_id: companyId })
      .first();
    
    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }
    
    if (account.is_system_account) {
      return res.status(400).json({ error: 'Cannot modify system accounts' });
    }
    
    // If updating code, check for duplicates
    if (updateData.code && updateData.code !== account.code) {
      const existingAccount = await db('accounts')
        .where({ company_id: companyId, code: updateData.code })
        .whereNot('id', accountId)
        .first();
      
      if (existingAccount) {
        return res.status(400).json({ error: 'Account code already exists' });
      }
    }
    
    const [updatedAccount] = await db('accounts')
      .where({ id: accountId, company_id: companyId })
      .update({
        ...updateData,
        updated_at: new Date()
      })
      .returning('*');
    
    res.json({
      message: 'Account updated successfully',
      account: updatedAccount
    });
  } catch (error) {
    logger.error('Error updating account:', error);
    res.status(500).json({ error: 'Failed to update account' });
  }
};

export const deactivateAccount = async (req: AuthRequest, res: Response) => {
  try {
    const { companyId, accountId } = req.params;
    
    const account = await db('accounts')
      .where({ id: accountId, company_id: companyId })
      .first();
    
    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }
    
    if (account.is_system_account) {
      return res.status(400).json({ error: 'Cannot deactivate system accounts' });
    }
    
    // Check if account has transactions
    const hasTransactions = await db('transaction_entries')
      .where('account_id', accountId)
      .first();
    
    if (hasTransactions) {
      return res.status(400).json({ 
        error: 'Cannot deactivate account with existing transactions' 
      });
    }
    
    await db('accounts')
      .where({ id: accountId, company_id: companyId })
      .update({ is_active: false, updated_at: new Date() });
    
    res.json({ message: 'Account deactivated successfully' });
  } catch (error) {
    logger.error('Error deactivating account:', error);
    res.status(500).json({ error: 'Failed to deactivate account' });
  }
};

export const getAccountCategories = async (req: AuthRequest, res: Response) => {
  try {
    const categories = await db('account_categories')
      .join('account_types', 'account_categories.account_type_id', 'account_types.id')
      .where('account_categories.is_active', true)
      .select(
        'account_categories.*',
        'account_types.name as type_name',
        'account_types.code as type_code',
        'account_types.normal_balance'
      )
      .orderBy([
        { column: 'account_types.code', order: 'asc' },
        { column: 'account_categories.sort_order', order: 'asc' }
      ]);
    
    res.json({ categories });
  } catch (error) {
    logger.error('Error fetching account categories:', error);
    res.status(500).json({ error: 'Failed to fetch account categories' });
  }
};