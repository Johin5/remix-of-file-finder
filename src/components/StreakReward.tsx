import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Flame, Check } from 'lucide-react';
import { useFinance } from '../context/FinanceContext';

const StreakReward: React.FC = () => {
  const { streak, setShowStreakReward } = useFinance();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const handleClose = () => {
      setVisible(false);
      setTimeout(() => setShowStreakReward(false), 300);
  };

  return createPortal(
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
        <div 
            className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-500 ${visible ? 'opacity-100' : 'opacity-0'}`}
            onClick={handleClose}
        ></div>

        <div 
            className={`
                relative w-full max-w-xs bg-white dark:bg-[#1e1b2e] rounded-[2.5rem] p-8 text-center shadow-2xl overflow-hidden
                transform transition-all duration-700
                ${visible ? 'scale-100 translate-y-0 opacity-100 rotate-0' : 'scale-50 translate-y-20 opacity-0 -rotate-12'}
            `}
        >
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] pointer-events-none opacity-10 dark:opacity-20">
                <div className="w-full h-full bg-[conic-gradient(from_0deg,transparent_0deg,theme(colors.orange.500)_20deg,transparent_40deg,theme(colors.orange.500)_60deg,transparent_80deg,theme(colors.orange.500)_100deg,transparent_120deg,theme(colors.orange.500)_140deg,transparent_160deg,theme(colors.orange.500)_180deg,transparent_200deg,theme(colors.orange.500)_220deg,transparent_240deg,theme(colors.orange.500)_260deg,transparent_280deg,theme(colors.orange.500)_300deg,transparent_320deg,theme(colors.orange.500)_340deg,transparent_360deg)] animate-spin"></div>
            </div>

            <div className="relative z-10 flex flex-col items-center">
                
                <div className="mb-6 relative">
                    <div className="absolute inset-0 bg-orange-500 rounded-full blur-xl opacity-40 animate-pulse"></div>
                    <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-orange-500 to-red-600 flex items-center justify-center shadow-lg shadow-orange-500/40 relative animate-bounce">
                        <Flame size={48} className="text-white fill-white" strokeWidth={1.5} />
                        
                        <div className="absolute -top-2 -right-2 w-3 h-3 bg-yellow-300 rounded-full animate-ping"></div>
                        <div className="absolute top-0 -left-1 w-2 h-2 bg-yellow-300 rounded-full animate-ping" style={{ animationDelay: '0.5s' }}></div>
                    </div>
                </div>

                <h2 className="text-3xl font-black text-zinc-900 dark:text-white mb-1 tracking-tight">
                    {streak.currentCount} Day Streak!
                </h2>
                <p className="text-zinc-500 dark:text-zinc-400 font-medium text-sm mb-8">
                    You're unstoppable. Keep the momentum going!
                </p>

                <div className="flex flex-col gap-3 w-full">
                    <button 
                        onClick={handleClose}
                        className="w-full py-3.5 rounded-2xl bg-zinc-900 dark:bg-white text-white dark:text-black font-bold text-base shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
                    >
                        <Check size={20} strokeWidth={3} />
                        Continue
                    </button>
                    <button 
                        onClick={handleClose}
                        className="w-full py-3.5 rounded-2xl bg-zinc-100 dark:bg-white/5 text-zinc-600 dark:text-zinc-300 font-bold text-sm hover:bg-zinc-200 dark:hover:bg-white/10 transition-colors"
                    >
                        Share Achievement
                    </button>
                </div>
            </div>
        </div>
    </div>,
    document.body
  );
};

export default StreakReward;
