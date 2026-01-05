
import React, { useState, useMemo } from 'react';
import { useFinance } from '../context/FinanceContext';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Plus, Minus, Pencil, Check, CornerDownRight, Trash2, X } from 'lucide-react';
import { AVAILABLE_ICONS, CategoryIcon } from '../utils/iconHelpers';

const CategorySettings: React.FC = () => {
  const { type } = useParams<{ type: 'income' | 'expense' }>();
  const navigate = useNavigate();
  const { categories, addCategory, updateCategory, deleteCategory } = useFinance();
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editIcon, setEditIcon] = useState('');
  const [showIconPicker, setShowIconPicker] = useState(false);
  
  // Group Categories by Parent
  const { parents, childrenMap } = useMemo(() => {
      const currentTypeCats = categories.filter(c => c.type === type);
      const p = currentTypeCats.filter(c => !c.parent_category_id);
      const cMap: {[key: string]: typeof categories} = {};
      
      currentTypeCats.forEach(cat => {
          if(cat.parent_category_id) {
              if(!cMap[cat.parent_category_id]) cMap[cat.parent_category_id] = [];
              cMap[cat.parent_category_id].push(cat);
          }
      });
      
      return { parents: p, childrenMap: cMap };
  }, [categories, type]);

  const handleAddNew = (parentId?: string) => {
    const newCat = {
        id: crypto.randomUUID(),
        name: parentId ? 'New Subcategory' : 'New Category',
        type: type || 'expense',
        icon: 'tag',
        color: type === 'income' ? 'bg-violet-100 text-violet-600' : 'bg-violet-100 text-violet-600',
        parent_category_id: parentId
    };
    // @ts-ignore
    addCategory(newCat);
    startEdit(newCat.id, newCat.name, newCat.icon);
  };

  const saveEdit = (id: string) => {
    const cat = categories.find(c => c.id === id);
    if (cat) {
        updateCategory({ ...cat, name: editName, icon: editIcon });
    }
    setEditingId(null);
    setShowIconPicker(false);
  };

  const startEdit = (id: string, name: string, icon: string) => {
    setEditingId(id);
    setEditName(name);
    setEditIcon(icon);
    setShowIconPicker(false);
  }

  const handleDelete = (id: string, isParent: boolean) => {
      if(isParent) {
          const children = childrenMap[id] || [];
          if(children.length > 0) {
              if(!confirm(`Deleting this category will also delete its ${children.length} subcategories. Continue?`)) return;
              // Cascade delete
              children.forEach(c => deleteCategory(c.id));
          }
      }
      deleteCategory(id);
  }

  return (
    <div className="p-6 page-transition min-h-screen bg-gray-50 dark:bg-[#0c0a18] flex flex-col text-zinc-900 dark:text-white transition-colors relative pb-24">
      {/* Header */}
      <div className="flex items-center space-x-2 mb-8">
            <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-zinc-500 dark:text-zinc-400">
                <ChevronLeft size={24} />
            </button>
            <h1 className="text-xl font-bold tracking-tight">{type === 'expense' ? 'Expense Categories' : 'Income Categories'}</h1>
      </div>

      {/* List */}
      <div className="space-y-4 flex-1">
          {parents.length === 0 && (
              <div className="text-center py-10 text-zinc-500">No categories found. Add one below.</div>
          )}
          
          {parents.map(parent => (
              <div key={parent.id} className="glass-panel rounded-2xl overflow-hidden border border-zinc-200 dark:border-white/5">
                  {/* Parent Row */}
                  <div className="flex items-center justify-between p-4 bg-white/50 dark:bg-white/5 hover:bg-white dark:hover:bg-white/10 transition-colors">
                      <div className="flex items-center space-x-4 flex-1">
                          {/* Icon Editor Trigger */}
                          {editingId === parent.id ? (
                              <button 
                                onClick={() => setShowIconPicker(!showIconPicker)}
                                className="w-10 h-10 rounded-full bg-violet-100 dark:bg-violet-900/20 text-violet-600 flex items-center justify-center shrink-0 border border-violet-500"
                              >
                                  <CategoryIcon iconName={editIcon} size={20} />
                              </button>
                          ) : (
                              <div className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 flex items-center justify-center shrink-0">
                                  <CategoryIcon iconName={parent.icon} size={20} />
                              </div>
                          )}

                          <div className="flex-1">
                              {editingId === parent.id ? (
                                  <input 
                                    value={editName}
                                    onChange={(e) => setEditName(e.target.value)}
                                    autoFocus
                                    className="bg-transparent font-bold text-lg border-b border-violet-500 focus:outline-none w-full py-1"
                                  />
                              ) : (
                                  <span className="font-bold text-lg block">{parent.name}</span>
                              )}
                          </div>
                      </div>

                      <div className="flex items-center space-x-3 text-zinc-400 dark:text-zinc-500 ml-4">
                          {editingId === parent.id ? (
                              <button onClick={() => saveEdit(parent.id)} className="text-violet-500 bg-violet-50 dark:bg-violet-900/20 p-2 rounded-full"><Check size={20} /></button>
                          ) : (
                              <>
                                <button onClick={() => startEdit(parent.id, parent.name, parent.icon)} className="p-2"><Pencil size={18} /></button>
                                <button onClick={() => handleDelete(parent.id, true)} className="p-2 hover:text-red-500"><Trash2 size={18} /></button>
                              </>
                          )}
                      </div>
                  </div>

                  {/* Icon Picker (Expandable) */}
                  {editingId === parent.id && showIconPicker && (
                      <div className="p-4 bg-zinc-50 dark:bg-black/20 border-t border-zinc-200 dark:border-white/5 animate-in slide-in-from-top-2">
                          <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Select Icon</p>
                          <div className="grid grid-cols-6 gap-2">
                              {AVAILABLE_ICONS.map(iconKey => (
                                  <button 
                                    key={iconKey} 
                                    onClick={() => setEditIcon(iconKey)}
                                    className={`p-2 rounded-xl flex items-center justify-center transition-all ${editIcon === iconKey ? 'bg-violet-600 text-white shadow-lg scale-110' : 'bg-white dark:bg-white/5 hover:bg-zinc-200 dark:hover:bg-white/10'}`}
                                  >
                                      <CategoryIcon iconName={iconKey} size={20} />
                                  </button>
                              ))}
                          </div>
                      </div>
                  )}

                  {/* Children List */}
                  <div className="bg-zinc-50/50 dark:bg-black/20">
                      {(childrenMap[parent.id] || []).map(child => (
                          <div key={child.id} className="flex flex-col border-t border-zinc-100 dark:border-white/5">
                              <div className="flex items-center justify-between py-3 pr-4 pl-8 group hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                                  <div className="flex items-center space-x-3 flex-1 relative">
                                        <div className="absolute -left-4 top-1/2 -translate-y-1/2 text-zinc-300 dark:text-zinc-600">
                                            <CornerDownRight size={16} />
                                        </div>
                                      
                                        {/* Child Icon */}
                                        {editingId === child.id ? (
                                            <button 
                                                onClick={() => setShowIconPicker(!showIconPicker)}
                                                className="w-8 h-8 rounded-full bg-violet-100 dark:bg-violet-900/20 text-violet-600 flex items-center justify-center shrink-0 border border-violet-500"
                                            >
                                                <CategoryIcon iconName={editIcon} size={14} />
                                            </button>
                                        ) : (
                                            <div className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-800 text-zinc-400 flex items-center justify-center shrink-0">
                                                <CategoryIcon iconName={child.icon} size={14} />
                                            </div>
                                        )}

                                        <div className="flex-1">
                                            {editingId === child.id ? (
                                                <input 
                                                    value={editName}
                                                    onChange={(e) => setEditName(e.target.value)}
                                                    autoFocus
                                                    className="bg-transparent font-medium text-sm border-b border-violet-500 focus:outline-none w-full py-0.5"
                                                />
                                            ) : (
                                                <span className="font-medium text-sm text-zinc-600 dark:text-zinc-300">{child.name}</span>
                                            )}
                                        </div>
                                  </div>
                                  
                                  <div className="flex items-center space-x-3 text-zinc-400 dark:text-zinc-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                      {editingId === child.id ? (
                                          <button onClick={() => saveEdit(child.id)} className="text-violet-500"><Check size={16} /></button>
                                      ) : (
                                          <>
                                            <button onClick={() => startEdit(child.id, child.name, child.icon)}><Pencil size={14} /></button>
                                            <button onClick={() => handleDelete(child.id, false)} className="hover:text-red-500"><Trash2 size={14} /></button>
                                          </>
                                      )}
                                  </div>
                              </div>

                              {/* Child Icon Picker */}
                              {editingId === child.id && showIconPicker && (
                                  <div className="p-4 ml-8 bg-zinc-100 dark:bg-black/40 border-t border-zinc-200 dark:border-white/5">
                                      <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Select Subcategory Icon</p>
                                      <div className="grid grid-cols-6 gap-2">
                                          {AVAILABLE_ICONS.map(iconKey => (
                                              <button 
                                                key={iconKey} 
                                                onClick={() => setEditIcon(iconKey)}
                                                className={`p-2 rounded-xl flex items-center justify-center transition-all ${editIcon === iconKey ? 'bg-violet-600 text-white shadow-lg scale-110' : 'bg-white dark:bg-white/5 hover:bg-zinc-200 dark:hover:bg-white/10'}`}
                                              >
                                                  <CategoryIcon iconName={iconKey} size={16} />
                                              </button>
                                          ))}
                                      </div>
                                  </div>
                              )}
                          </div>
                      ))}
                      
                      {/* Add Subcategory Button */}
                      <button 
                        onClick={() => handleAddNew(parent.id)}
                        className="w-full py-3 pl-12 text-left text-xs font-bold text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-colors flex items-center gap-2 border-t border-zinc-100 dark:border-white/5"
                      >
                          <Plus size={14} /> Add Subcategory
                      </button>
                  </div>
              </div>
          ))}

          {/* Add New Category Button (Bottom of List) */}
          <button 
            onClick={() => handleAddNew()}
            className="w-full py-4 border-2 border-dashed border-zinc-300 dark:border-white/10 rounded-2xl flex items-center justify-center gap-2 text-zinc-500 font-bold active:scale-[0.98] transition-all hover:bg-zinc-100 dark:hover:bg-white/5 hover:border-violet-300 dark:hover:border-violet-700 hover:text-violet-500"
          >
              <Plus size={20} strokeWidth={2.5} />
              <span>Add New Category</span>
          </button>
      </div>
    </div>
  );
};

export default CategorySettings;
