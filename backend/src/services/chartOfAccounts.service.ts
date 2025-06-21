import db from '@/config/database';
import logger from '@/utils/logger';

export interface DefaultAccount {
  code: string;
  name: string;
  description: string;
  category_code: string;
  is_system_account: boolean;
}

export class ChartOfAccountsService {
  // Standard chart of accounts based on GAAP
  static defaultAccounts: DefaultAccount[] = [
    // Assets - Current Assets (1000)
    { code: '1001', name: 'Cash', description: 'Cash on hand and in bank accounts', category_code: '1000', is_system_account: true },
    { code: '1010', name: 'Checking Account', description: 'Primary business checking account', category_code: '1000', is_system_account: true },
    { code: '1020', name: 'Savings Account', description: 'Business savings account', category_code: '1000', is_system_account: false },
    { code: '1100', name: 'Accounts Receivable', description: 'Money owed by customers', category_code: '1000', is_system_account: true },
    { code: '1150', name: 'Allowance for Doubtful Accounts', description: 'Estimated uncollectible receivables', category_code: '1000', is_system_account: false },
    { code: '1200', name: 'Inventory', description: 'Goods held for resale', category_code: '1000', is_system_account: false },
    { code: '1300', name: 'Prepaid Expenses', description: 'Expenses paid in advance', category_code: '1000', is_system_account: false },
    { code: '1400', name: 'Other Current Assets', description: 'Other short-term assets', category_code: '1000', is_system_account: false },
    
    // Assets - Fixed Assets (1500)
    { code: '1500', name: 'Equipment', description: 'Business equipment and machinery', category_code: '1500', is_system_account: false },
    { code: '1510', name: 'Accumulated Depreciation - Equipment', description: 'Depreciation on equipment', category_code: '1500', is_system_account: false },
    { code: '1600', name: 'Furniture & Fixtures', description: 'Office furniture and fixtures', category_code: '1500', is_system_account: false },
    { code: '1610', name: 'Accumulated Depreciation - Furniture', description: 'Depreciation on furniture', category_code: '1500', is_system_account: false },
    { code: '1700', name: 'Buildings', description: 'Real estate owned by business', category_code: '1500', is_system_account: false },
    { code: '1710', name: 'Accumulated Depreciation - Buildings', description: 'Depreciation on buildings', category_code: '1500', is_system_account: false },
    
    // Assets - Other Assets (1800)
    { code: '1800', name: 'Goodwill', description: 'Intangible asset goodwill', category_code: '1800', is_system_account: false },
    { code: '1900', name: 'Other Assets', description: 'Miscellaneous long-term assets', category_code: '1800', is_system_account: false },
    
    // Liabilities - Current Liabilities (2000)
    { code: '2000', name: 'Accounts Payable', description: 'Money owed to vendors', category_code: '2000', is_system_account: true },
    { code: '2100', name: 'Accrued Expenses', description: 'Expenses incurred but not yet paid', category_code: '2000', is_system_account: false },
    { code: '2200', name: 'Payroll Liabilities', description: 'Payroll taxes and withholdings', category_code: '2000', is_system_account: false },
    { code: '2300', name: 'Sales Tax Payable', description: 'Sales tax collected but not remitted', category_code: '2000', is_system_account: false },
    { code: '2400', name: 'Short-term Loans', description: 'Loans due within one year', category_code: '2000', is_system_account: false },
    
    // Liabilities - Long-term Liabilities (2500)
    { code: '2500', name: 'Long-term Debt', description: 'Loans and debt due after one year', category_code: '2500', is_system_account: false },
    { code: '2600', name: 'Mortgage Payable', description: 'Mortgage on real estate', category_code: '2500', is_system_account: false },
    
    // Equity - Owner's Equity (3000)
    { code: '3000', name: 'Owner\'s Equity', description: 'Owner\'s investment in the business', category_code: '3000', is_system_account: true },
    { code: '3100', name: 'Retained Earnings', description: 'Accumulated profits retained in business', category_code: '3000', is_system_account: true },
    { code: '3200', name: 'Owner\'s Draw', description: 'Money withdrawn by owner', category_code: '3000', is_system_account: false },
    
    // Revenue - Operating Revenue (4000)
    { code: '4000', name: 'Sales Revenue', description: 'Revenue from primary business activities', category_code: '4000', is_system_account: true },
    { code: '4100', name: 'Service Revenue', description: 'Revenue from services provided', category_code: '4000', is_system_account: false },
    { code: '4200', name: 'Sales Returns and Allowances', description: 'Returns and discounts given', category_code: '4000', is_system_account: false },
    
    // Revenue - Other Revenue (4500)
    { code: '4500', name: 'Interest Income', description: 'Interest earned on investments', category_code: '4500', is_system_account: false },
    { code: '4600', name: 'Other Income', description: 'Miscellaneous income', category_code: '4500', is_system_account: false },
    
    // Expenses - Cost of Goods Sold (5000)
    { code: '5000', name: 'Cost of Goods Sold', description: 'Direct cost of products sold', category_code: '5000', is_system_account: false },
    { code: '5100', name: 'Purchase Returns and Allowances', description: 'Returns and discounts received', category_code: '5000', is_system_account: false },
    
    // Expenses - Operating Expenses (6000)
    { code: '6000', name: 'Advertising Expense', description: 'Marketing and advertising costs', category_code: '6000', is_system_account: false },
    { code: '6100', name: 'Auto Expense', description: 'Vehicle related expenses', category_code: '6000', is_system_account: false },
    { code: '6200', name: 'Bank Fees', description: 'Banking fees and charges', category_code: '6000', is_system_account: false },
    { code: '6300', name: 'Depreciation Expense', description: 'Depreciation of fixed assets', category_code: '6000', is_system_account: false },
    { code: '6400', name: 'Insurance Expense', description: 'Business insurance premiums', category_code: '6000', is_system_account: false },
    { code: '6500', name: 'Legal & Professional Fees', description: 'Attorney and professional service fees', category_code: '6000', is_system_account: false },
    { code: '6600', name: 'Meals & Entertainment', description: 'Business meals and entertainment', category_code: '6000', is_system_account: false },
    { code: '6700', name: 'Office Expense', description: 'Office supplies and expenses', category_code: '6000', is_system_account: false },
    { code: '6800', name: 'Payroll Expense', description: 'Employee wages and salaries', category_code: '6000', is_system_account: false },
    { code: '6900', name: 'Rent Expense', description: 'Office and facility rent', category_code: '6000', is_system_account: false },
    { code: '6950', name: 'Repairs & Maintenance', description: 'Equipment and facility maintenance', category_code: '6000', is_system_account: false },
    { code: '6970', name: 'Telephone Expense', description: 'Phone and communication costs', category_code: '6000', is_system_account: false },
    { code: '6980', name: 'Travel Expense', description: 'Business travel costs', category_code: '6000', is_system_account: false },
    { code: '6990', name: 'Utilities Expense', description: 'Electricity, gas, water, internet', category_code: '6000', is_system_account: false },
    
    // Expenses - Other Expenses (7000)
    { code: '7000', name: 'Interest Expense', description: 'Interest paid on loans and debt', category_code: '7000', is_system_account: false },
    { code: '7100', name: 'Other Expense', description: 'Miscellaneous expenses', category_code: '7000', is_system_account: false }
  ];
  
