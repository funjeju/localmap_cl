'use client';

import React, { useEffect, useState } from 'react';
import { useMapStore } from '@/stores/mapStore';
import { useAuthStore } from '@/stores/authStore';
import { doc, onSnapshot, collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { Pin } from '@/lib/firebase/models';
import { addPin, deletePin, updatePin } from '@/lib/firebase/pins';
import { calculateGeoHash } from '@/lib/geo/hash';
import { uploadPinImage } from '@/lib/firebase/storage';
import { getPinHistory } from '@/lib/firebase/history';
import ShareModal from './ShareModal';
import type { Layer, MediaRef, PinHistory } from '@/lib/types';

export default function PropertyPanel({ tenantId }: { tenantId: string }) {
  const { user } = useAuthStore();
  const selectedPinId = useMapStore((state) => state.selectedPinId);
  const draftPinLocation = useMapStore((state) => state.draftPinLocation);
  const studentMode = useMapStore((state) => state.studentMode);
  const setSelectedPinId = useMapStore((state) => state.setSelectedPinId);
  const setDraftPinLocation = useMapStore((state) => state.setDraftPinLocation);

  const [pin, setPin] = useState<Pin | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [layers, setLayers] = useState<Layer[]>([]);
  const [draftName, setDraftName] = useState('');
  const [draftDesc, setDraftDesc] = useState('');
  const [draftLayerId, setDraftLayerId] = useState('');
  const [draftImages, setDraftImages] = useState<string[]>([]);
  const [history, setHistory] = useState<PinHistory[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [expandedImageIndex, setExpandedImageIndex] = useState<number | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareUrl, setShareUrl] = useState('');

  // Load layers
  useEffect(() => {
    if (!tenantId) return;

    const loadLayers = async () => {
      try {
        const layersRef = collection(db, 'tenants', tenantId, 'layers');
        const snapshot = await getDocs(layersRef);
        const layersList = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as Layer);
        setLayers(layersList.sort((a, b) => a.order - b.order));

        // Set default layer
        if (layersList.length > 0 && !draftLayerId) {
          setDraftLayerId(layersList[0].id);
        }
      } catch (err) {
        console.error('Failed to load layers:', err);
      }
    };

    loadLayers();
  }, [tenantId]);

  // Listen to selected pin
  useEffect(() => {
    if (!selectedPinId) {
      setPin(null);
      setHistory([]);
      return;
    }

    const unsub = onSnapshot(doc(db, 'tenants', tenantId, 'pins', selectedPinId), (docSnap) => {
      if (docSnap.exists()) {
        const pinData = docSnap.data() as Pin;
        setPin(pinData);

        // Load history
        getPinHistory(tenantId, selectedPinId).then((h) => setHistory(h));
      } else {
        setPin(null);
        setHistory([]);
      }
    });

    return () => unsub();
  }, [selectedPinId, tenantId]);

  const handleCreatePin = async () => {
    if (!draftPinLocation || !draftName || !draftLayerId) return;
    setLoading(true);
    try {
      // Create pin first
      const newPinId = await addPin(tenantId, {
        layerId: draftLayerId,
        name: { ko: draftName },
        description: { ko: draftDesc },
        location: {
          lat: draftPinLocation.lat,
          lng: draftPinLocation.lng,
          geohash: calculateGeoHash(draftPinLocation.lat, draftPinLocation.lng)
        },
        descriptionSource: 'manual',
        images: [],
        audioNotes: [],
        source: { type: 'teacher' },
        createdBy: user?.uid || 'unknown',
      });

      // Record activity
      await fetch(`/api/tenant/${tenantId}/activity`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.uid || 'unknown',
          userEmail: user?.email || '',
          action: 'create',
          targetType: 'pin',
          targetName: draftName,
        }),
      }).catch(err => console.error('Activity log error:', err));

      // Upload images if any
      if (draftImages.length > 0) {
        const uploadedImages: any[] = [];
        let uploadErrors = false;

        for (const base64 of draftImages) {
          try {
            // Convert base64 to blob
            const response = await fetch(base64);
            const blob = await response.blob();
            const file = new File([blob], 'image.jpg', { type: 'image/jpeg' });

            const { url, thumbnailUrl } = await uploadPinImage(tenantId, newPinId, file);
            uploadedImages.push({
              url,
              thumbnailUrl,
              caption: undefined,
              uploadedBy: 'teacher',
              uploadedAt: new Date(),
            });
          } catch (imgErr) {
            console.error('Image upload error:', imgErr);
            uploadErrors = true;
          }
        }

        // Update pin with uploaded images
        if (uploadedImages.length > 0) {
          await updatePin(tenantId, newPinId, { images: uploadedImages as any });
        }

        if (uploadErrors) {
          alert('일부 사진 업로드에 실패했습니다.');
        }
      }

      setDraftPinLocation(null);
      setDraftName('');
      setDraftDesc('');
      setDraftLayerId(layers[0]?.id || '');
      setDraftImages([]);
      setSelectedPinId(newPinId);
    } catch (err: any) {
      console.error('PIN 생성 오류:', err);
      alert(err?.message || '핀 생성에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
  };

  const handleEditPin = async () => {
    if (!selectedPinId || !pin) return;
    setLoading(true);
    try {
      await updatePin(tenantId, selectedPinId, {
        name: { ko: draftName || pin.name.ko },
        description: { ko: draftDesc || pin.description?.ko },
      }, user?.uid);
      setDraftName('');
      setDraftDesc('');
      alert('위치가 수정되었습니다.');
    } catch (err: any) {
      console.error('위치 수정 오류:', err);
      alert(err?.message || '위치 수정에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePin = async () => {
    if (!selectedPinId) return;
    if (!confirm('이 위치를 삭제하시겠습니까?')) return;

    try {
      await deletePin(tenantId, selectedPinId);
      setSelectedPinId(null);
    } catch (err: any) {
      console.error('위치 삭제 오류:', err);
      alert(err?.message || '위치 삭제에 실패했습니다. 다시 시도해주세요.');
    }
  };

  const handleSharePin = async () => {
    if (!selectedPinId || !pin) return;

    try {
      const response = await fetch('/api/shares/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId,
          pinId: selectedPinId,
          title: pin.name.ko || pin.name.en || '탐방 위치',
          description: pin.description?.ko || pin.description?.en,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || '공유 링크 생성에 실패했습니다.');
      }

      setShareUrl(data.shareUrl);
      setShowShareModal(true);
    } catch (error: any) {
      console.error('Share error:', error);
      alert(error?.message || '공유 링크 생성에 실패했습니다.');
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      alert('사진 크기가 너무 큽니다. 10MB 이하여야 합니다.');
      return;
    }

    if (!file.type.startsWith('image/')) {
      alert('사진 파일만 업로드 가능합니다.');
      return;
    }

    setUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        setDraftImages([...draftImages, base64]);
      };
      reader.onerror = () => {
        alert('사진을 읽을 수 없습니다. 다시 시도해주세요.');
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      console.error('사진 업로드 오류:', err);
      alert(err?.message || '사진 처리 중 오류가 발생했습니다.');
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (index: number) => {
    setDraftImages(draftImages.filter((_, i) => i !== index));
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
              <label className="text-xs font-semibold text-muted-foreground">카테고리</label>
              <select
                className="w-full mt-1 border rounded p-2 text-sm"
                value={draftLayerId}
                onChange={(e) => setDraftLayerId(e.target.value)}
              >
                {layers.map((layer) => (
                  <option key={layer.id} value={layer.id}>
                    {layer.icon} {layer.name.ko || layer.name.en}
                  </option>
                ))}
              </select>
            </div>
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
              <label className="text-xs font-semibold text-muted-foreground">사진 {draftImages.length > 0 && `(${draftImages.length})`}</label>
              {draftImages.length > 0 && (
                <div className="mt-2 grid grid-cols-4 gap-2">
                  {draftImages.map((img, idx) => (
                    <div key={idx} className="relative group">
                      <img
                        src={img}
                        alt={`preview-${idx}`}
                        loading="lazy"
                        className="h-16 w-16 rounded object-cover border"
                      />
                      <button
                        onClick={() => removeImage(idx)}
                        className="absolute inset-0 bg-black/50 rounded opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                      >
                        <span className="text-white text-sm font-medium">삭제</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                disabled={uploading}
                className="w-full mt-2 text-xs"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground">위치 좌표</label>
              <div className="text-xs text-muted-foreground mt-1 bg-muted p-2 rounded">
                Lat: {draftPinLocation.lat.toFixed(6)}
                <br />
                Lng: {draftPinLocation.lng.toFixed(6)}
              </div>
            </div>
            <button
              onClick={handleCreatePin}
              disabled={loading || uploading || !draftName || !draftLayerId}
              className="w-full py-2 bg-primary text-primary-foreground rounded font-medium disabled:opacity-50"
            >
              {loading ? '추가 중...' : uploading ? '사진 업로드 중...' : '이 위치에 핀 추가하기'}
            </button>
          </div>
        )}

        {selectedPinId && (
          pin ? (
            <div className="space-y-4">
              {studentMode ? (
                <>
                  <div>
                    <h3 className="text-lg font-bold">{pin.name.ko || pin.name.en}</h3>
                    <p className="text-sm text-muted-foreground mt-2">
                      {pin.description?.ko || pin.description?.en || '설명이 없습니다.'}
                    </p>
                  </div>
                  {pin.images && pin.images.length > 0 && (
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground">사진 ({pin.images.length})</label>
                      <div className="mt-2 grid grid-cols-4 gap-2">
                        {pin.images.map((img, idx) => (
                          <button
                            key={idx}
                            onClick={() => setExpandedImageIndex(idx)}
                            className="h-16 w-16 rounded object-cover border hover:opacity-80 transition-opacity overflow-hidden"
                          >
                            <img
                              src={img.thumbnailUrl || img.url}
                              alt={`pin-${idx}`}
                              loading="lazy"
                              className="h-full w-full object-cover"
                            />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="pt-4 border-t border-muted">
                    <label className="text-xs font-semibold text-muted-foreground">출처</label>
                    <div className="mt-1 text-xs bg-muted p-2 rounded">
                      {pin.source.type === 'teacher'
                        ? '선생님 작성'
                        : pin.source.type === 'ai_generated'
                        ? '자동 생성 (AI)'
                        : '학생 작성'}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground mb-2 block">
                      이름
                    </label>
                    <input
                      type="text"
                      className="w-full border rounded p-2 text-sm"
                      defaultValue={pin.name.ko || pin.name.en || ''}
                      onChange={(e) => setDraftName(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground mb-2 block">
                      설명
                    </label>
                    <textarea
                      className="w-full border rounded p-2 text-sm h-24"
                      defaultValue={pin.description?.ko || pin.description?.en || ''}
                      onChange={(e) => setDraftDesc(e.target.value)}
                    />
                  </div>
                  <div className="pt-4 border-t border-muted">
                    <label className="text-xs font-semibold text-muted-foreground">레이어</label>
                    <div className="mt-1 text-sm">{pin.layerId}</div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground">데이터 출처</label>
                    <div className="mt-1 text-xs bg-muted p-2 rounded">
                      {pin.source.type === 'teacher'
                        ? '선생님 작성'
                        : pin.source.type === 'ai_generated'
                        ? '자동 생성 (AI)'
                        : '학생 작성'}
                    </div>
                  </div>

                  <div className="pt-4 flex flex-col gap-2">
                    <div className="flex gap-2">
                      <button
                        onClick={handleEditPin}
                        disabled={loading}
                        className="flex-1 py-2 border rounded font-medium text-sm hover:bg-gray-50"
                      >
                        {loading ? '저장 중...' : '저장'}
                      </button>
                      <button
                        onClick={() => setShowHistory(!showHistory)}
                        className="flex-1 py-2 border rounded font-medium text-sm hover:bg-gray-50"
                      >
                        {showHistory ? '닫기' : '이력'}
                      </button>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={handleSharePin}
                        className="flex-1 py-2 border rounded font-medium text-sm hover:bg-gray-50"
                      >
                        🔗 공유
                      </button>
                      <button
                        onClick={handleDeletePin}
                        className="flex-1 py-2 bg-destructive text-destructive-foreground rounded font-medium text-sm"
                      >
                        삭제
                      </button>
                    </div>
                  </div>

                  {showHistory && history.length > 0 && (
                    <div className="pt-4 border-t border-muted">
                      <label className="text-xs font-semibold text-muted-foreground mb-3 block">
                        변경 이력
                      </label>
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {history.map((entry, idx) => (
                          <div key={idx} className="text-xs bg-muted p-2 rounded">
                            <div className="font-medium">
                              {entry.changeType === 'created'
                                ? '생성됨'
                                : entry.changeType === 'edited'
                                ? '수정됨'
                                : entry.changeType === 'moved'
                                ? '이동됨'
                                : entry.changeType}
                            </div>
                            <div className="text-gray-600 mt-1">
                              {new Date(entry.changedAt).toLocaleString('ko-KR')}
                            </div>
                            <div className="text-gray-600">
                              변경자: {entry.changedBy}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">장소 정보를 불러오는 중입니다...</div>
          )
        )}
      </div>

      {/* Image Lightbox Modal */}
      {expandedImageIndex !== null && pin?.images && pin.images.length > 0 && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setExpandedImageIndex(null)}
        >
          <div
            className="bg-white rounded-lg max-w-2xl w-full shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center p-4 border-b">
              <div className="text-sm text-muted-foreground">
                {expandedImageIndex + 1} / {pin.images.length}
              </div>
              <button
                onClick={() => setExpandedImageIndex(null)}
                className="text-muted-foreground hover:text-foreground text-xl"
              >
                ✕
              </button>
            </div>

            <div className="flex items-center justify-center bg-gray-100 min-h-96">
              <img
                src={pin.images[expandedImageIndex].url}
                alt={`pin-${expandedImageIndex}`}
                className="max-h-96 max-w-full object-contain"
              />
            </div>

            <div className="p-4 border-t space-y-3">
              {pin.images[expandedImageIndex].caption && (
                <div>
                  <p className="text-xs text-muted-foreground font-medium mb-1">캡션</p>
                  <p className="text-sm">
                    {typeof pin.images[expandedImageIndex].caption === 'string'
                      ? pin.images[expandedImageIndex].caption
                      : (pin.images[expandedImageIndex].caption as any)?.ko ||
                        (pin.images[expandedImageIndex].caption as any)?.en ||
                        (pin.images[expandedImageIndex].caption as any)?.ja
                    }
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 text-xs text-muted-foreground">
                <div>
                  <p className="font-medium">업로더</p>
                  <p>{pin.images[expandedImageIndex].uploadedBy === 'teacher' ? '선생님' : pin.images[expandedImageIndex].uploadedBy === 'ai' ? 'AI' : '학생'}</p>
                </div>
                <div>
                  <p className="font-medium">업로드 날짜</p>
                  <p>
                    {pin.images[expandedImageIndex].uploadedAt
                      ? new Date(typeof pin.images[expandedImageIndex].uploadedAt === 'object'
                          && 'toDate' in pin.images[expandedImageIndex].uploadedAt
                          ? pin.images[expandedImageIndex].uploadedAt.toDate()
                          : pin.images[expandedImageIndex].uploadedAt
                        ).toLocaleDateString('ko-KR')
                      : '정보 없음'
                    }
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-2 p-4 border-t">
              <button
                onClick={() => setExpandedImageIndex(Math.max(0, expandedImageIndex - 1))}
                disabled={expandedImageIndex === 0}
                className="flex-1 py-2 border rounded font-medium text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ← 이전
              </button>
              <button
                onClick={() => setExpandedImageIndex(Math.min(pin.images.length - 1, expandedImageIndex + 1))}
                disabled={expandedImageIndex === pin.images.length - 1}
                className="flex-1 py-2 border rounded font-medium text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                다음 →
              </button>
            </div>
          </div>
        </div>
      )}

      <ShareModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        title={pin ? (pin.name.ko || pin.name.en || '탐방 위치') : '탐방 위치'}
        shareUrl={shareUrl}
      />
    </aside>
  );
}
