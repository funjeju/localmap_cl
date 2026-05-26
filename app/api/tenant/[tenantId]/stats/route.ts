import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  try {
    const { tenantId } = await params;

    if (!tenantId) {
      return NextResponse.json({ error: 'tenantId is required' }, { status: 400 });
    }

    if (!adminDb) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    // 0. tenant 이름
    const tenantSnap = await adminDb.collection('tenants').doc(tenantId).get();
    const tenantData = tenantSnap.exists ? tenantSnap.data() : null;
    const tenantName = tenantData
      ? typeof tenantData.name === 'object'
        ? tenantData.name.ko || tenantData.name.en || tenantId
        : tenantData.name || tenantId
      : tenantId;

    // 1. 핀 통계
    const pinsSnap = await adminDb.collection('tenants').doc(tenantId).collection('pins').get();
    const pins = pinsSnap.docs.map((d) => d.data());

    const pinStats = {
      totalPins: pins.length,
      activeCount: pins.filter((p) => p.status === 'active').length,
      pendingCount: pins.filter((p) => p.status === 'pending_review').length,
      archivedCount: pins.filter((p) => p.status === 'archived').length,
    };

    // 2. 레이어별 통계
    const layersSnap = await adminDb.collection('tenants').doc(tenantId).collection('layers').get();
    const categoryStats = layersSnap.docs.map((d) => {
      const layer = d.data();
      const pinCount = pins.filter((p) => p.layerId === d.id).length;
      return {
        categoryId: d.id,
        categoryName: layer.name?.ko || layer.name?.en || '알 수 없음',
        pinCount,
        percentage: pinStats.totalPins > 0 ? (pinCount / pinStats.totalPins) * 100 : 0,
      };
    });

    // 3. 멤버 통계
    const membersSnap = await adminDb
      .collection('tenants').doc(tenantId)
      .collection('members')
      .where('status', '==', 'active')
      .get();
    const members = membersSnap.docs.map((d) => d.data());
    const memberStats = {
      totalMembers: members.length,
      teachers: members.filter((m) => m.role === 'teacher').length,
      students: members.filter((m) => m.role === 'student').length,
      parents: members.filter((m) => m.role === 'parent').length,
      others: members.filter((m) => !['teacher', 'student', 'parent'].includes(m.role)).length,
    };

    // 4. 데이터 출처 통계
    const sourceMap = new Map<string, number>();
    pins.forEach((pin) => {
      const src = pin.descriptionSource || pin.source?.type || 'unknown';
      sourceMap.set(src, (sourceMap.get(src) || 0) + 1);
    });
    const sourceStats = Array.from(sourceMap.entries()).map(([source, count]) => ({
      source,
      count,
      percentage: pinStats.totalPins > 0 ? (count / pinStats.totalPins) * 100 : 0,
    }));

    // 5. 최근 핀 (5개)
    const recentPins = [...pins]
      .sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0))
      .slice(0, 5)
      .map((p) => ({
        id: p.id,
        name: p.name?.ko || p.name?.en || '이름 없음',
        category: categoryStats.find((c) => c.categoryId === p.layerId)?.categoryName,
        createdBy: p.createdBy,
      }));

    // 6. 기여도 상위 기여자
    const contributorMap = new Map<string, number>();
    pins.forEach((pin) => {
      const creator = pin.createdBy || 'anonymous';
      contributorMap.set(creator, (contributorMap.get(creator) || 0) + 1);
    });
    const topContributors = Array.from(contributorMap.entries())
      .map(([userId, count]) => ({ userId, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return NextResponse.json({
      tenantId,
      tenantName,
      pins: pinStats,
      categories: categoryStats.sort((a, b) => b.pinCount - a.pinCount),
      members: memberStats,
      sources: sourceStats.sort((a, b) => b.count - a.count),
      recentPins,
      topContributors,
    });
  } catch (error: any) {
    console.error('Stats error:', error);
    return NextResponse.json({ error: 'Failed to generate statistics' }, { status: 500 });
  }
}
