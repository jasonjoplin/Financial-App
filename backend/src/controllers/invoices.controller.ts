import { Response } from 'express';
import { validationResult } from 'express-validator';
import { AuthRequest } from '@/types';
import db from '@/config/database';
import AccountingService from '@/services/accounting.service';
import ChartOfAccountsService from '@/services/chartOfAccounts.service';
import logger from '@/utils/logger';

export const getInvoices = async (req: AuthRequest, res: Response) => {
  try {
    const companyId = req.params.companyId;
    const { 
      page = 1, 
      limit = 50, 
      status,
      customer_id,
      from_date,
      to_date,
      overdue_only = 'false'
    } = req.query;
    
    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);
    
    let query = db('invoices')
      .join('customers', 'invoices.customer_id', 'customers.id')
      .where('invoices.company_id', companyId)
      .select(
        'invoices.*',
        'customers.name as customer_name',
        'customers.customer_number'
      )
      .orderBy('invoices.invoice_date', 'desc')
      .limit(parseInt(limit as string))
      .offset(offset);
    
    // Apply filters
    if (status) {
      query = query.where('invoices.status', status);
    }
    
    if (customer_id) {
      query = query.where('invoices.customer_id', customer_id);
    }
    
    if (from_date) {
      query = query.where('invoices.invoice_date', '>=', from_date);
    }
    
    if (to_date) {
      query = query.where('invoices.invoice_date', '<=', to_date);
    }
    
    if (overdue_only === 'true') {
      query = query.where('invoices.due_date', '<', new Date())
        .where('invoices.amount_due', '>', 0);
    }
    
    const invoices = await query;
    
    // Get total count for pagination
    let countQuery = db('invoices')
      .where('company_id', companyId)
      .count('* as total');
    
    if (status) countQuery = countQuery.where('status', status);
    if (customer_id) countQuery = countQuery.where('customer_id', customer_id);
    if (from_date) countQuery = countQuery.where('invoice_date', '>=', from_date);
    if (to_date) countQuery = countQuery.where('invoice_date', '<=', to_date);
    if (overdue_only === 'true') {
      countQuery = countQuery.where('due_date', '<', new Date())
        .where('amount_due', '>', 0);
    }
    
    const [{ total }] = await countQuery;
    
    res.json({
      invoices,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total: parseInt(total as string),
        pages: Math.ceil(parseInt(total as string) / parseInt(limit as string))
      }
    });
  } catch (error) {
    logger.error('Error fetching invoices:', error);
    res.status(500).json({ error: 'Failed to fetch invoices' });
  }
};

export const getInvoice = async (req: AuthRequest, res: Response) => {
  try {
    const { companyId, invoiceId } = req.params;
    
    const invoice = await db('invoices')
      .join('customers', 'invoices.customer_id', 'customers.id')
      .where('invoices.id', invoiceId)
      .where('invoices.company_id', companyId)
      .select(
        'invoices.*',
        'customers.name as customer_name',
        'customers.customer_number',
        'customers.email as customer_email',
        'customers.billing_address',
        'customers.billing_city',
        'customers.billing_state',
        'customers.billing_zip'
      )
      .first();
    
    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }
    
    // Get associated transaction if exists
    let transaction = null;
    if (invoice.transaction_id) {
      transaction = await db('transactions')
        .where('id', invoice.transaction_id)
        .first();
    }
    
    res.json({
      invoice,
      transaction
    });
  } catch (error) {
    logger.error('Error fetching invoice:', error);
    res.status(500).json({ error: 'Failed to fetch invoice' });
  }
};

