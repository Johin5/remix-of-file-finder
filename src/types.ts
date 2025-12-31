export type TransactionType = 'income' | 'expense' | 'transfer';
export type AccountType = 'cash' | 'bank' | 'credit' | 'savings';
export type BudgetPeriod = 'monthly' | 'yearly';
export type RecurrenceRule = 'daily' | 'weekly' | 'monthly';
export type ThemeMode = 'light' | 'dark';

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  currency: string;
  current_balance: number;
  color: string;
  credit_limit?: number;
}

export interface Category {
  id: string;
  name: string;
  type: 'income' | 'expense';
  icon: string;
  color: string;
  parent_category_id?: string | null;
}

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  currency: string;
  date: string;
  account_id: string;
  to_account_id?: string;
  category_id: string;
  payee?: string;
  notes?: string;
  created_at: number;
  is_recurring?: boolean;
  recurrence_rule?: RecurrenceRule;
  parent_id?: string;
}

export interface Budget {
  id: string;
  category_id: string;
  period: BudgetPeriod;
  limit_amount: number;
}

export interface DateRange {
  start: Date;
  end: Date;
}

export interface AppSettings {
  userName: string;
  userAvatar?: string;
  monthlyStartDate: number;
  weeklyStartDay: string;
  themeColor: 'Premium Purple';
  themeMode: ThemeMode;
  currencySymbol: string;
}

export interface UserStreak {
  currentCount: number;
  longestCount: number;
  lastLogDate: string | null;
}
