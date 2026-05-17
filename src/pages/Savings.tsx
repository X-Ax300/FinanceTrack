import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Target, TrendingUp, Calendar } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { getGoals, addGoal, updateGoal, deleteGoal } from '../lib/firestore';
import { formatCurrency, formatDate } from '../lib/utils';
import { useNotifications } from '../hooks/useNotifications';
import Card from '../components/ui/Card';
import Modal from '../components/ui/Modal';
import Button from '../components/ui/Button';
import Input, { Select } from '../components/ui/Input';
import type { SavingGoal, GoalCategory } from '../types';

const GOAL_CATEGORIES: { value: GoalCategory; label: string; icon: string }[] = [
  { value: 'travel', label: 'Travel', icon: '✈️' },
  { value: 'car', label: 'Car', icon: '🚗' },
  { value: 'emergency', label: 'Emergency', icon: '🆘' },
  { value: 'home', label: 'Home', icon: '🏠' },
  { value: 'tech', label: 'Technology', icon: '💻' },
  { value: 'other', label: 'Other', icon: '🎯' },
];

const GOAL_COLORS: Record<GoalCategory, string> = {
  travel: '#06b6d4',
  car: '#f59e0b',
  emergency: '#ef4444',
  home: '#10b981',
  tech: '#3b82f6',
  other: '#8b5cf6',
};

const emptyForm = {
  name: '',
  targetAmount: '',
  currentAmount: '',
  category: 'other' as GoalCategory,
  deadline: '',
};