  static async setupDefaultChartOfAccounts(companyId: string): Promise<{ success: boolean; accounts?: any[]; error?: string }> {
    try {
      // Get account categories with their IDs
      const categories = await db('account_categories')
        .select('id', 'code');
      
      const categoryMap = categories.reduce((map: any, cat) => {
        map[cat.code] = cat.id;
        return map;
      }, {});
      
      // Prepare accounts for insertion
      const accountsToInsert = this.defaultAccounts.map(account => {
        const categoryId = categoryMap[account.category_code];
        if (!categoryId) {
          throw new Error(`Category not found for code: ${account.category_code}`);
        }
        
        // Determine normal balance based on account type
        const categoryCode = account.category_code;
        let normalBalance: 'debit' | 'credit';
        
        if (categoryCode.startsWith('1') || categoryCode.startsWith('5') || categoryCode.startsWith('6') || categoryCode.startsWith('7')) {
          // Assets and Expenses are debit accounts
          normalBalance = 'debit';
        } else {
          // Liabilities, Equity, and Revenue are credit accounts
          normalBalance = 'credit';
        }
        
        return {
          company_id: companyId,
          account_category_id: categoryId,
          code: account.code,
          name: account.name,
          description: account.description,
          normal_balance: normalBalance,
          is_system_account: account.is_system_account,
          opening_balance: 0,
          is_active: true
        };
      });
      
      // Insert accounts
      const accounts = await db('accounts')
        .insert(accountsToInsert)
        .returning('*');
      
      logger.info(`Created ${accounts.length} default accounts for company ${companyId}`);
      
      return { success: true, accounts };
    } catch (error) {
      logger.error('Error setting up default chart of accounts:', error);
      return { success: false, error: 'Failed to create default accounts' };
    }
  }
  
  static async getAccountByCode(companyId: string, code: string): Promise<any> {
    try {
      return await db('accounts')
        .where({ company_id: companyId, code, is_active: true })
        .first();
    } catch (error) {
      logger.error('Error fetching account by code:', error);
      return null;
    }
  }
  
  static async getSystemAccounts(companyId: string): Promise<{ [key: string]: any }> {
    try {
      const systemAccounts = await db('accounts')
        .where({ 
          company_id: companyId, 
          is_system_account: true, 
          is_active: true 
        })
        .select('*');
      
      // Return as object keyed by account code
      return systemAccounts.reduce((acc: any, account) => {
        acc[account.code] = account;
        return acc;
      }, {});
    } catch (error) {
      logger.error('Error fetching system accounts:', error);
      return {};
    }
  }
}

export default ChartOfAccountsService;