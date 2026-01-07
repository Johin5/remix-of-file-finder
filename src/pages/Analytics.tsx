
import React, { useMemo, useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, 
  BarChart, Bar, ReferenceLine 
} from 'recharts';
import { isWithinInterval, subMonths, format, eachDayOfInterval, isSameDay, startOfMonth, endOfMonth } from 'date-fns';
import { ChevronDown, TrendingUp, TrendingDown, Wallet, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { getMonthRange } from '../utils/dateHelpers';

const Analytics: React.FC = () => {
  const { transactions, categories, settings, accounts } = useFinance();
  const [period, setPeriod] = useState<number>(0);

  // --- Date Range Calculation ---
  const timeFrame = useMemo(() => {
      const now = new Date();
      const targetDate = subMonths(now, period);
      // If "This Month" (0) and monthly start date isn't 1, we still want the current 'budget month'
      // If "Last Month" (1), we want the previous 'budget month'
      const { start, end } = getMonthRange(targetDate, settings.monthlyStartDate);
      
      const label = settings.monthlyStartDate === 1 
          ? format(targetDate, 'MMMM yyyy')
          : `${format(start, 'MMM d')} - ${format(end, 'MMM d')}`;

      return { start, end, label };
  }, [period, settings.monthlyStartDate]);

  // --- Filter Transactions ---
  const periodTransactions = useMemo(() => {
      return transactions.filter(tx => 
          isWithinInterval(new Date(tx.date), { start: timeFrame.start, end: timeFrame.end })
      );
  }, [transactions, timeFrame]);

  // --- Helper: Check if tx is expense ---
  const isExpense = (tx: any) => {
      if (tx.type === 'expense') return true;
      if (tx.type === 'transfer') {
          const toAcc = accounts.find(a => a.id === tx.to_account_id);
          return toAcc?.type === 'credit';
      }
      return false;
  };

  // --- KPIS ---
  const kpis = useMemo(() => {
      let income = 0;
      let expense = 0;
      periodTransactions.forEach(tx => {
          if (tx.type === 'income') income += tx.amount;
          if (isExpense(tx)) expense += tx.amount;
      });
      const savings = income - expense;
      const savingsRate = income > 0 ? (savings / income) * 100 : 0;
      return { income, expense, savings, savingsRate };
  }, [periodTransactions, accounts]);

  // --- DATA: Daily Trend (Area Chart) ---
  const dailyData = useMemo(() => {
      const days = eachDayOfInterval({ start: timeFrame.start, end: timeFrame.end });
      return days.map(day => {
          const dayExpenses = periodTransactions
              .filter(tx => isSameDay(new Date(tx.date), day) && isExpense(tx))
              .reduce((sum, tx) => sum + tx.amount, 0);
          return {
              day: format(day, 'd'), // 1, 2, 3
              fullDate: format(day, 'MMM d'),
              amount: dayExpenses
          };
      });
  }, [periodTransactions, timeFrame, accounts]);

  // --- DATA: Cash Flow (Bar Chart) ---
  const flowData = useMemo(() => {
     return [
         { name: 'Income', amount: kpis.income, color: '#8b5cf6' }, // Violet
         { name: 'Expense', amount: kpis.expense, color: '#f59e0b' }  // Amber
     ];
  }, [kpis]);

  // --- DATA: Categories (Pie Chart) - Aggregated by Parent ---
  const categoryData = useMemo(() => {
      const agg: {[key: string]: number} = {};
      
      periodTransactions.filter(t => isExpense(t)).forEach(tx => {
          const cat = categories.find(c => c.id === tx.category_id);
          // Roll up to parent if exists, otherwise use own ID
          const targetId = cat?.parent_category_id || cat?.id || 'unknown';
          
          if (!agg[targetId]) agg[targetId] = 0;
          agg[targetId] += tx.amount;
      });

      const COLORS = ['#7c3aed', '#8b5cf6', '#a78bfa', '#c4b5fd', '#f472b6', '#fb7185', '#34d399', '#60a5fa'];

      return Object.keys(agg).map((catId, index) => {
          const cat = categories.find(c => c.id === catId);
          return {
              name: cat?.name || (catId === 'cat_transfer' ? 'Bill Payment' : 'Unknown'),
              value: agg[catId],
              color: cat?.color?.includes('bg-') ? '' : COLORS[index % COLORS.length] 
          };
      }).sort((a, b) => b.value - a.value);
  }, [periodTransactions, categories, accounts]);

  // --- DATA: Top Merchants/Notes ---
  const topMerchants = useMemo(() => {
      const agg: {[key: string]: number} = {};
      periodTransactions.filter(t => isExpense(t)).forEach(tx => {
          const name = tx.notes || (tx.type === 'transfer' ? 'Transfer' : 'Unspecified');
          if (!agg[name]) agg[name] = 0;
          agg[name] += tx.amount;
      });
      return Object.entries(agg)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 5)
          .map(([name, amount]) => ({ name, amount }));
  }, [periodTransactions, accounts]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="glass-panel px-3 py-2 rounded-xl shadow-lg border border-zinc-100 dark:border-white/10">
          <p className="text-xs font-bold text-zinc-500 mb-1">{label || payload[0].payload.fullDate}</p>
          <p className="text-sm font-bold text-zinc-900 dark:text-white">
             {settings.currencySymbol}{payload[0].value.toLocaleString()}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="p-6 page-transition pb-24">
      <div className="flex justify-between items-end mb-6">
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-white tracking-tight">Analytics</h1>
          <div className="relative">
              <select 
                className="appearance-none glass-panel border border-zinc-200 dark:border-white/10 text-sm font-semibold rounded-xl pl-4 pr-10 py-2 focus:outline-none shadow-sm text-zinc-700 dark:text-zinc-200 cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                value={period}
                onChange={(e) => setPeriod(Number(e.target.value))}
              >
                  <option value={0} className="bg-white dark:bg-zinc-900">This Month</option>
                  <option value={1} className="bg-white dark:bg-zinc-900">Last Month</option>
                  <option value={2} className="bg-white dark:bg-zinc-900">2 Months Ago</option>
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
          </div>
      </div>

      {/* 1. KPI Cards */}
      <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="col-span-2 glass-panel p-5 rounded-[1.5rem] flex items-center justify-between bg-zinc-900 dark:bg-[#151225] text-white">
               <div>
                   <p className="text-zinc-400 text-xs font-bold uppercase tracking-wider mb-1">Net Savings</p>
                   <h2 className="text-3xl font-bold">{settings.currencySymbol}{kpis.savings.toLocaleString()}</h2>
                   <p className={`text-xs font-medium mt-1 ${kpis.savingsRate > 0 ? 'text-emerald-400' : 'text-zinc-500'}`}>
                       {kpis.savingsRate.toFixed(1)}% savings rate
                   </p>
               </div>
               <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center">
                   <Wallet size={24} />
               </div>
          </div>
          
          <div className="glass-panel p-4 rounded-2xl">
               <div className="flex items-center gap-2 mb-2 text-violet-600 dark:text-violet-400">
                   <div className="p-1.5 bg-violet-100 dark:bg-violet-900/20 rounded-lg">
                       <ArrowDownRight size={16} />
                   </div>
                   <span className="text-xs font-bold uppercase tracking-wide">Income</span>
               </div>
               <p className="text-xl font-bold text-zinc-900 dark:text-white">{settings.currencySymbol}{kpis.income.toLocaleString()}</p>
          </div>

          <div className="glass-panel p-4 rounded-2xl">
               <div className="flex items-center gap-2 mb-2 text-amber-600 dark:text-amber-500">
                   <div className="p-1.5 bg-amber-100 dark:bg-amber-900/20 rounded-lg">
                       <ArrowUpRight size={16} />
                   </div>
                   <span className="text-xs font-bold uppercase tracking-wide">Expense</span>
               </div>
               <p className="text-xl font-bold text-zinc-900 dark:text-white">{settings.currencySymbol}{kpis.expense.toLocaleString()}</p>
          </div>
      </div>

      {/* 2. Cash Flow Chart */}
      <div className="glass-panel p-6 rounded-[2rem] border border-zinc-200 dark:border-white/5 mb-6">
          <h3 className="font-bold text-zinc-900 dark:text-white mb-6">Cash Flow</h3>
          <div className="h-48 w-full">
               <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={flowData} layout="vertical" barSize={32}>
                      <XAxis type="number" hide />
                      <YAxis dataKey="name" type="category" tick={{fontSize: 12, fill: '#71717a', fontWeight: 600}} width={60} axisLine={false} tickLine={false} />
                      <Tooltip cursor={{fill: 'transparent'}} content={<CustomTooltip />} />
                      <Bar dataKey="amount" radius={[0, 8, 8, 0]}>
                          {flowData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                      </Bar>
                  </BarChart>
               </ResponsiveContainer>
          </div>
      </div>

      {/* 3. Daily Spending Trend */}
      <div className="glass-panel p-6 rounded-[2rem] border border-zinc-200 dark:border-white/5 mb-6">
          <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-zinc-900 dark:text-white">Daily Spending</h3>
          </div>
          <div className="h-56 w-full -ml-4">
              <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={dailyData}>
                      <defs>
                          <linearGradient id="colorSplit" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                          </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--glass-border)" />
                      <XAxis 
                          dataKey="day" 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{fill: '#a1a1aa', fontSize: 10}} 
                          interval={4}
                      />
                      <YAxis hide />
                      <Tooltip content={<CustomTooltip />} />
                      <Area 
                          type="monotone" 
                          dataKey="amount" 
                          stroke="#8b5cf6" 
                          strokeWidth={3}
                          fill="url(#colorSplit)" 
                      />
                  </AreaChart>
              </ResponsiveContainer>
          </div>
      </div>

      {/* 4. Top Merchants (Ranking) */}
      <div className="glass-panel p-6 rounded-[2rem] border border-zinc-200 dark:border-white/5 mb-6">
          <h3 className="font-bold text-zinc-900 dark:text-white mb-4">Top Spending</h3>
          <div className="space-y-4">
              {topMerchants.length === 0 ? (
                  <p className="text-center text-zinc-500 text-sm py-4">No data available</p>
              ) : (
                  topMerchants.map((item, i) => {
                      const maxVal = topMerchants[0].amount;
                      const percent = (item.amount / maxVal) * 100;
                      
                      return (
                          <div key={i} className="relative">
                              <div className="flex justify-between items-center text-sm font-medium z-10 relative mb-1">
                                  <span className="text-zinc-700 dark:text-zinc-200 truncate pr-4">{item.name}</span>
                                  <span className="text-zinc-900 dark:text-white font-bold">{settings.currencySymbol}{item.amount.toLocaleString()}</span>
                              </div>
                              <div className="h-2 w-full bg-zinc-100 dark:bg-white/5 rounded-full overflow-hidden">
                                  <div className="h-full bg-zinc-800 dark:bg-zinc-500 rounded-full" style={{ width: `${percent}%` }}></div>
                              </div>
                          </div>
                      )
                  })
              )}
          </div>
      </div>

      {/* 5. Category Pie (Refined) */}
      <div className="glass-panel p-6 rounded-[2rem] border border-zinc-200 dark:border-white/5">
         <h3 className="font-bold text-zinc-900 dark:text-white mb-2">Category Breakdown</h3>
         <div className="h-64 w-full relative">
            {categoryData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={categoryData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                            stroke="none"
                            cornerRadius={6}
                        >
                            {categoryData.map((entry, index) => {
                                // Default colors list matches the useMemo above
                                const COLORS = ['#7c3aed', '#8b5cf6', '#a78bfa', '#c4b5fd', '#f472b6', '#fb7185', '#34d399', '#60a5fa'];
                                const color = COLORS[index % COLORS.length];
                                return <Cell key={`cell-${index}`} fill={color} />
                            })}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                </ResponsiveContainer>
            ) : (
                <div className="absolute inset-0 flex items-center justify-center text-zinc-500 font-medium">
                    No data available
                </div>
            )}
         </div>

         {/* Legend */}
         <div className="space-y-3 mt-2">
             {categoryData.slice(0, 5).map((item, idx) => {
                  const COLORS = ['#7c3aed', '#8b5cf6', '#a78bfa', '#c4b5fd', '#f472b6', '#fb7185', '#34d399', '#60a5fa'];
                  const color = COLORS[idx % COLORS.length];
                  const percent = Math.round((item.value / kpis.expense) * 100);
                  
                  return (
                     <div key={idx} className="flex justify-between items-center group">
                         <div className="flex items-center space-x-3">
                             <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }}></div>
                             <span className="text-zinc-700 dark:text-zinc-300 font-medium text-sm truncate max-w-[150px]">{item.name}</span>
                         </div>
                         <div className="text-right">
                            <span className="text-zinc-900 dark:text-white font-bold text-sm block">{settings.currencySymbol}{item.value.toLocaleString()}</span>
                            <span className="text-zinc-400 text-[10px] font-bold">{percent}%</span>
                         </div>
                     </div>
                 )
             })}
         </div>
      </div>
    </div>
  );
};

export default Analytics;
