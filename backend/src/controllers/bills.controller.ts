import { Response } from 'express';
import { validationResult } from 'express-validator';
import { AuthRequest } from '@/types';
import db from '@/config/database';
import AccountingService from '@/services/accounting.service';
import ChartOfAccountsService from '@/services/chartOfAccounts.service';
import logger from '@/utils/logger';

export const getBills = async (req: AuthRequest, res: Response) => {
  try {
    const companyId = req.params.companyId;
    const { 
      page = 1, 
      limit = 50, 
      status,
      vendor_id,
      from_date,
      to_date,
      overdue_only = 'false'
    } = req.query;
    
    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);
    
    let query = db('bills')
      .join('vendors', 'bills.vendor_id', 'vendors.id')
      .where('bills.company_id', companyId)
      .select(
        'bills.*',
        'vendors.name as vendor_name',
        'vendors.vendor_number'
      )
      .orderBy('bills.bill_date', 'desc')
      .limit(parseInt(limit as string))
      .offset(offset);
    
    // Apply filters
    if (status) {
      query = query.where('bills.status', status);
    }
    
    if (vendor_id) {
      query = query.where('bills.vendor_id', vendor_id);
    }
    
    if (from_date) {
      query = query.where('bills.bill_date', '>=', from_date);
    }
    
    if (to_date) {
      query = query.where('bills.bill_date', '<=', to_date);
    }
    
    if (overdue_only === 'true') {
      query = query.where('bills.due_date', '<', new Date())
        .where('bills.amount_due', '>', 0);
    }
    
    const bills = await query;
    
    // Get total count for pagination
    let countQuery = db('bills')
      .where('company_id', companyId)
      .count('* as total');
    
    if (status) countQuery = countQuery.where('status', status);
    if (vendor_id) countQuery = countQuery.where('vendor_id', vendor_id);
    if (from_date) countQuery = countQuery.where('bill_date', '>=', from_date);
    if (to_date) countQuery = countQuery.where('bill_date', '<=', to_date);
    if (overdue_only === 'true') {
      countQuery = countQuery.where('due_date', '<', new Date())
        .where('amount_due', '>', 0);
    }
    
    const [{ total }] = await countQuery;
    
    res.json({
      bills,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total: parseInt(total as string),
        pages: Math.ceil(parseInt(total as string) / parseInt(limit as string))
      }
    });
  } catch (error) {
    logger.error('Error fetching bills:', error);
    res.status(500).json({ error: 'Failed to fetch bills' });
  }
};

export const getBill = async (req: AuthRequest, res: Response) => {
  try {
    const { companyId, billId } = req.params;
    
    const bill = await db('bills')
      .join('vendors', 'bills.vendor_id', 'vendors.id')
      .where('bills.id', billId)
      .where('bills.company_id', companyId)
      .select(
        'bills.*',
        'vendors.name as vendor_name',
        'vendors.vendor_number',
        'vendors.email as vendor_email',
        'vendors.address as vendor_address',
        'vendors.payment_terms'
      )
      .first();
    
    if (!bill) {
      return res.status(404).json({ error: 'Bill not found' });
    }
    
    // Get associated transaction if exists
    let transaction = null;
    if (bill.transaction_id) {
      transaction = await db('transactions')
        .where('id', bill.transaction_id)
        .first();
    }
    
    res.json({
      bill,
      transaction
    });
  } catch (error) {
    logger.error('Error fetching bill:', error);
    res.status(500).json({ error: 'Failed to fetch bill' });
  }
};

