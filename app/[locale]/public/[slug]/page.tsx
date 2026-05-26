'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { doc, getDoc, query, collection, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import MapCanvas from '@/components/map/MapCanvas';
import PropertyPanel from '@/components/map/PropertyPanel';
import type { Tenant, Pin } from '@/lib/types';

export default function PublicPortalPage() {
  const params = useParams();
  const slug = params.slug as string;
  const locale = (params.locale as string) || 'ko';

  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [pins, setPins] = useState<Pin[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPinId, setSelectedPinId] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        // Find tenant by slug (stored as shortName or encoded slug)
        const tenantsRef = collection(db, 'tenants');
        const q = query(tenantsRef, where('id', '==', slug));
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
          throw new Error('학교를 찾을 수 없습니다.');
        }

        const tenantData = snapshot.docs[0].data() as Tenant;
        setTenant(tenantData);

        // Load pins
        const pinsRef = collection(db, 'tenants', tenantData.id, 'pins');
        const pinsSnapshot = await getDocs(pinsRef);
        const pinsData = pinsSnapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as Pin);
        setPins(pinsData);
      } catch (error) {
        console.error('Load error:', error);
      } finally {
        setLoading(false);
      }
    };

    if (slug) loadData();
  }, [slug]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">로드 중...</p>
        </div>
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-red-600 text-lg">학교를 찾을 수 없습니다.</p>
        </div>
      </div>
    );
  }

  const tenantName = typeof tenant.name === 'string' ? tenant.name : tenant.name.ko || '학교';

  return (
    <div className="flex flex-col h-screen w-full">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-3 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">{tenantName}</h1>
          <p className="text-sm opacity-90">탐방 지도 · 학부모 포털</p>
        </div>
        <div className="text-right text-sm">
          <p>탐방 장소: {pins.length}곳</p>
        </div>
      </div>

      {/* Map Container */}
      <div className="flex flex-1 overflow-hidden">
        {/* Main Map Area */}
        <section className="flex-1 relative">
          <MapCanvas
            tenantId={tenant.id}
            tenantCenter={tenant.center}
            tenantRadius={tenant.radius}
            locale={locale}
          />
        </section>

        {/* Right Sidebar: Pin List & Details */}
        <div className="w-80 bg-white border-l border-gray-200 flex flex-col">
          {/* Pin List */}
          <div className="flex-1 overflow-y-auto p-4">
            <h2 className="font-bold text-lg mb-4">탐방 장소</h2>
            <div className="space-y-3">
              {pins.map((pin) => (
                <div
                  key={pin.id}
                  onClick={() => setSelectedPinId(pin.id)}
                  className={`p-3 rounded-lg border-2 cursor-pointer transition ${
                    selectedPinId === pin.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <h3 className="font-semibold text-sm">{pin.name.ko || '제목 없음'}</h3>
                  <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                    {pin.description?.ko || '설명 없음'}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Pin Details */}
          {selectedPinId && pins.find((p) => p.id === selectedPinId) && (
            <div className="border-t border-gray-200 p-4 bg-gray-50">
              {(() => {
                const pin = pins.find((p) => p.id === selectedPinId)!;
                return (
                  <>
                    <h3 className="font-bold mb-2">{pin.name.ko}</h3>
                    <p className="text-sm text-gray-700 mb-3">{pin.description?.ko}</p>
                    {pin.images && pin.images.length > 0 && (
                      <div className="space-y-2 mb-3">
                        {pin.images.slice(0, 2).map((img, idx) => (
                          <img
                            key={idx}
                            src={img.url}
                            alt="Pin image"
                            className="w-full h-32 object-cover rounded"
                          />
                        ))}
                      </div>
                    )}
                    <p className="text-xs text-gray-500">
                      📍 {pin.location.lat.toFixed(4)}, {pin.location.lng.toFixed(4)}
                    </p>
                  </>
                );
              })()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
