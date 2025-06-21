import { Response } from 'express';
import { validationResult } from 'express-validator';
import { AuthRequest } from '@/types';
import db from '@/config/database';
import logger from '@/utils/logger';

export const getVendors = async (req: AuthRequest, res: Response) => {
  try {
    const companyId = req.params.companyId;
    const { 
      page = 1, 
      limit = 50, 
      search,
      is_active = 'true',
      is_1099_vendor
    } = req.query;
    
    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);
    
    let query = db('vendors')
      .where('company_id', companyId)
      .select('*')
      .orderBy('name', 'asc')
      .limit(parseInt(limit as string))
      .offset(offset);
    
    if (is_active !== 'all') {
      query = query.where('is_active', is_active === 'true');
    }
    
    if (is_1099_vendor !== undefined) {
      query = query.where('is_1099_vendor', is_1099_vendor === 'true');
    }
    
    if (search) {
      query = query.where(function() {
        this.where('name', 'ilike', `%${search}%`)
          .orWhere('company_name', 'ilike', `%${search}%`)
          .orWhere('email', 'ilike', `%${search}%`)
          .orWhere('vendor_number', 'ilike', `%${search}%`);
      });
    }
    
    const vendors = await query;
    
    // Get total count for pagination
    let countQuery = db('vendors')
      .where('company_id', companyId)
      .count('* as total');
    
    if (is_active !== 'all') {
      countQuery = countQuery.where('is_active', is_active === 'true');
    }
    
    if (is_1099_vendor !== undefined) {
      countQuery = countQuery.where('is_1099_vendor', is_1099_vendor === 'true');
    }
    
    if (search) {
      countQuery = countQuery.where(function() {
        this.where('name', 'ilike', `%${search}%`)
          .orWhere('company_name', 'ilike', `%${search}%`)
          .orWhere('email', 'ilike', `%${search}%`)
          .orWhere('vendor_number', 'ilike', `%${search}%`);
      });
    }
    
    const [{ total }] = await countQuery;
    
    res.json({
      vendors,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total: parseInt(total as string),
        pages: Math.ceil(parseInt(total as string) / parseInt(limit as string))
      }
    });
  } catch (error) {
    logger.error('Error fetching vendors:', error);
    res.status(500).json({ error: 'Failed to fetch vendors' });
  }
};

export const getVendor = async (req: AuthRequest, res: Response) => {
  try {
    const { companyId, vendorId } = req.params;
    
    const vendor = await db('vendors')
      .where({ id: vendorId, company_id: companyId })
      .first();
    
    if (!vendor) {
      return res.status(404).json({ error: 'Vendor not found' });
    }
    
    // Get vendor's bill summary
    const billSummary = await db('bills')
      .where({ vendor_id: vendorId })
      .select(
        db.raw('COUNT(*) as total_bills'),
        db.raw('SUM(total_amount) as total_billed'),
        db.raw('SUM(amount_due) as total_outstanding'),
        db.raw('SUM(amount_paid) as total_paid')
      )
      .first();
    
    // Get recent bills
    const recentBills = await db('bills')
      .where({ vendor_id: vendorId })
      .select('*')
      .orderBy('bill_date', 'desc')
      .limit(5);
    
    // Get YTD payments for 1099 tracking
    let ytdPayments = 0;
    if (vendor.is_1099_vendor) {
      const currentYear = new Date().getFullYear();
      const paymentsResult = await db('payments')
        .where({ entity_id: vendorId, type: 'vendor_payment' })
        .whereRaw('EXTRACT(YEAR FROM payment_date) = ?', [currentYear])
        .sum('amount as total')
        .first();
      
      ytdPayments = parseFloat(paymentsResult?.total || '0');
    }
    
    res.json({
      vendor,
      summary: billSummary,
      recent_bills: recentBills,
      ytd_payments: ytdPayments
    });
  } catch (error) {
    logger.error('Error fetching vendor:', error);
    res.status(500).json({ error: 'Failed to fetch vendor' });
  }
};

