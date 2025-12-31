import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Account, Budget, Category, Transaction, AppSettings, UserStreak } from '../types';
import { StorageService } from '../services/storage';
import { addDays, addWeeks, addMonths, isSameDay, format, differenceInCalendarDays } from 'date-fns';
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
  isTransactionModalOpen: boolean;
  transactionModalDefault: Partial<Transaction> | null;
  openTransactionModal: (defaults?: Partial<Transaction>) => void;
  closeTransactionModal: () => void;
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

  useEffect(() => {
    const root = window.document.documentElement;
    if (settings.themeMode === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [settings.themeMode]);

  useEffect(() => {
    let loadedAccounts = StorageService.getAccounts();
    let loadedTransactions = StorageService.getTransactions();
    let loadedCategories = StorageService.getCategories();
    let loadedBudgets = StorageService.getBudgets();
    const loadedSettings = StorageService.getSettings();
    const loadedStreak = StorageService.getStreak();

    const today = new Date();
    const todayStr = format(today, 'yyyy-MM-dd');
    
    if (loadedStreak.lastLogDate && loadedStreak.lastLogDate !== todayStr) {
        const lastLog = new Date(loadedStreak.lastLogDate);
        const diff = differenceInCalendarDays(today, lastLog);
        
        if (diff > 1) {
            loadedStreak.currentCount = 0;
            StorageService.saveStreak(loadedStreak);
        }
    }
    setStreak(loadedStreak);

    if (loadedTransactions.length === 0) {
        const seed = getSeedData();
        loadedAccounts = seed.accounts;
        loadedTransactions = seed.transactions;
        loadedBudgets = seed.budgets;
        
        StorageService.saveAccounts(loadedAccounts);
        StorageService.saveTransactions(loadedTransactions);
        StorageService.saveBudgets(loadedBudgets);
        
        if(loadedSettings.currencySymbol === '₹') {
             loadedSettings.currencySymbol = '$';
             StorageService.saveSettings(loadedSettings);
        }
    }

    const newTransactions: Transaction[] = [];
    const now = new Date();
    
    loadedTransactions.forEach(tx => {
       if (tx.is_recurring && tx.recurrence_rule) {
           const children = loadedTransactions.filter(t => t.parent_id === tx.id);
           
           let lastInstance = tx;
           if (children.length > 0) {
               children.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
               lastInstance = children[0];
           }
           
           let lastDate = new Date(lastInstance.date);
           let safetyCounter = 0;
           
           while(safetyCounter < 365) {
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
                   is_recurring: false,
               };
               newTransactions.push(newTx);
               
               lastDate = nextDate;
               safetyCounter++;
           }
       }
    });

    if (newTransactions.length > 0) {
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

        loadedTransactions = [...newTransactions, ...loadedTransactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        
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
    
    if (!isSameDay(txDate, today)) return;
    if (streak.lastLogDate === todayStr) return;

    let newCount = 1;
    if (streak.lastLogDate) {
        const lastLog = new Date(streak.lastLogDate);
        const diff = differenceInCalendarDays(today, lastLog);
        
        if (diff === 1) {
            newCount = streak.currentCount + 1;
        } else if (diff === 0) {
            newCount = streak.currentCount;
        } else {
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
    const today = new Date();
    const todayStr = format(today, 'yyyy-MM-dd');
    const isTodayTx = isSameDay(new Date(newTx.date), today);
    const notLoggedTodayYet = streak.lastLogDate !== todayStr;

    updateStreak(newTx.date);

    if (isTodayTx && notLoggedTodayYet) {
        setShowStreakReward(true);
    }

    setTransactions(prevTransactions => {
        const updated = [newTx, ...prevTransactions];
        StorageService.saveTransactions(updated);
        return updated;
    });

    setAccounts(prevAccounts => {
        const updatedAccounts = prevAccounts.map(acc => {
            let balanceChange = 0;

            if (newTx.type === 'income' && acc.id === newTx.account_id) {
                balanceChange = newTx.amount;
            } else if (newTx.type === 'expense' && acc.id === newTx.account_id) {
                balanceChange = -newTx.amount;
            } else if (newTx.type === 'transfer') {
                if (acc.id === newTx.account_id) {
                    balanceChange = -newTx.amount;
                } else if (acc.id === newTx.to_account_id) {
                    balanceChange = newTx.amount;
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
    updateStreak(updatedTx.date);

    const oldTx = transactions.find(t => t.id === updatedTx.id);
    if (!oldTx) return;

    setAccounts(prevAccounts => {
        const updatedAccounts = prevAccounts.map(acc => {
            let balanceChange = 0;

            if (oldTx.type === 'income' && acc.id === oldTx.account_id) {
                balanceChange -= oldTx.amount;
            } else if (oldTx.type === 'expense' && acc.id === oldTx.account_id) {
                balanceChange += oldTx.amount;
            } else if (oldTx.type === 'transfer') {
                if (acc.id === oldTx.account_id) balanceChange += oldTx.amount;
                if (acc.id === oldTx.to_account_id) balanceChange -= oldTx.amount;
            }

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

    const updatedAccounts = accounts.map(acc => {
      let balanceChange = 0;

      if (txToDelete.type === 'income' && acc.id === txToDelete.account_id) {
        balanceChange = -txToDelete.amount;
      } else if (txToDelete.type === 'expense' && acc.id === txToDelete.account_id) {
        balanceChange = txToDelete.amount;
      } else if (txToDelete.type === 'transfer') {
        if (acc.id === txToDelete.account_id) {
          balanceChange = txToDelete.amount;
        } else if (acc.id === txToDelete.to_account_id) {
          balanceChange = -txToDelete.amount;
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
    
    setAccounts(seed.accounts);
    setTransactions(seed.transactions);
    setCategories(seed.categories);
    setBudgets(seed.budgets);
    
    const emptyStreak = { currentCount: 0, longestCount: 0, lastLogDate: null };
    setStreak(emptyStreak);

    const newSettings = { ...settings, currencySymbol: '$' };
    setSettings(newSettings);

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
