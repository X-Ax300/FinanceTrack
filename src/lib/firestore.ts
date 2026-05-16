import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
  query,
  where,
  orderBy,
  Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import type { Expense, Salary, CreditCard, CardPayment, SavingGoal, Friend } from '../types';

const now = () => new Date().toISOString();

// Expenses
export async function addExpense(data: Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>) {
  return addDoc(collection(db, 'expenses'), { ...data, createdAt: now(), updatedAt: now() });
}

export async function updateExpense(id: string, data: Partial<Expense>) {
  return updateDoc(doc(db, 'expenses', id), { ...data, updatedAt: now() });
}

export async function deleteExpense(id: string) {
  return deleteDoc(doc(db, 'expenses', id));
}

export async function getExpenses(userId: string): Promise<Expense[]> {
  const q = query(collection(db, 'expenses'), where('userId', '==', userId), orderBy('date', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Expense));
}

// Salaries
export async function addSalary(data: Omit<Salary, 'id' | 'createdAt' | 'updatedAt'>) {
  return addDoc(collection(db, 'salaries'), { ...data, createdAt: now(), updatedAt: now() });
}

export async function updateSalary(id: string, data: Partial<Salary>) {
  return updateDoc(doc(db, 'salaries', id), { ...data, updatedAt: now() });
}

export async function deleteSalary(id: string) {
  return deleteDoc(doc(db, 'salaries', id));
}

export async function getSalaries(userId: string): Promise<Salary[]> {
  const q = query(collection(db, 'salaries'), where('userId', '==', userId), orderBy('date', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Salary));
}

// Credit Cards
export async function addCard(data: Omit<CreditCard, 'id' | 'createdAt' | 'updatedAt'>) {
  return addDoc(collection(db, 'cards'), { ...data, createdAt: now(), updatedAt: now() });
}

export async function updateCard(id: string, data: Partial<CreditCard>) {
  return updateDoc(doc(db, 'cards', id), { ...data, updatedAt: now() });
}

export async function deleteCard(id: string) {
  return deleteDoc(doc(db, 'cards', id));
}

export async function getCards(userId: string): Promise<CreditCard[]> {
  const q = query(collection(db, 'cards'), where('userId', '==', userId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as CreditCard));
}

// Card Payments
export async function addCardPayment(data: Omit<CardPayment, 'id' | 'createdAt'>) {
  return addDoc(collection(db, 'cardPayments'), { ...data, createdAt: now() });
}

export async function getCardPayments(userId: string): Promise<CardPayment[]> {
  const q = query(collection(db, 'cardPayments'), where('userId', '==', userId), orderBy('date', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as CardPayment));
}

export async function deleteCardPayment(id: string) {
  return deleteDoc(doc(db, 'cardPayments', id));
}

// Saving Goals
export async function addGoal(data: Omit<SavingGoal, 'id' | 'createdAt' | 'updatedAt'>) {
  return addDoc(collection(db, 'goals'), { ...data, createdAt: now(), updatedAt: now() });
}

export async function updateGoal(id: string, data: Partial<SavingGoal>) {
  return updateDoc(doc(db, 'goals', id), { ...data, updatedAt: now() });
}

export async function deleteGoal(id: string) {
  return deleteDoc(doc(db, 'goals', id));
}

export async function getGoals(userId: string): Promise<SavingGoal[]> {
  const q = query(collection(db, 'goals'), where('userId', '==', userId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as SavingGoal));
}

// Friends
export async function addFriend(data: Omit<Friend, 'id' | 'createdAt'>) {
  return addDoc(collection(db, 'friends'), { ...data, createdAt: now() });
}

export async function getFriends(userId: string): Promise<Friend[]> {
  const q = query(collection(db, 'friends'), where('userId', '==', userId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Friend));
}

export async function deleteFriend(id: string) {
  return deleteDoc(doc(db, 'friends', id));
}