export const createBill = async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const companyId = req.params.companyId;
    const userId = req.user?.id;
    const {
      vendor_id,
      bill_number,
      bill_date,
      due_date,
      description,
      line_items,
      expense_account_id,
      tax_rate = 0,
      create_transaction = true
    } = req.body;
    
    // Validate vendor exists
    const vendor = await db('vendors')
      .where({ id: vendor_id, company_id: companyId })
      .first();
    
    if (!vendor) {
      return res.status(400).json({ error: 'Vendor not found' });
    }
    
    // Calculate totals
    const subtotal = line_items.reduce((sum: number, item: any) => 
      sum + (item.quantity * item.unit_price), 0);
    const taxAmount = subtotal * (tax_rate / 100);
    const totalAmount = subtotal + taxAmount;
    
    // Generate reference number if not provided
    const referenceNumber = bill_number || `BILL-${Date.now()}`;
    
    const result = await db.transaction(async (trx) => {
      // Create bill
      const [bill] = await trx('bills').insert({
        company_id: companyId,
        vendor_id,
        bill_number,
        reference_number: referenceNumber,
        bill_date: new Date(bill_date),
        due_date: new Date(due_date),
        description,
        subtotal,
        tax_amount: taxAmount,
        total_amount: totalAmount,
        amount_due: totalAmount,
        status: 'draft'
      }).returning('*');
      
      let transaction = null;
      
      // Create accounting transaction if requested
      if (create_transaction) {
        const systemAccounts = await ChartOfAccountsService.getSystemAccounts(companyId);
        
        if (!systemAccounts['2000']) {
          throw new Error('Accounts Payable account not found');
        }
        
        // Use provided expense account or default office expense
        let expenseAccount;
        if (expense_account_id) {
          expenseAccount = await trx('accounts')
            .where({ id: expense_account_id, company_id: companyId })
            .first();
        } else {
          expenseAccount = await trx('accounts')
            .where({ company_id: companyId, name: 'Office Expense' })
            .first();
        }
        
        if (!expenseAccount) {
          throw new Error('Expense account not found');
        }
        
        const journalEntries = [
          {
            account_id: expenseAccount.id, // Expense Account
            debit_amount: subtotal,
            credit_amount: 0,
            description: `${description || 'Bill'} from ${vendor.name}`
          },
          {
            account_id: systemAccounts['2000'].id, // Accounts Payable
            debit_amount: 0,
            credit_amount: totalAmount,
            description: `Bill ${referenceNumber} - ${vendor.name}`,
            entity_id: vendor_id,
            entity_type: 'vendor'
          }
        ];
        
        // Add tax entry if applicable
        if (taxAmount > 0) {
          const taxExpenseAccount = await trx('accounts')
            .where({ company_id: companyId, name: 'Tax Expense' })
            .first();
          
          if (taxExpenseAccount) {
            journalEntries[0].debit_amount = subtotal; // Keep expense amount as subtotal
            journalEntries.push({
              account_id: taxExpenseAccount.id,
              debit_amount: taxAmount,
              credit_amount: 0,
              description: `Tax on bill ${referenceNumber}`
            });
          }
        }
        
        const transactionData = {
          company_id: companyId,
          transaction_date: new Date(bill_date),
          description: `Bill ${referenceNumber} - ${vendor.name}`,
          type: 'journal_entry' as const,
          entries: journalEntries,
          created_by: userId,
          reference: referenceNumber
        };
        
        const transactionResult = await AccountingService.createTransaction(transactionData);
        
        if (transactionResult.success) {
          transaction = transactionResult.transaction?.transaction;
          
          // Link transaction to bill
          await trx('bills')
            .where('id', bill.id)
            .update({ transaction_id: transaction.id });
        }
      }
      
      return { bill, transaction };
    });
    
    res.status(201).json({
      message: 'Bill created successfully',
      bill: result.bill,
      transaction: result.transaction
    });
  } catch (error) {
    logger.error('Error creating bill:', error);
    res.status(500).json({ error: 'Failed to create bill' });
  }
};

export const updateBill = async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const { companyId, billId } = req.params;
    const updateData = req.body;
    
    const bill = await db('bills')
      .where({ id: billId, company_id: companyId })
      .first();
    
    if (!bill) {
      return res.status(404).json({ error: 'Bill not found' });
    }
    
    if (bill.status === 'paid') {
      return res.status(400).json({ error: 'Cannot modify paid bill' });
    }
    
    // Recalculate totals if line items changed
    if (updateData.line_items) {
      const subtotal = updateData.line_items.reduce((sum: number, item: any) => 
        sum + (item.quantity * item.unit_price), 0);
      const taxAmount = subtotal * ((updateData.tax_rate || 0) / 100);
      const totalAmount = subtotal + taxAmount;
      
      updateData.subtotal = subtotal;
      updateData.tax_amount = taxAmount;
      updateData.total_amount = totalAmount;
      
      // Update amount due if no payments made
      if (bill.amount_paid === 0) {
        updateData.amount_due = totalAmount;
      } else {
        updateData.amount_due = totalAmount - bill.amount_paid;
      }
    }
    
    const [updatedBill] = await db('bills')
      .where({ id: billId, company_id: companyId })
      .update({
        ...updateData,
        updated_at: new Date()
      })
      .returning('*');
    
    res.json({
      message: 'Bill updated successfully',
      bill: updatedBill
    });
  } catch (error) {
    logger.error('Error updating bill:', error);
    res.status(500).json({ error: 'Failed to update bill' });
  }
};

