import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase/config';
import { collection, addDoc, query, where, getDocs } from 'firebase/firestore';

interface CreateShareRequest {
  tenantId: string;
  pinId?: string;
  title: string;
  description?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: CreateShareRequest = await request.json();
    const { tenantId, pinId, title, description } = body;

    if (!tenantId || !title) {
      return NextResponse.json(
        { error: '필수 정보가 부족합니다.' },
        { status: 400 }
      );
    }

    // Check if share already exists for this pin/tenant
    let shareId: string;
    const sharesRef = collection(db, 'shares');

    if (pinId) {
      const q = query(
        sharesRef,
        where('tenantId', '==', tenantId),
        where('pinId', '==', pinId)
      );
      const existing = await getDocs(q);

      if (existing.size > 0) {
        shareId = existing.docs[0].id;
      } else {
        const newShare = await addDoc(sharesRef, {
          tenantId,
          pinId,
          title,
          description,
          createdAt: new Date(),
          viewCount: 0,
        });
        shareId = newShare.id;
      }
    } else {
      const q = query(
        sharesRef,
        where('tenantId', '==', tenantId),
        where('pinId', '==', null)
      );
      const existing = await getDocs(q);

      if (existing.size > 0) {
        shareId = existing.docs[0].id;
      } else {
        const newShare = await addDoc(sharesRef, {
          tenantId,
          pinId: null,
          title,
          description,
          createdAt: new Date(),
          viewCount: 0,
        });
        shareId = newShare.id;
      }
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const shareUrl = `${baseUrl}/share/${shareId}`;

    return NextResponse.json({
      success: true,
      shareId,
      shareUrl,
    });
  } catch (error: any) {
    console.error('[SHARE] Creation error:', error);
    return NextResponse.json(
      { error: error?.message || '공유 링크 생성에 실패했습니다.' },
      { status: 500 }
    );
  }
}
