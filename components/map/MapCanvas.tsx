'use client';

import React, { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Protocol } from 'pmtiles';
import { useMapStore } from '@/stores/mapStore';
import { subscribeToPins } from '@/lib/firebase/pins';
import { Pin } from '@/lib/firebase/models';
import MapExportUI from '@/components/map/MapExportUI';

interface MapCanvasProps {
  tenantId: string;
  tenantCenter: { lat: number; lng: number };
  tenantRadius: number; // in meters
  locale?: string;
}

export default function MapCanvas({ tenantId, tenantCenter, tenantRadius, locale = 'ko' }: MapCanvasProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  
  const visibleLayerIds = useMapStore((state) => state.visibleLayerIds);
  const studentMode = useMapStore((state) => state.studentMode);
  const draftPinLocation = useMapStore((state) => state.draftPinLocation);
  const setSelectedPinId = useMapStore((state) => state.setSelectedPinId);
  const setDraftPinLocation = useMapStore((state) => state.setDraftPinLocation);
  
  const draftMarkerRef = useRef<maplibregl.Marker | null>(null);

  useEffect(() => {
    if (map.current || !mapContainer.current) return;

    // Initialize PMTiles protocol
    let protocol = new Protocol();
    maplibregl.addProtocol('pmtiles', protocol.tile);

    // Initialize map
    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: `/map-styles/${locale}.json`, // Load localized style
      center: [tenantCenter.lng, tenantCenter.lat],
      zoom: 15,
      pitchWithRotate: false,
      dragRotate: false,
      // @ts-ignore
      preserveDrawingBuffer: true,
    });

    map.current.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');

    map.current.on('load', () => {
      setMapLoaded(true);
      
      // Add a source for dynamic pins (placeholder)
      if (map.current) {
        map.current.addSource('pins-source', {
          type: 'geojson',
          data: {
            type: 'FeatureCollection',
            features: []
          },
          cluster: true,
          clusterMaxZoom: 14,
          clusterRadius: 50
        });
        
        map.current.addLayer({
          id: 'pins-layer',
          type: 'circle',
          source: 'pins-source',
          filter: ['!', ['has', 'point_count']],
          paint: {
            'circle-radius': 8,
            'circle-color': '#ff0000',
            'circle-stroke-width': 2,
            'circle-stroke-color': '#ffffff'
          }
        });
        
        // Add click interaction for pins
        map.current.on('click', 'pins-layer', (e) => {
          if (!e.features || e.features.length === 0) return;
          const clickedPinId = e.features[0].properties.id as string;
          setSelectedPinId(clickedPinId);
          
          // Center map on pin
          const coords = (e.features[0].geometry as any).coordinates;
          map.current?.flyTo({ center: coords as [number, number], zoom: 16 });
        });

        // Add cursor pointer on hover
        map.current.on('mouseenter', 'pins-layer', () => {
          if (map.current) map.current.getCanvas().style.cursor = 'pointer';
        });
        map.current.on('mouseleave', 'pins-layer', () => {
          if (map.current) map.current.getCanvas().style.cursor = '';
        });

        // Add click on map to create draft pin
        map.current.on('click', (e) => {
          // Check if we clicked on a pin
          const features = map.current?.queryRenderedFeatures(e.point, { layers: ['pins-layer'] });
          if (features && features.length > 0) return; // Handled by pin click listener
          
          // Otherwise, set draft pin
          setDraftPinLocation({ lat: e.lngLat.lat, lng: e.lngLat.lng });
        });
      }
    });

    return () => {
      map.current?.remove();
      maplibregl.removeProtocol('pmtiles');
    };
  }, [tenantCenter, locale]);

  // Subscribe to realtime pins
  useEffect(() => {
    if (!tenantId || !mapLoaded) return;
    
    const unsubscribe = subscribeToPins(tenantId, (pins) => {
      if (map.current && map.current.getSource('pins-source')) {
        const source = map.current.getSource('pins-source') as maplibregl.GeoJSONSource;
        const features = pins.map(pin => ({
          type: 'Feature' as const,
          geometry: {
            type: 'Point' as const,
            coordinates: [pin.location.lng, pin.location.lat]
          },
          properties: {
            id: pin.id,
            layerId: pin.layerId,
            name: pin.name[locale as keyof typeof pin.name] || pin.name.ko || ''
          }
        }));
        
        source.setData({
          type: 'FeatureCollection',
          features
        });
      }
    });

    return () => unsubscribe();
  }, [tenantId, mapLoaded, locale]);

  // Effect to filter layers when visibleLayerIds changes
  useEffect(() => {
    if (!mapLoaded || !map.current || !map.current.getLayer('pins-layer')) return;
    
    if (visibleLayerIds.size === 0) {
      // If none selected, maybe hide all or show all depending on logic.
      // For now, if no layer selected, let's say we show none.
      map.current.setFilter('pins-layer', ['==', 'layerId', '']);
    } else {
      map.current.setFilter('pins-layer', [
        'all',
        ['!', ['has', 'point_count']],
        ['in', 'layerId', ...Array.from(visibleLayerIds)] as any
      ]);
    }
  }, [visibleLayerIds, mapLoaded]);

  // Effect to manage draft pin marker
  useEffect(() => {
    if (!map.current || !mapLoaded) return;
    
    if (draftPinLocation) {
      if (!draftMarkerRef.current) {
        draftMarkerRef.current = new maplibregl.Marker({ color: '#ff0000', draggable: true })
          .setLngLat([draftPinLocation.lng, draftPinLocation.lat])
          .addTo(map.current);
          
        draftMarkerRef.current.on('dragend', () => {
          const lngLat = draftMarkerRef.current?.getLngLat();
          if (lngLat) {
            setDraftPinLocation({ lat: lngLat.lat, lng: lngLat.lng });
          }
        });
      } else {
        draftMarkerRef.current.setLngLat([draftPinLocation.lng, draftPinLocation.lat]);
      }
    } else {
      if (draftMarkerRef.current) {
        draftMarkerRef.current.remove();
        draftMarkerRef.current = null;
      }
    }
  }, [draftPinLocation, mapLoaded, setDraftPinLocation]);

  return (
    <div className="w-full h-full relative">
      <div ref={mapContainer} className="absolute inset-0" />
      <MapExportUI mapRef={map} />
    </div>
  );
}
