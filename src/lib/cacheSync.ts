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
      await processSyncItem(item);
      removeSyncQueueItem(userId, item.id);
    } catch (error) {
      console.error(`Failed to sync item ${item.id}:`, error);
      // Keep item in queue for retry
    }
  }
}

async function processSyncItem(item: SyncQueueItem): Promise<void> {
  const { collection, type, data } = item;

  switch (collection) {
    case 'expenses':
      if (type === 'add') {
        await addExpense(data);
      } else if (type === 'update') {
        const { id, ...rest } = data;
        await updateExpense(id, rest);
      } else if (type === 'delete') {
        await deleteExpense(data.id);
      }
      break;

    case 'salaries':
      if (type === 'add') {
        await addSalary(data);
      } else if (type === 'update') {
        const { id, ...rest } = data;
        await updateSalary(id, rest);
      } else if (type === 'delete') {
        await deleteSalary(data.id);
      }
      break;

    case 'credit_cards':
      if (type === 'add') {
        await addCreditCard(data);
      } else if (type === 'update') {
        const { id, ...rest } = data;
        await updateCreditCard(id, rest);
      } else if (type === 'delete') {
        await deleteCreditCard(data.id);
      }
      break;

    case 'card_payments':
    case 'cardPayments':
      if (type === 'add') {
        await addCardPayment(data);
      } else if (type === 'delete') {
        await deleteCardPayment(data.id);
      }
      break;

    case 'card_charges':
    case 'cardCharges':
      if (type === 'add') {
        await addCardCharge(data);
      } else if (type === 'delete') {
        await deleteCardCharge(data.id);
      }
      break;

    case 'saving_goals':
      if (type === 'add') {
        await addSavingGoal(data);
      } else if (type === 'update') {
        const { id, ...rest } = data;
        await updateSavingGoal(id, rest);
      } else if (type === 'delete') {
        await deleteSavingGoal(data.id);
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
