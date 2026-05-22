import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase/config';
import { doc, getDoc, arrayUnion, updateDoc, arrayRemove } from 'firebase/firestore';
import { getAuth } from 'firebase-admin/auth';

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

    const tenantRef = doc(db, 'tenants', tenantId);
    const tenantSnap = await getDoc(tenantRef);

    if (!tenantSnap.exists()) {
      return NextResponse.json(
        { error: '학교를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    const tenant = tenantSnap.data();
    const collaborators: Collaborator[] = tenant.collaborators || [];

    return NextResponse.json({ collaborators });
  } catch (error: any) {
    console.error('[COLLAB] GET error:', error);
    return NextResponse.json(
      { error: error?.message || '협업자 목록 조회에 실패했습니다.' },
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
    const { userId, email, role } = body;

    if (!userId || !email || !role) {
      return NextResponse.json(
        { error: '필수 정보가 부족합니다.' },
        { status: 400 }
      );
    }

    const tenantRef = doc(db, 'tenants', tenantId);

    const newCollaborator: Collaborator = {
      userId,
      email,
      role,
      joinedAt: new Date().toISOString(),
    };

    await updateDoc(tenantRef, {
      collaborators: arrayUnion(newCollaborator),
    });

    return NextResponse.json({
      success: true,
      collaborator: newCollaborator,
    });
  } catch (error: any) {
    console.error('[COLLAB] POST error:', error);
    return NextResponse.json(
      { error: error?.message || '협업자 추가에 실패했습니다.' },
      { status: 500 }
    );
  }
}
