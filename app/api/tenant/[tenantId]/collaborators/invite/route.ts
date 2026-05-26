import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  try {
    const { tenantId } = await params;
    if (!adminDb) return NextResponse.json({ error: 'server/error' }, { status: 500 });

    const { email, role } = await request.json();
    if (!email || !role) {
      return NextResponse.json({ error: '필수 정보가 부족합니다.' }, { status: 400 });
    }
    if (!['editor', 'viewer'].includes(role)) {
      return NextResponse.json({ error: '유효한 역할이 아닙니다.' }, { status: 400 });
    }

    const tenantSnap = await adminDb.collection('tenants').doc(tenantId).get();
    if (!tenantSnap.exists) {
      return NextResponse.json({ error: '학교를 찾을 수 없습니다.' }, { status: 404 });
    }

    const tenantData = tenantSnap.data()!;
    const tenantName = typeof tenantData.name === 'object' ? tenantData.name.ko : tenantData.name;

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const inviteToken = Buffer.from(`${tenantId}:${email}:${role}:${Date.now()}`).toString('base64');
    const inviteLink = `${baseUrl}/invite/${inviteToken}`;

    console.log('[COLLAB] Invite link for', email, ':', inviteLink);
    return NextResponse.json({ ok: true, message: `${email}에 초대 링크를 생성했습니다.`, inviteLink });
  } catch (error: any) {
    console.error('[COLLAB] Invite error:', error);
    return NextResponse.json({ error: error?.message || '초대에 실패했습니다.' }, { status: 500 });
  }
}
