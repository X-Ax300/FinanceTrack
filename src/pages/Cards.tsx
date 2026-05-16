import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, CreditCard, AlertTriangle, DollarSign, ShoppingBag } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import {
  getCards,
  addCard,
  updateCard,
  deleteCard,
  getCardPayments,
  addCardPayment,
  deleteCardPayment,
  getCardCharges,
  addCardCharge,
  deleteCardCharge,
} from '../lib/firestore';
import { formatCurrency, MONTHS, getCurrentMonth, getCurrentYear, CATEGORY_LABELS } from '../lib/utils';
import Card from '../components/ui/Card';
import Modal from '../components/ui/Modal';
import Button from '../components/ui/Button';
import Input, { Select } from '../components/ui/Input';
import type { CreditCard as CreditCardType, CardPayment, CardCharge, ExpenseCategory } from '../types';

const CARD_COLORS = ['#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899', '#f97316', '#10b981', '#f59e0b'];

const emptyCardForm = {
  bankName: '', lastFour: '', limit: '', cutDate: '15', payDate: '5', color: CARD_COLORS[0],
};

const emptyPayForm = {
  amount: '', month: String(getCurrentMonth()), year: String(getCurrentYear()),
  date: new Date().toISOString().split('T')[0], note: '',
};

const emptyChargeForm = {
  amount: '',
  date: new Date().toISOString().split('T')[0],
  description: '',
  category: 'shopping' as ExpenseCategory,
  note: '',
};

const CHARGE_CATEGORIES: ExpenseCategory[] = ['food', 'transport', 'streaming', 'services', 'shopping', 'health', 'education', 'other'];

