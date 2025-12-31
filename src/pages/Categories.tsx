import React, { useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import { Plus, X, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { CategoryIcon, AVAILABLE_ICONS } from '../utils/iconHelpers';
import { Category } from '../types';

const Categories: React.FC = () => {
  const { categories, addCategory, deleteCategory } = useFinance();
  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState<'income' | 'expense'>('expense');
  const [newIcon, setNewIcon] = useState('tag');

  const expenseCategories = categories.filter(c => c.type === 'expense' && !c.parent_category_id);
  const incomeCategories = categories.filter(c => c.type === 'income' && !c.parent_category_id);

  const handleSave = () => {
    if (!newName.trim()) return;

    const newCategory: Category = {
      id: `cat_${crypto.randomUUID()}`,
      name: newName.trim(),
      type: newType,
      icon: newIcon,
      color: newType === 'income'
        ? 'bg-violet-600 text-white shadow-md shadow-violet-500/20'
        : 'bg-violet-100 text-violet-600 dark:bg-violet-500/20 dark:text-violet-300'
    };

    addCategory(newCategory);
    setShowAddModal(false);
    setNewName('');
    setNewIcon('tag');
  };

  return (
    <div className="p-6 space-y-6 page-transition pb-32">
      <div className="flex items-center gap-4 pt-2">
        <Link to="/settings" className="p-2 rounded-full bg-zinc-100 dark:bg-white/5 text-zinc-500">
          <ArrowLeft size={20} />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white tracking-tight">Categories</h1>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="w-10 h-10 rounded-full bg-violet-600 text-white flex items-center justify-center shadow-lg shadow-violet-600/20"
        >
          <Plus size={20} />
        </button>
      </div>

      {/* Expense Categories */}
      <div>
        <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-3 px-1">Expenses</h3>
        <div className="glass-panel rounded-2xl border border-zinc-200 dark:border-white/5 divide-y divide-zinc-100 dark:divide-white/5">
          {expenseCategories.map(cat => (
            <div key={cat.id} className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${cat.color}`}>
                  <CategoryIcon iconName={cat.icon} size={18} />
                </div>
                <span className="font-semibold text-zinc-900 dark:text-white">{cat.name}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Income Categories */}
      <div>
        <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-3 px-1">Income</h3>
        <div className="glass-panel rounded-2xl border border-zinc-200 dark:border-white/5 divide-y divide-zinc-100 dark:divide-white/5">
          {incomeCategories.map(cat => (
            <div key={cat.id} className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${cat.color}`}>
                  <CategoryIcon iconName={cat.icon} size={18} />
                </div>
                <span className="font-semibold text-zinc-900 dark:text-white">{cat.name}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowAddModal(false)} />
          <div className="relative w-full max-w-md bg-white dark:bg-[#151225] rounded-t-3xl sm:rounded-3xl p-6 space-y-6 animate-in slide-in-from-bottom-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold text-zinc-900 dark:text-white">Add Category</h2>
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
                  placeholder="Category name"
                  className="w-full px-4 py-3 rounded-xl bg-zinc-100 dark:bg-white/5 text-zinc-900 dark:text-white placeholder:text-zinc-400 outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-zinc-500 uppercase mb-2 block">Type</label>
                <div className="flex gap-2">
                  {(['expense', 'income'] as const).map(t => (
                    <button
                      key={t}
                      onClick={() => setNewType(t)}
                      className={`flex-1 py-3 rounded-xl text-sm font-semibold capitalize transition-all ${
                        newType === t
                          ? 'bg-violet-600 text-white'
                          : 'bg-zinc-100 dark:bg-white/5 text-zinc-500'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-zinc-500 uppercase mb-2 block">Icon</label>
                <div className="grid grid-cols-8 gap-2 max-h-32 overflow-y-auto">
                  {AVAILABLE_ICONS.map(icon => (
                    <button
                      key={icon}
                      onClick={() => setNewIcon(icon)}
                      className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                        newIcon === icon
                          ? 'bg-violet-600 text-white'
                          : 'bg-zinc-100 dark:bg-white/5 text-zinc-500'
                      }`}
                    >
                      <CategoryIcon iconName={icon} size={18} />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button
              onClick={handleSave}
              disabled={!newName.trim()}
              className="w-full py-4 rounded-xl bg-violet-600 text-white font-bold disabled:opacity-50"
            >
              Add Category
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Categories;
