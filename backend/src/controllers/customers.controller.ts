import { Response } from 'express';
import { validationResult } from 'express-validator';
import { AuthRequest } from '@/types';
import db from '@/config/database';
import logger from '@/utils/logger';

export const getCustomers = async (req: AuthRequest, res: Response) => {
  try {
    const companyId = req.params.companyId;
    const { 
      page = 1, 
      limit = 50, 
      search,
      is_active = 'true'
    } = req.query;
    
    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);
    
    let query = db('customers')
      .where('company_id', companyId)
      .select('*')
      .orderBy('name', 'asc')
      .limit(parseInt(limit as string))
      .offset(offset);
    
    if (is_active !== 'all') {
      query = query.where('is_active', is_active === 'true');
    }
    
    if (search) {
      query = query.where(function() {
        this.where('name', 'ilike', `%${search}%`)
          .orWhere('company_name', 'ilike', `%${search}%`)
          .orWhere('email', 'ilike', `%${search}%`)
          .orWhere('customer_number', 'ilike', `%${search}%`);
      });
    }
    
    const customers = await query;
    
    // Get total count for pagination
    let countQuery = db('customers')
      .where('company_id', companyId)
      .count('* as total');
    
    if (is_active !== 'all') {
      countQuery = countQuery.where('is_active', is_active === 'true');
    }
    
    if (search) {
      countQuery = countQuery.where(function() {
        this.where('name', 'ilike', `%${search}%`)
          .orWhere('company_name', 'ilike', `%${search}%`)
          .orWhere('email', 'ilike', `%${search}%`)
          .orWhere('customer_number', 'ilike', `%${search}%`);
      });
    }
    
    const [{ total }] = await countQuery;
    
    res.json({
      customers,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total: parseInt(total as string),
        pages: Math.ceil(parseInt(total as string) / parseInt(limit as string))
      }
    });
  } catch (error) {
    logger.error('Error fetching customers:', error);
    res.status(500).json({ error: 'Failed to fetch customers' });
  }
};

export const getCustomer = async (req: AuthRequest, res: Response) => {
  try {
    const { companyId, customerId } = req.params;
    
    const customer = await db('customers')
      .where({ id: customerId, company_id: companyId })
      .first();
    
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    
    // Get customer's invoice summary
    const invoiceSummary = await db('invoices')
      .where({ customer_id: customerId })
      .select(
        db.raw('COUNT(*) as total_invoices'),
        db.raw('SUM(total_amount) as total_invoiced'),
        db.raw('SUM(amount_due) as total_outstanding'),
        db.raw('SUM(amount_paid) as total_paid')
      )
      .first();
    
    // Get recent invoices
    const recentInvoices = await db('invoices')
      .where({ customer_id: customerId })
      .select('*')
      .orderBy('invoice_date', 'desc')
      .limit(5);
    
    res.json({
      customer,
      summary: invoiceSummary,
      recent_invoices: recentInvoices
    });
  } catch (error) {
    logger.error('Error fetching customer:', error);
    res.status(500).json({ error: 'Failed to fetch customer' });
  }
};

export const createCustomer = async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const companyId = req.params.companyId;
    const customerData = req.body;
    
    // Generate customer number
    const lastCustomer = await db('customers')
      .where('company_id', companyId)
      .orderBy('customer_number', 'desc')
      .first();
    
    const nextNumber = lastCustomer 
      ? parseInt(lastCustomer.customer_number.replace(/\D/g, '')) + 1 
      : 1;
    
    const customerNumber = `CUST-${nextNumber.toString().padStart(4, '0')}`;
    
    // Check for duplicate email
    if (customerData.email) {
      const existingCustomer = await db('customers')
        .where({ company_id: companyId, email: customerData.email })
        .first();
      
      if (existingCustomer) {
        return res.status(400).json({ error: 'Customer with this email already exists' });
      }
    }
    
    const [customer] = await db('customers').insert({
      ...customerData,
      company_id: companyId,
      customer_number: customerNumber
    }).returning('*');
    
    res.status(201).json({
      message: 'Customer created successfully',
      customer
    });
  } catch (error) {
    logger.error('Error creating customer:', error);
    res.status(500).json({ error: 'Failed to create customer' });
  }
};

export const updateCustomer = async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const { companyId, customerId } = req.params;
    const updateData = req.body;
    
    const customer = await db('customers')
      .where({ id: customerId, company_id: companyId })
      .first();
    
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    
    // Check for duplicate email if email is being updated
    if (updateData.email && updateData.email !== customer.email) {
      const existingCustomer = await db('customers')
        .where({ company_id: companyId, email: updateData.email })
        .whereNot('id', customerId)
        .first();
      
      if (existingCustomer) {
        return res.status(400).json({ error: 'Customer with this email already exists' });
      }
    }
    
    const [updatedCustomer] = await db('customers')
      .where({ id: customerId, company_id: companyId })
      .update({
        ...updateData,
        updated_at: new Date()
      })
      .returning('*');
    
    res.json({
      message: 'Customer updated successfully',
      customer: updatedCustomer
    });
  } catch (error) {
    logger.error('Error updating customer:', error);
    res.status(500).json({ error: 'Failed to update customer' });
  }
};

