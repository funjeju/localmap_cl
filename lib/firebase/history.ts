import { db } from './config';
import {
  collection,
  query,
  orderBy,
  getDocs,
  addDoc,
  onSnapshot,
  serverTimestamp,
  Unsubscribe,
} from 'firebase/firestore';
import type { PinHistory, ChangeType, Pin } from '@/lib/types';

export async function recordPinHistory(
  tenantId: string,
  pinId: string,
  changeType: ChangeType,
  changedBy: string,
  changedFields: Partial<Pin>,
  previousSnapshot?: Partial<Pin>,
  reason?: string
) {
  try {
    const historyRef = collection(db, 'tenants', tenantId, 'pins', pinId, 'history');
    await addDoc(historyRef, {
      pinId,
      changeType,
      changedBy,
      changedFields,
      previousSnapshot: previousSnapshot || null,
      reason: reason || null,
      changedAt: serverTimestamp(),
    });
  } catch (err) {
    console.error('Failed to record pin history:', err);
  }
}

export async function getPinHistory(tenantId: string, pinId: string) {
  try {
    const historyRef = collection(db, 'tenants', tenantId, 'pins', pinId, 'history');
    const q = query(historyRef, orderBy('changedAt', 'desc'));
    const snapshot = await getDocs(q);

    return snapshot.docs.map((doc) => ({
      ...doc.data(),
      changedAt: doc.data().changedAt?.toDate?.() || new Date(),
    })) as PinHistory[];
  } catch (err) {
    console.error('Failed to fetch pin history:', err);
    return [];
  }
}

export function subscribeToPinHistory(
  tenantId: string,
  pinId: string,
  callback: (history: PinHistory[]) => void
): Unsubscribe {
  const historyRef = collection(db, 'tenants', tenantId, 'pins', pinId, 'history');
  const q = query(historyRef, orderBy('changedAt', 'desc'));

  return onSnapshot(q, (snapshot) => {
    const history = snapshot.docs.map((doc) => ({
      ...doc.data(),
      changedAt: doc.data().changedAt?.toDate?.() || new Date(),
    })) as PinHistory[];
    callback(history);
  });
}
