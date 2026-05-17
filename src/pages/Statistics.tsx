import { useEffect, useState } from 'react';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, LineChart, Line, Legend,
} from 'recharts';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { getExpenses, getSalaries, getCards, getCardCharges, getCardPayments } from '../lib/firestore';
import {
  combineExpensesWithCardCharges,
  getMonthCardPayments,
  getMonthCashOutflow,
  formatCurrency, MONTHS, CATEGORY_LABELS, CATEGORY_COLORS,
  getCurrentMonth, getCurrentYear,
  parseDateString,
} from '../lib/utils';
import Card from '../components/ui/Card';
import type { CardCharge, CardPayment, CreditCard, Expense, Salary, ExpenseCategory } from '../types';

export default function Statistics() {
  const { currentUser } = useAuth();
  const { theme } = useTheme();
  const { t } = useLanguage();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [cardCharges, setCardCharges] = useState<CardCharge[]>([]);
  const [cardPayments, setCardPayments] = useState<CardPayment[]>([]);
  const [cards, setCards] = useState<CreditCard[]>([]);
  const [salaries, setSalaries] = useState<Salary[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());
  const [selectedYear, setSelectedYear] = useState(getCurrentYear());

  const textPrimary = theme === 'dark' ? 'text-white' : 'text-gray-900';
  const textSecondary = theme === 'dark' ? 'text-gray-400' : 'text-gray-500';
  const tooltipStyle = {
    background: theme === 'dark' ? '#111827' : '#fff',
    border: `1px solid ${theme === 'dark' ? '#374151' : '#e5e7eb'}`,
    borderRadius: 12,
    fontSize: 12,
  };

  useEffect(() => {
    if (!currentUser) return;
    Promise.all([
      getExpenses(currentUser.uid),
      getSalaries(currentUser.uid),
      getCards(currentUser.uid),
      getCardCharges(currentUser.uid),
      getCardPayments(currentUser.uid),
    ]).then(([exp, sal, crd, charges, payments]) => {
      setExpenses(exp);
      setSalaries(sal);
      setCards(crd);
      setCardCharges(charges);
      setCardPayments(payments);
      setLoading(false);
    });
  }, [currentUser]);

  const allExpenses = combineExpensesWithCardCharges(expenses, cardCharges, cards);

  const monthExpenses = allExpenses.filter((e) => {
    const d = parseDateString(e.date);
    return d.getMonth() + 1 === selectedMonth && d.getFullYear() === selectedYear;
  });

  const totalExpense = monthExpenses.reduce((a, e) => a + e.amount, 0);
  const cardPaymentsTotal = getMonthCardPayments(cardPayments, selectedMonth, selectedYear);
  const cashOutflow = getMonthCashOutflow(expenses, cardPayments, selectedMonth, selectedYear);
  const totalIncome = salaries
    .filter((s) => s.month === selectedMonth && s.year === selectedYear)
    .reduce((a, s) => a + s.amount, 0);

  // Category breakdown
  const catMap = monthExpenses.reduce((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + e.amount;
    return acc;
  }, {} as Record<string, number>);

  const pieData = Object.entries(catMap)
    .sort((a, b) => b[1] - a[1])
    .map(([cat, amt]) => ({
      name: t(CATEGORY_LABELS[cat as ExpenseCategory] || cat),
      value: amt,
      pct: totalExpense > 0 ? ((amt / totalExpense) * 100).toFixed(1) : '0',
      color: CATEGORY_COLORS[cat as ExpenseCategory] || '#6b7280',
    }));

  // Monthly trend (12 months)
  const trendData = Array.from({ length: 12 }, (_, i) => {
    const m = i + 1;
    const inc = salaries.filter((s) => s.month === m && s.year === selectedYear).reduce((a, s) => a + s.amount, 0);
    const outflow = getMonthCashOutflow(expenses, cardPayments, m, selectedYear);
    return { month: t(MONTHS[m - 1]).slice(0, 3), income: inc, expenses: outflow, savings: inc - outflow };
  });

  // Category bar data
  const barData = Object.entries(catMap)
    .sort((a, b) => b[1] - a[1])
    .map(([cat, amt]) => ({
      name: t(CATEGORY_LABELS[cat as ExpenseCategory] || cat).slice(0, 8),
      amount: amt,
      color: CATEGORY_COLORS[cat as ExpenseCategory] || '#6b7280',
    }));

  // Avg monthly expense
  const monthsWithExpenses = Array.from({ length: 12 }, (_, i) =>
    allExpenses.filter((e) => {
      const d = parseDateString(e.date);
      return d.getMonth() === i && d.getFullYear() === selectedYear;
    }).reduce((a, e) => a + e.amount, 0)
  ).filter((v) => v > 0);
  const avgMonthly = monthsWithExpenses.length ? monthsWithExpenses.reduce((a, v) => a + v, 0) / monthsWithExpenses.length : 0;

  // Top category
  const topCat = pieData[0];

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className={`text-2xl font-bold ${textPrimary}`}>{t('Statistics')}</h1>
          <p className={`text-sm mt-1 ${textSecondary}`}>{t('Analyze your financial patterns')}</p>
        </div>
        <div className="flex gap-3">
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
            className={`px-3 py-2 rounded-xl text-sm border outline-none ${theme === 'dark' ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-200 text-gray-900'}`}
          >
            {MONTHS.map((m, i) => <option key={i} value={i + 1}>{t(m)}</option>)}
          </select>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className={`px-3 py-2 rounded-xl text-sm border outline-none ${theme === 'dark' ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-200 text-gray-900'}`}
          >
            {[2023, 2024, 2025, 2026].map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: 'Total Income', value: formatCurrency(totalIncome), color: 'text-cyan-400' },
          { label: 'Total Expenses', value: formatCurrency(totalExpense), color: 'text-rose-400' },
          { label: 'Card Payments', value: formatCurrency(cardPaymentsTotal), color: 'text-amber-400' },
          { label: 'Available Balance', value: formatCurrency(totalIncome - cashOutflow), color: totalIncome - cashOutflow >= 0 ? 'text-emerald-400' : 'text-rose-400' },
          { label: 'Avg Monthly Expense', value: formatCurrency(avgMonthly), color: 'text-amber-400' },
        ].map((item) => (
          <Card key={item.label} className="p-4">
            <p className={`text-xs ${textSecondary} mb-1`}>{t(item.label)}</p>
            <p className={`text-xl font-bold ${item.color}`}>{item.value}</p>
          </Card>
        ))}
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Pie */}
        <Card className="p-6">
          <h3 className={`text-base font-semibold mb-4 ${textPrimary}`}>{t('Spending Distribution')}</h3>
          {pieData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" outerRadius={80} innerRadius={50} paddingAngle={3} dataKey="value">
                    {pieData.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} formatter={(v) => formatCurrency(Number(v || 0))} />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-3 space-y-2">
                {pieData.map((item, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ background: item.color }} />
                      <span className={textSecondary}>{item.name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-xs ${textSecondary}`}>{item.pct}%</span>
                      <span className={`font-medium ${textPrimary}`}>{formatCurrency(item.value)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className={`text-center py-16 text-sm ${textSecondary}`}>{t('No data for selected period')}</p>
          )}
        </Card>

        {/* Bar by category */}
        <Card className="p-6">
          <h3 className={`text-base font-semibold mb-4 ${textPrimary}`}>{t('Expenses by Category')}</h3>
          {barData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={barData} layout="vertical" margin={{ left: 0, right: 20, top: 5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#1f2937' : '#e5e7eb'} horizontal={false} />
                <XAxis type="number" tick={{ fill: theme === 'dark' ? '#6b7280' : '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v >= 1000 ? (v / 1000).toFixed(1) + 'k' : v}`} />
                <YAxis dataKey="name" type="category" tick={{ fill: theme === 'dark' ? '#9ca3af' : '#6b7280', fontSize: 12 }} axisLine={false} tickLine={false} width={65} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v) => formatCurrency(Number(v || 0))} />
                <Bar dataKey="amount" radius={[0, 6, 6, 0]}>
                  {barData.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className={`text-center py-16 text-sm ${textSecondary}`}>{t('No data for selected period')}</p>
          )}
        </Card>
      </div>

      {/* Line trend */}
      <Card className="p-6">
        <h3 className={`text-base font-semibold mb-6 ${textPrimary}`}>{t('Annual Financial Overview')} - {selectedYear}</h3>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={trendData} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#1f2937' : '#e5e7eb'} />
            <XAxis dataKey="month" tick={{ fill: theme === 'dark' ? '#6b7280' : '#9ca3af', fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: theme === 'dark' ? '#6b7280' : '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v >= 1000 ? (v / 1000).toFixed(1) + 'k' : v}`} />
            <Tooltip contentStyle={tooltipStyle} formatter={(v) => formatCurrency(Number(v || 0))} />
            <Legend />
            <Line type="monotone" dataKey="income" stroke="#06b6d4" strokeWidth={2.5} dot={{ fill: '#06b6d4', r: 4 }} name={t('Income')} />
            <Line type="monotone" dataKey="expenses" stroke="#f43f5e" strokeWidth={2.5} dot={{ fill: '#f43f5e', r: 4 }} name={t('Expenses')} />
            <Line type="monotone" dataKey="savings" stroke="#22c55e" strokeWidth={2} strokeDasharray="5 5" dot={false} name={t('Savings')} />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      {/* Insights */}
      {pieData.length > 0 && (
        <Card className="p-6">
          <h3 className={`text-base font-semibold mb-4 ${textPrimary}`}>{t('Insights')}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {topCat && (
              <div className={`p-4 rounded-xl ${theme === 'dark' ? 'bg-gray-800/50' : 'bg-gray-50'}`}>
                <p className={`text-xs ${textSecondary} mb-1`}>{t('Top Spending Category')}</p>
                <p className={`text-base font-bold ${textPrimary}`}>{topCat.name}</p>
                <p className="text-sm text-rose-400 font-medium">{formatCurrency(topCat.value)} ({topCat.pct}%)</p>
              </div>
            )}
            <div className={`p-4 rounded-xl ${theme === 'dark' ? 'bg-gray-800/50' : 'bg-gray-50'}`}>
              <p className={`text-xs ${textSecondary} mb-1`}>{t('Savings Rate')}</p>
              <p className={`text-base font-bold ${textPrimary}`}>
                {totalIncome > 0 ? (((totalIncome - cashOutflow) / totalIncome) * 100).toFixed(1) : 0}%
              </p>
              <p className={`text-sm ${textSecondary}`}>{t('of income saved')}</p>
            </div>
            <div className={`p-4 rounded-xl ${theme === 'dark' ? 'bg-gray-800/50' : 'bg-gray-50'}`}>
              <p className={`text-xs ${textSecondary} mb-1`}>{t('Daily Average Spend')}</p>
              <p className={`text-base font-bold ${textPrimary}`}>{formatCurrency(totalExpense / 30)}</p>
              <p className={`text-sm ${textSecondary}`}>{t('per day this month')}</p>
            </div>
            <div className={`p-4 rounded-xl ${theme === 'dark' ? 'bg-gray-800/50' : 'bg-gray-50'}`}>
              <p className={`text-xs ${textSecondary} mb-1`}>{t('Transactions')}</p>
              <p className={`text-base font-bold ${textPrimary}`}>{monthExpenses.length}</p>
              <p className={`text-sm ${textSecondary}`}>{t('this month')}</p>
            </div>
            <div className={`p-4 rounded-xl ${theme === 'dark' ? 'bg-gray-800/50' : 'bg-gray-50'}`}>
              <p className={`text-xs ${textSecondary} mb-1`}>{t('Avg per Transaction')}</p>
              <p className={`text-base font-bold ${textPrimary}`}>
                {formatCurrency(monthExpenses.length ? totalExpense / monthExpenses.length : 0)}
              </p>
              <p className={`text-sm ${textSecondary}`}>{t('average spend')}</p>
            </div>
            <div className={`p-4 rounded-xl ${theme === 'dark' ? 'bg-gray-800/50' : 'bg-gray-50'}`}>
              <p className={`text-xs ${textSecondary} mb-1`}>{t('vs. Monthly Average')}</p>
              <p className={`text-base font-bold ${totalExpense > avgMonthly ? 'text-rose-400' : 'text-emerald-400'}`}>
                {totalExpense > avgMonthly ? '+' : ''}{formatCurrency(totalExpense - avgMonthly)}
              </p>
              <p className={`text-sm ${textSecondary}`}>{totalExpense > avgMonthly ? t('above') : t('below')} {t('average')}</p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
