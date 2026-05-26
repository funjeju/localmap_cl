'use client';

import React, { useEffect, useState } from 'react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase/config';
import { getIdToken } from 'firebase/auth';
import { useMapStore } from '@/stores/mapStore';
import type { Pin, Layer, PinHistory } from '@/lib/types';
import { getPinHistory } from '@/lib/firebase/history';

interface PinDetailPanelProps {
  tenantId: string;
  pinId: string;
  layers: Layer[];
  studentMode?: boolean;
  onEdit?: (pin: Pin) => void;
}

export default function PinDetailPanel({
  tenantId,
  pinId,
  layers,
  studentMode,
  onEdit,
}: PinDetailPanelProps) {
  const [pin, setPin] = useState<Pin | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [generatingAI, setGeneratingAI] = useState(false);
  const [activeTab, setActiveTab] = useState<'info' | 'history'>('info');
  const [history, setHistory] = useState<PinHistory[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const setSelectedPinId = useMapStore((state) => state.setSelectedPinId);

  useEffect(() => {
    if (!pinId || !tenantId) return;

    setLoading(true);
    const loadPin = async () => {
      try {
        const pinRef = doc(db, 'tenants', tenantId, 'pins', pinId);
        const pinSnap = await getDoc(pinRef);
        if (pinSnap.exists()) {
          setPin({ id: pinSnap.id, ...pinSnap.data() } as Pin);
        }
      } catch (error) {
        console.error('Failed to load pin:', error);
      } finally {
        setLoading(false);
      }
    };

    loadPin();
  }, [pinId, tenantId]);

  const handleDelete = async () => {
    if (!confirm('이 핀을 삭제하시겠습니까?')) return;

    setIsDeleting(true);
    try {
      const token = auth.currentUser ? await getIdToken(auth.currentUser) : undefined;
      const res = await fetch(`/api/tenant/${tenantId}/pins/${pinId}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || '삭제에 실패했습니다.');
      }
      setSelectedPinId(null);
    } catch (error: any) {
      console.error('Delete error:', error);
      alert(error?.message || '삭제에 실패했습니다.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleLoadHistory = async () => {
    if (historyLoading || history.length > 0) return;
    setHistoryLoading(true);
    try {
      const h = await getPinHistory(tenantId, pinId);
      setHistory(h);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'history') handleLoadHistory();
  }, [activeTab]);

  const handleGenerateAI = async () => {
    if (!pin) return;
    setGeneratingAI(true);
    try {
      const layer = layers.find((l) => l.id === pin.layerId);
      const res = await fetch('/api/ai/generate-pin-description', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pinName: pin.name.ko || pin.name.en,
          location: pin.location,
          category: layer?.name.ko || '일반',
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'AI 설명 생성 실패');

      const ko = data.descriptionKo || data.ko || '';
      const en = data.descriptionEn || data.en || '';
      const pinRef = doc(db, 'tenants', tenantId, 'pins', pinId);
      await updateDoc(pinRef, {
        'description.ko': ko,
        'description.en': en,
        descriptionSource: 'ai',
        updatedAt: new Date(),
      });

      setPin((prev) => prev ? { ...prev, description: { ...prev.description, ko, en } } : prev);
    } catch (err: any) {
      alert(err?.message || 'AI 설명 생성에 실패했습니다.');
    } finally {
      setGeneratingAI(false);
    }
  };

  const getLayerName = (layerId: string) => {
    return layers.find((l) => l.id === layerId)?.name.ko || '미분류';
  };

  const getStatusBadge = (status?: string) => {
    if (status === 'pending_review') {
      return <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">검토 대기</span>;
    }
    if (status === 'rejected') {
      return <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">거부됨</span>;
    }
    return null;
  };

  if (loading) {
    return (
      <div className="w-80 bg-white shadow-lg border-l flex flex-col">
        <div className="p-4 text-gray-500 text-sm">로드 중...</div>
      </div>
    );
  }

  if (!pin) {
    return (
      <div className="w-80 bg-white shadow-lg border-l flex flex-col">
        <div className="p-4 text-gray-500 text-sm">핀을 불러올 수 없습니다.</div>
      </div>
    );
  }

  return (
    <div className="w-80 bg-white shadow-lg border-l flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-lg font-bold text-gray-900 truncate">
              {pin.name?.ko || pin.name?.en || '이름 없음'}
            </h2>
            {getStatusBadge((pin as any).status)}
          </div>
          <p className="text-sm text-gray-500 mt-0.5">{getLayerName(pin.layerId)}</p>
        </div>
        <button
          onClick={() => setSelectedPinId(null)}
          className="text-gray-400 hover:text-gray-600 text-xl leading-none ml-2 flex-shrink-0"
        >
          ×
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b text-sm">
        <button
          onClick={() => setActiveTab('info')}
          className={`flex-1 py-2 font-medium transition-colors ${activeTab === 'info' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
        >
          정보
        </button>
        {!studentMode && (
          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 py-2 font-medium transition-colors ${activeTab === 'history' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
          >
            변경 이력
          </button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">

      {activeTab === 'history' && (
        <div className="space-y-2">
          {historyLoading && <p className="text-sm text-gray-400 text-center py-4">불러오는 중...</p>}
          {!historyLoading && history.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-8">변경 이력이 없습니다.</p>
          )}
          {history.map((h, idx) => (
            <div key={idx} className="flex gap-3 text-sm">
              <div className="flex-shrink-0 mt-1">
                <div className="w-2 h-2 rounded-full bg-blue-400 mt-1.5" />
              </div>
              <div className="flex-1 pb-3 border-b border-gray-100">
                <p className="font-medium text-gray-800">
                  {h.changeType === 'created' ? '📝 생성됨' :
                   h.changeType === 'edited' ? '✏️ 수정됨' :
                   h.changeType === 'moved' ? '📍 위치 이동' :
                   h.changeType === 'archived' ? '🗄️ 보관됨' :
                   h.changeType === 'approved' ? '✅ 승인됨' :
                   h.changeType === 'rejected' ? '❌ 거부됨' :
                   h.changeType}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {h.changedBy} &middot; {new Date(h.changedAt).toLocaleString('ko-KR')}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'info' && (<>
        {/* Rejection reason */}
        {(pin as any).status === 'rejected' && (pin as any).rejectionReason && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            <p className="font-medium mb-1">거부 사유</p>
            <p>{(pin as any).rejectionReason}</p>
          </div>
        )}

        {/* Location */}
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">위치</p>
          <p className="text-sm text-gray-700 mt-1">
            {pin.location.lat.toFixed(6)}, {pin.location.lng.toFixed(6)}
          </p>
        </div>

        {/* Korean Name */}
        {pin.name.en && pin.name.en !== pin.name.ko && (
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">English Name</p>
            <p className="text-sm text-gray-700 mt-1">{pin.name.en}</p>
          </div>
        )}

        {/* Description */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">설명</p>
            {!studentMode && (
              <button
                onClick={handleGenerateAI}
                disabled={generatingAI}
                className="text-xs text-blue-600 hover:text-blue-800 disabled:opacity-50 flex items-center gap-1"
              >
                {generatingAI ? '생성 중...' : '🤖 AI 생성'}
              </button>
            )}
          </div>
          {pin.description?.ko ? (
            <p className="text-sm text-gray-700 leading-relaxed">{pin.description.ko}</p>
          ) : (
            <p className="text-sm text-gray-400 italic">설명이 없습니다.</p>
          )}
          {pin.description?.en && (
            <p className="text-sm text-gray-500 mt-2 italic leading-relaxed">{pin.description.en}</p>
          )}
        </div>

        {/* Images */}
        {pin.images && pin.images.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">이미지</p>
            <div className="grid grid-cols-2 gap-2">
              {pin.images.map((image, idx) => (
                <a
                  key={idx}
                  href={image.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="aspect-square bg-gray-200 rounded overflow-hidden hover:opacity-80 block"
                >
                  {image.thumbnailUrl ? (
                    <img
                      src={image.thumbnailUrl}
                      alt={`이미지 ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-500 text-2xl">
                      📷
                    </div>
                  )}
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Metadata */}
        <div className="pt-2 border-t text-xs text-gray-400 space-y-0.5">
          <p>작성: {pin.createdBy || '알 수 없음'}</p>
          <p>생성: {pin.createdAt
            ? new Date(
                typeof pin.createdAt === 'object' && 'toDate' in pin.createdAt
                  ? (pin.createdAt as any).toDate()
                  : pin.createdAt
              ).toLocaleDateString('ko-KR')
            : '-'}
          </p>
          {(pin as any).descriptionSource === 'ai' && (
            <p className="text-blue-400">🤖 AI 생성 설명</p>
          )}
        </div>
      </>)}
      </div>

      {/* Actions */}
      {!studentMode && (
        <div className="border-t p-4 flex gap-2">
          <button
            onClick={() => pin && onEdit?.(pin)}
            className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm font-medium"
          >
            ✏️ 편집
          </button>
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 text-sm font-medium"
          >
            {isDeleting ? '삭제 중...' : '🗑️ 삭제'}
          </button>
        </div>
      )}
    </div>
  );
}