export default function Cards() {
  const { currentUser } = useAuth();
  const { theme } = useTheme();
  const [cards, setCards] = useState<CreditCardType[]>([]);
  const [payments, setPayments] = useState<CardPayment[]>([]);
  const [charges, setCharges] = useState<CardCharge[]>([]);
  const [loading, setLoading] = useState(true);
  const [cardModal, setCardModal] = useState(false);
  const [payModal, setPayModal] = useState(false);
  const [chargeModal, setChargeModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [selectedCard, setSelectedCard] = useState<CreditCardType | null>(null);
  const [cardForm, setCardForm] = useState(emptyCardForm);
  const [payForm, setPayForm] = useState(emptyPayForm);
  const [chargeForm, setChargeForm] = useState(emptyChargeForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const textPrimary = theme === 'dark' ? 'text-white' : 'text-gray-900';
  const textSecondary = theme === 'dark' ? 'text-gray-400' : 'text-gray-500';
  const curMonth = getCurrentMonth();
  const curYear = getCurrentYear();

  async function load(forceRefresh = false) {
    if (!currentUser) return;
    const [c, p, ch] = await Promise.all([
      getCards(currentUser.uid, { forceRefresh }),
      getCardPayments(currentUser.uid, { forceRefresh }),
      getCardCharges(currentUser.uid, { forceRefresh }),
    ]);
    setCards(c);
    setPayments(p);
    setCharges(ch);
    setLoading(false);
  }

  useEffect(() => { load(); }, [currentUser]);

  function getCardMonthPayment(cardId: string) {
    return payments.filter((p) => p.cardId === cardId && p.month === curMonth && p.year === curYear).reduce((a, p) => a + p.amount, 0);
  }

  function getCardMonthCharges(cardId: string) {
    return charges
      .filter((charge) => {
        const date = new Date(charge.date);
        return charge.cardId === cardId && date.getMonth() + 1 === curMonth && date.getFullYear() === curYear;
      })
      .reduce((total, charge) => total + charge.amount, 0);
  }

  async function handleSaveCard() {
    if (!currentUser || !cardForm.bankName || !cardForm.limit) return;
    setSaving(true);
    setError('');
    try {
      const data = {
        userId: currentUser.uid,
        bankName: cardForm.bankName.trim(),
        lastFour: cardForm.lastFour.trim(),
        limit: parseFloat(cardForm.limit),
        cutDate: parseInt(cardForm.cutDate),
        payDate: parseInt(cardForm.payDate),
        color: cardForm.color,
      };
      if (editId) {
        await updateCard(editId, data);
      } else {
        await addCard(data);
      }
      await load(true);
      setCardModal(false);
    } catch (err) {
      console.error('Failed to save card:', err);
      setError('Could not save the credit card. Please check your connection and try again.');
    } finally {
      setSaving(false);
    }
  }

  async function handleSavePayment() {
    if (!currentUser || !selectedCard || !payForm.amount) return;
    setSaving(true);
    setError('');
    try {
      await addCardPayment({
        userId: currentUser.uid,
        cardId: selectedCard.id!,
        amount: parseFloat(payForm.amount),
        month: parseInt(payForm.month),
        year: parseInt(payForm.year),
        date: payForm.date,
        note: payForm.note,
      });
      await load(true);
      setPayModal(false);
    } catch (err) {
      console.error('Failed to save card payment:', err);
      setError('Could not save the payment. Please check your connection and try again.');
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveCharge() {
    if (!currentUser || !selectedCard || !chargeForm.amount || !chargeForm.description.trim()) return;
    setSaving(true);
    setError('');
    try {
      await addCardCharge({
        userId: currentUser.uid,
        cardId: selectedCard.id!,
        amount: parseFloat(chargeForm.amount),
        date: chargeForm.date,
        description: chargeForm.description.trim(),
        category: chargeForm.category,
        note: chargeForm.note.trim() || undefined,
      });
      await load(true);
      setChargeModal(false);
    } catch (err) {
      console.error('Failed to save card charge:', err);
      setError('Could not save the card usage. Please check your connection and try again.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteCard() {
    if (!deleteId || !currentUser) return;
    setError('');
    try {
      await deleteCard(deleteId, currentUser.uid);
      setDeleteId(null);
      await load(true);
    } catch (err) {
      console.error('Failed to delete card:', err);
      setError('Could not delete the card. Please try again.');
    }
  }

  // Upcoming pay dates
  const today = new Date().getDate();
  const upcomingPayments = cards.filter((c) => {
    const daysUntil = c.payDate >= today ? c.payDate - today : c.payDate + 31 - today;
    return daysUntil <= 7;
  });

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className={`text-2xl font-bold ${textPrimary}`}>Credit Cards</h1>
          <p className={`text-sm mt-1 ${textSecondary}`}>{cards.length} card{cards.length !== 1 ? 's' : ''} registered</p>
        </div>
        <Button onClick={() => { setEditId(null); setCardForm(emptyCardForm); setCardModal(true); }} size="sm">
          <Plus className="w-4 h-4" /> Add Card
        </Button>
      </div>

      {error && (
        <Card className="p-4 border-red-500/30 bg-red-500/5">
          <p className="text-sm text-red-400">{error}</p>
        </Card>
      )}

      {/* Alerts */}
      {upcomingPayments.length > 0 && (
        <Card className="p-4 border-amber-500/30 bg-amber-500/5">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-amber-300">Payment Due Soon</p>
              <p className={`text-xs ${textSecondary}`}>
                {upcomingPayments.map((c) => `${c.bankName} (day ${c.payDate})`).join(', ')} — make sure to pay on time
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {cards.map((card) => {
          const paid = getCardMonthPayment(card.id!);
          const used = getCardMonthCharges(card.id!);
          const balance = Math.max(0, used - paid);
          const cardPayments = payments.filter((p) => p.cardId === card.id).sort((a, b) => b.date.localeCompare(a.date));
          const cardCharges = charges.filter((charge) => charge.cardId === card.id).sort((a, b) => b.date.localeCompare(a.date));
          const todayN = new Date().getDate();
          const daysUntilPay = card.payDate >= todayN ? card.payDate - todayN : card.payDate + 31 - todayN;

          return (
            <div key={card.id} className={`rounded-2xl border overflow-hidden ${theme === 'dark' ? 'border-gray-800/60 bg-gray-900/60' : 'border-gray-200 bg-white'} shadow-xl`}>
              {/* Card visual */}
              <div className="relative p-5 text-white" style={{ background: `linear-gradient(135deg, ${card.color}, ${card.color}99)` }}>
                <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_70%_-20%,white,transparent)]" />
                <div className="flex items-start justify-between mb-8">
                  <div>
                    <p className="text-sm font-medium opacity-80">{card.bankName}</p>
                    <p className="text-xs opacity-60 mt-0.5">Credit Card</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => { setEditId(card.id!); setCardForm({ bankName: card.bankName, lastFour: card.lastFour, limit: String(card.limit), cutDate: String(card.cutDate), payDate: String(card.payDate), color: card.color }); setCardModal(true); }} className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-all">
                      <Pencil className="w-3 h-3" />
                    </button>
                    <button onClick={() => setDeleteId(card.id!)} className="p-1.5 rounded-lg bg-white/10 hover:bg-red-500/30 transition-all">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
                <div>
                  <p className="text-lg font-bold tracking-widest">•••• •••• •••• {card.lastFour || '0000'}</p>
                  <div className="flex justify-between mt-2 text-xs opacity-70">
                    <span>Cut: Day {card.cutDate}</span>
                    <span>Pay: Day {card.payDate}</span>
                  </div>
                </div>
              </div>

              {/* Card info */}
              <div className="p-4 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className={textSecondary}>Limit</span>
                  <span className={`font-semibold ${textPrimary}`}>{formatCurrency(card.limit)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className={textSecondary}>Used this month</span>
                  <span className="font-semibold text-rose-400">{formatCurrency(used)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className={textSecondary}>Paid this month</span>
                  <span className="font-semibold text-emerald-400">{formatCurrency(paid)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className={textSecondary}>Pending balance</span>
                  <span className={`font-semibold ${balance > 0 ? 'text-amber-400' : textPrimary}`}>{formatCurrency(balance)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className={textSecondary}>Days until payment</span>
                  <span className={`font-semibold ${daysUntilPay <= 3 ? 'text-amber-400' : textPrimary}`}>{daysUntilPay} days</span>
                </div>

                {/* Usage history */}
                {cardCharges.length > 0 && (
                  <div className={`mt-3 pt-3 border-t ${theme === 'dark' ? 'border-gray-800' : 'border-gray-100'}`}>
                    <p className={`text-xs font-medium ${textSecondary} mb-2`}>Recent Usage</p>
                    {cardCharges.slice(0, 3).map((charge) => (
                      <div key={charge.id} className="flex justify-between items-center py-1 gap-3">
                        <div className="min-w-0">
                          <p className={`text-xs truncate ${textPrimary}`}>{charge.description}</p>
                          <p className={`text-xs ${textSecondary}`}>{charge.date}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-rose-400">{formatCurrency(charge.amount)}</span>
                          <button onClick={() => { if (currentUser) { deleteCardCharge(charge.id!, currentUser.uid); load(true); } }} className="text-gray-600 hover:text-red-400 transition-colors">
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Payment history */}
                {cardPayments.length > 0 && (
                  <div className={`mt-3 pt-3 border-t ${theme === 'dark' ? 'border-gray-800' : 'border-gray-100'}`}>
                    <p className={`text-xs font-medium ${textSecondary} mb-2`}>Recent Payments</p>
                    {cardPayments.slice(0, 3).map((p) => (
                      <div key={p.id} className="flex justify-between items-center py-1">
                        <span className={`text-xs ${textSecondary}`}>{MONTHS[p.month - 1]} {p.year}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-emerald-400">{formatCurrency(p.amount)}</span>
                          <button onClick={() => { if (currentUser) { deleteCardPayment(p.id!, currentUser.uid); load(true); } }} className="text-gray-600 hover:text-red-400 transition-colors">
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2 mt-1">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => { setSelectedCard(card); setChargeForm(emptyChargeForm); setChargeModal(true); }}
                  >
                    <ShoppingBag className="w-3.5 h-3.5" /> Use
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => { setSelectedCard(card); setPayForm(emptyPayForm); setPayModal(true); }}
                  >
                    <DollarSign className="w-3.5 h-3.5" /> Pay
                  </Button>
                </div>
              </div>
            </div>
          );
        })}

        {/* Add card placeholder */}
        {cards.length === 0 && (
          <div className={`col-span-full flex flex-col items-center justify-center h-48 rounded-2xl border-2 border-dashed transition-colors cursor-pointer
            ${theme === 'dark' ? 'border-gray-800 hover:border-gray-700 text-gray-600 hover:text-gray-500' : 'border-gray-200 hover:border-gray-300 text-gray-400'}`}
            onClick={() => { setEditId(null); setCardForm(emptyCardForm); setCardModal(true); }}
          >
            <CreditCard className="w-10 h-10 mb-3" />
            <p className="text-sm font-medium">No cards registered</p>
            <p className="text-xs mt-1">Click to add your first credit card</p>
          </div>
        )}
      </div>

      {/* Card modal */}
      <Modal open={cardModal} onClose={() => setCardModal(false)} title={editId ? 'Edit Card' : 'Add Credit Card'}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input label="Bank Name" value={cardForm.bankName} onChange={(e) => setCardForm({ ...cardForm, bankName: e.target.value })} placeholder="Visa, Chase..." required />
            <Input label="Last 4 digits" value={cardForm.lastFour} onChange={(e) => setCardForm({ ...cardForm, lastFour: e.target.value })} placeholder="1234" maxLength={4} />
          </div>
          <Input label="Credit Limit" type="number" min="0" value={cardForm.limit} onChange={(e) => setCardForm({ ...cardForm, limit: e.target.value })} placeholder="5000" required />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Cut Date (day)" type="number" min="1" max="31" value={cardForm.cutDate} onChange={(e) => setCardForm({ ...cardForm, cutDate: e.target.value })} />
            <Input label="Pay Date (day)" type="number" min="1" max="31" value={cardForm.payDate} onChange={(e) => setCardForm({ ...cardForm, payDate: e.target.value })} />
          </div>
          <div>
            <label className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'} mb-2 block`}>Card Color</label>
            <div className="flex gap-2">
              {CARD_COLORS.map((c) => (
                <button key={c} onClick={() => setCardForm({ ...cardForm, color: c })}
                  className="w-8 h-8 rounded-full transition-all hover:scale-110"
                  style={{ background: c, boxShadow: cardForm.color === c ? `0 0 0 3px white, 0 0 0 5px ${c}` : 'none' }}
                />
              ))}
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="ghost" className="flex-1" onClick={() => setCardModal(false)}>Cancel</Button>
            <Button className="flex-1" onClick={handleSaveCard} loading={saving}>{editId ? 'Save Changes' : 'Add Card'}</Button>
          </div>
        </div>
      </Modal>

      {/* Usage modal */}
      <Modal open={chargeModal} onClose={() => setChargeModal(false)} title={`Card Usage — ${selectedCard?.bankName}`}>
        <div className="space-y-4">
          <Input
            label="Description"
            value={chargeForm.description}
            onChange={(e) => setChargeForm({ ...chargeForm, description: e.target.value })}
            placeholder="Groceries, fuel, subscription..."
            required
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Amount"
              type="number"
              min="0"
              step="0.01"
              value={chargeForm.amount}
              onChange={(e) => setChargeForm({ ...chargeForm, amount: e.target.value })}
              placeholder="0.00"
              required
            />
            <Input
              label="Date"
              type="date"
              value={chargeForm.date}
              onChange={(e) => setChargeForm({ ...chargeForm, date: e.target.value })}
              required
            />
          </div>
          <Select label="Category" value={chargeForm.category} onChange={(e) => setChargeForm({ ...chargeForm, category: e.target.value as ExpenseCategory })}>
            {CHARGE_CATEGORIES.map((category) => (
              <option key={category} value={category}>{CATEGORY_LABELS[category]}</option>
            ))}
          </Select>
          <Input
            label="Note (optional)"
            value={chargeForm.note}
            onChange={(e) => setChargeForm({ ...chargeForm, note: e.target.value })}
            placeholder="Additional details..."
          />
          <div className="flex gap-3 pt-2">
            <Button variant="ghost" className="flex-1" onClick={() => setChargeModal(false)}>Cancel</Button>
            <Button className="flex-1" onClick={handleSaveCharge} loading={saving}>Register Usage</Button>
          </div>
        </div>
      </Modal>

      {/* Payment modal */}
      <Modal open={payModal} onClose={() => setPayModal(false)} title={`Payment — ${selectedCard?.bankName}`}>
        <div className="space-y-4">
          <Input label="Amount" type="number" min="0" step="0.01" value={payForm.amount} onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })} placeholder="0.00" required />
          <div className="grid grid-cols-2 gap-3">
            <Select label="Month" value={payForm.month} onChange={(e) => setPayForm({ ...payForm, month: e.target.value })}>
              {MONTHS.map((m, i) => <option key={i} value={String(i + 1)}>{m}</option>)}
            </Select>
            <Select label="Year" value={payForm.year} onChange={(e) => setPayForm({ ...payForm, year: e.target.value })}>
              {[2023, 2024, 2025, 2026].map((y) => <option key={y} value={String(y)}>{y}</option>)}
            </Select>
          </div>
          <Input label="Date" type="date" value={payForm.date} onChange={(e) => setPayForm({ ...payForm, date: e.target.value })} />
          <Input label="Note (optional)" value={payForm.note} onChange={(e) => setPayForm({ ...payForm, note: e.target.value })} placeholder="..." />
          <div className="flex gap-3 pt-2">
            <Button variant="ghost" className="flex-1" onClick={() => setPayModal(false)}>Cancel</Button>
            <Button className="flex-1" onClick={handleSavePayment} loading={saving}>Register Payment</Button>
          </div>
        </div>
      </Modal>

      {/* Delete card */}
      <Modal open={!!deleteId} onClose={() => setDeleteId(null)} title="Delete Card">
        <p className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'} mb-6`}>This will permanently delete the card and all its payment records.</p>
        <div className="flex gap-3">
          <Button variant="ghost" className="flex-1" onClick={() => setDeleteId(null)}>Cancel</Button>
          <Button variant="danger" className="flex-1" onClick={handleDeleteCard}>Delete</Button>
        </div>
      </Modal>
    </div>
  );
}
