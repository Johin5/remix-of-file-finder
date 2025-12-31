import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, Check, Tag, CreditCard, Repeat, Calendar, FileText, ArrowRight, Trash2, ChevronRight, ArrowLeft } from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { Category, TransactionType, RecurrenceRule } from '../types';
import { format } from 'date-fns';
import { CategoryIcon } from '../utils/iconHelpers';

interface Props {
  onClose: () => void;
}

const TransactionForm: React.FC<Props> = ({ onClose }) => {
  const { accounts, categories, addTransaction, updateTransaction, deleteTransaction, settings, transactionModalDefault } = useFinance();
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<TransactionType>('expense');
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [selectedAccountId, setSelectedAccountId] = useState(accounts[0]?.id || '');
  const [toAccountId, setToAccountId] = useState(''); 
  const [notes, setNotes] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceRule, setRecurrenceRule] = useState<RecurrenceRule>('monthly');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [categoryViewMode, setCategoryViewMode] = useState<'root' | 'sub'>('root');
  const [activeParentCategory, setActiveParentCategory] = useState<Category | null>(null);

  useEffect(() => {
      if (transactionModalDefault) {
          if (transactionModalDefault.id) setEditingId(transactionModalDefault.id);
          if (transactionModalDefault.type) setType(transactionModalDefault.type);
          if (transactionModalDefault.account_id) setSelectedAccountId(transactionModalDefault.account_id);
          if (transactionModalDefault.to_account_id) setToAccountId(transactionModalDefault.to_account_id);
          if (transactionModalDefault.amount) setAmount(transactionModalDefault.amount.toString());
          if (transactionModalDefault.date) setSelectedDate(format(new Date(transactionModalDefault.date), 'yyyy-MM-dd'));
          if (transactionModalDefault.notes) setNotes(transactionModalDefault.notes);
          if (transactionModalDefault.is_recurring) setIsRecurring(true);
          if (transactionModalDefault.recurrence_rule) setRecurrenceRule(transactionModalDefault.recurrence_rule);
          if (transactionModalDefault.category_id) {
             setSelectedCategoryId(transactionModalDefault.category_id);
             const cat = categories.find(c => c.id === transactionModalDefault.category_id);
             if (cat && cat.parent_category_id) {
                 const parent = categories.find(p => p.id === cat.parent_category_id);
                 if (parent) {
                     setActiveParentCategory(parent);
                     setCategoryViewMode('sub');
                 }
             }
          }
      } else {
          if (accounts.length > 1) {
              const bank = accounts.find(a => a.type === 'bank' || a.type === 'cash');
              if (bank) setSelectedAccountId(bank.id);
          }
      }
  }, [transactionModalDefault, accounts, categories]);

  useEffect(() => {
    if (type === 'transfer') {
        setSelectedCategoryId('cat_transfer');
        setCategoryViewMode('root');
        if (!toAccountId && accounts.length > 1) {
            const dest = accounts.find(a => a.id !== selectedAccountId);
            if (dest) setToAccountId(dest.id);
        }
        return;
    }
    setCategoryViewMode('root');
    setActiveParentCategory(null);
    const currentCat = categories.find(c => c.id === selectedCategoryId);
    const firstCat = categories.find(c => c.type === type && !c.parent_category_id);
    if (!currentCat || currentCat.type !== type) {
        if (firstCat) setSelectedCategoryId(firstCat.id);
    }
  }, [type, categories, selectedCategoryId, accounts, selectedAccountId, toAccountId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) return;
    
    const txData = {
      id: editingId || crypto.randomUUID(),
      type,
      amount: parseFloat(amount),
      currency: 'INR',
      date: new Date(selectedDate).toISOString(),
      account_id: selectedAccountId,
      to_account_id: type === 'transfer' ? toAccountId : undefined,
      category_id: selectedCategoryId,
      notes,
      created_at: editingId ? (transactionModalDefault?.created_at || Date.now()) : Date.now(),
      is_recurring: isRecurring,
      recurrence_rule: isRecurring ? recurrenceRule : undefined,
    };

    if (editingId) {
        updateTransaction(txData);
    } else {
        addTransaction(txData);
    }
    onClose();
  };

  const confirmDelete = () => {
      if (editingId) {
          deleteTransaction(editingId);
          onClose();
      }
  };

  const currentTypeCategories = useMemo(() => categories.filter(c => c.type === type), [categories, type]);
  const rootCategories = useMemo(() => currentTypeCategories.filter(c => !c.parent_category_id), [currentTypeCategories]);
  const getSubcategories = (parentId: string) => currentTypeCategories.filter(c => c.parent_category_id === parentId);

  const handleCategoryClick = (cat: Category) => {
      const subs = getSubcategories(cat.id);
      if (subs.length > 0) {
          setActiveParentCategory(cat);
          setCategoryViewMode('sub');
      } else {
          setSelectedCategoryId(cat.id);
      }
  };

  const isPayBill = type === 'transfer' && accounts.find(a => a.id === toAccountId)?.type === 'credit';

  return createPortal(
    <div className="fixed inset-0 z-[100] flex justify-center items-end sm:items-center pointer-events-none">
        <div className="absolute inset-0 bg-black/30 backdrop-blur-sm pointer-events-auto transition-opacity" onClick={onClose}></div>
        
        <div className="w-full max-w-md h-[100dvh] bg-gray-50 dark:bg-[#0c0a18] text-zinc-900 dark:text-white pointer-events-auto flex flex-col animate-in slide-in-from-bottom-10 duration-200 shadow-2xl overflow-hidden relative border-x border-zinc-200 dark:border-white/5">
            
            <div className="flex justify-between items-center px-6 py-4 bg-white dark:bg-[#0c0a18] shrink-0 border-b border-zinc-100 dark:border-white/5">
                 <h2 className="text-lg font-bold text-zinc-900 dark:text-white tracking-tight">
                     {editingId ? 'Edit Transaction' : (isPayBill ? 'Pay Credit Card Bill' : 'New Transaction')}
                 </h2>
                 <div className="flex items-center gap-2 -mr-2">
                     {editingId && !showDeleteConfirm && (
                         <button onClick={() => setShowDeleteConfirm(true)} className="p-2 rounded-full bg-red-50 dark:bg-red-900/10 text-red-500">
                             <Trash2 size={20} />
                         </button>
                     )}
                     {showDeleteConfirm && (
                         <div className="flex items-center gap-2 animate-in slide-in-from-right-4 mr-2">
                            <span className="text-xs font-bold text-red-500">Delete?</span>
                            <button onClick={() => setShowDeleteConfirm(false)} className="p-1.5 px-3 rounded-full bg-zinc-100 dark:bg-zinc-800 text-xs font-bold">Cancel</button>
                            <button onClick={confirmDelete} className="p-1.5 px-3 rounded-full bg-red-500 text-white text-xs font-bold">Confirm</button>
                         </div>
                     )}
                     <button onClick={onClose} className="p-2 rounded-full bg-zinc-100 dark:bg-white/5 text-zinc-500">
                        <X size={24} />
                     </button>
                 </div>
            </div>

            <div className="flex-1 overflow-y-auto no-scrollbar px-6 pb-32">
                <div className="flex flex-col items-center justify-center py-8">
                    <div className="flex items-baseline text-zinc-900 dark:text-white">
                        <span className="text-3xl font-bold mr-1 text-zinc-400">{settings.currencySymbol}</span>
                        <input 
                            type="number" 
                            inputMode="decimal"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            placeholder="0"
                            className="text-6xl font-extrabold bg-transparent outline-none text-center w-full max-w-[250px] placeholder-zinc-300 dark:placeholder-zinc-700 caret-violet-600"
                        />
                    </div>
                </div>

                <div className="bg-zinc-200 dark:bg-white/5 p-1.5 rounded-2xl flex mb-8">
                    {(['expense', 'income', 'transfer'] as TransactionType[]).map((t) => (
                        <button
                            key={t}
                            onClick={() => setType(t)}
                            className={`flex-1 py-3 text-sm font-bold rounded-xl capitalize transition-all ${
                                type === t 
                                ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm'
                                : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
                            }`}
                        >
                            {t}
                        </button>
                    ))}
                </div>

                <div className="space-y-8">
                    <div className="space-y-3">
                        <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-2 px-1">
                            <CreditCard size={14} /> {type === 'transfer' ? 'From Account' : 'Account'}
                        </label>
                        <div className="flex overflow-x-auto space-x-3 pb-2 no-scrollbar -mx-6 px-6">
                            {accounts.map(acc => (
                                <button
                                    key={acc.id}
                                    onClick={() => setSelectedAccountId(acc.id)}
                                    className={`flex-shrink-0 px-4 py-3 rounded-2xl text-sm font-semibold transition-all border flex flex-col items-start gap-1 min-w-[120px] ${
                                        selectedAccountId === acc.id 
                                        ? 'bg-zinc-900 dark:bg-white text-white dark:text-black border-zinc-900 dark:border-white shadow-md' 
                                        : 'glass-panel text-zinc-500 dark:text-zinc-400 border-transparent hover:bg-black/5 dark:hover:bg-white/5'
                                    }`}
                                >
                                    <span className="text-xs opacity-70 uppercase tracking-wider">{acc.type}</span>
                                    <span className="truncate w-full text-left">{acc.name}</span>
                                </button>
                            ))}
                        </div>

                        {type === 'transfer' && (
                             <div className="mt-4 pt-4 border-t border-zinc-200 dark:border-white/5 relative">
                                <div className="absolute top-[-12px] left-1/2 -translate-x-1/2 bg-gray-50 dark:bg-[#0c0a18] p-1 text-zinc-400">
                                    <ArrowRight size={16} />
                                </div>
                                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-2 px-1 mb-3">
                                    <CreditCard size={14} /> To Account
                                </label>
                                <div className="flex overflow-x-auto space-x-3 pb-2 no-scrollbar -mx-6 px-6">
                                    {accounts.map(acc => (
                                        <button
                                            key={acc.id}
                                            onClick={() => setToAccountId(acc.id)}
                                            disabled={selectedAccountId === acc.id}
                                            className={`flex-shrink-0 px-4 py-3 rounded-2xl text-sm font-semibold transition-all border flex flex-col items-start gap-1 min-w-[120px] ${
                                                toAccountId === acc.id 
                                                ? 'bg-zinc-900 dark:bg-white text-white dark:text-black border-zinc-900 dark:border-white shadow-md' 
                                                : selectedAccountId === acc.id 
                                                    ? 'opacity-30 bg-black/5 dark:bg-white/5 border-transparent cursor-not-allowed'
                                                    : 'glass-panel text-zinc-500 dark:text-zinc-400 border-transparent hover:bg-black/5 dark:hover:bg-white/5'
                                            }`}
                                        >
                                            <span className="text-xs opacity-70 uppercase tracking-wider">{acc.type}</span>
                                            <span className="truncate w-full text-left">{acc.name}</span>
                                        </button>
                                    ))}
                                </div>
                             </div>
                        )}
                    </div>

                    {type !== 'transfer' && (
                        <div className="space-y-3">
                            <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-2 px-1">
                                <Tag size={14} /> Category
                            </label>
                            
                            <div className="grid grid-cols-4 gap-2">
                                {categoryViewMode === 'root' && rootCategories.map(cat => {
                                    const hasSubs = getSubcategories(cat.id).length > 0;
                                    const isFamilySelected = selectedCategoryId === cat.id || getSubcategories(cat.id).some(c => c.id === selectedCategoryId);

                                    return (
                                        <button
                                            key={cat.id}
                                            onClick={() => handleCategoryClick(cat)}
                                            className={`flex flex-col items-center p-2 rounded-2xl transition-all border relative overflow-hidden aspect-square justify-center ${
                                                isFamilySelected
                                                ? 'border-violet-500/50 bg-violet-50 dark:bg-violet-500/10'
                                                : 'glass-panel border-transparent hover:bg-black/5 dark:hover:bg-white/5'
                                            }`}
                                        >
                                            {hasSubs && (
                                                <div className="absolute top-1.5 right-1.5 text-zinc-400">
                                                    <ChevronRight size={12} />
                                                </div>
                                            )}
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold mb-1 shadow-sm ${cat.color}`}>
                                                <CategoryIcon iconName={cat.icon} size={16} />
                                            </div>
                                            <span className={`text-[10px] font-bold truncate w-full text-center ${isFamilySelected ? 'text-zinc-900 dark:text-white' : 'text-zinc-500'}`}>
                                                {cat.name}
                                            </span>
                                        </button>
                                    )
                                })}

                                {categoryViewMode === 'sub' && activeParentCategory && (
                                    <>
                                        <button
                                            onClick={() => { setCategoryViewMode('root'); setActiveParentCategory(null); }}
                                            className="flex flex-col items-center p-2 rounded-2xl transition-all border glass-panel border-transparent hover:bg-black/5 dark:hover:bg-white/5 aspect-square justify-center"
                                        >
                                            <div className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-500 bg-zinc-200 dark:bg-zinc-800 mb-1">
                                                <ArrowLeft size={16} />
                                            </div>
                                            <span className="text-[10px] font-bold text-zinc-500">Back</span>
                                        </button>

                                        <button
                                            onClick={() => setSelectedCategoryId(activeParentCategory.id)}
                                            className={`flex flex-col items-center p-2 rounded-2xl transition-all border aspect-square justify-center ${
                                                selectedCategoryId === activeParentCategory.id
                                                ? 'border-violet-500/50 bg-violet-50 dark:bg-violet-500/10'
                                                : 'glass-panel border-transparent hover:bg-black/5 dark:hover:bg-white/5'
                                            }`}
                                        >
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-1 shadow-sm ${activeParentCategory.color}`}>
                                                <CategoryIcon iconName={activeParentCategory.icon} size={16} />
                                            </div>
                                            <span className={`text-[10px] font-bold truncate w-full text-center ${selectedCategoryId === activeParentCategory.id ? 'text-zinc-900 dark:text-white' : 'text-zinc-500'}`}>
                                                All {activeParentCategory.name}
                                            </span>
                                        </button>

                                        {getSubcategories(activeParentCategory.id).map(sub => (
                                            <button
                                                key={sub.id}
                                                onClick={() => setSelectedCategoryId(sub.id)}
                                                className={`flex flex-col items-center p-2 rounded-2xl transition-all border aspect-square justify-center ${
                                                    selectedCategoryId === sub.id
                                                    ? 'border-violet-500/50 bg-violet-50 dark:bg-violet-500/10'
                                                    : 'glass-panel border-transparent hover:bg-black/5 dark:hover:bg-white/5'
                                                }`}
                                            >
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-1 shadow-sm scale-90 ${sub.color}`}>
                                                    <CategoryIcon iconName={sub.icon} size={14} />
                                                </div>
                                                <span className={`text-[10px] font-bold truncate w-full text-center ${selectedCategoryId === sub.id ? 'text-zinc-900 dark:text-white' : 'text-zinc-500'}`}>
                                                    {sub.name}
                                                </span>
                                            </button>
                                        ))}
                                    </>
                                )}
                            </div>
                        </div>
                    )}

                    <div className="space-y-3">
                        <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-2 px-1">
                            <FileText size={14} /> Details
                        </label>
                        <div className="glass-panel rounded-2xl overflow-hidden divide-y divide-zinc-100 dark:divide-white/5">
                            <div className="flex items-center p-4">
                                <div className="w-8 flex justify-center text-zinc-400"><Calendar size={18} /></div>
                                <input 
                                    type="date"
                                    value={selectedDate}
                                    onChange={(e) => setSelectedDate(e.target.value)}
                                    className="flex-1 bg-transparent text-base font-semibold text-zinc-900 dark:text-white focus:outline-none"
                                />
                            </div>
                            <div className="flex items-center p-4">
                                <div className="w-8 flex justify-center text-zinc-400"><FileText size={18} /></div>
                                <input 
                                    type="text"
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    placeholder="Add a note..."
                                    className="flex-1 bg-transparent text-base font-semibold text-zinc-900 dark:text-white focus:outline-none placeholder:text-zinc-400"
                                />
                            </div>
                            <div className="p-4">
                                <div className="flex justify-between items-center cursor-pointer" onClick={() => setIsRecurring(!isRecurring)}>
                                    <div className="flex items-center gap-3">
                                         <div className="w-8 flex justify-center text-zinc-400"><Repeat size={18} /></div>
                                         <span className="text-sm font-semibold text-zinc-900 dark:text-white">Recurring Payment</span>
                                    </div>
                                    <div className={`w-10 h-6 rounded-full transition-colors relative ${isRecurring ? 'bg-violet-600' : 'bg-zinc-200 dark:bg-zinc-700'}`}>
                                         <div className={`w-4 h-4 bg-white rounded-full shadow-sm absolute top-1 transition-all ${isRecurring ? 'left-5' : 'left-1'}`}></div>
                                    </div>
                                </div>
                                
                                {isRecurring && (
                                    <div className="flex gap-2 mt-4 pl-11 animate-in slide-in-from-top-2 fade-in">
                                         {(['daily', 'weekly', 'monthly'] as RecurrenceRule[]).map(opt => (
                                             <button
                                                key={opt}
                                                type="button"
                                                onClick={() => setRecurrenceRule(opt)}
                                                className={`px-3 py-1.5 text-xs font-bold rounded-lg capitalize border ${
                                                    recurrenceRule === opt 
                                                    ? 'bg-zinc-900 dark:bg-white text-white dark:text-black border-zinc-900 dark:border-white' 
                                                    : 'bg-black/5 dark:bg-white/5 text-zinc-500 border-transparent'
                                                }`}
                                             >
                                                 {opt}
                                             </button>
                                         ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="absolute bottom-0 left-0 w-full p-4 bg-white/80 dark:bg-[#0c0a18]/80 backdrop-blur-xl border-t border-zinc-200 dark:border-white/5 pb-safe z-10">
                 <button 
                    onClick={handleSubmit}
                    disabled={!amount}
                    className={`w-full py-4 rounded-[1.25rem] font-bold text-lg shadow-xl transition-all active:scale-[0.98] flex items-center justify-center gap-3 ${
                        amount 
                        ? 'bg-violet-600 text-white shadow-violet-600/30 hover:bg-violet-500' 
                        : 'bg-zinc-200 dark:bg-white/10 text-zinc-400 cursor-not-allowed'
                    }`}
                 >
                    <Check size={24} strokeWidth={3} />
                    {editingId ? 'Update Transaction' : 'Save Transaction'}
                 </button>
            </div>
        </div>
    </div>,
    document.body
  );
};

export default TransactionForm;
