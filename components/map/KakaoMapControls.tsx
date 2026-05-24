'use client';

import React from 'react';
import { useMapStore, type KakaoMapType, type KakaoOverlay } from '@/stores/mapStore';

const MAP_TYPES: { value: KakaoMapType; label: string; icon: string }[] = [
  { value: 'roadmap', label: '일반', icon: '🗺️' },
  { value: 'skyview', label: '스카이뷰', icon: '🛰️' },
  { value: 'hybrid', label: '하이브리드', icon: '🌐' },
];

const OVERLAYS: { value: KakaoOverlay; label: string; icon: string }[] = [
  { value: 'traffic', label: '실시간 교통', icon: '🚦' },
  { value: 'bicycle', label: '자전거 도로', icon: '🚲' },
  { value: 'terrain', label: '지형도', icon: '⛰️' },
  { value: 'use_district', label: '지적편집도', icon: '📐' },
];

const CATEGORIES: { code: string; label: string; icon: string; color: string }[] = [
  { code: 'FD6', label: '음식점', icon: '🍽', color: '#ef4444' },
  { code: 'CE7', label: '카페', icon: '☕', color: '#a16207' },
  { code: 'AT4', label: '관광명소', icon: '🏞', color: '#8b5cf6' },
  { code: 'CT1', label: '문화시설', icon: '🎭', color: '#9333ea' },
  { code: 'AD5', label: '숙박', icon: '🏨', color: '#db2777' },
  { code: 'CS2', label: '편의점', icon: '🏪', color: '#f97316' },
  { code: 'MT1', label: '대형마트', icon: '🛒', color: '#0891b2' },
  { code: 'HP8', label: '병원', icon: '🏥', color: '#dc2626' },
  { code: 'PM9', label: '약국', icon: '💊', color: '#16a34a' },
  { code: 'BK9', label: '은행', icon: '🏦', color: '#0ea5e9' },
  { code: 'PK6', label: '주차장', icon: '🅿', color: '#6366f1' },
  { code: 'OL7', label: '주유소', icon: '⛽', color: '#facc15' },
  { code: 'SC4', label: '학교', icon: '🏫', color: '#2563eb' },
  { code: 'SW8', label: '지하철역', icon: '🚇', color: '#475569' },
];

export default function KakaoMapControls() {
  const kakaoMapType = useMapStore((s) => s.kakaoMapType);
  const setKakaoMapType = useMapStore((s) => s.setKakaoMapType);
  const kakaoOverlays = useMapStore((s) => s.kakaoOverlays);
  const toggleKakaoOverlay = useMapStore((s) => s.toggleKakaoOverlay);
  const kakaoCategories = useMapStore((s) => s.kakaoCategories);
  const toggleKakaoCategory = useMapStore((s) => s.toggleKakaoCategory);

  return (
    <div className="space-y-4">
      {/* Map type */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground mb-2">지도 타입</p>
        <div className="grid grid-cols-3 gap-1">
          {MAP_TYPES.map((t) => (
            <button
              key={t.value}
              onClick={() => setKakaoMapType(t.value)}
              className={`flex flex-col items-center gap-1 py-2 px-1 rounded text-xs border transition-colors ${
                kakaoMapType === t.value
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-card hover:bg-muted border-border'
              }`}
            >
              <span className="text-base leading-none">{t.icon}</span>
              <span className="truncate">{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Overlays */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground mb-2">오버레이</p>
        <div className="space-y-1">
          {OVERLAYS.map((o) => (
            <label key={o.value} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                className="rounded"
                checked={kakaoOverlays.has(o.value)}
                onChange={() => toggleKakaoOverlay(o.value)}
              />
              <span>{o.icon}</span>
              <span className="text-sm truncate">{o.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Place categories */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground mb-2">장소 카테고리</p>
        <div className="space-y-1">
          {CATEGORIES.map((c) => (
            <label key={c.code} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                className="rounded"
                checked={kakaoCategories.has(c.code)}
                onChange={() => toggleKakaoCategory(c.code)}
              />
              <span style={{ color: c.color }}>{c.icon}</span>
              <span className="text-sm truncate">{c.label}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
