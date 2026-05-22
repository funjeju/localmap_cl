'use client';

import React, { useEffect, useState } from 'react';
import { useMapStore } from '@/stores/mapStore';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { Layer } from '@/lib/firebase/models';

export default function LayerFilterPanel({ tenantId }: { tenantId: string }) {
  const [layers, setLayers] = useState<Layer[]>([]);
  const toggleLayer = useMapStore((state) => state.toggleLayer);
  const visibleLayerIds = useMapStore((state) => state.visibleLayerIds);

  useEffect(() => {
    if (!tenantId) return;
    const unsub = onSnapshot(collection(db, 'tenants', tenantId, 'layers'), (snapshot) => {
      const fetchedLayers = snapshot.docs.map((doc) => doc.data() as Layer);
      fetchedLayers.sort((a, b) => a.order - b.order);
      setLayers(fetchedLayers);
      
      // Select all layers by default when loaded
      fetchedLayers.forEach(layer => {
        if (!visibleLayerIds.has(layer.id) && layer.isVisible) {
          toggleLayer(layer.id);
        }
      });
    });
    return () => unsub();
  }, [tenantId]); // Ignore visibleLayerIds dependency to avoid infinite toggle loops on mount

  return (
    <aside className="w-64 border-r bg-card flex flex-col z-10 h-full">
      <div className="p-4 border-b">
        <h2 className="font-semibold">레이어</h2>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {layers.length === 0 ? (
          <div className="text-sm text-muted-foreground">불러오는 중...</div>
        ) : (
          layers.map((layer) => (
            <label key={layer.id} className="flex items-center gap-2 cursor-pointer">
              <input 
                type="checkbox" 
                className="rounded" 
                checked={visibleLayerIds.has(layer.id)}
                onChange={() => toggleLayer(layer.id)}
              />
              <span style={{ color: layer.color }}>{layer.icon}</span>
              <span className="text-sm">{layer.name.ko || layer.name.en}</span>
            </label>
          ))
        )}
      </div>
      <div className="p-4 border-t">
        <button className="w-full py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90">
          + 새 레이어
        </button>
      </div>
    </aside>
  );
}
