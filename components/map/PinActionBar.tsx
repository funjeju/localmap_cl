'use client';

import React, { useState } from 'react';
import { addPin } from '@/lib/firebase/pins';
import { calculateGeoHash } from '@/lib/geo/hash';
import { useMapStore } from '@/stores/mapStore';

export default function PinActionBar({ tenantId }: { tenantId: string }) {
  const [adding, setAdding] = useState(false);

  const handleAddPin = async () => {
    setAdding(true);
    try {
      // For demo, we add a pin at a random location near City Hall
      const lat = 37.5665 + (Math.random() - 0.5) * 0.005;
      const lng = 126.9780 + (Math.random() - 0.5) * 0.005;
      
      await addPin(tenantId, {
        layerId: 'public_facility',
        name: { ko: '새로운 핀 (Demo)' },
        description: { ko: '데모로 추가된 핀입니다.' },
        location: { lat, lng, geohash: calculateGeoHash(lat, lng) },
        descriptionSource: 'manual',
        images: [],
        audioNotes: [],
        source: { type: 'teacher' },
      });
      
      alert('핀이 추가되었습니다! (지도에 바로 표시됩니다)');
    } catch (error) {
      console.error(error);
      alert('핀 추가 실패');
    } finally {
      setAdding(false);
    }
  };

  const setExportMode = useMapStore((state) => state.setExportMode);

  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-background/90 backdrop-blur-sm p-2 rounded-lg shadow-lg border z-10">
      <button 
        onClick={handleAddPin} 
        disabled={adding}
        className="px-4 py-2 font-medium bg-primary text-primary-foreground rounded-md shadow-sm"
      >
        {adding ? '추가 중...' : '📍 핀 추가 (Demo)'}
      </button>
      <button 
        onClick={() => setExportMode(true)}
        className="px-4 py-2 font-medium bg-secondary text-secondary-foreground rounded-md shadow-sm border border-border hover:bg-secondary/80"
      >
        🎨 약도 만들기
      </button>
      <button className="px-4 py-2 font-medium bg-secondary text-secondary-foreground rounded-md shadow-sm">
        AI 설명
      </button>
    </div>
  );
}
