import { useEffect, useState } from 'react';
import { Plus, Search, Pencil, Trash2, Filter, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { getExpenses, addExpense, updateExpense, deleteExpense } from '../lib/firestore';
import { formatCurrency, formatDate, CATEGORY_LABELS, CATEGORY_COLORS, MONTHS, getCurrentMonth, getCurrentYear } from '../lib/utils';
import Card from '../components/ui/Card';
import Modal from '../components/ui/Modal';
import Button from '../components/ui/Button';
import Input, { Select } from '../components/ui/Input';
import type { Expense, ExpenseCategory, PaymentMethod } from '../types';

const CATEGORIES: ExpenseCategory[] = ['food', 'transport', 'streaming', 'services', 'shopping', 'health', 'education', 'savings', 'other'];
const METHODS: PaymentMethod[] = ['cash', 'credit', 'debit', 'transfer'];

const emptyForm = {
  name: '', category: 'food' as ExpenseCategory, amount: '',
  method: 'cash' as PaymentMethod, date: new Date().toISOString().split('T')[0],
  description: '',
};

export default function Expenses() {
  const { currentUser } = useAuth();
  const { theme } = useTheme();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('');
  const [filterMonth, setFilterMonth] = useState(String(getCurrentMonth()));
  const [filterYear, setFilterYear] = useState(String(getCurrentYear()));

  const textPrimary = theme === 'dark' ? 'text-white' : 'text-gray-900';
  const textSecondary = theme === 'dark' ? 'text-gray-400' : 'text-gray-500';

  async function load() {
    if (!currentUser) return;
    const data = await getExpenses(currentUser.uid);
    setExpenses(data);
    setLoading(false);
  }

  useEffect(() => { load(); }, [currentUser]);

  function openAdd() {
    setEditId(null);
    setForm(emptyForm);
    setModalOpen(true);
  }

  function openEdit(e: Expense) {
    setEditId(e.id!);
    setForm({ name: e.name, category: e.category, amount: String(e.amount), method: e.method, date: e.date, description: e.description || '' });
    setModalOpen(true);
  }

  async function handleSave() {
    if (!currentUser || !form.name || !form.amount) return;
    setSaving(true);
    const data = {
      userId: currentUser.uid,
      name: form.name,
      category: form.category,
      amount: parseFloat(form.amount),
      method: form.method,
      date: form.date,
      description: form.description,
    };
    if (editId) {
      await updateExpense(editId, data);
    } else {
      await addExpense(data);
    }
    await load();
    setModalOpen(false);
    setSaving(false);
  }

  async function handleDelete() {
    if (!deleteId) return;
    await deleteExpense(deleteId);
    setDeleteId(null);
    await load();
  }

  const filtered = expenses.filter((e) => {
    const d = new Date(e.date);
    const matchMonth = !filterMonth || d.getMonth() + 1 === parseInt(filterMonth);
    const matchYear = !filterYear || d.getFullYear() === parseInt(filterYear);
    const matchCat = !filterCat || e.category === filterCat;
    const matchSearch = !search || e.name.toLowerCase().includes(search.toLowerCase()) || e.description?.toLowerCase().includes(search.toLowerCase());
    return matchMonth && matchYear && matchCat && matchSearch;
  });

  const total = filtered.reduce((a, e) => a + e.amount, 0);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className={`text-2xl font-bold ${textPrimary}`}>Expenses</h1>
          <p className={`text-sm mt-1 ${textSecondary}`}>{filtered.length} records — Total: {formatCurrency(total)}</p>
        </div>
        <Button onClick={openAdd} size="sm">
          <Plus className="w-4 h-4" /> Add Expense
        </Button>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search expenses..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={`w-full pl-9 pr-3 py-2 rounded-xl text-sm border outline-none transition-all
                ${theme === 'dark' ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500 focus:border-cyan-500/60' : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-cyan-400'}`}
            />
          </div>
          <select
            value={filterCat}
            onChange={(e) => setFilterCat(e.target.value)}
            className={`px-3 py-2 rounded-xl text-sm border outline-none ${theme === 'dark' ? 'bg-gray-800 border-gray-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
          >
            <option value="">All Categories</option>
            {CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
          </select>
          <select
            value={filterMonth}
            onChange={(e) => setFilterMonth(e.target.value)}
            className={`px-3 py-2 rounded-xl text-sm border outline-none ${theme === 'dark' ? 'bg-gray-800 border-gray-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
          >
            <option value="">All Months</option>
            {MONTHS.map((m, i) => <option key={i} value={String(i + 1)}>{m}</option>)}
          </select>
          <select
            value={filterYear}
            onChange={(e) => setFilterYear(e.target.value)}
            className={`px-3 py-2 rounded-xl text-sm border outline-none ${theme === 'dark' ? 'bg-gray-800 border-gray-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
          >
            {[2023, 2024, 2025, 2026].map((y) => <option key={y} value={String(y)}>{y}</option>)}
          </select>
          {(filterCat || search || filterMonth !== String(getCurrentMonth())) && (
            <button
              onClick={() => { setFilterCat(''); setSearch(''); setFilterMonth(String(getCurrentMonth())); }}
              className="flex items-center gap-1 text-xs text-gray-400 hover:text-white px-3 py-2 rounded-xl hover:bg-gray-800 transition-all"
            >
              <X className="w-3 h-3" /> Clear
            </button>
          )}
        </div>
      </Card>

      {/* Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className={`border-b ${theme === 'dark' ? 'border-gray-800' : 'border-gray-100'}`}>
                {['Name', 'Category', 'Amount', 'Method', 'Date', ''].map((h) => (
                  <th key={h} className={`px-4 py-3 text-left text-xs font-medium ${textSecondary} uppercase tracking-wider`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/40">
              {filtered.map((e) => (
                <tr key={e.id} className={`transition-colors ${theme === 'dark' ? 'hover:bg-gray-800/30' : 'hover:bg-gray-50'}`}>
                  <td className="px-4 py-3">
                    <div>
                      <p className={`text-sm font-medium ${textPrimary}`}>{e.name}</p>
                      {e.description && <p className={`text-xs ${textSecondary} truncate max-w-xs`}>{e.description}</p>}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium"
                      style={{ background: CATEGORY_COLORS[e.category] + '20', color: CATEGORY_COLORS[e.category] }}>
                      {getCategoryIcon(e.category)} {CATEGORY_LABELS[e.category]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm font-semibold text-rose-400">{formatCurrency(e.amount)}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs capitalize ${textSecondary}`}>{e.method}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs ${textSecondary}`}>{formatDate(e.date)}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button onClick={() => openEdit(e)} className="p-1.5 rounded-lg text-gray-500 hover:text-cyan-400 hover:bg-cyan-500/10 transition-all">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => setDeleteId(e.id!)} className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-all">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className={`text-center py-12 ${textSecondary}`}>
              <Filter className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No expenses found</p>
            </div>
          )}
        </div>
      </Card>

      {/* Add/Edit Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editId ? 'Edit Expense' : 'Add Expense'}>
        <div className="space-y-4">
          <Input label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Coffee, Groceries..." required />
          <div className="grid grid-cols-2 gap-3">
            <Select label="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as ExpenseCategory })}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
            </Select>
            <Input label="Amount" type="number" min="0" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="0.00" required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Select label="Method" value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value as PaymentMethod })}>
              {METHODS.map((m) => <option key={m} value={m} className="capitalize">{m.charAt(0).toUpperCase() + m.slice(1)}</option>)}
            </Select>
            <Input label="Date" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
          </div>
          <Input label="Description (optional)" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Additional notes..." />
          <div className="flex gap-3 pt-2">
            <Button variant="ghost" className="flex-1" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button className="flex-1" onClick={handleSave} loading={saving}>{editId ? 'Save Changes' : 'Add Expense'}</Button>
          </div>
        </div>
      </Modal>

      {/* Delete confirmation */}
      <Modal open={!!deleteId} onClose={() => setDeleteId(null)} title="Delete Expense">
        <p className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'} mb-6`}>
          Are you sure you want to delete this expense? This action cannot be undone.
        </p>
        <div className="flex gap-3">
          <Button variant="ghost" className="flex-1" onClick={() => setDeleteId(null)}>Cancel</Button>
          <Button variant="danger" className="flex-1" onClick={handleDelete}>Delete</Button>
        </div>
      </Modal>
    </div>
  );
}

function getCategoryIcon(cat: string) {
  const icons: Record<string, string> = {
    food: '🍔', transport: '🚗', streaming: '📺', services: '⚡',
    shopping: '🛍️', health: '💊', education: '📚', savings: '💰', other: '📦',
  };
  return icons[cat] || '📦';
}
