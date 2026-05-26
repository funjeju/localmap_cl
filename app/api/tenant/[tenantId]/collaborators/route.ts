import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

interface Collaborator {
  userId: string;
  email: string;
  role: 'owner' | 'editor' | 'viewer';
  joinedAt: string;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  try {
    const { tenantId } = await params;
    if (!adminDb) return NextResponse.json({ error: 'server/error' }, { status: 500 });

    const tenantSnap = await adminDb.collection('tenants').doc(tenantId).get();
    if (!tenantSnap.exists) {
      return NextResponse.json({ error: '학교를 찾을 수 없습니다.' }, { status: 404 });
    }

    const collaborators: Collaborator[] = tenantSnap.data()?.collaborators || [];
    return NextResponse.json({ collaborators });
  } catch (error: any) {
    console.error('[COLLAB] GET error:', error);
    return NextResponse.json({ error: error?.message || '협업자 목록 조회에 실패했습니다.' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  try {
    const { tenantId } = await params;
    if (!adminDb) return NextResponse.json({ error: 'server/error' }, { status: 500 });

    const { userId, email, role } = await request.json();
    if (!userId || !email || !role) {
      return NextResponse.json({ error: '필수 정보가 부족합니다.' }, { status: 400 });
    }

    const newCollaborator: Collaborator = { userId, email, role, joinedAt: new Date().toISOString() };

    await adminDb.collection('tenants').doc(tenantId).update({
      collaborators: FieldValue.arrayUnion(newCollaborator),
    });

    return NextResponse.json({ ok: true, collaborator: newCollaborator });
  } catch (error: any) {
    console.error('[COLLAB] POST error:', error);
    return NextResponse.json({ error: error?.message || '협업자 추가에 실패했습니다.' }, { status: 500 });
  }
}
