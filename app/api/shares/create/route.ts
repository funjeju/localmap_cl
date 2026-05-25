import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

interface CreateShareRequest {
  tenantId: string;
  pinId?: string;
  title: string;
  description?: string;
}

export async function POST(request: NextRequest) {
  try {
    if (!adminDb) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const body: CreateShareRequest = await request.json();
    const { tenantId, pinId, title, description } = body;

    if (!tenantId || !title) {
      return NextResponse.json({ error: '필수 정보가 부족합니다.' }, { status: 400 });
    }

    const sharesRef = adminDb.collection('shares');

    // Check for existing share to deduplicate
    let snapshot;
    if (pinId) {
      snapshot = await sharesRef
        .where('tenantId', '==', tenantId)
        .where('pinId', '==', pinId)
        .limit(1)
        .get();
    } else {
      snapshot = await sharesRef
        .where('tenantId', '==', tenantId)
        .where('pinId', '==', null)
        .limit(1)
        .get();
    }

    let shareId: string;
    if (!snapshot.empty) {
      shareId = snapshot.docs[0].id;
    } else {
      const newShare = await sharesRef.add({
        tenantId,
        pinId: pinId || null,
        title,
        description: description || null,
        createdAt: FieldValue.serverTimestamp(),
        viewCount: 0,
      });
      shareId = newShare.id;
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    return NextResponse.json({ success: true, shareId, shareUrl: `${baseUrl}/share/${shareId}` });
  } catch (error: any) {
    console.error('[SHARE] Creation error:', error);
    return NextResponse.json({ error: error?.message || '공유 링크 생성에 실패했습니다.' }, { status: 500 });
  }
}