export const createVendor = async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const companyId = req.params.companyId;
    const vendorData = req.body;
    
    // Generate vendor number
    const lastVendor = await db('vendors')
      .where('company_id', companyId)
      .orderBy('vendor_number', 'desc')
      .first();
    
    const nextNumber = lastVendor 
      ? parseInt(lastVendor.vendor_number.replace(/\D/g, '')) + 1 
      : 1;
    
    const vendorNumber = `VEND-${nextNumber.toString().padStart(4, '0')}`;
    
    // Check for duplicate email
    if (vendorData.email) {
      const existingVendor = await db('vendors')
        .where({ company_id: companyId, email: vendorData.email })
        .first();
      
      if (existingVendor) {
        return res.status(400).json({ error: 'Vendor with this email already exists' });
      }
    }
    
    const [vendor] = await db('vendors').insert({
      ...vendorData,
      company_id: companyId,
      vendor_number: vendorNumber
    }).returning('*');
    
    res.status(201).json({
      message: 'Vendor created successfully',
      vendor
    });
  } catch (error) {
    logger.error('Error creating vendor:', error);
    res.status(500).json({ error: 'Failed to create vendor' });
  }
};

export const updateVendor = async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const { companyId, vendorId } = req.params;
    const updateData = req.body;
    
    const vendor = await db('vendors')
      .where({ id: vendorId, company_id: companyId })
      .first();
    
    if (!vendor) {
      return res.status(404).json({ error: 'Vendor not found' });
    }
    
    // Check for duplicate email if email is being updated
    if (updateData.email && updateData.email !== vendor.email) {
      const existingVendor = await db('vendors')
        .where({ company_id: companyId, email: updateData.email })
        .whereNot('id', vendorId)
        .first();
      
      if (existingVendor) {
        return res.status(400).json({ error: 'Vendor with this email already exists' });
      }
    }
    
    const [updatedVendor] = await db('vendors')
      .where({ id: vendorId, company_id: companyId })
      .update({
        ...updateData,
        updated_at: new Date()
      })
      .returning('*');
    
    res.json({
      message: 'Vendor updated successfully',
      vendor: updatedVendor
    });
  } catch (error) {
    logger.error('Error updating vendor:', error);
    res.status(500).json({ error: 'Failed to update vendor' });
  }
};

export const deactivateVendor = async (req: AuthRequest, res: Response) => {
  try {
    const { companyId, vendorId } = req.params;
    
    const vendor = await db('vendors')
      .where({ id: vendorId, company_id: companyId })
      .first();
    
    if (!vendor) {
      return res.status(404).json({ error: 'Vendor not found' });
    }
    
    // Check for outstanding bills
    const outstandingBills = await db('bills')
      .where({ vendor_id: vendorId })
      .where('amount_due', '>', 0)
      .count('* as count')
      .first();
    
    if (parseInt(outstandingBills?.count as string) > 0) {
      return res.status(400).json({ 
        error: 'Cannot deactivate vendor with outstanding bills' 
      });
    }
    
    await db('vendors')
      .where({ id: vendorId, company_id: companyId })
      .update({ is_active: false, updated_at: new Date() });
    
    res.json({ message: 'Vendor deactivated successfully' });
  } catch (error) {
    logger.error('Error deactivating vendor:', error);
    res.status(500).json({ error: 'Failed to deactivate vendor' });
  }
};

export const getVendorBills = async (req: AuthRequest, res: Response) => {
  try {
    const { companyId, vendorId } = req.params;
    const { 
      page = 1, 
      limit = 20,
      status 
    } = req.query;
    
    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);
    
    // Verify vendor exists and belongs to company
    const vendor = await db('vendors')
      .where({ id: vendorId, company_id: companyId })
      .first();
    
    if (!vendor) {
      return res.status(404).json({ error: 'Vendor not found' });
    }
    
    let query = db('bills')
      .where({ vendor_id: vendorId })
      .select('*')
      .orderBy('bill_date', 'desc')
      .limit(parseInt(limit as string))
      .offset(offset);
    
    if (status) {
      query = query.where('status', status);
    }
    
    const bills = await query;
    
    // Get total count
    let countQuery = db('bills')
      .where({ vendor_id: vendorId })
      .count('* as total');
    
    if (status) {
      countQuery = countQuery.where('status', status);
    }
    
    const [{ total }] = await countQuery;
    
    res.json({
      vendor: {
        id: vendor.id,
        name: vendor.name,
        vendor_number: vendor.vendor_number
      },
      bills,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total: parseInt(total as string),
        pages: Math.ceil(parseInt(total as string) / parseInt(limit as string))
      }
    });
  } catch (error) {
    logger.error('Error fetching vendor bills:', error);
    res.status(500).json({ error: 'Failed to fetch vendor bills' });
  }
};

