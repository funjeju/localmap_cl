import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase/config';
import { doc, getDoc } from 'firebase/firestore';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  try {
    const { tenantId } = await params;
    const body = await request.json();
    const { email, role } = body;

    if (!email || !role) {
      return NextResponse.json(
        { error: '필수 정보가 부족합니다.' },
        { status: 400 }
      );
    }

    if (!['editor', 'viewer'].includes(role)) {
      return NextResponse.json(
        { error: '유효한 역할이 아닙니다.' },
        { status: 400 }
      );
    }

    // Get tenant info
    const tenantRef = doc(db, 'tenants', tenantId);
    const tenantSnap = await getDoc(tenantRef);

    if (!tenantSnap.exists()) {
      return NextResponse.json(
        { error: '학교를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    const tenant = tenantSnap.data();
    const tenantName = typeof tenant.name === 'object' ? tenant.name.ko : tenant.name;

    // Generate invite link (in production, store in database and send email)
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const inviteToken = Buffer.from(`${tenantId}:${email}:${role}:${Date.now()}`).toString('base64');
    const inviteLink = `${baseUrl}/invite/${inviteToken}`;

    // TODO: Send email with invite link
    console.log('[COLLAB] Invite link:', inviteLink);
    console.log('[COLLAB] Email would be sent to:', email);

    return NextResponse.json({
      success: true,
      message: `${email}에 초대 링크를 보냈습니다.`,
      inviteLink, // For testing
    });
  } catch (error: any) {
    console.error('[COLLAB] Invite error:', error);
    return NextResponse.json(
      { error: error?.message || '초대에 실패했습니다.' },
      { status: 500 }
    );
  }
}
