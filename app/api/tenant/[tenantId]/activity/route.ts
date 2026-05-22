import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase/config';
import { collection, query, where, orderBy, limit, getDocs, addDoc } from 'firebase/firestore';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  try {
    const { tenantId } = await params;
    const searchParams = request.nextUrl.searchParams;
    const limitNum = parseInt(searchParams.get('limit') || '20');

    const activityRef = collection(db, 'tenants', tenantId, 'activity');
    const q = query(
      activityRef,
      orderBy('timestamp', 'desc'),
      limit(limitNum)
    );

    const snapshot = await getDocs(q);
    const activities = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      timestamp: doc.data().timestamp?.toDate?.() || doc.data().timestamp,
    }));

    return NextResponse.json({ activities });
  } catch (error: any) {
    console.error('[ACTIVITY] GET error:', error);
    return NextResponse.json(
      { error: error?.message || '활동 기록 조회에 실패했습니다.' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  try {
    const { tenantId } = await params;
    const body = await request.json();
    const { userId, userEmail, action, targetType, targetName, details } = body;

    if (!userId || !action || !targetType) {
      return NextResponse.json(
        { error: '필수 정보가 부족합니다.' },
        { status: 400 }
      );
    }

    const activityRef = collection(db, 'tenants', tenantId, 'activity');
    const docRef = await addDoc(activityRef, {
      userId,
      userEmail,
      action, // 'create', 'update', 'delete', 'edit'
      targetType, // 'pin', 'layer', 'collaborator'
      targetName,
      details,
      timestamp: new Date(),
    });

    return NextResponse.json({
      success: true,
      activityId: docRef.id,
    });
  } catch (error: any) {
    console.error('[ACTIVITY] POST error:', error);
    return NextResponse.json(
      { error: error?.message || '활동 기록 저장에 실패했습니다.' },
      { status: 500 }
    );
  }
}
