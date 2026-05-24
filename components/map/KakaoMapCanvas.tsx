'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useMapStore } from '@/stores/mapStore';
import { subscribeToPins } from '@/lib/firebase/pins';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import type { Pin as FirebasePin, Layer } from '@/lib/firebase/models';
import type { Pin } from '@/lib/types';
import SearchModal from '@/components/map/SearchModal';
import MapStyleSelector from '@/components/map/MapStyleSelector';
import MapExportUI from '@/components/map/MapExportUI';

interface KakaoMapCanvasProps {
  tenantId: string;
  tenantCenter: { lat: number; lng: number };
  tenantRadius: number;
  locale?: string;
  isPublicShare?: boolean;
  highlightPinId?: string;
}

declare global {
  interface Window {
    kakao: any;
  }
}

export default function KakaoMapCanvas({
  tenantId,
  tenantCenter,
  tenantRadius,
  locale = 'ko',
  isPublicShare = false,
  highlightPinId,
}: KakaoMapCanvasProps) {
  const searchParams = useSearchParams();
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [pins, setPins] = useState<Pin[]>([]);
  const [layers, setLayers] = useState<Layer[]>([]);
  const [markerClusterer, setMarkerClusterer] = useState<any>(null);

  const visibleLayerIds = useMapStore((state) => state.visibleLayerIds);
  const selectedPinId = useMapStore((state) => state.selectedPinId);
  const setSelectedPinId = useMapStore((state) => state.setSelectedPinId);
  const setDraftPinLocation = useMapStore((state) => state.setDraftPinLocation);
  const setStudentMode = useMapStore((state) => state.setStudentMode);
  const draftPinLocation = useMapStore((state) => state.draftPinLocation);

  // Load Kakao Maps SDK
  useEffect(() => {
    const initMap = () => {
      if (!mapContainer.current || !window.kakao?.maps?.LatLng) return;

      const center = new window.kakao.maps.LatLng(tenantCenter.lat, tenantCenter.lng);
      const kakaoMap = new window.kakao.maps.Map(mapContainer.current, {
        center,
        level: 4,
      });
      mapRef.current = kakaoMap;
      setMapLoaded(true);

      // Kakao map tiles can render blank if the container had 0 size at init.
      // Force a relayout once the browser has applied layout, then recenter.
      requestAnimationFrame(() => {
        kakaoMap.relayout();
        kakaoMap.setCenter(center);
      });

      // Handle map click for creating draft pins
      window.kakao.maps.event.addListener(kakaoMap, 'click', (mouseEvent: any) => {
        if (!isPublicShare) {
          const latlng = mouseEvent.latLng;
          setDraftPinLocation({
            lat: latlng.getLat(),
            lng: latlng.getLng(),
          });
        }
      });
    };

    // Already fully loaded
    if (window.kakao?.maps?.LatLng) {
      initMap();
      return;
    }

    // SDK script present but maps namespace not yet initialized (autoload=false)
    if (window.kakao?.maps?.load) {
      window.kakao.maps.load(initMap);
      return;
    }

    const apiKey = process.env.NEXT_PUBLIC_KAKAO_MAP_KEY;
    if (!apiKey) {
      console.error('NEXT_PUBLIC_KAKAO_MAP_KEY가 설정되지 않았습니다');
      return;
    }

    const SCRIPT_ID = 'kakao-maps-sdk';
    let script = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
    const isNewScript = !script;

    if (!script) {
      script = document.createElement('script');
      script.id = SCRIPT_ID;
      script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${apiKey}&libraries=clustering&autoload=false`;
      script.async = true;
    }

    const handleLoad = () => {
      if (!window.kakao?.maps?.load) {
        console.error('Kakao Maps SDK loaded but maps.load is unavailable');
        return;
      }
      window.kakao.maps.load(initMap);
    };

    script.addEventListener('load', handleLoad);
    script.addEventListener('error', () => {
      console.error('Failed to load Kakao Maps SDK');
    });

    if (isNewScript) {
      document.head.appendChild(script);
    }

    return () => {
      script?.removeEventListener('load', handleLoad);
    };
  }, [tenantCenter, isPublicShare, setDraftPinLocation]);

  // Load layers
  useEffect(() => {
    if (!tenantId) return;
    const unsub = onSnapshot(collection(db, 'tenants', tenantId, 'layers'), (snapshot) => {
      const fetchedLayers = snapshot.docs.map((doc) => doc.data() as Layer);
      fetchedLayers.sort((a, b) => a.order - b.order);
      setLayers(fetchedLayers);
    });
    return () => unsub();
  }, [tenantId]);

  // Subscribe to pins
  useEffect(() => {
    if (!tenantId || !mapLoaded) return;

    const unsubscribe = subscribeToPins(tenantId, (pins) => {
      setPins(pins as unknown as Pin[]);

      if (!mapRef.current) return;

      // Clear existing markers
      if (markerClusterer) {
        markerClusterer.clear();
      }

      // Create markers
      const markers: any[] = [];
      pins.forEach((pin) => {
        // Filter by layer if filter is applied
        if (visibleLayerIds.size > 0 && !visibleLayerIds.has(pin.layerId)) {
          return;
        }

        const layer = layers.find((l) => l.id === pin.layerId);
        const markerImage = new window.kakao.maps.MarkerImage(
          `data:image/svg+xml;base64,${Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="32" height="32"><text x="12" y="18" font-size="20" text-anchor="middle">${layer?.icon || '📍'}</text></svg>`).toString('base64')}`,
          new window.kakao.maps.Size(32, 32),
          { offset: new window.kakao.maps.Point(16, 32) }
        );

        const marker = new window.kakao.maps.Marker({
          position: new window.kakao.maps.LatLng(pin.location.lat, pin.location.lng),
          image: markerImage,
          title: pin.name.ko || pin.name.en,
        });

        window.kakao.maps.event.addListener(marker, 'click', () => {
          if (!isPublicShare) {
            setSelectedPinId(pin.id);
          }
          // Pan to marker
          mapRef.current?.panTo(marker.getPosition());
        });

        markers.push(marker);
      });

      // Create clusterer
      const clusterer = new window.kakao.maps.MarkerClusterer({
        map: mapRef.current,
        averageCenter: true,
        minLevel: 10,
      });
      clusterer.addMarkers(markers);
      setMarkerClusterer(clusterer);
    }, 100); // Load max 100 pins for performance

    return () => unsubscribe();
  }, [tenantId, mapLoaded, visibleLayerIds, layers, isPublicShare, setSelectedPinId]);

  // Relayout map when container size changes (sidebar toggle, window resize, etc.)
  useEffect(() => {
    if (!mapLoaded || !mapContainer.current || !mapRef.current) return;
    const target = mapContainer.current;
    const observer = new ResizeObserver(() => {
      const center = mapRef.current?.getCenter();
      mapRef.current?.relayout();
      if (center) mapRef.current?.setCenter(center);
    });
    observer.observe(target);
    return () => observer.disconnect();
  }, [mapLoaded]);

  // Handle draft pin marker
  useEffect(() => {
    if (!mapRef.current || !mapLoaded || !draftPinLocation) return;

    const draftSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="32" height="32"><text x="12" y="18" font-size="20" text-anchor="middle">📍</text></svg>`;
    const marker = new window.kakao.maps.Marker({
      position: new window.kakao.maps.LatLng(draftPinLocation.lat, draftPinLocation.lng),
      image: new window.kakao.maps.MarkerImage(
        `data:image/svg+xml;base64,${Buffer.from(draftSvg).toString('base64')}`,
        new window.kakao.maps.Size(32, 32),
        { offset: new window.kakao.maps.Point(16, 32) }
      ),
    });
    marker.setMap(mapRef.current);

    return () => {
      marker.setMap(null);
    };
  }, [draftPinLocation, mapLoaded]);

  return (
    <div className="w-full h-full relative flex">
      <div ref={mapContainer} className="absolute inset-0 flex-1" />
      <SearchModal pins={pins} onSelectPin={(pinId) => setSelectedPinId(pinId)} />
      <MapStyleSelector />
      <MapExportUI mapRef={mapContainer} />
    </div>
  );
}
