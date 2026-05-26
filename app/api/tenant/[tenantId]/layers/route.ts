import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

type Params = { params: Promise<{ tenantId: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  try {
    const { tenantId } = await params;
    if (!adminDb) return NextResponse.json({ error: 'server/error' }, { status: 500 });

    const snap = await adminDb.collection('tenants').doc(tenantId).collection('layers').orderBy('order').get();
    const layers = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    return NextResponse.json({ layers });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const { tenantId } = await params;
    if (!adminDb) return NextResponse.json({ error: 'server/error' }, { status: 500 });

    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token || !adminAuth) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
    }

    let callerId: string;
    try {
      const decoded = await adminAuth.verifyIdToken(token);
      callerId = decoded.uid;
    } catch {
      return NextResponse.json({ error: '유효하지 않은 토큰입니다.' }, { status: 401 });
    }

    // Check teacher role
    const memberSnap = await adminDb
      .collection('tenants').doc(tenantId)
      .collection('members').doc(callerId).get();
    if (!memberSnap.exists || memberSnap.data()?.role !== 'teacher') {
      return NextResponse.json({ error: '선생님만 레이어를 생성할 수 있습니다.' }, { status: 403 });
    }

    const body = await req.json();
    const { name, icon = '📍', color = '#3b82f6', order } = body;

    if (!name) {
      return NextResponse.json({ error: '레이어 이름은 필수입니다.' }, { status: 400 });
    }

    // Determine order (append after existing layers)
    let layerOrder = order;
    if (typeof layerOrder !== 'number') {
      const existing = await adminDb.collection('tenants').doc(tenantId).collection('layers').get();
      layerOrder = existing.size;
    }

    const newRef = adminDb.collection('tenants').doc(tenantId).collection('layers').doc();
    const layerData = {
      id: newRef.id,
      tenantId,
      name: typeof name === 'string' ? { ko: name, en: name, ja: name } : name,
      icon,
      color,
      order: layerOrder,
      source: 'custom',
      isVisible: true,
      visibleToRoles: ['teacher', 'student'],
      curriculumTags: [],
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    await newRef.set(layerData);
    const snap = await newRef.get();
    return NextResponse.json({ layer: { id: snap.id, ...snap.data() } }, { status: 201 });
  } catch (error: any) {
    console.error('Layer POST error:', error);
    return NextResponse.json({ error: error?.message || '레이어 생성에 실패했습니다.' }, { status: 500 });
  }
}