export const getVendorBalance = async (req: AuthRequest, res: Response) => {
  try {
    const { companyId, vendorId } = req.params;
    
    const vendor = await db('vendors')
      .where({ id: vendorId, company_id: companyId })
      .first();
    
    if (!vendor) {
      return res.status(404).json({ error: 'Vendor not found' });
    }
    
    // Get aging report for this vendor
    const agingQuery = `
      SELECT 
        SUM(CASE WHEN due_date >= CURRENT_DATE THEN amount_due ELSE 0 END) as current_balance,
        SUM(CASE WHEN due_date < CURRENT_DATE AND due_date >= CURRENT_DATE - INTERVAL '30 days' THEN amount_due ELSE 0 END) as days_1_30,
        SUM(CASE WHEN due_date < CURRENT_DATE - INTERVAL '30 days' AND due_date >= CURRENT_DATE - INTERVAL '60 days' THEN amount_due ELSE 0 END) as days_31_60,
        SUM(CASE WHEN due_date < CURRENT_DATE - INTERVAL '60 days' AND due_date >= CURRENT_DATE - INTERVAL '90 days' THEN amount_due ELSE 0 END) as days_61_90,
        SUM(CASE WHEN due_date < CURRENT_DATE - INTERVAL '90 days' THEN amount_due ELSE 0 END) as days_over_90,
        SUM(amount_due) as total_outstanding
      FROM bills 
      WHERE vendor_id = ? AND amount_due > 0
    `;
    
    const [aging] = await db.raw(agingQuery, [vendorId]);
    
    res.json({
      vendor: {
        id: vendor.id,
        name: vendor.name,
        vendor_number: vendor.vendor_number,
        payment_terms: vendor.payment_terms,
        is_1099_vendor: vendor.is_1099_vendor
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
    logger.error('Error fetching vendor balance:', error);
    res.status(500).json({ error: 'Failed to fetch vendor balance' });
  }
};

export const get1099Report = async (req: AuthRequest, res: Response) => {
  try {
    const companyId = req.params.companyId;
    const { year = new Date().getFullYear() } = req.query;
    
    // Get all 1099 vendors with payments for the year
    const vendors1099 = await db('vendors')
      .where({ company_id: companyId, is_1099_vendor: true, is_active: true })
      .select('*');
    
    const reportData = await Promise.all(
      vendors1099.map(async (vendor) => {
        const paymentsResult = await db('payments')
          .where({ entity_id: vendor.id, type: 'vendor_payment' })
          .whereRaw('EXTRACT(YEAR FROM payment_date) = ?', [year])
          .sum('amount as total_payments')
          .first();
        
        const totalPayments = parseFloat(paymentsResult?.total_payments || '0');
        
        return {
          vendor_id: vendor.id,
          vendor_name: vendor.name,
          vendor_number: vendor.vendor_number,
          tax_id: vendor.tax_id,
          address: vendor.address,
          city: vendor.city,
          state: vendor.state,
          zip: vendor.zip,
          total_payments: totalPayments,
          requires_1099: totalPayments >= 600 // IRS threshold
        };
      })
    );
    
    res.json({
      year: parseInt(year as string),
      total_vendors: reportData.length,
      vendors_requiring_1099: reportData.filter(v => v.requires_1099).length,
      total_1099_amount: reportData.reduce((sum, v) => sum + (v.requires_1099 ? v.total_payments : 0), 0),
      vendors: reportData
    });
  } catch (error) {
    logger.error('Error generating 1099 report:', error);
    res.status(500).json({ error: 'Failed to generate 1099 report' });
  }
};