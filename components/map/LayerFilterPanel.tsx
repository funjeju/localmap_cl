'use client';

import React, { useEffect, useState } from 'react';
import { useMapStore } from '@/stores/mapStore';
import { collection, onSnapshot, addDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { Layer } from '@/lib/firebase/models';
import ActivityFeed from './ActivityFeed';
import KakaoMapControls from './KakaoMapControls';

const ICON_OPTIONS = [
  { value: '📍', label: '📍 핀' },
  { value: '🏛️', label: '🏛️ 건물' },
  { value: '🎨', label: '🎨 미술' },
  { value: '📚', label: '📚 도서관' },
  { value: '🏫', label: '🏫 학교' },
  { value: '🏞️', label: '🏞️ 자연' },
  { value: '🍽️', label: '🍽️ 식당' },
  { value: '☕', label: '☕ 카페' },
  { value: '🎭', label: '🎭 문화' },
  { value: '⛩️', label: '⛩️ 종교' },
  { value: '🏪', label: '🏪 상점' },
  { value: '🛡️', label: '🛡️ 안전' },
  { value: '🌳', label: '🌳 나무' },
  { value: '🏯', label: '🏯 문화재' },
];

export default function LayerFilterPanel({ tenantId }: { tenantId: string }) {
  const [layers, setLayers] = useState<Layer[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newLayerName, setNewLayerName] = useState('');
  const [newLayerColor, setNewLayerColor] = useState('#3b82f6');
  const [newLayerIcon, setNewLayerIcon] = useState('📍');
  const [isCreating, setIsCreating] = useState(false);

  const [editingLayerId, setEditingLayerId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');
  const [editIcon, setEditIcon] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const toggleLayer = useMapStore((state) => state.toggleLayer);
  const visibleLayerIds = useMapStore((state) => state.visibleLayerIds);
  const showHeritageLayer = useMapStore((state) => state.showHeritageLayer);
  const setShowHeritageLayer = useMapStore((state) => state.setShowHeritageLayer);
  const mapMode = useMapStore((state) => state.mapMode);

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
      await addDoc(collection(db, 'tenants', tenantId, 'layers'), {
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

  const startEditLayer = (layer: Layer) => {
    setEditingLayerId(layer.id);
    setEditName(layer.name.ko || layer.name.en || '');
    setEditColor(layer.color);
    setEditIcon(layer.icon);
  };

  const handleSaveEdit = async () => {
    if (!editingLayerId || !editName.trim()) return;
    setIsSavingEdit(true);
    try {
      const res = await fetch(`/api/tenant/${tenantId}/layers/${editingLayerId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName, color: editColor, icon: editIcon }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.message || '저장 실패');
      }
      setEditingLayerId(null);
    } catch (err: any) {
      alert(err?.message || '레이어 수정에 실패했습니다.');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleDeleteLayer = async (layerId: string, layerName: string) => {
    if (!confirm(`"${layerName}" 레이어를 삭제하시겠습니까?`)) return;
    try {
      const res = await fetch(`/api/tenant/${tenantId}/layers/${layerId}`, { method: 'DELETE' });
      const d = await res.json();
      if (!res.ok) throw new Error(d.message || '삭제 실패');
    } catch (err: any) {
      alert(err?.message || '레이어 삭제에 실패했습니다.');
    }
  };

  return (
    <aside className="w-64 border-r bg-card flex flex-col z-10 h-full min-h-0">
      <div className="p-4 border-b flex-shrink-0">
        <h2 className="font-semibold">레이어</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-1 min-h-0">
        {layers.length === 0 ? (
          <div className="text-sm text-muted-foreground">불러오는 중...</div>
        ) : (
          <>
            {layers.map((layer) => (
              <div key={layer.id} className="group">
                {editingLayerId === layer.id ? (
                  <div className="space-y-2 p-2 bg-gray-50 rounded-lg border text-xs">
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full border rounded px-2 py-1 text-sm"
                      autoFocus
                    />
                    <div className="flex gap-2 items-center">
                      <input
                        type="color"
                        value={editColor}
                        onChange={(e) => setEditColor(e.target.value)}
                        className="w-8 h-8 rounded border cursor-pointer flex-shrink-0"
                      />
                      <select
                        value={editIcon}
                        onChange={(e) => setEditIcon(e.target.value)}
                        className="flex-1 border rounded px-1 py-1 text-xs"
                      >
                        {ICON_OPTIONS.map(o => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={handleSaveEdit}
                        disabled={isSavingEdit}
                        className="flex-1 py-1 bg-primary text-primary-foreground rounded text-xs font-medium disabled:opacity-50"
                      >
                        {isSavingEdit ? '저장...' : '저장'}
                      </button>
                      <button
                        onClick={() => setEditingLayerId(null)}
                        className="flex-1 py-1 border rounded text-xs"
                      >
                        취소
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 py-1 rounded hover:bg-gray-50 px-1">
                    <input
                      type="checkbox"
                      className="rounded flex-shrink-0"
                      checked={visibleLayerIds.has(layer.id)}
                      onChange={() => toggleLayer(layer.id)}
                    />
                    <span style={{ color: layer.color }} className="flex-shrink-0">{layer.icon}</span>
                    <span className="text-sm flex-1 truncate">{layer.name.ko || layer.name.en}</span>
                    <div className="hidden group-hover:flex gap-1 flex-shrink-0">
                      <button
                        onClick={() => startEditLayer(layer)}
                        className="text-gray-400 hover:text-gray-700 text-xs px-1"
                        title="편집"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => handleDeleteLayer(layer.id, layer.name.ko || layer.name.en || '')}
                        className="text-gray-400 hover:text-red-600 text-xs px-1"
                        title="삭제"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}

            <div className="border-t pt-4 mt-4 flex-shrink-0">
              <p className="text-xs font-semibold text-muted-foreground mb-3">문화재청</p>
            </div>

            <label className="flex items-center gap-2 cursor-pointer flex-shrink-0 py-1 px-1">
              <input
                type="checkbox"
                className="rounded"
                checked={showHeritageLayer}
                onChange={(e) => setShowHeritageLayer(e.target.checked)}
              />
              <span style={{ color: '#8b5cf6' }}>🏯</span>
              <span className="text-sm truncate">지정 문화재</span>
            </label>

            {mapMode === 'kakao' && (
              <div className="border-t pt-4 mt-4">
                <p className="text-xs font-semibold text-muted-foreground mb-3">카카오맵 도구</p>
                <KakaoMapControls />
              </div>
            )}
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
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && handleCreateLayer()}
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
                  {ICON_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
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
