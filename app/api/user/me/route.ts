import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'auth/required', message: '인증이 필요합니다.' }, { status: 401 });
    }

    const idToken = authHeader.slice(7);
    const decoded = await adminAuth.verifyIdToken(idToken);
    const uid = decoded.uid;

    // Load memberships
    const membershipsSnap = await adminDb
      .collectionGroup('members')
      .where('userId', '==', uid)
      .where('status', '==', 'active')
      .get();

    const memberships = membershipsSnap.docs.map((doc) => ({
      tenantId: doc.ref.parent.parent?.id,
      role: doc.data().role,
      joinedAt: doc.data().joinedAt,
    }));

    return NextResponse.json({
      uid,
      email: decoded.email,
      displayName: decoded.name,
      memberships,
    });
  } catch (error: any) {
    if (error?.code === 'auth/id-token-expired' || error?.code === 'auth/argument-error') {
      return NextResponse.json({ error: 'auth/invalid-token', message: '토큰이 유효하지 않습니다.' }, { status: 401 });
    }
    console.error('User/me error:', error);
    return NextResponse.json({ error: 'server/error', message: '사용자 정보를 불러올 수 없습니다.' }, { status: 500 });
  }
}
