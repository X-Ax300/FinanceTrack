import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FileText, Download, TrendingUp, TrendingDown, BarChart3 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { getExpenses, getSalaries, getCards, getCardCharges, getFriends } from '../lib/firestore';
import { combineExpensesWithCardCharges, formatCurrency, MONTHS, CATEGORY_LABELS, getCurrentYear } from '../lib/utils';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import type { CardCharge, CreditCard, Expense, Friend, Salary } from '../types';

export default function Reports() {
  const { currentUser } = useAuth();
  const { theme } = useTheme();
  const { t } = useLanguage();
  const [searchParams] = useSearchParams();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [cardCharges, setCardCharges] = useState<CardCharge[]>([]);
  const [cards, setCards] = useState<CreditCard[]>([]);
  const [salaries, setSalaries] = useState<Salary[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(getCurrentYear());
  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);
  const [accessError, setAccessError] = useState('');

  const textPrimary = theme === 'dark' ? 'text-white' : 'text-gray-900';
  const textSecondary = theme === 'dark' ? 'text-gray-400' : 'text-gray-500';

  useEffect(() => {
    if (!currentUser) return;

    let active = true;
    const friendId = searchParams.get('friend');

    async function loadReports() {
      setLoading(true);
      setAccessError('');
      setSelectedFriend(null);

      try {
        let viewUserId = currentUser.uid;

        if (friendId) {
          const friends = await getFriends(currentUser.uid, { forceRefresh: true });
          const friend = friends.find((f) => f.friendId === friendId && f.status === 'accepted');

          if (!friend) {
            throw new Error('You do not have access to this shared report.');
          }

          viewUserId = friend.friendId;
          if (active) setSelectedFriend(friend);
        }

        const [exp, sal, crd, charges] = await Promise.all([
          getExpenses(viewUserId, { forceRefresh: !!friendId }),
          getSalaries(viewUserId, { forceRefresh: !!friendId }),
          getCards(viewUserId, { forceRefresh: !!friendId }),
          getCardCharges(viewUserId, { forceRefresh: !!friendId }),
        ]);

        if (!active) return;
        setExpenses(exp);
        setSalaries(sal);
        setCards(crd);
        setCardCharges(charges);
      } catch (error) {
        if (!active) return;
        setExpenses([]);
        setSalaries([]);
        setCards([]);
        setCardCharges([]);
        setAccessError(error instanceof Error ? error.message : 'Could not load this report.');
      } finally {
        if (active) setLoading(false);
      }
    }

    loadReports();

    return () => {
      active = false;
    };
  }, [currentUser, searchParams]);

  const allExpenses = combineExpensesWithCardCharges(expenses, cardCharges, cards);

  // Monthly summary
  const monthlySummary = Array.from({ length: 12 }, (_, i) => {
    const m = i + 1;
    const income = salaries.filter((s) => s.month === m && s.year === selectedYear).reduce((a, s) => a + s.amount, 0);
    const expense = allExpenses.filter((e) => {
      const d = new Date(e.date);
      return d.getMonth() + 1 === m && d.getFullYear() === selectedYear;
    }).reduce((a, e) => a + e.amount, 0);
    return { month: MONTHS[i], m, income, expense, savings: Math.max(0, income - expense), savingsRate: income > 0 ? ((income - expense) / income * 100) : 0 };
  });

  const yearIncome = monthlySummary.reduce((a, m) => a + m.income, 0);
  const yearExpense = monthlySummary.reduce((a, m) => a + m.expense, 0);
  const yearSavings = yearIncome - yearExpense;

  // Category totals for year
  const yearExpenses = allExpenses.filter((e) => new Date(e.date).getFullYear() === selectedYear);
  const catTotals = yearExpenses.reduce((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + e.amount;
    return acc;
  }, {} as Record<string, number>);

  function exportCSV() {
    const rows = [
      ['Month', 'Income', 'Expenses', 'Savings', 'Savings Rate'],
      ...monthlySummary.map((m) => [m.month, m.income.toFixed(2), m.expense.toFixed(2), m.savings.toFixed(2), m.savingsRate.toFixed(1) + '%']),
      [],
      ['TOTAL', yearIncome.toFixed(2), yearExpense.toFixed(2), yearSavings.toFixed(2)],
    ];
    const csv = rows.map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `financetrack-report-${selectedYear}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function exportJSON() {
    const data = {
      year: selectedYear,
      summary: { totalIncome: yearIncome, totalExpenses: yearExpense, totalSavings: yearSavings },
      monthly: monthlySummary,
      categoryBreakdown: catTotals,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `financetrack-report-${selectedYear}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className={`text-2xl font-bold ${textPrimary}`}>{t('Reports')}</h1>
          <p className={`text-sm mt-1 ${textSecondary}`}>
            {selectedFriend
              ? `${t('Shared report from')} ${selectedFriend.friendName || selectedFriend.friendEmail}`
              : t('Annual financial reports and exports')}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className={`px-3 py-2 rounded-xl text-sm border outline-none ${theme === 'dark' ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-200 text-gray-900'}`}
          >
            {[2023, 2024, 2025, 2026].map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          <Button size="sm" variant="secondary" onClick={exportCSV}>
            <Download className="w-4 h-4" /> CSV
          </Button>
          <Button size="sm" variant="secondary" onClick={exportJSON}>
            <Download className="w-4 h-4" /> JSON
          </Button>
        </div>
      </div>

      {accessError && (
        <Card className="p-5 border-rose-500/20 bg-rose-500/5">
          <p className="text-sm font-medium text-rose-400">{t(accessError)}</p>
          <p className={`mt-1 text-xs ${textSecondary}`}>{t('Ask your friend to send or accept the invitation first.')}</p>
        </Card>
      )}

      {/* Year summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/20 flex items-center justify-center">
              <TrendingUp className="w-4.5 h-4.5 w-5 h-5 text-cyan-400" />
            </div>
            <p className={`text-sm ${textSecondary}`}>{t('Total Income')} {selectedYear}</p>
          </div>
          <p className="text-2xl font-bold text-cyan-400">{formatCurrency(yearIncome)}</p>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-xl bg-rose-500/20 flex items-center justify-center">
              <TrendingDown className="w-5 h-5 text-rose-400" />
            </div>
            <p className={`text-sm ${textSecondary}`}>{t('Total Expenses')} {selectedYear}</p>
          </div>
          <p className="text-2xl font-bold text-rose-400">{formatCurrency(yearExpense)}</p>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-emerald-400" />
            </div>
            <p className={`text-sm ${textSecondary}`}>{t('Net Savings')} {selectedYear}</p>
          </div>
          <p className={`text-2xl font-bold ${yearSavings >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{formatCurrency(yearSavings)}</p>
        </Card>
      </div>

      {/* Monthly table */}
      <Card className="overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-800/40 flex items-center gap-2">
          <FileText className={`w-4 h-4 ${textSecondary}`} />
          <h3 className={`text-base font-semibold ${textPrimary}`}>{t('Monthly Breakdown')} - {selectedYear}</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className={`border-b ${theme === 'dark' ? 'border-gray-800' : 'border-gray-100'}`}>
                {['Month', 'Income', 'Expenses', 'Savings', 'Savings Rate', 'Status'].map((h) => (
                  <th key={h} className={`px-5 py-3 text-left text-xs font-medium ${textSecondary} uppercase tracking-wider`}>{t(h)}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/30">
              {monthlySummary.map((row) => {
                const hasData = row.income > 0 || row.expense > 0;
                return (
                  <tr key={row.m} className={`transition-colors ${theme === 'dark' ? 'hover:bg-gray-800/30' : 'hover:bg-gray-50'} ${!hasData ? 'opacity-40' : ''}`}>
                    <td className={`px-5 py-3 text-sm font-medium ${textPrimary}`}>{t(row.month)}</td>
                    <td className="px-5 py-3 text-sm text-cyan-400 font-medium">{formatCurrency(row.income)}</td>
                    <td className="px-5 py-3 text-sm text-rose-400 font-medium">{formatCurrency(row.expense)}</td>
                    <td className={`px-5 py-3 text-sm font-medium ${row.savings >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {formatCurrency(row.savings)}
                    </td>
                    <td className="px-5 py-3">
                      {row.income > 0 ? (
                        <div className="flex items-center gap-2">
                          <div className={`w-16 h-1.5 rounded-full ${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-200'}`}>
                            <div className="h-full rounded-full bg-emerald-400 transition-all" style={{ width: `${Math.min(100, row.savingsRate)}%` }} />
                          </div>
                          <span className={`text-xs ${textSecondary}`}>{row.savingsRate.toFixed(1)}%</span>
                        </div>
                      ) : <span className={`text-xs ${textSecondary}`}>—</span>}
                    </td>
                    <td className="px-5 py-3">
                      {hasData ? (
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-medium
                          ${row.savings >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                          {row.savings >= 0 ? t('Positive') : t('Deficit')}
                        </span>
                      ) : <span className={`text-xs ${textSecondary}`}>{t('No data')}</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Category breakdown */}
      {Object.keys(catTotals).length > 0 && (
        <Card className="p-6">
          <h3 className={`text-base font-semibold mb-4 ${textPrimary}`}>{t('Annual Spending by Category')}</h3>
          <div className="space-y-3">
            {Object.entries(catTotals)
              .sort((a, b) => b[1] - a[1])
              .map(([cat, amt]) => {
                const pct = yearExpense > 0 ? (amt / yearExpense) * 100 : 0;
                return (
                  <div key={cat} className="flex items-center gap-3">
                    <span className={`text-sm w-24 ${textSecondary}`}>{t(CATEGORY_LABELS[cat as keyof typeof CATEGORY_LABELS] || cat)}</span>
                    <div className={`flex-1 h-2 rounded-full ${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-200'}`}>
                      <div className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 transition-all" style={{ width: `${pct}%` }} />
                    </div>
                    <span className={`text-xs w-10 text-right ${textSecondary}`}>{pct.toFixed(1)}%</span>
                    <span className={`text-sm font-medium w-24 text-right ${textPrimary}`}>{formatCurrency(amt)}</span>
                  </div>
                );
              })}
          </div>
        </Card>
      )}
    </div>
  );
}
