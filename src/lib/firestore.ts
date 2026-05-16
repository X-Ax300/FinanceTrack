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
} from 'firebase/firestore';
import { db } from './firebase';
import { getCache, removeCachedItem, setCache, updateCachedItem } from './cache';
import type { Expense, Salary, CreditCard, CardPayment, CardCharge, SavingGoal, Friend } from '../types';

const now = () => new Date().toISOString();

const COLLECTIONS = {
  expenses: 'expenses',
  salaries: 'salaries',
  cards: 'credit_cards',
  cardPayments: 'card_payments',
  cardCharges: 'card_charges',
  goals: 'saving_goals',
  friends: 'friends',
} as const;

const LEGACY_COLLECTIONS = {
  cards: 'cards',
  cardPayments: 'cardPayments',
  cardCharges: 'cardCharges',
  goals: 'goals',
} as const;

interface GetOptions {
  forceRefresh?: boolean;
}

const inFlightReads = new Map<string, Promise<unknown>>();
const writeVersions = new Map<string, number>();

function readKey(collectionName: string, userId: string): string {
  return `${collectionName}_${userId}`;
}

function markCollectionChanged(collectionName: string, userId?: string) {
  if (!userId) {
    Array.from(writeVersions.keys())
      .filter((key) => key.startsWith(`${collectionName}_`))
      .forEach((key) => writeVersions.set(key, (writeVersions.get(key) || 0) + 1));
    return;
  }
  const key = readKey(collectionName, userId);
  writeVersions.set(key, (writeVersions.get(key) || 0) + 1);
}

async function getCachedCollection<T>(
  collectionName: string,
  userId: string,
  fetchFresh: () => Promise<T>,
  options: GetOptions = {}
): Promise<T> {
  if (!options.forceRefresh) {
    const cached = getCache<T>(collectionName, userId);
    if (cached) return cached;
  }

  const key = readKey(collectionName, userId);
  const existing = inFlightReads.get(key) as Promise<T> | undefined;
  if (existing) return existing;

  const startedAtVersion = writeVersions.get(key) || 0;
  const request = fetchFresh()
    .then((data) => {
      if ((writeVersions.get(key) || 0) === startedAtVersion) {
        setCache(collectionName, data, userId);
      }
      return data;
    })
    .finally(() => {
      inFlightReads.delete(key);
    });

  inFlightReads.set(key, request);
  return request;
}

async function updateDocWithLegacyFallback(
  collectionName: string,
  legacyCollectionName: string | undefined,
  id: string,
  data: Record<string, unknown>
) {
  try {
    await updateDoc(doc(db, collectionName, id), data);
  } catch (error) {
    if (!legacyCollectionName) throw error;
    await updateDoc(doc(db, legacyCollectionName, id), data);
  }
}

async function deleteDocFromCollections(id: string, collectionNames: string[]) {
  const results = await Promise.allSettled(
    collectionNames.map((collectionName) => deleteDoc(doc(db, collectionName, id)))
  );
  const fulfilled = results.some((result) => result.status === 'fulfilled');

  if (!fulfilled) {
    const rejected = results.find((result): result is PromiseRejectedResult => result.status === 'rejected');
    if (rejected) throw rejected.reason;
  }
}

async function getDocsFromUserCollections<T>(
  userId: string,
  collectionNames: string[],
  sortFn?: (a: T, b: T) => number
): Promise<T[]> {
  const results = await Promise.allSettled(
    collectionNames.map((collectionName) =>
      getDocs(query(collection(db, collectionName), where('userId', '==', userId)))
    )
  );
  const [primaryResult] = results;

  if (primaryResult?.status === 'rejected') {
    throw primaryResult.reason;
  }

  const byId = new Map<string, T>();
  results.forEach((result) => {
    if (result.status === 'rejected') return;
    const snap = result.value;
    snap.docs.forEach((d) => {
      byId.set(d.id, { id: d.id, ...d.data() } as T);
    });
  });

  const items = Array.from(byId.values());
  return sortFn ? items.sort(sortFn) : items;
}

async function deleteCardPaymentsForCard(cardId: string) {
  const results = await Promise.allSettled(
    [COLLECTIONS.cardPayments, LEGACY_COLLECTIONS.cardPayments].map((collectionName) =>
      getDocs(query(collection(db, collectionName), where('cardId', '==', cardId)))
    )
  );
  const snapshots = results.flatMap((result, index) =>
    result.status === 'fulfilled' ? [{ snap: result.value, index }] : []
  );

  await Promise.allSettled(
    snapshots.flatMap(({ snap, index }) => {
      const collectionName = index === 0 ? COLLECTIONS.cardPayments : LEGACY_COLLECTIONS.cardPayments;
      return snap.docs.map((paymentDoc) => deleteDoc(doc(db, collectionName, paymentDoc.id)));
    })
  );
}

