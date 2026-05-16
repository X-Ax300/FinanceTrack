import type { CardCharge, CreditCard, Expense, ExpenseCategory } from '../types';

export const CURRENCIES = ['USD', 'DOP', 'EUR', 'GBP', 'MXN', 'CAD', 'ARS', 'COP', 'BRL', 'JPY'];

export function getStoredCurrency(): string {
  return localStorage.getItem('ft-currency') || 'USD';
}

export function formatCurrency(amount: number, currency = getStoredCurrency()): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function cardChargesToExpenses(charges: CardCharge[], cards: CreditCard[] = []): Expense[] {
  const cardNameById = new Map(cards.map((card) => [card.id, card.bankName]));

  return charges.map((charge) => {
    const cardName = cardNameById.get(charge.cardId) || 'Credit Card';

    return {
      id: `card-charge-${charge.id || `${charge.cardId}-${charge.date}-${charge.amount}`}`,
      userId: charge.userId,
      name: charge.description || `Credit card usage - ${cardName}`,
      category: charge.category || 'shopping',
      amount: charge.amount,
      method: 'credit',
      date: charge.date,
      description: charge.note ? `${cardName}: ${charge.note}` : `Credit card usage - ${cardName}`,
      createdAt: charge.createdAt,
      updatedAt: charge.createdAt,
    };
  });
}

export function combineExpensesWithCardCharges(
  expenses: Expense[],
  charges: CardCharge[],
  cards: CreditCard[] = []
): Expense[] {
  return [...expenses, ...cardChargesToExpenses(charges, cards)].sort((a, b) => b.date.localeCompare(a.date));
}

export function getCurrentMonth(): number {
  return new Date().getMonth() + 1;
}

export function getCurrentYear(): number {
  return new Date().getFullYear();
}

export const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export const CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  food: 'Food',
  transport: 'Transport',
  streaming: 'Streaming',
  services: 'Services',
  shopping: 'Shopping',
  health: 'Health',
  education: 'Education',
  savings: 'Savings',
  other: 'Other',
};

export const CATEGORY_COLORS: Record<ExpenseCategory, string> = {
  food: '#06b6d4',
  transport: '#f59e0b',
  streaming: '#8b5cf6',
  services: '#10b981',
  shopping: '#f97316',
  health: '#ef4444',
  education: '#3b82f6',
  savings: '#22c55e',
  other: '#6b7280',
};

export const CATEGORY_ICONS: Record<ExpenseCategory, string> = {
  food: '🍔',
  transport: '🚗',
  streaming: '📺',
  services: '⚡',
  shopping: '🛍️',
  health: '💊',
  education: '📚',
  savings: '💰',
  other: '📦',
};

export function getMonthYear(date: string) {
  const d = new Date(date);
  return { month: d.getMonth() + 1, year: d.getFullYear() };
}

export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}
