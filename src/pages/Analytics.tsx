import React, { useMemo, useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import { format, isWithinInterval, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis } from 'recharts';
import { TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { CategoryIcon } from '../utils/iconHelpers';
import { getMonthRange } from '../utils/dateHelpers';

const Analytics: React.FC = () => {
  const { transactions, categories, settings } = useFinance();
  const [viewMode, setViewMode] = useState<'expense' | 'income'>('expense');

  const { categoryData, totalAmount, monthlyData } = useMemo(() => {
    const now = new Date();
    const { start, end } = getMonthRange(now, settings.monthlyStartDate);

    // Category breakdown
    const catMap: { [key: string]: number } = {};
    let total = 0;

    transactions.forEach(tx => {
      const txDate = new Date(tx.date);
      if (tx.type === viewMode && isWithinInterval(txDate, { start, end })) {
        const cat = categories.find(c => c.id === tx.category_id);
        const parentId = cat?.parent_category_id || cat?.id;
        if (parentId) {
          catMap[parentId] = (catMap[parentId] || 0) + tx.amount;
          total += tx.amount;
        }
      }
    });

    const data = Object.entries(catMap)
      .map(([catId, amount]) => {
        const cat = categories.find(c => c.id === catId);
        return {
          id: catId,
          name: cat?.name || 'Other',
          icon: cat?.icon || 'tag',
          color: cat?.color || 'bg-zinc-500',
          amount,
          percent: total > 0 ? (amount / total) * 100 : 0
        };
      })
      .sort((a, b) => b.amount - a.amount);

    // Monthly trend (last 6 months)
    const monthly: { month: string; income: number; expense: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const monthDate = subMonths(now, i);
      const mStart = startOfMonth(monthDate);
      const mEnd = endOfMonth(monthDate);

      let income = 0;
      let expense = 0;

      transactions.forEach(tx => {
        const txDate = new Date(tx.date);
        if (isWithinInterval(txDate, { start: mStart, end: mEnd })) {
          if (tx.type === 'income') income += tx.amount;
          else if (tx.type === 'expense') expense += tx.amount;
        }
      });

      monthly.push({
        month: format(monthDate, 'MMM'),
        income,
        expense
      });
    }

    return { categoryData: data, totalAmount: total, monthlyData: monthly };
  }, [transactions, categories, settings.monthlyStartDate, viewMode]);

  const COLORS = ['#8b5cf6', '#a78bfa', '#c4b5fd', '#ddd6fe', '#ede9fe', '#f5f3ff'];

  return (
    <div className="p-6 space-y-6 page-transition pb-32">
      <div className="pt-2">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white tracking-tight">Analytics</h1>
        <p className="text-zinc-500 text-sm font-medium mt-1">Spending insights</p>
      </div>

      {/* Toggle */}
      <div className="bg-zinc-200 dark:bg-white/5 p-1.5 rounded-2xl flex">
        <button
          onClick={() => setViewMode('expense')}
          className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${
            viewMode === 'expense'
              ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm'
              : 'text-zinc-500'
          }`}
        >
          <ArrowUpRight size={16} /> Expenses
        </button>
        <button
          onClick={() => setViewMode('income')}
          className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${
            viewMode === 'income'
              ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm'
              : 'text-zinc-500'
          }`}
        >
          <ArrowDownRight size={16} /> Income
        </button>
      </div>

      {/* Pie Chart */}
      <div className="glass-panel p-6 rounded-2xl border border-zinc-200 dark:border-white/5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-zinc-900 dark:text-white">By Category</h3>
          <span className="text-sm text-zinc-500">{format(new Date(), 'MMMM yyyy')}</span>
        </div>

        {categoryData.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <p className="text-zinc-400 text-sm">No data for this period</p>
          </div>
        ) : (
          <>
            <div className="h-48 relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    dataKey="amount"
                    paddingAngle={2}
                  >
                    {categoryData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold text-zinc-900 dark:text-white">
                  {settings.currencySymbol}{totalAmount.toLocaleString()}
                </span>
                <span className="text-xs text-zinc-500">Total</span>
              </div>
            </div>

            <div className="space-y-3 mt-6">
              {categoryData.slice(0, 5).map((cat, i) => (
                <div key={cat.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: COLORS[i % COLORS.length] }}
                    />
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${cat.color}`}>
                      <CategoryIcon iconName={cat.icon} size={14} />
                    </div>
                    <span className="text-sm font-medium text-zinc-700 dark:text-zinc-200">{cat.name}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-bold text-zinc-900 dark:text-white">
                      {settings.currencySymbol}{cat.amount.toLocaleString()}
                    </span>
                    <span className="text-xs text-zinc-500 ml-2">{cat.percent.toFixed(0)}%</span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Monthly Trend */}
      <div className="glass-panel p-6 rounded-2xl border border-zinc-200 dark:border-white/5">
        <h3 className="font-bold text-zinc-900 dark:text-white mb-4">Monthly Trend</h3>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyData} barGap={4}>
              <XAxis
                dataKey="month"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#71717a', fontSize: 12 }}
              />
              <YAxis hide />
              <Bar dataKey="income" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="expense" fill="#e4e4e7" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="flex justify-center gap-6 mt-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-violet-500" />
            <span className="text-xs text-zinc-500">Income</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-zinc-300" />
            <span className="text-xs text-zinc-500">Expense</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
