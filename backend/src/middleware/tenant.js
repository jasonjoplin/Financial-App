const jwt = require('jsonwebtoken');

// Tenant middleware to extract and validate tenant context
const tenantMiddleware = (req, res, next) => {
  try {
    // Skip tenant validation for auth endpoints
    if (req.path.includes('/auth/') || req.path === '/health') {
      return next();
    }

    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'Access token required' });
    }

    const payload = jwt.verify(token, process.env.JWT_SECRET);
    
    if (!payload.company_id) {
      return res.status(401).json({ error: 'Invalid token: missing tenant information' });
    }

    // Attach tenant context to request
    req.tenant = {
      userId: payload.user_id,
      companyId: payload.company_id,
      email: payload.email
    };

    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

module.exports = tenantMiddleware;