async function deleteCardChargesForCard(cardId: string) {
  const results = await Promise.allSettled(
    [COLLECTIONS.cardCharges, LEGACY_COLLECTIONS.cardCharges].map((collectionName) =>
      getDocs(query(collection(db, collectionName), where('cardId', '==', cardId)))
    )
  );
  const snapshots = results.flatMap((result, index) =>
    result.status === 'fulfilled' ? [{ snap: result.value, index }] : []
  );

  await Promise.allSettled(
    snapshots.flatMap(({ snap, index }) => {
      const collectionName = index === 0 ? COLLECTIONS.cardCharges : LEGACY_COLLECTIONS.cardCharges;
      return snap.docs.map((chargeDoc) => deleteDoc(doc(db, collectionName, chargeDoc.id)));
    })
  );
}

// ============================================================================
// EXPENSES
// ============================================================================

export async function addExpense(data: Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>) {
  const doc = await addDoc(collection(db, COLLECTIONS.expenses), { ...data, createdAt: now(), updatedAt: now() });
  markCollectionChanged('expenses', data.userId);
  
  // Update cache
  const expenses = getCache<Expense[]>('expenses', data.userId) || [];
  const newExpense: Expense = { id: doc.id, ...data, createdAt: now(), updatedAt: now() };
  setCache('expenses', [newExpense, ...expenses], data.userId);
  
  return doc;
}

export async function updateExpense(id: string, data: Partial<Expense>) {
  const updatedAt = now();
  await updateDoc(doc(db, COLLECTIONS.expenses, id), { ...data, updatedAt });
  markCollectionChanged('expenses', data.userId);
  
  // Update cache
  if (data.userId) {
    const expenses = getCache<Expense[]>('expenses', data.userId) || [];
    const updated = expenses.map((e) => (e.id === id ? { ...e, ...data, updatedAt } : e));
    setCache('expenses', updated, data.userId);
  } else {
    updateCachedItem<Expense>('expenses', id, { ...data, updatedAt } as Partial<Expense>);
  }
}

export async function deleteExpense(id: string) {
  await deleteDoc(doc(db, COLLECTIONS.expenses, id));
  markCollectionChanged('expenses');
  removeCachedItem('expenses', id);
}

export async function getExpenses(userId: string, options?: GetOptions): Promise<Expense[]> {
  return getCachedCollection('expenses', userId, async () => {
    const q = query(collection(db, COLLECTIONS.expenses), where('userId', '==', userId), orderBy('date', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Expense));
  }, options);
}

// ============================================================================
// SALARIES
// ============================================================================

export async function addSalary(data: Omit<Salary, 'id' | 'createdAt' | 'updatedAt'>) {
  const salaryDoc = await addDoc(collection(db, COLLECTIONS.salaries), { ...data, createdAt: now(), updatedAt: now() });
  markCollectionChanged('salaries', data.userId);
  
  // Update cache
  const salaries = getCache<Salary[]>('salaries', data.userId) || [];
  const newSalary: Salary = { id: salaryDoc.id, ...data, createdAt: now(), updatedAt: now() };
  setCache('salaries', [newSalary, ...salaries], data.userId);
  
  return salaryDoc;
}

export async function updateSalary(id: string, data: Partial<Salary>) {
  const updatedAt = now();
  await updateDoc(doc(db, COLLECTIONS.salaries, id), { ...data, updatedAt });
  markCollectionChanged('salaries', data.userId);
  
  // Update cache
  if (data.userId) {
    const salaries = getCache<Salary[]>('salaries', data.userId) || [];
    const updated = salaries.map((s) => (s.id === id ? { ...s, ...data, updatedAt } : s));
    setCache('salaries', updated, data.userId);
  } else {
    updateCachedItem<Salary>('salaries', id, { ...data, updatedAt } as Partial<Salary>);
  }
}

export async function deleteSalary(id: string) {
  await deleteDoc(doc(db, COLLECTIONS.salaries, id));
  markCollectionChanged('salaries');
  removeCachedItem('salaries', id);
}

export async function getSalaries(userId: string, options?: GetOptions): Promise<Salary[]> {
  return getCachedCollection('salaries', userId, async () => {
    const q = query(collection(db, COLLECTIONS.salaries), where('userId', '==', userId), orderBy('date', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Salary));
  }, options);
}

// ============================================================================
// CREDIT CARDS
// ============================================================================

