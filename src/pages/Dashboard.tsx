import { useEffect, useState } from 'react';
import {
  TrendingUp, TrendingDown, Wallet, CreditCard,
  ArrowUpRight, ArrowDownRight,
  AlertCircle, CheckCircle2,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { getExpenses, getSalaries, getCards, getCardCharges, getCardPayments, getGoals } from '../lib/firestore';
import {
  combineExpensesWithCardCharges,
  formatCurrency,
  formatDate,
  getCardDebt,
  getCurrentMonth,
  getCurrentYear,
  getMonthCardPayments,
  getMonthCashOutflow,
  MONTHS,
  CATEGORY_COLORS,
  CATEGORY_LABELS,
  parseDateString,
} from '../lib/utils';
import Card from '../components/ui/Card';
import type { CardCharge, CardPayment, Expense, Salary, CreditCard as CreditCardType, SavingGoal } from '../types';

export default function Dashboard() {
  const { currentUser } = useAuth();
  const { theme } = useTheme();
  const { t } = useLanguage();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [cardCharges, setCardCharges] = useState<CardCharge[]>([]);
  const [cardPayments, setCardPayments] = useState<CardPayment[]>([]);
  const [salaries, setSalaries] = useState<Salary[]>([]);
  const [cards, setCards] = useState<CreditCardType[]>([]);
  const [goals, setGoals] = useState<SavingGoal[]>([]);
  const [loading, setLoading] = useState(true);

  const curMonth = getCurrentMonth();
  const curYear = getCurrentYear();

  useEffect(() => {
    if (!currentUser) return;
    Promise.all([
      getExpenses(currentUser.uid),
      getSalaries(currentUser.uid),
      getCards(currentUser.uid),
      getCardCharges(currentUser.uid),
      getCardPayments(currentUser.uid),
      getGoals(currentUser.uid),
    ]).then(([exp, sal, crd, charges, payments, gls]) => {
      setExpenses(exp);
      setSalaries(sal);
      setCards(crd);
      setCardCharges(charges);
      setCardPayments(payments);
      setGoals(gls);
      setLoading(false);
    });
  }, [currentUser]);

  const allExpenses = combineExpensesWithCardCharges(expenses, cardCharges, cards);

  const monthExpenses = allExpenses.filter((e) => {
    const d = parseDateString(e.date);
    return d.getMonth() + 1 === curMonth && d.getFullYear() === curYear;
  });

  const monthIncome = salaries
    .filter((s) => s.month === curMonth && s.year === curYear)
    .reduce((a, s) => a + s.amount, 0);

  const prevMonthIncome = salaries
    .filter((s) => {
      const pm = curMonth === 1 ? 12 : curMonth - 1;
      const py = curMonth === 1 ? curYear - 1 : curYear;
      return s.month === pm && s.year === py;
    })
    .reduce((a, s) => a + s.amount, 0);

  const monthCardPayments = getMonthCardPayments(cardPayments, curMonth, curYear);
  const monthCashOutflow = getMonthCashOutflow(expenses, cardPayments, curMonth, curYear);
  
  const totalCardDebt = getCardDebt(cardCharges, cardPayments);
  
  const prevCashOutflow = getMonthCashOutflow(
    expenses,
    cardPayments,
    curMonth === 1 ? 12 : curMonth - 1,
    curMonth === 1 ? curYear - 1 : curYear
  );
  const balance = monthIncome - monthCashOutflow;

  const incomeChange = prevMonthIncome > 0 ? ((monthIncome - prevMonthIncome) / prevMonthIncome) * 100 : 0;
  const expenseChange = prevCashOutflow > 0 ? ((monthCashOutflow - prevCashOutflow) / prevCashOutflow) * 100 : 0;

  // Category breakdown
  const categoryTotals = monthExpenses.reduce((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + e.amount;
    return acc;
  }, {} as Record<string, number>);

  const pieData = Object.entries(categoryTotals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([cat, amt]) => ({
      name: CATEGORY_LABELS[cat as keyof typeof CATEGORY_LABELS] || cat,
      value: amt,
      color: CATEGORY_COLORS[cat as keyof typeof CATEGORY_COLORS] || '#6b7280',
    }));

  // Monthly trend (last 6 months)
  const trendData = Array.from({ length: 6 }, (_, i) => {
    const month = ((curMonth - 1 - (5 - i) + 12) % 12) + 1;
    const year = curMonth - (5 - i) <= 0 ? curYear - 1 : curYear;
    const inc = salaries.filter((s) => s.month === month && s.year === year).reduce((a, s) => a + s.amount, 0);
    const outflow = getMonthCashOutflow(expenses, cardPayments, month, year);
    return { month: MONTHS[month - 1].slice(0, 3), income: inc, expenses: outflow };
  });

  const textPrimary = theme === 'dark' ? 'text-white' : 'text-gray-900';
  const textSecondary = theme === 'dark' ? 'text-gray-400' : 'text-gray-500';

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className={`text-2xl font-bold ${textPrimary}`}>
          {new Date().getHours() < 12 ? t('Good morning') : new Date().getHours() < 17 ? t('Good afternoon') : t('Good evening')},{' '}
          <span className="bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
            {currentUser?.displayName?.split(' ')[0] || t('there')}
          </span>
        </h1>
        <p className={`text-sm mt-1 ${textSecondary}`}>
          {t(MONTHS[curMonth - 1])} {curYear} - {t("Here's your financial summary")}
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          theme={theme}
          label={t('Monthly Income')}
          value={formatCurrency(monthIncome)}
          change={incomeChange}
          icon={<TrendingUp className="w-5 h-5" />}
          gradient="from-cyan-500 to-blue-600"
          glowColor="shadow-cyan-500/20"
        />
        <StatCard
          theme={theme}
          label={t('Cash Outflow')}
          value={formatCurrency(monthCashOutflow)}
          change={expenseChange}
          invertChange
          icon={<TrendingDown className="w-5 h-5" />}
          gradient="from-rose-500 to-pink-600"
          glowColor="shadow-rose-500/20"
        />
        <StatCard
          theme={theme}
          label={t('Balance')}
          value={formatCurrency(balance)}
          icon={<Wallet className="w-5 h-5" />}
          gradient={balance >= 0 ? 'from-emerald-500 to-green-600' : 'from-red-500 to-rose-600'}
          glowColor={balance >= 0 ? 'shadow-emerald-500/20' : 'shadow-red-500/20'}
        />
        <StatCard
          theme={theme}
          label={t('Card Debt')}
          value={formatCurrency(totalCardDebt)}
          subValue={`${t('Paid this month')}: ${formatCurrency(monthCardPayments)}`}
          icon={<CreditCard className="w-5 h-5" />}
          gradient="from-amber-500 to-orange-600"
          glowColor="shadow-amber-500/20"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Trend chart */}
        <Card className="xl:col-span-2 p-6">
          <h3 className={`text-base font-semibold mb-6 ${textPrimary}`}>{t('Income vs Expenses Trend')}</h3>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={trendData} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
              <defs>
                <linearGradient id="incGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="expGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#1f2937' : '#e5e7eb'} />
              <XAxis dataKey="month" tick={{ fill: theme === 'dark' ? '#6b7280' : '#9ca3af', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: theme === 'dark' ? '#6b7280' : '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v >= 1000 ? (v / 1000).toFixed(1) + 'k' : v}`} />
              <Tooltip
                contentStyle={{
                  background: theme === 'dark' ? '#111827' : '#fff',
                  border: `1px solid ${theme === 'dark' ? '#374151' : '#e5e7eb'}`,
                  borderRadius: 12,
                  color: theme === 'dark' ? '#fff' : '#111',
                  fontSize: 12,
                }}
                formatter={(v) => formatCurrency(Number(v || 0))}
              />
              <Area type="monotone" dataKey="income" stroke="#06b6d4" strokeWidth={2} fill="url(#incGrad)" name="Income" />
              <Area type="monotone" dataKey="expenses" stroke="#f43f5e" strokeWidth={2} fill="url(#expGrad)" name="Expenses" />
            </AreaChart>
          </ResponsiveContainer>
          <div className="flex gap-6 mt-2">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-cyan-400" />
              <span className={`text-xs ${textSecondary}`}>{t('Income')}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-rose-400" />
              <span className={`text-xs ${textSecondary}`}>{t('Expenses')}</span>
            </div>
          </div>
        </Card>

        {/* Pie chart */}
        <Card className="p-6">
          <h3 className={`text-base font-semibold mb-4 ${textPrimary}`}>{t('Spending by Category')}</h3>
          {pieData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={3} dataKey="value">
                    {pieData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: theme === 'dark' ? '#111827' : '#fff',
                      border: `1px solid ${theme === 'dark' ? '#374151' : '#e5e7eb'}`,
                      borderRadius: 12,
                      fontSize: 12,
                    }}
                    formatter={(v) => formatCurrency(Number(v || 0))}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 mt-2">
                {pieData.map((item, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: item.color }} />
                      <span className={textSecondary}>{item.name}</span>
                    </div>
                    <span className={`font-medium ${textPrimary}`}>{formatCurrency(item.value)}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className={`flex flex-col items-center justify-center h-40 ${textSecondary} text-sm text-center`}>
              <AlertCircle className="w-8 h-8 mb-2 opacity-40" />
              {t('No expenses this month')}
            </div>
          )}
        </Card>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent expenses */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className={`text-base font-semibold ${textPrimary}`}>{t('Recent Expenses')}</h3>
            <span className={`text-xs ${textSecondary}`}>{monthExpenses.length} {t('this month')}</span>
          </div>
          <div className="space-y-3">
            {monthExpenses.slice(0, 5).map((e) => (
              <div key={e.id} className={`flex items-center justify-between py-2 border-b last:border-0 ${theme === 'dark' ? 'border-gray-800' : 'border-gray-100'}`}>
                <div className="flex items-center gap-3">
                  <span className="text-lg">{getCategoryIcon(e.category)}</span>
                  <div>
                    <p className={`text-sm font-medium ${textPrimary}`}>{e.name}</p>
                    <p className={`text-xs ${textSecondary}`}>{formatDate(e.date)}</p>
                  </div>
                </div>
                <span className="text-sm font-semibold text-rose-400">-{formatCurrency(e.amount)}</span>
              </div>
            ))}
            {monthExpenses.length === 0 && (
              <p className={`text-sm text-center py-4 ${textSecondary}`}>{t('No expenses recorded this month')}</p>
            )}
          </div>
        </Card>

        {/* Cards overview */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className={`text-base font-semibold ${textPrimary}`}>{t('Credit Cards')}</h3>
            <span className={`text-xs ${textSecondary}`}>{cards.length} {cards.length !== 1 ? t('cards') : t('card')}</span>
          </div>
          <div className="space-y-3">
            {cards.slice(0, 4).map((card) => (
              <div key={card.id} className={`flex items-center justify-between p-3 rounded-xl ${theme === 'dark' ? 'bg-gray-800/50' : 'bg-gray-50'}`}>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: card.color }}>
                    <CreditCard className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className={`text-sm font-medium ${textPrimary}`}>{card.bankName}</p>
                    <p className={`text-xs ${textSecondary}`}>•••• {card.lastFour}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-xs ${textSecondary}`}>{t('Debt left')}</p>
                  <p className={`text-sm font-semibold ${getCardDebt(cardCharges, cardPayments, card.id) > 0 ? 'text-amber-400' : textPrimary}`}>
                    {formatCurrency(getCardDebt(cardCharges, cardPayments, card.id))}
                  </p>
                </div>
              </div>
            ))}
            {cards.length === 0 && (
              <p className={`text-sm text-center py-4 ${textSecondary}`}>No cards registered</p>
            )}
          </div>
        </Card>
      </div>

      {/* Goals progress */}
      {goals.length > 0 && (
        <Card className="p-6">
            <h3 className={`text-base font-semibold mb-4 ${textPrimary}`}>{t('Saving Goals')}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {goals.slice(0, 6).map((goal) => {
              const pct = Math.min(100, (goal.currentAmount / goal.targetAmount) * 100);
              const done = pct >= 100;
              return (
                <div key={goal.id} className={`p-4 rounded-xl ${theme === 'dark' ? 'bg-gray-800/50' : 'bg-gray-50'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <p className={`text-sm font-medium ${textPrimary}`}>{goal.name}</p>
                    {done && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                  </div>
                  <div className={`w-full h-1.5 rounded-full ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'} mb-2`}>
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className={textSecondary}>{formatCurrency(goal.currentAmount)}</span>
                    <span className={`font-medium ${textPrimary}`}>{pct.toFixed(0)}%</span>
                    <span className={textSecondary}>{formatCurrency(goal.targetAmount)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}
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

interface StatCardProps {
  theme: string;
  label: string;
  value: string;
  subValue?: string;
  change?: number;
  invertChange?: boolean;
  icon: React.ReactNode;
  gradient: string;
  glowColor: string;
}

function StatCard({ theme, label, value, subValue, change, invertChange, icon, gradient, glowColor }: StatCardProps) {
  const isPositive = invertChange ? (change !== undefined && change <= 0) : (change !== undefined && change >= 0);
  const textPrimary = theme === 'dark' ? 'text-white' : 'text-gray-900';
  const textSecondary = theme === 'dark' ? 'text-gray-400' : 'text-gray-500';

  return (
    <div className={`relative rounded-2xl border p-5 overflow-hidden transition-all duration-300 hover:-translate-y-0.5
      ${theme === 'dark' ? 'bg-gray-900/60 border-gray-800/60' : 'bg-white border-gray-200'}
      shadow-xl ${glowColor}`}
    >
      <div className="flex items-center justify-between mb-3">
        <p className={`text-sm ${textSecondary}`}>{label}</p>
        <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center text-white shadow-lg`}>
          {icon}
        </div>
      </div>
      <p className={`text-2xl font-bold ${textPrimary}`}>{value}</p>
      {subValue && <p className={`text-xs mt-1 ${textSecondary}`}>{subValue}</p>}
      {change !== undefined && Math.abs(change) > 0.1 && (
        <div className={`flex items-center gap-1 mt-2 text-xs font-medium ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
          {isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
          {Math.abs(change).toFixed(1)}% vs last month
        </div>
      )}
    </div>
  );
}
