'use client';

import React, { useEffect, useState } from 'react';

interface Activity {
  id: string;
  userId: string;
  userEmail: string;
  action: 'create' | 'update' | 'delete' | 'edit';
  targetType: 'pin' | 'layer' | 'collaborator';
  targetName?: string;
  timestamp: Date | string;
}

interface ActivityFeedProps {
  tenantId: string;
}

const actionLabels: Record<string, string> = {
  create: '추가됨',
  update: '수정됨',
  delete: '삭제됨',
  edit: '편집됨',
};

const targetLabels: Record<string, string> = {
  pin: '📍 위치',
  layer: '🎨 레이어',
  collaborator: '👥 협업자',
};

export default function ActivityFeed({ tenantId }: ActivityFeedProps) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadActivities = async () => {
      try {
        const response = await fetch(`/api/tenant/${tenantId}/activity?limit=10`);
        const data = await response.json();

        if (response.ok) {
          setActivities(data.activities || []);
        }
      } catch (error) {
        console.error('Failed to load activities:', error);
      } finally {
        setLoading(false);
      }
    };

    loadActivities();

    // Refresh every 10 seconds
    const interval = setInterval(loadActivities, 10000);
    return () => clearInterval(interval);
  }, [tenantId]);

  const formatTime = (timestamp: Date | string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    if (diff < 60000) return '방금 전';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}분 전`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}시간 전`;
    return date.toLocaleDateString('ko-KR');
  };

  return (
    <div className="p-4 border-t">
      <h2 className="font-semibold mb-3 text-sm">최근 활동</h2>
      {loading ? (
        <div className="text-xs text-muted-foreground text-center">로드 중...</div>
      ) : activities.length === 0 ? (
        <div className="text-xs text-muted-foreground text-center">활동이 없습니다.</div>
      ) : (
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {activities.map((activity) => (
            <div
              key={activity.id}
              className="text-xs p-2 bg-muted/50 rounded hover:bg-muted transition-colors"
            >
              <div className="flex items-start gap-2">
                <span className="text-lg flex-shrink-0">
                  {targetLabels[activity.targetType] || '📝'}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground truncate">
                    {activity.targetName || `${activity.targetType} ${actionLabels[activity.action]}`}
                  </p>
                  <p className="text-muted-foreground truncate">
                    {activity.userEmail?.split('@')[0]} {actionLabels[activity.action]}
                  </p>
                  <p className="text-muted-foreground text-xs mt-1">
                    {formatTime(activity.timestamp)}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
