
import { Category, Account } from './types';

export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'cat_1', name: 'Food & Dining', type: 'expense', icon: 'pizza', color: 'bg-violet-100 text-violet-600 dark:bg-violet-500/20 dark:text-violet-300' },
  { id: 'cat_2', name: 'Transport', type: 'expense', icon: 'car', color: 'bg-violet-100 text-violet-600 dark:bg-violet-500/20 dark:text-violet-300' },
  { id: 'cat_3', name: 'Shopping', type: 'expense', icon: 'shopping-bag', color: 'bg-violet-100 text-violet-600 dark:bg-violet-500/20 dark:text-violet-300' },
  { id: 'cat_4', name: 'Housing', type: 'expense', icon: 'home', color: 'bg-violet-100 text-violet-600 dark:bg-violet-500/20 dark:text-violet-300' },
  { id: 'cat_5', name: 'Salary', type: 'income', icon: 'banknote', color: 'bg-violet-600 text-white shadow-md shadow-violet-500/20' },
  { id: 'cat_6', name: 'Side Hustle', type: 'income', icon: 'laptop', color: 'bg-violet-600 text-white shadow-md shadow-violet-500/20' },
  { id: 'cat_7', name: 'Entertainment', type: 'expense', icon: 'film', color: 'bg-violet-100 text-violet-600 dark:bg-violet-500/20 dark:text-violet-300' },
  { id: 'cat_8', name: 'Health', type: 'expense', icon: 'activity', color: 'bg-violet-100 text-violet-600 dark:bg-violet-500/20 dark:text-violet-300' },
  { id: 'cat_transfer', name: 'Transfer', type: 'expense', icon: 'arrow-right-left', color: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400' }, 
];

export const DEFAULT_ACCOUNTS: Account[] = [
  { id: 'acc_1', name: 'Cash', type: 'cash', currency: 'INR', current_balance: 0, color: 'bg-violet-600' },
  { id: 'acc_2', name: 'Primary Bank', type: 'bank', currency: 'INR', current_balance: 0, color: 'bg-violet-700' },
  { id: 'acc_3', name: 'Savings', type: 'savings', currency: 'INR', current_balance: 0, color: 'bg-zinc-800' },
];

export const CURRENCIES = [
  { code: 'USD', symbol: '$', name: 'Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'Pound' },
  { code: 'JPY', symbol: '¥', name: 'Yen' },
  { code: 'INR', symbol: '₹', name: 'Rupee' },
  { code: 'CAD', symbol: 'C$', name: 'CAD' },
  { code: 'AUD', symbol: 'A$', name: 'AUD' },
  { code: 'CNY', symbol: '¥', name: 'Yuan' },
  { code: 'KRW', symbol: '₩', name: 'Won' },
  { code: 'BRL', symbol: 'R$', name: 'Real' },
  { code: 'IDR', symbol: 'Rp', name: 'Rupiah' },
  { code: 'VND', symbol: '₫', name: 'Dong' },
  { code: 'THB', symbol: '฿', name: 'Baht' },
  { code: 'PHP', symbol: '₱', name: 'Peso' },
];
