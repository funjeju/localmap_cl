'use client';

import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, query, where, orderBy } from 'firebase/firestore';
import { getIdToken } from 'firebase/auth';
import { db, auth } from '@/lib/firebase/config';
import { useAuthStore } from '@/stores/authStore';
import type { Pin } from '@/lib/types';

interface PinValidationQueueProps {
  tenantId: string;
  onClose: () => void;
}

export default function PinValidationQueue({ tenantId, onClose }: PinValidationQueueProps) {
  const { user } = useAuthStore();
  const [pendingPins, setPendingPins] = useState<Pin[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState<Record<string, string>>({});
  const [showRejectInput, setShowRejectInput] = useState<string | null>(null);

  useEffect(() => {
    if (!tenantId) return;

    const q = query(
      collection(db, 'tenants', tenantId, 'pins'),
      where('status', '==', 'pending_review'),
      orderBy('createdAt', 'desc')
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const pins = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Pin));
      setPendingPins(pins);
      setLoading(false);
    }, (err) => {
      console.error('Failed to load pending pins:', err);
      setLoading(false);
    });

    return () => unsub();
  }, [tenantId]);

  const callPinAction = async (pinId: string, action: 'approve' | 'reject', rejectionReason?: string) => {
    let token: string | undefined;
    try {
      if (auth.currentUser) token = await getIdToken(auth.currentUser);
    } catch { /* proceed without token */ }

    const res = await fetch(`/api/tenant/${tenantId}/pins/${pinId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ action, rejectionReason }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || '처리에 실패했습니다.');
    }
  };

  const handleApprove = async (pinId: string) => {
    setProcessingId(pinId);
    try {
      await callPinAction(pinId, 'approve');
    } catch (err: any) {
      console.error('Approve failed:', err);
      alert(err?.message || '승인에 실패했습니다.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (pinId: string) => {
    const reason = rejectReason[pinId]?.trim();
    if (!reason) {
      alert('거부 사유를 입력해주세요.');
      return;
    }
    setProcessingId(pinId);
    try {
      await callPinAction(pinId, 'reject', reason);
      setShowRejectInput(null);
      setRejectReason(prev => { const n = { ...prev }; delete n[pinId]; return n; });
    } catch (err: any) {
      console.error('Reject failed:', err);
      alert(err?.message || '거부에 실패했습니다.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleBatchApprove = async () => {
    if (!confirm(`${pendingPins.length}개 핀을 모두 승인하시겠습니까?`)) return;
    for (const pin of pendingPins) {
      await handleApprove(pin.id);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col">
        {/* 헤더 */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div>
            <h2 className="text-lg font-bold">학생 핀 검증 대기</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {loading ? '불러오는 중...' : `${pendingPins.length}개 대기 중`}
            </p>
          </div>
          <div className="flex gap-2">
            {pendingPins.length > 0 && (
              <button
                onClick={handleBatchApprove}
                disabled={!!processingId}
                className="px-3 py-1.5 bg-green-600 text-white rounded text-sm font-medium hover:bg-green-700 disabled:opacity-50"
              >
                전체 승인
              </button>
            )}
            <button
              onClick={onClose}
              className="px-3 py-1.5 border rounded text-sm text-gray-600 hover:bg-gray-50"
            >
              닫기
            </button>
          </div>
        </div>

        {/* 목록 */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading && (
            <div className="flex items-center justify-center py-12 text-gray-400">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-400 mr-3" />
              불러오는 중...
            </div>
          )}

          {!loading && pendingPins.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <span className="text-4xl mb-3">✅</span>
              <p className="text-base font-medium">검증 대기 중인 핀이 없습니다</p>
              <p className="text-sm mt-1">학생들이 핀을 제출하면 여기에 표시됩니다.</p>
            </div>
          )}

          {pendingPins.map((pin) => (
            <div key={pin.id} className="border rounded-lg p-4 bg-gray-50 space-y-3">
              {/* 핀 정보 */}
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 truncate">
                    {pin.name?.ko || pin.name?.en || '이름 없음'}
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    📍 {pin.location?.lat?.toFixed(5)}, {pin.location?.lng?.toFixed(5)}
                  </p>
                  {pin.description?.ko && (
                    <p className="text-sm text-gray-600 mt-1 line-clamp-2">{pin.description.ko}</p>
                  )}
                  {pin.images && pin.images.length > 0 && (
                    <p className="text-xs text-blue-600 mt-1">📷 사진 {pin.images.length}장</p>
                  )}
                  <p className="text-xs text-gray-400 mt-1">
                    제출자: {pin.createdBy || '알 수 없음'} &nbsp;·&nbsp;
                    {pin.createdAt
                      ? new Date(
                          typeof pin.createdAt === 'object' && 'toDate' in pin.createdAt
                            ? (pin.createdAt as any).toDate()
                            : pin.createdAt
                        ).toLocaleString('ko-KR')
                      : ''}
                  </p>
                </div>

                {/* 사진 썸네일 */}
                {pin.images && pin.images.length > 0 && (
                  <div className="ml-3 flex-shrink-0">
                    <img
                      src={pin.images[0].thumbnailUrl || pin.images[0].url}
                      alt="핀 사진"
                      className="w-16 h-16 rounded object-cover border"
                    />
                  </div>
                )}
              </div>

              {/* 거부 사유 입력 */}
              {showRejectInput === pin.id && (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={rejectReason[pin.id] || ''}
                    onChange={e => setRejectReason(prev => ({ ...prev, [pin.id]: e.target.value }))}
                    placeholder="거부 사유 입력 (학생에게 전달됩니다)"
                    className="flex-1 border rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-300"
                    autoFocus
                    onKeyDown={e => e.key === 'Enter' && handleReject(pin.id)}
                  />
                  <button
                    onClick={() => handleReject(pin.id)}
                    disabled={processingId === pin.id}
                    className="px-3 py-1.5 bg-red-500 text-white rounded text-sm hover:bg-red-600 disabled:opacity-50"
                  >
                    거부
                  </button>
                  <button
                    onClick={() => setShowRejectInput(null)}
                    className="px-3 py-1.5 border rounded text-sm text-gray-600 hover:bg-gray-50"
                  >
                    취소
                  </button>
                </div>
              )}

              {/* 액션 버튼 */}
              {showRejectInput !== pin.id && (
                <div className="flex gap-2">
                  <button
                    onClick={() => handleApprove(pin.id)}
                    disabled={!!processingId}
                    className="flex-1 py-2 bg-green-600 text-white rounded text-sm font-medium hover:bg-green-700 disabled:opacity-50"
                  >
                    {processingId === pin.id ? '처리 중...' : '✓ 승인'}
                  </button>
                  <button
                    onClick={() => setShowRejectInput(pin.id)}
                    disabled={!!processingId}
                    className="flex-1 py-2 bg-red-100 text-red-700 rounded text-sm font-medium hover:bg-red-200 disabled:opacity-50"
                  >
                    ✗ 거부
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
