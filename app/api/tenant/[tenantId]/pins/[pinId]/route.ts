import { NextRequest, NextResponse } from 'next/server';
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

    if (!adminDb) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    // Verify caller via Firebase ID token
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    let callerId: string | null = null;
    if (token && adminAuth) {
      try {
        const decoded = await adminAuth.verifyIdToken(token);
        callerId = decoded.uid;
      } catch { /* invalid token */ }
    }

    if (!callerId) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
    }

    const pinRef = adminDb.collection('tenants').doc(tenantId).collection('pins').doc(pinId);
    const pinSnap = await pinRef.get();

    if (!pinSnap.exists) {
      return NextResponse.json({ error: '핀을 찾을 수 없습니다.' }, { status: 404 });
    }

    const pin = pinSnap.data()!;

    // Check membership role
    const memberSnap = await adminDb
      .collection('tenants').doc(tenantId)
      .collection('members').doc(callerId).get();
    const memberRole = memberSnap.exists ? memberSnap.data()?.role : null;
    const isTeacher = memberRole === 'teacher';

    if (!isTeacher && pin.createdBy !== callerId) {
      return NextResponse.json({ error: '자신이 만든 핀만 삭제할 수 있습니다.' }, { status: 403 });
    }

    await pinRef.update({
      status: 'archived',
      updatedAt: FieldValue.serverTimestamp(),
      deletedBy: callerId,
      deletedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error('[PIN DELETE] Error:', error);
    return NextResponse.json({ error: error?.message || '핀 삭제에 실패했습니다.' }, { status: 500 });
  }
}
