import React, { useState, useMemo } from 'react';
import { useFinance } from '../context/FinanceContext';
import { isWithinInterval } from 'date-fns';
import { Plus, Target, TrendingUp } from 'lucide-react';
import { getMonthRange } from '../utils/dateHelpers';
import { CategoryIcon } from '../utils/iconHelpers';
import { Budget } from '../types';

const Budgets: React.FC = () => {
  const { budgets, categories, transactions, settings, addBudget } = useFinance();
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [limitAmount, setLimitAmount] = useState('');

  const budgetStats = useMemo(() => {
    const now = new Date();
    const { start, end } = getMonthRange(now, settings.monthlyStartDate);

    return budgets.map(b => {
      const cat = categories.find(c => c.id === b.category_id);
      if (!cat) return null;

      const subCategoryIds = categories
        .filter(c => c.parent_category_id === b.category_id)
        .map(c => c.id);
      const targetIds = [b.category_id, ...subCategoryIds];

      const spent = transactions
        .filter(t =>
          t.type === 'expense' &&
          targetIds.includes(t.category_id) &&
          isWithinInterval(new Date(t.date), { start, end })
        )
        .reduce((sum, t) => sum + t.amount, 0);

      const percent = Math.min((spent / b.limit_amount) * 100, 100);
      const remaining = Math.max(b.limit_amount - spent, 0);
      const isOver = spent > b.limit_amount;

      return { ...b, cat, spent, percent, remaining, isOver };
    }).filter(Boolean) as any[];
  }, [budgets, categories, transactions, settings.monthlyStartDate]);

  const expenseCategories = categories.filter(c => c.type === 'expense' && !c.parent_category_id);
  const unbucketedCategories = expenseCategories.filter(c => !budgets.some(b => b.category_id === c.id));

  const handleSaveBudget = () => {
    if (!selectedCategoryId || !limitAmount) return;

    const newBudget: Budget = {
      id: `bud_${crypto.randomUUID()}`,
      category_id: selectedCategoryId,
      limit_amount: parseFloat(limitAmount),
      period: 'monthly'
    };

    addBudget(newBudget);
    setShowAddModal(false);
    setSelectedCategoryId('');
    setLimitAmount('');
  };

  const totalBudget = budgetStats.reduce((sum, b) => sum + b.limit_amount, 0);
  const totalSpent = budgetStats.reduce((sum, b) => sum + b.spent, 0);

  return (
    <div className="p-6 space-y-6 page-transition pb-32">
      <div className="flex justify-between items-center pt-2">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white tracking-tight">Budgets</h1>
          <p className="text-zinc-500 text-sm font-medium mt-1">{budgets.length} active budgets</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="w-10 h-10 rounded-full bg-violet-600 text-white flex items-center justify-center shadow-lg shadow-violet-600/20"
        >
          <Plus size={20} />
        </button>
      </div>

      {/* Summary */}
      <div className="glass-panel p-5 rounded-2xl border border-zinc-200 dark:border-white/5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-full bg-violet-100 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400">
              <Target size={18} />
            </div>
            <span className="text-sm font-bold text-zinc-900 dark:text-white">Monthly Overview</span>
          </div>
          <span className="text-sm font-bold text-zinc-500">
            {settings.currencySymbol}{totalSpent.toLocaleString()} / {settings.currencySymbol}{totalBudget.toLocaleString()}
          </span>
        </div>
        <div className="h-2 bg-zinc-100 dark:bg-white/5 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${totalSpent > totalBudget ? 'bg-red-500' : 'bg-violet-600'}`}
            style={{ width: `${Math.min((totalSpent / totalBudget) * 100, 100)}%` }}
          />
        </div>
      </div>

      {/* Budget List */}
      <div className="space-y-4">
        {budgetStats.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 glass-panel rounded-2xl border border-dashed border-zinc-300 dark:border-white/10">
            <div className="w-14 h-14 rounded-full bg-zinc-100 dark:bg-white/5 flex items-center justify-center text-zinc-400 mb-4">
              <TrendingUp size={24} />
            </div>
            <p className="text-zinc-500 font-medium">No budgets set</p>
            <button
              onClick={() => setShowAddModal(true)}
              className="mt-4 px-4 py-2 rounded-xl bg-violet-600 text-white text-sm font-semibold"
            >
              Create your first budget
            </button>
          </div>
        ) : (
          budgetStats.map(budget => (
            <div
              key={budget.id}
              className="glass-panel p-4 rounded-2xl border border-zinc-200 dark:border-white/5 space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${budget.cat.color}`}>
                    <CategoryIcon iconName={budget.cat.icon} size={18} />
                  </div>
                  <div>
                    <p className="font-semibold text-zinc-900 dark:text-white text-sm">{budget.cat.name}</p>
                    <p className={`text-xs font-medium ${budget.isOver ? 'text-red-500' : 'text-zinc-500'}`}>
                      {budget.isOver ? `Over by ${settings.currencySymbol}${(budget.spent - budget.limit_amount).toLocaleString()}` : `${settings.currencySymbol}${budget.remaining.toLocaleString()} left`}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-zinc-900 dark:text-white">
                    {settings.currencySymbol}{budget.spent.toLocaleString()}
                  </p>
                  <p className="text-xs text-zinc-500">of {settings.currencySymbol}{budget.limit_amount.toLocaleString()}</p>
                </div>
              </div>
              <div className="h-2 bg-zinc-100 dark:bg-white/5 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    budget.isOver ? 'bg-red-500' : budget.percent > 85 ? 'bg-amber-500' : 'bg-violet-600'
                  }`}
                  style={{ width: `${budget.percent}%` }}
                />
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Budget Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowAddModal(false)} />
          <div className="relative w-full max-w-md bg-white dark:bg-[#151225] rounded-t-3xl sm:rounded-3xl p-6 space-y-6 animate-in slide-in-from-bottom-4">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-white">Add Budget</h2>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-zinc-500 uppercase mb-2 block">Category</label>
                <div className="grid grid-cols-4 gap-2">
                  {unbucketedCategories.map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategoryId(cat.id)}
                      className={`flex flex-col items-center p-2 rounded-xl transition-all border ${
                        selectedCategoryId === cat.id
                          ? 'border-violet-500 bg-violet-50 dark:bg-violet-500/10'
                          : 'border-transparent bg-zinc-100 dark:bg-white/5'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-1 ${cat.color}`}>
                        <CategoryIcon iconName={cat.icon} size={14} />
                      </div>
                      <span className="text-[10px] font-semibold text-zinc-600 dark:text-zinc-300 truncate w-full text-center">
                        {cat.name}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-zinc-500 uppercase mb-2 block">Monthly Limit</label>
                <div className="flex items-center gap-2 bg-zinc-100 dark:bg-white/5 rounded-xl p-4">
                  <span className="text-zinc-400 font-bold">{settings.currencySymbol}</span>
                  <input
                    type="number"
                    value={limitAmount}
                    onChange={(e) => setLimitAmount(e.target.value)}
                    placeholder="0"
                    className="flex-1 bg-transparent text-xl font-bold text-zinc-900 dark:text-white outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 py-3 rounded-xl bg-zinc-100 dark:bg-white/5 text-zinc-600 dark:text-zinc-300 font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveBudget}
                disabled={!selectedCategoryId || !limitAmount}
                className="flex-1 py-3 rounded-xl bg-violet-600 text-white font-semibold disabled:opacity-50"
              >
                Save Budget
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Budgets;
