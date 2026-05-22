'use client';

import React, { useEffect, useState } from 'react';
import { useMapStore } from '@/stores/mapStore';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { Pin } from '@/lib/firebase/models';
import { addPin, deletePin } from '@/lib/firebase/pins';
import { calculateGeoHash } from '@/lib/geo/hash';

export default function PropertyPanel({ tenantId }: { tenantId: string }) {
  const selectedPinId = useMapStore((state) => state.selectedPinId);
  const draftPinLocation = useMapStore((state) => state.draftPinLocation);
  const setSelectedPinId = useMapStore((state) => state.setSelectedPinId);
  const setDraftPinLocation = useMapStore((state) => state.setDraftPinLocation);

  const [pin, setPin] = useState<Pin | null>(null);
  const [loading, setLoading] = useState(false);
  const [draftName, setDraftName] = useState('');
  const [draftDesc, setDraftDesc] = useState('');

  // Listen to selected pin
  useEffect(() => {
    if (!selectedPinId) {
      setPin(null);
      return;
    }

    const unsub = onSnapshot(doc(db, 'tenants', tenantId, 'pins', selectedPinId), (docSnap) => {
      if (docSnap.exists()) {
        setPin(docSnap.data() as Pin);
      } else {
        setPin(null);
      }
    });

    return () => unsub();
  }, [selectedPinId, tenantId]);

  const handleCreatePin = async () => {
    if (!draftPinLocation || !draftName) return;
    setLoading(true);
    try {
      const newPinId = await addPin(tenantId, {
        layerId: 'public_facility', // Should be selectable, hardcoded for now
        name: { ko: draftName },
        description: { ko: draftDesc },
        location: { ...draftPinLocation, geohash: calculateGeoHash(draftPinLocation.lat, draftPinLocation.lng) },
        descriptionSource: 'manual',
        images: [],
        audioNotes: [],
        source: { type: 'teacher' },
      });
      setDraftPinLocation(null);
      setDraftName('');
      setDraftDesc('');
      setSelectedPinId(newPinId);
    } catch (err) {
      console.error(err);
      alert('핀 생성 실패');
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePin = async () => {
    if (!selectedPinId) return;
    if (!confirm('이 핀을 삭제하시겠습니까?')) return;
    
    try {
      await deletePin(tenantId, selectedPinId);
      setSelectedPinId(null);
    } catch (err) {
      console.error(err);
      alert('핀 삭제 실패');
    }
  };

  if (!selectedPinId && !draftPinLocation) {
    return (
      <aside className="w-80 border-l bg-card flex flex-col hidden lg:flex">
        <div className="p-4 border-b">
          <h2 className="font-semibold text-muted-foreground">속성 패널</h2>
        </div>
        <div className="flex-1 p-4 flex items-center justify-center text-sm text-muted-foreground text-center">
          지도에서 위치를 클릭해 새 핀을 추가하거나,<br/>
          기존 핀을 선택하세요.
        </div>
      </aside>
    );
  }

  return (
    <aside className="w-80 border-l bg-card flex flex-col z-10 shadow-xl h-full">
      <div className="p-4 border-b flex justify-between items-center bg-muted/30">
        <h2 className="font-semibold">
          {draftPinLocation ? '새로운 장소 추가' : '장소 상세 정보'}
        </h2>
        <button 
          onClick={() => {
            setSelectedPinId(null);
            setDraftPinLocation(null);
          }}
          className="text-muted-foreground hover:text-foreground p-1"
        >
          ✕
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {draftPinLocation && (
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-muted-foreground">이름</label>
              <input 
                type="text" 
                className="w-full mt-1 border rounded p-2 text-sm" 
                placeholder="장소 이름 입력"
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground">설명</label>
              <textarea 
                className="w-full mt-1 border rounded p-2 text-sm h-24" 
                placeholder="장소에 대한 설명 입력"
                value={draftDesc}
                onChange={(e) => setDraftDesc(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground">위치 좌표</label>
              <div className="text-xs text-muted-foreground mt-1 bg-muted p-2 rounded">
                Lat: {draftPinLocation.lat.toFixed(6)}<br/>
                Lng: {draftPinLocation.lng.toFixed(6)}
              </div>
            </div>
            <button 
              onClick={handleCreatePin} 
              disabled={loading || !draftName}
              className="w-full py-2 bg-primary text-primary-foreground rounded font-medium disabled:opacity-50"
            >
              {loading ? '추가 중...' : '이 위치에 핀 추가하기'}
            </button>
          </div>
        )}

        {selectedPinId && (
          pin ? (
            <div className="space-y-4">
              <div>
                <h3 className="text-xl font-bold">{pin.name.ko || pin.name.en}</h3>
                <p className="text-sm text-muted-foreground mt-2">{pin.description?.ko || pin.description?.en || '설명이 없습니다.'}</p>
              </div>
              <div className="pt-4 border-t border-muted">
                <label className="text-xs font-semibold text-muted-foreground">레이어</label>
                <div className="mt-1 text-sm">{pin.layerId}</div>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground">데이터 출처</label>
                <div className="mt-1 text-xs bg-muted p-2 rounded">
                  {pin.source.type === 'teacher' ? '선생님 작성' : pin.source.type === 'ai_generated' ? '자동 생성 (AI)' : '학생 작성'}
                </div>
              </div>
              
              <div className="pt-4 flex gap-2">
                <button className="flex-1 py-2 border rounded font-medium text-sm">수정</button>
                <button 
                  onClick={handleDeletePin}
                  className="flex-1 py-2 bg-destructive text-destructive-foreground rounded font-medium text-sm"
                >
                  삭제
                </button>
              </div>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">장소 정보를 불러오는 중입니다...</div>
          )
        )}
      </div>
    </aside>
  );
}
