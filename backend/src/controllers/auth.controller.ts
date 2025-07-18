import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { hashPassword, verifyPassword, generateToken } from '@/utils/auth';
import { LoginRequest, RegisterRequest, JWTPayload } from '@/types';
import db from '@/config/database';
import logger from '@/utils/logger';
import ChartOfAccountsService from '@/services/chartOfAccounts.service';

export const register = async (req: Request<{}, {}, RegisterRequest>, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password, first_name, last_name, phone, company_name } = req.body;

    // Check if user already exists
    const existingUser = await db('users').where({ email }).first();
    if (existingUser) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    // Start transaction
    const result = await db.transaction(async (trx) => {
      // Create user
      const hashedPassword = await hashPassword(password);
      const [user] = await trx('users').insert({
        email,
        password_hash: hashedPassword,
        first_name,
        last_name,
        phone,
        role: 'user'
      }).returning('*');

      // Create company
      const [company] = await trx('companies').insert({
        name: company_name,
        accounting_method: 'accrual',
        base_currency: 'USD'
      }).returning('*');

      // Link user to company as owner
      await trx('user_companies').insert({
        user_id: user.id,
        company_id: company.id,
        role: 'owner'
      });

      return { user, company };
    });

    // Set up default chart of accounts
    const chartResult = await ChartOfAccountsService.setupDefaultChartOfAccounts(result.company.id);
    if (!chartResult.success) {
      logger.warn(`Failed to create default chart of accounts for company ${result.company.id}: ${chartResult.error}`);
    }

    // Generate JWT token
    const payload: JWTPayload = {
      user_id: result.user.id,
      email: result.user.email,
      role: result.user.role,
      company_id: result.company.id
    };
    const token = generateToken(payload);

    // Remove password hash from response
    const { password_hash, ...userResponse } = result.user;

    return res.status(201).json({
      message: 'User registered successfully',
      user: userResponse,
      company: result.company,
      token
    });
  } catch (error) {
    logger.error('Registration error:', error);
    return res.status(500).json({ error: 'Registration failed' });
  }
};

export const login = async (req: Request<{}, {}, LoginRequest>, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    // Find user
    const user = await db('users')
      .where({ email, is_active: true })
      .first();

    if (!user || !(await verifyPassword(password, user.password_hash))) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Get user's primary company
    const userCompany = await db('user_companies')
      .join('companies', 'user_companies.company_id', 'companies.id')
      .where({
        'user_companies.user_id': user.id,
        'user_companies.is_active': true,
        'companies.is_active': true
      })
      .select('companies.*', 'user_companies.role as user_role')
      .first();

    // Generate JWT token
    const payload: JWTPayload = {
      user_id: user.id,
      email: user.email,
      role: user.role,
      company_id: userCompany?.id
    };
    const token = generateToken(payload);

    // Update last login
    await db('users')
      .where({ id: user.id })
      .update({ last_login_at: new Date() });

    // Remove password hash from response
    const { password_hash, ...userResponse } = user;

    return res.json({
      message: 'Login successful',
      user: userResponse,
      company: userCompany || null,
      token
    });
  } catch (error) {
    logger.error('Login error:', error);
    return res.status(500).json({ error: 'Login failed' });
  }
};

export const getProfile = async (req: any, res: Response) => {
  try {
    const user = req.user;
    const { password_hash, ...userResponse } = user;
    
    // Get user's companies
    const companies = await db('user_companies')
      .join('companies', 'user_companies.company_id', 'companies.id')
      .where({
        'user_companies.user_id': user.id,
        'user_companies.is_active': true,
        'companies.is_active': true
      })
      .select('companies.*', 'user_companies.role as user_role');

    res.json({
      user: userResponse,
      companies
    });
  } catch (error) {
    logger.error('Get profile error:', error);
    res.status(500).json({ error: 'Failed to get profile' });
  }
};

export const logout = (req: Request, res: Response) => {
  // Since we're using stateless JWT, logout is handled client-side
  res.json({ message: 'Logged out successfully' });
};