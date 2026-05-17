import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { getSalaries, addSalary, updateSalary, deleteSalary, getExpenses, getCardPayments } from '../lib/firestore';
import {
  formatCurrency,
  formatDate,
  MONTHS,
  getCurrentMonth,
  getCurrentYear,
  getMonthCardPayments,
  getMonthCashOutflow,
} from '../lib/utils';
import Card from '../components/ui/Card';
import Modal from '../components/ui/Modal';
import Button from '../components/ui/Button';
import Input, { Select } from '../components/ui/Input';
import type { CardPayment, Expense, Salary } from '../types';

const emptyForm = {
  amount: '', type: 'salary' as Salary['type'],
  month: String(getCurrentMonth()), year: String(getCurrentYear()),
  date: new Date().toISOString().split('T')[0], note: '',
};

export default function SalaryPage() {
  const { currentUser } = useAuth();
  const { theme } = useTheme();
  const { t } = useLanguage();
  const [salaries, setSalaries] = useState<Salary[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [cardPayments, setCardPayments] = useState<CardPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const textPrimary = theme === 'dark' ? 'text-white' : 'text-gray-900';
  const textSecondary = theme === 'dark' ? 'text-gray-400' : 'text-gray-500';

  async function load() {
    if (!currentUser) return;
    const [data, exp, payments] = await Promise.all([
      getSalaries(currentUser.uid),
      getExpenses(currentUser.uid),
      getCardPayments(currentUser.uid),
    ]);
    setSalaries(data);
    setExpenses(exp);
    setCardPayments(payments);
    setLoading(false);
  }

  useEffect(() => { load(); }, [currentUser]);

  function openAdd() {
    setEditId(null);
    setForm(emptyForm);
    setModalOpen(true);
  }

  function openEdit(s: Salary) {
    setEditId(s.id!);
    setForm({ amount: String(s.amount), type: s.type, month: String(s.month), year: String(s.year), date: s.date, note: s.note || '' });
    setModalOpen(true);
  }

  async function handleSave() {
    if (!currentUser || !form.amount) return;
    setSaving(true);
    const data = {
      userId: currentUser.uid,
      amount: parseFloat(form.amount),
      type: form.type,
      month: parseInt(form.month),
      year: parseInt(form.year),
      date: form.date,
      note: form.note,
    };
    if (editId) {
      await updateSalary(editId, data);
    } else {
      await addSalary(data);
    }
    await load();
    setModalOpen(false);
    setSaving(false);
  }

  async function handleDelete() {
    if (!deleteId || !currentUser) return;
    await deleteSalary(deleteId, currentUser.uid);
    setDeleteId(null);
    await load();
  }

  const curMonth = getCurrentMonth();
  const curYear = getCurrentYear();

  const monthIncome = salaries.filter((s) => s.month === curMonth && s.year === curYear).reduce((a, s) => a + s.amount, 0);
  const monthSalary = salaries
    .filter(
      (s) =>
        s.month === curMonth &&
        s.year === curYear &&
        s.type === 'salary'
    )
    .reduce((a, s) => a + s.amount, 0);
  const monthCardPayments = getMonthCardPayments(cardPayments, curMonth, curYear);
  const monthCashOutflow = getMonthCashOutflow(expenses, cardPayments, curMonth, curYear);
  const availableAfterOutflow = monthIncome - monthCashOutflow;
  const prevMonthIncome = salaries.filter((s) => {
    const pm = curMonth === 1 ? 12 : curMonth - 1;
    const py = curMonth === 1 ? curYear - 1 : curYear;
    return s.month === pm && s.year === py;
  }).reduce((a, s) => a + s.amount, 0);

  const change = prevMonthIncome > 0 ? ((monthIncome - prevMonthIncome) / prevMonthIncome) * 100 : 0;

  // Monthly chart data
  const chartData = Array.from({ length: 6 }, (_, i) => {
    const month = ((curMonth - 1 - (5 - i) + 12) % 12) + 1;
    const year = curMonth - (5 - i) <= 0 ? curYear - 1 : curYear;
    const total = salaries.filter((s) => s.month === month && s.year === year).reduce((a, s) => a + s.amount, 0);
    const salary = salaries.filter((s) => s.month === month && s.year === year && s.type === 'salary').reduce((a, s) => a + s.amount, 0);
    const bonuses = total - salary;
    const outflow = getMonthCashOutflow(expenses, cardPayments, month, year);
    return { month: t(MONTHS[month - 1]).slice(0, 3), total, salary, bonuses, available: total - outflow };
  });

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className={`text-2xl font-bold ${textPrimary}`}>{t('Salary & Income')}</h1>
          <p className={`text-sm mt-1 ${textSecondary}`}>{t('Track your salary, bonuses, and incentives')}</p>
        </div>
        <Button onClick={openAdd} size="sm">
          <Plus className="w-4 h-4" /> {t('Add Income')}
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <Card className="p-5">
          <p className={`text-sm ${textSecondary} mb-1`}>
            {t('Monthly Salary')}
          </p>

          <p className="text-2xl font-bold text-cyan-400">
            {formatCurrency(monthSalary)}
          </p>

          <div className="flex items-center gap-1 mt-1 text-xs text-cyan-400">
            <DollarSign className="w-3 h-3" />
            {t('Base salary only')}
          </div>
        </Card>
        <Card className="p-5">
          <p className={`text-sm ${textSecondary} mb-1`}>{t('This Month')}</p>
          <p className={`text-2xl font-bold ${textPrimary}`}>{formatCurrency(monthIncome)}</p>
          {Math.abs(change) > 0.1 && (
            <div className={`flex items-center gap-1 mt-1 text-xs ${change >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {change >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {Math.abs(change).toFixed(1)}% {t('vs last month')}
            </div>
          )}
        </Card>
        <Card className="p-5">
          <p className={`text-sm ${textSecondary} mb-1`}>{t('Card Payments')}</p>
          <p className="text-2xl font-bold text-amber-400">{formatCurrency(monthCardPayments)}</p>
        </Card>
        <Card className="p-5">
          <p className={`text-sm ${textSecondary} mb-1`}>{t('Cash Outflow')}</p>
          <p className="text-2xl font-bold text-rose-400">{formatCurrency(monthCashOutflow)}</p>
        </Card>
        <Card className="p-5">
          <p className={`text-sm ${textSecondary} mb-1`}>{t('Available Balance')}</p>
          <p className={`text-2xl font-bold ${availableAfterOutflow >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {formatCurrency(availableAfterOutflow)}
          </p>
        </Card>
      </div>

      {/* Chart */}
      <Card className="p-6">
        <h3 className={`text-base font-semibold mb-6 ${textPrimary}`}>{t('Monthly Income Comparison')}</h3>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#1f2937' : '#e5e7eb'} />
            <XAxis dataKey="month" tick={{ fill: theme === 'dark' ? '#6b7280' : '#9ca3af', fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: theme === 'dark' ? '#6b7280' : '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v >= 1000 ? (v / 1000).toFixed(1) + 'k' : v}`} />
            <Tooltip
              contentStyle={{ background: theme === 'dark' ? '#111827' : '#fff', border: `1px solid ${theme === 'dark' ? '#374151' : '#e5e7eb'}`, borderRadius: 12, fontSize: 12 }}
              formatter={(v) => formatCurrency(Number(v || 0))}
            />
            <Bar dataKey="salary" name={t('Salary')} fill="#06b6d4" radius={[4, 4, 0, 0]} />
            <Bar dataKey="bonuses" name={t('Bonuses')} fill="#f59e0b" radius={[4, 4, 0, 0]} />
            <Bar dataKey="available" name={t('Available Balance')} fill="#22c55e" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
        <div className="flex gap-6 mt-2">
          <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-sm bg-cyan-400" /><span className={`text-xs ${textSecondary}`}>{t('Salary')}</span></div>
          <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-sm bg-amber-400" /><span className={`text-xs ${textSecondary}`}>{t('Bonuses')}</span></div>
          <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-sm bg-emerald-400" /><span className={`text-xs ${textSecondary}`}>{t('Available Balance')}</span></div>
        </div>
      </Card>

      {/* Records */}
      <Card className="overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-800/40">
          <h3 className={`text-base font-semibold ${textPrimary}`}>{t('Income History')}</h3>
        </div>
        <div className="divide-y divide-gray-800/30">
          {salaries.map((s) => (
            <div key={s.id} className={`flex items-center justify-between px-6 py-4 transition-colors ${theme === 'dark' ? 'hover:bg-gray-800/30' : 'hover:bg-gray-50'}`}>
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center
                  ${s.type === 'salary' ? 'bg-cyan-500/20 text-cyan-400' : s.type === 'bonus' ? 'bg-amber-500/20 text-amber-400' : 'bg-green-500/20 text-green-400'}`}>
                  <DollarSign className="w-5 h-5" />
                </div>
                <div>
                  <p className={`text-sm font-medium capitalize ${textPrimary}`}>{t(s.type)}</p>
                  <p className={`text-xs ${textSecondary}`}>{t(MONTHS[s.month - 1])} {s.year} · {formatDate(s.date)}</p>
                  {s.note && <p className={`text-xs ${textSecondary} opacity-70`}>{s.note}</p>}
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-base font-bold text-emerald-400">{formatCurrency(s.amount)}</span>
                <div className="flex gap-2">
                  <button onClick={() => openEdit(s)} className="p-1.5 rounded-lg text-gray-500 hover:text-cyan-400 hover:bg-cyan-500/10 transition-all">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => setDeleteId(s.id!)} className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-all">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
          {salaries.length === 0 && (
            <p className={`text-center py-12 text-sm ${textSecondary}`}>{t('No income records yet. Add your first entry.')}</p>
          )}
        </div>
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editId ? t('Edit Income') : t('Add Income')}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Select label={t('Type')} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as Salary['type'] })}>
              <option value="salary">{t('Salary')}</option>
              <option value="bonus">{t('Bonus')}</option>
              <option value="incentive">{t('Incentive')}</option>
            </Select>
            <Input label={t('Amount')} type="number" min="0" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="0.00" required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Select label={t('Month')} value={form.month} onChange={(e) => setForm({ ...form, month: e.target.value })}>
              {MONTHS.map((m, i) => <option key={i} value={String(i + 1)}>{t(m)}</option>)}
            </Select>
            <Select label={t('Year')} value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })}>
              {[2023, 2024, 2025, 2026].map((y) => <option key={y} value={String(y)}>{y}</option>)}
            </Select>
          </div>
          <Input label={t('Date')} type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
          <Input label={t('Note (optional)')} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder={t('Additional notes...')} />
          <div className="flex gap-3 pt-2">
            <Button variant="ghost" className="flex-1" onClick={() => setModalOpen(false)}>{t('Cancel')}</Button>
            <Button className="flex-1" onClick={handleSave} loading={saving}>{editId ? t('Save Changes') : t('Add Income')}</Button>
          </div>
        </div>
      </Modal>

      <Modal open={!!deleteId} onClose={() => setDeleteId(null)} title={t('Delete Record')}>
        <p className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'} mb-6`}>{t('Are you sure? This action cannot be undone.')}</p>
        <div className="flex gap-3">
          <Button variant="ghost" className="flex-1" onClick={() => setDeleteId(null)}>{t('Cancel')}</Button>
          <Button variant="danger" className="flex-1" onClick={handleDelete}>{t('Delete')}</Button>
        </div>
      </Modal>
    </div>
  );
}
