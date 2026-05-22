'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { subscribeToAuthChanges } from '@/lib/firebase/auth';
import { getUserTenantMemberships } from '@/lib/firebase/memberships';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import type { TenantMembership } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { logout } from '@/lib/firebase/auth';

interface TenantStats {
  tenantId: string;
  pins: {
    totalPins: number;
    activeCount: number;
    pendingCount: number;
    archivedCount: number;
  };
  categories: Array<{
    categoryId: string;
    categoryName: string;
    pinCount: number;
    percentage: number;
  }>;
  members: {
    totalMembers: number;
    teachers: number;
    students: number;
    parents: number;
    others: number;
  };
  sources: Array<{
    source: string;
    count: number;
    percentage: number;
  }>;
  recentPins: Array<any>;
  topContributors: Array<{ userId: string; count: number }>;
}

interface OrgWithStats extends TenantMembership {
  tenantId: string;
  stats?: TenantStats;
}

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [user, setUser] = useState<any>(null);
  const [memberships, setMemberships] = useState<OrgWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const tenantIdParam = searchParams.get('tenantId');

  useEffect(() => {
    const unsubscribe = subscribeToAuthChanges((firebaseUser) => {
      if (!firebaseUser) {
        router.push('/ko/login');
        return;
      }

      setUser(firebaseUser);

      // Load tenant memberships
      getUserTenantMemberships(firebaseUser.uid)
        .then(async (mems) => {
          // 각 조직의 통계 로드
          const orgsWithStats = await Promise.all(
            mems.map(async (mem) => {
              try {
                const res = await fetch(`/api/tenant/${mem.tenantId}/stats`);
                const stats = await res.json();
                return { ...mem, stats };
              } catch (err) {
                console.error(`Failed to load stats for ${mem.tenantId}:`, err);
                return mem;
              }
            })
          );

          setMemberships(orgsWithStats);
          // Redirect to first tenant's map if available
          if (orgsWithStats.length > 0) {
            const tenantId = orgsWithStats[0].tenantId;
            router.push(`/ko/tenant/${tenantId}/map`);
          }
        })
        .catch((err) => console.error('Failed to load memberships:', err))
        .finally(() => setLoading(false));
    });

    return unsubscribe;
  }, [router, tenantIdParam]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">대시보드</h1>
            {user && <p className="text-gray-600 mt-1">{user.displayName} ({user.email})</p>}
          </div>
          <Button
            variant="outline"
            onClick={async () => {
              await logout();
              router.push('/ko/login');
            }}
          >
            로그아웃
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {memberships.length === 0 ? (
          <div className="bg-white p-8 rounded-lg shadow text-center">
            <h3 className="text-lg font-semibold mb-4">아직 소속이 없습니다</h3>
            <p className="text-gray-600 mb-6">새로운 학교를 등록하거나 기존 학교에 가입하세요</p>
            <Button onClick={() => router.push('/ko/onboarding')} className="bg-blue-600">
              학교 등록하기
            </Button>
          </div>
        ) : (
          <div className="space-y-8">
            {memberships.map((org) => (
              <div key={org.tenantId} className="space-y-4">
                {/* Organization Header */}
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-gray-900">{org.tenantId}</h2>
                  <Button
                    onClick={() => router.push(`/ko/tenant/${org.tenantId}/map`)}
                    className="bg-blue-600"
                  >
                    지도 보기
                  </Button>
                </div>

                {org.stats ? (
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {/* Stats Cards */}
                    <div className="bg-white p-6 rounded-lg shadow">
                      <div className="text-gray-600 text-sm font-medium">총 핀 수</div>
                      <div className="text-3xl font-bold text-gray-900 mt-2">
                        {org.stats.pins.totalPins}
                      </div>
                      <div className="text-xs text-gray-500 mt-2">
                        활성: {org.stats.pins.activeCount} | 검토: {org.stats.pins.pendingCount}
                      </div>
                    </div>

                    <div className="bg-white p-6 rounded-lg shadow">
                      <div className="text-gray-600 text-sm font-medium">멤버</div>
                      <div className="text-3xl font-bold text-gray-900 mt-2">
                        {org.stats.members.totalMembers}
                      </div>
                      <div className="text-xs text-gray-500 mt-2">
                        선생님: {org.stats.members.teachers} | 학생: {org.stats.members.students}
                      </div>
                    </div>

                    <div className="bg-white p-6 rounded-lg shadow">
                      <div className="text-gray-600 text-sm font-medium">카테고리</div>
                      <div className="text-3xl font-bold text-gray-900 mt-2">
                        {org.stats.categories.length}
                      </div>
                      <div className="text-xs text-gray-500 mt-2">
                        가장 많음: {org.stats.categories[0]?.categoryName}
                      </div>
                    </div>

                    <div className="bg-white p-6 rounded-lg shadow">
                      <div className="text-gray-600 text-sm font-medium">완성도</div>
                      <div className="text-3xl font-bold text-green-600 mt-2">
                        {Math.round((org.stats.pins.activeCount / (org.stats.pins.totalPins || 1)) * 100)}%
                      </div>
                      <div className="text-xs text-gray-500 mt-2">활성 핀 비율</div>
                    </div>
                  </div>
                ) : null}

                {/* Category Breakdown */}
                {org.stats?.categories && org.stats.categories.length > 0 && (
                  <div className="bg-white p-6 rounded-lg shadow">
                    <h3 className="text-lg font-semibold mb-4">카테고리별 분포</h3>
                    <div className="space-y-3">
                      {org.stats.categories.slice(0, 5).map((cat) => (
                        <div key={cat.categoryId} className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-sm">{cat.categoryName}</span>
                              <span className="text-xs text-gray-500">({cat.pinCount}개)</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-blue-600 h-2 rounded-full"
                                style={{ width: `${cat.percentage}%` }}
                              ></div>
                            </div>
                          </div>
                          <span className="text-sm text-gray-600 ml-4 w-12 text-right">
                            {Math.round(cat.percentage)}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recent Pins & Top Contributors */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Recent Pins */}
                  {org.stats?.recentPins && org.stats.recentPins.length > 0 && (
                    <div className="bg-white p-6 rounded-lg shadow">
                      <h3 className="text-lg font-semibold mb-4">최근 추가된 핀</h3>
                      <div className="space-y-3">
                        {org.stats.recentPins.map((pin) => (
                          <div key={pin.id} className="text-sm border-b pb-2 last:border-b-0">
                            <div className="font-medium text-gray-900">{pin.name}</div>
                            <div className="text-xs text-gray-500">
                              {pin.category} • {pin.createdBy}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Top Contributors */}
                  {org.stats?.topContributors && org.stats.topContributors.length > 0 && (
                    <div className="bg-white p-6 rounded-lg shadow">
                      <h3 className="text-lg font-semibold mb-4">기여도 상위</h3>
                      <div className="space-y-3">
                        {org.stats.topContributors.map((contributor, idx) => (
                          <div key={contributor.userId} className="flex items-center justify-between text-sm">
                            <span>
                              {idx + 1}. {contributor.userId || 'Anonymous'}
                            </span>
                            <span className="font-medium text-blue-600">{contributor.count}개</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <DashboardContent />
    </ProtectedRoute>
  );
}