export const createInvoice = async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const companyId = req.params.companyId;
    const userId = req.user?.id;
    const {
      customer_id,
      invoice_date,
      due_date,
      description,
      terms,
      line_items,
      tax_rate = 0,
      create_transaction = true
    } = req.body;
    
    // Validate customer exists
    const customer = await db('customers')
      .where({ id: customer_id, company_id: companyId })
      .first();
    
    if (!customer) {
      return res.status(400).json({ error: 'Customer not found' });
    }
    
    // Calculate totals
    const subtotal = line_items.reduce((sum: number, item: any) => 
      sum + (item.quantity * item.unit_price), 0);
    const taxAmount = subtotal * (tax_rate / 100);
    const totalAmount = subtotal + taxAmount;
    
    // Generate invoice number
    const lastInvoice = await db('invoices')
      .where('company_id', companyId)
      .orderBy('invoice_number', 'desc')
      .first();
    
    const nextNumber = lastInvoice 
      ? parseInt(lastInvoice.invoice_number.replace(/\D/g, '')) + 1 
      : 1;
    
    const invoiceNumber = `INV-${nextNumber.toString().padStart(6, '0')}`;
    
    const result = await db.transaction(async (trx) => {
      // Create invoice
      const [invoice] = await trx('invoices').insert({
        company_id: companyId,
        customer_id,
        invoice_number: invoiceNumber,
        invoice_date: new Date(invoice_date),
        due_date: new Date(due_date),
        description,
        terms,
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
        
        if (!systemAccounts['1100'] || !systemAccounts['4000']) {
          throw new Error('Required accounts not found (Accounts Receivable or Sales Revenue)');
        }
        
        const journalEntries = [
          {
            account_id: systemAccounts['1100'].id, // Accounts Receivable
            debit_amount: totalAmount,
            credit_amount: 0,
            description: `Invoice ${invoiceNumber} - ${customer.name}`,
            entity_id: customer_id,
            entity_type: 'customer'
          },
          {
            account_id: systemAccounts['4000'].id, // Sales Revenue
            debit_amount: 0,
            credit_amount: subtotal,
            description: `Sales revenue from invoice ${invoiceNumber}`
          }
        ];
        
        // Add tax entry if applicable
        if (taxAmount > 0) {
          const salesTaxAccount = await db('accounts')
            .where({ company_id: companyId, name: 'Sales Tax Payable' })
            .first();
          
          if (salesTaxAccount) {
            journalEntries.push({
              account_id: salesTaxAccount.id,
              debit_amount: 0,
              credit_amount: taxAmount,
              description: `Sales tax on invoice ${invoiceNumber}`
            });
          }
        }
        
        const transactionData = {
          company_id: companyId,
          transaction_date: new Date(invoice_date),
          description: `Invoice ${invoiceNumber} - ${customer.name}`,
          type: 'invoice' as const,
          entries: journalEntries,
          created_by: userId,
          reference: invoiceNumber
        };
        
        const transactionResult = await AccountingService.createTransaction(transactionData);
        
        if (transactionResult.success) {
          transaction = transactionResult.transaction?.transaction;
          
          // Link transaction to invoice
          await trx('invoices')
            .where('id', invoice.id)
            .update({ transaction_id: transaction.id });
        }
      }
      
      return { invoice, transaction };
    });
    
    res.status(201).json({
      message: 'Invoice created successfully',
      invoice: result.invoice,
      transaction: result.transaction
    });
  } catch (error) {
    logger.error('Error creating invoice:', error);
    res.status(500).json({ error: 'Failed to create invoice' });
  }
};

export const updateInvoice = async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const { companyId, invoiceId } = req.params;
    const updateData = req.body;
    
    const invoice = await db('invoices')
      .where({ id: invoiceId, company_id: companyId })
      .first();
    
    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }
    
    if (invoice.status === 'paid') {
      return res.status(400).json({ error: 'Cannot modify paid invoice' });
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
      if (invoice.amount_paid === 0) {
        updateData.amount_due = totalAmount;
      } else {
        updateData.amount_due = totalAmount - invoice.amount_paid;
      }
    }
    
    const [updatedInvoice] = await db('invoices')
      .where({ id: invoiceId, company_id: companyId })
      .update({
        ...updateData,
        updated_at: new Date()
      })
      .returning('*');
    
    res.json({
      message: 'Invoice updated successfully',
      invoice: updatedInvoice
    });
  } catch (error) {
    logger.error('Error updating invoice:', error);
    res.status(500).json({ error: 'Failed to update invoice' });
  }
};

