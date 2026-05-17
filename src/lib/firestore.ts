import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  setDoc,
  onSnapshot,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from './firebase';
import { getCache, removeCachedItem, setCache } from './cache';
import type { Expense, Salary, CreditCard, CardPayment, CardCharge, SavingGoal, Friend } from '../types';

const now = () => new Date().toISOString();

// ============================================================================
// COLLECTION NAMES
// ============================================================================

const COLLECTIONS = {
  users: 'users',
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

// ============================================================================
// HELPERS
// ============================================================================

interface GetOptions {
  forceRefresh?: boolean;
}

const inFlightReads = new Map<string, Promise<unknown>>();
const writeVersions = new Map<string, number>();

/**
 * Obtiene la ruta de colección para un usuario específico
 * Ejemplo: users/user123/expenses
 */
function getUserCollectionPath(userId: string, collectionName: string): string {
  return `users/${userId}/${collectionName}`;
}

function readKey(collectionName: string, userId: string): string {
  return `${collectionName}_${userId}`;
}

function normalizeEmail(email: string | null | undefined): string {
  return (email || '').trim().toLowerCase();
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
    if (cached && (!Array.isArray(cached) || cached.length > 0)) return cached;
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
  collectionPath: string,
  legacyCollectionPath: string | undefined,
  id: string,
  data: Record<string, any>
) {
  try {
    await updateDoc(doc(db, collectionPath, id), data);
  } catch (error) {
    if (!legacyCollectionPath) throw error;
    await updateDoc(doc(db, legacyCollectionPath, id), data);
  }
}

async function getUserScopedDocs<T>(
  userId: string,
  collectionName: string,
  legacyCollectionNames: string[] = [],
  sortFn?: (a: T, b: T) => number
): Promise<T[]> {
  const userPath = getUserCollectionPath(userId, collectionName);
  const byId = new Map<string, T>();

  const legacyReads = legacyCollectionNames.map(async (legacyName) => {
    try {
      const snap = await getDocs(query(collection(db, legacyName), where('userId', '==', userId)));
      snap.docs.forEach((d) => {
        byId.set(d.id, { id: d.id, ...d.data() } as T);
      });
    } catch (error) {
      console.warn(`Legacy read failed for ${legacyName}:`, error);
    }
  });

  await Promise.all(legacyReads);

  const primarySnap = await getDocs(collection(db, userPath));
  primarySnap.docs.forEach((d) => {
    byId.set(d.id, { id: d.id, ...d.data() } as T);
  });

  const items = Array.from(byId.values());
  return sortFn ? items.sort(sortFn) : items;
}

function sortByDateDesc<T extends { date?: string }>(a: T, b: T) {
  return (b.date || '').localeCompare(a.date || '');
}

function sortByCreatedAtDesc<T extends { createdAt?: string }>(a: T, b: T) {
  return (b.createdAt || '').localeCompare(a.createdAt || '');
}

async function deleteCardPaymentsForCard(cardId: string, userId: string) {
  const userPath = getUserCollectionPath(userId, COLLECTIONS.cardPayments);
  const q = query(collection(db, userPath), where('cardId', '==', cardId));
  const snap = await getDocs(q);
  await Promise.allSettled(snap.docs.map((d) => deleteDoc(doc(db, userPath, d.id))));
}

async function deleteCardChargesForCard(cardId: string, userId: string) {
  const userPath = getUserCollectionPath(userId, COLLECTIONS.cardCharges);
  const q = query(collection(db, userPath), where('cardId', '==', cardId));
  const snap = await getDocs(q);
  await Promise.allSettled(snap.docs.map((d) => deleteDoc(doc(db, userPath, d.id))));
}

// ============================================================================
// USER PROFILES
// ============================================================================

interface UserProfile {
  uid: string;
  email: string | null;
  emailLower: string;
  displayName: string | null;
  photoURL?: string | null;
  createdAt?: string;
  updatedAt: string;
}

export async function upsertUserProfile(profile: {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL?: string | null;
}) {
  const userRef = doc(db, COLLECTIONS.users, profile.uid);
  const existing = await getDoc(userRef);
  await setDoc(
    userRef,
    {
      uid: profile.uid,
      email: profile.email,
      emailLower: normalizeEmail(profile.email),
      displayName: profile.displayName,
      photoURL: profile.photoURL || null,
      createdAt: existing.exists() ? existing.data().createdAt || now() : now(),
      updatedAt: now(),
    } satisfies UserProfile,
    { merge: true }
  );
}

async function getUserProfileByEmail(email: string): Promise<UserProfile | null> {
  const emailLower = normalizeEmail(email);
  if (!emailLower) return null;

  const q = query(collection(db, COLLECTIONS.users), where('emailLower', '==', emailLower));
  const snap = await getDocs(q);
  const first = snap.docs[0];
  return first ? ({ uid: first.id, ...first.data() } as UserProfile) : null;
}

// ============================================================================
// EXPENSES
// ============================================================================

export async function addExpense(data: Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>) {
  const userPath = getUserCollectionPath(data.userId, COLLECTIONS.expenses);
  const expenseDoc = await addDoc(collection(db, userPath), { ...data, createdAt: now(), updatedAt: now() });
  markCollectionChanged('expenses', data.userId);
  
  const expenses = getCache<Expense[]>('expenses', data.userId) || [];
  const newExpense: Expense = { id: expenseDoc.id, ...data, createdAt: now(), updatedAt: now() };
  setCache('expenses', [newExpense, ...expenses], data.userId);
  
  return expenseDoc;
}

export async function updateExpense(id: string, data: Partial<Expense>) {
  if (!data.userId) throw new Error('userId is required');
  const updatedAt = now();
  const userPath = getUserCollectionPath(data.userId, COLLECTIONS.expenses);
  await updateDoc(doc(db, userPath, id), { ...data, updatedAt });
  markCollectionChanged('expenses', data.userId);
  
  const expenses = getCache<Expense[]>('expenses', data.userId) || [];
  const updated = expenses.map((e) => (e.id === id ? { ...e, ...data, updatedAt } : e));
  setCache('expenses', updated, data.userId);
}

export async function deleteExpense(id: string, userId: string) {
  const userPath = getUserCollectionPath(userId, COLLECTIONS.expenses);
  await deleteDoc(doc(db, userPath, id));
  markCollectionChanged('expenses', userId);
  removeCachedItem('expenses', id);
}

export async function getExpenses(userId: string, options?: GetOptions): Promise<Expense[]> {
  return getCachedCollection('expenses', userId, async () => {
    return getUserScopedDocs<Expense>(userId, COLLECTIONS.expenses, [COLLECTIONS.expenses], sortByDateDesc);
  }, options);
}

// ============================================================================
// SALARIES
// ============================================================================

export async function addSalary(data: Omit<Salary, 'id' | 'createdAt' | 'updatedAt'>) {
  const userPath = getUserCollectionPath(data.userId, COLLECTIONS.salaries);
  const salaryDoc = await addDoc(collection(db, userPath), { ...data, createdAt: now(), updatedAt: now() });
  markCollectionChanged('salaries', data.userId);
  
  const salaries = getCache<Salary[]>('salaries', data.userId) || [];
  const newSalary: Salary = { id: salaryDoc.id, ...data, createdAt: now(), updatedAt: now() };
  setCache('salaries', [newSalary, ...salaries], data.userId);
  
  return salaryDoc;
}

export async function updateSalary(id: string, data: Partial<Salary>) {
  if (!data.userId) throw new Error('userId is required');
  const updatedAt = now();
  const userPath = getUserCollectionPath(data.userId, COLLECTIONS.salaries);
  await updateDoc(doc(db, userPath, id), { ...data, updatedAt });
  markCollectionChanged('salaries', data.userId);
  
  const salaries = getCache<Salary[]>('salaries', data.userId) || [];
  const updated = salaries.map((s) => (s.id === id ? { ...s, ...data, updatedAt } : s));
  setCache('salaries', updated, data.userId);
}

export async function deleteSalary(id: string, userId: string) {
  const userPath = getUserCollectionPath(userId, COLLECTIONS.salaries);
  await deleteDoc(doc(db, userPath, id));
  markCollectionChanged('salaries', userId);
  removeCachedItem('salaries', id);
}

export async function getSalaries(userId: string, options?: GetOptions): Promise<Salary[]> {
  return getCachedCollection('salaries', userId, async () => {
    return getUserScopedDocs<Salary>(userId, COLLECTIONS.salaries, [COLLECTIONS.salaries], sortByDateDesc);
  }, options);
}

// ============================================================================
// CREDIT CARDS
// ============================================================================

export async function addCreditCard(data: Omit<CreditCard, 'id' | 'createdAt' | 'updatedAt'>) {
  const userPath = getUserCollectionPath(data.userId, COLLECTIONS.cards);
  const cardDoc = await addDoc(collection(db, userPath), { ...data, createdAt: now(), updatedAt: now() });
  markCollectionChanged('cards', data.userId);
  
  const cards = getCache<CreditCard[]>('cards', data.userId) || [];
  const newCard: CreditCard = { id: cardDoc.id, ...data, createdAt: now(), updatedAt: now() };
  setCache('cards', [newCard, ...cards], data.userId);
  
  return cardDoc;
}

export async function updateCreditCard(id: string, data: Partial<CreditCard>) {
  if (!data.userId) throw new Error('userId is required');
  const updatedAt = now();
  const userPath = getUserCollectionPath(data.userId, COLLECTIONS.cards);
  const legacyPath = LEGACY_COLLECTIONS.cards;
  await updateDocWithLegacyFallback(userPath, legacyPath, id, { ...data, updatedAt });
  markCollectionChanged('cards', data.userId);
  
  const cards = getCache<CreditCard[]>('cards', data.userId) || [];
  const updated = cards.map((c) => (c.id === id ? { ...c, ...data, updatedAt } : c));
  setCache('cards', updated, data.userId);
}

export async function deleteCreditCard(id: string, userId: string) {
  await deleteCardPaymentsForCard(id, userId);
  await deleteCardChargesForCard(id, userId);
  const userPath = getUserCollectionPath(userId, COLLECTIONS.cards);
  await deleteDoc(doc(db, userPath, id));
  markCollectionChanged('cards', userId);
  markCollectionChanged('cardPayments', userId);
  markCollectionChanged('cardCharges', userId);
  removeCachedItem('cards', id);
}

export async function getCreditCards(userId: string, options?: GetOptions): Promise<CreditCard[]> {
  return getCachedCollection('cards', userId, async () => {
    return getUserScopedDocs<CreditCard>(
      userId,
      COLLECTIONS.cards,
      [COLLECTIONS.cards, LEGACY_COLLECTIONS.cards],
      sortByCreatedAtDesc
    );
  }, options);
}

// ============================================================================
// CARD PAYMENTS
// ============================================================================

export async function addCardPayment(data: Omit<CardPayment, 'id' | 'createdAt'>) {
  const userPath = getUserCollectionPath(data.userId, COLLECTIONS.cardPayments);
  const paymentDoc = await addDoc(collection(db, userPath), { ...data, createdAt: now() });
  markCollectionChanged('cardPayments', data.userId);
  
  const payments = getCache<CardPayment[]>('cardPayments', data.userId) || [];
  const newPayment: CardPayment = { id: paymentDoc.id, ...data, createdAt: now() };
  setCache('cardPayments', [newPayment, ...payments], data.userId);
  
  return paymentDoc;
}

export async function getCardPayments(userId: string, options?: GetOptions): Promise<CardPayment[]> {
  return getCachedCollection('cardPayments', userId, async () => {
    return getUserScopedDocs<CardPayment>(
      userId,
      COLLECTIONS.cardPayments,
      [COLLECTIONS.cardPayments, LEGACY_COLLECTIONS.cardPayments],
      sortByDateDesc
    );
  }, options);
}

export async function deleteCardPayment(id: string, userId: string) {
  const userPath = getUserCollectionPath(userId, COLLECTIONS.cardPayments);
  await deleteDoc(doc(db, userPath, id));
  markCollectionChanged('cardPayments', userId);
  removeCachedItem('cardPayments', id);
}

// ============================================================================
// CARD CHARGES
// ============================================================================

export async function addCardCharge(data: Omit<CardCharge, 'id' | 'createdAt'>) {
  const userPath = getUserCollectionPath(data.userId, COLLECTIONS.cardCharges);
  const chargeDoc = await addDoc(collection(db, userPath), { ...data, createdAt: now() });
  markCollectionChanged('cardCharges', data.userId);

  const charges = getCache<CardCharge[]>('cardCharges', data.userId) || [];
  const newCharge: CardCharge = { id: chargeDoc.id, ...data, createdAt: now() };
  setCache('cardCharges', [newCharge, ...charges], data.userId);

  return chargeDoc;
}

export async function getCardCharges(userId: string, options?: GetOptions): Promise<CardCharge[]> {
  return getCachedCollection('cardCharges', userId, async () => {
    return getUserScopedDocs<CardCharge>(
      userId,
      COLLECTIONS.cardCharges,
      [COLLECTIONS.cardCharges, LEGACY_COLLECTIONS.cardCharges],
      sortByDateDesc
    );
  }, options);
}

export async function deleteCardCharge(id: string, userId: string) {
  const userPath = getUserCollectionPath(userId, COLLECTIONS.cardCharges);
  await deleteDoc(doc(db, userPath, id));
  markCollectionChanged('cardCharges', userId);
  removeCachedItem('cardCharges', id);
}

// ============================================================================
// SAVING GOALS
// ============================================================================

export async function addSavingGoal(data: Omit<SavingGoal, 'id' | 'createdAt' | 'updatedAt'>) {
  const userPath = getUserCollectionPath(data.userId, COLLECTIONS.goals);
  const goalDoc = await addDoc(collection(db, userPath), { ...data, createdAt: now(), updatedAt: now() });
  markCollectionChanged('goals', data.userId);
  
  const goals = getCache<SavingGoal[]>('goals', data.userId) || [];
  const newGoal: SavingGoal = { id: goalDoc.id, ...data, createdAt: now(), updatedAt: now() };
  setCache('goals', [newGoal, ...goals], data.userId);
  
  return goalDoc;
}

export async function updateSavingGoal(id: string, data: Partial<SavingGoal>) {
  if (!data.userId) throw new Error('userId is required');
  const updatedAt = now();
  const userPath = getUserCollectionPath(data.userId, COLLECTIONS.goals);
  const legacyPath = LEGACY_COLLECTIONS.goals;
  await updateDocWithLegacyFallback(userPath, legacyPath, id, { ...data, updatedAt });
  markCollectionChanged('goals', data.userId);
  
  const goals = getCache<SavingGoal[]>('goals', data.userId) || [];
  const updated = goals.map((g) => (g.id === id ? { ...g, ...data, updatedAt } : g));
  setCache('goals', updated, data.userId);
}

export async function deleteSavingGoal(id: string, userId: string) {
  const userPath = getUserCollectionPath(userId, COLLECTIONS.goals);
  await deleteDoc(doc(db, userPath, id));
  markCollectionChanged('goals', userId);
  removeCachedItem('goals', id);
}

export async function getSavingGoals(userId: string, options?: GetOptions): Promise<SavingGoal[]> {
  return getCachedCollection('goals', userId, async () => {
    return getUserScopedDocs<SavingGoal>(
      userId,
      COLLECTIONS.goals,
      [COLLECTIONS.goals, LEGACY_COLLECTIONS.goals],
      sortByCreatedAtDesc
    );
  }, options);
}

// ============================================================================
// FRIENDS
// ============================================================================

type FriendInviteInput = Omit<Friend, 'id' | 'createdAt' | 'status'> & {
  status?: Friend['status'];
  userEmail?: string | null;
  userName?: string | null;
};

async function getExistingFriendByEmail(userId: string, email: string): Promise<Friend | null> {
  const userPath = getUserCollectionPath(userId, COLLECTIONS.friends);
  const q = query(collection(db, userPath), where('friendEmailLower', '==', normalizeEmail(email)));
  const snap = await getDocs(q);
  const first = snap.docs[0];
  return first ? ({ id: first.id, ...first.data() } as Friend) : null;
}

async function getReciprocalFriendDocs(friend: Friend) {
  if (!friend.requesterId || !friend.recipientId) return [];

  const otherUserId = friend.userId === friend.requesterId ? friend.recipientId : friend.requesterId;
  const otherPath = getUserCollectionPath(otherUserId, COLLECTIONS.friends);
  const q = query(
    collection(db, otherPath),
    where('requesterId', '==', friend.requesterId),
    where('recipientId', '==', friend.recipientId)
  );
  const snap = await getDocs(q);
  return snap.docs;
}

export async function addFriend(data: FriendInviteInput) {
  const userEmail = normalizeEmail(data.userEmail);
  const targetProfile = await getUserProfileByEmail(data.friendEmail);

  if (!targetProfile) {
    throw new Error('No account exists with that email yet.');
  }

  if (targetProfile.uid === data.userId) {
    throw new Error("You can't add yourself.");
  }

  const existing = await getExistingFriendByEmail(data.userId, targetProfile.email || data.friendEmail);
  if (existing && existing.status !== 'rejected') {
    throw new Error('This person is already in your friends list.');
  }

  const timestamp = now();
  const requesterName = data.userName || data.requesterName || userEmail.split('@')[0] || null;
  const recipientEmail = targetProfile.email || data.friendEmail;
  const recipientName = targetProfile.displayName || data.friendName || recipientEmail.split('@')[0];
  const requesterEmail = data.userEmail || data.requesterEmail || null;
  const userPath = getUserCollectionPath(data.userId, COLLECTIONS.friends);
  const targetPath = getUserCollectionPath(targetProfile.uid, COLLECTIONS.friends);

  const outgoing: Omit<Friend, 'id'> = {
    userId: data.userId,
    friendId: targetProfile.uid,
    friendEmail: recipientEmail,
    friendEmailLower: normalizeEmail(recipientEmail),
    friendName: recipientName,
    status: 'pending',
    direction: 'outgoing',
    requesterId: data.userId,
    requesterEmail,
    requesterName,
    recipientId: targetProfile.uid,
    recipientEmail,
    recipientName,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  const incoming: Omit<Friend, 'id'> = {
    userId: targetProfile.uid,
    friendId: data.userId,
    friendEmail: requesterEmail || userEmail,
    friendEmailLower: normalizeEmail(requesterEmail || userEmail),
    friendName: requesterName || requesterEmail || userEmail,
    status: 'pending',
    direction: 'incoming',
    requesterId: data.userId,
    requesterEmail,
    requesterName,
    recipientId: targetProfile.uid,
    recipientEmail,
    recipientName,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  const friendDoc = await addDoc(collection(db, userPath), outgoing);
  await addDoc(collection(db, targetPath), incoming);
  markCollectionChanged('friends', data.userId);
  markCollectionChanged('friends', targetProfile.uid);
  
  const friends = getCache<Friend[]>('friends', data.userId) || [];
  const newFriend: Friend = { id: friendDoc.id, ...outgoing };
  setCache('friends', [newFriend, ...friends], data.userId);
  
  return friendDoc;
}

export async function getFriends(userId: string, options?: GetOptions): Promise<Friend[]> {
  return getCachedCollection('friends', userId, async () => {
    return getUserScopedDocs<Friend>(userId, COLLECTIONS.friends, [COLLECTIONS.friends], sortByCreatedAtDesc);
  }, options);
}

export function subscribeFriends(userId: string, callback: (friends: Friend[]) => void, onError?: (error: Error) => void): Unsubscribe {
  const userPath = getUserCollectionPath(userId, COLLECTIONS.friends);
  return onSnapshot(
    collection(db, userPath),
    (snap) => {
      const friends = snap.docs
        .map((d) => ({ id: d.id, ...d.data() } as Friend))
        .sort(sortByCreatedAtDesc);
      setCache('friends', friends, userId);
      callback(friends);
    },
    (error) => {
      onError?.(error);
    }
  );
}

export async function deleteFriend(id: string, userId: string) {
  const userPath = getUserCollectionPath(userId, COLLECTIONS.friends);
  const currentRef = doc(db, userPath, id);
  const currentSnap = await getDoc(currentRef);

  if (currentSnap.exists()) {
    const friend = { id: currentSnap.id, ...currentSnap.data() } as Friend;
    const reciprocalDocs = await getReciprocalFriendDocs(friend);
    await Promise.allSettled(reciprocalDocs.map((d) => deleteDoc(d.ref)));
  }

  await deleteDoc(doc(db, userPath, id));
  markCollectionChanged('friends', userId);
  removeCachedItem('friends', id);
}

export async function acceptFriend(id: string, userId: string) {
  const userPath = getUserCollectionPath(userId, COLLECTIONS.friends);
  const currentRef = doc(db, userPath, id);
  const currentSnap = await getDoc(currentRef);

  if (!currentSnap.exists()) {
    throw new Error('Friend invitation not found.');
  }

  const friend = { id: currentSnap.id, ...currentSnap.data() } as Friend;
  if (friend.direction !== 'incoming') {
    throw new Error('Only incoming invitations can be accepted.');
  }

  const changes = { status: 'accepted' as const, updatedAt: now() };
  await updateDoc(currentRef, changes);

  const reciprocalDocs = await getReciprocalFriendDocs(friend);
  await Promise.allSettled(reciprocalDocs.map((d) => updateDoc(d.ref, changes)));

  markCollectionChanged('friends', userId);
  if (friend.requesterId) markCollectionChanged('friends', friend.requesterId);
  removeCachedItem('friends', id);
}

export async function rejectFriend(id: string, userId: string) {
  await deleteFriend(id, userId);
}

// ============================================================================
// BACKWARDS COMPATIBILITY (Legacy functions)
// ============================================================================

export async function addCard(data: Omit<CreditCard, 'id' | 'createdAt' | 'updatedAt'>) {
  return addCreditCard(data);
}

export async function updateCard(id: string, data: Partial<CreditCard>) {
  return updateCreditCard(id, data);
}

export async function deleteCard(id: string, userId: string) {
  return deleteCreditCard(id, userId);
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

export async function deleteGoal(id: string, userId: string) {
  return deleteSavingGoal(id, userId);
}

export async function getGoals(userId: string, options?: GetOptions): Promise<SavingGoal[]> {
  return getSavingGoals(userId, options);
}

// ============================================================================
// DATA PREFETCHING
// ============================================================================

export function prefetchUserData(userId: string): Promise<unknown[]> {
  if (!navigator.onLine) return Promise.resolve([]);

  // Load only critical data first
  return Promise.allSettled([
    getExpenses(userId),
    getSalaries(userId),
    getCreditCards(userId),
    getCardPayments(userId),
    getCardCharges(userId),
    getSavingGoals(userId),
    getFriends(userId),
  ]);
}
