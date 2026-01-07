
import React, { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useFinance } from '../context/FinanceContext';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Plus, CreditCard, Wallet, Landmark, Coins, TrendingUp, TrendingDown, Percent, Info, X, Check } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { AccountType } from '../types';

const Accounts: React.FC = () => {
  const { accounts, settings, openTransactionModal, addAccount } = useFinance();
  const navigate = useNavigate();

  // --- Modal State ---
  const [isAdding, setIsAdding] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState<AccountType>('cash');
  const [balance, setBalance] = useState('');
  const [creditLimit, setCreditLimit] = useState('');
  const [color, setColor] = useState('bg-zinc-800');

  const COLORS = [
      'bg-zinc-900', 'bg-slate-600', 'bg-violet-600', 'bg-blue-600', 'bg-emerald-600', 
      'bg-amber-600', 'bg-rose-600', 'bg-cyan-600', 'bg-fuchsia-600'
  ];

  const TYPES: {id: AccountType, label: string, icon: any}[] = [
      { id: 'cash', label: 'Cash', icon: Coins },
      { id: 'bank', label: 'Bank', icon: Landmark },
      { id: 'credit', label: 'Credit Card', icon: CreditCard },
      { id: 'savings', label: 'Savings', icon: Wallet }
  ];

  const resetForm = () => {
      setName('');
      setType('cash');
      setBalance('');
      setCreditLimit('');
      setColor('bg-zinc-900');
      setIsAdding(false);
  };

  const handleSave = () => {
      if (!name) return;
      
      let finalBalance = parseFloat(balance) || 0;

      // Smart Logic: If user selects Credit Card and enters a positive number, 
      // they likely mean "I owe this much". Flip to negative for debt logic.
      if (type === 'credit' && finalBalance > 0) {
          finalBalance = -finalBalance;
      }

      addAccount({
          id: crypto.randomUUID(),
          name,
          type,
          current_balance: finalBalance,
          currency: 'INR',
          color,
          credit_limit: (type === 'credit' && creditLimit) ? parseFloat(creditLimit) : undefined
      });
      resetForm();
  };

  // --- Calculations ---
  const { netWorth, totalAssets, totalDebt, assetDistribution, liquidity } = useMemo(() => {
      let assets = 0;
      let debts = 0;
      let liquidCash = 0;
      
      const distribution = {
          bank: 0,
          cash: 0,
          savings: 0,
          credit: 0
      };

      accounts.forEach(acc => {
          const bal = acc.current_balance;
          
          if (acc.type === 'credit') {
              if (bal < 0) {
                debts += Math.abs(bal);
                distribution.credit += Math.abs(bal);
              } else {
                // Positive balance on credit card is weird but effectively an asset
                assets += bal;
              }
          } else {
              if (bal >= 0) {
                  assets += bal;
                  // Group assets
                  if (acc.type === 'bank') distribution.bank += bal;
                  if (acc.type === 'cash') distribution.cash += bal;
                  if (acc.type === 'savings') distribution.savings += bal;
                  
                  // Liquidity (Cash + Bank, excluding Savings for strictly liquid)
                  if (acc.type === 'bank' || acc.type === 'cash') {
                      liquidCash += bal;
                  }
              } else {
                  // Overdraft
                  debts += Math.abs(bal);
              }
          }
      });

      return {
          netWorth: assets - debts,
          totalAssets: assets,
          totalDebt: debts,
          liquidity: liquidCash,
          assetDistribution: [
              { name: 'Bank', value: distribution.bank, color: '#8b5cf6' },
              { name: 'Savings', value: distribution.savings, color: '#10b981' },
              { name: 'Cash', value: distribution.cash, color: '#f59e0b' },
          ].filter(d => d.value > 0)
      };
  }, [accounts]);

  const COLORS_CHART = ['#8b5cf6', '#10b981', '#f59e0b', '#ef4444'];

  return (
    <div className="p-6 page-transition min-h-screen bg-gray-50 dark:bg-[#0c0a18] text-zinc-900 dark:text-white pb-24 relative">
       {/* Header */}
       <div className="flex items-center justify-between mb-6">
           <div className="flex items-center space-x-2">
                <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-zinc-500 dark:text-zinc-400">
                    <ChevronLeft size={24} />
                </button>
                <h1 className="text-2xl font-bold tracking-tight">Accounts</h1>
           </div>
           <button 
             onClick={() => setIsAdding(true)} 
             className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-white/5 flex items-center justify-center text-zinc-500 active:scale-95 transition-transform hover:bg-zinc-200 dark:hover:bg-white/10"
           >
               <Plus size={20} />
           </button>
       </div>

       {/* Add Account Modal */}
       {isAdding && createPortal(
            <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center">
                {/* Backdrop */}
                <div 
                    className="absolute inset-0 bg-black/60 backdrop-blur-md transition-opacity" 
                    onClick={resetForm}
                ></div>

                {/* Modal Window */}
                <div className="relative w-full max-w-md bg-white dark:bg-[#151225] rounded-t-[2rem] sm:rounded-[2rem] shadow-2xl border-t sm:border border-zinc-200 dark:border-white/10 animate-in slide-in-from-bottom-10 max-h-[85vh] flex flex-col overflow-hidden">
                    
                    {/* Modal Header */}
                    <div className="flex justify-between items-center p-6 pb-4 shrink-0 bg-white dark:bg-[#151225] z-10">
                        <h2 className="text-lg font-bold">New Payment Method</h2>
                        <button onClick={resetForm} className="p-2 bg-zinc-100 dark:bg-white/5 rounded-full hover:bg-zinc-200 dark:hover:bg-white/10 transition-colors">
                            <X size={20} />
                        </button>
                    </div>

                    {/* Scrollable Form */}
                    <div className="space-y-5 overflow-y-auto no-scrollbar p-6 pt-0 pb-8">
                        {/* Name */}
                        <div>
                            <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2 block">Method Name</label>
                            <input 
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="e.g. Chase Sapphire, Petty Cash"
                                className="w-full bg-zinc-100 dark:bg-black/20 p-3 rounded-xl font-semibold focus:outline-none focus:ring-2 focus:ring-violet-500 placeholder:font-normal text-zinc-900 dark:text-white"
                                autoFocus
                            />
                        </div>

                        {/* Balance */}
                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider block">
                                    {type === 'credit' ? 'Amount Owed' : 'Current Balance'}
                                </label>
                                {type === 'credit' && <span className="text-[10px] font-medium text-violet-500">Enter positive value for debt</span>}
                            </div>
                            <div className="relative">
                                <span className="absolute left-3 top-3 text-zinc-500 font-bold">{settings.currencySymbol}</span>
                                <input 
                                    type="number"
                                    inputMode="decimal"
                                    value={balance}
                                    onChange={(e) => setBalance(e.target.value)}
                                    placeholder="0.00"
                                    className="w-full bg-zinc-100 dark:bg-black/20 p-3 pl-7 rounded-xl font-semibold focus:outline-none focus:ring-2 focus:ring-violet-500 text-zinc-900 dark:text-white"
                                />
                            </div>
                        </div>

                        {/* Credit Limit - Only for Credit Cards */}
                        {type === 'credit' && (
                            <div className="animate-in slide-in-from-top-2 fade-in">
                                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2 block">Credit Limit</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-3 text-zinc-500 font-bold">{settings.currencySymbol}</span>
                                    <input 
                                        type="number"
                                        inputMode="decimal"
                                        value={creditLimit}
                                        onChange={(e) => setCreditLimit(e.target.value)}
                                        placeholder="Optional limit"
                                        className="w-full bg-zinc-100 dark:bg-black/20 p-3 pl-7 rounded-xl font-semibold focus:outline-none focus:ring-2 focus:ring-violet-500 text-zinc-900 dark:text-white"
                                    />
                                </div>
                            </div>
                        )}

                        {/* Type */}
                        <div>
                            <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2 block">Type</label>
                            <div className="grid grid-cols-2 gap-2">
                                {TYPES.map(t => (
                                    <button 
                                        key={t.id}
                                        onClick={() => setType(t.id)}
                                        className={`flex items-center gap-2 p-3 rounded-xl text-xs font-bold capitalize border transition-all ${
                                            type === t.id 
                                            ? 'bg-zinc-900 dark:bg-white text-white dark:text-black border-zinc-900 dark:border-white shadow-md' 
                                            : 'border-zinc-200 dark:border-white/10 text-zinc-500 bg-transparent hover:bg-black/5 dark:hover:bg-white/5'
                                        }`}
                                    >
                                        <t.icon size={16} />
                                        {t.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Color */}
                        <div>
                            <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2 block">Card Color</label>
                            <div className="flex gap-3 overflow-x-auto p-2 -mx-2 no-scrollbar">
                                {COLORS.map(c => (
                                    <button 
                                        key={c}
                                        onClick={() => setColor(c)}
                                        className={`w-10 h-10 rounded-full shrink-0 ${c} flex items-center justify-center transition-transform ${color === c ? 'scale-110 ring-2 ring-offset-2 ring-zinc-400 dark:ring-offset-[#151225]' : 'opacity-70 hover:opacity-100'}`}
                                    >
                                        {color === c && <Check size={16} className="text-white" />}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="pt-2 pb-4">
                            <button 
                                onClick={handleSave}
                                disabled={!name}
                                className={`w-full py-4 rounded-xl font-bold text-white shadow-lg flex items-center justify-center gap-2 transition-all ${!name ? 'bg-zinc-300 dark:bg-zinc-800 cursor-not-allowed' : 'bg-violet-600 hover:bg-violet-500 active:scale-[0.98]'}`}
                            >
                                Add Method
                            </button>
                        </div>
                    </div>
                </div>
            </div>,
            document.body
       )}

       {/* Net Worth Hero */}
       <div className="glass-panel p-6 rounded-[2rem] border border-zinc-200 dark:border-white/5 mb-6 relative overflow-hidden">
           <div className="relative z-10 text-center">
               <span className="text-zinc-500 dark:text-zinc-400 font-bold text-xs uppercase tracking-wider mb-2 block">Total Net Worth</span>
               <h2 className={`text-4xl font-extrabold tracking-tight mb-6 ${netWorth < 0 ? 'text-red-500' : 'text-zinc-900 dark:text-white'}`}>
                   {settings.currencySymbol}{netWorth.toLocaleString()}
               </h2>
               
               <div className="flex items-center justify-center gap-8">
                   <div className="text-center">
                       <div className="flex items-center justify-center gap-1.5 text-emerald-500 mb-1">
                           <TrendingUp size={16} />
                           <span className="text-[10px] font-bold uppercase">Assets</span>
                       </div>
                       <span className="font-bold text-lg">{settings.currencySymbol}{totalAssets.toLocaleString()}</span>
                   </div>
                   <div className="w-px h-8 bg-zinc-200 dark:bg-white/10"></div>
                   <div className="text-center">
                       <div className="flex items-center justify-center gap-1.5 text-red-500 mb-1">
                           <TrendingDown size={16} />
                           <span className="text-[10px] font-bold uppercase">Debt</span>
                       </div>
                       <span className="font-bold text-lg">{settings.currencySymbol}{totalDebt.toLocaleString()}</span>
                   </div>
               </div>
           </div>
       </div>

       {/* Insights Grid */}
       <div className="grid grid-cols-2 gap-4 mb-6">
           {/* Liquidity Card */}
           <div className="glass-panel p-4 rounded-2xl border border-zinc-200 dark:border-white/5">
                <div className="flex items-center gap-2 mb-2">
                    <div className="p-1.5 bg-violet-100 dark:bg-violet-900/20 text-violet-600 rounded-lg">
                        <Coins size={16} />
                    </div>
                    <span className="text-[10px] font-bold text-zinc-500 uppercase">Liquidity</span>
                </div>
                <p className="font-bold text-xl">{settings.currencySymbol}{liquidity.toLocaleString()}</p>
                <p className="text-[10px] text-zinc-400 mt-1">Cash & Bank available</p>
           </div>

           {/* Asset Chart (Mini) */}
           <div className="glass-panel p-4 rounded-2xl border border-zinc-200 dark:border-white/5 flex flex-col justify-between">
                <div className="flex items-center gap-2 mb-2">
                     <div className="p-1.5 bg-zinc-100 dark:bg-white/10 text-zinc-500 rounded-lg">
                         <Percent size={16} />
                     </div>
                     <span className="text-[10px] font-bold text-zinc-500 uppercase">Allocation</span>
                </div>
                <div className="h-12 w-full flex items-center gap-1">
                    {assetDistribution.length > 0 ? (
                        assetDistribution.map((d, i) => (
                            <div key={i} className="h-2 rounded-full" style={{ width: `${(d.value / totalAssets) * 100}%`, backgroundColor: d.color }}></div>
                        ))
                    ) : (
                        <div className="h-2 w-full bg-zinc-100 dark:bg-white/5 rounded-full"></div>
                    )}
                </div>
                <div className="flex justify-between text-[10px] font-medium text-zinc-400">
                    {assetDistribution.slice(0,2).map(d => (
                        <span key={d.name} style={{ color: d.color }}>{Math.round((d.value/totalAssets)*100)}% {d.name}</span>
                    ))}
                </div>
           </div>
       </div>

       {/* Detailed Account List */}
       <div className="space-y-6">
           <h3 className="font-bold text-lg text-zinc-900 dark:text-white px-1">Your Accounts</h3>
           
           {/* List */}
           <div className="space-y-4">
               {accounts.map(acc => {
                   const isCredit = acc.type === 'credit';
                   const balance = acc.current_balance;
                   const limit = acc.credit_limit || 0;
                   const utilization = isCredit && limit > 0 ? (Math.abs(balance) / limit) * 100 : 0;
                   const isDebt = isCredit && balance < 0;

                   return (
                       <div key={acc.id} className="glass-panel p-5 rounded-[1.5rem] border border-zinc-200 dark:border-white/5 group relative overflow-hidden">
                           <div className="flex justify-between items-start mb-4 relative z-10">
                               <div className="flex items-center gap-4">
                                   <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg ${acc.color}`}>
                                       {acc.type === 'bank' ? <Landmark size={20} /> : 
                                        acc.type === 'credit' ? <CreditCard size={20} /> :
                                        acc.type === 'savings' ? <Wallet size={20} /> : <Coins size={20} />}
                                   </div>
                                   <div>
                                       <h4 className="font-bold text-base">{acc.name}</h4>
                                       <span className="text-xs font-medium text-zinc-500 uppercase tracking-wide">{acc.type}</span>
                                   </div>
                               </div>
                               <div className="text-right">
                                   <p className={`font-bold text-lg ${isDebt ? 'text-zinc-900 dark:text-white' : (balance < 0 ? 'text-red-500' : 'text-zinc-900 dark:text-white')}`}>
                                       {settings.currencySymbol}{Math.abs(balance).toLocaleString()}
                                   </p>
                                   {isDebt && <p className="text-[10px] font-bold text-red-500">OWED</p>}
                               </div>
                           </div>

                           {/* Credit Utilization Bar */}
                           {isCredit && limit > 0 && (
                               <div className="relative z-10 bg-zinc-100 dark:bg-black/20 rounded-xl p-3 mt-2">
                                    <div className="flex justify-between text-[10px] font-bold text-zinc-500 dark:text-zinc-400 mb-1.5">
                                        <span className={utilization > 30 ? (utilization > 80 ? 'text-red-500' : 'text-amber-500') : 'text-emerald-500'}>
                                            {utilization.toFixed(0)}% Utilization
                                        </span>
                                        <span>{settings.currencySymbol}{(limit - Math.abs(balance)).toLocaleString()} Available</span>
                                    </div>
                                    <div className="h-2 w-full bg-zinc-200 dark:bg-white/10 rounded-full overflow-hidden">
                                        <div 
                                          className={`h-full rounded-full transition-all duration-500 ${
                                              utilization > 80 ? 'bg-red-500' : 
                                              utilization > 30 ? 'bg-amber-500' : 
                                              'bg-emerald-500'
                                          }`} 
                                          style={{ width: `${Math.min(utilization, 100)}%` }}
                                        />
                                    </div>
                                    {isDebt && (
                                        <button 
                                            onClick={() => openTransactionModal({ 
                                                type: 'transfer', 
                                                to_account_id: acc.id, 
                                                amount: Math.abs(balance) 
                                            })}
                                            className="w-full mt-3 py-2 bg-zinc-900 dark:bg-white text-white dark:text-black text-xs font-bold rounded-lg shadow-md active:scale-[0.98] transition-transform"
                                        >
                                            Pay Off Balance
                                        </button>
                                    )}
                               </div>
                           )}
                           
                           {/* Decorative BG */}
                           <div className={`absolute -right-4 -top-4 w-24 h-24 rounded-full opacity-5 ${acc.color.replace('text-', 'bg-').replace('bg-', 'text-')}`}></div>
                       </div>
                   )
               })}
               
               <button 
                   onClick={() => setIsAdding(true)}
                   className="w-full py-4 border-2 border-dashed border-zinc-200 dark:border-white/10 rounded-[1.5rem] text-zinc-400 font-bold text-sm hover:border-violet-300 hover:text-violet-500 transition-colors flex items-center justify-center gap-2"
               >
                   <Plus size={18} /> Add New Account
               </button>
           </div>
       </div>
    </div>
  );
};

export default Accounts;
