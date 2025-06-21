export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  role: 'admin' | 'accountant' | 'user';
  is_active: boolean;
  email_verified: boolean;
  email_verified_at?: Date;
  last_login_at?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface Company {
  id: string;
  name: string;
  legal_name?: string;
  tax_id?: string;
  business_type?: string;
  industry?: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  country: string;
  phone?: string;
  email?: string;
  website?: string;
  fiscal_year_end?: Date;
  accounting_method: 'cash' | 'accrual';
  base_currency: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface AuthRequest extends Request {
  user?: User;
  company?: Company;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  phone?: string;
  company_name: string;
}

export interface JWTPayload {
  user_id: string;
  email: string;
  role: string;
  company_id?: string;
}

export interface AccountType {
  id: string;
  name: string;
  code: string;
  description?: string;
  normal_balance: 'debit' | 'credit';
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface AccountCategory {
  id: string;
  account_type_id: string;
  name: string;
  code: string;
  description?: string;
  sort_order: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface Account {
  id: string;
  company_id: string;
  account_category_id: string;
  parent_account_id?: string;
  code: string;
  name: string;
  description?: string;
  normal_balance: 'debit' | 'credit';
  is_active: boolean;
  is_system_account: boolean;
  opening_balance: number;
  opening_balance_date?: Date;
  tax_settings?: any;
  created_at: Date;
  updated_at: Date;
}