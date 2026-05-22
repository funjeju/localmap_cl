import { NextRequest, NextResponse } from 'next/server';
import { collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';

interface PinStats {
  totalPins: number;
  activeCount: number;
  pendingCount: number;
  archivedCount: number;
}

interface CategoryStats {
  categoryId: string;
  categoryName: string;
  pinCount: number;
  percentage: number;
}

interface MemberStats {
  totalMembers: number;
  teachers: number;
  students: number;
  parents: number;
  others: number;
}

interface SourceStats {
  source: string;
  count: number;
  percentage: number;
}

interface TenantStats {
  tenantId: string;
  pins: PinStats;
  categories: CategoryStats[];
  members: MemberStats;
  sources: SourceStats[];
  recentPins: any[];
  topContributors: Array<{ userId: string; count: number }>;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  try {
    const { tenantId } = await params;

    if (!tenantId) {
      return NextResponse.json(
        { error: 'tenantId is required' },
        { status: 400 }
      );
    }

    // 1. 핀 통계
    const pinsSnapshot = await getDocs(
      collection(db, 'tenants', tenantId, 'pins')
    );

    const pins = pinsSnapshot.docs.map((doc) => doc.data());
    const pinStats: PinStats = {
      totalPins: pins.length,
      activeCount: pins.filter((p) => p.status === 'active').length,
      pendingCount: pins.filter((p) => p.status === 'pending_review').length,
      archivedCount: pins.filter((p) => p.status === 'archived').length,
    };

    // 2. 카테고리별 통계
    const layersSnapshot = await getDocs(
      collection(db, 'tenants', tenantId, 'layers')
    );

    const categoryStats: CategoryStats[] = layersSnapshot.docs.map((doc) => {
      const layer = doc.data();
      const pinCount = pins.filter((p) => p.layerId === doc.id).length;
      return {
        categoryId: doc.id,
        categoryName: layer.name?.ko || layer.name?.en || 'Unknown',
        pinCount,
        percentage: pinStats.totalPins > 0 ? (pinCount / pinStats.totalPins) * 100 : 0,
      };
    });

    // 3. 멤버 통계
    const membersSnapshot = await getDocs(
      query(
        collection(db, 'tenants', tenantId, 'members'),
        where('status', '==', 'active')
      )
    );

    const members = membersSnapshot.docs.map((doc) => doc.data());
    const memberStats: MemberStats = {
      totalMembers: members.length,
      teachers: members.filter((m) => m.role === 'teacher').length,
      students: members.filter((m) => m.role === 'student').length,
      parents: members.filter((m) => m.role === 'parent').length,
      others: members.filter((m) => !['teacher', 'student', 'parent'].includes(m.role))
        .length,
    };

    // 4. 데이터 출처 통계
    const sourceMap = new Map<string, number>();
    pins.forEach((pin) => {
      const sourceType = pin.descriptionSource || pin.source?.type || 'unknown';
      sourceMap.set(sourceType, (sourceMap.get(sourceType) || 0) + 1);
    });

    const sourceStats: SourceStats[] = Array.from(sourceMap.entries()).map(
      ([source, count]) => ({
        source,
        count,
        percentage: (count / pinStats.totalPins) * 100,
      })
    );

    // 5. 최근 핀 (5개)
    const recentPins = pins
      .sort(
        (a, b) =>
          (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0)
      )
      .slice(0, 5)
      .map((p) => ({
        id: p.id,
        name: p.name?.ko || p.name?.en || 'Unnamed',
        category: categoryStats.find((c) => c.categoryId === p.layerId)
          ?.categoryName,
        createdBy: p.createdBy,
        createdAt: p.createdAt,
      }));

    // 6. 기여도 상위 기여자 (누가 몇 개의 핀을 추가했는지)
    const contributorMap = new Map<string, number>();
    pins.forEach((pin) => {
      const creator = pin.createdBy || 'anonymous';
      contributorMap.set(creator, (contributorMap.get(creator) || 0) + 1);
    });

    const topContributors = Array.from(contributorMap.entries())
      .map(([userId, count]) => ({ userId, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const stats: TenantStats = {
      tenantId,
      pins: pinStats,
      categories: categoryStats.sort((a, b) => b.pinCount - a.pinCount),
      members: memberStats,
      sources: sourceStats.sort((a, b) => b.count - a.count),
      recentPins,
      topContributors,
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Stats generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate statistics' },
      { status: 500 }
    );
  }
}
