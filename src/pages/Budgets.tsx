
import React, { useState, useEffect } from 'react';
import { useFinance } from '../context/FinanceContext';
import { Plus, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { isWithinInterval } from 'date-fns';
import { getMonthRange } from '../utils/dateHelpers';
import { useLocation } from 'react-router-dom';
import { CategoryIcon } from '../utils/iconHelpers';

const Budgets: React.FC = () => {
  const { budgets, categories, transactions, addBudget, settings } = useFinance();
  const location = useLocation();
  // Initialize state based on location.state.autoCreate if it exists
  const [isEditing, setIsEditing] = useState(location.state?.autoCreate || false);
  
  const [selectedCat, setSelectedCat] = useState(categories[0]?.id || '');
  const [limit, setLimit] = useState('');

  // Clear the history state to prevent reopening on refresh (optional but good practice)
  useEffect(() => {
    if (location.state?.autoCreate) {
       window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const calculateProgress = (categoryId: string, limit: number) => {
      const now = new Date();
      const { start, end } = getMonthRange(now, settings.monthlyStartDate);

      // Find all subcategory IDs belonging to this category
      const subCategoryIds = categories
        .filter(c => c.parent_category_id === categoryId)
        .map(c => c.id);
      
      // We want to track transactions that match the Budget ID OR any of its children
      const targetCategoryIds = [categoryId, ...subCategoryIds];

      const spent = transactions
        .filter(t => 
            t.type === 'expense' && 
            targetCategoryIds.includes(t.category_id) && 
            isWithinInterval(new Date(t.date), { start, end })
        )
        .reduce((sum, t) => sum + t.amount, 0);
      
      const percentage = Math.min((spent / limit) * 100, 100);
      return { spent, percentage, isOver: spent > limit, remaining: limit - spent };
  };

  const handleSave = () => {
      if(!limit || !selectedCat) return;
      addBudget({
          id: crypto.randomUUID(),
          category_id: selectedCat,
          limit_amount: parseFloat(limit),
          period: 'monthly'
      });
      setIsEditing(false);
      setLimit('');
  };

  return (
    <div className="p-6 page-transition">
       <div className="flex justify-between items-end mb-8">
           <h1 className="text-3xl font-bold text-zinc-900 dark:text-white tracking-tight">Budgets</h1>
           <button 
             onClick={() => setIsEditing(!isEditing)} 
             className="glass-panel text-zinc-900 dark:text-white px-4 py-2 rounded-xl text-sm font-semibold shadow-lg hover:bg-black/5 dark:hover:bg-white/10 active:scale-95 transition-all"
           >
               {isEditing ? 'Cancel' : '+ Create'}
           </button>
       </div>

       {isEditing && (
           <div className="glass-panel p-6 rounded-[2rem] border border-zinc-200 dark:border-white/10 mb-8 animate-in slide-in-from-top-4 fade-in duration-300">
               <label className="block text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase mb-3 tracking-wider">Select Category</label>
               
               {/* Updated to Grid Layout instead of horizontal scroll */}
               <div className="grid grid-cols-2 gap-2 mb-6 max-h-64 overflow-y-auto no-scrollbar">
                   {categories.filter(c => c.type === 'expense').map(cat => (
                       <button
                         key={cat.id}
                         onClick={() => setSelectedCat(cat.id)}
                         className={`flex items-center gap-2 p-2 pr-3 rounded-xl transition-all border text-left ${
                             selectedCat === cat.id 
                             ? 'bg-zinc-900 dark:bg-white text-white dark:text-black border-zinc-900 dark:border-white shadow-md'
                             : 'glass-panel text-zinc-500 border-transparent hover:bg-black/5 dark:hover:bg-white/5'
                         }`}
                       >
                           <div className={`w-8 h-8 shrink-0 rounded-full flex items-center justify-center ${
                               selectedCat === cat.id ? 'bg-white/20' : cat.color
                           }`}>
                               <CategoryIcon iconName={cat.icon} size={16} />
                           </div>
                           <div className="overflow-hidden">
                               <span className="text-xs font-bold truncate block">{cat.name}</span>
                               {cat.parent_category_id && (
                                   <span className="text-[10px] opacity-60 truncate block">
                                       {categories.find(p => p.id === cat.parent_category_id)?.name}
                                   </span>
                               )}
                           </div>
                       </button>
                   ))}
               </div>
               
               <label className="block text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase mb-3 tracking-wider">Monthly Limit</label>
               <div className="flex items-center space-x-3 bg-zinc-100 dark:bg-white/5 p-2 rounded-2xl border border-zinc-200 dark:border-white/10 focus-within:ring-2 ring-violet-500 ring-offset-2 ring-offset-[#f9fafb] dark:ring-offset-[#0c0a18] transition-all">
                   <span className="pl-3 text-zinc-500 font-bold">{settings.currencySymbol}</span>
                   <input 
                     type="number" 
                     value={limit}
                     onChange={(e) => setLimit(e.target.value)}
                     className="flex-1 bg-transparent p-2 text-lg font-bold text-zinc-900 dark:text-white focus:outline-none placeholder:text-zinc-400 dark:placeholder:text-zinc-600"
                     placeholder="0.00"
                     autoFocus
                   />
                   <button 
                     onClick={handleSave}
                     className="bg-violet-600 hover:bg-violet-500 text-white p-3 rounded-xl transition-colors shadow-lg shadow-violet-600/30"
                   >
                       <Plus size={20} />
                   </button>
               </div>
           </div>
       )}

       <div className="space-y-6 pb-24">
           {budgets.length === 0 ? (
               <div className="text-center py-20 opacity-50">
                   <div className="w-20 h-20 glass-panel rounded-full mx-auto mb-4 flex items-center justify-center text-zinc-400 dark:text-zinc-500">
                        <Plus size={32} />
                   </div>
                   <p className="font-medium text-zinc-500">No budgets active</p>
               </div>
           ) : (
               budgets.map(b => {
                   const cat = categories.find(c => c.id === b.category_id);
                   const stats = calculateProgress(b.category_id, b.limit_amount);
                   if (!cat) return null;

                   return (
                       <div key={b.id} className="glass-panel p-6 rounded-[2rem] border border-zinc-200 dark:border-white/5 relative overflow-hidden group">
                           {/* Background progress indicator (subtle) */}
                           <div className="absolute bottom-0 left-0 h-1.5 bg-zinc-200 dark:bg-white/5 w-full">
                               <div 
                                    className={`h-full transition-all duration-700 ease-out ${
                                        stats.isOver ? 'bg-zinc-800 dark:bg-zinc-600' : 'bg-violet-600'
                                    }`}
                                    style={{ width: `${stats.percentage}%` }}
                               ></div>
                           </div>

                           <div className="flex justify-between items-start mb-4">
                               <div className="flex items-center space-x-4">
                                   <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm ${cat.color}`}>
                                       <CategoryIcon iconName={cat.icon} size={24} />
                                   </div>
                                   <div>
                                       <h3 className="font-bold text-zinc-900 dark:text-white text-lg">{cat.name}</h3>
                                       <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mt-0.5">
                                            {stats.isOver ? 
                                                <span className="text-zinc-600 dark:text-zinc-300 flex items-center gap-1"><AlertTriangle size={12} /> Exceeded by {settings.currencySymbol}{Math.abs(stats.remaining).toLocaleString()}</span> 
                                                : <span className="text-violet-600 dark:text-violet-400 flex items-center gap-1"><CheckCircle2 size={12} /> {settings.currencySymbol}{stats.remaining.toLocaleString()} left</span>
                                            }
                                       </p>
                                   </div>
                               </div>
                               <div className="text-right">
                                   <div className="font-bold text-zinc-900 dark:text-white text-xl">{Math.round(stats.percentage)}%</div>
                               </div>
                           </div>
                           
                           <div className="flex justify-between items-end">
                                <span className="text-xs font-bold text-zinc-500 uppercase tracking-wide">Spent</span>
                                <div className="text-right">
                                   <span className="font-bold text-zinc-900 dark:text-white">{settings.currencySymbol}{stats.spent.toLocaleString()}</span>
                                   <span className="text-zinc-500 text-sm font-medium ml-1">/ {b.limit_amount}</span>
                               </div>
                           </div>
                       </div>
                   )
               })
           )}
       </div>
    </div>
  );
};

export default Budgets;
