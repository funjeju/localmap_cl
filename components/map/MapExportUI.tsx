'use client';

import React, { useState, useRef } from 'react';
import { useMapStore } from '@/stores/mapStore';

export default function MapExportUI({ mapRef }: { mapRef: React.RefObject<any> }) {
  const exportMode = useMapStore((state) => state.exportMode);
  const setExportMode = useMapStore((state) => state.setExportMode);
  const exportImage = useMapStore((state) => state.exportImage);
  const setExportImage = useMapStore((state) => state.setExportImage);

  const [selectedStyle, setSelectedStyle] = useState<string>('original');
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const viewfinderRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  if (!exportMode && !exportImage) return null;

  const VIEWFINDER_SIZE = { w: 300, h: 300 };
  const MD_VIEWFINDER_SIZE = { w: 500, h: 500 };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - offsetX, y: e.clientY - offsetY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !containerRef.current) return;

    const newOffsetX = e.clientX - dragStart.x;
    const newOffsetY = e.clientY - dragStart.y;

    const containerRect = containerRef.current.getBoundingClientRect();
    const size = window.innerWidth >= 768 ? MD_VIEWFINDER_SIZE : VIEWFINDER_SIZE;

    // Clamp position within bounds (accounting for centered flexbox positioning)
    const centerX = containerRect.width / 2;
    const centerY = containerRect.height / 2;
    const maxOffsetX = centerX - size.w / 2;
    const maxOffsetY = centerY - size.h / 2;
    const minOffsetX = -maxOffsetX;
    const minOffsetY = -maxOffsetY;

    setOffsetX(Math.max(minOffsetX, Math.min(newOffsetX, maxOffsetX)));
    setOffsetY(Math.max(minOffsetY, Math.min(newOffsetY, maxOffsetY)));
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleCapture = async () => {
    if (!mapRef.current || !viewfinderRef.current) return;

    try {
      const size = window.innerWidth >= 768 ? MD_VIEWFINDER_SIZE : VIEWFINDER_SIZE;
      const viewfinderRect = viewfinderRef.current.getBoundingClientRect();
      const containerRect = containerRef.current?.getBoundingClientRect();

      if (!containerRect) return;

      const x = viewfinderRect.left - containerRect.left;
      const y = viewfinderRect.top - containerRect.top;

      // Try to get canvas from Kakao Maps
      if (mapRef.current.getCanvas && typeof mapRef.current.getCanvas === 'function') {
        // MapLibre GL JS
        const canvas = mapRef.current.getCanvas();
        const dataUrl = canvas.toDataURL('image/png');
        setExportImage(dataUrl);
      } else if (mapRef.current instanceof HTMLCanvasElement) {
        // Direct canvas reference
        const dataUrl = mapRef.current.toDataURL('image/png');
        setExportImage(dataUrl);
      } else if (containerRef.current) {
        // Fallback: Use html2canvas for Kakao Maps
        const html2canvasModule = await import('html2canvas' as any);
        const html2canvas = html2canvasModule.default || html2canvasModule;
        const canvas = await html2canvas(containerRef.current, {
          useCORS: true,
          backgroundColor: null,
        });
        const dataUrl = canvas.toDataURL('image/png');

        // Crop to viewfinder area
        const croppedCanvas = document.createElement('canvas');
        croppedCanvas.width = size.w;
        croppedCanvas.height = size.h;
        const ctx = croppedCanvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(canvas, x, y, size.w, size.h, 0, 0, size.w, size.h);
          setExportImage(croppedCanvas.toDataURL('image/png'));
        }
      } else {
        throw new Error('Map container not found');
      }
    } catch (error) {
      console.error('Capture failed:', error);
      alert('캡처에 실패했습니다. 다시 시도해주세요.');
    }
  };

  const handleClose = () => {
    setExportMode(false);
    setExportImage(null);
    setSelectedStyle('original');
    setOffsetX(0);
    setOffsetY(0);
  };

  const STYLES = [
    { id: 'original', name: '기본 약도', filter: 'none' },
    { id: 'white', name: '백지도 (흰색배경)', filter: 'invert(100%) brightness(110%) contrast(80%)' },
    { id: 'grayscale', name: '흑백 인쇄용', filter: 'grayscale(100%) contrast(120%)' },
    { id: 'sepia', name: '빈티지 (세피아)', filter: 'sepia(80%) contrast(110%) brightness(90%)' },
    { id: 'night', name: '야간 모드', filter: 'invert(90%) hue-rotate(180deg)' },
    { id: 'sketch', name: '연필 스케치', filter: 'grayscale(100%) contrast(200%) brightness(150%) blur(0.5px)' },
  ];

  const currentStyleFilter = STYLES.find(s => s.id === selectedStyle)?.filter || 'none';

  const handleDownload = async () => {
    if (!exportImage) return;

    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const img = new Image();
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;

        // Apply filter by drawing with canvas context
        if (selectedStyle !== 'original') {
          ctx.filter = currentStyleFilter;
        }
        ctx.drawImage(img, 0, 0);

        // Download the canvas
        canvas.toBlob((blob) => {
          if (blob) {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `map-${selectedStyle}-${new Date().getTime()}.png`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            handleClose();
          }
        });
      };
      img.src = exportImage;
    } catch (error) {
      console.error('Download failed:', error);
      alert('이미지 다운로드에 실패했습니다.');
    }
  };

  return (
    <>
      {/* 1. Viewfinder Overlay (When exportMode is true, but no image captured yet) */}
      {exportMode && !exportImage && (
        <div
          ref={containerRef}
          className="absolute inset-0 z-20 cursor-grab active:cursor-grabbing"
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {/* Dark Overlay */}
          <div className="absolute inset-0 bg-black/40 pointer-events-none" />

          <div className="relative z-30 flex flex-col items-center justify-center h-full">
            <div className="bg-white text-black px-4 py-2 rounded-full font-bold mb-4 shadow-lg text-sm pointer-events-none">
              드래그로 영역을 이동하세요
            </div>

            {/* Draggable Viewfinder Window */}
            <div
              ref={viewfinderRef}
              className="w-[300px] h-[300px] md:w-[500px] md:h-[500px] border-4 border-dashed border-white shadow-[0_0_0_9999px_rgba(0,0,0,0.4)] relative cursor-grab active:cursor-grabbing transition-all"
              style={{
                transform: `translate(${offsetX}px, ${offsetY}px)`,
                userSelect: 'none',
              }}
              onMouseDown={handleMouseDown}
            >
              <div className="absolute inset-0 pointer-events-none" />
              <div className="absolute -top-6 left-0 right-0 text-center text-white text-xs font-semibold pointer-events-none">
                드래그 가능
              </div>
            </div>

            <div className="mt-8 flex gap-4 pointer-events-auto">
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
                  onClick={handleDownload}
                  className="w-full py-3 bg-primary text-primary-foreground font-bold rounded-lg shadow hover:bg-primary/90"
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
