import React, { useMemo, useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import { format, isWithinInterval, isToday, isYesterday } from 'date-fns';
import { ArrowUpRight, ArrowDownRight, ArrowRightLeft, CreditCard, Wallet, User as UserIcon, PiggyBank, ShieldCheck, Plus, Flame } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getMonthRange } from '../utils/dateHelpers';
import { CategoryIcon } from '../utils/iconHelpers';
import StreakModal from '../components/StreakModal';

const Dashboard: React.FC = () => {
  const { accounts, transactions, settings, budgets, categories, openTransactionModal, streak } = useFinance();
  const [showStreakModal, setShowStreakModal] = useState(false);

  const { stats } = useMemo(() => {
    const now = new Date();
    const { start, end } = getMonthRange(now, settings.monthlyStartDate);

    let income = 0;
    let expense = 0;

    transactions.forEach(t => {
      const tDate = new Date(t.date);
      if (isWithinInterval(tDate, { start, end })) {
        if (t.type === 'income') income += t.amount;
        else if (t.type === 'expense') expense += t.amount;
        else if (t.type === 'transfer') {
            const toAcc = accounts.find(a => a.id === t.to_account_id);
            if (toAcc?.type === 'credit') expense += t.amount;
        }
      }
    });

    return { stats: { income, expense }};
  }, [transactions, settings.monthlyStartDate, accounts]);

  const monthlyNet = stats.income - stats.expense;

  const lifetimeSavings = useMemo(() => {
    return transactions.reduce((acc, t) => {
        if (t.type === 'income') return acc + t.amount;
        if (t.type === 'expense') return acc - t.amount;
        return acc;
    }, 0);
  }, [transactions]);

  const topBudgets = useMemo(() => {
    const now = new Date();
    const { start, end } = getMonthRange(now, settings.monthlyStartDate);
    
    return budgets.slice(0, 4).map(b => {
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
       return { ...b, cat, spent, percent, isOver: spent > b.limit_amount };
    }).filter(Boolean) as any[]; 
  }, [budgets, categories, transactions, settings.monthlyStartDate]);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 5) return 'Good night';
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  }, []);

  const firstName = settings.userName.split(' ')[0] || 'User';
  const recentTransactions = transactions.slice(0, 5);
  
  const getRelativeDate = (dateStr: string) => {
      const date = new Date(dateStr);
      if (isToday(date)) return 'Today';
      if (isYesterday(date)) return 'Yesterday';
      return format(date, 'MMM d');
  };

  const formatMetric = (val: number) => {
      if (val >= 1000) return `${(val/1000).toFixed(1)}k`;
      return val.toString();
  }

  const isStreakActiveToday = streak.lastLogDate === format(new Date(), 'yyyy-MM-dd');

  return (
    <div className="p-6 space-y-6 page-transition pb-32">
      <div className="flex justify-between items-center pt-2">
        <div>
           <p className="text-zinc-500 dark:text-zinc-400 font-bold text-xs uppercase tracking-wider mb-0.5">{format(new Date(), 'EEEE, d MMM')}</p>
           <h1 className="text-2xl font-bold text-zinc-900 dark:text-white tracking-tight">
              {greeting}, <span className="text-violet-600 dark:text-violet-400">{firstName}</span>
           </h1>
        </div>
        <div className="flex items-center gap-3">
            <button 
                onClick={() => setShowStreakModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border bg-white dark:bg-white/5 border-zinc-200 dark:border-white/10 hover:bg-zinc-50 dark:hover:bg-white/10 active:scale-95 transition-all group"
            >
                <Flame 
                    size={16} 
                    className={`transition-colors ${isStreakActiveToday ? 'text-orange-500 fill-orange-500' : 'text-zinc-400 group-hover:text-orange-400'}`} 
                />
                <span className={`text-xs font-bold ${isStreakActiveToday ? 'text-zinc-900 dark:text-white' : 'text-zinc-500'}`}>
                    {streak.currentCount}
                </span>
            </button>

            <Link to="/settings" className="w-11 h-11 rounded-full p-0.5 border border-zinc-200 dark:border-white/10 active:scale-95 transition-transform">
            <div className="w-full h-full rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center overflow-hidden">
                {settings.userAvatar ? (
                    <img src={settings.userAvatar} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                    <UserIcon size={20} className="text-zinc-400" />
                )}
            </div>
            </Link>
        </div>
      </div>

      {showStreakModal && <StreakModal onClose={() => setShowStreakModal(false)} />}

      <div className="flex flex-col items-center justify-center py-6 relative z-10">
          <span className="text-zinc-500 font-medium text-xs mb-3 flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-100 dark:bg-white/5 uppercase tracking-wider">
             <ShieldCheck size={14} /> Monthly Net
          </span>
          <h2 className={`text-5xl font-extrabold tracking-tight ${monthlyNet < 0 ? 'text-red-500' : 'text-zinc-900 dark:text-white'}`}>
              {settings.currencySymbol}{monthlyNet.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </h2>
      </div>

      <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
              <div className="glass-panel p-4 rounded-2xl flex items-center gap-3 border border-zinc-200 dark:border-white/5">
                  <div className="p-2.5 rounded-full bg-violet-100 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400">
                      <ArrowDownRight size={18} strokeWidth={2.5} />
                  </div>
                  <div>
                      <span className="text-[10px] font-bold text-zinc-500 uppercase block">Income</span>
                      <span className="text-sm font-bold text-zinc-900 dark:text-white">{settings.currencySymbol}{stats.income.toLocaleString()}</span>
                  </div>
              </div>
              <div className="glass-panel p-4 rounded-2xl flex items-center gap-3 border border-zinc-200 dark:border-white/5">
                  <div className="p-2.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400">
                      <ArrowUpRight size={18} strokeWidth={2.5} />
                  </div>
                  <div>
                      <span className="text-[10px] font-bold text-zinc-500 uppercase block">Expense</span>
                      <span className="text-sm font-bold text-zinc-900 dark:text-white">{settings.currencySymbol}{stats.expense.toLocaleString()}</span>
                  </div>
              </div>
          </div>
          
          <div className="glass-panel p-4 rounded-2xl flex items-center justify-between border border-zinc-200 dark:border-white/5 bg-gradient-to-r from-emerald-50/50 to-transparent dark:from-emerald-500/5 dark:to-transparent">
               <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                         <PiggyBank size={18} strokeWidth={2.5} />
                    </div>
                    <span className="text-sm font-bold text-zinc-700 dark:text-zinc-200">Lifetime Savings</span>
               </div>
               <span className={`text-xl font-bold ${lifetimeSavings >= 0 ? 'text-zinc-900 dark:text-white' : 'text-red-500'}`}>
                   {settings.currencySymbol}{lifetimeSavings.toLocaleString()}
               </span>
          </div>
      </div>

      <div>
            <div className="flex justify-between items-center mb-3 px-1">
                <h3 className="text-lg font-bold text-zinc-900 dark:text-white">Budget Focus</h3>
                <Link to="/budgets" className="text-sm font-semibold text-violet-600 dark:text-violet-400">Manage</Link>
            </div>
            
            <div className="glass-panel p-4 rounded-[1.75rem] border border-zinc-200 dark:border-white/5 bg-white/50 dark:bg-[#151225]/50 overflow-hidden">
                <div className="grid grid-cols-4 gap-2">
                    {[0, 1, 2, 3].map(index => {
                        const budget = topBudgets[index];
                        const size = 56; 
                        const radius = 24;
                        const center = 28;
                        const strokeWidth = 4;
                        const circumference = 2 * Math.PI * radius;

                        if (budget) {
                            const progress = Math.min(budget.percent, 100);
                            const offset = circumference - (progress / 100) * circumference;
                            const isOver = budget.isOver;
                            const ringColor = isOver ? 'text-red-500' : (budget.percent > 85 ? 'text-amber-500' : 'text-violet-500');
                            const innerBg = isOver ? 'bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400' : 'bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-300';

                            return (
                            <Link to="/budgets" key={budget.id} className="flex flex-col items-center group cursor-pointer active:scale-95 transition-transform w-full">
                                <div className="relative flex items-center justify-center mb-2" style={{ width: size, height: size }}>
                                    <svg className="absolute inset-0 w-full h-full -rotate-90">
                                        <circle cx={center} cy={center} r={radius} fill="none" stroke="currentColor" strokeWidth={strokeWidth} className="text-zinc-100 dark:text-white/5" />
                                        <circle cx={center} cy={center} r={radius} fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" className={`${ringColor} transition-all duration-1000 ease-out`} />
                                    </svg>
                                    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shadow-sm ${innerBg}`}>
                                        <CategoryIcon iconName={budget.cat.icon} size={18} />
                                    </div>
                                </div>
                                <div className="flex flex-col items-center w-full">
                                    <span className="text-[10px] font-bold text-zinc-800 dark:text-zinc-200 truncate w-full text-center leading-tight mb-0.5">
                                        {budget.cat.name}
                                    </span>
                                    <span className={`text-[9px] font-bold whitespace-nowrap ${isOver ? 'text-red-500' : 'text-zinc-400 dark:text-zinc-500'}`}>
                                        {Math.round(budget.percent)}% • {formatMetric(budget.spent)}
                                    </span>
                                </div>
                            </Link>
                            )
                        } else {
                            return (
                                <Link to="/budgets" state={{ autoCreate: true }} key={`empty-${index}`} className="flex flex-col items-center justify-start active:scale-95 transition-transform">
                                    <div className="rounded-full border-2 border-dashed border-zinc-200 dark:border-white/10 flex items-center justify-center text-zinc-300 dark:text-zinc-600 hover:text-violet-500 hover:border-violet-300 dark:hover:border-violet-700 transition-colors bg-white/30 dark:bg-white/5 mb-2" style={{ width: size, height: size }}>
                                        <Plus size={20} strokeWidth={2} />
                                    </div>
                                    <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-600">Add</span>
                                </Link>
                            )
                        }
                    })}
                </div>
            </div>
      </div>

      <div>
        <div className="flex justify-between items-center mb-4 px-1">
            <h3 className="text-lg font-bold text-zinc-900 dark:text-white">Recent Activity</h3>
            <Link to="/transactions" className="text-sm font-semibold text-violet-600 dark:text-violet-400">See all</Link>
        </div>
        <div className="space-y-0">
            {recentTransactions.length === 0 ? (
                <div onClick={() => openTransactionModal()} className="flex flex-col items-center justify-center py-12 glass-panel rounded-[2rem] border-dashed border-zinc-300 dark:border-white/10 active:scale-[0.98] transition-transform cursor-pointer">
                    <div className="w-12 h-12 rounded-full bg-zinc-100 dark:bg-white/5 flex items-center justify-center text-zinc-400 mb-3">
                        <Wallet size={20} />
                    </div>
                    <p className="text-zinc-500 text-sm font-medium">No transactions this month</p>
                    <p className="text-violet-500 text-xs font-bold mt-1">Tap + to track spending</p>
                </div>
            ) : (
                recentTransactions.map((tx, i) => {
                    const cat = categories.find(c => c.id === tx.category_id);
                    const parentCat = cat?.parent_category_id ? categories.find(p => p.id === cat.parent_category_id) : null;
                    const displayName = tx.notes || (parentCat ? `${parentCat.name} / ${cat?.name}` : cat?.name) || 'Transaction';

                    return (
                    <button 
                        key={tx.id} 
                        onClick={() => openTransactionModal(tx)}
                        className={`w-full group flex items-center justify-between p-4 hover:bg-zinc-50 dark:hover:bg-white/5 transition-colors ${i !== recentTransactions.length - 1 ? 'border-b border-zinc-100 dark:border-white/5' : ''}`}
                    >
                        <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${
                                tx.type === 'income' ? 'bg-violet-100 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400' :
                                'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400'
                            }`}>
                                {tx.type === 'income' ? <ArrowDownRight size={20} strokeWidth={2.5} /> : 
                                 tx.type === 'expense' ? <ArrowUpRight size={20} strokeWidth={2.5} /> : 
                                 <ArrowRightLeft size={20} strokeWidth={2.5} />}
                            </div>
                            <div className="text-left">
                                <p className="font-bold text-zinc-900 dark:text-white text-sm">{displayName}</p>
                                <p className="text-xs text-zinc-500 font-medium mt-0.5">
                                    {getRelativeDate(tx.date)}, {format(new Date(tx.date), 'h:mm a')}
                                </p>
                            </div>
                        </div>
                        <span className={`font-bold text-sm ${
                            tx.type === 'income' ? 'text-violet-600 dark:text-violet-400' : 'text-zinc-900 dark:text-white'
                        }`}>
                            {tx.type === 'income' ? '+' : tx.type === 'expense' ? '-' : ''}
                            {settings.currencySymbol}{tx.amount.toLocaleString()}
                        </span>
                    </button>
                )})
            )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
