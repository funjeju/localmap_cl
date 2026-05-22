import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase/config';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { requireAuth, checkPinOwnership } from '@/lib/api/auth';

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
