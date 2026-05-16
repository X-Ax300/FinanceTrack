export interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

export interface Expense {
  id?: string;
  userId: string;
  name: string;
  category: ExpenseCategory;
  amount: number;
  method: PaymentMethod;
  date: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export type ExpenseCategory =
  | 'food'
  | 'transport'
  | 'streaming'
  | 'services'
  | 'shopping'
  | 'health'
  | 'education'
  | 'savings'
  | 'other';

export type PaymentMethod = 'cash' | 'credit' | 'debit' | 'transfer';

export interface Salary {
  id?: string;
  userId: string;
  amount: number;
  type: 'salary' | 'bonus' | 'incentive';
  month: number;
  year: number;
  date: string;
  note?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreditCard {
  id?: string;
  userId: string;
  bankName: string;
  lastFour: string;
  limit: number;
  cutDate: number;
  payDate: number;
  color: string;
  createdAt: string;
  updatedAt: string;
}

export interface CardPayment {
  id?: string;
  cardId: string;
  userId: string;
  amount: number;
  month: number;
  year: number;
  date: string;
  note?: string;
  createdAt: string;
}

export interface CardCharge {
  id?: string;
  cardId: string;
  userId: string;
  amount: number;
  date: string;
  description: string;
  category?: ExpenseCategory;
  note?: string;
  createdAt: string;
}

export interface SavingGoal {
  id?: string;
  userId: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  category: GoalCategory;
  deadline?: string;
  createdAt: string;
  updatedAt: string;
}

export type GoalCategory = 'travel' | 'car' | 'emergency' | 'home' | 'tech' | 'other';

export interface Friend {
  id?: string;
  userId: string;
  friendId: string;
  friendEmail: string;
  friendName?: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: string;
}

export interface Notification {
  id?: string;
  userId: string;
  type: 'payment' | 'alert' | 'achievement';
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlocked: boolean;
  unlockedAt?: string;
}
