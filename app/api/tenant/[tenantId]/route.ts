import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { createErrorResponse, AppError } from '@/lib/errors';
import { FieldValue } from 'firebase-admin/firestore';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  try {
    const { tenantId } = await params;

    if (!tenantId) {
      throw new AppError('validation/invalid-input', 'tenantId is required', '학교 ID가 필요합니다.', 400);
    }

    const tenantRef = adminDb.collection('tenants').doc(tenantId);
    const tenantSnap = await tenantRef.get();

    if (!tenantSnap.exists) {
      throw new AppError('tenant/not-found', 'Tenant not found', '학교를 찾을 수 없습니다.', 404);
    }

    return NextResponse.json({ tenant: tenantSnap.data() });
  } catch (error: any) {
    console.error('Fetch Tenant Error:', error);
    const errorResponse = createErrorResponse(
      error instanceof AppError
        ? error
        : new AppError('server/error', error?.message || 'Unknown error', '학교 정보를 불러올 수 없습니다.', 500)
    );
    return NextResponse.json(
      { error: errorResponse.error, message: errorResponse.message },
      { status: errorResponse.statusCode }
    );
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  try {
    const { tenantId } = await params;

    if (!tenantId) {
      throw new AppError('validation/invalid-input', 'tenantId is required', '학교 ID가 필요합니다.', 400);
    }

    const body = await req.json();
    const { name, radius, branding } = body;

    const updateData: Record<string, any> = {
      updatedAt: FieldValue.serverTimestamp(),
    };

    if (name !== undefined) {
      if (typeof name === 'string') {
        updateData['name.ko'] = name;
      } else if (typeof name === 'object') {
        if (name.ko !== undefined) updateData['name.ko'] = name.ko;
        if (name.ja !== undefined) updateData['name.ja'] = name.ja;
        if (name.en !== undefined) updateData['name.en'] = name.en;
      }
    }

    if (typeof radius === 'number' && radius > 0) {
      updateData.radius = radius;
    }

    if (branding?.primaryColor) {
      updateData['branding.primaryColor'] = branding.primaryColor;
    }

    if (Object.keys(updateData).length === 1) {
      throw new AppError('validation/invalid-input', 'No valid fields to update', '수정할 항목이 없습니다.', 400);
    }

    const tenantRef = adminDb.collection('tenants').doc(tenantId);
    const tenantSnap = await tenantRef.get();

    if (!tenantSnap.exists) {
      throw new AppError('tenant/not-found', 'Tenant not found', '학교를 찾을 수 없습니다.', 404);
    }

    await tenantRef.update(updateData);

    const updated = await tenantRef.get();
    return NextResponse.json({ tenant: updated.data() });
  } catch (error: any) {
    console.error('Update Tenant Error:', error);
    const errorResponse = createErrorResponse(
      error instanceof AppError
        ? error
        : new AppError('server/error', error?.message || 'Unknown error', '학교 정보 수정에 실패했습니다.', 500)
    );
    return NextResponse.json(
      { error: errorResponse.error, message: errorResponse.message },
      { status: errorResponse.statusCode }
    );
  }
}
