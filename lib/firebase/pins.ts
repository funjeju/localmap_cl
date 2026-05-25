import { db } from './config';
import { collection, doc, setDoc, updateDoc, onSnapshot, query, where, orderBy, limit, serverTimestamp } from 'firebase/firestore';
import { Pin } from './models';
import { calculateGeoHash } from '../geo/hash';
import { recordPinHistory } from './history';
import type { Pin as PinType } from '@/lib/types';

export async function addPin(tenantId: string, pinData: Partial<Pin>) {
  const pinRef = doc(collection(db, 'tenants', tenantId, 'pins'));

  const newPin: Partial<Pin> = {
    ...pinData,
    id: pinRef.id,
    tenantId,
    status: pinData.status || 'active',
    version: 1,
    createdAt: serverTimestamp() as any,
    updatedAt: serverTimestamp() as any,
  };

  await setDoc(pinRef, newPin);

  // Record creation history
  await recordPinHistory(
    tenantId,
    pinRef.id,
    'created',
    (pinData as any).createdBy || 'unknown',
    { name: pinData.name as any, layerId: pinData.layerId, location: pinData.location as any }
  );

  return pinRef.id;
}

export async function updatePin(tenantId: string, pinId: string, data: Partial<Pin>, changedBy?: string) {
  const pinRef = doc(db, 'tenants', tenantId, 'pins', pinId);
  await updateDoc(pinRef, {
    ...data,
    updatedAt: serverTimestamp(),
  });

  // Record change history
  const changeType = data.location ? 'moved' : 'edited';
  await recordPinHistory(
    tenantId,
    pinId,
    changeType,
    changedBy || (data as any).createdBy || 'unknown',
    data as any
  );
}

export async function deletePin(tenantId: string, pinId: string, deletedBy?: string) {
  const pinRef = doc(db, 'tenants', tenantId, 'pins', pinId);
  await updateDoc(pinRef, {
    status: 'archived',
    updatedAt: serverTimestamp(),
  });

  await recordPinHistory(
    tenantId,
    pinId,
    'archived',
    deletedBy || 'unknown',
    { status: 'archived' } as any
  );
}

export function subscribeToPins(
  tenantId: string,
  callback: (pins: Pin[]) => void,
  limitNum: number = 200
) {
  const q = query(
    collection(db, 'tenants', tenantId, 'pins'),
    where('status', '==', 'active'),
    orderBy('createdAt', 'desc'),
    limit(limitNum)
  );

  return onSnapshot(q, (snapshot) => {
    const pins = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Pin));
    callback(pins);
  }, (error) => {
    console.error('Error fetching pins:', error);
  });
}