export default function Savings() {
  const { currentUser } = useAuth();
  const { theme } = useTheme();
  const { t } = useLanguage();
  const { notifySuccess, notifyError } = useNotifications();
  const [goals, setGoals] = useState<SavingGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [addFundsId, setAddFundsId] = useState<string | null>(null);
  const [fundsAmount, setFundsAmount] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const textPrimary = theme === 'dark' ? 'text-white' : 'text-gray-900';
  const textSecondary = theme === 'dark' ? 'text-gray-400' : 'text-gray-500';

  async function load() {
    if (!currentUser) return;
    const data = await getGoals(currentUser.uid);
    setGoals(data);
    setLoading(false);
  }

  useEffect(() => { load(); }, [currentUser]);

  async function handleSave() {
    if (!currentUser || !form.name || !form.targetAmount) return;
    setSaving(true);
    try {
      const data = {
        userId: currentUser.uid,
        name: form.name,
        targetAmount: parseFloat(form.targetAmount),
        currentAmount: parseFloat(form.currentAmount || '0'),
        category: form.category,
        deadline: form.deadline || undefined,
      };
      if (editId) {
        await updateGoal(editId, data);
        notifySuccess('Meta actualizada', `${form.name} se actualizó correctamente`);
      } else {
        await addGoal(data);
        notifySuccess('Meta creada', `${form.name} fue agregada a tus ahorros`);
      }
      await load();
      setModalOpen(false);
    } catch {
      notifyError('Error', 'No se pudo guardar la meta');
    } finally {
      setSaving(false);
    }
  }

  async function handleAddFunds() {
    if (!addFundsId || !fundsAmount) return;
    const goal = goals.find((g) => g.id === addFundsId);
    if (!goal) return;
    try {
      await updateGoal(addFundsId, { currentAmount: goal.currentAmount + parseFloat(fundsAmount) });
      notifySuccess('Fondos agregados', `${formatCurrency(parseFloat(fundsAmount))} se agregaron a ${goal.name}`);
      setAddFundsId(null);
      setFundsAmount('');
      await load();
    } catch {
      notifyError('Error', 'No se pudieron agregar los fondos');
    }
  }

  async function handleDelete() {
    if (!deleteId || !currentUser) return;
    try {
      await deleteGoal(deleteId, currentUser.uid);
      notifySuccess('Meta eliminada', 'La meta de ahorro fue eliminada');
      setDeleteId(null);
      await load();
    } catch {
      notifyError('Error', 'No se pudo eliminar la meta');
    }
  }

  const totalSaved = goals.reduce((a, g) => a + g.currentAmount, 0);
  const totalTarget = goals.reduce((a, g) => a + g.targetAmount, 0);
  const completed = goals.filter((g) => g.currentAmount >= g.targetAmount).length;

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className={`text-2xl font-bold ${textPrimary}`}>{t('Saving Goals')}</h1>
          <p className={`text-sm mt-1 ${textSecondary}`}>{goals.length} {t('goals')} - {completed} {t('completed')}</p>
        </div>
        <Button onClick={() => { setEditId(null); setForm(emptyForm); setModalOpen(true); }} size="sm">
          <Plus className="w-4 h-4" /> {t('New Goal')}
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-5">
          <p className={`text-sm ${textSecondary} mb-1`}>{t('Total Saved')}</p>
          <p className="text-2xl font-bold text-emerald-400">{formatCurrency(totalSaved)}</p>
        </Card>
        <Card className="p-5">
          <p className={`text-sm ${textSecondary} mb-1`}>{t('Total Target')}</p>
          <p className={`text-2xl font-bold ${textPrimary}`}>{formatCurrency(totalTarget)}</p>
        </Card>
        <Card className="p-5">
          <p className={`text-sm ${textSecondary} mb-1`}>{t('Overall Progress')}</p>
          <p className={`text-2xl font-bold text-cyan-400`}>
            {totalTarget > 0 ? ((totalSaved / totalTarget) * 100).toFixed(1) : 0}%
          </p>
        </Card>
      </div>

      {/* Goals grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {goals.map((goal) => {
          const pct = Math.min(100, goal.targetAmount > 0 ? (goal.currentAmount / goal.targetAmount) * 100 : 0);
          const done = pct >= 100;
          const catInfo = GOAL_CATEGORIES.find((c) => c.value === goal.category);
          const color = GOAL_COLORS[goal.category];
          const remaining = Math.max(0, goal.targetAmount - goal.currentAmount);

          return (
            <Card key={goal.id} className="p-5 hover:-translate-y-0.5 transition-transform duration-200">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl" style={{ background: color + '20' }}>
                    {catInfo?.icon || '🎯'}
                  </div>
                  <div>
                    <p className={`font-semibold ${textPrimary}`}>{goal.name}</p>
                    <p className={`text-xs ${textSecondary}`}>{t(catInfo?.label || 'Other')}</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => { setEditId(goal.id!); setForm({ name: goal.name, targetAmount: String(goal.targetAmount), currentAmount: String(goal.currentAmount), category: goal.category, deadline: goal.deadline || '' }); setModalOpen(true); }}
                    className="p-1.5 rounded-lg text-gray-500 hover:text-cyan-400 hover:bg-cyan-500/10 transition-all"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => setDeleteId(goal.id!)} className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-all">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Progress */}
              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm">
                  <span className={textSecondary}>{t('Progress')}</span>
                  <span className={`font-semibold`} style={{ color }}>{pct.toFixed(1)}%</span>
                </div>
                <div className={`w-full h-2 rounded-full ${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-200'}`}>
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${pct}%`, background: done ? '#22c55e' : `linear-gradient(90deg, ${color}, ${color}cc)` }}
                  />
                </div>
                <div className="flex justify-between text-xs">
                  <span className={textSecondary}>{formatCurrency(goal.currentAmount)} {t('saved')}</span>
                  <span className={textSecondary}>{formatCurrency(goal.targetAmount)} {t('goal')}</span>
                </div>
              </div>

              {/* Info */}
              <div className="space-y-1 text-xs mb-4">
                {!done && <p className={textSecondary}>{t('Remaining')}: <span className={`font-medium ${textPrimary}`}>{formatCurrency(remaining)}</span></p>}
                {goal.deadline && (
                  <p className={textSecondary}>
                    <Calendar className="w-3 h-3 inline mr-1" />
                    {t('Deadline')}: {formatDate(goal.deadline)}
                  </p>
                )}
              </div>

              {done ? (
                <div className="text-center py-2 rounded-xl bg-emerald-500/10 text-emerald-400 text-sm font-medium">
                  {t('Goal Achieved!')}
                </div>
              ) : (
                <Button
                  size="sm"
                  variant="secondary"
                  className="w-full"
                  onClick={() => { setAddFundsId(goal.id!); setFundsAmount(''); }}
                >
                  <TrendingUp className="w-3.5 h-3.5" /> {t('Add Funds')}
                </Button>
              )}
            </Card>
          );
        })}

        {goals.length === 0 && (
          <div
            className={`col-span-full flex flex-col items-center justify-center h-48 rounded-2xl border-2 border-dashed cursor-pointer transition-colors
              ${theme === 'dark' ? 'border-gray-800 hover:border-gray-700 text-gray-600' : 'border-gray-200 hover:border-gray-300 text-gray-400'}`}
            onClick={() => { setEditId(null); setForm(emptyForm); setModalOpen(true); }}
          >
            <Target className="w-10 h-10 mb-3" />
            <p className="text-sm font-medium">{t('No saving goals yet')}</p>
            <p className="text-xs mt-1">{t('Click to create your first goal')}</p>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editId ? t('Edit Goal') : t('New Saving Goal')}>
        <div className="space-y-4">
          <Input label={t('Goal Name')} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder={t('Trip to Japan, Emergency Fund...')} required />
          <Select label={t('Category')} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as GoalCategory })}>
            {GOAL_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.icon} {t(c.label)}</option>)}
          </Select>
          <div className="grid grid-cols-2 gap-3">
            <Input label={t('Target Amount')} type="number" min="0" step="0.01" value={form.targetAmount} onChange={(e) => setForm({ ...form, targetAmount: e.target.value })} placeholder="5000" required />
            <Input label={t('Already Saved')} type="number" min="0" step="0.01" value={form.currentAmount} onChange={(e) => setForm({ ...form, currentAmount: e.target.value })} placeholder="0" />
          </div>
          <Input label={t('Deadline (optional)')} type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} />
          <div className="flex gap-3 pt-2">
            <Button variant="ghost" className="flex-1" onClick={() => setModalOpen(false)}>{t('Cancel')}</Button>
            <Button className="flex-1" onClick={handleSave} loading={saving}>{editId ? t('Save Changes') : t('Create Goal')}</Button>
          </div>
        </div>
      </Modal>

      {/* Add funds modal */}
      <Modal open={!!addFundsId} onClose={() => setAddFundsId(null)} title={t('Add Funds')}>
        <div className="space-y-4">
          <Input label={t('Amount to Add')} type="number" min="0" step="0.01" value={fundsAmount} onChange={(e) => setFundsAmount(e.target.value)} placeholder="100.00" required />
          <div className="flex gap-3 pt-2">
            <Button variant="ghost" className="flex-1" onClick={() => setAddFundsId(null)}>{t('Cancel')}</Button>
            <Button className="flex-1" onClick={handleAddFunds}>{t('Add Funds')}</Button>
          </div>
        </div>
      </Modal>

      {/* Delete */}
      <Modal open={!!deleteId} onClose={() => setDeleteId(null)} title={t('Delete Goal')}>
        <p className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'} mb-6`}>{t('This will permanently delete this saving goal.')}</p>
        <div className="flex gap-3">
          <Button variant="ghost" className="flex-1" onClick={() => setDeleteId(null)}>{t('Cancel')}</Button>
          <Button variant="danger" className="flex-1" onClick={handleDelete}>{t('Delete')}</Button>
        </div>
      </Modal>
    </div>
  );
}
