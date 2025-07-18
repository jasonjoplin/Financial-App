import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '@/utils/auth';
import { AuthRequest } from '@/types';
import db from '@/config/database';
import logger from '@/utils/logger';

export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'Access token required' });
    }

    const payload = verifyToken(token);
    
    const user = await db('users')
      .where({ id: payload.user_id, is_active: true })
      .first();
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid token or user not found' });
    }

    req.user = user;
    
    // Update last login
    await db('users')
      .where({ id: user.id })
      .update({ last_login_at: new Date() });
    
    return next();
  } catch (error) {
    logger.error('Authentication error:', error);
    return res.status(401).json({ error: 'Invalid token' });
  }
};

export const authorize = (roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    return next();
  };
};

export const requireCompany = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const companyId = req.params.companyId || req.body.company_id || req.query.company_id;
    
    if (!companyId) {
      return res.status(400).json({ error: 'Company ID required' });
    }

    // Check if user has access to this company
    const userCompany = await db('user_companies')
      .join('companies', 'user_companies.company_id', 'companies.id')
      .where({
        'user_companies.user_id': req.user.id,
        'user_companies.company_id': companyId,
        'user_companies.is_active': true,
        'companies.is_active': true
      })
      .select('companies.*', 'user_companies.role as user_role')
      .first();

    if (!userCompany) {
      return res.status(403).json({ error: 'Access to company denied' });
    }

    req.company = userCompany;
    return next();
  } catch (error) {
    logger.error('Company authorization error:', error);
    return res.status(500).json({ error: 'Authorization failed' });
  }
};