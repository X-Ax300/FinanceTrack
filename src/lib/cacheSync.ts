import { getSyncQueue, removeSyncQueueItem } from './cache';
import {
  addExpense,
  updateExpense,
  deleteExpense,
  addSalary,
  updateSalary,
  deleteSalary,
  addCreditCard,
  updateCreditCard,
  deleteCreditCard,
  addCardPayment,
  deleteCardPayment,
  addCardCharge,
  deleteCardCharge,
  addSavingGoal,
  updateSavingGoal,
  deleteSavingGoal,
} from './firestore';

interface SyncQueueItem {
  id: string;
  type: 'add' | 'update' | 'delete';
  collection: string;
  data: Record<string, unknown>;
  timestamp: number;
}

// Process sync queue
export async function processSyncQueue(userId: string): Promise<void> {
  const queue = getSyncQueue(userId);
  
  if (queue.length === 0) return;

  console.log(`Processing ${queue.length} sync items for user ${userId}`);

  for (const item of queue) {
    try {
      await processSyncItem(item, userId);
      removeSyncQueueItem(userId, item.id);
    } catch (error) {
      console.error(`Failed to sync item ${item.id}:`, error);
      // Keep item in queue for retry
    }
  }
}

async function processSyncItem(item: SyncQueueItem, userId: string): Promise<void> {
  const { collection, type, data } = item;
  const payload = data as any;
  const itemId = String(payload.id || '');
  const ownerId = String(payload.userId || userId);

  switch (collection) {
    case 'expenses':
      if (type === 'add') {
        await addExpense(payload);
      } else if (type === 'update') {
        const { id, ...rest } = payload;
        await updateExpense(String(id), rest);
      } else if (type === 'delete') {
        await deleteExpense(itemId, ownerId);
      }
      break;

    case 'salaries':
      if (type === 'add') {
        await addSalary(payload);
      } else if (type === 'update') {
        const { id, ...rest } = payload;
        await updateSalary(String(id), rest);
      } else if (type === 'delete') {
        await deleteSalary(itemId, ownerId);
      }
      break;

    case 'credit_cards':
      if (type === 'add') {
        await addCreditCard(payload);
      } else if (type === 'update') {
        const { id, ...rest } = payload;
        await updateCreditCard(String(id), rest);
      } else if (type === 'delete') {
        await deleteCreditCard(itemId, ownerId);
      }
      break;

    case 'card_payments':
    case 'cardPayments':
      if (type === 'add') {
        await addCardPayment(payload);
      } else if (type === 'delete') {
        await deleteCardPayment(itemId, ownerId);
      }
      break;

    case 'card_charges':
    case 'cardCharges':
      if (type === 'add') {
        await addCardCharge(payload);
      } else if (type === 'delete') {
        await deleteCardCharge(itemId, ownerId);
      }
      break;

    case 'saving_goals':
      if (type === 'add') {
        await addSavingGoal(payload);
      } else if (type === 'update') {
        const { id, ...rest } = payload;
        await updateSavingGoal(String(id), rest);
      } else if (type === 'delete') {
        await deleteSavingGoal(itemId, ownerId);
      }
      break;

    default:
      console.warn(`Unknown collection: ${collection}`);
  }
}

// Listen to online/offline events and sync
export function setupSyncListener(userId: string): () => void {
  const handleOnline = () => {
    console.log('Coming online, syncing data...');
    processSyncQueue(userId).catch((error) => {
      console.error('Sync failed:', error);
    });
  };

  window.addEventListener('online', handleOnline);

  return () => {
    window.removeEventListener('online', handleOnline);
  };
}
