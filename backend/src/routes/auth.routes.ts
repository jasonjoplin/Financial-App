import { Router } from 'express';
import { body } from 'express-validator';
import { register, login, getProfile, logout } from '@/controllers/auth.controller';
import { authenticate } from '@/middleware/auth';

const router = Router();

// Register validation rules
const registerValidation = [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('first_name').notEmpty().trim(),
  body('last_name').notEmpty().trim(),
  body('company_name').notEmpty().trim(),
  body('phone').optional().isMobilePhone('any')
];

// Login validation rules
const loginValidation = [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty()
];

// Routes
router.post('/register', registerValidation, register);
router.post('/login', loginValidation, login);
router.get('/profile', authenticate, getProfile);
router.post('/logout', logout);

export default router;