export const sendInvoice = async (req: AuthRequest, res: Response) => {
  try {
    const { companyId, invoiceId } = req.params;
    
    const invoice = await db('invoices')
      .where({ id: invoiceId, company_id: companyId })
      .first();
    
    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }
    
    if (invoice.status !== 'draft') {
      return res.status(400).json({ error: 'Only draft invoices can be sent' });
    }
    
    // Update invoice status
    await db('invoices')
      .where({ id: invoiceId, company_id: companyId })
      .update({ 
        status: 'sent',
        sent_at: new Date(),
        updated_at: new Date()
      });
    
    // TODO: Implement email sending logic here
    
    res.json({ message: 'Invoice sent successfully' });
  } catch (error) {
    logger.error('Error sending invoice:', error);
    res.status(500).json({ error: 'Failed to send invoice' });
  }
};

export const voidInvoice = async (req: AuthRequest, res: Response) => {
  try {
    const { companyId, invoiceId } = req.params;
    
    const invoice = await db('invoices')
      .where({ id: invoiceId, company_id: companyId })
      .first();
    
    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }
    
    if (invoice.status === 'paid') {
      return res.status(400).json({ error: 'Cannot void paid invoice' });
    }
    
    await db.transaction(async (trx) => {
      // Update invoice status
      await trx('invoices')
        .where({ id: invoiceId, company_id: companyId })
        .update({ 
          status: 'void',
          amount_due: 0,
          updated_at: new Date()
        });
      
      // Void associated transaction if exists
      if (invoice.transaction_id) {
        await trx('transactions')
          .where('id', invoice.transaction_id)
          .update({ 
            status: 'void',
            updated_at: new Date()
          });
      }
    });
    
    res.json({ message: 'Invoice voided successfully' });
  } catch (error) {
    logger.error('Error voiding invoice:', error);
    res.status(500).json({ error: 'Failed to void invoice' });
  }
};

export const getInvoiceSummary = async (req: AuthRequest, res: Response) => {
  try {
    const companyId = req.params.companyId;
    
    const summary = await db('invoices')
      .where('company_id', companyId)
      .select(
        db.raw('COUNT(*) as total_invoices'),
        db.raw('SUM(total_amount) as total_amount'),
        db.raw('SUM(amount_due) as total_outstanding'),
        db.raw('SUM(amount_paid) as total_paid'),
        db.raw('COUNT(CASE WHEN status = \'draft\' THEN 1 END) as draft_count'),
        db.raw('COUNT(CASE WHEN status = \'sent\' THEN 1 END) as sent_count'),
        db.raw('COUNT(CASE WHEN status = \'overdue\' THEN 1 END) as overdue_count'),
        db.raw('COUNT(CASE WHEN status = \'paid\' THEN 1 END) as paid_count'),
        db.raw('COUNT(CASE WHEN due_date < CURRENT_DATE AND amount_due > 0 THEN 1 END) as past_due_count')
      )
      .first();
    
    res.json({
      summary: {
        total_invoices: parseInt(summary.total_invoices),
        total_amount: parseFloat(summary.total_amount || '0'),
        total_outstanding: parseFloat(summary.total_outstanding || '0'),
        total_paid: parseFloat(summary.total_paid || '0'),
        draft_count: parseInt(summary.draft_count || '0'),
        sent_count: parseInt(summary.sent_count || '0'),
        overdue_count: parseInt(summary.overdue_count || '0'),
        paid_count: parseInt(summary.paid_count || '0'),
        past_due_count: parseInt(summary.past_due_count || '0')
      }
    });
  } catch (error) {
    logger.error('Error fetching invoice summary:', error);
    res.status(500).json({ error: 'Failed to fetch invoice summary' });
  }
};