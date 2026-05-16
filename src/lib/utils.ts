import type { ExpenseCategory } from '../types';

export function formatCurrency(amount: number, currency = 'USD'): string {
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
