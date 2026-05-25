import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase/config';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { requireAuth, checkPinOwnership } from '@/lib/api/auth';
import { adminDb, adminAuth } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string; pinId: string }> }
) {
  try {
    const { tenantId, pinId } = await params;
    const body = await request.json();
    const { action, rejectionReason } = body;

    if (!action || !['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'action must be approve or reject' }, { status: 400 });
    }

    if (action === 'reject' && !rejectionReason?.trim()) {
      return NextResponse.json({ error: '거부 사유를 입력해주세요.' }, { status: 400 });
    }

    // Verify caller via Firebase ID token
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    let callerId = 'unknown';
    if (token && adminAuth) {
      try {
        const decoded = await adminAuth.verifyIdToken(token);
        callerId = decoded.uid;
      } catch { /* fall through — caller id stays 'unknown' */ }
    }

    if (!adminDb) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const pinRef = adminDb.collection('tenants').doc(tenantId).collection('pins').doc(pinId);
    const pinSnap = await pinRef.get();

    if (!pinSnap.exists) {
      return NextResponse.json({ error: '핀을 찾을 수 없습니다.' }, { status: 404 });
    }

    if (pinSnap.data()?.status !== 'pending_review') {
      return NextResponse.json({ error: '검토 대기 상태의 핀만 처리할 수 있습니다.' }, { status: 400 });
    }

    const update: Record<string, any> = {
      status: action === 'approve' ? 'active' : 'rejected',
      verifiedBy: callerId,
      verifiedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };
    if (action === 'reject') update.rejectionReason = rejectionReason.trim();

    await pinRef.update(update);

    // Record history
    const historyRef = adminDb
      .collection('tenants').doc(tenantId)
      .collection('pins').doc(pinId)
      .collection('history');
    await historyRef.add({
      changeType: action === 'approve' ? 'approved' : 'rejected',
      changedBy: callerId,
      changedAt: FieldValue.serverTimestamp(),
      changedFields: action === 'reject' ? { rejectionReason } : {},
    });

    return NextResponse.json({ ok: true, status: update.status });
  } catch (error: any) {
    console.error('[PIN PATCH] Error:', error);
    return NextResponse.json({ error: error?.message || '처리에 실패했습니다.' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string; pinId: string }> }
) {
  try {
    const { tenantId, pinId } = await params;

    // Check authorization - require editor role
    const authCheck = await requireAuth(request, tenantId, 'editor');
    if (!authCheck.authorized || !authCheck.userId) {
      return NextResponse.json(
        { error: '권한이 없습니다.' },
        { status: 403 }
      );
    }

    // Verify pin exists
    const pinRef = doc(db, 'tenants', tenantId, 'pins', pinId);
    const pinSnap = await getDoc(pinRef);

    if (!pinSnap.exists()) {
      return NextResponse.json(
        { error: '핀을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    const pin = pinSnap.data();

    // Check if user is the creator or has admin role
    if (pin.createdBy !== authCheck.userId) {
      // Allow deletion if user is owner of tenant
      const tenantRef = doc(db, 'tenants', tenantId);
      const tenantSnap = await getDoc(tenantRef);

      if (!tenantSnap.exists()) {
        return NextResponse.json(
          { error: '학교를 찾을 수 없습니다.' },
          { status: 404 }
        );
      }

      const tenant = tenantSnap.data();
      if (tenant.ownerId !== authCheck.userId) {
        return NextResponse.json(
          { error: '자신이 만든 핀만 삭제할 수 있습니다.' },
          { status: 403 }
        );
      }
    }

    // Soft delete - mark as deleted instead of removing
    await updateDoc(pinRef, {
      status: 'deleted',
      updatedAt: new Date(),
      deletedBy: authCheck.userId,
      deletedAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      message: '핀이 삭제되었습니다.',
    });
  } catch (error: any) {
    console.error('[PIN DELETE] Error:', error);
    return NextResponse.json(
      { error: error?.message || '핀 삭제에 실패했습니다.' },
      { status: 500 }
    );
  }
}
