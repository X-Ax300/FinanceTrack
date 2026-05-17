import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, CreditCard, DollarSign, ShoppingBag } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { getExpenses, getSalaries, getCards, getCardCharges } from '../lib/firestore';
import { combineExpensesWithCardCharges, formatCurrency, MONTHS, parseDateString } from '../lib/utils';
import Card from '../components/ui/Card';
import type { CardCharge, Expense, Salary, CreditCard as CreditCardType } from '../types';

interface CalEvent {
  day: number;
  type: 'expense' | 'income' | 'card-cut' | 'card-pay';
  label: string;
  amount?: number;
  color: string;
}

export default function CalendarPage() {
  const { currentUser } = useAuth();
  const { theme } = useTheme();
  const { t } = useLanguage();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [cardCharges, setCardCharges] = useState<CardCharge[]>([]);
  const [salaries, setSalaries] = useState<Salary[]>([]);
  const [cards, setCards] = useState<CreditCardType[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [loading, setLoading] = useState(true);

  const textPrimary = theme === 'dark' ? 'text-white' : 'text-gray-900';
  const textSecondary = theme === 'dark' ? 'text-gray-400' : 'text-gray-500';

  useEffect(() => {
    if (!currentUser) return;
    Promise.all([getExpenses(currentUser.uid), getSalaries(currentUser.uid), getCards(currentUser.uid), getCardCharges(currentUser.uid)])
      .then(([exp, sal, crd, charges]) => { setExpenses(exp); setSalaries(sal); setCards(crd); setCardCharges(charges); setLoading(false); });
  }, [currentUser]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();

  // Build events for the month
  const eventsByDay: Record<number, CalEvent[]> = {};
  const allExpenses = combineExpensesWithCardCharges(expenses, cardCharges, cards);

  allExpenses.forEach((e) => {
    const d = parseDateString(e.date);
    if (d.getMonth() === month && d.getFullYear() === year) {
      const day = d.getDate();
      if (!eventsByDay[day]) eventsByDay[day] = [];
      eventsByDay[day].push({ day, type: 'expense', label: e.name, amount: e.amount, color: '#f43f5e' });
    }
  });

  salaries.forEach((s) => {
    if (s.month === month + 1 && s.year === year) {
      const d = parseDateString(s.date);
      const day = d.getDate();
      if (!eventsByDay[day]) eventsByDay[day] = [];
      eventsByDay[day].push({ day, type: 'income', label: `${t('Income')}: ${t(s.type)}`, amount: s.amount, color: '#22c55e' });
    }
  });

  cards.forEach((c) => {
    if (!eventsByDay[c.cutDate]) eventsByDay[c.cutDate] = [];
    eventsByDay[c.cutDate].push({ day: c.cutDate, type: 'card-cut', label: `${c.bankName} ${t('cut')}`, color: '#f59e0b' });

    if (!eventsByDay[c.payDate]) eventsByDay[c.payDate] = [];
    eventsByDay[c.payDate].push({ day: c.payDate, type: 'card-pay', label: `${c.bankName} ${t('payment')}`, color: '#06b6d4' });
  });

  const today = new Date();
  const isToday = (day: number) => day === today.getDate() && month === today.getMonth() && year === today.getFullYear();

  function prevMonth() {
    setCurrentDate(new Date(year, month - 1, 1));
  }
  function nextMonth() {
    setCurrentDate(new Date(year, month + 1, 1));
  }

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Upcoming events (next 7 days)
  const todayTs = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const upcomingCards = cards.flatMap((c) => {
    const payTs = new Date(today.getFullYear(), today.getMonth(), c.payDate).getTime();
    const diff = Math.round((payTs - todayTs) / 86400000);
    if (diff >= 0 && diff <= 7) return [{ card: c, days: diff, type: 'payment' }];
    return [];
  });

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div>
          <h1 className={`text-2xl font-bold ${textPrimary}`}>{t('Financial Calendar')}</h1>
        <p className={`text-sm mt-1 ${textSecondary}`}>{t('Track payments, income and expenses')}</p>
      </div>

      {/* Upcoming alerts */}
      {upcomingCards.length > 0 && (
        <div className="space-y-2">
          {upcomingCards.map((u, i) => (
            <Card key={i} className="p-4 border-amber-500/30 bg-amber-500/5">
              <div className="flex items-center gap-3">
                <CreditCard className="w-4 h-4 text-amber-400 flex-shrink-0" />
                <span className={`text-sm ${textPrimary}`}>
                  <strong>{u.card.bankName}</strong> {t('payment due in')}{' '}
                  <strong className="text-amber-400">{u.days === 0 ? t('today') : `${u.days} ${u.days !== 1 ? t('days') : t('day')}`}</strong>
                </span>
              </div>
            </Card>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* Calendar */}
        <Card className="xl:col-span-3 p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className={`text-lg font-semibold ${textPrimary}`}>
              {t(MONTHS[month])} {year}
            </h2>
            <div className="flex gap-2">
              <button onClick={prevMonth} className={`p-2 rounded-xl transition-colors ${theme === 'dark' ? 'hover:bg-gray-800 text-gray-400 hover:text-white' : 'hover:bg-gray-100 text-gray-600'}`}>
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button onClick={() => setCurrentDate(new Date())} className={`px-3 py-1 rounded-xl text-xs font-medium transition-colors ${theme === 'dark' ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-gray-100 text-gray-600'}`}>
                {t('Today')}
              </button>
              <button onClick={nextMonth} className={`p-2 rounded-xl transition-colors ${theme === 'dark' ? 'hover:bg-gray-800 text-gray-400 hover:text-white' : 'hover:bg-gray-100 text-gray-600'}`}>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 mb-2">
            {dayNames.map((d) => (
              <div key={d} className={`text-center text-xs font-medium py-2 ${textSecondary}`}>{t(d)}</div>
            ))}
          </div>

          {/* Days */}
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: firstDay }).map((_, i) => <div key={`empty-${i}`} />)}
            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
              const events = eventsByDay[day] || [];
              return (
                <div
                  key={day}
                  className={`min-h-16 p-1.5 rounded-xl border transition-colors
                    ${isToday(day)
                      ? 'border-cyan-500/50 bg-cyan-500/10'
                      : theme === 'dark'
                        ? 'border-gray-800/40 hover:border-gray-700 hover:bg-gray-800/30'
                        : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50'
                    }`}
                >
                  <span className={`text-xs font-medium block mb-1 ${isToday(day) ? 'text-cyan-400' : textSecondary}`}>{day}</span>
                  <div className="space-y-0.5">
                    {events.slice(0, 2).map((ev, i) => (
                      <div
                        key={i}
                        className="text-xs px-1 py-0.5 rounded truncate"
                        style={{ background: ev.color + '20', color: ev.color }}
                        title={ev.label + (ev.amount ? ` — ${formatCurrency(ev.amount)}` : '')}
                      >
                        {ev.label}
                      </div>
                    ))}
                    {events.length > 2 && (
                      <div className={`text-xs ${textSecondary}`}>+{events.length - 2} {t('more')}</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Legend & upcoming */}
        <div className="space-y-4">
          <Card className="p-5">
            <h3 className={`text-sm font-semibold mb-3 ${textPrimary}`}>{t('Legend')}</h3>
            <div className="space-y-2">
              {[
                { color: '#f43f5e', label: 'Expense', icon: ShoppingBag },
                { color: '#22c55e', label: 'Income', icon: DollarSign },
                { color: '#f59e0b', label: 'Card Cut Date', icon: CreditCard },
                { color: '#06b6d4', label: 'Card Payment', icon: CreditCard },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: item.color }} />
                  <span className={`text-xs ${textSecondary}`}>{t(item.label)}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-5">
            <h3 className={`text-sm font-semibold mb-3 ${textPrimary}`}>{t('This Month Summary')}</h3>
            <div className="space-y-3">
              <div>
                <p className={`text-xs ${textSecondary}`}>{t('Expenses')}</p>
                <p className="text-base font-bold text-rose-400">
                  {formatCurrency(allExpenses.filter((e) => { const d = parseDateString(e.date); return d.getMonth() === month && d.getFullYear() === year; }).reduce((a, e) => a + e.amount, 0))}
                </p>
              </div>
              <div>
                <p className={`text-xs ${textSecondary}`}>{t('Income')}</p>
                <p className="text-base font-bold text-emerald-400">
                  {formatCurrency(salaries.filter((s) => s.month === month + 1 && s.year === year).reduce((a, s) => a + s.amount, 0))}
                </p>
              </div>
              <div>
                <p className={`text-xs ${textSecondary}`}>{t('Card Payments')}</p>
                <p className={`text-base font-bold ${textPrimary}`}>{cards.length} {t('cards')}</p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