export async function addCreditCard(data: Omit<CreditCard, 'id' | 'createdAt' | 'updatedAt'>) {
  const cardDoc = await addDoc(collection(db, COLLECTIONS.cards), { ...data, createdAt: now(), updatedAt: now() });
  markCollectionChanged('cards', data.userId);
  
  // Update cache
  const cards = getCache<CreditCard[]>('cards', data.userId) || [];
  const newCard: CreditCard = { id: cardDoc.id, ...data, createdAt: now(), updatedAt: now() };
  setCache('cards', [newCard, ...cards], data.userId);
  
  return cardDoc;
}

export async function updateCreditCard(id: string, data: Partial<CreditCard>) {
  const updatedAt = now();
  await updateDocWithLegacyFallback(COLLECTIONS.cards, LEGACY_COLLECTIONS.cards, id, { ...data, updatedAt });
  markCollectionChanged('cards', data.userId);
  
  // Update cache
  if (data.userId) {
    const cards = getCache<CreditCard[]>('cards', data.userId) || [];
    const updated = cards.map((c) => (c.id === id ? { ...c, ...data, updatedAt } : c));
    setCache('cards', updated, data.userId);
  } else {
    updateCachedItem<CreditCard>('cards', id, { ...data, updatedAt } as Partial<CreditCard>);
  }
}

export async function deleteCreditCard(id: string) {
  await deleteCardPaymentsForCard(id);
  await deleteCardChargesForCard(id);
  await deleteDocFromCollections(id, [COLLECTIONS.cards, LEGACY_COLLECTIONS.cards]);
  markCollectionChanged('cards');
  markCollectionChanged('cardPayments');
  markCollectionChanged('cardCharges');
  removeCachedItem('cards', id);
}

export async function getCreditCards(userId: string, options?: GetOptions): Promise<CreditCard[]> {
  return getCachedCollection('cards', userId, async () => {
    return getDocsFromUserCollections<CreditCard>(
      userId,
      [COLLECTIONS.cards, LEGACY_COLLECTIONS.cards],
      (a, b) => (b.createdAt || '').localeCompare(a.createdAt || '')
    );
  }, options);
}

// ============================================================================
// CARD PAYMENTS
// ============================================================================

export async function addCardPayment(data: Omit<CardPayment, 'id' | 'createdAt'>) {
  const paymentDoc = await addDoc(collection(db, COLLECTIONS.cardPayments), { ...data, createdAt: now() });
  markCollectionChanged('cardPayments', data.userId);
  
  // Update cache
  const payments = getCache<CardPayment[]>('cardPayments', data.userId) || [];
  const newPayment: CardPayment = { id: paymentDoc.id, ...data, createdAt: now() };
  setCache('cardPayments', [newPayment, ...payments], data.userId);
  
  return paymentDoc;
}

export async function getCardPayments(userId: string, options?: GetOptions): Promise<CardPayment[]> {
  return getCachedCollection('cardPayments', userId, async () => {
    return getDocsFromUserCollections<CardPayment>(
      userId,
      [COLLECTIONS.cardPayments, LEGACY_COLLECTIONS.cardPayments],
      (a, b) => b.date.localeCompare(a.date)
    );
  }, options);
}

export async function deleteCardPayment(id: string) {
  await deleteDocFromCollections(id, [COLLECTIONS.cardPayments, LEGACY_COLLECTIONS.cardPayments]);
  markCollectionChanged('cardPayments');
  removeCachedItem('cardPayments', id);
}

// ============================================================================
// CARD CHARGES
// ============================================================================

export async function addCardCharge(data: Omit<CardCharge, 'id' | 'createdAt'>) {
  const chargeDoc = await addDoc(collection(db, COLLECTIONS.cardCharges), { ...data, createdAt: now() });
  markCollectionChanged('cardCharges', data.userId);

  const charges = getCache<CardCharge[]>('cardCharges', data.userId) || [];
  const newCharge: CardCharge = { id: chargeDoc.id, ...data, createdAt: now() };
  setCache('cardCharges', [newCharge, ...charges], data.userId);

  return chargeDoc;
}

export async function getCardCharges(userId: string, options?: GetOptions): Promise<CardCharge[]> {
  return getCachedCollection('cardCharges', userId, async () => {
    return getDocsFromUserCollections<CardCharge>(
      userId,
      [COLLECTIONS.cardCharges, LEGACY_COLLECTIONS.cardCharges],
      (a, b) => b.date.localeCompare(a.date)
    );
  }, options);
}

export async function deleteCardCharge(id: string) {
  await deleteDocFromCollections(id, [COLLECTIONS.cardCharges, LEGACY_COLLECTIONS.cardCharges]);
  markCollectionChanged('cardCharges');
  removeCachedItem('cardCharges', id);
}

// ============================================================================
// SAVING GOALS
// ============================================================================

