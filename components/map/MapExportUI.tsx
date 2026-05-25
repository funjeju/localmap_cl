'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useMapStore } from '@/stores/mapStore';

type Rect = { x: number; y: number; w: number; h: number };
type Stage = 'select' | 'generating' | 'result';
type SketchStyle = 'illustration' | 'watercolor' | 'sketch' | 'cartoon';

const STYLES: { id: SketchStyle; label: string; desc: string }[] = [
  { id: 'illustration', label: '일러스트', desc: '여행 일러스트 느낌' },
  { id: 'watercolor', label: '수채화', desc: '부드러운 수채화 느낌' },
  { id: 'sketch', label: '연필 스케치', desc: '흑백 손그림' },
  { id: 'cartoon', label: '카툰', desc: '밝고 단순한 만화 스타일' },
];

const MIN_DRAG_SIZE = 80;
const MOBILE_BOX_RATIO = 16 / 9;
const MOBILE_BOX_WIDTH_RATIO = 0.85;

export default function MapExportUI({ mapRef }: { mapRef: React.RefObject<any> }) {
  const exportMode = useMapStore((s) => s.exportMode);
  const setExportMode = useMapStore((s) => s.setExportMode);

  const [isMobile, setIsMobile] = useState(false);
  const [stage, setStage] = useState<Stage>('select');
  const [selectedRect, setSelectedRect] = useState<Rect | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [selectedStyle, setSelectedStyle] = useState<SketchStyle>('illustration');
  const [error, setError] = useState<string | null>(null);

  // Mobile crop box position
  const [mobileBoxPos, setMobileBoxPos] = useState<{ x: number; y: number } | null>(null);
  const [mobileDragOffset, setMobileDragOffset] = useState<{ x: number; y: number } | null>(null);

  const overlayRef = useRef<HTMLDivElement>(null);

  // Detect mobile vs desktop
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Initialize mobile box position when entering select stage
  useEffect(() => {
    if (exportMode && isMobile && stage === 'select' && !mobileBoxPos && overlayRef.current) {
      const rect = overlayRef.current.getBoundingClientRect();
      const w = rect.width * MOBILE_BOX_WIDTH_RATIO;
      const h = w / MOBILE_BOX_RATIO;
      setMobileBoxPos({ x: (rect.width - w) / 2, y: (rect.height - h) / 2 });
    }
  }, [exportMode, isMobile, stage, mobileBoxPos]);

  const reset = useCallback(() => {
    setStage('select');
    setSelectedRect(null);
    setIsDrawing(false);
    setDrawStart(null);
    setCapturedImage(null);
    setGeneratedImage(null);
    setError(null);
    setMobileBoxPos(null);
  }, []);

  const handleClose = useCallback(() => {
    setExportMode(false);
    reset();
  }, [setExportMode, reset]);

  // PC drag-to-select handlers
  const handlePcMouseDown = (e: React.MouseEvent) => {
    if (isMobile || !overlayRef.current) return;
    const rect = overlayRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setDrawStart({ x, y });
    setSelectedRect({ x, y, w: 0, h: 0 });
    setIsDrawing(true);
  };

  const handlePcMouseMove = (e: React.MouseEvent) => {
    if (isMobile || !isDrawing || !drawStart || !overlayRef.current) return;
    const rect = overlayRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setSelectedRect({
      x: Math.min(drawStart.x, x),
      y: Math.min(drawStart.y, y),
      w: Math.abs(x - drawStart.x),
      h: Math.abs(y - drawStart.y),
    });
  };

  const handlePcMouseUp = () => {
    if (isMobile) return;
    setIsDrawing(false);
    if (selectedRect && (selectedRect.w < MIN_DRAG_SIZE || selectedRect.h < MIN_DRAG_SIZE)) {
      setSelectedRect(null);
    }
  };

  // Mobile box drag
  const onMobileBoxPointerDown = (e: React.PointerEvent) => {
    if (!isMobile || !mobileBoxPos) return;
    (e.target as Element).setPointerCapture(e.pointerId);
    setMobileDragOffset({ x: e.clientX - mobileBoxPos.x, y: e.clientY - mobileBoxPos.y });
  };

  const onMobileBoxPointerMove = (e: React.PointerEvent) => {
    if (!isMobile || !mobileDragOffset || !overlayRef.current) return;
    const rect = overlayRef.current.getBoundingClientRect();
    const boxW = rect.width * MOBILE_BOX_WIDTH_RATIO;
    const boxH = boxW / MOBILE_BOX_RATIO;
    const newX = Math.max(0, Math.min(e.clientX - mobileDragOffset.x, rect.width - boxW));
    const newY = Math.max(0, Math.min(e.clientY - mobileDragOffset.y, rect.height - boxH));
    setMobileBoxPos({ x: newX, y: newY });
  };

  const onMobileBoxPointerUp = () => setMobileDragOffset(null);

  const captureMap = async (cropRect: Rect): Promise<string> => {
    const ref = mapRef.current;
    if (!ref) throw new Error('지도가 로드되지 않았습니다.');

    // Case A: MapLibre (PMTiles) — getCanvas() returns the WebGL canvas
    if (typeof ref.getCanvas === 'function') {
      const mapCanvas: HTMLCanvasElement = ref.getCanvas();
      ref.triggerRepaint?.();
      // Need a fresh render so the canvas pixels are up-to-date
      await new Promise((r) => requestAnimationFrame(() => r(null)));

      // Map canvas size in CSS px may differ from internal resolution
      const mapRect = mapCanvas.getBoundingClientRect();
      const scaleX = mapCanvas.width / mapRect.width;
      const scaleY = mapCanvas.height / mapRect.height;

      const out = document.createElement('canvas');
      out.width = Math.round(cropRect.w * scaleX);
      out.height = Math.round(cropRect.h * scaleY);
      const ctx = out.getContext('2d');
      if (!ctx) throw new Error('Canvas 2D context 생성 실패');
      ctx.drawImage(
        mapCanvas,
        cropRect.x * scaleX, cropRect.y * scaleY,
        cropRect.w * scaleX, cropRect.h * scaleY,
        0, 0, out.width, out.height
      );
      return out.toDataURL('image/png');
    }

    // Case B: HTMLElement container (e.g. Kakao map div) — html-to-image
    const target: HTMLElement | null =
      ref instanceof HTMLElement ? ref : (ref.getNode ? ref.getNode() : null);
    if (!target) throw new Error('카카오맵 캡처 대상 노드를 찾을 수 없습니다.');

    const { toCanvas } = await import('html-to-image');
    const fullCanvas = await toCanvas(target, {
      cacheBust: true,
      pixelRatio: window.devicePixelRatio || 1,
      // Filter out problematic CSS color functions in computed styles
      filter: (node) => !(node instanceof HTMLElement && node.dataset?.skipCapture === 'true'),
    });
    const out = document.createElement('canvas');
    const pr = window.devicePixelRatio || 1;
    out.width = Math.round(cropRect.w * pr);
    out.height = Math.round(cropRect.h * pr);
    const ctx = out.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context 생성 실패');
    ctx.drawImage(
      fullCanvas,
      cropRect.x * pr, cropRect.y * pr,
      cropRect.w * pr, cropRect.h * pr,
      0, 0, out.width, out.height
    );
    return out.toDataURL('image/png');
  };

  const handleGenerate = async () => {
    setError(null);

    let cropRect: Rect | null = null;
    if (isMobile && mobileBoxPos && overlayRef.current) {
      const rect = overlayRef.current.getBoundingClientRect();
      const w = rect.width * MOBILE_BOX_WIDTH_RATIO;
      const h = w / MOBILE_BOX_RATIO;
      cropRect = { x: mobileBoxPos.x, y: mobileBoxPos.y, w, h };
    } else if (!isMobile && selectedRect) {
      cropRect = selectedRect;
    }

    if (!cropRect) {
      setError(isMobile ? '박스 위치를 조정해주세요.' : '드래그로 영역을 선택해주세요.');
      return;
    }

    try {
      setStage('generating');
      const dataUrl = await captureMap(cropRect);
      setCapturedImage(dataUrl);

      // Strip the data URL prefix for API
      const base64 = dataUrl.replace(/^data:image\/\w+;base64,/, '');

      const res = await fetch('/api/ai/generate-sketch-map', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: base64,
          mimeType: 'image/png',
          style: selectedStyle,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'AI 약도 생성에 실패했습니다.');
      setGeneratedImage(data.imageDataUrl);
      setStage('result');
    } catch (err: any) {
      console.error('Sketch map generation failed:', err);
      setError(err?.message || '약도 생성 중 오류가 발생했습니다.');
      setStage('select');
    }
  };

  const handleDownload = (dataUrl: string, filename: string) => {
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  if (!exportMode) return null;

  // Generating overlay
  if (stage === 'generating') {
    return (
      <div className="absolute inset-0 z-50 bg-black/60 flex items-center justify-center">
        <div className="bg-white rounded-xl p-8 max-w-sm text-center shadow-2xl">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="font-bold text-lg mb-1">AI가 약도를 그리고 있어요</p>
          <p className="text-sm text-gray-500">보통 10~30초 정도 걸립니다</p>
        </div>
      </div>
    );
  }

  // Result modal
  if (stage === 'result' && generatedImage) {
    return (
      <div className="absolute inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
        <div className="bg-white w-full max-w-5xl rounded-xl shadow-2xl flex flex-col overflow-hidden max-h-[90vh]">
          <div className="p-4 border-b flex items-center justify-between flex-shrink-0">
            <h2 className="text-lg font-bold">AI 약도 결과</h2>
            <button onClick={handleClose} className="text-gray-500 hover:text-gray-900">✕</button>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-semibold text-gray-500 mb-2">원본 캡처</p>
                <img src={capturedImage || ''} alt="원본" className="w-full border rounded" />
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 mb-2">AI 약도</p>
                <img src={generatedImage} alt="AI 약도" className="w-full border rounded" />
              </div>
            </div>
          </div>
          <div className="p-4 border-t flex flex-wrap gap-2 justify-end flex-shrink-0">
            <button
              onClick={() => { setStage('select'); setGeneratedImage(null); setCapturedImage(null); }}
              className="px-4 py-2 border rounded hover:bg-gray-50"
            >
              다시 만들기
            </button>
            <button
              onClick={() => handleDownload(generatedImage, `sketch-map-${Date.now()}.png`)}
              className="px-4 py-2 bg-primary text-primary-foreground rounded font-medium hover:bg-primary/90"
            >
              📥 AI 약도 저장
            </button>
            <button onClick={handleClose} className="px-4 py-2 bg-gray-100 rounded hover:bg-gray-200">
              닫기
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Select stage
  const hasSelection = isMobile ? !!mobileBoxPos : !!(selectedRect && selectedRect.w >= MIN_DRAG_SIZE && selectedRect.h >= MIN_DRAG_SIZE);

  return (
    <div
      ref={overlayRef}
      className="absolute inset-0 z-30 select-none"
      onMouseDown={handlePcMouseDown}
      onMouseMove={handlePcMouseMove}
      onMouseUp={handlePcMouseUp}
      onMouseLeave={handlePcMouseUp}
      style={{ cursor: isMobile ? 'default' : 'crosshair' }}
    >
      {/* Dark overlay with cutout for selection */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none" data-skip-capture="true">
        <defs>
          <mask id="cropMask">
            <rect width="100%" height="100%" fill="white" />
            {isMobile && mobileBoxPos && (() => {
              const w = (overlayRef.current?.clientWidth ?? 0) * MOBILE_BOX_WIDTH_RATIO;
              const h = w / MOBILE_BOX_RATIO;
              return <rect x={mobileBoxPos.x} y={mobileBoxPos.y} width={w} height={h} fill="black" />;
            })()}
            {!isMobile && selectedRect && (
              <rect x={selectedRect.x} y={selectedRect.y} width={selectedRect.w} height={selectedRect.h} fill="black" />
            )}
          </mask>
        </defs>
        <rect width="100%" height="100%" fill="rgba(0,0,0,0.55)" mask="url(#cropMask)" />
        {!isMobile && selectedRect && (
          <rect
            x={selectedRect.x} y={selectedRect.y}
            width={selectedRect.w} height={selectedRect.h}
            fill="none" stroke="white" strokeWidth="2" strokeDasharray="6 4"
          />
        )}
      </svg>

      {/* Mobile draggable box (16:9) */}
      {isMobile && mobileBoxPos && overlayRef.current && (() => {
        const w = overlayRef.current.clientWidth * MOBILE_BOX_WIDTH_RATIO;
        const h = w / MOBILE_BOX_RATIO;
        return (
          <div
            data-skip-capture="true"
            className="absolute border-4 border-dashed border-white touch-none"
            style={{ left: mobileBoxPos.x, top: mobileBoxPos.y, width: w, height: h }}
            onPointerDown={onMobileBoxPointerDown}
            onPointerMove={onMobileBoxPointerMove}
            onPointerUp={onMobileBoxPointerUp}
          />
        );
      })()}

      {/* Top hint */}
      <div data-skip-capture="true" className="absolute top-4 left-1/2 -translate-x-1/2 bg-white/90 px-4 py-2 rounded-full text-sm font-medium shadow pointer-events-none">
        {isMobile ? '박스를 드래그해서 위치를 맞춘 뒤 생성하기' : '마우스를 드래그해서 약도로 만들 영역을 선택하세요'}
      </div>

      {/* Error message */}
      {error && (
        <div data-skip-capture="true" className="absolute top-16 left-1/2 -translate-x-1/2 bg-red-500 text-white px-4 py-2 rounded text-sm shadow">
          {error}
        </div>
      )}

      {/* Style picker + buttons */}
      <div
        data-skip-capture="true"
        className="absolute bottom-24 md:bottom-28 left-1/2 -translate-x-1/2 bg-white/95 backdrop-blur p-3 rounded-xl shadow-lg flex flex-col gap-3 max-w-[95vw]"
      >
        <div className="flex gap-2 overflow-x-auto">
          {STYLES.map((s) => (
            <button
              key={s.id}
              onClick={() => setSelectedStyle(s.id)}
              className={`px-3 py-2 rounded-lg text-xs font-medium border whitespace-nowrap transition-colors ${
                selectedStyle === s.id
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-white border-gray-200 hover:bg-gray-50'
              }`}
              title={s.desc}
            >
              {s.label}
            </button>
          ))}
        </div>
        <div className="flex gap-2 justify-center">
          <button
            onClick={handleClose}
            className="px-5 py-2 bg-gray-100 rounded-lg font-medium hover:bg-gray-200 text-sm"
          >
            취소
          </button>
          <button
            onClick={handleGenerate}
            disabled={!hasSelection}
            className="px-5 py-2 bg-primary text-primary-foreground rounded-lg font-bold shadow hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            ✨ AI 약도 만들기
          </button>
        </div>
      </div>
    </div>
  );
}
