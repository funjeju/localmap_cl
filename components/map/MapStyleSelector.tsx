'use client';

import React, { useState } from 'react';
import { useMapStore } from '@/stores/mapStore';

interface MapStyle {
  id: string;
  name: string;
  icon: string;
  preview: string;
}

const MAP_STYLES: MapStyle[] = [
  { id: 'osm', name: 'OpenStreetMap', icon: '🗺️', preview: '기본 지도' },
  { id: 'satellite', name: '위성 사진', icon: '🛰️', preview: '위성 뷰' },
  { id: 'grayscale', name: '흑백', icon: '⚪', preview: '흑백 지도' },
  { id: 'dark', name: '다크 모드', icon: '🌙', preview: '어두운 테마' },
];

export default function MapStyleSelector() {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedStyle, setSelectedStyle] = useState('osm');

  const handleSelectStyle = async (styleId: string) => {
    setSelectedStyle(styleId);

    // TODO: Apply the selected style to the map
    console.log('Selected style:', styleId);

    setIsOpen(false);
  };

  return (
    <div className="absolute top-4 left-4 z-20">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 rounded-lg shadow-md hover:border-gray-400 transition-colors"
        title="지도 스타일 변경"
      >
        🎨 스타일
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 bg-white border border-gray-300 rounded-lg shadow-lg overflow-hidden w-48">
          {MAP_STYLES.map((style) => (
            <button
              key={style.id}
              onClick={() => handleSelectStyle(style.id)}
              className={`w-full text-left px-4 py-3 border-b last:border-b-0 hover:bg-gray-50 transition-colors ${
                selectedStyle === style.id ? 'bg-blue-50 border-l-4 border-l-blue-600' : ''
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-xl">{style.icon}</span>
                <div className="flex-1">
                  <p className="font-medium text-sm">{style.name}</p>
                  <p className="text-xs text-gray-500">{style.preview}</p>
                </div>
                {selectedStyle === style.id && (
                  <span className="text-blue-600">✓</span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
