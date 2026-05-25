import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { createErrorResponse, AppError } from '@/lib/errors';
import { FieldValue } from 'firebase-admin/firestore';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  try {
    const { tenantId } = await params;

    if (!tenantId) {
      throw new AppError('validation/invalid-input', 'tenantId is required', '학교 ID가 필요합니다.', 400);
    }

    // Read directly from tenants/{tenantId}/members subcollection (O(n_members) not O(all_users))
    const membersSnap = await adminDb
      .collection('tenants').doc(tenantId)
      .collection('members')
      .where('status', '==', 'active')
      .get();

    const members = membersSnap.docs.map((d) => {
      const data = d.data();
      return {
        userId: d.id,
        email: data.email || null,
        displayName: data.displayName || null,
        role: data.role,
        status: data.status,
        joinedAt: data.joinedAt?.toDate?.() || null,
      };
    });

    return NextResponse.json({ members });
  } catch (error: any) {
    console.error('Fetch Members Error:', error);
    return NextResponse.json(
      createErrorResponse(error instanceof AppError ? error : new AppError('server/error', error?.message || 'Unknown', '멤버 목록을 불러올 수 없습니다.', 500)),
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  try {
    const { tenantId } = await params;
    const { userId } = await req.json();

    if (!tenantId || !userId) {
      throw new AppError('validation/invalid-input', 'tenantId and userId required', '필수 정보가 누락되었습니다.', 400);
    }

    const batch = adminDb.batch();

    // Remove from tenant members
    batch.update(
      adminDb.collection('tenants').doc(tenantId).collection('members').doc(userId),
      { status: 'removed', updatedAt: FieldValue.serverTimestamp() }
    );

    // Remove from user's membership list
    batch.delete(
      adminDb.collection('users').doc(userId).collection('tenantMemberships').doc(tenantId)
    );

    await batch.commit();
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error('Remove Member Error:', error);
    return NextResponse.json(
      createErrorResponse(error instanceof AppError ? error : new AppError('server/error', error?.message || 'Unknown', '멤버 제거에 실패했습니다.', 500)),
      { status: 500 }
    );
  }
}
