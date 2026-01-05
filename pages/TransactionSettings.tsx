
import React from 'react';
import { useFinance } from '../context/FinanceContext';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Calendar, CalendarDays } from 'lucide-react';

const TransactionSettings: React.FC = () => {
  const navigate = useNavigate();
  const { settings, updateSettings } = useFinance();

  const days = Array.from({length: 28}, (_, i) => i + 1);
  const weekDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  return (
    <div className="p-6 page-transition min-h-screen bg-gray-50 dark:bg-[#0c0a18] text-zinc-900 dark:text-white transition-colors">
        {/* Header */}
        <div className="flex items-center space-x-2 mb-8">
            <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-zinc-500 dark:text-zinc-400">
                <ChevronLeft size={24} />
            </button>
            <h1 className="text-xl font-bold tracking-tight">Transaction Settings</h1>
        </div>

        <div className="space-y-4">
            {/* Monthly Start Date */}
            <div className="glass-panel p-4 rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 rounded-xl">
                        <Calendar size={20} />
                    </div>
                    <div>
                        <p className="font-bold text-sm">Monthly Start Date</p>
                        <p className="text-xs text-zinc-500">Day when your budget resets</p>
                    </div>
                </div>
                <div className="relative">
                    <select 
                        value={settings.monthlyStartDate}
                        onChange={(e) => updateSettings({ monthlyStartDate: Number(e.target.value) })}
                        className="appearance-none bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white font-bold text-sm py-2 pl-4 pr-8 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500"
                    >
                        {days.map(d => (
                            <option key={d} value={d}>{d}{d === 1 ? 'st' : d === 2 ? 'nd' : d === 3 ? 'rd' : 'th'}</option>
                        ))}
                    </select>
                </div>
            </div>
            
            {/* Weekly Start Day */}
            <div className="glass-panel p-4 rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 rounded-xl">
                        <CalendarDays size={20} />
                    </div>
                    <div>
                        <p className="font-bold text-sm">Weekly Start Day</p>
                        <p className="text-xs text-zinc-500">First day of the week</p>
                    </div>
                </div>
                <div className="relative">
                    <select 
                        value={settings.weeklyStartDay}
                        onChange={(e) => updateSettings({ weeklyStartDay: e.target.value })}
                        className="appearance-none bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white font-bold text-sm py-2 pl-4 pr-8 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500"
                    >
                        {weekDays.map(d => (
                            <option key={d} value={d}>{d}</option>
                        ))}
                    </select>
                </div>
            </div>
        </div>
    </div>
  );
};

export default TransactionSettings;
