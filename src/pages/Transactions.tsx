import React, { useState, useMemo } from 'react';
import { useFinance } from '../context/FinanceContext';
import { format, isWithinInterval, startOfDay, endOfDay, subDays, startOfMonth, endOfMonth } from 'date-fns';
import { ArrowUpRight, ArrowDownRight, ArrowRightLeft, Search, Filter, X, ChevronDown } from 'lucide-react';
import { CategoryIcon } from '../utils/iconHelpers';
import { TransactionType } from '../types';

type FilterPeriod = 'all' | 'today' | 'week' | 'month';

const Transactions: React.FC = () => {
  const { transactions, categories, accounts, settings, openTransactionModal } = useFinance();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<TransactionType | 'all'>('all');
  const [filterPeriod, setFilterPeriod] = useState<FilterPeriod>('month');
  const [showFilters, setShowFilters] = useState(false);

  const filteredTransactions = useMemo(() => {
    const now = new Date();
    
    return transactions.filter(tx => {
      // Type filter
      if (filterType !== 'all' && tx.type !== filterType) return false;
      
      // Period filter
      const txDate = new Date(tx.date);
      if (filterPeriod === 'today') {
        if (!isWithinInterval(txDate, { start: startOfDay(now), end: endOfDay(now) })) return false;
      } else if (filterPeriod === 'week') {
        if (!isWithinInterval(txDate, { start: subDays(now, 7), end: now })) return false;
      } else if (filterPeriod === 'month') {
        if (!isWithinInterval(txDate, { start: startOfMonth(now), end: endOfMonth(now) })) return false;
      }
      
      // Search filter
      if (searchQuery) {
        const cat = categories.find(c => c.id === tx.category_id);
        const acc = accounts.find(a => a.id === tx.account_id);
        const searchLower = searchQuery.toLowerCase();
        const matchesNote = tx.notes?.toLowerCase().includes(searchLower);
        const matchesCat = cat?.name.toLowerCase().includes(searchLower);
        const matchesAcc = acc?.name.toLowerCase().includes(searchLower);
        if (!matchesNote && !matchesCat && !matchesAcc) return false;
      }
      
      return true;
    });
  }, [transactions, filterType, filterPeriod, searchQuery, categories, accounts]);

  const groupedByDate = useMemo(() => {
    const groups: { [key: string]: typeof transactions } = {};
    filteredTransactions.forEach(tx => {
      const dateKey = format(new Date(tx.date), 'yyyy-MM-dd');
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(tx);
    });
    return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
  }, [filteredTransactions]);

  const getDateLabel = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = subDays(today, 1);
    
    if (format(date, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd')) return 'Today';
    if (format(date, 'yyyy-MM-dd') === format(yesterday, 'yyyy-MM-dd')) return 'Yesterday';
    return format(date, 'EEEE, MMM d');
  };

  return (
    <div className="p-6 space-y-6 page-transition pb-32">
      <div className="pt-2">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white tracking-tight">Transactions</h1>
        <p className="text-zinc-500 text-sm font-medium mt-1">{filteredTransactions.length} transactions</p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search transactions..."
          className="w-full pl-11 pr-4 py-3.5 rounded-2xl bg-white dark:bg-white/5 border border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all"
        />
        {searchQuery && (
          <button onClick={() => setSearchQuery('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600">
            <X size={18} />
          </button>
        )}
      </div>

      {/* Filter Toggle */}
      <button
        onClick={() => setShowFilters(!showFilters)}
        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-100 dark:bg-white/5 text-zinc-600 dark:text-zinc-300 text-sm font-semibold"
      >
        <Filter size={16} />
        Filters
        <ChevronDown size={16} className={`transition-transform ${showFilters ? 'rotate-180' : ''}`} />
      </button>

      {showFilters && (
        <div className="space-y-4 animate-in slide-in-from-top-2">
          <div className="flex flex-wrap gap-2">
            {(['all', 'expense', 'income', 'transfer'] as const).map(t => (
              <button
                key={t}
                onClick={() => setFilterType(t)}
                className={`px-4 py-2 rounded-xl text-sm font-semibold capitalize transition-all ${
                  filterType === t
                    ? 'bg-zinc-900 dark:bg-white text-white dark:text-black'
                    : 'bg-zinc-100 dark:bg-white/5 text-zinc-500'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {(['today', 'week', 'month', 'all'] as FilterPeriod[]).map(p => (
              <button
                key={p}
                onClick={() => setFilterPeriod(p)}
                className={`px-4 py-2 rounded-xl text-sm font-semibold capitalize transition-all ${
                  filterPeriod === p
                    ? 'bg-violet-600 text-white'
                    : 'bg-zinc-100 dark:bg-white/5 text-zinc-500'
                }`}
              >
                {p === 'all' ? 'All Time' : p}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Transaction List */}
      <div className="space-y-6">
        {groupedByDate.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <p className="text-zinc-400 text-sm">No transactions found</p>
          </div>
        ) : (
          groupedByDate.map(([dateKey, txs]) => (
            <div key={dateKey}>
              <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-3 px-1">
                {getDateLabel(dateKey)}
              </h3>
              <div className="glass-panel rounded-2xl overflow-hidden border border-zinc-200 dark:border-white/5 divide-y divide-zinc-100 dark:divide-white/5">
                {txs.map(tx => {
                  const cat = categories.find(c => c.id === tx.category_id);
                  const parentCat = cat?.parent_category_id ? categories.find(p => p.id === cat.parent_category_id) : null;
                  const displayName = tx.notes || (parentCat ? `${parentCat.name} / ${cat?.name}` : cat?.name) || 'Transaction';
                  const acc = accounts.find(a => a.id === tx.account_id);

                  return (
                    <button
                      key={tx.id}
                      onClick={() => openTransactionModal(tx)}
                      className="w-full flex items-center justify-between p-4 hover:bg-zinc-50 dark:hover:bg-white/5 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                          tx.type === 'income' ? 'bg-violet-100 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400' :
                          tx.type === 'transfer' ? 'bg-blue-100 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400' :
                          'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'
                        }`}>
                          {tx.type === 'income' ? <ArrowDownRight size={18} /> :
                           tx.type === 'transfer' ? <ArrowRightLeft size={18} /> :
                           cat ? <CategoryIcon iconName={cat.icon} size={18} /> : <ArrowUpRight size={18} />}
                        </div>
                        <div className="text-left">
                          <p className="font-semibold text-zinc-900 dark:text-white text-sm">{displayName}</p>
                          <p className="text-xs text-zinc-500">{acc?.name} • {format(new Date(tx.date), 'h:mm a')}</p>
                        </div>
                      </div>
                      <span className={`font-bold text-sm ${
                        tx.type === 'income' ? 'text-violet-600 dark:text-violet-400' : 'text-zinc-900 dark:text-white'
                      }`}>
                        {tx.type === 'income' ? '+' : tx.type === 'expense' ? '-' : ''}
                        {settings.currencySymbol}{tx.amount.toLocaleString()}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Transactions;
