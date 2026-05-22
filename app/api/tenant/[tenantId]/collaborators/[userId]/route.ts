import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase/config';
import { doc, getDoc, updateDoc, arrayRemove } from 'firebase/firestore';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string; userId: string }> }
) {
  try {
    const { tenantId, userId } = await params;

    if (!userId) {
      return NextResponse.json(
        { error: '사용자 ID가 필요합니다.' },
        { status: 400 }
      );
    }

    const tenantRef = doc(db, 'tenants', tenantId);
    const tenantSnap = await getDoc(tenantRef);

    if (!tenantSnap.exists()) {
      return NextResponse.json(
        { error: '학교를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    const tenant = tenantSnap.data();
    const collaborators = tenant.collaborators || [];

    // Find the collaborator to remove
    const collaboratorToRemove = collaborators.find(
      (c: any) => c.userId === userId
    );

    if (!collaboratorToRemove) {
      return NextResponse.json(
        { error: '협업자를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // Remove collaborator
    await updateDoc(tenantRef, {
      collaborators: arrayRemove(collaboratorToRemove),
    });

    return NextResponse.json({
      success: true,
      message: '협업자가 제거되었습니다.',
    });
  } catch (error: any) {
    console.error('[COLLAB] DELETE error:', error);
    return NextResponse.json(
      { error: error?.message || '협업자 제거에 실패했습니다.' },
      { status: 500 }
    );
  }
}
