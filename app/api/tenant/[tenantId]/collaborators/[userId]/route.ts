import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string; userId: string }> }
) {
  try {
    const { tenantId, userId } = await params;
    if (!adminDb) return NextResponse.json({ error: 'server/error' }, { status: 500 });

    if (!userId) {
      return NextResponse.json({ error: '사용자 ID가 필요합니다.' }, { status: 400 });
    }

    const tenantRef = adminDb.collection('tenants').doc(tenantId);
    const tenantSnap = await tenantRef.get();

    if (!tenantSnap.exists) {
      return NextResponse.json({ error: '학교를 찾을 수 없습니다.' }, { status: 404 });
    }

    const collaborators: any[] = tenantSnap.data()?.collaborators || [];
    const toRemove = collaborators.find((c) => c.userId === userId);

    if (!toRemove) {
      return NextResponse.json({ error: '협업자를 찾을 수 없습니다.' }, { status: 404 });
    }

    await tenantRef.update({ collaborators: FieldValue.arrayRemove(toRemove) });
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error('[COLLAB] DELETE error:', error);
    return NextResponse.json({ error: error?.message || '협업자 제거에 실패했습니다.' }, { status: 500 });
  }
}
