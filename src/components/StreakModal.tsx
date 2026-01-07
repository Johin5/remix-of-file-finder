
import React, { useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, Flame, Trophy, Zap, Calendar as CalendarIcon } from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { format, eachDayOfInterval, startOfMonth, endOfMonth, isSameDay, getDay, isToday, isFuture } from 'date-fns';

interface Props {
  onClose: () => void;
}

const StreakModal: React.FC<Props> = ({ onClose }) => {
  const { streak, transactions } = useFinance();

  // Calendar Logic
  const { calendarDays, paddingDays, monthLabel } = useMemo(() => {
      const now = new Date();
      const start = startOfMonth(now);
      const end = endOfMonth(now);
      const days = eachDayOfInterval({ start, end });
      const padding = Array.from({ length: getDay(start) }); // 0 for Sunday
      
      return { 
          calendarDays: days, 
          paddingDays: padding,
          monthLabel: format(now, 'MMMM yyyy')
      };
  }, []);

  const isStreakActive = streak.lastLogDate === format(new Date(), 'yyyy-MM-dd');

  return createPortal(
    <div className="fixed inset-0 z-[100] flex justify-center items-end sm:items-center p-4 sm:p-0">
        {/* Backdrop */}
        <div 
            className="absolute inset-0 bg-zinc-900/40 dark:bg-black/60 backdrop-blur-sm transition-opacity" 
            onClick={onClose}
        ></div>
        
        {/* Modal Content */}
        <div className="w-full max-w-sm bg-white dark:bg-[#151225] rounded-[2rem] shadow-2xl overflow-hidden relative animate-in zoom-in-95 duration-200 border border-zinc-200 dark:border-white/10">
            
            {/* Header / Hero */}
            <div className="relative overflow-hidden bg-gradient-to-br from-orange-500 to-red-600 p-8 text-white text-center">
                <div className="absolute top-4 right-4 z-10">
                    <button 
                        onClick={onClose} 
                        className="p-2 rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors backdrop-blur-md"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Decorative Circles */}
                <div className="absolute top-[-50%] left-[-20%] w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
                <div className="absolute bottom-[-50%] right-[-20%] w-64 h-64 bg-yellow-500/20 rounded-full blur-3xl"></div>

                {/* Main Streak Counter */}
                <div className="relative z-10 flex flex-col items-center">
                    <div className="w-20 h-20 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center mb-4 shadow-lg ring-4 ring-white/10">
                        <Flame size={48} className="text-white fill-white animate-pulse" />
                    </div>
                    <div className="flex items-baseline gap-2">
                        <span className="text-6xl font-black tracking-tighter shadow-black/20 drop-shadow-lg">
                            {streak.currentCount}
                        </span>
                        <span className="text-xl font-bold opacity-90">Days</span>
                    </div>
                    <p className="text-white/80 font-medium mt-2 text-sm">
                        {isStreakActive 
                            ? "You're on fire! 🔥" 
                            : "Don't break the chain! Log something today."}
                    </p>
                </div>
            </div>

            <div className="p-6 space-y-8 bg-white dark:bg-[#151225]">
                
                {/* Stats Row */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-zinc-50 dark:bg-white/5 p-4 rounded-2xl border border-zinc-100 dark:border-white/5 flex flex-col items-center justify-center gap-1">
                        <div className="text-yellow-500 mb-1">
                            <Trophy size={20} />
                        </div>
                        <span className="text-2xl font-bold text-zinc-900 dark:text-white">{streak.longestCount}</span>
                        <span className="text-[10px] uppercase font-bold text-zinc-400">Best Streak</span>
                    </div>
                    <div className="bg-zinc-50 dark:bg-white/5 p-4 rounded-2xl border border-zinc-100 dark:border-white/5 flex flex-col items-center justify-center gap-1">
                        <div className="text-violet-500 mb-1">
                            <Zap size={20} />
                        </div>
                        <span className="text-2xl font-bold text-zinc-900 dark:text-white">{transactions.length}</span>
                        <span className="text-[10px] uppercase font-bold text-zinc-400">Total Logs</span>
                    </div>
                </div>

                {/* Calendar View */}
                <div>
                    <div className="flex items-center justify-between mb-4">
                        <h4 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                            <CalendarIcon size={16} className="text-zinc-400" /> 
                            {monthLabel}
                        </h4>
                    </div>

                    <div className="grid grid-cols-7 gap-y-3 gap-x-1">
                        {['S','M','T','W','T','F','S'].map((d, i) => (
                            <div key={i} className="text-center text-[10px] font-bold text-zinc-400">{d}</div>
                        ))}

                        {/* Padding for start of month */}
                        {paddingDays.map((_, i) => <div key={`pad-${i}`}></div>)}

                        {/* Days */}
                        {calendarDays.map((day) => {
                            const dateStr = format(day, 'yyyy-MM-dd');
                            const hasActivity = transactions.some(t => t.date.startsWith(dateStr));
                            const isTodayDate = isToday(day);
                            const future = isFuture(day);

                            return (
                                <div key={dateStr} className="flex flex-col items-center gap-1">
                                    <div className={`
                                        w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all
                                        ${hasActivity 
                                            ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20' 
                                            : isTodayDate
                                                ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 border-2 border-orange-500 border-dashed'
                                                : future 
                                                    ? 'text-zinc-300 dark:text-zinc-700'
                                                    : 'bg-zinc-100 dark:bg-white/5 text-zinc-400 dark:text-zinc-500'
                                        }
                                    `}>
                                        {hasActivity ? <Flame size={14} className="fill-white" /> : format(day, 'd')}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

            </div>
        </div>
    </div>,
    document.body
  );
};

export default StreakModal;
    