export const deactivateCustomer = async (req: AuthRequest, res: Response) => {
  try {
    const { companyId, customerId } = req.params;
    
    const customer = await db('customers')
      .where({ id: customerId, company_id: companyId })
      .first();
    
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    
    // Check for outstanding invoices
    const outstandingInvoices = await db('invoices')
      .where({ customer_id: customerId })
      .where('amount_due', '>', 0)
      .count('* as count')
      .first();
    
    if (parseInt(outstandingInvoices?.count as string) > 0) {
      return res.status(400).json({ 
        error: 'Cannot deactivate customer with outstanding invoices' 
      });
    }
    
    await db('customers')
      .where({ id: customerId, company_id: companyId })
      .update({ is_active: false, updated_at: new Date() });
    
    res.json({ message: 'Customer deactivated successfully' });
  } catch (error) {
    logger.error('Error deactivating customer:', error);
    res.status(500).json({ error: 'Failed to deactivate customer' });
  }
};

export const getCustomerInvoices = async (req: AuthRequest, res: Response) => {
  try {
    const { companyId, customerId } = req.params;
    const { 
      page = 1, 
      limit = 20,
      status 
    } = req.query;
    
    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);
    
    // Verify customer exists and belongs to company
    const customer = await db('customers')
      .where({ id: customerId, company_id: companyId })
      .first();
    
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    
    let query = db('invoices')
      .where({ customer_id: customerId })
      .select('*')
      .orderBy('invoice_date', 'desc')
      .limit(parseInt(limit as string))
      .offset(offset);
    
    if (status) {
      query = query.where('status', status);
    }
    
    const invoices = await query;
    
    // Get total count
    let countQuery = db('invoices')
      .where({ customer_id: customerId })
      .count('* as total');
    
    if (status) {
      countQuery = countQuery.where('status', status);
    }
    
    const [{ total }] = await countQuery;
    
    res.json({
      customer: {
        id: customer.id,
        name: customer.name,
        customer_number: customer.customer_number
      },
      invoices,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total: parseInt(total as string),
        pages: Math.ceil(parseInt(total as string) / parseInt(limit as string))
      }
    });
  } catch (error) {
    logger.error('Error fetching customer invoices:', error);
    res.status(500).json({ error: 'Failed to fetch customer invoices' });
  }
};

export const getCustomerBalance = async (req: AuthRequest, res: Response) => {
  try {
    const { companyId, customerId } = req.params;
    
    const customer = await db('customers')
      .where({ id: customerId, company_id: companyId })
      .first();
    
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    
    // Get aging report for this customer
    const agingQuery = `
      SELECT 
        SUM(CASE WHEN due_date >= CURRENT_DATE THEN amount_due ELSE 0 END) as current_balance,
        SUM(CASE WHEN due_date < CURRENT_DATE AND due_date >= CURRENT_DATE - INTERVAL '30 days' THEN amount_due ELSE 0 END) as days_1_30,
        SUM(CASE WHEN due_date < CURRENT_DATE - INTERVAL '30 days' AND due_date >= CURRENT_DATE - INTERVAL '60 days' THEN amount_due ELSE 0 END) as days_31_60,
        SUM(CASE WHEN due_date < CURRENT_DATE - INTERVAL '60 days' AND due_date >= CURRENT_DATE - INTERVAL '90 days' THEN amount_due ELSE 0 END) as days_61_90,
        SUM(CASE WHEN due_date < CURRENT_DATE - INTERVAL '90 days' THEN amount_due ELSE 0 END) as days_over_90,
        SUM(amount_due) as total_outstanding
      FROM invoices 
      WHERE customer_id = ? AND amount_due > 0
    `;
    
    const [aging] = await db.raw(agingQuery, [customerId]);
    
    res.json({
      customer: {
        id: customer.id,
        name: customer.name,
        customer_number: customer.customer_number,
        credit_limit: customer.credit_limit
      },
      balance: aging || {
        current_balance: 0,
        days_1_30: 0,
        days_31_60: 0,
        days_61_90: 0,
        days_over_90: 0,
        total_outstanding: 0
      }
    });
  } catch (error) {
    logger.error('Error fetching customer balance:', error);
    res.status(500).json({ error: 'Failed to fetch customer balance' });
  }
};