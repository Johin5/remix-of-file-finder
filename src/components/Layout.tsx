import React from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { LayoutDashboard, PieChart, Wallet, Plus, ListFilter } from 'lucide-react';
import TransactionForm from './TransactionForm';
import { useFinance } from '../context/FinanceContext';
import StreakReward from './StreakReward';

const Layout: React.FC = () => {
  const { isTransactionModalOpen, openTransactionModal, closeTransactionModal, showStreakReward } = useFinance();
  const location = useLocation();

  return (
    <div className="flex flex-col h-[100dvh] max-w-md mx-auto bg-gray-50 dark:bg-[#0c0a18] overflow-hidden relative shadow-2xl border-x border-zinc-200 dark:border-white/5 transition-colors duration-300">
      
      {showStreakReward && <StreakReward />}

      <div className="flex-1 overflow-y-auto no-scrollbar pb-24 relative z-10 text-zinc-900 dark:text-white">
        <Outlet />
      </div>

      <nav className="absolute bottom-0 w-full glass-nav pb-safe pt-2 px-6 z-20 h-20">
        <div className="flex justify-between items-center h-full pb-2">
             <NavLink to="/" className={({isActive}) => `flex flex-col items-center gap-1 w-14 transition-all duration-300 ${isActive ? 'text-violet-600 dark:text-violet-400' : 'text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300'}`}>
               {({ isActive }) => (
                 <>
                   <LayoutDashboard size={22} strokeWidth={isActive ? 2.5 : 2} />
                   <span className="text-[10px] font-medium">Home</span>
                 </>
               )}
             </NavLink>
             <NavLink to="/transactions" className={({isActive}) => `flex flex-col items-center gap-1 w-14 transition-all duration-300 ${isActive ? 'text-violet-600 dark:text-violet-400' : 'text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300'}`}>
               {({ isActive }) => (
                 <>
                   <ListFilter size={22} strokeWidth={isActive ? 2.5 : 2} />
                   <span className="text-[10px] font-medium">Trans.</span>
                 </>
               )}
             </NavLink>

             <div className="relative -top-5">
                <button 
                  onClick={() => openTransactionModal()}
                  className="w-14 h-14 rounded-full bg-violet-600 text-white shadow-lg shadow-violet-600/20 flex items-center justify-center border border-white/20 active:scale-95 transition-transform"
                >
                  <Plus size={28} strokeWidth={2.5} />
                </button>
             </div>

             <NavLink to="/budgets" className={({isActive}) => `flex flex-col items-center gap-1 w-14 transition-all duration-300 ${isActive ? 'text-violet-600 dark:text-violet-400' : 'text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300'}`}>
               {({ isActive }) => (
                 <>
                   <Wallet size={22} strokeWidth={isActive ? 2.5 : 2} />
                   <span className="text-[10px] font-medium">Budgets</span>
                 </>
               )}
             </NavLink>
             <NavLink to="/analytics" className={({isActive}) => `flex flex-col items-center gap-1 w-14 transition-all duration-300 ${isActive ? 'text-violet-600 dark:text-violet-400' : 'text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300'}`}>
               {({ isActive }) => (
                 <>
                   <PieChart size={22} strokeWidth={isActive ? 2.5 : 2} />
                   <span className="text-[10px] font-medium">Stats</span>
                 </>
               )}
             </NavLink>
        </div>
      </nav>

      {isTransactionModalOpen && (
        <TransactionForm onClose={closeTransactionModal} />
      )}
    </div>
  );
};

export default Layout;
