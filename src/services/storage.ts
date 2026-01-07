
import { Account, Budget, Category, Transaction, AppSettings, UserStreak } from '../types';
import { DEFAULT_ACCOUNTS, DEFAULT_CATEGORIES } from '../constants';

const KEYS = {
  TRANSACTIONS: 'pl_transactions',
  ACCOUNTS: 'pl_accounts',
  CATEGORIES: 'pl_categories',
  BUDGETS: 'pl_budgets',
  SETTINGS: 'pl_settings',
  STREAK: 'pl_streak',
};

const DEFAULT_SETTINGS: AppSettings = {
  userName: 'User',
  monthlyStartDate: 1,
  weeklyStartDay: 'Sunday',
  themeColor: 'Premium Purple',
  themeMode: 'light',
  currencySymbol: '₹',
};

const DEFAULT_STREAK: UserStreak = {
  currentCount: 0,
  longestCount: 0,
  lastLogDate: null,
};

export const StorageService = {
  getTransactions: (): Transaction[] => {
    const data = localStorage.getItem(KEYS.TRANSACTIONS);
    return data ? JSON.parse(data) : [];
  },
  
  saveTransactions: (transactions: Transaction[]) => {
    localStorage.setItem(KEYS.TRANSACTIONS, JSON.stringify(transactions));
  },

  getAccounts: (): Account[] => {
    const data = localStorage.getItem(KEYS.ACCOUNTS);
    return data ? JSON.parse(data) : DEFAULT_ACCOUNTS;
  },

  saveAccounts: (accounts: Account[]) => {
    localStorage.setItem(KEYS.ACCOUNTS, JSON.stringify(accounts));
  },

  getCategories: (): Category[] => {
    const data = localStorage.getItem(KEYS.CATEGORIES);
    return data ? JSON.parse(data) : DEFAULT_CATEGORIES;
  },

  saveCategories: (categories: Category[]) => {
    localStorage.setItem(KEYS.CATEGORIES, JSON.stringify(categories));
  },

  getBudgets: (): Budget[] => {
    const data = localStorage.getItem(KEYS.BUDGETS);
    return data ? JSON.parse(data) : [];
  },

  saveBudgets: (budgets: Budget[]) => {
    localStorage.setItem(KEYS.BUDGETS, JSON.stringify(budgets));
  },

  getSettings: (): AppSettings => {
    const data = localStorage.getItem(KEYS.SETTINGS);
    const parsed = data ? JSON.parse(data) : DEFAULT_SETTINGS;
    // Merge with default to ensure new fields (like currencySymbol) exist if not in storage
    return { ...DEFAULT_SETTINGS, ...parsed };
  },

  saveSettings: (settings: AppSettings) => {
    localStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings));
  },

  getStreak: (): UserStreak => {
    const data = localStorage.getItem(KEYS.STREAK);
    return data ? JSON.parse(data) : DEFAULT_STREAK;
  },

  saveStreak: (streak: UserStreak) => {
    localStorage.setItem(KEYS.STREAK, JSON.stringify(streak));
  }
};
