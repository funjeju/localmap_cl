'use client';

import React, { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { useMapStore } from '@/stores/mapStore';
import { deleteDoc } from 'firebase/firestore';
import type { Pin, Layer } from '@/lib/types';

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
  const setSelectedPinId = useMapStore((state) => state.setSelectedPinId);

  useEffect(() => {
    if (!pinId || !tenantId) return;

    setLoading(true);
    const loadPin = async () => {
      try {
        const pinRef = doc(db, 'tenants', tenantId, 'pins', pinId);
        const pinSnap = await getDoc(pinRef);
        if (pinSnap.exists()) {
          setPin(pinSnap.data() as Pin);
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
      const pinRef = doc(db, 'tenants', tenantId, 'pins', pinId);
      await deleteDoc(pinRef);
      setSelectedPinId(null);
    } catch (error) {
      console.error('Delete error:', error);
      alert('삭제에 실패했습니다.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEdit = () => {
    if (pin && onEdit) {
      onEdit(pin);
    }
  };

  const getLayerName = (layerId: string) => {
    return layers.find(l => l.id === layerId)?.name.ko || '미분류';
  };

  if (loading) {
    return (
      <div className="w-80 bg-white shadow-lg border-l flex flex-col">
        <div className="p-4">
          <p className="text-gray-500">로드 중...</p>
        </div>
      </div>
    );
  }

  if (!pin) {
    return (
      <div className="w-80 bg-white shadow-lg border-l flex flex-col">
        <div className="p-4">
          <p className="text-gray-500">핀을 불러올 수 없습니다.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-80 bg-white shadow-lg border-l flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b flex items-start justify-between">
        <div className="flex-1">
          <h2 className="text-lg font-bold text-gray-900">{pin.name.ko}</h2>
          <p className="text-sm text-gray-500 mt-1">{getLayerName(pin.layerId)}</p>
        </div>
        <button
          onClick={() => setSelectedPinId(null)}
          className="text-gray-400 hover:text-gray-600 text-xl leading-none"
        >
          ×
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Location */}
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase">위치</p>
          <p className="text-sm text-gray-700 mt-1">
            위도: {pin.location.lat.toFixed(6)}
            <br />
            경도: {pin.location.lng.toFixed(6)}
          </p>
        </div>

        {/* English Name */}
        {pin.name.en && (
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase">English Name</p>
            <p className="text-sm text-gray-700 mt-1">{pin.name.en}</p>
          </div>
        )}

        {/* Description */}
        {pin.description.ko && (
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase">설명</p>
            <p className="text-sm text-gray-700 mt-1 leading-relaxed">
              {pin.description.ko}
            </p>
          </div>
        )}

        {pin.description.en && (
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase">Description</p>
            <p className="text-sm text-gray-700 mt-1 leading-relaxed">
              {pin.description.en}
            </p>
          </div>
        )}

        {/* Images */}
        {pin.images && pin.images.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase">이미지</p>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {pin.images.map((image, idx) => (
                <a
                  key={idx}
                  href={image.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="aspect-square bg-gray-200 rounded overflow-hidden hover:opacity-80"
                >
                  {image.thumbnailUrl ? (
                    <img
                      src={image.thumbnailUrl}
                      alt={`Image ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-500">
                      📷
                    </div>
                  )}
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Metadata */}
        <div className="pt-2 border-t">
          <p className="text-xs text-gray-500">
            작성: {pin.createdBy}
            <br />
            생성: {new Date(pin.createdAt as any).toLocaleDateString('ko-KR')}
          </p>
        </div>
      </div>

      {/* Actions */}
      {!studentMode && (
        <div className="border-t p-4 flex gap-2">
          <button
            onClick={handleEdit}
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
