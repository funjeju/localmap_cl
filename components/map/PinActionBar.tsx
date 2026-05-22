'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { subscribeToPins } from '@/lib/firebase/pins';
import { useMapStore } from '@/stores/mapStore';
import { collection, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import PdfExportModal from './PdfExportModal';
import PinEditorModal from './PinEditorModal';
import BulkImportModal from './BulkImportModal';
import type { Tenant, Pin, Layer } from '@/lib/types';

export default function PinActionBar({ tenantId }: { tenantId: string }) {
  const params = useParams();
  const locale = (params.locale as string) || 'ko';
  const [generatingAI, setGeneratingAI] = useState(false);
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [pins, setPins] = useState<Pin[]>([]);
  const [layers, setLayers] = useState<Layer[]>([]);

  const draftPinLocation = useMapStore((state) => state.draftPinLocation);
  const studentMode = useMapStore((state) => state.studentMode);
  const showPinEditor = useMapStore((state) => state.showPinEditor);
  const setShowPinEditor = useMapStore((state) => state.setShowPinEditor);

  // Load layers
  useEffect(() => {
    if (!tenantId) return;
    const unsub = onSnapshot(collection(db, 'tenants', tenantId, 'layers'), (snapshot) => {
      const fetchedLayers = snapshot.docs.map((doc) => doc.data() as Layer);
      fetchedLayers.sort((a, b) => a.order - b.order);
      setLayers(fetchedLayers);
    });
    return () => unsub();
  }, [tenantId]);

  const handleAddPin = () => {
    if (!draftPinLocation) {
      alert('맵에서 위치를 먼저 선택해주세요.');
      return;
    }
    setShowPinEditor(true);
  };

  const setExportMode = useMapStore((state) => state.setExportMode);

  const handleCloseEditor = () => {
    setShowPinEditor(false);
  };

  const handleExportNeighborhoodBook = async () => {
    try {
      // Get tenant info
      const tenantRef = doc(db, 'tenants', tenantId);
      const tenantSnap = await getDoc(tenantRef);
      if (!tenantSnap.exists()) {
        throw new Error('학교 정보를 불러올 수 없습니다.');
      }

      setTenant(tenantSnap.data() as Tenant);

      // Get all pins
      const allPins = await new Promise<Pin[]>((resolve) => {
        let pinsList: any[] = [];
        const unsubscribe = subscribeToPins(tenantId, (pins) => {
          pinsList = pins;
        });
        setTimeout(() => {
          unsubscribe();
          resolve(pinsList as Pin[]);
        }, 500);
      });

      setPins(allPins);
      setShowPdfModal(true);
    } catch (error: any) {
      console.error('Export error:', error);
      alert(error?.message || '내보내기에 실패했습니다.');
    }
  };

  const handleGenerateAI = async () => {
    setGeneratingAI(true);
    try {
      // Get tenant info
      const tenantRef = doc(db, 'tenants', tenantId);
      const tenantSnap = await getDoc(tenantRef);
      if (!tenantSnap.exists()) {
        throw new Error('학교 정보를 불러올 수 없습니다.');
      }

      const tenant = tenantSnap.data();
      const tenantName = typeof tenant.name === 'object' ? tenant.name.ko : tenant.name;

      // Get all pins (in a real app, you'd only get visible pins)
      const pins = await new Promise<any[]>((resolve) => {
        let pinsList: any[] = [];
        const unsubscribe = subscribeToPins(tenantId, (pins) => {
          pinsList = pins;
        });
        setTimeout(() => {
          unsubscribe();
          resolve(pinsList);
        }, 500);
      });

      if (pins.length === 0) {
        alert('탐방 위치가 없습니다. 먼저 위치를 추가해주세요.');
        setGeneratingAI(false);
        return;
      }

      // Call AI generation API
      const response = await fetch('/api/ai/generate-learning-material', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId,
          tenantName,
          pins: pins.map(p => ({
            id: p.id,
            name: p.name,
            description: p.description,
            location: p.location,
          })),
          locale: 'ko',
          gradeLevel: 'elementary',
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'AI 설명 생성에 실패했습니다.');
      }

      alert('AI 학습 자료가 생성되었습니다!');
    } catch (error: any) {
      console.error('AI generation error:', error);
      alert(error?.message || 'AI 설명 생성 중 오류가 발생했습니다.');
    } finally {
      setGeneratingAI(false);
    }
  };

  return (
    <>
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-background/90 backdrop-blur-sm p-2 rounded-lg shadow-lg border z-10">
        {studentMode ? (
          // Student mode - limited features
          <button
            onClick={handleExportNeighborhoodBook}
            className="px-4 py-2 font-medium bg-secondary text-secondary-foreground rounded-md shadow-sm border border-border hover:bg-secondary/80"
          >
            📕 우리 동네 책
          </button>
        ) : (
          // Teacher mode - full features
          <>
            <button
              onClick={handleAddPin}
              className="px-4 py-2 font-medium bg-primary text-primary-foreground rounded-md shadow-sm hover:bg-primary/90"
            >
              📍 핀 추가
            </button>
            <button
              onClick={() => setExportMode(true)}
              className="px-4 py-2 font-medium bg-secondary text-secondary-foreground rounded-md shadow-sm border border-border hover:bg-secondary/80"
            >
              🎨 약도 만들기
            </button>
            <button
              onClick={handleGenerateAI}
              disabled={generatingAI}
              className="px-4 py-2 font-medium bg-secondary text-secondary-foreground rounded-md shadow-sm border border-border hover:bg-secondary/80 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {generatingAI ? '생성 중...' : '🤖 AI 설명'}
            </button>
            <button
              onClick={handleExportNeighborhoodBook}
              className="px-4 py-2 font-medium bg-secondary text-secondary-foreground rounded-md shadow-sm border border-border hover:bg-secondary/80"
            >
              📕 우리 동네 책
            </button>
            <button
              onClick={() => setShowBulkImport(true)}
              className="px-4 py-2 font-medium bg-secondary text-secondary-foreground rounded-md shadow-sm border border-border hover:bg-secondary/80"
            >
              📄 CSV import
            </button>
          </>
        )}
      </div>

      {showPinEditor && (
        <PinEditorModal
          tenantId={tenantId}
          layers={layers}
          onClose={handleCloseEditor}
          onSuccess={() => {
            handleCloseEditor();
          }}
        />
      )}

      {showBulkImport && (
        <BulkImportModal
          tenantId={tenantId}
          layers={layers}
          onClose={() => setShowBulkImport(false)}
          onSuccess={() => {
            setShowBulkImport(false);
          }}
        />
      )}

      <PdfExportModal
        isOpen={showPdfModal}
        onClose={() => setShowPdfModal(false)}
        tenant={tenant}
        pins={pins}
        locale={locale}
      />
    </>
  );
}
