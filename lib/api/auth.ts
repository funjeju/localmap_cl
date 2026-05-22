import { NextRequest } from 'next/server';
import { db } from '@/lib/firebase/config';
import { doc, getDoc } from 'firebase/firestore';

export interface AuthContext {
  userId: string;
  email: string;
  role: 'owner' | 'editor' | 'viewer' | 'admin';
}

/**
 * Extract user ID from Authorization header (Bearer token)
 * For now, using a simple implementation. In production, verify JWT
 */
export function extractUserId(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;

  // For now, just return a placeholder
  // In production, decode JWT and verify signature
  return authHeader.substring(7);
}

/**
 * Check if user has required role for tenant
 */
export async function checkUserRole(
  tenantId: string,
  userId: string,
  requiredRole: 'owner' | 'editor' | 'viewer' = 'viewer'
): Promise<boolean> {
  try {
    const tenantRef = doc(db, 'tenants', tenantId);
    const tenantSnap = await getDoc(tenantRef);

    if (!tenantSnap.exists()) {
      return false;
    }

    const tenant = tenantSnap.data();

    // Check if user is owner
    if (tenant.ownerId === userId) {
      return true;
    }

    // Check collaborators
    const collaborators = tenant.collaborators || [];
    const userCollab = collaborators.find((c: any) => c.userId === userId);

    if (!userCollab) {
      return false;
    }

    // Check role hierarchy: owner > editor > viewer
    const roleHierarchy = { owner: 3, editor: 2, viewer: 1 };
    return roleHierarchy[userCollab.role as keyof typeof roleHierarchy] >=
           roleHierarchy[requiredRole];
  } catch (error) {
    console.error('[AUTH] Role check failed:', error);
    return false;
  }
}

/**
 * Verify user owns the pin
 */
export async function checkPinOwnership(
  tenantId: string,
  pinId: string,
  userId: string
): Promise<boolean> {
  try {
    const pinRef = doc(db, 'tenants', tenantId, 'pins', pinId);
    const pinSnap = await getDoc(pinRef);

    if (!pinSnap.exists()) {
      return false;
    }

    const pin = pinSnap.data();
    return pin.createdBy === userId;
  } catch (error) {
    console.error('[AUTH] Pin ownership check failed:', error);
    return false;
  }
}

/**
 * Validate request has proper authorization
 */
export async function requireAuth(
  request: NextRequest,
  tenantId: string,
  requiredRole: 'owner' | 'editor' | 'viewer' = 'viewer'
): Promise<{ authorized: boolean; userId: string | null }> {
  const userId = extractUserId(request);

  if (!userId) {
    console.warn('[AUTH] No user ID found in request');
    return { authorized: false, userId: null };
  }

  const hasRole = await checkUserRole(tenantId, userId, requiredRole);

  if (!hasRole) {
    console.warn(`[AUTH] User ${userId} lacks required role ${requiredRole}`);
    return { authorized: false, userId };
  }

  return { authorized: true, userId };
}
