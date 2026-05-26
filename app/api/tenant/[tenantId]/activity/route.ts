import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  try {
    const { tenantId } = await params;
    if (!adminDb) return NextResponse.json({ error: 'server/error' }, { status: 500 });

    const limitNum = parseInt(request.nextUrl.searchParams.get('limit') || '20');

    const snapshot = await adminDb
      .collection('tenants').doc(tenantId).collection('activity')
      .orderBy('timestamp', 'desc')
      .limit(limitNum)
      .get();

    const activities = snapshot.docs.map((d) => ({
      id: d.id,
      ...d.data(),
      timestamp: d.data().timestamp?.toDate?.() || d.data().timestamp,
    }));

    return NextResponse.json({ activities });
  } catch (error: any) {
    console.error('[ACTIVITY] GET error:', error);
    return NextResponse.json({ error: error?.message || '활동 기록 조회에 실패했습니다.' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  try {
    const { tenantId } = await params;
    if (!adminDb) return NextResponse.json({ error: 'server/error' }, { status: 500 });

    const body = await request.json();
    const { userId, userEmail, action, targetType, targetName, details } = body;

    if (!userId || !action || !targetType) {
      return NextResponse.json({ error: '필수 정보가 부족합니다.' }, { status: 400 });
    }

    const docRef = await adminDb
      .collection('tenants').doc(tenantId).collection('activity')
      .add({
        userId,
        userEmail,
        action,
        targetType,
        targetName,
        details,
        timestamp: FieldValue.serverTimestamp(),
      });

    return NextResponse.json({ ok: true, activityId: docRef.id });
  } catch (error: any) {
    console.error('[ACTIVITY] POST error:', error);
    return NextResponse.json({ error: error?.message || '활동 기록 저장에 실패했습니다.' }, { status: 500 });
  }
}
