
import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Account, Budget, Category, Transaction, AppSettings, UserStreak } from '../types';
import { StorageService } from '../services/storage';
import { addDays, addWeeks, addMonths, isSameDay, subDays, format, differenceInCalendarDays } from 'date-fns';
import { getSeedData } from '../utils/seedData';

interface FinanceContextType {
  accounts: Account[];
  transactions: Transaction[];
  categories: Category[];
  budgets: Budget[];
  settings: AppSettings;
  streak: UserStreak;
  addTransaction: (transaction: Transaction) => void;
  updateTransaction: (transaction: Transaction) => void;
  deleteTransaction: (id: string) => void;
  addBudget: (budget: Budget) => void;
  addAccount: (account: Account) => void;
  updateAccount: (account: Account) => void;
  deleteAccount: (id: string) => void;
  getAccount: (id: string) => Account | undefined;
  getCategory: (id: string) => Category | undefined;
  updateSettings: (settings: Partial<AppSettings>) => void;
  addCategory: (category: Category) => void;
  updateCategory: (category: Category) => void;
  deleteCategory: (id: string) => void;
  resetData: () => void;
  // UI State
  isTransactionModalOpen: boolean;
  transactionModalDefault: Partial<Transaction> | null;
  openTransactionModal: (defaults?: Partial<Transaction>) => void;
  closeTransactionModal: () => void;
  // Streak Reward State
  showStreakReward: boolean;
  setShowStreakReward: (show: boolean) => void;
}

const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

