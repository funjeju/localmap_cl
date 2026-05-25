import { db } from './config';
import {
  doc,
  setDoc,
  getDoc,
  query,
  collection,
  where,
  getDocs,
  deleteDoc,
  increment,
  updateDoc,
} from 'firebase/firestore';
import type { TenantMembership, Role } from '@/lib/types';

export const addUserToTenant = async (
  userId: string,
  tenantId: string,
  role: Role,
  email?: string,
  displayName?: string
) => {
  const now = new Date();
  const membership: TenantMembership = {
    tenantId,
    role,
    joinedAt: now,
    status: 'active',
  };

  // Write to user's membership list
  const userMembershipRef = doc(db, `users/${userId}/tenantMemberships`, tenantId);
  await setDoc(userMembershipRef, membership);

  // Write to tenant's members collection (required for Security Rules)
  const tenantMemberRef = doc(db, `tenants/${tenantId}/members`, userId);
  await setDoc(tenantMemberRef, {
    userId,
    role,
    email: email || null,
    displayName: displayName || null,
    joinedAt: now,
    status: 'active',
  });
};

export const getUserTenantMemberships = async (userId: string) => {
  const membershipRef = collection(db, `users/${userId}/tenantMemberships`);
  const snapshot = await getDocs(membershipRef);
  return snapshot.docs.map((doc) => ({
    tenantId: doc.id,
    ...doc.data(),
  })) as (TenantMembership & { tenantId: string })[];
};

export const getUserMembershipForTenant = async (
  userId: string,
  tenantId: string
) => {
  const membershipRef = doc(
    db,
    `users/${userId}/tenantMemberships`,
    tenantId
  );
  const snapshot = await getDoc(membershipRef);
  return snapshot.data() as TenantMembership | undefined;
};

export const updateUserRole = async (
  userId: string,
  tenantId: string,
  role: Role
) => {
  const membershipRef = doc(
    db,
    `users/${userId}/tenantMemberships`,
    tenantId
  );
  await setDoc(membershipRef, { role }, { merge: true });
};

export const removeUserFromTenant = async (
  userId: string,
  tenantId: string
) => {
  const membershipRef = doc(
    db,
    `users/${userId}/tenantMemberships`,
    tenantId
  );
  await deleteDoc(membershipRef);
};

export const createStudentInviteCode = async (
  tenantId: string,
  code: string,
  expiresAt: Date
) => {
  const codeRef = doc(db, `tenants/${tenantId}/inviteCodes`, code);
  await setDoc(codeRef, {
    code,
    role: 'student',
    createdAt: new Date(),
    expiresAt,
    usedCount: 0,
  });
};

export const validateAndUseInviteCode = async (
  tenantId: string,
  code: string
) => {
  const codeRef = doc(db, `tenants/${tenantId}/inviteCodes`, code);
  const snapshot = await getDoc(codeRef);

  if (!snapshot.exists()) {
    throw new Error('Invalid invite code');
  }

  const data = snapshot.data();

  // Handle Firestore Timestamp or plain Date/string
  const expiresAt = data.expiresAt?.toDate ? data.expiresAt.toDate() : new Date(data.expiresAt);
  if (expiresAt < new Date()) {
    throw new Error('Invite code expired');
  }

  // Atomically increment usage count
  await updateDoc(codeRef, { usedCount: increment(1) });

  return data.role as Role;
};
