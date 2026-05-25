'use client';

import React, { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { useAuthStore } from '@/stores/authStore';
import { useMapStore } from '@/stores/mapStore';

interface StudentPin {
  id: string;
  name: { ko?: string; en?: string };
  status: 'pending_review' | 'active' | 'rejected';
  rejectionReason?: string;
  createdAt: any;
}

export default function StudentPinStatusPanel({ tenantId }: { tenantId: string }) {
  const { user } = useAuthStore();
  const studentMode = useMapStore((state) => state.studentMode);
  const setSelectedPinId = useMapStore((state) => state.setSelectedPinId);
  const [pins, setPins] = useState<StudentPin[]>([]);
  const [open, setOpen] = useState(false);
  const [newCount, setNewCount] = useState(0);

  useEffect(() => {
    if (!tenantId || !user || !studentMode) return;

    const q = query(
      collection(db, 'tenants', tenantId, 'pins'),
      where('createdBy', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as StudentPin));
      setPins(list);
      // Count pending + recently resolved (active/rejected within last session)
      const alertable = list.filter((p) => p.status === 'pending_review' || p.status === 'rejected');
      setNewCount(alertable.length);
    });

    return () => unsub();
  }, [tenantId, user, studentMode]);

  if (!studentMode || !user) return null;

  const pending = pins.filter((p) => p.status === 'pending_review');
  const approved = pins.filter((p) => p.status === 'active');
  const rejected = pins.filter((p) => p.status === 'rejected');

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => { setOpen(true); setNewCount(0); }}
        className="fixed top-20 right-4 z-20 bg-white border shadow-md rounded-full px-3 py-2 text-sm font-medium flex items-center gap-1.5 hover:bg-gray-50"
      >
        📋 내 핀
        {newCount > 0 && (
          <span className="bg-yellow-400 text-yellow-900 text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
            {newCount > 9 ? '9+' : newCount}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <h2 className="font-bold text-base">내가 제출한 핀</h2>
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
              {pins.length === 0 && (
                <p className="text-center text-gray-400 py-8 text-sm">아직 제출한 핀이 없습니다.</p>
              )}

              {rejected.length > 0 && (
                <div className="mb-3">
                  <p className="text-xs font-semibold text-red-600 mb-1.5">거부됨 ({rejected.length})</p>
                  {rejected.map((pin) => (
                    <div key={pin.id} className="p-3 bg-red-50 border border-red-200 rounded-lg mb-2">
                      <p className="text-sm font-medium text-gray-900">{pin.name?.ko || pin.name?.en || '이름 없음'}</p>
                      {pin.rejectionReason && (
                        <p className="text-xs text-red-600 mt-1">사유: {pin.rejectionReason}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {pending.length > 0 && (
                <div className="mb-3">
                  <p className="text-xs font-semibold text-yellow-600 mb-1.5">검토 대기 ({pending.length})</p>
                  {pending.map((pin) => (
                    <div key={pin.id} className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg mb-2 flex items-center gap-2">
                      <span className="text-yellow-500 flex-shrink-0">⏳</span>
                      <p className="text-sm text-gray-800">{pin.name?.ko || pin.name?.en || '이름 없음'}</p>
                    </div>
                  ))}
                </div>
              )}

              {approved.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-green-600 mb-1.5">승인됨 ({approved.length})</p>
                  {approved.map((pin) => (
                    <button
                      key={pin.id}
                      onClick={() => { setSelectedPinId(pin.id); setOpen(false); }}
                      className="w-full p-3 bg-green-50 border border-green-200 rounded-lg mb-2 flex items-center gap-2 hover:bg-green-100 text-left"
                    >
                      <span className="text-green-500 flex-shrink-0">✅</span>
                      <p className="text-sm text-gray-800">{pin.name?.ko || pin.name?.en || '이름 없음'}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