export const FinanceProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [settings, setSettings] = useState<AppSettings>(StorageService.getSettings());
  const [streak, setStreak] = useState<UserStreak>(StorageService.getStreak());

  // UI State
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [transactionModalDefault, setTransactionModalDefault] = useState<Partial<Transaction> | null>(null);
  const [showStreakReward, setShowStreakReward] = useState(false);

  const openTransactionModal = (defaults?: Partial<Transaction>) => {
      setTransactionModalDefault(defaults || null);
      setIsTransactionModalOpen(true);
  };

  const closeTransactionModal = () => {
      setIsTransactionModalOpen(false);
      setTransactionModalDefault(null);
  };

  // Apply Theme
  useEffect(() => {
    const root = window.document.documentElement;
    if (settings.themeMode === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [settings.themeMode]);

  // Load initial data and generate recurring transactions
  useEffect(() => {
    let loadedAccounts = StorageService.getAccounts();
    let loadedTransactions = StorageService.getTransactions();
    let loadedCategories = StorageService.getCategories();
    let loadedBudgets = StorageService.getBudgets();
    const loadedSettings = StorageService.getSettings();
    const loadedStreak = StorageService.getStreak();

    // Streak Integrity Check on Load
    const today = new Date();
    const todayStr = format(today, 'yyyy-MM-dd');
    
    if (loadedStreak.lastLogDate && loadedStreak.lastLogDate !== todayStr) {
        // If last log was NOT yesterday and NOT today, streak is broken
        const lastLog = new Date(loadedStreak.lastLogDate);
        const diff = differenceInCalendarDays(today, lastLog);
        
        if (diff > 1) {
            loadedStreak.currentCount = 0;
            // We don't update lastLogDate yet, wait for user action
            StorageService.saveStreak(loadedStreak);
        }
    }
    setStreak(loadedStreak);

    // SEED DATA LOGIC: If no transactions exist, populate with demo data
    if (loadedTransactions.length === 0) {
        const seed = getSeedData();
        loadedAccounts = seed.accounts;
        loadedTransactions = seed.transactions;
        loadedBudgets = seed.budgets;
        // Keep categories as loaded default or seed, they are likely same
        
        // Save seed data immediately
        StorageService.saveAccounts(loadedAccounts);
        StorageService.saveTransactions(loadedTransactions);
        StorageService.saveBudgets(loadedBudgets);
        
        // Ensure currency symbol matches seed data context (USD) if it was default
        if(loadedSettings.currencySymbol === '₹') { // If default was Rupee, switch to USD for demo consistency
             loadedSettings.currencySymbol = '$';
             StorageService.saveSettings(loadedSettings);
        }
    }

    // Recurring Generation Logic
    const newTransactions: Transaction[] = [];
    const now = new Date();
    
    loadedTransactions.forEach(tx => {
       if (tx.is_recurring && tx.recurrence_rule) {
           // Find the last instance of this recurring transaction series
           const children = loadedTransactions.filter(t => t.parent_id === tx.id);
           
           // Determine the base transaction to calculate next date from
           // If no children, use the original transaction
           let lastInstance = tx;
           if (children.length > 0) {
               children.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
               lastInstance = children[0];
           }
           
           let lastDate = new Date(lastInstance.date);
           let safetyCounter = 0;
           
           // Generate future transactions until 'now'
           while(safetyCounter < 365) { // Prevent infinite loops
               let nextDate;
               if (tx.recurrence_rule === 'daily') nextDate = addDays(lastDate, 1);
               else if (tx.recurrence_rule === 'weekly') nextDate = addWeeks(lastDate, 1);
               else if (tx.recurrence_rule === 'monthly') nextDate = addMonths(lastDate, 1);
               else break;

               if (nextDate > now) break;

               const newTx: Transaction = {
                   ...tx,
                   id: crypto.randomUUID(),
                   date: nextDate.toISOString(),
                   created_at: Date.now(),
                   parent_id: tx.id,
                   is_recurring: false, // Generated instance is not a recurring template
               };
               newTransactions.push(newTx);
               
               lastDate = nextDate;
               safetyCounter++;
           }
       }
    });

    if (newTransactions.length > 0) {
        // Update account balances for generated transactions
        loadedAccounts = loadedAccounts.map(acc => {
            let bal = acc.current_balance;
            newTransactions.forEach(ntx => {
                if (ntx.type === 'income' && ntx.account_id === acc.id) bal += ntx.amount;
                if (ntx.type === 'expense' && ntx.account_id === acc.id) bal -= ntx.amount;
                if (ntx.type === 'transfer') {
                    if (ntx.account_id === acc.id) bal -= ntx.amount;
                    if (ntx.to_account_id === acc.id) bal += ntx.amount;
                }
            });
            return { ...acc, current_balance: bal };
        });

        // Merge and sort
        loadedTransactions = [...newTransactions, ...loadedTransactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        
        // Save updates
        StorageService.saveTransactions(loadedTransactions);
        StorageService.saveAccounts(loadedAccounts);
    }

    setAccounts(loadedAccounts);
    setTransactions(loadedTransactions);
    setCategories(loadedCategories);
    setBudgets(loadedBudgets);
    setSettings(loadedSettings);
  }, []);

  const updateStreak = (txDateStr: string) => {
    const txDate = new Date(txDateStr);
    const today = new Date();
    const todayStr = format(today, 'yyyy-MM-dd');
    
    // Streak only updates if you log a transaction for TODAY
    if (!isSameDay(txDate, today)) return;

    // If already logged today, do nothing
    if (streak.lastLogDate === todayStr) return;

    // Check relationship to last log
    let newCount = 1;
    if (streak.lastLogDate) {
        const lastLog = new Date(streak.lastLogDate);
        const diff = differenceInCalendarDays(today, lastLog);
        
        if (diff === 1) {
            // Consecutive day
            newCount = streak.currentCount + 1;
        } else if (diff === 0) {
            // Should be caught by the first check, but just in case
            newCount = streak.currentCount;
        } else {
            // Broken streak
            newCount = 1;
        }
    }

    const newStreak = {
        currentCount: newCount,
        longestCount: Math.max(newCount, streak.longestCount),
        lastLogDate: todayStr
    };

    setStreak(newStreak);
    StorageService.saveStreak(newStreak);
  };

  const addTransaction = (newTx: Transaction) => {
    // 0. Check for Streak Reward Trigger BEFORE updating
    const today = new Date();
    const todayStr = format(today, 'yyyy-MM-dd');
    const isTodayTx = isSameDay(new Date(newTx.date), today);
    const notLoggedTodayYet = streak.lastLogDate !== todayStr;

    // 1. Update Streak
    updateStreak(newTx.date);

    // If this was the first log of today, show the reward
    if (isTodayTx && notLoggedTodayYet) {
        setShowStreakReward(true);
    }

    // 2. Update Transaction List (Using functional update for batch safety)
    setTransactions(prevTransactions => {
        const updated = [newTx, ...prevTransactions];
        StorageService.saveTransactions(updated);
        return updated;
    });

    // 3. Update Account Balances (Using functional update for batch safety)
    setAccounts(prevAccounts => {
        const updatedAccounts = prevAccounts.map(acc => {
            let balanceChange = 0;

            if (newTx.type === 'income' && acc.id === newTx.account_id) {
                balanceChange = newTx.amount;
            } else if (newTx.type === 'expense' && acc.id === newTx.account_id) {
                balanceChange = -newTx.amount;
            } else if (newTx.type === 'transfer') {
                if (acc.id === newTx.account_id) {
                    balanceChange = -newTx.amount; // Debit source
                } else if (acc.id === newTx.to_account_id) {
                    balanceChange = newTx.amount; // Credit dest
                }
            }

            if (balanceChange !== 0) {
                return { ...acc, current_balance: acc.current_balance + balanceChange };
            }
            return acc;
        });
        StorageService.saveAccounts(updatedAccounts);
        return updatedAccounts;
    });
  };

  const updateTransaction = (updatedTx: Transaction) => {
    // Note: Updating an old transaction does not retroactively fix streaks
    // But if they move a transaction to Today, we could count it.
    updateStreak(updatedTx.date);

    // Find original transaction to revert its effects
    const oldTx = transactions.find(t => t.id === updatedTx.id);
    if (!oldTx) return;

    setAccounts(prevAccounts => {
        const updatedAccounts = prevAccounts.map(acc => {
            let balanceChange = 0;

            // 1. Revert Old Transaction
            if (oldTx.type === 'income' && acc.id === oldTx.account_id) {
                balanceChange -= oldTx.amount;
            } else if (oldTx.type === 'expense' && acc.id === oldTx.account_id) {
                balanceChange += oldTx.amount;
            } else if (oldTx.type === 'transfer') {
                if (acc.id === oldTx.account_id) balanceChange += oldTx.amount;
                if (acc.id === oldTx.to_account_id) balanceChange -= oldTx.amount;
            }

            // 2. Apply New Transaction
            if (updatedTx.type === 'income' && acc.id === updatedTx.account_id) {
                balanceChange += updatedTx.amount;
            } else if (updatedTx.type === 'expense' && acc.id === updatedTx.account_id) {
                balanceChange -= updatedTx.amount;
            } else if (updatedTx.type === 'transfer') {
                if (acc.id === updatedTx.account_id) balanceChange -= updatedTx.amount;
                if (acc.id === updatedTx.to_account_id) balanceChange += updatedTx.amount;
            }

            if (balanceChange !== 0) {
                return { ...acc, current_balance: acc.current_balance + balanceChange };
            }
            return acc;
        });
        StorageService.saveAccounts(updatedAccounts);
        return updatedAccounts;
    });

    setTransactions(prev => {
        const updated = prev.map(t => t.id === updatedTx.id ? updatedTx : t)
                            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        StorageService.saveTransactions(updated);
        return updated;
    });
  };

  const deleteTransaction = (id: string) => {
    const txToDelete = transactions.find(t => t.id === id);
    if (!txToDelete) return;

    // Reverse balance effect
    const updatedAccounts = accounts.map(acc => {
      let balanceChange = 0;

      if (txToDelete.type === 'income' && acc.id === txToDelete.account_id) {
        balanceChange = -txToDelete.amount;
      } else if (txToDelete.type === 'expense' && acc.id === txToDelete.account_id) {
        balanceChange = txToDelete.amount;
      } else if (txToDelete.type === 'transfer') {
        if (acc.id === txToDelete.account_id) {
          balanceChange = txToDelete.amount; // Refund source
        } else if (acc.id === txToDelete.to_account_id) {
          balanceChange = -txToDelete.amount; // Deduct from dest
        }
      }

      if (balanceChange !== 0) {
        return { ...acc, current_balance: acc.current_balance + balanceChange };
      }
      return acc;
    });

    const updatedTransactions = transactions.filter(t => t.id !== id);
    
    setTransactions(updatedTransactions);
    setAccounts(updatedAccounts);
    
    StorageService.saveTransactions(updatedTransactions);
    StorageService.saveAccounts(updatedAccounts);
  };

  const addBudget = (budget: Budget) => {
    const existingIndex = budgets.findIndex(b => b.category_id === budget.category_id);
    let updatedBudgets;
    
    if (existingIndex >= 0) {
        updatedBudgets = [...budgets];
        updatedBudgets[existingIndex] = budget;
    } else {
        updatedBudgets = [...budgets, budget];
    }

    setBudgets(updatedBudgets);
    StorageService.saveBudgets(updatedBudgets);
  };

  const addAccount = (account: Account) => {
    const updatedAccounts = [...accounts, account];
    setAccounts(updatedAccounts);
    StorageService.saveAccounts(updatedAccounts);
  }

  const updateAccount = (account: Account) => {
    const updatedAccounts = accounts.map(a => a.id === account.id ? account : a);
    setAccounts(updatedAccounts);
    StorageService.saveAccounts(updatedAccounts);
  }

  const deleteAccount = (id: string) => {
    const updatedAccounts = accounts.filter(a => a.id !== id);
    setAccounts(updatedAccounts);
    StorageService.saveAccounts(updatedAccounts);
  }

  // --- Settings & Categories ---

  const updateSettings = (newSettings: Partial<AppSettings>) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    StorageService.saveSettings(updated);
  };

  const addCategory = (category: Category) => {
    const updated = [...categories, category];
    setCategories(updated);
    StorageService.saveCategories(updated);
  };

  const updateCategory = (category: Category) => {
    const updated = categories.map(c => c.id === category.id ? category : c);
    setCategories(updated);
    StorageService.saveCategories(updated);
  };

  const deleteCategory = (id: string) => {
    const updated = categories.filter(c => c.id !== id);
    setCategories(updated);
    StorageService.saveCategories(updated);
  };

  const resetData = () => {
    const seed = getSeedData();
    
    // Update State
    setAccounts(seed.accounts);
    setTransactions(seed.transactions);
    setCategories(seed.categories);
    setBudgets(seed.budgets);
    
    // Reset Streak
    const emptyStreak = { currentCount: 0, longestCount: 0, lastLogDate: null };
    setStreak(emptyStreak);

    // Reset Currency to Match Seed (USD)
    const newSettings = { ...settings, currencySymbol: '$' };
    setSettings(newSettings);

    // Save to Storage
    StorageService.saveAccounts(seed.accounts);
    StorageService.saveTransactions(seed.transactions);
    StorageService.saveCategories(seed.categories);
    StorageService.saveBudgets(seed.budgets);
    StorageService.saveStreak(emptyStreak);
    StorageService.saveSettings(newSettings);
  };

  const getAccount = (id: string) => accounts.find(a => a.id === id);
  const getCategory = (id: string) => categories.find(c => c.id === id);

  return (
    <FinanceContext.Provider value={{
      accounts,
      transactions,
      categories,
      budgets,
      settings,
      streak,
      addTransaction,
      updateTransaction,
      deleteTransaction,
      addBudget,
      addAccount,
      updateAccount,
      deleteAccount,
      getAccount,
      getCategory,
      updateSettings,
      addCategory,
      updateCategory,
      deleteCategory,
      resetData,
      isTransactionModalOpen,
      transactionModalDefault,
      openTransactionModal,
      closeTransactionModal,
      showStreakReward,
      setShowStreakReward
    }}>
      {children}
    </FinanceContext.Provider>
  );
};

export const useFinance = () => {
  const context = useContext(FinanceContext);
  if (!context) {
    throw new Error('useFinance must be used within a FinanceProvider');
  }
  return context;
};
