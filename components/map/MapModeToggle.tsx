'use client';

import React from 'react';
import { useMapStore } from '@/stores/mapStore';

export default function MapModeToggle() {
  const mapMode = useMapStore((state) => state.mapMode);
  const setMapMode = useMapStore((state) => state.setMapMode);

  return (
    <div className="flex gap-2 items-center">
      <button
        onClick={() => setMapMode('pmtiles')}
        className={`px-3 py-2 rounded transition-colors text-sm font-medium ${
          mapMode === 'pmtiles'
            ? 'bg-primary text-primary-foreground'
            : 'bg-secondary text-secondary-foreground border border-border hover:bg-secondary/80'
        }`}
      >
        🗺️ 백지도
      </button>
      <button
        onClick={() => setMapMode('kakao')}
        className={`px-3 py-2 rounded transition-colors text-sm font-medium ${
          mapMode === 'kakao'
            ? 'bg-primary text-primary-foreground'
            : 'bg-secondary text-secondary-foreground border border-border hover:bg-secondary/80'
        }`}
      >
        📍 카카오맵
      </button>
    </div>
  );
}