export const approveBill = async (req: AuthRequest, res: Response) => {
  try {
    const { companyId, billId } = req.params;
    const userId = req.user?.id;
    
    const bill = await db('bills')
      .where({ id: billId, company_id: companyId })
      .first();
    
    if (!bill) {
      return res.status(404).json({ error: 'Bill not found' });
    }
    
    if (bill.status !== 'pending') {
      return res.status(400).json({ error: 'Only pending bills can be approved' });
    }
    
    await db('bills')
      .where({ id: billId, company_id: companyId })
      .update({ 
        status: 'approved',
        approved_at: new Date(),
        updated_at: new Date()
      });
    
    res.json({ message: 'Bill approved successfully' });
  } catch (error) {
    logger.error('Error approving bill:', error);
    res.status(500).json({ error: 'Failed to approve bill' });
  }
};

export const voidBill = async (req: AuthRequest, res: Response) => {
  try {
    const { companyId, billId } = req.params;
    
    const bill = await db('bills')
      .where({ id: billId, company_id: companyId })
      .first();
    
    if (!bill) {
      return res.status(404).json({ error: 'Bill not found' });
    }
    
    if (bill.status === 'paid') {
      return res.status(400).json({ error: 'Cannot void paid bill' });
    }
    
    await db.transaction(async (trx) => {
      // Update bill status
      await trx('bills')
        .where({ id: billId, company_id: companyId })
        .update({ 
          status: 'void',
          amount_due: 0,
          updated_at: new Date()
        });
      
      // Void associated transaction if exists
      if (bill.transaction_id) {
        await trx('transactions')
          .where('id', bill.transaction_id)
          .update({ 
            status: 'void',
            updated_at: new Date()
          });
      }
    });
    
    res.json({ message: 'Bill voided successfully' });
  } catch (error) {
    logger.error('Error voiding bill:', error);
    res.status(500).json({ error: 'Failed to void bill' });
  }
};

export const getBillSummary = async (req: AuthRequest, res: Response) => {
  try {
    const companyId = req.params.companyId;
    
    const summary = await db('bills')
      .where('company_id', companyId)
      .select(
        db.raw('COUNT(*) as total_bills'),
        db.raw('SUM(total_amount) as total_amount'),
        db.raw('SUM(amount_due) as total_outstanding'),
        db.raw('SUM(amount_paid) as total_paid'),
        db.raw('COUNT(CASE WHEN status = \'draft\' THEN 1 END) as draft_count'),
        db.raw('COUNT(CASE WHEN status = \'pending\' THEN 1 END) as pending_count'),
        db.raw('COUNT(CASE WHEN status = \'approved\' THEN 1 END) as approved_count'),
        db.raw('COUNT(CASE WHEN status = \'paid\' THEN 1 END) as paid_count'),
        db.raw('COUNT(CASE WHEN due_date < CURRENT_DATE AND amount_due > 0 THEN 1 END) as overdue_count')
      )
      .first();
    
    res.json({
      summary: {
        total_bills: parseInt(summary.total_bills),
        total_amount: parseFloat(summary.total_amount || '0'),
        total_outstanding: parseFloat(summary.total_outstanding || '0'),
        total_paid: parseFloat(summary.total_paid || '0'),
        draft_count: parseInt(summary.draft_count || '0'),
        pending_count: parseInt(summary.pending_count || '0'),
        approved_count: parseInt(summary.approved_count || '0'),
        paid_count: parseInt(summary.paid_count || '0'),
        overdue_count: parseInt(summary.overdue_count || '0')
      }
    });
  } catch (error) {
    logger.error('Error fetching bill summary:', error);
    res.status(500).json({ error: 'Failed to fetch bill summary' });
  }
};