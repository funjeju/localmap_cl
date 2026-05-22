import { db } from './config';
import { collection, doc, setDoc, updateDoc, deleteDoc, onSnapshot, query, where, orderBy, limit, serverTimestamp, GeoPoint } from 'firebase/firestore';
import { Pin } from './models';
import { calculateGeoHash } from '../geo/hash';

export async function addPin(tenantId: string, pinData: Partial<Pin>) {
  const pinRef = doc(collection(db, 'tenants', tenantId, 'pins'));
  
  const newPin: Partial<Pin> = {
    ...pinData,
    id: pinRef.id,
    tenantId,
    status: 'active',
    version: 1,
    createdAt: serverTimestamp() as any,
    updatedAt: serverTimestamp() as any,
  };

  await setDoc(pinRef, newPin);
  return pinRef.id;
}

export async function updatePin(tenantId: string, pinId: string, data: Partial<Pin>) {
  const pinRef = doc(db, 'tenants', tenantId, 'pins', pinId);
  await updateDoc(pinRef, {
    ...data,
    updatedAt: serverTimestamp()
  });
}

export async function deletePin(tenantId: string, pinId: string) {
  const pinRef = doc(db, 'tenants', tenantId, 'pins', pinId);
  await updateDoc(pinRef, {
    status: 'deleted',
    updatedAt: serverTimestamp()
  });
}

export function subscribeToPins(
  tenantId: string, 
  callback: (pins: Pin[]) => void
) {
  const q = query(
    collection(db, 'tenants', tenantId, 'pins'),
    where('status', '==', 'active'),
    orderBy('createdAt', 'desc'),
    limit(500)
  );

  return onSnapshot(q, (snapshot) => {
    const pins = snapshot.docs.map(doc => doc.data() as Pin);
    callback(pins);
  }, (error) => {
    console.error("Error fetching pins:", error);
  });
}
