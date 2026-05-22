'use client';

import React, { useEffect, useState } from 'react';
import { useMapStore } from '@/stores/mapStore';
import { collection, onSnapshot, addDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { Layer } from '@/lib/firebase/models';
import ActivityFeed from './ActivityFeed';

export default function LayerFilterPanel({ tenantId }: { tenantId: string }) {
  const [layers, setLayers] = useState<Layer[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newLayerName, setNewLayerName] = useState('');
  const [newLayerColor, setNewLayerColor] = useState('#3b82f6');
  const [newLayerIcon, setNewLayerIcon] = useState('📍');
  const [isCreating, setIsCreating] = useState(false);
  const toggleLayer = useMapStore((state) => state.toggleLayer);
  const visibleLayerIds = useMapStore((state) => state.visibleLayerIds);
  const showHeritageLayer = useMapStore((state) => state.showHeritageLayer);
  const setShowHeritageLayer = useMapStore((state) => state.setShowHeritageLayer);

  useEffect(() => {
    if (!tenantId) return;
    const unsub = onSnapshot(collection(db, 'tenants', tenantId, 'layers'), (snapshot) => {
      const fetchedLayers = snapshot.docs.map((doc) => doc.data() as Layer);
      fetchedLayers.sort((a, b) => a.order - b.order);
      setLayers(fetchedLayers);
    });
    return () => unsub();
  }, [tenantId]);

  const handleCreateLayer = async () => {
    if (!newLayerName.trim() || !tenantId) return;

    setIsCreating(true);
    try {
      const layersRef = collection(db, 'tenants', tenantId, 'layers');
      await addDoc(layersRef, {
        name: { ko: newLayerName, en: newLayerName, ja: newLayerName },
        color: newLayerColor,
        icon: newLayerIcon,
        order: layers.length,
        createdAt: new Date(),
      });

      setNewLayerName('');
      setNewLayerColor('#3b82f6');
      setNewLayerIcon('📍');
      setShowCreateModal(false);
    } catch (error) {
      console.error('Failed to create layer:', error);
      alert('레이어 생성에 실패했습니다.');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <aside className="w-64 border-r bg-card flex flex-col z-10 h-full min-h-0">
      <div className="p-4 border-b flex-shrink-0">
        <h2 className="font-semibold">레이어</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
        {layers.length === 0 ? (
          <div className="text-sm text-muted-foreground">불러오는 중...</div>
        ) : (
          <>
            {/* System Layers */}
            {layers.map((layer) => (
              <label key={layer.id} className="flex items-center gap-2 cursor-pointer flex-shrink-0">
                <input
                  type="checkbox"
                  className="rounded"
                  checked={visibleLayerIds.has(layer.id)}
                  onChange={() => toggleLayer(layer.id)}
                />
                <span style={{ color: layer.color }}>{layer.icon}</span>
                <span className="text-sm truncate">{layer.name.ko || layer.name.en}</span>
              </label>
            ))}

            {/* Heritage Layer Separator */}
            <div className="border-t pt-4 mt-4 flex-shrink-0">
              <p className="text-xs font-semibold text-muted-foreground mb-3">문화재청</p>
            </div>

            {/* Heritage Layer Toggle */}
            <label className="flex items-center gap-2 cursor-pointer flex-shrink-0">
              <input
                type="checkbox"
                className="rounded"
                checked={showHeritageLayer}
                onChange={(e) => setShowHeritageLayer(e.target.checked)}
              />
              <span style={{ color: '#8b5cf6' }}>🏯</span>
              <span className="text-sm truncate">지정 문화재</span>
            </label>
          </>
        )}
      </div>

      <div className="p-4 border-t flex-shrink-0">
        <button
          onClick={() => setShowCreateModal(true)}
          className="w-full py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90"
        >
          + 새 레이어
        </button>
      </div>

      <div className="flex-1 overflow-y-auto border-t flex-shrink-0 min-h-0">
        <ActivityFeed tenantId={tenantId} />
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-sm w-full p-6 space-y-4">
            <h2 className="text-lg font-bold">새 레이어 만들기</h2>

            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-2">레이어 이름</label>
              <input
                type="text"
                value={newLayerName}
                onChange={(e) => setNewLayerName(e.target.value)}
                placeholder="예: 박물관, 카페, 공원"
                className="w-full border rounded p-2 text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-2">색상</label>
                <input
                  type="color"
                  value={newLayerColor}
                  onChange={(e) => setNewLayerColor(e.target.value)}
                  className="w-full h-10 rounded border cursor-pointer"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-2">아이콘</label>
                <select
                  value={newLayerIcon}
                  onChange={(e) => setNewLayerIcon(e.target.value)}
                  className="w-full border rounded p-2 text-sm"
                >
                  <option value="📍">📍 핀</option>
                  <option value="🏛️">🏛️ 건물</option>
                  <option value="🎨">🎨 미술</option>
                  <option value="📚">📚 도서관</option>
                  <option value="🏫">🏫 학교</option>
                  <option value="🏞️">🏞️ 자연</option>
                  <option value="🍽️">🍽️ 식당</option>
                  <option value="☕">☕ 카페</option>
                  <option value="🎭">🎭 문화</option>
                  <option value="⛩️">⛩️ 종교</option>
                </select>
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 py-2 border rounded text-sm font-medium hover:bg-gray-50"
              >
                취소
              </button>
              <button
                onClick={handleCreateLayer}
                disabled={!newLayerName.trim() || isCreating}
                className="flex-1 py-2 bg-primary text-primary-foreground rounded text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isCreating ? '생성 중...' : '만들기'}
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
