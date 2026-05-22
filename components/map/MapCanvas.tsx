'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Protocol } from 'pmtiles';
import { useMapStore } from '@/stores/mapStore';
import { subscribeToPins } from '@/lib/firebase/pins';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import type { Pin, Layer } from '@/lib/types';
import MapExportUI from '@/components/map/MapExportUI';
import SearchModal from '@/components/map/SearchModal';
import PinDetailPanel from '@/components/map/PinDetailPanel';
import MapStyleSelector from '@/components/map/MapStyleSelector';

interface MapCanvasProps {
  tenantId: string;
  tenantCenter: { lat: number; lng: number };
  tenantRadius: number; // in meters
  locale?: string;
  isPublicShare?: boolean;
  highlightPinId?: string;
}

export default function MapCanvas({ tenantId, tenantCenter, tenantRadius, locale = 'ko', isPublicShare = false, highlightPinId }: MapCanvasProps) {
  const searchParams = useSearchParams();
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [pins, setPins] = useState<Pin[]>([]);
  const [layers, setLayers] = useState<Layer[]>([]);

  const visibleLayerIds = useMapStore((state) => state.visibleLayerIds);
  const hasFilterApplied = useMapStore((state) => state.hasFilterApplied);
  const studentMode = useMapStore((state) => state.studentMode);
  const draftPinLocation = useMapStore((state) => state.draftPinLocation);
  const showHeritageLayer = useMapStore((state) => state.showHeritageLayer);
  const selectedPinId = useMapStore((state) => state.selectedPinId);
  const setSelectedPinId = useMapStore((state) => state.setSelectedPinId);
  const setDraftPinLocation = useMapStore((state) => state.setDraftPinLocation);
  const setShowPinEditor = useMapStore((state) => state.setShowPinEditor);
  const setAllLayerIds = useMapStore((state) => state.setAllLayerIds);

  const draftMarkerRef = useRef<maplibregl.Marker | null>(null);

  // Handle URL parameter for pinId or highlight from share
  useEffect(() => {
    const pinId = searchParams.get('pinId') || highlightPinId;
    if (pinId) {
      setSelectedPinId(pinId);
    }
  }, [searchParams, highlightPinId, setSelectedPinId]);

  // Load layers
  useEffect(() => {
    if (!tenantId) return;
    const unsub = onSnapshot(collection(db, 'tenants', tenantId, 'layers'), (snapshot) => {
      const fetchedLayers = snapshot.docs.map((doc) => doc.data() as Layer);
      fetchedLayers.sort((a, b) => a.order - b.order);
      setLayers(fetchedLayers);
      setAllLayerIds(fetchedLayers.map(layer => layer.id));
    });
    return () => unsub();
  }, [tenantId, setAllLayerIds]);

  useEffect(() => {
    if (map.current || !mapContainer.current) return;

    // Initialize PMTiles protocol
    let protocol = new Protocol();
    maplibregl.addProtocol('pmtiles', protocol.tile);

    // Initialize map
    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: `/api/map-styles/${locale === 'ja' ? 'ja' : locale === 'en' ? 'en' : 'ko'}`, // Load localized style
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

          if (!isPublicShare) {
            setSelectedPinId(clickedPinId);
          }

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
  }, [tenantCenter, locale, isPublicShare]);

  // Subscribe to realtime pins
  useEffect(() => {
    if (!tenantId || !mapLoaded) return;

    const unsubscribe = subscribeToPins(tenantId, (pins) => {
      setPins(pins as any);
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

    if (!hasFilterApplied) {
      // Show all pins when no filter is applied
      map.current.setFilter('pins-layer', ['!', ['has', 'point_count']]);
    } else if (visibleLayerIds.size === 0) {
      // If a filter was applied but no layers are selected, hide all
      map.current.setFilter('pins-layer', ['==', 'layerId', '']);
    } else {
      // Show pins from selected layers
      map.current.setFilter('pins-layer', [
        'all',
        ['!', ['has', 'point_count']],
        ['in', 'layerId', ...Array.from(visibleLayerIds)] as any
      ]);
    }
  }, [visibleLayerIds, hasFilterApplied, mapLoaded]);

  // Effect to manage heritage layer visibility
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    if (showHeritageLayer) {
      // Add heritage WMS layer if not exists
      if (!map.current.getSource('heritage-wms')) {
        // Add XYZ tile source for heritage WMS
        map.current.addSource('heritage-wms', {
          type: 'raster',
          url: 'pmtiles:///api/heritage/tiles',
          tileSize: 256,
          tiles: [`/api/heritage/tiles?z={z}&x={x}&y={y}`],
        });

        // Add raster layer
        map.current.addLayer({
          id: 'heritage-wms-layer',
          type: 'raster',
          source: 'heritage-wms',
          paint: {
            'raster-opacity': 0.7,
          },
        });

        console.log('Heritage WMS layer added');
      } else if (map.current.getLayer('heritage-wms-layer')) {
        // Make visible if it exists but is hidden
        map.current.setLayoutProperty('heritage-wms-layer', 'visibility', 'visible');
      }
    } else {
      // Hide or remove heritage layer
      if (map.current.getLayer('heritage-wms-layer')) {
        map.current.setLayoutProperty('heritage-wms-layer', 'visibility', 'none');
      }
    }
  }, [showHeritageLayer, mapLoaded]);

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

  const handleSearchSelectPin = (pinId: string) => {
    const selectedPin = pins.find(p => p.id === pinId);
    if (selectedPin) {
      setSelectedPinId(pinId);
      if (map.current) {
        map.current.flyTo({
          center: [selectedPin.location.lng, selectedPin.location.lat] as [number, number],
          zoom: 16,
          duration: 1000
        });
      }
    }
  };

  const handleEditPin = (pin: Pin) => {
    setSelectedPinId(null);
    // Note: In a real app, you'd load the pin data into the editor
    // For now, this just opens the editor - the user would need to search for the pin again
    setShowPinEditor(true);
  };

  return (
    <div className="w-full h-full relative flex">
      <div ref={mapContainer} className="absolute inset-0 flex-1" />
      <SearchModal pins={pins} onSelectPin={handleSearchSelectPin} />
      <MapExportUI mapRef={map} />
      <MapStyleSelector />

      {selectedPinId && (
        <PinDetailPanel
          tenantId={tenantId}
          pinId={selectedPinId}
          layers={layers}
          studentMode={studentMode}
          onEdit={handleEditPin}
        />
      )}
    </div>
  );
}
