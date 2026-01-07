
import { subDays, subMonths, startOfMonth, format, addDays } from 'date-fns';
import { Account, Category, Transaction, Budget } from '../types';
import { DEFAULT_CATEGORIES } from '../constants';

export const getSeedData = () => {
  const categories = DEFAULT_CATEGORIES;
  
  // 1. Setup Accounts with IDs
  const accounts: Account[] = [
    { id: 'acc_1', name: 'Chase Checking', type: 'bank', currency: 'USD', current_balance: 0, color: 'bg-violet-700' },
    { id: 'acc_2', name: 'Amex Gold', type: 'credit', currency: 'USD', current_balance: 0, color: 'bg-amber-600', credit_limit: 15000 },
    { id: 'acc_3', name: 'High Yield Savings', type: 'savings', currency: 'USD', current_balance: 0, color: 'bg-emerald-600' },
    { id: 'acc_4', name: 'Wallet Cash', type: 'cash', currency: 'USD', current_balance: 0, color: 'bg-zinc-600' },
  ];

  const transactions: Transaction[] = [];
  const now = new Date();

  // Helper to add tx
  const addTx = (
    daysAgo: number, 
    type: 'income' | 'expense' | 'transfer', 
    amount: number, 
    desc: string, 
    catId: string, 
    accId: string,
    toAccId?: string
  ) => {
    const date = subDays(now, daysAgo).toISOString();
    transactions.push({
      id: crypto.randomUUID(),
      type,
      amount,
      currency: 'USD',
      date,
      account_id: accId,
      to_account_id: toAccId,
      category_id: catId,
      notes: desc,
      created_at: Date.now() - (daysAgo * 86400000)
    });
  };

  // --- Generate History (Last 60 Days) ---

  // 1. Initial Balances (60 days ago)
  addTx(60, 'income', 4500, 'Opening Balance', 'cat_5', 'acc_1'); // Checking
  addTx(60, 'income', 10000, 'Opening Balance', 'cat_5', 'acc_3'); // Savings
  addTx(60, 'income', 150, 'Cash on hand', 'cat_6', 'acc_4'); // Cash

  // 2. Monthly Recurring (Salary & Rent) - 2 Months
  [55, 25].forEach(days => {
      addTx(days, 'income', 4200, 'Salary Deposit', 'cat_5', 'acc_1'); // Salary
      addTx(days - 2, 'expense', 1800, 'Monthly Rent', 'cat_4', 'acc_1'); // Rent
      addTx(days - 3, 'expense', 60, 'Internet Bill', 'cat_4', 'acc_2'); // Internet -> Credit Card
      addTx(days - 1, 'transfer', 500, 'Monthly Savings', 'cat_transfer', 'acc_1', 'acc_3'); // Savings Transfer
  });

  // 3. Weekly/Random Spending
  const expenseMix = [
      { cat: 'cat_1', desc: 'Whole Foods Market', min: 80, max: 200, acc: 'acc_2' }, // Food (Credit)
      { cat: 'cat_1', desc: 'Starbucks', min: 6, max: 15, acc: 'acc_2' }, 
      { cat: 'cat_1', desc: 'Local Diner', min: 30, max: 60, acc: 'acc_1' },
      { cat: 'cat_2', desc: 'Uber Ride', min: 15, max: 40, acc: 'acc_2' }, // Transport
      { cat: 'cat_2', desc: 'Shell Gas Station', min: 40, max: 70, acc: 'acc_2' },
      { cat: 'cat_7', desc: 'Netflix Subscription', min: 15, max: 15, acc: 'acc_2' }, // Ent
      { cat: 'cat_7', desc: 'Cinema Tickets', min: 30, max: 50, acc: 'acc_2' },
      { cat: 'cat_3', desc: 'Amazon Purchase', min: 20, max: 150, acc: 'acc_2' }, // Shopping
      { cat: 'cat_3', desc: 'Target Run', min: 50, max: 120, acc: 'acc_1' },
  ];

  for (let i = 0; i < 50; i++) {
      const daysAgo = Math.floor(Math.random() * 60);
      const item = expenseMix[Math.floor(Math.random() * expenseMix.length)];
      const amount = Math.floor(Math.random() * (item.max - item.min + 1)) + item.min;
      
      addTx(daysAgo, 'expense', amount, item.desc, item.cat, item.acc);
  }

  // 4. Recent Specifics (Last few days for dashboard)
  addTx(1, 'expense', 12.50, 'Chipotle', 'cat_1', 'acc_2');
  addTx(2, 'expense', 45.00, 'Grocery Run', 'cat_1', 'acc_1');
  addTx(3, 'income', 150.00, 'Freelance Gig', 'cat_6', 'acc_1');

  // --- Calculate Final Account Balances ---
  accounts.forEach(acc => {
      let balance = 0;
      transactions.forEach(tx => {
          if (tx.type === 'income' && tx.account_id === acc.id) balance += tx.amount;
          if (tx.type === 'expense' && tx.account_id === acc.id) balance -= tx.amount;
          if (tx.type === 'transfer') {
              if (tx.account_id === acc.id) balance -= tx.amount;
              if (tx.to_account_id === acc.id) balance += tx.amount;
          }
      });
      acc.current_balance = balance;
  });

  // --- Budgets ---
  const budgets: Budget[] = [
      { id: 'bud_1', category_id: 'cat_1', limit_amount: 800, period: 'monthly' }, // Food
      { id: 'bud_2', category_id: 'cat_3', limit_amount: 400, period: 'monthly' }, // Shopping
      { id: 'bud_3', category_id: 'cat_2', limit_amount: 300, period: 'monthly' }, // Transport
      { id: 'bud_4', category_id: 'cat_7', limit_amount: 200, period: 'monthly' }, // Entertainment
  ];

  return { accounts, transactions, budgets, categories };
};
