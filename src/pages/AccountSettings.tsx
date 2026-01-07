
import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useFinance } from '../context/FinanceContext';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Plus, Pencil, Wallet, Check, X, Trash2, CreditCard, Landmark, Coins } from 'lucide-react';
import { Account, AccountType } from '../types';

const AccountSettings: React.FC = () => {
  const navigate = useNavigate();
  const { accounts, addAccount, updateAccount, deleteAccount, settings } = useFinance();
  
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Form State
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
      setIsEditing(false);
      setEditingId(null);
  };

  const startEdit = (acc: Account) => {
      setName(acc.name);
      setType(acc.type);
      // For editing: If it's a credit card with negative balance (debt), 
      // show it as positive to the user to reduce confusion, unless they prefer raw mode.
      // Let's stick to raw for editing to avoid flipping back and forth errors, 
      // but strictly handle NEW inputs or updates carefully.
      setBalance(acc.current_balance.toString());
      setCreditLimit(acc.credit_limit ? acc.credit_limit.toString() : '');
      setColor(acc.color);
      setEditingId(acc.id);
      setIsEditing(true);
  };

  const handleSave = () => {
      if (!name) return;
      
      let finalBalance = parseFloat(balance) || 0;

      // Smart Logic: If user selects Credit Card and enters a positive number, 
      // they likely mean "I owe this much".
      // We flip it to negative for consistent debt logic.
      if (type === 'credit' && finalBalance > 0) {
          // Ask for confirmation or just do it? 
          // Usually apps assume Positive entry for Credit Card setup = Debt.
          finalBalance = -finalBalance;
      }

      const accData = {
          name,
          type,
          current_balance: finalBalance,
          currency: 'INR',
          color,
          credit_limit: (type === 'credit' && creditLimit) ? parseFloat(creditLimit) : undefined
      };

      if (editingId) {
          updateAccount({ ...accData, id: editingId });
      } else {
          addAccount({ ...accData, id: crypto.randomUUID() });
      }
      resetForm();
  };

  const handleDelete = (id: string) => {
      if (confirm('Are you sure you want to delete this payment method?')) {
          deleteAccount(id);
      }
  };

  return (
    <div className="p-6 page-transition min-h-screen bg-gray-50 dark:bg-[#0c0a18] text-zinc-900 dark:text-white transition-colors relative">
        {/* Header */}
        <div className="flex items-center space-x-2 mb-8">
            <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-zinc-500 dark:text-zinc-400">
                <ChevronLeft size={24} />
            </button>
            <h1 className="text-xl font-bold tracking-tight">Payment Methods</h1>
        </div>

        {/* Edit Modal / Form Overlay - Portalled to body to escape parent transforms */}
        {isEditing && createPortal(
            <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center">
                {/* Backdrop with Blur - Blurs the content behind the modal */}
                <div 
                    className="absolute inset-0 bg-black/60 backdrop-blur-md transition-opacity" 
                    onClick={resetForm}
                ></div>

                {/* Modal Window - Not Blurred */}
                <div className="relative w-full max-w-md bg-white dark:bg-[#151225] rounded-t-[2rem] sm:rounded-[2rem] shadow-2xl border-t sm:border border-zinc-200 dark:border-white/10 animate-in slide-in-from-bottom-10 max-h-[85vh] flex flex-col overflow-hidden">
                    
                    {/* Header - Fixed at top of modal */}
                    <div className="flex justify-between items-center p-6 pb-4 shrink-0 bg-white dark:bg-[#151225] z-10">
                        <h2 className="text-lg font-bold">{editingId ? 'Edit Method' : 'New Payment Method'}</h2>
                        <button onClick={resetForm} className="p-2 bg-zinc-100 dark:bg-white/5 rounded-full hover:bg-zinc-200 dark:hover:bg-white/10 transition-colors">
                            <X size={20} />
                        </button>
                    </div>

                    {/* Scrollable Content */}
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
                                {editingId ? 'Update Method' : 'Add Method'}
                            </button>
                            
                            {editingId && (
                                <button 
                                    onClick={() => {
                                        handleDelete(editingId);
                                        resetForm();
                                    }}
                                    className="w-full py-3 mt-3 rounded-xl font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors"
                                >
                                    Remove Method
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>,
            document.body
        )}

        {/* Payment Methods List */}
        <div className="grid grid-cols-1 gap-4 pb-24">
            {accounts.map(acc => (
                <div key={acc.id} onClick={() => startEdit(acc)} className="group cursor-pointer relative overflow-hidden rounded-[1.5rem] border border-black/5 dark:border-white/5 shadow-lg active:scale-[0.98] transition-all">
                     {/* Card Background */}
                     <div className={`absolute inset-0 ${acc.color} opacity-90 transition-opacity group-hover:opacity-100`}></div>
                     <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent pointer-events-none"></div>
                     <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>

                     {/* Card Content */}
                     <div className="relative z-10 p-6 flex flex-col justify-between min-h-[140px] text-white">
                         <div className="flex justify-between items-start">
                             <div className="flex flex-col">
                                 <span className="text-white/70 text-xs font-bold uppercase tracking-widest mb-1">{acc.type === 'credit' ? 'Credit Card' : acc.type}</span>
                                 <h3 className="font-bold text-lg tracking-wide shadow-black/10 drop-shadow-md">{acc.name}</h3>
                             </div>
                             {acc.type === 'credit' || acc.type === 'bank' ? (
                                 <div className="w-10 h-7 rounded bg-white/20 flex items-center justify-center border border-white/10">
                                     <div className="w-6 h-4 border border-white/30 rounded-sm flex gap-[2px] items-center justify-center">
                                         <div className="w-[1px] h-full bg-white/30"></div>
                                         <div className="w-[1px] h-full bg-white/30"></div>
                                         <div className="w-[1px] h-full bg-white/30"></div>
                                     </div>
                                 </div>
                             ) : (
                                 <div className="p-2 bg-white/20 rounded-full backdrop-blur-sm">
                                     {acc.type === 'cash' ? <Coins size={18} /> : <Wallet size={18} />}
                                 </div>
                             )}
                         </div>

                         <div className="flex justify-between items-end mt-4">
                             <div className="flex gap-2">
                                 <div className="w-1.5 h-1.5 rounded-full bg-white/50"></div>
                                 <div className="w-1.5 h-1.5 rounded-full bg-white/50"></div>
                                 <div className="w-1.5 h-1.5 rounded-full bg-white/50"></div>
                                 <div className="w-1.5 h-1.5 rounded-full bg-white/50"></div>
                             </div>
                             <div className="text-right">
                                 <p className="text-white/70 text-[10px] font-bold uppercase tracking-wider mb-0.5">
                                    {acc.type === 'credit' ? 'Owed' : 'Balance'}
                                 </p>
                                 <p className="text-2xl font-bold tracking-tight drop-shadow-md">
                                    {settings.currencySymbol}{Math.abs(acc.current_balance).toLocaleString()}
                                 </p>
                                 {acc.credit_limit && acc.type === 'credit' && (
                                     <p className="text-white/50 text-[10px] font-bold mt-1">
                                         Limit: {settings.currencySymbol}{acc.credit_limit.toLocaleString()}
                                     </p>
                                 )}
                             </div>
                         </div>
                     </div>
                </div>
            ))}
            
            <button 
                onClick={() => setIsEditing(true)}
                className="glass-panel border-dashed border-2 border-zinc-300 dark:border-zinc-700 rounded-[1.5rem] p-6 flex flex-col items-center justify-center text-zinc-400 dark:text-zinc-600 hover:text-zinc-600 dark:hover:text-zinc-400 hover:border-zinc-400 dark:hover:border-zinc-500 transition-all min-h-[140px] gap-2 active:scale-[0.98]"
            >
                <Plus size={32} strokeWidth={1.5} />
                <span className="font-bold text-sm">Add New Method</span>
            </button>
        </div>
    </div>
  );
};

export default AccountSettings;
