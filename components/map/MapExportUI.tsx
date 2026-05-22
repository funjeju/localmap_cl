'use client';

import React, { useState } from 'react';
import { useMapStore } from '@/stores/mapStore';

export default function MapExportUI({ mapRef }: { mapRef: React.RefObject<maplibregl.Map | null> }) {
  const exportMode = useMapStore((state) => state.exportMode);
  const setExportMode = useMapStore((state) => state.setExportMode);
  const exportImage = useMapStore((state) => state.exportImage);
  const setExportImage = useMapStore((state) => state.setExportImage);

  const [selectedStyle, setSelectedStyle] = useState<string>('original');

  if (!exportMode && !exportImage) return null;

  const handleCapture = () => {
    if (mapRef.current) {
      // Get the map canvas data
      const canvas = mapRef.current.getCanvas();
      const dataUrl = canvas.toDataURL('image/png');
      setExportImage(dataUrl);
    }
  };

  const handleClose = () => {
    setExportMode(false);
    setExportImage(null);
    setSelectedStyle('original');
  };

  const STYLES = [
    { id: 'original', name: '기본 약도', filter: 'none' },
    { id: 'grayscale', name: '흑백 인쇄용', filter: 'grayscale(100%) contrast(120%)' },
    { id: 'sepia', name: '빈티지 (세피아)', filter: 'sepia(80%) contrast(110%) brightness(90%)' },
    { id: 'night', name: '야간 모드', filter: 'invert(90%) hue-rotate(180deg)' },
    { id: 'sketch', name: '연필 스케치', filter: 'grayscale(100%) contrast(200%) brightness(150%) blur(0.5px)' },
  ];

  const currentStyleFilter = STYLES.find(s => s.id === selectedStyle)?.filter || 'none';

  return (
    <>
      {/* 1. Viewfinder Overlay (When exportMode is true, but no image captured yet) */}
      {exportMode && !exportImage && (
        <div className="absolute inset-0 z-20 pointer-events-none flex flex-col items-center justify-center">
          {/* Dark Overlay with cutout */}
          <div className="absolute inset-0 bg-black/40 pointer-events-none" />
          
          <div className="relative z-30 pointer-events-auto flex flex-col items-center">
            <div className="bg-white text-black px-4 py-2 rounded-full font-bold mb-4 shadow-lg text-sm">
              지도를 움직여 약도로 만들 영역을 맞추세요
            </div>
            
            {/* The Cutout Window */}
            <div className="w-[300px] h-[300px] md:w-[500px] md:h-[500px] border-4 border-dashed border-white shadow-[0_0_0_9999px_rgba(0,0,0,0.4)] relative">
              <div className="absolute inset-0 pointer-events-none" />
            </div>

            <div className="mt-8 flex gap-4">
              <button 
                onClick={handleClose}
                className="px-6 py-3 bg-white text-black font-bold rounded-full shadow-lg hover:bg-gray-200"
              >
                취소
              </button>
              <button 
                onClick={handleCapture}
                className="px-6 py-3 bg-primary text-primary-foreground font-bold rounded-full shadow-lg hover:bg-primary/90"
              >
                📸 이 영역 캡처하기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Style Preview Modal (When exportImage is present) */}
      {exportImage && (
        <div className="absolute inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-4xl rounded-xl shadow-2xl flex flex-col md:flex-row overflow-hidden">
            
            {/* Left: Preview */}
            <div className="flex-1 bg-muted p-6 flex flex-col items-center justify-center relative border-r">
              <h3 className="text-lg font-bold mb-4 absolute top-4 left-4 bg-background/80 px-3 py-1 rounded">미리보기</h3>
              
              <div className="relative w-full max-w-[400px] aspect-square bg-white shadow-lg overflow-hidden border">
                {/* We use the captured dataURL but apply CSS filters to simulate styles */}
                <img 
                  src={exportImage} 
                  alt="Map Preview" 
                  className="w-full h-full object-cover transition-all duration-300"
                  style={{ filter: currentStyleFilter }}
                />
              </div>
            </div>

            {/* Right: Style Options */}
            <div className="w-full md:w-80 p-6 flex flex-col">
              <h2 className="text-xl font-bold mb-6">약도 컨셉 선택</h2>
              
              <div className="flex flex-col gap-3 flex-1 overflow-y-auto">
                {STYLES.map(style => (
                  <button
                    key={style.id}
                    onClick={() => setSelectedStyle(style.id)}
                    className={`p-4 rounded-lg border-2 text-left transition-all ${
                      selectedStyle === style.id 
                        ? 'border-primary bg-primary/10' 
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <div className="font-semibold">{style.name}</div>
                  </button>
                ))}
              </div>

              <div className="pt-6 mt-6 border-t flex flex-col gap-3">
                <button 
                  onClick={() => {
                    // Logic to download the image with the filter applied (Needs canvas manipulation for real download)
                    alert('실제 다운로드 기능은 캔버스 컨텍스트에 필터를 입혀야 작동합니다. (MVP 데모)');
                    handleClose();
                  }}
                  className="w-full py-3 bg-primary text-primary-foreground font-bold rounded-lg shadow"
                >
                  📥 이미지 저장하기
                </button>
                <button 
                  onClick={handleClose}
                  className="w-full py-3 bg-secondary text-secondary-foreground font-bold rounded-lg"
                >
                  닫기
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
    </>
  );
}
