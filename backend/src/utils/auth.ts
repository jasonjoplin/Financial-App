import jwt, { SignOptions } from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { JWTPayload } from '@/types';

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';
const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || '12');

export const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
};

export const verifyPassword = async (password: string, hash: string): Promise<boolean> => {
  return bcrypt.compare(password, hash);
};

export const generateToken = (payload: JWTPayload): string => {
  const expiresIn = /^[0-9]+$/.test(JWT_EXPIRES_IN)
    ? parseInt(JWT_EXPIRES_IN, 10)
    : JWT_EXPIRES_IN;

  const options: SignOptions = {
    expiresIn: expiresIn as any,
  };
  return jwt.sign(payload, JWT_SECRET, options);
};

export const verifyToken = (token: string): JWTPayload => {
  return jwt.verify(token, JWT_SECRET) as JWTPayload;
};

export const generatePasswordResetToken = (): string => {
  return jwt.sign({ type: 'password_reset' }, JWT_SECRET, { expiresIn: '1h' });
};

export const verifyPasswordResetToken = (token: string): boolean => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    return decoded.type === 'password_reset';
  } catch {
    return false;
  }
};