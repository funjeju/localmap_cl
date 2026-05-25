'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { useParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { subscribeToAuthChanges } from '@/lib/firebase/auth';
import { db } from '@/lib/firebase/config';
import { doc, getDoc, collection, query, where, onSnapshot } from 'firebase/firestore';
import { useMapStore } from '@/stores/mapStore';
import { getUserMembershipForTenant } from '@/lib/firebase/memberships';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import type { Tenant } from '@/lib/types';

// Dynamic imports for performance
const MapCanvas = dynamic(() => import('@/components/map/MapCanvas'), {
  loading: () => <div className="flex-1 bg-gray-100 flex items-center justify-center"><div className="text-gray-500">지도 로드 중...</div></div>,
  ssr: false,
});

const KakaoMapCanvas = dynamic(() => import('@/components/map/KakaoMapCanvas'), {
  loading: () => <div className="flex-1 bg-gray-100 flex items-center justify-center"><div className="text-gray-500">지도 로드 중...</div></div>,
  ssr: false,
});

const MapModeToggle = dynamic(() => import('@/components/map/MapModeToggle'), {
  ssr: false,
});

const PinActionBar = dynamic(() => import('@/components/map/PinActionBar'), {
  loading: () => null,
  ssr: false,
});

const LayerFilterPanel = dynamic(() => import('@/components/map/LayerFilterPanel'), {
  loading: () => <div className="w-64 bg-gray-100 p-4"><div className="text-gray-500 text-sm">레이어 로드 중...</div></div>,
  ssr: false,
});

const PropertyPanel = dynamic(() => import('@/components/map/PropertyPanel'), {
  loading: () => <div className="w-80 bg-gray-100 p-4"><div className="text-gray-500 text-sm">패널 로드 중...</div></div>,
  ssr: false,
});

const CollaborationModal = dynamic(() => import('@/components/map/CollaborationModal'), {
  ssr: false,
});

const PinValidationQueue = dynamic(() => import('@/components/map/PinValidationQueue'), {
  ssr: false,
});

function MapContent() {
  const router = useRouter();
  const params = useParams();
  const tenantId = params.tenantId as string;
  const locale = (params.locale as string) || 'ko';

  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showCollabModal, setShowCollabModal] = useState(false);
  const [showValidationQueue, setShowValidationQueue] = useState(false);
  const [pendingPinCount, setPendingPinCount] = useState(0);
  const setStudentMode = useMapStore((state) => state.setStudentMode);
  const studentMode = useMapStore((state) => state.studentMode);
  const mapMode = useMapStore((state) => state.mapMode);

  useEffect(() => {
    const unsubscribe = subscribeToAuthChanges(async (firebaseUser) => {
      if (!firebaseUser) {
        router.push(`/${locale}/login`);
        return;
      }
      setUser(firebaseUser);

      // Check user's role for this tenant
      if (tenantId) {
        try {
          const membership = await getUserMembershipForTenant(firebaseUser.uid, tenantId);
          setStudentMode(membership?.role === 'student');
        } catch (err) {
          console.error('Failed to load membership:', err);
        }
      }
    });

    return unsubscribe;
  }, [router, locale, tenantId, setStudentMode]);

  // Real-time pending pin count for teacher badge
  useEffect(() => {
    if (!tenantId || studentMode) return;
    const q = query(
      collection(db, 'tenants', tenantId, 'pins'),
      where('status', '==', 'pending_review')
    );
    const unsub = onSnapshot(q, (snap) => setPendingPinCount(snap.size), () => {});
    return () => unsub();
  }, [tenantId, studentMode]);

  useEffect(() => {
    if (!tenantId) return;

    const loadTenant = async () => {
      try {
        const tenantRef = doc(db, 'tenants', tenantId);
        const snapshot = await getDoc(tenantRef);

        if (!snapshot.exists()) {
          throw new Error('Tenant not found');
        }

        setTenant(snapshot.data() as Tenant);
      } catch (err) {
        console.error('Failed to load tenant:', err);
        router.push(`/${locale}/dashboard`);
      } finally {
        setLoading(false);
      }
    };

    loadTenant();
  }, [tenantId, locale, router]);

  if (loading || !tenant) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Loading map...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen w-full bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between shadow-sm">
        <div className="flex-1">
          <h1 className="text-lg md:text-xl font-bold truncate">
            {typeof tenant.name === 'object' ? tenant.name.ko : tenant.name}
          </h1>
        </div>
        <div className="flex gap-2 ml-4 items-center">
          <MapModeToggle />
          {!studentMode && (
            <button
              onClick={() => setShowValidationQueue(true)}
              className="relative hidden sm:inline px-3 md:px-4 py-2 text-sm md:text-base text-gray-700 hover:bg-gray-100 rounded transition-colors"
            >
              🔔 검토
              {pendingPinCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 text-white text-xs rounded-full flex items-center justify-center px-1">
                  {pendingPinCount > 99 ? '99+' : pendingPinCount}
                </span>
              )}
            </button>
          )}
          <button
            onClick={() => router.push(`/${locale}/dashboard`)}
            className="hidden sm:inline px-3 md:px-4 py-2 text-sm md:text-base text-gray-700 hover:bg-gray-100 rounded transition-colors"
          >
            대시보드
          </button>
          <button
            onClick={() => setShowCollabModal(true)}
            className="hidden sm:inline px-3 md:px-4 py-2 text-sm md:text-base text-gray-700 hover:bg-gray-100 rounded transition-colors"
          >
            👥 협업
          </button>
          <button
            onClick={() => router.push(`/${locale}/${tenantId}/settings`)}
            className="px-3 md:px-4 py-2 text-sm md:text-base bg-blue-600 text-white hover:bg-blue-700 rounded transition-colors"
          >
            설정
          </button>
        </div>
      </div>

      {/* Map Container */}
      <div className="flex flex-1 overflow-hidden gap-0 md:gap-0">
        {/* Sidebar: Layer Filter Panel - Hidden on mobile, shown on md and above */}
        <div className="hidden md:flex md:w-64 flex-col">
          <LayerFilterPanel tenantId={tenantId} />
        </div>

        {/* Main Map Area */}
        <section className="flex-1 relative min-w-0 overflow-hidden">
          {mapMode === 'pmtiles' ? (
            <MapCanvas
              tenantId={tenantId}
              tenantCenter={tenant.center}
              tenantRadius={tenant.radius}
              locale={locale}
            />
          ) : (
            <KakaoMapCanvas
              tenantId={tenantId}
              tenantCenter={tenant.center}
              tenantRadius={tenant.radius}
              locale={locale}
            />
          )}

          {/* Bottom Bar: Action buttons */}
          <PinActionBar tenantId={tenantId} />
        </section>

        {/* Right Sidebar: Property Panel - Hidden on mobile, shown on lg and above */}
        <div className="hidden lg:flex lg:w-80 flex-col">
          <PropertyPanel tenantId={tenantId} />
        </div>
      </div>

      <CollaborationModal
        isOpen={showCollabModal}
        onClose={() => setShowCollabModal(false)}
        tenantId={tenantId}
      />

      {showValidationQueue && (
        <PinValidationQueue
          tenantId={tenantId}
          onClose={() => setShowValidationQueue(false)}
        />
      )}
    </div>
  );
}

export default function MapPage() {
  return (
    <ProtectedRoute>
      <MapContent />
    </ProtectedRoute>
  );
}
