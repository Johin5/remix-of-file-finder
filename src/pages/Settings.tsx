
import React, { useRef } from 'react';
import { useFinance } from '../context/FinanceContext';
import { ChevronRight, CreditCard, Tag, Sliders, Camera, User, ChevronLeft, Moon, Sun, DollarSign, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { CURRENCIES } from '../constants';

const Settings: React.FC = () => {
  const { settings, updateSettings, resetData } = useFinance();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        updateSettings({ userAvatar: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="p-6 page-transition h-full flex flex-col dark:text-white text-zinc-900 pb-24">
       {/* Header */}
       <div className="flex items-center space-x-4 mb-8">
           <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-zinc-500 dark:text-zinc-400">
               <ChevronLeft size={24} />
           </button>
           <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
       </div>

       {/* Profile Section */}
       <div className="flex flex-col items-center mb-8">
           <div className="relative group">
               <div className="w-24 h-24 rounded-full p-1 bg-violet-500">
                   <div className="w-full h-full rounded-full bg-white dark:bg-[#1e1b2e] overflow-hidden flex items-center justify-center relative">
                       {settings.userAvatar ? (
                           <img src={settings.userAvatar} alt="Profile" className="w-full h-full object-cover" />
                       ) : (
                           <User size={40} className="text-zinc-400" />
                       )}
                   </div>
               </div>
               <button 
                 onClick={() => fileInputRef.current?.click()}
                 className="absolute bottom-0 right-0 p-2 bg-white dark:bg-zinc-800 text-black dark:text-white rounded-full shadow-lg active:scale-95 transition-transform"
               >
                   <Camera size={16} />
               </button>
               <input 
                 type="file" 
                 ref={fileInputRef} 
                 className="hidden" 
                 accept="image/*"
                 onChange={handleFileChange}
               />
           </div>
           <input 
             value={settings.userName}
             onChange={(e) => updateSettings({ userName: e.target.value })}
             className="mt-4 bg-transparent text-center text-xl font-bold border-b border-transparent focus:border-zinc-300 dark:focus:border-white/20 focus:outline-none transition-colors"
           />
           <p className="text-xs text-zinc-500 font-medium uppercase tracking-wider mt-1">Tap name to edit</p>
       </div>

       {/* Settings Menu */}
       <div className="space-y-4">
           {/* Theme Toggle */}
           <button 
             onClick={() => updateSettings({ themeMode: settings.themeMode === 'dark' ? 'light' : 'dark' })}
             className="w-full glass-panel p-4 rounded-2xl flex items-center justify-between group active:scale-[0.98] transition-all"
           >
               <div className="flex items-center space-x-4">
                   <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                       settings.themeMode === 'dark' ? 'bg-violet-500/10 text-violet-400' : 'bg-violet-500/10 text-violet-500'
                   }`}>
                       {settings.themeMode === 'dark' ? <Moon size={20} /> : <Sun size={20} />}
                   </div>
                   <div className="text-left">
                       <span className="block font-bold text-sm">Theme Mode</span>
                       <span className="block text-zinc-500 text-xs">{settings.themeMode === 'dark' ? 'Dark Mode' : 'Light Mode'}</span>
                   </div>
               </div>
               <div className={`w-12 h-7 rounded-full relative transition-colors ${settings.themeMode === 'dark' ? 'bg-violet-600' : 'bg-zinc-200'}`}>
                   <div className={`w-5 h-5 bg-white rounded-full absolute top-1 shadow-sm transition-all ${settings.themeMode === 'dark' ? 'left-6' : 'left-1'}`}></div>
               </div>
           </button>

           {/* Currency Selector */}
           <div className="w-full glass-panel p-4 rounded-2xl flex items-center justify-between">
                <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                        <DollarSign size={20} />
                    </div>
                    <div className="text-left">
                        <span className="block font-bold text-sm">Currency</span>
                        <span className="block text-zinc-500 text-xs">Display Symbol</span>
                    </div>
                </div>
                <div className="relative">
                     <select 
                         value={settings.currencySymbol}
                         onChange={(e) => updateSettings({ currencySymbol: e.target.value })}
                         className="appearance-none bg-zinc-100 dark:bg-white/5 font-bold text-sm py-2 pl-3 pr-8 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-zinc-900 dark:text-white"
                     >
                         {CURRENCIES.map(c => (
                             <option key={c.code} value={c.symbol} className="text-zinc-900 bg-white dark:bg-zinc-800 dark:text-white">
                                 {c.code} ({c.symbol})
                             </option>
                         ))}
                     </select>
                     <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-400">
                         <ChevronRight size={14} className="rotate-90" />
                     </div>
                </div>
           </div>

           {/* Payment Methods (Previously Accounts) */}
           <button 
             onClick={() => navigate('/settings/accounts')}
             className="w-full glass-panel p-4 rounded-2xl flex items-center justify-between group active:scale-[0.98] transition-all"
           >
               <div className="flex items-center space-x-4">
                   <div className="w-10 h-10 rounded-full bg-violet-500/10 text-violet-400 flex items-center justify-center">
                       <CreditCard size={20} />
                   </div>
                   <div className="text-left">
                       <span className="block font-bold text-sm">Payment Methods</span>
                       <span className="block text-zinc-500 text-xs">Cards, Cash & Accounts</span>
                   </div>
               </div>
               <ChevronRight size={18} className="text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-white transition-colors" />
           </button>

           {/* Expense Categories */}
           <button 
             onClick={() => navigate('/settings/categories/expense')}
             className="w-full glass-panel p-4 rounded-2xl flex items-center justify-between group active:scale-[0.98] transition-all"
           >
               <div className="flex items-center space-x-4">
                   <div className="w-10 h-10 rounded-full bg-violet-500/10 text-violet-400 flex items-center justify-center">
                       <Tag size={20} />
                   </div>
                   <div className="text-left">
                       <span className="block font-bold text-sm">Expense Categories</span>
                       <span className="block text-zinc-500 text-xs">Manage your spending types</span>
                   </div>
               </div>
               <ChevronRight size={18} className="text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-white transition-colors" />
           </button>

           {/* Income Categories */}
           <button 
             onClick={() => navigate('/settings/categories/income')}
             className="w-full glass-panel p-4 rounded-2xl flex items-center justify-between group active:scale-[0.98] transition-all"
           >
               <div className="flex items-center space-x-4">
                   <div className="w-10 h-10 rounded-full bg-violet-500/10 text-violet-400 flex items-center justify-center">
                       <Tag size={20} className="rotate-180" />
                   </div>
                   <div className="text-left">
                       <span className="block font-bold text-sm">Income Categories</span>
                       <span className="block text-zinc-500 text-xs">Manage income sources</span>
                   </div>
               </div>
               <ChevronRight size={18} className="text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-white transition-colors" />
           </button>

           {/* Transaction Settings */}
           <button 
             onClick={() => navigate('/settings/transactions')}
             className="w-full glass-panel p-4 rounded-2xl flex items-center justify-between group active:scale-[0.98] transition-all"
           >
               <div className="flex items-center space-x-4">
                   <div className="w-10 h-10 rounded-full bg-zinc-200 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 flex items-center justify-center">
                       <Sliders size={20} />
                   </div>
                   <div className="text-left">
                       <span className="block font-bold text-sm">Transaction Settings</span>
                       <span className="block text-zinc-500 text-xs">Global app preferences</span>
                   </div>
               </div>
               <ChevronRight size={18} className="text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-white transition-colors" />
           </button>

           {/* Reset Data */}
           <button 
             onClick={() => {
                 if (confirm('Are you sure you want to reset all data to the demo dataset? This cannot be undone.')) {
                     resetData();
                 }
             }}
             className="w-full glass-panel p-4 rounded-2xl flex items-center justify-between group active:scale-[0.98] transition-all mt-8 border-red-200 dark:border-red-900/30"
           >
               <div className="flex items-center space-x-4">
                   <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/20 text-red-500 flex items-center justify-center">
                       <Trash2 size={20} />
                   </div>
                   <div className="text-left">
                       <span className="block font-bold text-sm text-red-600 dark:text-red-400">Reset Demo Data</span>
                       <span className="block text-red-400 dark:text-red-500/70 text-xs">Clear everything and reload seed data</span>
                   </div>
               </div>
           </button>
       </div>
    </div>
  );
};

export default Settings;
