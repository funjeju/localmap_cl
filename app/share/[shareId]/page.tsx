'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import MapCanvas from '@/components/map/MapCanvas';
import type { Tenant } from '@/lib/types';

interface Share {
  tenantId: string;
  pinId?: string;
  title: string;
  description?: string;
  viewCount: number;
}

export default function SharePage() {
  const params = useParams();
  const shareId = params.shareId as string;
  const [share, setShare] = useState<Share | null>(null);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadShare = async () => {
      try {
        // Get share info
        const shareRef = doc(db, 'shares', shareId);
        const shareSnap = await getDoc(shareRef);

        if (!shareSnap.exists()) {
          setError('공유 링크를 찾을 수 없습니다.');
          return;
        }

        const shareData = shareSnap.data() as Share;
        setShare(shareData);

        // Increment view count
        await updateDoc(shareRef, {
          viewCount: (shareData.viewCount || 0) + 1,
        });

        // Get tenant info
        const tenantRef = doc(db, 'tenants', shareData.tenantId);
        const tenantSnap = await getDoc(tenantRef);

        if (!tenantSnap.exists()) {
          setError('학교 정보를 찾을 수 없습니다.');
          return;
        }

        setTenant(tenantSnap.data() as Tenant);
      } catch (err: any) {
        console.error('Failed to load share:', err);
        setError(err?.message || '공유 링크 로드에 실패했습니다.');
      } finally {
        setLoading(false);
      }
    };

    loadShare();
  }, [shareId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">로드 중...</p>
        </div>
      </div>
    );
  }

  if (error || !share || !tenant) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <p className="text-red-600 font-semibold mb-4">{error || '정보를 불러올 수 없습니다.'}</p>
          <a href="/" className="text-blue-600 hover:underline">
            홈으로 돌아가기
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen w-full bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-4 shadow-sm">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-xl md:text-2xl font-bold text-gray-900 mb-1">
            {share.title}
          </h1>
          {share.description && (
            <p className="text-sm text-gray-600">{share.description}</p>
          )}
          <p className="text-xs text-gray-500 mt-2">
            👁️ {share.viewCount} 명이 이 링크를 열람했습니다.
          </p>
        </div>
      </div>

      {/* Map */}
      <div className="flex-1 relative overflow-hidden">
        <MapCanvas
          tenantId={share.tenantId}
          tenantCenter={tenant.center}
          tenantRadius={tenant.radius}
          locale="ko"
          isPublicShare={true}
          highlightPinId={share.pinId}
        />
      </div>

      {/* Footer */}
      <div className="bg-white border-t border-gray-200 px-4 py-3 text-center text-xs text-gray-500">
        이 지도는 {typeof tenant.name === 'object' ? tenant.name.ko : tenant.name}의 탐방 지도입니다.
      </div>
    </div>
  );
}
