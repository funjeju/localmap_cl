'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';

interface Collaborator {
  userId: string;
  email: string;
  role: 'owner' | 'editor' | 'viewer';
  joinedAt: Date;
  isOnline?: boolean;
}

interface CollaborationModalProps {
  isOpen: boolean;
  onClose: () => void;
  tenantId: string;
}

export default function CollaborationModal({ isOpen, onClose, tenantId }: CollaborationModalProps) {
  const params = useParams();
  const locale = (params.locale as string) || 'ko';
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'editor' | 'viewer'>('viewer');
  const [loading, setLoading] = useState(false);
  const [inviteLoading, setInviteLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const loadCollaborators = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/tenant/${tenantId}/collaborators`);
        const data = await response.json();

        if (response.ok) {
          setCollaborators(data.collaborators || []);
        }
      } catch (error) {
        console.error('Failed to load collaborators:', error);
      } finally {
        setLoading(false);
      }
    };

    loadCollaborators();
  }, [isOpen, tenantId]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

    setInviteLoading(true);
    try {
      const response = await fetch(`/api/tenant/${tenantId}/collaborators/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: inviteEmail,
          role: inviteRole,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || '초대에 실패했습니다.');
      }

      alert('초대 링크가 생성되었습니다!');
      setInviteEmail('');

      // Reload collaborators
      const listResponse = await fetch(`/api/tenant/${tenantId}/collaborators`);
      const listData = await listResponse.json();
      if (listResponse.ok) {
        setCollaborators(listData.collaborators || []);
      }
    } catch (error: any) {
      console.error('Invite error:', error);
      alert(error?.message || '초대에 실패했습니다.');
    } finally {
      setInviteLoading(false);
    }
  };

  const handleRemoveCollaborator = async (userId: string) => {
    if (!confirm('이 사용자를 제거하시겠습니까?')) return;

    try {
      const response = await fetch(
        `/api/tenant/${tenantId}/collaborators/${userId}`,
        { method: 'DELETE' }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || '제거에 실패했습니다.');
      }

      setCollaborators(collaborators.filter(c => c.userId !== userId));
    } catch (error: any) {
      console.error('Remove error:', error);
      alert(error?.message || '제거에 실패했습니다.');
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 space-y-4"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold">협업자 관리</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>

          {/* Current Collaborators */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-gray-700">현재 협업자</h3>
            {loading ? (
              <div className="text-sm text-gray-500">로드 중...</div>
            ) : collaborators.length === 0 ? (
              <div className="text-sm text-gray-500">협업자가 없습니다.</div>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {collaborators.map((collab) => (
                  <div
                    key={collab.userId}
                    className="flex items-center justify-between p-2 bg-gray-50 rounded border"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">
                            {collab.email}
                          </p>
                          <p className="text-xs text-gray-500">
                            {collab.role === 'owner'
                              ? '소유자'
                              : collab.role === 'editor'
                              ? '편집자'
                              : '보기만 가능'}
                          </p>
                        </div>
                        {collab.isOnline && (
                          <div className="w-2 h-2 bg-green-500 rounded-full" />
                        )}
                      </div>
                    </div>
                    {collab.role !== 'owner' && (
                      <button
                        onClick={() => handleRemoveCollaborator(collab.userId)}
                        className="px-2 py-1 text-xs text-red-600 hover:bg-red-50 rounded"
                      >
                        제거
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Invite Form */}
          <form onSubmit={handleInvite} className="space-y-3 border-t pt-4">
            <h3 className="text-sm font-semibold text-gray-700">새 사용자 초대</h3>

            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-2">
                이메일
              </label>
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="user@example.com"
                className="w-full border rounded p-2 text-sm"
                required
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-2">
                역할
              </label>
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as 'editor' | 'viewer')}
                className="w-full border rounded p-2 text-sm"
              >
                <option value="viewer">👁️ 보기만 가능</option>
                <option value="editor">✏️ 편집 가능</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={!inviteEmail.trim() || inviteLoading}
              className="w-full py-2 bg-blue-600 text-white rounded font-medium text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {inviteLoading ? '초대 중...' : '초대 링크 생성'}
            </button>
          </form>

          {/* Info */}
          <div className="bg-blue-50 p-3 rounded border border-blue-200">
            <p className="text-xs text-blue-700">
              💡 초대 링크는 이메일로 발송됩니다. <br/>
              사용자가 링크를 클릭하여 협업을 시작할 수 있습니다.
            </p>
          </div>

          {/* Close Button */}
          <button
            onClick={onClose}
            className="w-full py-2 border rounded font-medium text-sm hover:bg-gray-50"
          >
            닫기
          </button>
        </div>
      </div>
    </>
  );
}
