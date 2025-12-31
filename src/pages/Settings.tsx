import React from 'react';
import { useFinance } from '../context/FinanceContext';
import { Link } from 'react-router-dom';
import { User, CreditCard, Tag, Moon, Sun, ChevronRight, RefreshCw, DollarSign } from 'lucide-react';
import { CURRENCIES } from '../constants';

const Settings: React.FC = () => {
  const { settings, updateSettings, resetData } = useFinance();

  const toggleTheme = () => {
    updateSettings({ themeMode: settings.themeMode === 'dark' ? 'light' : 'dark' });
  };

  const handleCurrencyChange = (symbol: string) => {
    updateSettings({ currencySymbol: symbol });
  };

  return (
    <div className="p-6 space-y-6 page-transition pb-32">
      <div className="pt-2">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white tracking-tight">Settings</h1>
      </div>

      {/* Profile */}
      <div className="glass-panel p-4 rounded-2xl border border-zinc-200 dark:border-white/5">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center overflow-hidden">
            {settings.userAvatar ? (
              <img src={settings.userAvatar} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <User size={24} className="text-zinc-400" />
            )}
          </div>
          <div className="flex-1">
            <input
              type="text"
              value={settings.userName}
              onChange={(e) => updateSettings({ userName: e.target.value })}
              className="text-lg font-bold text-zinc-900 dark:text-white bg-transparent outline-none w-full"
              placeholder="Your name"
            />
            <p className="text-xs text-zinc-500">Tap to edit name</p>
          </div>
        </div>
      </div>

      {/* Theme Toggle */}
      <div className="glass-panel rounded-2xl border border-zinc-200 dark:border-white/5 overflow-hidden">
        <button
          onClick={toggleTheme}
          className="w-full flex items-center justify-between p-4 hover:bg-zinc-50 dark:hover:bg-white/5 transition-colors"
        >
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-white/5 flex items-center justify-center text-zinc-500">
              {settings.themeMode === 'dark' ? <Moon size={18} /> : <Sun size={18} />}
            </div>
            <div className="text-left">
              <p className="font-semibold text-zinc-900 dark:text-white">Theme</p>
              <p className="text-xs text-zinc-500">{settings.themeMode === 'dark' ? 'Dark mode' : 'Light mode'}</p>
            </div>
          </div>
          <div className={`w-12 h-7 rounded-full transition-colors relative ${settings.themeMode === 'dark' ? 'bg-violet-600' : 'bg-zinc-200'}`}>
            <div className={`w-5 h-5 bg-white rounded-full shadow absolute top-1 transition-all ${settings.themeMode === 'dark' ? 'left-6' : 'left-1'}`} />
          </div>
        </button>
      </div>

      {/* Currency */}
      <div className="glass-panel rounded-2xl border border-zinc-200 dark:border-white/5 p-4 space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-white/5 flex items-center justify-center text-zinc-500">
            <DollarSign size={18} />
          </div>
          <span className="font-semibold text-zinc-900 dark:text-white">Currency</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {CURRENCIES.slice(0, 8).map(c => (
            <button
              key={c.code}
              onClick={() => handleCurrencyChange(c.symbol)}
              className={`px-3 py-2 rounded-xl text-sm font-semibold transition-all ${
                settings.currencySymbol === c.symbol
                  ? 'bg-violet-600 text-white'
                  : 'bg-zinc-100 dark:bg-white/5 text-zinc-600 dark:text-zinc-300'
              }`}
            >
              {c.symbol} {c.code}
            </button>
          ))}
        </div>
      </div>

      {/* Navigation Links */}
      <div className="glass-panel rounded-2xl border border-zinc-200 dark:border-white/5 overflow-hidden divide-y divide-zinc-100 dark:divide-white/5">
        <Link
          to="/accounts"
          className="w-full flex items-center justify-between p-4 hover:bg-zinc-50 dark:hover:bg-white/5 transition-colors"
        >
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-white/5 flex items-center justify-center text-zinc-500">
              <CreditCard size={18} />
            </div>
            <span className="font-semibold text-zinc-900 dark:text-white">Manage Accounts</span>
          </div>
          <ChevronRight size={18} className="text-zinc-400" />
        </Link>

        <Link
          to="/categories"
          className="w-full flex items-center justify-between p-4 hover:bg-zinc-50 dark:hover:bg-white/5 transition-colors"
        >
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-white/5 flex items-center justify-center text-zinc-500">
              <Tag size={18} />
            </div>
            <span className="font-semibold text-zinc-900 dark:text-white">Manage Categories</span>
          </div>
          <ChevronRight size={18} className="text-zinc-400" />
        </Link>
      </div>

      {/* Reset */}
      <div className="glass-panel rounded-2xl border border-zinc-200 dark:border-white/5 overflow-hidden">
        <button
          onClick={() => {
            if (confirm('Reset all data? This cannot be undone.')) {
              resetData();
            }
          }}
          className="w-full flex items-center justify-between p-4 hover:bg-red-50 dark:hover:bg-red-500/5 transition-colors"
        >
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-500/10 flex items-center justify-center text-red-500">
              <RefreshCw size={18} />
            </div>
            <div className="text-left">
              <p className="font-semibold text-red-600 dark:text-red-400">Reset Data</p>
              <p className="text-xs text-zinc-500">Clear all and load demo data</p>
            </div>
          </div>
        </button>
      </div>
    </div>
  );
};

export default Settings;
