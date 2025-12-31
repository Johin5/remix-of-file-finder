import React, { useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import { Plus, CreditCard, Wallet, Landmark, PiggyBank, X, Trash2 } from 'lucide-react';
import { Account, AccountType } from '../types';

const ACCOUNT_ICONS: { [key in AccountType]: React.ReactNode } = {
  cash: <Wallet size={20} />,
  bank: <Landmark size={20} />,
  credit: <CreditCard size={20} />,
  savings: <PiggyBank size={20} />
};

const ACCOUNT_COLORS = [
  'bg-violet-600',
  'bg-violet-700',
  'bg-zinc-800',
  'bg-emerald-600',
  'bg-amber-600',
  'bg-blue-600',
  'bg-rose-600'
];

const Accounts: React.FC = () => {
  const { accounts, addAccount, deleteAccount, settings, openTransactionModal } = useFinance();
  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState<AccountType>('bank');
  const [newColor, setNewColor] = useState(ACCOUNT_COLORS[0]);
  const [creditLimit, setCreditLimit] = useState('');

  const totalBalance = accounts.reduce((sum, acc) => {
    if (acc.type === 'credit') return sum - acc.current_balance;
    return sum + acc.current_balance;
  }, 0);

  const handleSave = () => {
    if (!newName.trim()) return;

    const newAccount: Account = {
      id: `acc_${crypto.randomUUID()}`,
      name: newName.trim(),
      type: newType,
      currency: 'INR',
      current_balance: 0,
      color: newColor,
      credit_limit: newType === 'credit' && creditLimit ? parseFloat(creditLimit) : undefined
    };

    addAccount(newAccount);
    setShowAddModal(false);
    setNewName('');
    setNewType('bank');
    setCreditLimit('');
  };

  return (
    <div className="p-6 space-y-6 page-transition pb-32">
      <div className="flex justify-between items-center pt-2">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white tracking-tight">Accounts</h1>
          <p className="text-zinc-500 text-sm font-medium mt-1">{accounts.length} accounts</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="w-10 h-10 rounded-full bg-violet-600 text-white flex items-center justify-center shadow-lg shadow-violet-600/20"
        >
          <Plus size={20} />
        </button>
      </div>

      {/* Total */}
      <div className="glass-panel p-6 rounded-2xl border border-zinc-200 dark:border-white/5 text-center bg-gradient-to-br from-violet-50 to-transparent dark:from-violet-500/5">
        <p className="text-xs font-bold text-zinc-500 uppercase mb-2">Net Worth</p>
        <p className={`text-3xl font-bold ${totalBalance >= 0 ? 'text-zinc-900 dark:text-white' : 'text-red-500'}`}>
          {settings.currencySymbol}{Math.abs(totalBalance).toLocaleString()}
        </p>
      </div>

      {/* Account List */}
      <div className="space-y-4">
        {accounts.map(acc => {
          const isCredit = acc.type === 'credit';
          const displayBalance = isCredit ? -acc.current_balance : acc.current_balance;

          return (
            <div
              key={acc.id}
              className="glass-panel p-4 rounded-2xl border border-zinc-200 dark:border-white/5 flex items-center justify-between"
            >
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl ${acc.color} text-white flex items-center justify-center`}>
                  {ACCOUNT_ICONS[acc.type]}
                </div>
                <div>
                  <p className="font-semibold text-zinc-900 dark:text-white">{acc.name}</p>
                  <p className="text-xs text-zinc-500 capitalize">{acc.type}</p>
                </div>
              </div>
              <div className="text-right">
                <p className={`font-bold ${displayBalance < 0 ? 'text-red-500' : 'text-zinc-900 dark:text-white'}`}>
                  {displayBalance < 0 ? '-' : ''}{settings.currencySymbol}{Math.abs(acc.current_balance).toLocaleString()}
                </p>
                {isCredit && acc.credit_limit && (
                  <p className="text-xs text-zinc-500">
                    Limit: {settings.currencySymbol}{acc.credit_limit.toLocaleString()}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowAddModal(false)} />
          <div className="relative w-full max-w-md bg-white dark:bg-[#151225] rounded-t-3xl sm:rounded-3xl p-6 space-y-6 animate-in slide-in-from-bottom-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold text-zinc-900 dark:text-white">Add Account</h2>
              <button onClick={() => setShowAddModal(false)} className="p-2 rounded-full bg-zinc-100 dark:bg-white/5 text-zinc-500">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-zinc-500 uppercase mb-2 block">Name</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Account name"
                  className="w-full px-4 py-3 rounded-xl bg-zinc-100 dark:bg-white/5 text-zinc-900 dark:text-white placeholder:text-zinc-400 outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-zinc-500 uppercase mb-2 block">Type</label>
                <div className="grid grid-cols-4 gap-2">
                  {(['bank', 'cash', 'credit', 'savings'] as AccountType[]).map(t => (
                    <button
                      key={t}
                      onClick={() => setNewType(t)}
                      className={`flex flex-col items-center p-3 rounded-xl transition-all border ${
                        newType === t
                          ? 'border-violet-500 bg-violet-50 dark:bg-violet-500/10'
                          : 'border-transparent bg-zinc-100 dark:bg-white/5'
                      }`}
                    >
                      <div className="text-zinc-500 mb-1">{ACCOUNT_ICONS[t]}</div>
                      <span className="text-[10px] font-semibold text-zinc-600 dark:text-zinc-300 capitalize">{t}</span>
                    </button>
                  ))}
                </div>
              </div>

              {newType === 'credit' && (
                <div>
                  <label className="text-xs font-bold text-zinc-500 uppercase mb-2 block">Credit Limit</label>
                  <input
                    type="number"
                    value={creditLimit}
                    onChange={(e) => setCreditLimit(e.target.value)}
                    placeholder="0"
                    className="w-full px-4 py-3 rounded-xl bg-zinc-100 dark:bg-white/5 text-zinc-900 dark:text-white placeholder:text-zinc-400 outline-none"
                  />
                </div>
              )}

              <div>
                <label className="text-xs font-bold text-zinc-500 uppercase mb-2 block">Color</label>
                <div className="flex gap-2 flex-wrap">
                  {ACCOUNT_COLORS.map(color => (
                    <button
                      key={color}
                      onClick={() => setNewColor(color)}
                      className={`w-8 h-8 rounded-full ${color} ${
                        newColor === color ? 'ring-2 ring-offset-2 ring-violet-500' : ''
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>

            <button
              onClick={handleSave}
              disabled={!newName.trim()}
              className="w-full py-4 rounded-xl bg-violet-600 text-white font-bold disabled:opacity-50"
            >
              Add Account
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Accounts;
