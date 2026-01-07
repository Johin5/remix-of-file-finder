
import React, { useMemo, useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import { format, eachDayOfInterval, isSameMonth, isSameDay, getDay, addMonths, subMonths, startOfWeek, endOfWeek, isWithinInterval, addDays, getDaysInMonth, differenceInDays, endOfMonth } from 'date-fns';
import { Search, Filter, ChevronLeft, ChevronRight, Star, SlidersHorizontal, FileSpreadsheet, Wallet, AlertTriangle, CheckCircle2, TrendingUp, Calendar, Footprints } from 'lucide-react';
import { Transaction } from '../types';
import { getMonthRange, getWeekStartOption, rotateWeekDays } from '../utils/dateHelpers';
import { CategoryIcon } from '../utils/iconHelpers';

type Tab = 'daily' | 'calendar' | 'monthly' | 'summary' | 'description';

const Transactions: React.FC = () => {
  const { transactions, accounts, categories, budgets, settings, openTransactionModal } = useFinance();
  const [activeTab, setActiveTab] = useState<Tab>('daily');
  const [currentDate, setCurrentDate] = useState(new Date());

  // Navigation
  const nextPeriod = () => setCurrentDate(addMonths(currentDate, 1));
  const prevPeriod = () => setCurrentDate(subMonths(currentDate, 1));
  
  // Date Formatting using Custom Helper
  const { start: monthStart, end: monthEnd } = useMemo(
      () => getMonthRange(currentDate, settings.monthlyStartDate), 
      [currentDate, settings.monthlyStartDate]
  );
  
  const dateRangeLabel = settings.monthlyStartDate === 1 
      ? format(currentDate, 'MMMM yyyy')
      : `${format(monthStart, 'MMM d')} - ${format(monthEnd, 'MMM d, yyyy')}`;

  // Filter transactions
  const monthlyTransactions = useMemo(() => {
    return transactions.filter(t => isWithinInterval(new Date(t.date), { start: monthStart, end: monthEnd }));
  }, [transactions, monthStart, monthEnd]);

  // Calculations
  const stats = useMemo(() => {
    let income = 0;
    let expense = 0;
    monthlyTransactions.forEach(t => {
      if (t.type === 'income') {
          income += t.amount;
      } else if (t.type === 'expense') {
          expense += t.amount;
      } else if (t.type === 'transfer') {
          // Treat Credit Card Payments as Expense
          const toAcc = accounts.find(a => a.id === t.to_account_id);
          if (toAcc?.type === 'credit') {
              expense += t.amount;
          }
      }
    });
    return { income, expense, total: income - expense };
  }, [monthlyTransactions, accounts]);

  const getCategory = (id: string) => categories.find(c => c.id === id);

  // --- SUB-VIEWS ---

  const DailyView = () => {
    const groups: { [key: string]: Transaction[] } = {};
    monthlyTransactions.forEach(tx => {
      const dateKey = format(new Date(tx.date), 'yyyy-MM-dd');
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(tx);
    });
    
    const sortedDates = Object.keys(groups).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

    if (sortedDates.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-96 opacity-50">
            <div className="w-16 h-16 glass-panel rounded-2xl mb-4 flex items-center justify-center text-zinc-400 dark:text-zinc-500">
               <Wallet size={28} />
            </div>
            <p className="text-sm font-medium text-zinc-500">No transactions found.</p>
        </div>
      );
    }

    return (
      <div className="space-y-6 px-4 pt-2 pb-28">
        {sortedDates.map(dateStr => {
           const date = new Date(dateStr);
           const dayTotal = groups[dateStr].reduce((acc, t) => {
               if (t.type === 'income') return acc + t.amount;
               // Include transfers to credit cards as expenses
               if (t.type === 'expense') return acc - t.amount;
               if (t.type === 'transfer') return acc - t.amount; // Transfers are always outflows from view perspective
               return acc;
           }, 0);
           
           return (
             <div key={dateStr}>
                <div className="flex justify-between items-center mb-2 px-2">
                   <div className="flex items-baseline space-x-2">
                     <span className="font-bold text-zinc-900 dark:text-white text-xl">{format(date, 'dd')}</span>
                     <span className="text-xs font-medium text-zinc-500 uppercase">{format(date, 'EEEE')}</span>
                   </div>
                   <span className={`text-sm font-bold ${dayTotal > 0 ? 'text-violet-600 dark:text-violet-400' : 'text-zinc-500 dark:text-zinc-400'}`}>
                     {dayTotal > 0 ? '+' : ''}{settings.currencySymbol}{Math.abs(dayTotal).toLocaleString()}
                   </span>
                </div>
                <div className="space-y-3">
                    {groups[dateStr].map(tx => {
                    const cat = getCategory(tx.category_id);
                    // Find parent for label
                    const parentCat = cat?.parent_category_id ? categories.find(p => p.id === cat.parent_category_id) : null;
                    
                    return (
                        <button 
                            key={tx.id} 
                            onClick={() => openTransactionModal(tx)}
                            className="w-full text-left glass-panel p-4 rounded-2xl flex items-center justify-between border-l-4 border-l-transparent hover:border-l-violet-500 transition-all active:scale-[0.98]"
                        >
                            <div className="flex items-center space-x-3">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold shadow-sm ${cat?.color || 'bg-zinc-200 dark:bg-zinc-800 text-zinc-500'}`}>
                                    <CategoryIcon iconName={cat?.icon || 'tag'} size={18} />
                                </div>
                                <div>
                                    <div className="flex flex-col">
                                        <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1">
                                            {parentCat ? (
                                                <>
                                                    <span className="opacity-60 font-normal">{parentCat.name} / </span>
                                                    <span>{cat?.name}</span>
                                                </>
                                            ) : (
                                                cat?.name || 'Uncategorized'
                                            )}
                                        </p>
                                    </div>
                                    {tx.notes && <p className="text-xs text-zinc-500 line-clamp-1">{tx.notes}</p>}
                                </div>
                            </div>
                            <div className="text-right">
                                <span className={`text-sm font-bold ${tx.type === 'income' ? 'text-violet-600 dark:text-violet-400' : 'text-zinc-900 dark:text-zinc-100'}`}>
                                    {tx.type === 'expense' || tx.type === 'transfer' ? '-' : '+'}
                                    {settings.currencySymbol}{tx.amount.toLocaleString()}
                                </span>
                            </div>
                        </button>
                    )
                    })}
                </div>
             </div>
           )
        })}
      </div>
    );
  };

  const CalendarView = () => {
    const weekStartOption = getWeekStartOption(settings.weeklyStartDay);
    const start = startOfWeek(monthStart, weekStartOption);
    const end = endOfWeek(monthEnd, weekStartOption);
    const calendarDays = eachDayOfInterval({ start, end });
    const weeks = rotateWeekDays(settings.weeklyStartDay);

    return (
      <div className="h-full flex flex-col bg-gray-50 dark:bg-[#0c0a18] pb-24">
         <div className="grid grid-cols-7 text-center py-3 border-b border-zinc-200 dark:border-white/5 bg-white dark:bg-[#120f20]">
            {weeks.map((day, i) => (
              <span key={day} className={`text-xs font-bold ${i === 0 ? 'text-violet-600 dark:text-violet-400' : i === 6 ? 'text-violet-600 dark:text-violet-400' : 'text-zinc-500'}`}>{day}</span>
            ))}
         </div>
         <div className="grid grid-cols-7 auto-rows-fr flex-1 gap-[1px] bg-zinc-200 dark:bg-white/5">
            {calendarDays.map(day => {
               const dayStr = format(day, 'yyyy-MM-dd');
               const dayTxs = transactions.filter(t => isSameDay(new Date(t.date), day));
               const income = dayTxs.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
               const expense = dayTxs.filter(t => {
                   if (t.type === 'expense') return true;
                   // Include Bill Payments
                   if (t.type === 'transfer') {
                       const toAcc = accounts.find(a => a.id === t.to_account_id);
                       return toAcc?.type === 'credit';
                   }
                   return false;
               }).reduce((sum, t) => sum + t.amount, 0);

               const isCurrentMonth = isWithinInterval(day, { start: monthStart, end: monthEnd });
               const isToday = isSameDay(day, new Date());
               
               return (
                 <div key={dayStr} className={`bg-white dark:bg-[#0c0a18] p-1 flex flex-col justify-between ${!isCurrentMonth ? 'opacity-30' : ''}`}>
                    <div className="flex justify-center pt-1">
                       <span className={`text-xs w-6 h-6 flex items-center justify-center rounded-full font-medium ${
                         isToday ? 'bg-violet-600 text-white shadow-lg' : 
                         !isCurrentMonth ? 'text-zinc-600' :
                         getDay(day) === 0 ? 'text-violet-600 dark:text-violet-400' : 
                         getDay(day) === 6 ? 'text-violet-600 dark:text-violet-400' : 'text-zinc-400'
                       }`}>
                         {format(day, 'd')}
                       </span>
                    </div>
                    <div className="flex flex-col items-center text-[9px] space-y-0.5 pb-2 font-medium">
                       {income > 0 && <span className="text-violet-600 dark:text-violet-400">+{income.toLocaleString()}</span>}
                       {expense > 0 && <span className="text-zinc-500 dark:text-zinc-300">-{expense.toLocaleString()}</span>}
                    </div>
                 </div>
               );
            })}
         </div>
      </div>
    );
  };

  const MonthlyView = () => {
    const weekStartOption = getWeekStartOption(settings.weeklyStartDay);
    const weeks = [];
    let current = startOfWeek(monthStart, weekStartOption);
    while (current <= monthEnd) {
       weeks.push({
         start: current,
         end: endOfWeek(current, weekStartOption)
       });
       current = addDays(current, 7);
    }

    return (
      <div className="p-6 space-y-4 pb-24">
         <div className="flex items-center justify-between px-5 py-6 bg-zinc-900 dark:bg-[#151225] rounded-3xl border border-white/10 relative overflow-hidden shadow-lg">
            <div className="relative z-10 font-bold text-white text-xl">{dateRangeLabel} Summary</div>
            <div className="relative z-10 text-right">
                <div className="text-violet-400 text-xs font-bold">+{settings.currencySymbol}{stats.income.toLocaleString()}</div>
                <div className="text-zinc-400 text-xs font-bold">-{settings.currencySymbol}{stats.expense.toLocaleString()}</div>
            </div>
         </div>
         
         <div className="space-y-3">
            {weeks.map((week, idx) => {
                const weekTxs = transactions.filter(t => isWithinInterval(new Date(t.date), { start: week.start, end: week.end }));
                const wIncome = weekTxs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
                const wExpense = weekTxs.filter(t => {
                   if (t.type === 'expense') return true;
                   if (t.type === 'transfer') {
                       const toAcc = accounts.find(a => a.id === t.to_account_id);
                       return toAcc?.type === 'credit';
                   }
                   return false;
                }).reduce((s, t) => s + t.amount, 0);
                
                const isCurrentWeek = isWithinInterval(new Date(), { start: week.start, end: week.end });

                return (
                <div key={idx} className={`flex items-center justify-between px-5 py-4 rounded-2xl border transition-all ${isCurrentWeek ? 'glass-panel border-violet-500/30' : 'glass-panel border-transparent'}`}>
                    <span className={`text-sm font-medium ${isCurrentWeek ? 'text-zinc-900 dark:text-white' : 'text-zinc-400'}`}>{format(week.start, 'dd')} - {format(week.end, 'dd MMM')}</span>
                    <div className="text-right space-y-0.5">
                        <div className={`text-xs font-bold text-violet-600 dark:text-violet-400`}>+{settings.currencySymbol}{wIncome.toLocaleString()}</div>
                        <div className={`text-xs font-bold text-zinc-500 dark:text-zinc-300`}>-{settings.currencySymbol}{wExpense.toLocaleString()}</div>
                    </div>
                </div>
                );
            })}
         </div>
      </div>
    )
  };

  const SummaryView = () => {
    // 1. Calculate Time Pace
    const totalDays = differenceInDays(monthEnd, monthStart) + 1;
    const now = new Date();
    // Clamp days passed to totalDays if now is after monthEnd, or 1 if before start
    const isFuture = now > monthEnd;
    const isPast = now < monthStart;
    
    let daysPassed = 0;
    if (isFuture) daysPassed = totalDays;
    else if (!isPast) daysPassed = differenceInDays(now, monthStart) + 1;
    
    const timeProgress = (daysPassed / totalDays) * 100;
    const daysRemaining = totalDays - daysPassed;

    // 2. Calculate Budget Pace
    const totalBudget = budgets.reduce((acc, b) => acc + b.limit_amount, 0);
    const totalSpent = stats.expense;
    const budgetProgress = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;
    const remainingBudget = totalBudget - totalSpent;
    
    // 3. Status Logic
    let statusColor = 'text-emerald-500';
    let statusBg = 'bg-emerald-500/10 border-emerald-500/20';
    let statusMessage = "You're spending wisely.";
    let PaceIcon = CheckCircle2;

    if (totalBudget > 0) {
        if (totalSpent > totalBudget) {
            statusColor = 'text-red-500';
            statusBg = 'bg-red-500/10 border-red-500/20';
            statusMessage = "You've exceeded your budget.";
            PaceIcon = AlertTriangle;
        } else if (budgetProgress > timeProgress + 10) {
            // Spending faster than time passing (with 10% buffer)
            statusColor = 'text-amber-500';
            statusBg = 'bg-amber-500/10 border-amber-500/20';
            statusMessage = "Spending is outpacing time.";
            PaceIcon = TrendingUp;
        }
    }

    // 4. Daily Safe Spend
    const dailySafeSpend = daysRemaining > 0 ? (remainingBudget > 0 ? remainingBudget / daysRemaining : 0) : 0;

    // 5. Watchlist (Top 3 highest % used budgets)
    const budgetWatchlist = budgets.map(b => {
        const cat = categories.find(c => c.id === b.category_id);
        if (!cat) return null;
        
        // Find subcategories
        const subIds = categories.filter(c => c.parent_category_id === b.category_id).map(c => c.id);
        const targetIds = [b.category_id, ...subIds];
        
        const spent = transactions
            .filter(t => t.type === 'expense' && targetIds.includes(t.category_id) && isWithinInterval(new Date(t.date), { start: monthStart, end: monthEnd }))
            .reduce((sum, t) => sum + t.amount, 0);
            
        const pct = (spent / b.limit_amount) * 100;
        return { cat, spent, limit: b.limit_amount, pct };
    }).filter(Boolean).sort((a, b) => (b?.pct || 0) - (a?.pct || 0)).slice(0, 3);

    return (
      <div className="p-6 space-y-6 pb-24">
        {/* Status Banner */}
        <div className={`p-4 rounded-2xl border flex items-start gap-3 ${statusBg}`}>
            <div className={`p-2 rounded-full bg-white/20 ${statusColor} shrink-0`}>
                <PaceIcon size={20} />
            </div>
            <div>
                <h3 className={`font-bold text-sm ${statusColor}`}>Budget Health: {totalSpent > totalBudget ? 'Critical' : (budgetProgress > timeProgress ? 'Caution' : 'Good')}</h3>
                <p className="text-xs text-zinc-600 dark:text-zinc-300 mt-1 leading-relaxed">
                    {statusMessage} {daysRemaining > 0 ? `You have ${daysRemaining} days left in this period.` : 'Period ended.'}
                </p>
            </div>
        </div>

        {/* Hero Metrics Grid */}
        <div className="grid grid-cols-2 gap-3">
             {/* Daily Safe Spend */}
             <div className="glass-panel p-4 rounded-[1.25rem] border border-zinc-200 dark:border-white/5 flex flex-col justify-between min-h-[110px]">
                 <div className="flex items-center gap-2 text-zinc-500 mb-2">
                     <div className="p-1.5 bg-zinc-100 dark:bg-white/5 rounded-lg">
                        <Calendar size={14} />
                     </div>
                     <span className="text-[10px] font-bold uppercase tracking-wide">Daily Safe Limit</span>
                 </div>
                 <div>
                    <span className="text-2xl font-bold text-zinc-900 dark:text-white">
                        {settings.currencySymbol}{dailySafeSpend.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </span>
                    <p className="text-[10px] text-zinc-400 font-medium mt-1">to stay on budget</p>
                 </div>
             </div>

             {/* Spending Pace */}
             <div className="glass-panel p-4 rounded-[1.25rem] border border-zinc-200 dark:border-white/5 flex flex-col justify-between min-h-[110px]">
                 <div className="flex items-center gap-2 text-zinc-500 mb-2">
                     <div className="p-1.5 bg-zinc-100 dark:bg-white/5 rounded-lg">
                        <Footprints size={14} />
                     </div>
                     <span className="text-[10px] font-bold uppercase tracking-wide">Pace</span>
                 </div>
                 <div className="relative pt-2">
                     <div className="h-2 w-full bg-zinc-100 dark:bg-white/5 rounded-full overflow-hidden mb-1">
                          <div className={`h-full rounded-full ${statusColor.replace('text-', 'bg-')}`} style={{ width: `${Math.min(budgetProgress, 100)}%` }}></div>
                     </div>
                     <div className="flex justify-between text-[10px] font-bold">
                         <span className="text-zinc-500">{Math.round(budgetProgress)}% Spent</span>
                         <span className="text-zinc-400">{Math.round(timeProgress)}% Time</span>
                     </div>
                 </div>
             </div>
        </div>

        {/* Total Summary Card */}
        <div className="glass-panel p-5 rounded-[1.5rem] border border-zinc-200 dark:border-white/5 flex items-center justify-between">
             <div className="flex items-center gap-4">
                 <div className="w-12 h-12 rounded-full bg-zinc-900 dark:bg-white text-white dark:text-black flex items-center justify-center">
                     <Wallet size={20} />
                 </div>
                 <div>
                     <p className="text-xs text-zinc-500 font-bold uppercase tracking-wider mb-0.5">Total Expenses</p>
                     <p className="text-xl font-bold text-zinc-900 dark:text-white">{settings.currencySymbol}{totalSpent.toLocaleString()}</p>
                 </div>
             </div>
             <div className="text-right">
                 <p className="text-xs text-zinc-500 font-bold uppercase tracking-wider mb-0.5">Remaining</p>
                 <p className={`text-xl font-bold ${remainingBudget < 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                     {remainingBudget < 0 ? '-' : ''}{settings.currencySymbol}{Math.abs(remainingBudget).toLocaleString()}
                 </p>
             </div>
        </div>

        {/* Budget Watchlist */}
        <div className="space-y-3">
             <h3 className="flex items-center text-zinc-900 dark:text-white font-bold text-sm px-1">
                 Budget Watchlist
             </h3>
             {budgetWatchlist.length === 0 ? (
                 <div className="text-center py-6 text-zinc-500 text-sm">No budgets set.</div>
             ) : (
                 budgetWatchlist.map((item: any, i) => (
                     <div key={i} className="glass-panel p-4 rounded-2xl flex items-center justify-between">
                         <div className="flex items-center gap-3">
                             <div className={`w-10 h-10 rounded-full flex items-center justify-center ${item.cat.color} bg-opacity-20`}>
                                 <CategoryIcon iconName={item.cat.icon} size={18} />
                             </div>
                             <div>
                                 <p className="text-sm font-bold text-zinc-900 dark:text-white">{item.cat.name}</p>
                                 <p className="text-xs text-zinc-500 font-medium">
                                     {settings.currencySymbol}{item.spent.toLocaleString()} / {item.limit}
                                 </p>
                             </div>
                         </div>
                         <div className="text-right">
                             <span className={`text-xs font-bold px-2 py-1 rounded-md ${
                                 item.pct >= 100 ? 'bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400' :
                                 item.pct >= 85 ? 'bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400' :
                                 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400'
                             }`}>
                                 {Math.round(item.pct)}%
                             </span>
                         </div>
                     </div>
                 ))
             )}
        </div>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col page-transition">
       {/* Header */}
       <div className="pt-safe px-6 pb-2 bg-gray-50 dark:bg-[#0c0a18] transition-colors">
          <div className="flex justify-between items-center py-4">
              <h1 className="text-3xl font-bold text-zinc-900 dark:text-white tracking-tight">Transactions</h1>
              <div className="flex gap-2">
                  <button className="p-2 glass-panel rounded-full text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors"><Search size={20} /></button>
                  <button className="p-2 glass-panel rounded-full text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors"><SlidersHorizontal size={20} /></button>
              </div>
          </div>
          
          {/* Date Navigator */}
          <div className="flex items-center justify-between py-2 mb-4 glass-panel p-2 rounded-2xl border-none">
             <button onClick={prevPeriod} className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-xl text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"><ChevronLeft size={20} /></button>
             <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{dateRangeLabel}</span>
             <button onClick={nextPeriod} className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-xl text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"><ChevronRight size={20} /></button>
          </div>
       </div>

       {/* Tabs */}
       <div className="px-6 mb-2">
           <div className="flex bg-zinc-200 dark:bg-white/5 p-1 rounded-2xl">
                {['Daily', 'Calendar', 'Monthly', 'Summary'].map((t) => {
                    const key = t.toLowerCase() as Tab;
                    return (
                        <button
                            key={key}
                            onClick={() => setActiveTab(key)}
                            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
                                activeTab === key 
                                ? 'bg-white dark:bg-white/10 text-zinc-900 dark:text-white shadow-sm' 
                                : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'
                            }`}
                        >
                            {t}
                        </button>
                    )
                })}
           </div>
       </div>

       {/* Stats Summary Bar */}
       {activeTab !== 'summary' && (
           <div className="px-6 py-2 grid grid-cols-3 gap-3">
                <div className="bg-violet-500/10 border border-violet-500/20 rounded-2xl p-3 text-center">
                    <span className="text-[10px] text-violet-600 dark:text-violet-400 font-bold uppercase block mb-1">Income</span>
                    <span className="text-violet-600 dark:text-violet-400 font-bold text-sm block">{settings.currencySymbol}{stats.income.toLocaleString()}</span>
                </div>
                <div className="bg-zinc-200 dark:bg-white/5 border border-zinc-300 dark:border-white/5 rounded-2xl p-3 text-center">
                    <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-bold uppercase block mb-1">Expense</span>
                    <span className="text-zinc-700 dark:text-zinc-200 font-bold text-sm block">{settings.currencySymbol}{stats.expense.toLocaleString()}</span>
                </div>
                <div className="glass-panel rounded-2xl p-3 text-center border-violet-500/30">
                    <span className="text-[10px] text-violet-600 dark:text-violet-400 font-bold uppercase block mb-1">Net</span>
                    <span className="text-zinc-900 dark:text-white font-bold text-sm block">{settings.currencySymbol}{stats.total.toLocaleString()}</span>
                </div>
           </div>
       )}

       {/* Tab Content */}
       <div className="flex-1 overflow-y-auto no-scrollbar relative">
           {activeTab === 'daily' && <DailyView />}
           {activeTab === 'calendar' && <CalendarView />}
           {activeTab === 'monthly' && <MonthlyView />}
           {activeTab === 'summary' && <SummaryView />}
       </div>
    </div>
  );
};

export default Transactions;
