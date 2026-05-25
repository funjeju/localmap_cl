import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

type Params = { params: Promise<{ tenantId: string; layerId: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const { tenantId, layerId } = await params;
    const body = await req.json();
    const { name, color, icon, order } = body;

    const update: Record<string, any> = { updatedAt: FieldValue.serverTimestamp() };
    if (name !== undefined) {
      if (typeof name === 'string') {
        update['name.ko'] = name;
      } else {
        if (name.ko !== undefined) update['name.ko'] = name.ko;
        if (name.ja !== undefined) update['name.ja'] = name.ja;
        if (name.en !== undefined) update['name.en'] = name.en;
      }
    }
    if (color !== undefined) update.color = color;
    if (icon !== undefined) update.icon = icon;
    if (typeof order === 'number') update.order = order;

    const layerRef = adminDb.collection('tenants').doc(tenantId).collection('layers').doc(layerId);
    await layerRef.update(update);

    const snap = await layerRef.get();
    return NextResponse.json({ layer: { id: snap.id, ...snap.data() } });
  } catch (error: any) {
    console.error('Layer PATCH error:', error);
    return NextResponse.json({ error: 'server/error', message: '레이어 수정에 실패했습니다.' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const { tenantId, layerId } = await params;

    // 해당 레이어에 핀이 있는지 확인
    const pinsSnap = await adminDb
      .collection('tenants').doc(tenantId).collection('pins')
      .where('layerId', '==', layerId)
      .where('status', '!=', 'archived')
      .limit(1)
      .get();

    if (!pinsSnap.empty) {
      return NextResponse.json(
        { error: 'layer/has-pins', message: '이 레이어에 핀이 있습니다. 먼저 핀을 다른 레이어로 이동하거나 삭제해주세요.' },
        { status: 400 }
      );
    }

    await adminDb.collection('tenants').doc(tenantId).collection('layers').doc(layerId).delete();
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error('Layer DELETE error:', error);
    return NextResponse.json({ error: 'server/error', message: '레이어 삭제에 실패했습니다.' }, { status: 500 });
  }
}