export async function addSavingGoal(data: Omit<SavingGoal, 'id' | 'createdAt' | 'updatedAt'>) {
  const goalDoc = await addDoc(collection(db, COLLECTIONS.goals), { ...data, createdAt: now(), updatedAt: now() });
  markCollectionChanged('goals', data.userId);
  
  // Update cache
  const goals = getCache<SavingGoal[]>('goals', data.userId) || [];
  const newGoal: SavingGoal = { id: goalDoc.id, ...data, createdAt: now(), updatedAt: now() };
  setCache('goals', [newGoal, ...goals], data.userId);
  
  return goalDoc;
}

export async function updateSavingGoal(id: string, data: Partial<SavingGoal>) {
  const updatedAt = now();
  await updateDocWithLegacyFallback(COLLECTIONS.goals, LEGACY_COLLECTIONS.goals, id, { ...data, updatedAt });
  markCollectionChanged('goals', data.userId);
  
  // Update cache
  if (data.userId) {
    const goals = getCache<SavingGoal[]>('goals', data.userId) || [];
    const updated = goals.map((g) => (g.id === id ? { ...g, ...data, updatedAt } : g));
    setCache('goals', updated, data.userId);
  } else {
    updateCachedItem<SavingGoal>('goals', id, { ...data, updatedAt } as Partial<SavingGoal>);
  }
}

export async function deleteSavingGoal(id: string) {
  await deleteDocFromCollections(id, [COLLECTIONS.goals, LEGACY_COLLECTIONS.goals]);
  markCollectionChanged('goals');
  removeCachedItem('goals', id);
}

export async function getSavingGoals(userId: string, options?: GetOptions): Promise<SavingGoal[]> {
  return getCachedCollection('goals', userId, async () => {
    return getDocsFromUserCollections<SavingGoal>(
      userId,
      [COLLECTIONS.goals, LEGACY_COLLECTIONS.goals],
      (a, b) => (b.createdAt || '').localeCompare(a.createdAt || '')
    );
  }, options);
}

// ============================================================================
// FRIENDS
// ============================================================================

export async function addFriend(data: Omit<Friend, 'id' | 'createdAt'>) {
  const friendDoc = await addDoc(collection(db, COLLECTIONS.friends), { ...data, createdAt: now() });
  markCollectionChanged('friends', data.userId);
  
  // Update cache
  const friends = getCache<Friend[]>('friends', data.userId) || [];
  const newFriend: Friend = { id: friendDoc.id, ...data, createdAt: now() };
  setCache('friends', [newFriend, ...friends], data.userId);
  
  return friendDoc;
}

export async function getFriends(userId: string, options?: GetOptions): Promise<Friend[]> {
  return getCachedCollection('friends', userId, async () => {
    const q = query(collection(db, COLLECTIONS.friends), where('userId', '==', userId));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Friend));
  }, options);
}

export async function deleteFriend(id: string) {
  await deleteDoc(doc(db, COLLECTIONS.friends, id));
  markCollectionChanged('friends');
  removeCachedItem('friends', id);
}

// ============================================================================
// BACKWARDS COMPATIBILITY
// ============================================================================

export async function addCard(data: Omit<CreditCard, 'id' | 'createdAt' | 'updatedAt'>) {
  return addCreditCard(data);
}

export async function updateCard(id: string, data: Partial<CreditCard>) {
  return updateCreditCard(id, data);
}

export async function deleteCard(id: string) {
  return deleteCreditCard(id);
}

export async function getCards(userId: string, options?: GetOptions): Promise<CreditCard[]> {
  return getCreditCards(userId, options);
}

export async function addGoal(data: Omit<SavingGoal, 'id' | 'createdAt' | 'updatedAt'>) {
  return addSavingGoal(data);
}

export async function updateGoal(id: string, data: Partial<SavingGoal>) {
  return updateSavingGoal(id, data);
}

export async function deleteGoal(id: string) {
  return deleteSavingGoal(id);
}

export async function getGoals(userId: string, options?: GetOptions): Promise<SavingGoal[]> {
  return getSavingGoals(userId, options);
}

export function prefetchUserData(userId: string): Promise<unknown[]> {
  if (!navigator.onLine) return Promise.resolve([]);

  // Load only critical data first
  return Promise.allSettled([
    getExpenses(userId, { forceRefresh: true }),
    getSalaries(userId, { forceRefresh: true }),
  ]).then(results => {
    // Load additional data in background (non-blocking)
    Promise.allSettled([
      getCreditCards(userId, { forceRefresh: true }),
      getCardPayments(userId, { forceRefresh: true }),
      getCardCharges(userId, { forceRefresh: true }),
      getSavingGoals(userId, { forceRefresh: true }),
      getFriends(userId, { forceRefresh: true }),
    ]).catch(error => console.error('Background prefetch failed:', error));
    
    return results;
  });
}
